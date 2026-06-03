import { mount, flushPromises } from '@vue/test-utils'
import Share from '@/views/Share.vue'
import { describe, it, expect } from 'vitest'

describe('Share.vue 好物分享測試', () => {
  it('初始狀態下，應選中第一個預設道具「雷神弓‧天誅」並正確呈現其屬性', async () => {
    const wrapper = mount(Share)
    await flushPromises()
    
    const activeItemName = wrapper.find('.detail-item-name')
    expect(activeItemName.text()).toBe('雷神弓‧天誅')
    
    const giverName = wrapper.find('.giver-info')
    expect(giverName.text()).toContain('幻海奇緣')
  })

  it('點擊「我要申請道具」按鈕後，應成功彈出「🎁 申請道具驗證」Modal 彈窗，填寫識別碼與角色 ID 後送出申請應成功', async () => {
    const wrapper = mount(Share)
    await flushPromises()
    
    // 初始狀態下，驗證 Modal 不應存在於 DOM 樹
    expect(wrapper.find('.modal-overlay').exists()).toBe(false)

    // 點擊「我要申請道具」按鈕
    const applyBtn = wrapper.find('.apply-item-btn')
    await applyBtn.trigger('click')

    // 點擊後，Modal 應該顯示
    expect(wrapper.find('.modal-overlay').exists()).toBe(true)

    // Modal 標題應為 "🎁 申請道具驗證"
    const modalTitle = wrapper.find('.modal-title')
    expect(modalTitle.text()).toBe('🎁 申請道具驗證')

    // 模擬填寫身分識別碼 (在預設對照中 TEST1 為有效識別碼)
    const inputUserId = wrapper.find('input[placeholder*="請輸入5碼英數識別碼"]')
    await inputUserId.setValue('TEST1')

    // 點擊「送出申請」按鈕
    const submitBtn = wrapper.find('button.modal-btn.confirm.neon-border-qigong')
    await submitBtn.trigger('click')
    await flushPromises()

    // 提交後，Modal 應關閉
    expect(wrapper.find('.modal-overlay').exists()).toBe(false)
  })
})
