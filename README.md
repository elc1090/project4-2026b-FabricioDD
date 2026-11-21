# Mapa de Reciclagem

<img src="./site.gif" alt="Visualização do projeto" title="GIF animado do projeto">

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
   * Integração do **Leaflet.js** ao ambiente do Vue, incluindo a correção de caminhos de ícones estáticos empacotados pelo Vite.
   * Decodificação do payload do JWT no cliente para controlar a exibição condicional dos botões **Editar** e **Excluir** nos popups apenas para o criador do ponto ou administradores, espelhando a validação de autorização feita no backend via cabeçalho `Authorization: Bearer <token>`.
   * Separação entre código-fonte do frontend (`src/`) e API (`Backend/`), configurando um novo Web Service no **Render** apontando para a subpasta `Backend` e conectado ao banco **PostgreSQL** hospedado no **Neon.tech**.
   * Atualização da política de **CORS** no Express para autorizar tanto o ambiente local do Vite (`http://localhost:5173`) quanto o domínio de produção.

### Trechos de código

#### 1. Validação do Token Google e criação automática de conta (Backend/server.js)

Este trecho mostra o lado do servidor no login federado: o backend recebe o credential enviado pelo Vue, valida a assinatura criptográfica diretamente com os servidores do Google via google-auth-library e cria o usuário no PostgreSQL caso seja seu primeiro acesso, gerando um JWT unificado da aplicação:

<code>
app.post('/api/login/google', async (req, res) => {
  const { credential } = req.body;

  try {
    // 1. Verifica a autenticidade do token emitido pelo Google
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    const { email, name } = ticket.getPayload();

    // 2. Busca o usuário no Neon.tech ou cria automaticamente no primeiro login
    let resultado = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    let usuario = resultado.rows[0];

    if (!usuario) {
      const novoUsuario = await pool.query(
        'INSERT INTO usuarios (nome, email, senha) VALUES ($1, $2, $3) RETURNING id, nome, email, is_admin',
        [name, email, null] // Contas federadas não exigem senha local
      );
      usuario = novoUsuario.rows[0];
    }

    // 3. Emite o JWT padrão da aplicação para manter a sessão unificada
    const token = jwt.sign(
      { id: usuario.id, nome: usuario.nome, is_admin: usuario.is_admin },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ token, usuario: { id: usuario.id, nome: usuario.nome } });
  } catch (err) {
    res.status(401).json({ erro: 'Falha na validação da conta Google.' });
  }
});
</code>

#### 2. Roteamento SPA compatível com hospedagem estática (src/router/index.js)

Na migração para o GitHub Pages, o uso de createWebHashHistory() evita erros 404 Not Found quando o usuário recarrega a página diretamente em uma rota interna (como /#/login), pois o servidor estático sempre resolve o index.html raiz:

<code>
import { createRouter, createWebHashHistory } from 'vue-router'
import MapaView from '../views/MapaView.vue'
import LoginView from '../views/LoginView.vue'
import CadastroView from '../views/CadastroView.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'mapa', component: MapaView },
    { path: '/login', name: 'login', component: LoginView },
    { path: '/cadastro', name: 'cadastro', component: CadastroView }
  ]
})

export default router
</code>

## Tecnologias
### Linguagens e afins

    * Frontend: Vue.js, Vue Router, JavaScript, HTML5, CSS3 e Leaflet.js.

    * Backend: Node.js, Express.js, jsonwebtoken (JWT), bcrypt e google-auth-library.

    * Banco de Dados: PostgreSQL (hospedado em nuvem no Neon.tech).

    * Autenticação e Mapas: Google Identity Services (OAuth 2.0) e tiles cartográficos do OpenStreetMap.

### Ambiente de desenvolvimento

    * Editor de Código: Visual Studio Code (extensão Vue - Official).

    * Build e Bundler: Vite (npm run dev na porta 5173).

    * Controle de Versão e Hospedagem: Git, GitHub, GitHub Pages (gh-pages) para o frontend e Render para o backend Node.js.

    * IA utilizada: Gemini.

## Referências

   * Documentação oficial do Vue.js 3: https://vuejs.org/guide/introduction.html

   * Documentação oficial do Vue Router 4: https://router.vuejs.org/

   * Documentação do Vite (Deploy em páginas estáticas / GitHub Pages): https://vite.dev/guide/static-deploy.html

   * Documentação oficial do Leaflet.js: https://leafletjs.com/reference.html

   * Google Identity Services — Sign In With Google for Web: https://developers.google.com/identity/gsi/web/guides/overview