<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import L from 'leaflet'

// Correção obrigatória para os ícones padrão do Leaflet funcionarem no Vite
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow
})

const API_URL = 'https://project4-2026b-fabriciodd.onrender.com'
const ZOOM_DETALHE = 10 // Abaixo desse zoom, os pontos viram pontinhos

const router = useRouter()

// Decodifica o payload do JWT sem precisar de biblioteca externa
function decodificarToken(tokenJwt) {
  if (!tokenJwt) return null
  try {
    const base64Url = tokenJwt.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    return JSON.parse(jsonPayload)
  } catch {
    return null
  }
}

// Estado de autenticação
const token = ref(localStorage.getItem('token') || '')
const usuarioNome = ref(localStorage.getItem('usuarioNome') || '')
const usuarioAtual = ref(decodificarToken(token.value))
const estaLogado = computed(() => !!token.value && !!usuarioAtual.value)

// Estado do mapa e dos pontos
const mapContainer = ref(null)
const pontos = ref([])
const carregando = ref(true)
const erro = ref('')

// Estado do painel lateral de cadastro/edição
const modalAberto = ref(false)
const modoEdicao = ref(false)
const pontoEditandoId = ref(null)
const salvando = ref(false)
const erroFormulario = ref('')

const form = ref({
  nome: '',
  materiais: '',
  horario: '',
  endereco: '',
  latitude: null,
  longitude: null
})

let map = null
let layerMarcadores = null
let marcadorTemporario = null
let modoPontinhoAtual = true

// 1. Inicializa o mapa Leaflet, o evento de clique e a troca por nível de zoom
function iniciarMapa() {
  map = L.map(mapContainer.value).setView([-29.6842, -53.8069], 13)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map)

  layerMarcadores = L.layerGroup().addTo(map)
  modoPontinhoAtual = map.getZoom() < ZOOM_DETALHE

  // Alterna entre pontinhos e pinos completos ao cruzar o limite de zoom
  map.on('zoomend', () => {
    const deveUsarPontinho = map.getZoom() < ZOOM_DETALHE
    if (deveUsarPontinho !== modoPontinhoAtual) {
      modoPontinhoAtual = deveUsarPontinho
      renderizarMarcadores(pontos.value)
    }
  })

  // Ao clicar no mapa: se estiver logado, abre ou reposiciona o novo ponto
  map.on('click', (e) => {
    if (!estaLogado.value) return
    if (modalAberto.value && modoEdicao.value) return
    abrirModalCriacao(e.latlng.lat, e.latlng.lng)
  })

  setTimeout(() => {
    map.invalidateSize()
  }, 250)
}

// 2. Busca os pontos na API
async function carregarPontos() {
  carregando.value = true
  erro.value = ''

  try {
    const resposta = await fetch(`${API_URL}/api/pontos`)
    if (!resposta.ok) throw new Error('Falha ao buscar pontos.')

    const dados = await resposta.json()
    pontos.value = dados
    renderizarMarcadores(dados)
  } catch (err) {
    console.error('Erro ao carregar pontos:', err)
    erro.value = 'Não foi possível carregar os pontos de coleta.'
  } finally {
    carregando.value = false
  }
}

