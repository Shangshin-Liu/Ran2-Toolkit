import { mount } from '@vue/test-utils'
import Share from '@/views/Share.vue'
import { describe, it, expect } from 'vitest'

describe('Share.vue 好物分享測試', () => {
  it('初始狀態下，應選中第一個預設道具「【極品】+7 冰晶斬魔劍」並正確呈現其屬性', () => {
    const wrapper = mount(Share)
    const activeItemName = wrapper.find('.detail-item-name')
    expect(activeItemName.text()).toBe('雷神弓‧天誅')
    
    const giverName = wrapper.find('.giver-info')
    expect(giverName.text()).toContain('幻海奇緣')
  })

  it('點擊「我要申請道具」按鈕後，應成功彈出「申請成功！」的 Modal 彈窗', async () => {
    const wrapper = mount(Share)
    
    // 初始狀態下，成功 Modal 不應存在於 DOM 樹或處於隱藏狀態 (v-if 控制)
    expect(wrapper.find('.modal-overlay').exists()).toBe(false)

    // 點擊申請按鈕
    const applyBtn = wrapper.find('.apply-item-btn')
    await applyBtn.trigger('click')

    // 點擊後，Modal 應該顯示
    const modalOverlay = wrapper.find('.modal-overlay')
    expect(modalOverlay.exists()).toBe(true)

    // Modal 中應包含申請成功的內容與道具名稱
    const modalTitle = wrapper.find('.modal-title')
    expect(modalTitle.text()).toBe('申請成功！')
    expect(wrapper.find('.success-desc').text()).toContain('雷神弓‧天誅')

    // 點擊 Modal 的確認按鈕，Modal 應關閉
    const closeBtn = wrapper.find('.modal-close-btn')
    await closeBtn.trigger('click')
    expect(wrapper.find('.modal-overlay').exists()).toBe(false)
  })
})
