import { mount } from '@vue/test-utils'
import Home from '@/views/Home.vue'
import { describe, it, expect, vi, beforeAll } from 'vitest'

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() })
}))

beforeAll(() => {
  Object.defineProperty(window.HTMLImageElement.prototype, 'src', {
    set(value) { this.setAttribute('src', value) },
    get() { return this.getAttribute('src') }
  })
})

describe('Home.vue 選角面板測試', () => {
  it('初始狀態下，所有卡片不應有 is-active 狀態（無 Hover）', () => {
    const wrapper = mount(Home)
    expect(wrapper.findAll('.neon-card.is-active').length).toBe(0)
  })

  it('Hover snipper → snipper 卡片獲得 is-active 狀態，且其餘變暗', async () => {
    const wrapper = mount(Home)
    await wrapper.find('#card-snipper').trigger('mouseenter')

    const snipperCard = wrapper.find('#card-snipper')
    expect(snipperCard.classes()).toContain('is-active')
    
    // 其餘應該有 is-dimmed
    const boxCard = wrapper.find('#card-box')
    expect(boxCard.classes()).toContain('is-dimmed')

    await wrapper.find('#card-snipper').trigger('mouseleave')
    expect(wrapper.find('#card-snipper').classes()).not.toContain('is-active')
  })

  it('Hover box → box 卡片獲得 is-active 狀態', async () => {
    const wrapper = mount(Home)
    await wrapper.find('#card-box').trigger('mouseenter')

    const boxCard = wrapper.find('#card-box')
    expect(boxCard.classes()).toContain('is-active')
    expect(wrapper.find('#card-qigong').classes()).toContain('is-dimmed')
  })
})
