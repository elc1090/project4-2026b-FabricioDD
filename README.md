# Mapa de Reciclagem

## Acesso

* **Aplicação Web (Frontend):** https://elc1090.github.io/project4-2026b-FabricioDD

## Desenvolvedor(a)

* **Nome:** Fabrício Thomas
* **Disciplina:** ELC1090 — Desenvolvimento de Software para a Web (2026b)

## Proposta

O Ecopontos é uma aplicação web voltada ao mapeamento geográfico e à consulta pública de pontos de coleta seletiva e ecopontos. A plataforma permite que qualquer visitante visualize locais de descarte, materiais aceitos, endereços e horários de funcionamento em um mapa interativo, enquanto usuários autenticados — tanto por cadastro tradicional quanto por login federado com Google — podem cadastrar novos pontos clicando diretamente no mapa, além de editar ou excluir os locais de sua autoria.

Nesta etapa do projeto, o sistema passou por uma refatoração arquitetural completa no frontend, migrando de páginas estáticas em JavaScript puro (Vanilla JS) para uma Single Page Application em Vue.js 3, mantendo a API RESTful em Node.js/Express e o banco de dados relacional PostgreSQL.

## Desenvolvimento

### Processo

1. **Autenticação Federada com Google (OAuth 2.0 / Google Identity Services):**
   * Configuração do projeto no Google Cloud Console.
   * Integração do Software Development Kit oficial `https://accounts.google.com/gsi/client` no frontend e criação da rota `POST /api/login/google` no backend.
   * Validação criptográfica do `credential` (ID Token do Google) no servidor usando a biblioteca `google-auth-library`. O backend verifica a autenticidade do token junto ao Google, localiza ou cria automaticamente o registro do usuário no PostgreSQL (com suporte a contas sem senha local) e emite o **JWT** próprio da aplicação para manter a sessão unificada.

2. **Migração do Frontend para Vue.js 3 (SPA com Vite e Vue Router):**
   * Criação da nova base de código com **Vite** e reorganização do projeto em rotas declarativas (`/` para o mapa principal, `/login` e `/cadastro`) utilizando **Vue Router** com `createWebHashHistory()` para compatibilidade nativa com o GitHub Pages.
   * Substituição da manipulação imperativa do DOM (`document.getElementById`) por estados reativos (`ref`, `computed`) e ganchos de ciclo de vida (`onMounted`, `onUnmounted`) na *Composition API* do Vue 3.
   * Gerenciamento do ciclo de vida do botão oficial do Google dentro de `LoginView.vue`, garantindo sua renderização mesmo durante transições de rota sem recarregamento de página.
   * Integração do **Leaflet.js** ao ciclo de vida do Vue, incluindo a correção de caminhos de ícones estáticos empacotados pelo Vite.
   * Decodificação do payload do JWT no cliente para controlar a exibição condicional dos botões **Editar** e **Excluir** nos popups apenas para o criador do ponto ou administradores, espelhando a validação de autorização feita no backend via cabeçalho `Authorization: Bearer <token>`.
   * Separação entre código-fonte do frontend (`src/`) e API (`Backend/`), configurando um novo Web Service no **Render** apontando para a subpasta `Backend` e conectado ao banco **PostgreSQL** hospedado no **Neon.tech**.
   * Atualização da política de **CORS** no Express para autorizar tanto o ambiente local do Vite (`http://localhost:5173`) quanto o domínio de produção.

### Trechos de código

#### 1. Inicialização reativa do Google Identity Services (`src/views/LoginView.vue`)

Para evitar falhas quando o usuário navega diretamente para `/#/login` antes do carregamento completo do script externo do Google, o componente utiliza `onMounted` aliado a uma verificação periódica limpa em `onUnmounted`:

```javascript
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
    mensagemErro.value = 'Erro ao conectar com o servidor.'
  } finally {
    carregando.value = false
  }
}

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

## Tecnologias
### Linguagens e afins

    * Frontend: Vue.js 3, Vue Router 4, JavaScript, HTML5, CSS3 e Leaflet.js.

    * Backend: Node.js, Express.js, jsonwebtoken (JWT), bcrypt e google-auth-library.

    * Banco de Dados: PostgreSQL (hospedado em nuvem no Neon.tech).

    * Autenticação e Mapas: Google Identity Services (OAuth 2.0) e tiles cartográficos do OpenStreetMap.

### Ambiente de desenvolvimento

    * Editor de Código: Visual Studio Code (extensão Vue - Official).

    * Build e Bundler: Vite (npm run dev na porta 5173).

    * Controle de Versão e Hospedagem: Git, GitHub, GitHub Pages (gh-pages) para o frontend e Render para o backend Node.js.

## Referências

   * Documentação oficial do Vue.js 3: https://vuejs.org/guide/introduction.html

   * Documentação oficial do Vue Router 4: https://router.vuejs.org/

   * Documentação do Vite (Deploy em páginas estáticas / GitHub Pages): https://vite.dev/guide/static-deploy.html

   * Documentação oficial do Leaflet.js: https://leafletjs.com/reference.html

   * Google Identity Services — Sign In With Google for Web: https://developers.google.com/identity/gsi/web/guides/overview

   * Material de apoio e orientações da disciplina ELC1090 — Desenvolvimento de Software para a Web (UFSM).