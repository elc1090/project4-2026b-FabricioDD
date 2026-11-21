<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
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

const router = useRouter()

// Referência direta ao elemento HTML do mapa e estados reativos
const mapContainer = ref(null)
const pontos = ref([])
const carregando = ref(true)
const erro = ref('')

// Estado de autenticação lido do localStorage
const usuarioNome = ref(localStorage.getItem('usuarioNome') || '')
const estaLogado = ref(!!localStorage.getItem('token'))

let map = null
let layerMarcadores = null

// 1. Inicializa o mapa Leaflet
function iniciarMapa() {
  // Coordenadas iniciais (ex: Santa Maria - RS; ajuste para a sua região padrão)
  map = L.map(mapContainer.value).setView([-29.6842, -53.8069], 13)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map)

  // Camada dedicada para gerenciar os pinos facilmente
  layerMarcadores = L.layerGroup().addTo(map)

  // Garante que o mapa calcule o tamanho correto após o CSS renderizar
  setTimeout(() => {
    map.invalidateSize()
  }, 250)
}

// 2. Busca os pontos na API do Render e desenha no mapa
async function carregarPontos() {
  carregando.value = true
  erro.value = ''

  try {
    // ATENÇÃO: Confira se a rota GET no seu server.js é '/api/pontos' ou '/pontos'
    const resposta = await fetch('https://project4-2026b-fabriciodd.onrender.com/api/pontos')

    if (!resposta.ok) {
      throw new Error('Falha ao buscar os pontos de coleta.')
    }

    const dados = await resposta.json()
    pontos.value = dados
    renderizarMarcadores(dados)
  } catch (err) {
    console.error('Erro ao carregar pontos:', err)
    erro.value = 'Não foi possível carregar os pontos. Verifique o CORS ou o servidor.'
  } finally {
    carregando.value = false
  }
}

// 3. Adiciona os marcadores na camada do Leaflet
function renderizarMarcadores(listaPontos) {
  if (!layerMarcadores) return
  layerMarcadores.clearLayers()

  listaPontos.forEach((ponto) => {
    if (ponto.latitude && ponto.longitude) {
      const marcador = L.marker([ponto.latitude, ponto.longitude])

      const popupHtml = `
        <div style="min-width: 180px;">
          <h3 style="margin: 0 0 6px 0; font-size: 15px;">${ponto.nome || 'Ecoponto'}</h3>
          <p style="margin: 0 0 4px 0; font-size: 13px;"><strong>Materiais:</strong> ${ponto.materiais || 'Não informado'}</p>
          ${ponto.endereco ? `<p style="margin: 0 0 4px 0; font-size: 12px; color: #555;">${ponto.endereco}</p>` : ''}
          <small style="color: #777;">Cadastrado por: ${ponto.autor || 'Comunidade'}</small>
        </div>
      `

      marcador.bindPopup(popupHtml)
      marcador.addTo(layerMarcadores)
    }
  })
}

// 4. Logout reativo (sem precisar recarregar a página)
function sair() {
  localStorage.removeItem('token')
  localStorage.removeItem('usuarioNome')
  estaLogado.value = false
  usuarioNome.value = ''
}

// Executa assim que o HTML da página estiver pronto
onMounted(() => {
  iniciarMapa()
  carregarPontos()
})

// Limpa o mapa da memória ao navegar para /login ou /cadastro
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
        <span v-if="carregando" class="status">Carregando pontos...</span>
        <span v-else class="status">({{ pontos.length }} pontos encontrados)</span>
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

    <!-- Alerta de erro caso a API falhe ou o CORS bloqueie -->
    <div v-if="erro" class="banner-erro">
      {{ erro }}
    </div>

    <!-- Container obrigatório com altura definida para o Leaflet -->
    <div ref="mapContainer" class="mapa-container"></div>
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
  left: 55px; /* Espaço para não cobrir os botões de zoom (+/-) do Leaflet */
  right: 16px;
  z-index: 1000;
  background: white;
  padding: 10px 16px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.status {
  margin-left: 8px;
  font-size: 13px;
  color: #666;
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

.btn-login {
  background-color: #28a745;
  color: white;
}

.btn-login:hover {
  background-color: #218838;
}

.btn-sair {
  background-color: #dc3545;
  color: white;
}

.btn-sair:hover {
  background-color: #c82333;
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
</style>