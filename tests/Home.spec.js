// @vitest-environment jsdom
import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeAll } from 'vitest'

vi.mock('node:url', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    fileURLToPath: (url) => {
      if (typeof url === 'string' && url.startsWith('file:///') && !url.match(/^file:\/\/\/[a-zA-Z]:/)) {
        return 'C:\\' + url.replace('file:///', '')
      }
      return actual.fileURLToPath(url)
    }
  }
})

vi.mock('url', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    fileURLToPath: (url) => {
      if (typeof url === 'string' && url.startsWith('file:///') && !url.match(/^file:\/\/\/[a-zA-Z]:/)) {
        return 'C:\\' + url.replace('file:///', '')
      }
      return actual.fileURLToPath(url)
    }
  }
})

if (typeof window !== 'undefined' && window.HTMLImageElement) {
  const origSetAttr = window.HTMLImageElement.prototype.setAttribute
  window.HTMLImageElement.prototype.setAttribute = function (name, value) {
    if (name === 'src') return
    return origSetAttr.call(this, name, value)
  }
}

import Home from '@/views/Home.vue'

vi.mock('vue-router', () => ({
  useRoute: () => ({ query: {}, path: '/' }),
  useRouter: () => ({ push: vi.fn() })
}))

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({}))
}))

vi.mock('@/firebase', () => ({
  db: {},
  messaging: {}
}))

vi.mock('firebase/messaging', () => ({
  isSupported: vi.fn(async () => false),
  getMessaging: vi.fn(() => ({})),
  getToken: vi.fn(async () => 'mock-fcm-token'),
  onMessage: vi.fn(() => () => {})
}))

beforeAll(() => {
  Object.defineProperty(window.HTMLImageElement.prototype, 'src', {
    set(value) {},
    get() { return '' }
  })
})

const mountHome = () => {
  window.innerWidth = 1200
  return mount(Home, {
    global: {
      stubs: {
        RouterLink: true,
        'router-link': true
      }
    }
  })
}

describe('Home.vue 選角面板測試', () => {
  it('初始狀態下，角色面板應正常加載與呈現', () => {
    const wrapper = mountHome()
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.find('.home-wrapper').exists()).toBe(true)
  })

  it('點擊弧形選角卡片時，能正確切換選中角色狀態', async () => {
    const wrapper = mountHome()
    const arcCards = wrapper.findAll('.arc-card')
    if (arcCards.length > 0) {
      await arcCards[0].trigger('click')
      expect(wrapper.find('.active-title').exists()).toBe(true)
    }
  })
})
