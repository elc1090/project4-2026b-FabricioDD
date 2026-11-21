<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const API_URL = 'https://project4-2026b-fabriciodd.onrender.com'

const router = useRouter()

// Estados reativos do formulário
const nome = ref('')
const email = ref('')
const senha = ref('')
const confirmarSenha = ref('')
const mensagemErro = ref('')
const mensagemSucesso = ref('')
const carregando = ref(false)

async function cadastrarUsuario() {
  mensagemErro.value = ''
  mensagemSucesso.value = ''

  // Validação local antes de chamar a API
  if (senha.value !== confirmarSenha.value) {
    mensagemErro.value = 'As senhas digitadas não coincidem.'
    return
  }

  carregando.value = true

  try {
    // ATENÇÃO: Confira no Backend/server.js se a rota POST é '/api/cadastro' ou '/api/usuarios'
    const resposta = await fetch(`${API_URL}/api/registro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: nome.value,
        email: email.value,
        senha: senha.value
      })
    })

    const dados = await resposta.json()

    if (resposta.ok) {
      // Caso o backend já devolva um token no cadastro, entra direto no mapa
      if (dados.token) {
        localStorage.setItem('token', dados.token)
        localStorage.setItem('usuarioNome', dados.usuario?.nome || nome.value)
        router.push('/')
        return
      }

      // Caso padrão: exibe confirmação e redireciona para o login
      mensagemSucesso.value = 'Conta criada com sucesso! Redirecionando para o login...'
      setTimeout(() => {
        router.push('/login')
      }, 1500)
    } else {
      mensagemErro.value = dados.erro || 'Não foi possível concluir o cadastro.'
    }
  } catch (erro) {
    console.error('Erro ao cadastrar:', erro)
    mensagemErro.value = 'Erro ao conectar com o servidor.'
  } finally {
    carregando.value = false
  }
}
</script>

<template>
  <div class="pagina-cadastro">
    <div class="cadastro-box">
      <h2>Criar Conta</h2>

      <form @submit.prevent="cadastrarUsuario">
        <label for="nome">Nome completo</label>
        <input
          id="nome"
          v-model="nome"
          type="text"
          placeholder="Seu nome"
          required
        />

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
          placeholder=""
          required
        />

        <label for="confirmarSenha">Confirmar senha</label>
        <input
          id="confirmarSenha"
          v-model="confirmarSenha"
          type="password"
          placeholder=""
          required
        />

        <button type="submit" :disabled="carregando">
          {{ carregando ? 'Cadastrando...' : 'Cadastrar' }}
        </button>
      </form>

      <div v-if="mensagemErro" class="mensagem-erro">
        {{ mensagemErro }}
      </div>

      <div v-if="mensagemSucesso" class="mensagem-sucesso">
        {{ mensagemSucesso }}
      </div>

      <div class="links">
        <p>Já tem uma conta? <RouterLink to="/login">Faça login aqui</RouterLink></p>
        <p class="voltar"><RouterLink to="/">← Voltar para o mapa</RouterLink></p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pagina-cadastro {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #f4f6f8;
  padding: 16px;
}

.cadastro-box {
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

.mensagem-sucesso {
  color: #155724;
  background-color: #d4edda;
  border: 1px solid #c3e6cb;
  padding: 8px;
  border-radius: 4px;
  margin-top: 12px;
  font-size: 13px;
  text-align: center;
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