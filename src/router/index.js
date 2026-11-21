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