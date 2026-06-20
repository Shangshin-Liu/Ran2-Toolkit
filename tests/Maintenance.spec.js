import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
import Maintenance from '@/views/Maintenance.vue'
import { maintenanceConfig } from '@/config/maintenance.js'

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

describe('Maintenance.vue 視圖測試', () => {
  it('讀取 home 維護資訊並呈現正確的標題與文字，且不應顯示「返回首頁」按鈕，顯示重連進度條', () => {
    mockRoute.query.feature = 'home'
    const wrapper = mount(Maintenance)
    
    // 檢查標題與文字
    expect(wrapper.find('.maintenance-title').text()).toBe(maintenanceConfig.home.title)
    expect(wrapper.find('.message-text').text()).toBe(maintenanceConfig.home.message)
    
    // 首頁維護不應有返回首頁按鈕，而是重連狀態
    expect(wrapper.find('.btn-back-home').exists()).toBe(false)
    expect(wrapper.find('.loading-container').exists()).toBe(true)
  })

  it('讀取 boxes 維護資訊並呈現正確的標題與文字，且應顯示「返回首頁」按鈕，不顯示重連進度條', () => {
    mockRoute.query.feature = 'boxes'
    const wrapper = mount(Maintenance)
    
    // 檢查標題與文字
    expect(wrapper.find('.maintenance-title').text()).toBe(maintenanceConfig.boxes.title)
    expect(wrapper.find('.message-text').text()).toBe(maintenanceConfig.boxes.message)
    
    // 其他功能維護應有返回首頁按鈕
    expect(wrapper.find('.btn-back-home').exists()).toBe(true)
    expect(wrapper.find('.loading-container').exists()).toBe(false)
  })
})