// 3. Renderiza pontinhos (zoom distante) ou pinos completos (zoom próximo)
function renderizarMarcadores(listaPontos) {
  if (!layerMarcadores) return
  layerMarcadores.clearLayers()

  const usarPontinho = map ? map.getZoom() < ZOOM_DETALHE : true

  listaPontos.forEach((ponto) => {
    if (!ponto.latitude || !ponto.longitude) return

    const marcador = usarPontinho
      ? L.circleMarker([ponto.latitude, ponto.longitude], {
          radius: 6,
          fillColor: '#3786c4',
          color: '#ffffff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.9
        })
      : L.marker([ponto.latitude, ponto.longitude])

    // Verifica se o usuário logado é o criador do ponto ou admin
    const ehDono =
      estaLogado.value &&
      (usuarioAtual.value.is_admin || ponto.usuario_id === usuarioAtual.value.id)

    const botoesDonoHtml = ehDono
      ? `
        <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid #eee; display: flex; gap: 6px;">
          <button class="btn-popup-editar" style="flex: 1; padding: 5px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
            Editar
          </button>
          <button class="btn-popup-excluir" style="flex: 1; padding: 5px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
            Excluir
          </button>
        </div>
      `
      : ''

    const popupHtml = `
      <div style="min-width: 190px;">
        <h3 style="margin: 0 0 6px 0; font-size: 15px;">${ponto.nome || 'Ecoponto'}</h3>
        <p style="margin: 0 0 4px 0; font-size: 13px;"><strong>Materiais:</strong> ${ponto.materiais || 'Não informado'}</p>
        <p style="margin: 0 0 4px 0; font-size: 13px;"><strong>Horário:</strong> ${ponto.horario || 'Não informado'}</p>
        ${ponto.endereco ? `<p style="margin: 0 0 4px 0; font-size: 12px; color: #555;">${ponto.endereco}</p>` : ''}
        <small style="color: #777;">Cadastrado por: ${ponto.autor || 'Comunidade'}</small>
        ${botoesDonoHtml}
      </div>
    `

    marcador.bindPopup(popupHtml)

    if (ehDono) {
      marcador.on('popupopen', () => {
        const popupEl = marcador.getPopup().getElement()
        const btnEditar = popupEl?.querySelector('.btn-popup-editar')
        const btnExcluir = popupEl?.querySelector('.btn-popup-excluir')

        if (btnEditar) {
          btnEditar.onclick = () => {
            map.closePopup()
            abrirModalEdicao(ponto)
          }
        }

        if (btnExcluir) {
          btnExcluir.onclick = () => {
            excluirPonto(ponto.id)
          }
        }
      })
    }

    marcador.addTo(layerMarcadores)
  })
}

// 4. Controles do Painel Lateral (Criar / Editar)
function abrirModalCriacao(lat, lng) {
  const latFormatada = Number(lat.toFixed(6))
  const lngFormatada = Number(lng.toFixed(6))

  if (modalAberto.value && !modoEdicao.value) {
    form.value.latitude = latFormatada
    form.value.longitude = lngFormatada
    if (marcadorTemporario) {
      marcadorTemporario.setLatLng([lat, lng])
    }
    return
  }

  modoEdicao.value = false
  pontoEditandoId.value = null
  erroFormulario.value = ''

  form.value = {
    nome: '',
    materiais: '',
    horario: '',
    endereco: '',
    latitude: latFormatada,
    longitude: lngFormatada
  }

  if (marcadorTemporario) {
    marcadorTemporario.remove()
  }

  marcadorTemporario = L.marker([lat, lng], { opacity: 0.75, draggable: true }).addTo(map)
  marcadorTemporario.on('dragend', (event) => {
    const pos = event.target.getLatLng()
    form.value.latitude = Number(pos.lat.toFixed(6))
    form.value.longitude = Number(pos.lng.toFixed(6))
  })

  modalAberto.value = true
}

function abrirModalEdicao(ponto) {
  if (marcadorTemporario) {
    marcadorTemporario.remove()
    marcadorTemporario = null
  }

  modoEdicao.value = true
  pontoEditandoId.value = ponto.id
  erroFormulario.value = ''

  form.value = {
    nome: ponto.nome || '',
    materiais: ponto.materiais || '',
    horario: ponto.horario || '',
    endereco: ponto.endereco || '',
    latitude: ponto.latitude,
    longitude: ponto.longitude
  }

  modalAberto.value = true
}

function fecharModal() {
  modalAberto.value = false
  erroFormulario.value = ''
  if (marcadorTemporario) {
    marcadorTemporario.remove()
    marcadorTemporario = null
  }
}

