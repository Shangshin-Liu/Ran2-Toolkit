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
    path: '/boxes',
    name: 'Boxes',
    component: Boxes,
    meta: { title: '稀有禮盒內容物查詢 ‧ 掉率高亮回報' }
  },
  {
    path: '/boxes/:id',
    name: 'BoxDetail',
    component: Boxes,
    meta: { title: '稀有禮盒內容物查詢 ‧ 掉率量化' }
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
    path: '/share',
    name: 'Share',
    component: Share,
    meta: { title: '好物交易分享板 ‧ 玩家虛寶市集' }
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
