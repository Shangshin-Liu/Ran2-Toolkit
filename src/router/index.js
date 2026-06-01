import { createRouter, createWebHistory } from 'vue-router'
import Home from '@/views/Home.vue'
import Tasks from '@/views/Tasks.vue'
import Boxes from '@/views/Boxes.vue'
import Parties from '@/views/Parties.vue'
import Share from '@/views/Share.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/tasks',
    name: 'Tasks',
    component: Tasks
  },
  {
    path: '/boxes',
    name: 'Boxes',
    component: Boxes
  },
  {
    path: '/parties',
    name: 'Parties',
    component: Parties
  },
  {
    path: '/share',
    name: 'Share',
    component: Share
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  }
})

export default router
