import { createRouter, createWebHistory } from 'vue-router'
import Home from '@/views/Home.vue'
import Tasks from '@/views/Tasks.vue'
import Boxes from '@/views/Boxes.vue'
import Parties from '@/views/Parties.vue'
import Share from '@/views/Share.vue'
import { maintenanceConfig } from '@/config/maintenance.js'

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
    path: '/simulator',
    name: 'Simulator',
    component: () => import('@/views/Simulator.vue')
  },
  {
    path: '/boxes',
    name: 'Boxes',
    component: Boxes
  },
  {
    path: '/boxes/:id',
    name: 'BoxDetail',
    component: Boxes
  },
  {
    path: '/parties',
    name: 'Parties',
    component: Parties
  },
  {
    path: '/parties/:id',
    name: 'PartyDetail',
    component: () => import('@/views/PartyDetail.vue')
  },
  {
    path: '/share',
    name: 'Share',
    component: Share
  },
  {
    path: '/maintenance',
    name: 'Maintenance',
    component: () => import('@/views/Maintenance.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  }
})

// 全域維護狀態攔截守衛
router.beforeEach((to, from, next) => {
  // 1. 放行維護頁面本身以防無窮迴圈
  if (to.name === 'Maintenance') {
    return next()
  }

  // 2. 如果首頁開啟維護，則全站所有功能一併攔截，並導向首頁維護
  if (maintenanceConfig.home.enabled) {
    return next({ name: 'Maintenance', query: { feature: 'home' } })
  }

  // 3. 其他功能個別路由攔截
  const path = to.path
  let targetFeature = null

  if (path.startsWith('/tasks') && maintenanceConfig.tasks.enabled) {
    targetFeature = 'tasks'
  } else if (path.startsWith('/simulator') && maintenanceConfig.simulator.enabled) {
    targetFeature = 'simulator'
  } else if (path.startsWith('/boxes') && maintenanceConfig.boxes.enabled) {
    targetFeature = 'boxes'
  } else if (path.startsWith('/parties') && maintenanceConfig.parties.enabled) {
    targetFeature = 'parties'
  } else if (path.startsWith('/share') && maintenanceConfig.share.enabled) {
    targetFeature = 'share'
  }

  if (targetFeature) {
    return next({ name: 'Maintenance', query: { feature: targetFeature } })
  }

  next()
})

export default router
