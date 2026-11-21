<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

const API_URL = 'https://project4-2026b-fabriciodd.onrender.com'
const GOOGLE_CLIENT_ID = '1049551927137-j9a6p24hrilg1m6ba521s8kbvo0nal7c.apps.googleusercontent.com'

const router = useRouter()

// Estados reativos do formulário
const email = ref('')
const senha = ref('')
const mensagemErro = ref('')
const carregando = ref(false)
const googleButtonContainer = ref(null)

let intervaloGoogle = null

// 1. Login tradicional (E-mail e Senha)
async function fazerLoginTradicional() {
  mensagemErro.value = ''
  carregando.value = true

  try {
    const resposta = await fetch(`${API_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.value,
        senha: senha.value
      })
    })

    const dados = await resposta.json()

    if (resposta.ok) {
      localStorage.setItem('token', dados.token)
      localStorage.setItem('usuarioNome', dados.usuario.nome)
      router.push('/')
    } else {
      mensagemErro.value = dados.erro || 'E-mail ou senha inválidos.'
    }
  } catch (erro) {
    console.error('Erro no login:', erro)
    mensagemErro.value = 'Erro ao conectar com o servidor.'
  } finally {
    carregando.value = false
  }
}

// 2. Callback executado quando o usuário aprova o login no popup do Google
async function handleCredentialResponse(response) {
  mensagemErro.value = ''
  carregando.value = true

  try {
    const resposta = await fetch(`${API_URL}/api/login/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: response.credential })
    })

    const dados = await resposta.json()

    if (resposta.ok) {
      localStorage.setItem('token', dados.token)
      localStorage.setItem('usuarioNome', dados.usuario.nome)
      router.push('/')
    } else {
      mensagemErro.value = dados.erro || 'Erro ao autenticar com o Google.'
    }
  } catch (erro) {
    console.error('Erro no login Google:', erro)
    mensagemErro.value = 'Erro ao conectar com o servidor.'
  } finally {
    carregando.value = false
  }
}

// 3. Renderiza o botão oficial do Google dentro da ref do template
function renderizarBotaoGoogle() {
  if (window.google?.accounts?.id && googleButtonContainer.value) {
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleCredentialResponse
    })

    window.google.accounts.id.renderButton(googleButtonContainer.value, {
      theme: 'outline',
      size: 'large',
      width: 280
    })
    return true
  }
  return false
}

onMounted(() => {
  // Tenta renderizar imediatamente; se o script do Google ainda estiver carregando, aguarda
  if (!renderizarBotaoGoogle()) {
    intervaloGoogle = setInterval(() => {
      if (renderizarBotaoGoogle()) {
        clearInterval(intervaloGoogle)
      }
    }, 200)
  }
})

onUnmounted(() => {
  if (intervaloGoogle) {
    clearInterval(intervaloGoogle)
  }
})
</script>

<template>
  <div class="pagina-login">
    <div class="login-box">
      <h2>Entrar no Sistema</h2>

      <form @submit.prevent="fazerLoginTradicional">
        <label for="email">E-mail</label>
        <input
          id="email"
          v-model="email"
          type="email"
          placeholder="seu@email.com"
          required
        />

        <label for="senha">Senha</label>
        <input
          id="senha"
          v-model="senha"
          type="password"
          placeholder="••••••••"
          required
        />

        <button type="submit" :disabled="carregando">
          {{ carregando ? 'Entrando...' : 'Entrar' }}
        </button>
      </form>

      <div v-if="mensagemErro" class="mensagem-erro">
        {{ mensagemErro }}
      </div>

      <div class="divisor">ou</div>

      <!-- Container onde o Google injeta o botão -->
      <div ref="googleButtonContainer" class="google-btn-wrapper"></div>

      <div class="links">
        <p>Não tem uma conta? <RouterLink to="/cadastro">Cadastre-se aqui</RouterLink></p>
        <p class="voltar"><RouterLink to="/">← Voltar para o mapa</RouterLink></p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pagina-login {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #f4f6f8;
  padding: 16px;
}

.login-box {
  background: white;
  border: 1px solid #ddd;
  padding: 28px;
  border-radius: 10px;
  width: 100%;
  max-width: 340px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

h2 {
  text-align: center;
  margin-bottom: 20px;
  color: #222;
}

label {
  display: block;
  margin-bottom: 4px;
  font-size: 14px;
  font-weight: bold;
  color: #444;
}

input {
  width: 100%;
  margin-bottom: 14px;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 5px;
  font-size: 14px;
}

input:focus {
  outline: none;
  border-color: #28a745;
}

button {
  width: 100%;
  padding: 10px;
  background-color: #28a745;
  color: white;
  border: none;
  cursor: pointer;
  border-radius: 5px;
  font-weight: bold;
  font-size: 15px;
}

button:hover:not(:disabled) {
  background-color: #218838;
}

button:disabled {
  background-color: #94d3a2;
  cursor: not-allowed;
}

.mensagem-erro {
  color: #dc3545;
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
  padding: 8px;
  border-radius: 4px;
  margin-top: 12px;
  font-size: 13px;
  text-align: center;
}

.divisor {
  text-align: center;
  margin: 20px 0;
  color: #888;
  font-size: 14px;
  position: relative;
}

.divisor::before,
.divisor::after {
  content: '';
  position: absolute;
  top: 50%;
  width: 40%;
  height: 1px;
  background-color: #ddd;
}

.divisor::before {
  left: 0;
}

.divisor::after {
  right: 0;
}

.google-btn-wrapper {
  display: flex;
  justify-content: center;
  min-height: 40px;
}

.links {
  margin-top: 20px;
  text-align: center;
  font-size: 14px;
}

.links a {
  color: #007bff;
  text-decoration: none;
}

.links a:hover {
  text-decoration: underline;
}

.voltar {
  margin-top: 10px;
}
</style>