// 5. Envia POST (novo ponto) ou PUT (edição) com o token JWT
async function salvarPonto() {
  erroFormulario.value = ''
  salvando.value = true

  const url = modoEdicao.value
    ? `${API_URL}/api/pontos/${pontoEditandoId.value}`
    : `${API_URL}/api/pontos`

  const metodo = modoEdicao.value ? 'PUT' : 'POST'

  try {
    const resposta = await fetch(url, {
      method: metodo,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token.value}`
      },
      body: JSON.stringify(form.value)
    })

    const dados = await resposta.json()

    if (!resposta.ok) {
      erroFormulario.value = dados.erro || 'Erro ao salvar ponto de coleta.'
      return
    }

    fecharModal()
    await carregarPontos()
  } catch (err) {
    console.error('Erro ao salvar ponto:', err)
    erroFormulario.value = 'Erro de conexão com o servidor.'
  } finally {
    salvando.value = false
  }
}

// 6. Envia DELETE para remover o ponto do usuário
async function excluirPonto(id) {
  if (!confirm('Tem certeza que deseja excluir este ponto de coleta?')) return

  try {
    const resposta = await fetch(`${API_URL}/api/pontos/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token.value}`
      }
    })

    const dados = await resposta.json().catch(() => ({}))

    if (!resposta.ok) {
      alert(dados.erro || 'Não foi possível excluir este ponto.')
      return
    }

    await carregarPontos()
  } catch (err) {
    console.error('Erro ao excluir ponto:', err)
    alert('Erro de conexão ao tentar excluir o ponto.')
  }
}

// 7. Logout reativo
function sair() {
  localStorage.removeItem('token')
  localStorage.removeItem('usuarioNome')
  token.value = ''
  usuarioNome.value = ''
  usuarioAtual.value = null
  fecharModal()
  renderizarMarcadores(pontos.value)
}

onMounted(() => {
  iniciarMapa()
  carregarPontos()
})

onUnmounted(() => {
  if (map) {
    map.remove()
    map = null
  }
})
</script>

<template>
  <div class="layout-mapa">
    <!-- Barra superior flutuante -->
    <header class="barra-topo">
      <div class="titulo">
        <strong>Mapa de Reciclagem</strong>
        <span v-if="carregando" class="status">Carregando...</span>
        <span v-else class="status">({{ pontos.length }} pontos)</span>
        <span v-if="estaLogado" class="dica-clique">
          • Clique no mapa para adicionar um ponto
        </span>
      </div>

      <div class="acoes-auth">
        <template v-if="estaLogado">
          <span class="saudacao">Olá, {{ usuarioNome }}</span>
          <button class="btn btn-sair" @click="sair">Sair</button>
        </template>
        <template v-else>
          <button class="btn btn-login" @click="router.push('/login')">Fazer Login</button>
        </template>
      </div>
    </header>

    <div v-if="erro" class="banner-erro">
      {{ erro }}
    </div>

    <!-- Container do Mapa -->
    <div ref="mapContainer" class="mapa-container"></div>

    <!-- Painel Lateral Esquerdo de Cadastro e Edição -->
    <aside v-if="modalAberto" class="painel-lateral-form">
      <div class="painel-cabecalho">
        <h3>{{ modoEdicao ? 'Editar Ponto de Coleta' : 'Novo Ponto de Coleta' }}</h3>
        <button type="button" class="btn-fechar-x" title="Fechar" @click="fecharModal">
          &times;
        </button>
      </div>

      <form @submit.prevent="salvarPonto">
        <label for="nomePonto">Nome do local</label>
        <input
          id="nomePonto"
          v-model="form.nome"
          type="text"
          placeholder="Ex: Ecoponto Praça Central"
          required
        />

        <label for="materiaisPonto">Materiais aceitos</label>
        <input
          id="materiaisPonto"
          v-model="form.materiais"
          type="text"
          placeholder="Ex: Papel, Plástico, Vidro, Eletrônicos"
          required
        />

        <label for="horarioPonto">Horário de funcionamento</label>
        <input
          id="horarioPonto"
          v-model="form.horario"
          type="text"
          placeholder="Ex: Seg a Sex, 08h às 18h"
          required
        />

        <label for="enderecoPonto">Endereço ou referência</label>
        <input
          id="enderecoPonto"
          v-model="form.endereco"
          type="text"
          placeholder="Ex: Rua Marechal Floriano, 500"
        />

        <div class="coords-info">
          Coordenadas: {{ form.latitude }}, {{ form.longitude }}
          <span v-if="!modoEdicao" class="coords-dica">
            (clique no mapa ou arraste o pino para ajustar)
          </span>
        </div>

        <div v-if="erroFormulario" class="erro-form">
          {{ erroFormulario }}
        </div>

        <div class="modal-acoes">
          <button type="button" class="btn btn-cancelar" @click="fecharModal">
            Cancelar
          </button>
          <button type="submit" class="btn btn-salvar" :disabled="salvando">
            {{ salvando ? 'Salvando...' : 'Salvar' }}
          </button>
        </div>
      </form>
    </aside>
  </div>
</template>

<style scoped>
.layout-mapa {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

.mapa-container {
  width: 100%;
  height: 100%;
  z-index: 1;
}

.barra-topo {
  position: absolute;
  top: 12px;
  left: 55px;
  right: 16px;
  z-index: 1000;
  background: white;
  padding: 10px 16px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.status {
  margin-left: 8px;
  font-size: 13px;
  color: #666;
}

.dica-clique {
  margin-left: 8px;
  font-size: 13px;
  color: #28a745;
  font-weight: bold;
}

.acoes-auth {
  display: flex;
  align-items: center;
  gap: 10px;
}

.saudacao {
  font-size: 14px;
  font-weight: bold;
  color: #333;
}

.btn {
  padding: 7px 14px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-weight: bold;
  font-size: 13px;
}

.btn-login,
.btn-salvar {
  background-color: #28a745;
  color: white;
}

.btn-login:hover,
.btn-salvar:hover:not(:disabled) {
  background-color: #218838;
}

.btn-sair {
  background-color: #dc3545;
  color: white;
}

.btn-sair:hover {
  background-color: #c82333;
}

.btn-cancelar {
  background-color: #6c757d;
  color: white;
}

.btn-cancelar:hover {
  background-color: #5a6268;
}

.banner-erro {
  position: absolute;
  top: 70px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  background-color: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
  padding: 10px 18px;
  border-radius: 6px;
  font-size: 14px;
}

/* Painel flutuante fixado no lado esquerdo */
.painel-lateral-form {
  position: absolute;
  top: 90px;
  left: 12px;
  z-index: 1000;
  background: white;
  padding: 20px;
  border-radius: 10px;
  width: 330px;
  max-width: calc(100vw - 24px);
  max-height: calc(100vh - 106px);
  overflow-y: auto;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.22);
}

.painel-cabecalho {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

.painel-cabecalho h3 {
  margin: 0;
  color: #222;
  font-size: 17px;
}

.btn-fechar-x {
  background: none;
  border: none;
  font-size: 22px;
  line-height: 1;
  color: #666;
  cursor: pointer;
  padding: 0 4px;
}

.btn-fechar-x:hover {
  color: #222;
}

.painel-lateral-form label {
  display: block;
  margin-bottom: 4px;
  font-size: 13px;
  font-weight: bold;
  color: #444;
}

.painel-lateral-form input {
  width: 100%;
  margin-bottom: 12px;
  padding: 9px;
  border: 1px solid #ccc;
  border-radius: 5px;
  font-size: 14px;
}

.painel-lateral-form input:focus {
  outline: none;
  border-color: #28a745;
}

.coords-info {
  font-size: 12px;
  color: #555;
  margin-bottom: 12px;
  line-height: 1.4;
}

.coords-dica {
  display: block;
  color: #28a745;
}

.erro-form {
  background: #f8d7da;
  color: #721c24;
  padding: 8px;
  border-radius: 4px;
  font-size: 13px;
  margin-bottom: 12px;
  text-align: center;
}

.modal-acoes {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
}
</style>