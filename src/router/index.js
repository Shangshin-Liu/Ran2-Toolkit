import { createRouter, createWebHistory } from 'vue-router'
import Home from '@/views/Home.vue'
import Tasks from '@/views/Tasks.vue'
import Parties from '@/views/Parties.vue'
import { useMaintenance } from '@/composables/useMaintenance.js'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home,
    meta: { title: '亂2 Online 遊戲攻略與輔助工具箱' }
  },
  {
    path: '/tasks',
    name: 'Tasks',
    component: Tasks,
    meta: { title: '官方任務指南 ‧ 流程與獎勵查詢' }
  },
  {
    path: '/simulator',
    name: 'Simulator',
    component: () => import('@/views/Simulator.vue'),
    meta: { title: '職業技能配點模擬器 ‧ 奧義技能配置庫' }
  },
  {
    path: '/function2',
    name: 'Function2',
    component: () => import('@/views/Maintenance.vue'),
    meta: { title: '構思中 ‧ 此功能虛位以待' }
  },
  {
    path: '/function2/:id',
    name: 'Function2Detail',
    component: () => import('@/views/Maintenance.vue'),
    meta: { title: '構思中 ‧ 此功能虛位以待' }
  },
  {
    path: '/parties',
    name: 'Parties',
    component: Parties,
    meta: { title: '練功組隊招募平台 ‧ 即時約戰組隊' }
  },
  {
    path: '/parties/:id',
    name: 'PartyDetail',
    component: () => import('@/views/PartyDetail.vue'),
    meta: { title: '練功組隊詳細資訊' }
  },
  {
    path: '/function1',
    name: 'Function1',
    component: () => import('@/views/Maintenance.vue'),
    meta: { title: '構思中 ‧ 此功能虛位以待' }
  },
  {
    path: '/maintenance',
    name: 'Maintenance',
    component: () => import('@/views/Maintenance.vue'),
    meta: { title: '網站系統維護中' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    }
    // 如果路徑相同只是 query 參數改變，不要滾動到頂端
    if (to.path === from.path) {
      return
    }
    return { top: 0 }
  }
})

// 全域維護狀態攔截守衛
router.beforeEach(async (to, from, next) => {
  const { maintenanceState, isBypassed, initMaintenance } = useMaintenance()
  await initMaintenance()

  // 1. 放行維護頁面本身以防無窮迴圈
  if (to.name === 'Maintenance') {
    return next()
  }

  // 2. 如果已成功解鎖強行進入狀態，全站放行
  if (isBypassed.value) {
    return next()
  }

  const config = maintenanceState.value || {}

  // 3. 如果首頁開啟維護，則全站所有功能一併攔截，並導向首頁維護
  if (config.home && config.home.enabled) {
    return next({ name: 'Maintenance', query: { feature: 'home' } })
  }

  // 4. 其他功能個別路由攔截
  const path = to.path
  let targetFeature = null

  if (path.startsWith('/tasks') && config.tasks && config.tasks.enabled) {
    targetFeature = 'tasks'
  } else if (path.startsWith('/simulator') && config.simulator && config.simulator.enabled) {
    targetFeature = 'simulator'
  } else if (path.startsWith('/function2') && config.function2 && config.function2.enabled) {
    targetFeature = 'function2'
  } else if (path.startsWith('/parties') && config.parties && config.parties.enabled) {
    targetFeature = 'parties'
  } else if (path.startsWith('/function1') && config.function1 && config.function1.enabled) {
    targetFeature = 'function1'
  }

  if (targetFeature) {
    return next({ name: 'Maintenance', query: { feature: targetFeature } })
  }

  next()
})

// 全域動態網頁 Title 切換守衛 (優化 SEO)
router.afterEach((to) => {
  const baseTitle = '亂2萬事通'
  if (to.meta && to.meta.title) {
    document.title = `${baseTitle} | ${to.meta.title}`
  } else {
    document.title = baseTitle
  }
})

export default router
