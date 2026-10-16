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
  const { maintenanceState, isBypassed, initMaintenance, getBlockingFeature } = useMaintenance()
  await initMaintenance()

  const config = maintenanceState.value || {}

  // 1. 若進入維護頁面本身：檢查是否已解鎖或該功能已解除維護，若是則導回原路由（避免 F5 卡死在維護頁）
  if (to.name === 'Maintenance') {
    const feature = to.query.feature
    if (feature) {
      const isStillBlocked = !isBypassed.value && (
        (config.home && config.home.enabled) ||
        (config[feature] && config[feature].enabled)
      )
      if (!isStillBlocked) {
        const targetPath = feature !== 'home' ? `/${feature}` : '/'
        return next(targetPath)
      }
    }
    return next()
  }

  // 2. 檢查目標路由是否需攔截導向維護頁
  const targetFeature = getBlockingFeature(to.path, config, isBypassed.value)
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
