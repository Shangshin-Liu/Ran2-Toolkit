import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
import { ref } from 'vue'
import Maintenance from '@/views/Maintenance.vue'

// 模擬 Firebase
vi.mock('@/firebase', () => ({
  db: {}
}))
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  onSnapshot: vi.fn()
}))

// 模擬 vue-router
const mockRoute = {
  query: {
    feature: 'home'
  }
}
vi.mock('vue-router', () => ({
  useRoute: () => mockRoute,
  RouterLink: {
    template: '<a><slot /></a>'
  }
}))

const mockConfig = {
  home: {
    enabled: false,
    title: '網站系統維護中',
    message: '亂2萬事通正在進行核心資料優化與安全升級，我們將盡快恢復服務，感謝您的耐心等待。'
  },
  function1: {
    enabled: true,
    title: '此功能虛位以待',
    message: '原功能涉及複雜問題，已超出維護可行範圍，新功能尚在構思若有甚麼idea還贏透過首頁的「聯絡我們」分享你的想法'
  }
}

vi.mock('@/composables/useMaintenance.js', () => ({
  useMaintenance: () => ({
    maintenanceState: ref(mockConfig),
    initMaintenance: vi.fn(),
    getMaintenanceInfo: (feature) => mockConfig[feature] || mockConfig.home
  })
}))

describe('Maintenance.vue 視圖測試', () => {
  it('讀取 home 維護資訊並呈現正確的標題與文字，且不應顯示「返回首頁」按鈕，顯示重連進度條', () => {
    mockRoute.query.feature = 'home'
    const wrapper = mount(Maintenance)
    
    // 檢查標題與文字
    expect(wrapper.find('.maintenance-title').text()).toBe(mockConfig.home.title)
    expect(wrapper.find('.message-text').text()).toBe(mockConfig.home.message)
    
    // 首頁維護不應有返回首頁按鈕，而是重連狀態
    expect(wrapper.find('.btn-back-home').exists()).toBe(false)
    expect(wrapper.find('.loading-container').exists()).toBe(true)
  })

  it('讀取 function1 維護資訊並呈現正確的標題與文字，且應顯示「返回首頁」按鈕，不顯示重連進度條', () => {
    mockRoute.query.feature = 'function1'
    const wrapper = mount(Maintenance)
    
    // 檢查標題與文字
    expect(wrapper.find('.maintenance-title').text()).toBe(mockConfig.function1.title)
    expect(wrapper.find('.message-text').text()).toBe(mockConfig.function1.message)
    
    // 其他功能維護應有返回首頁按鈕
    expect(wrapper.find('.btn-back-home').exists()).toBe(true)
    expect(wrapper.find('.loading-container').exists()).toBe(false)
  })
})
