// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, reactive, ref } from 'vue'
import tooltipsJson from '../public/data/tooltips.json'

const mockRoute = reactive({ path: '/tasks', query: {} })
const mockShowTopNoticePopup = ref(false)

vi.mock('vue-router', () => ({
  useRoute: () => mockRoute,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() })
}))

vi.mock('@/composables/useNotice', () => ({
  useNotice: () => ({ showTopNoticePopup: mockShowTopNoticePopup })
}))

import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  useTour,
  TOUR_DISMISS_KEY_PREFIX,
  getGuideVersion,
  getSlideImages,
  computeFitMediaHeight,
  MIN_FIT_MEDIA_HEIGHT
} from '@/composables/useTour.js'
import TourGuide from '@/components/TourGuide.vue'

const FEATURES = ['parties', 'tasks', 'simulator']
const dismissKey = (featureKey) => `${TOUR_DISMISS_KEY_PREFIX}${featureKey}`
const versionOf = (featureKey) => getGuideVersion(tooltipsJson.guides[featureKey])
const flush = async () => {
  await Promise.resolve()
  await nextTick()
  await nextTick()
}

// 元件測試用的設定檔：任務指南第 1 步放兩張圖、第 2 步用舊版 image 單一字串、第 3 步沒有圖片；
// 配點模擬整份導引都不放圖片（測試一般版面），不受正式導引內容變動影響
const fixture = structuredClone(tooltipsJson)
fixture.guides.tasks.slides[0].images = ['/assets/tooltip/test-a.png', '/assets/tooltip/test-b.png']
delete fixture.guides.tasks.slides[1].images
fixture.guides.tasks.slides[1].image = '/assets/tooltip/test-legacy.png'
fixture.guides.tasks.slides[2].images = []
for (const slide of fixture.guides.simulator.slides) slide.images = []

// 掛載導引元件：轉場動畫使用測試替身（立即切換），並記錄起來，測試失敗時也會在 afterEach 卸載
const mountedWrappers = new Set()
const mountGuide = () => {
  const wrapper = mount(TourGuide, { global: { stubs: { teleport: true } } })
  mountedWrappers.add(wrapper)
  const unmount = wrapper.unmount.bind(wrapper)
  wrapper.unmount = () => {
    if (mountedWrappers.delete(wrapper)) unmount()
  }
  return wrapper
}

beforeEach(() => {
  globalThis.fetch = vi.fn(async () => ({ ok: true, json: async () => fixture }))
  localStorage.clear()
  mockShowTopNoticePopup.value = false
  mockRoute.path = '/tasks'
})

afterEach(() => {
  for (const wrapper of [...mountedWrappers]) wrapper.unmount()
  // useTour 為全域共享狀態，每個測試結束後關閉並清除不再顯示的紀錄
  const tour = useTour()
  tour.dontShowAgain.value = false
  tour.closeTour()
  localStorage.clear()
})

describe('tooltips.json 導引內容格式 (新手導覽設定檔)', () => {
  it('三個功能皆有標題、版本號與至少一張投影片', () => {
    for (const key of FEATURES) {
      const guide = tooltipsJson.guides[key]
      expect(guide, key).toBeTruthy()
      expect(typeof guide.featureTitle).toBe('string')
      expect(typeof guide.version).toBe('string')
      expect(guide.slides.length).toBeGreaterThan(0)
    }
  })

  it('每張投影片的必要欄位齊全、id 不重複，images 為放在 /assets/tooltip/ 底下的圖片路徑陣列', () => {
    const ids = new Set()
    for (const key of FEATURES) {
      for (const slide of tooltipsJson.guides[key].slides) {
        expect(slide.id).toBeTruthy()
        expect(ids.has(slide.id), `重複的 id: ${slide.id}`).toBe(false)
        ids.add(slide.id)
        expect(slide.title.trim().length).toBeGreaterThan(0)
        expect(slide.description.trim().length).toBeGreaterThan(0)
        expect(Array.isArray(slide.images), `${slide.id} 的 images 必須是陣列`).toBe(true)
        for (const src of slide.images) {
          expect(src).toMatch(/^\/assets\/tooltip\/.+\.(png|webp|jpe?g|gif)$/i)
        }
        expect(new Set(slide.images).size, `${slide.id} 的 images 有重複路徑`).toBe(slide.images.length)
        expect(typeof slide.imageHint).toBe('string')
      }
    }
  })

  it('images 裡的每一張圖片都確實放在 public/ 底下（檔名打錯會在這裡抓到）', () => {
    for (const key of FEATURES) {
      for (const slide of tooltipsJson.guides[key].slides) {
        for (const src of slide.images) {
          // vitest 以專案根目錄為工作目錄執行
          const file = resolve(process.cwd(), 'public', `.${src}`)
          expect(existsSync(file), `${slide.id} 找不到圖片：public${src}`).toBe(true)
        }
      }
    }
  })
})

describe('computeFitMediaHeight 圖片框自動縮放', () => {
  it('內容超出視窗時，圖片框縮小超出的高度', () => {
    expect(computeFitMediaHeight({ frameHeight: 479, panelHeight: 839, panelMaxHeight: 839, overflow: 23 })).toBe(456)
  })

  it('視窗還有空間時，上限放寬到填滿可用高度（實際大小仍受 CSS 的 --media-max-h 限制）', () => {
    expect(computeFitMediaHeight({ frameHeight: 300, panelHeight: 700, panelMaxHeight: 760, overflow: 0 })).toBe(360)
  })

  it('最小不低於 MIN_FIT_MEDIA_HEIGHT，再放不下就改讓內容區捲動', () => {
    expect(computeFitMediaHeight({ frameHeight: 200, panelHeight: 600, panelMaxHeight: 600, overflow: 150 })).toBe(MIN_FIT_MEDIA_HEIGHT)
  })

  it('量測值無效（例如尚未排版）時回傳 null，維持 CSS 預設大小', () => {
    expect(computeFitMediaHeight({ frameHeight: 0, panelHeight: 600, panelMaxHeight: 600 })).toBeNull()
    expect(computeFitMediaHeight({ frameHeight: 300, panelHeight: 600, panelMaxHeight: NaN })).toBeNull()
  })
})

describe('getSlideImages 圖片清單整理', () => {
  it('依照 images 陣列順序回傳，並略過空字串', () => {
    expect(getSlideImages({ images: ['/a.png', '', '  ', '/b.png', '/c.png'] })).toEqual(['/a.png', '/b.png', '/c.png'])
  })

  it('相容舊版的 image 單一字串', () => {
    expect(getSlideImages({ image: '/legacy.png' })).toEqual(['/legacy.png'])
  })

  it('沒有圖片時回傳空陣列', () => {
    expect(getSlideImages({ images: [] })).toEqual([])
    expect(getSlideImages({ image: null })).toEqual([])
    expect(getSlideImages(null)).toEqual([])
  })
})

describe('useTour 導引狀態邏輯', () => {
  it('首次進入頁面會自動開啟導引並從第一步開始', async () => {
    const tour = useTour()
    const opened = await tour.startTour('tasks', null, false)
    expect(opened).toBe(true)
    expect(tour.isOpen.value).toBe(true)
    expect(tour.currentFeatureKey.value).toBe('tasks')
    expect(tour.currentSlideIndex.value).toBe(0)
    expect(tour.dontShowAgain.value).toBe(false)
  })

  it('勾選不再顯示後關閉，會記錄目前的導引版本，下次不再自動開啟', async () => {
    const tour = useTour()
    await tour.startTour('parties', null, false)
    tour.toggleDontShowAgain(true)
    tour.closeTour()
    expect(localStorage.getItem(dismissKey('parties'))).toBe(versionOf('parties'))

    const opened = await tour.startTour('parties', null, false)
    expect(opened).toBe(false)
    expect(tour.isOpen.value).toBe(false)
  })

  it('手動點「操作導引」(force) 時即使已勾選不再顯示也會開啟，且核取方塊維持勾選', async () => {
    localStorage.setItem(dismissKey('simulator'), versionOf('simulator'))
    const tour = useTour()
    const opened = await tour.startTour('simulator', null, true)
    expect(opened).toBe(true)
    expect(tour.dontShowAgain.value).toBe(true)
    tour.closeTour()
    expect(localStorage.getItem(dismissKey('simulator'))).toBe(versionOf('simulator'))
  })

  it('導引版本號變更後（含舊版的 true 紀錄），會再自動顯示一次新版導引', async () => {
    const tour = useTour()
    localStorage.setItem(dismissKey('tasks'), 'true')
    expect(await tour.startTour('tasks', null, false)).toBe(true)
    tour.closeTour()

    localStorage.setItem(dismissKey('tasks'), 'an-old-version')
    expect(await tour.startTour('tasks', null, false)).toBe(true)
  })

  it('開啟另一個已勾選不再顯示的導引時，不會影響目前顯示中的導引與其紀錄', async () => {
    localStorage.setItem(dismissKey('parties'), versionOf('parties'))
    const tour = useTour()
    await tour.startTour('tasks', null, false)
    tour.goToSlide(2)

    const opened = await tour.startTour('parties', null, false)
    expect(opened).toBe(false)
    expect(tour.currentFeatureKey.value).toBe('tasks')
    expect(tour.currentSlideIndex.value).toBe(2)

    tour.closeTour()
    // parties 的不再顯示紀錄不可被誤刪
    expect(localStorage.getItem(dismissKey('parties'))).toBe(versionOf('parties'))
  })

  it('cancelTour 會作廢設定檔載入中的自動開啟請求（例如載入期間已離開頁面）', async () => {
    const tour = useTour()
    const pending = tour.startTour('parties', null, false)
    tour.cancelTour()
    expect(await pending).toBe(false)
    expect(tour.isOpen.value).toBe(false)
  })

  it('不存在的導引 key 不會開啟', async () => {
    const tour = useTour()
    expect(await tour.startTour('not-exist', null, true)).toBe(false)
    expect(tour.isOpen.value).toBe(false)
  })

  it('最後一步按下一步會完成並關閉導引', async () => {
    const tour = useTour()
    await tour.startTour('simulator', null, false)
    tour.goToSlide(tour.currentSlides.value.length - 1)
    tour.nextSlide()
    expect(tour.isOpen.value).toBe(false)
  })
})

describe('TourGuide 元件', () => {

  it('多張圖片以輪播顯示；某張載入失敗只影響那一張，換步驟後重新從第一張開始', async () => {
    const tour = useTour()
    const wrapper = mountGuide()
    await tour.startTour('tasks', null, false)
    await flush()

    // 兩張圖：顯示左右箭頭與兩個圓點
    expect(wrapper.findAll('.carousel-dot')).toHaveLength(2)
    expect(wrapper.find('.carousel-arrow.is-next').exists()).toBe(true)

    // test-a.png 載入失敗 → 該張（含循環用的複製圖）改顯示佔位區，test-b.png 不受影響
    await wrapper.find('img[src="/assets/tooltip/test-a.png"]').trigger('error')
    expect(wrapper.find('img[src="/assets/tooltip/test-a.png"]').exists()).toBe(false)
    expect(wrapper.find('img[src="/assets/tooltip/test-b.png"]').exists()).toBe(true)
    expect(wrapper.find('.carousel-slide .slide-image-placeholder').text()).toContain('示意圖片準備中')

    // 第 2 步使用舊版 image 單一字串：只有一張，不顯示箭頭與圓點
    tour.nextSlide()
    await flush()
    const imgs = wrapper.findAll('img.slide-image')
    expect(imgs).toHaveLength(1)
    expect(imgs[0].attributes('src')).toBe('/assets/tooltip/test-legacy.png')
    expect(wrapper.find('.carousel-arrow').exists()).toBe(false)
    expect(wrapper.find('.carousel-dot').exists()).toBe(false)

    // 第 3 步還沒有圖片：顯示佔位區
    tour.nextSlide()
    await flush()
    expect(wrapper.find('img.slide-image').exists()).toBe(false)
    expect(wrapper.find('.slide-image-placeholder').text()).toContain('示意圖片準備中')
    wrapper.unmount()
  })

  it('支援鍵盤操作：→ 下一步、← 上一步、Esc 關閉', async () => {
    const tour = useTour()
    const wrapper = mountGuide()
    await tour.startTour('parties', null, false)
    await flush()

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
    expect(tour.currentSlideIndex.value).toBe(1)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }))
    expect(tour.currentSlideIndex.value).toBe(0)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(tour.isOpen.value).toBe(false)
    wrapper.unmount()
  })

  it('置頂公告彈窗顯示中時先不顯示導引，公告關閉後才出現', async () => {
    mockShowTopNoticePopup.value = true
    const tour = useTour()
    const wrapper = mountGuide()
    await tour.startTour('simulator', null, false)
    await flush()
    expect(wrapper.find('.tour-modal-panel').exists()).toBe(false)

    mockShowTopNoticePopup.value = false
    await flush()
    expect(wrapper.find('.tour-modal-panel').exists()).toBe(true)
    wrapper.unmount()
  })

  it('切換頁面時自動關閉導引', async () => {
    const tour = useTour()
    const wrapper = mountGuide()
    await tour.startTour('tasks', null, false)
    await flush()
    expect(wrapper.find('.tour-modal-panel').exists()).toBe(true)

    mockRoute.path = '/parties'
    await flush()
    expect(tour.isOpen.value).toBe(false)
    wrapper.unmount()
  })

  it('開啟時鎖定背景捲動，關閉後還原', async () => {
    document.body.style.overflow = ''
    const tour = useTour()
    const wrapper = mountGuide()
    await tour.startTour('tasks', null, false)
    await flush()
    expect(document.body.style.overflow).toBe('hidden')

    tour.closeTour()
    await flush()
    expect(document.body.style.overflow).toBe('')
    wrapper.unmount()
  })
})

describe('TourGuide 大版面與放大檢視', () => {
  const carouselNo = (wrapper) => Number(wrapper.find('.carousel-dots ~ .sr-only').text().match(/第 (\d+) 張/)[1])

  it('導引有放圖片時使用大版面，沒有圖片的導引維持原本大小', async () => {
    const tour = useTour()
    const wrapper = mountGuide()
    await tour.startTour('tasks', null, false)
    await flush()
    expect(wrapper.find('.tour-modal-panel').classes()).toContain('is-wide')
    expect(wrapper.find('.tour-modal-panel').attributes('style')).toContain('--media-ratio')
    tour.closeTour()
    await flush()

    await tour.startTour('simulator', null, false)
    await flush()
    expect(wrapper.find('.tour-modal-panel').classes()).not.toContain('is-wide')
    wrapper.unmount()
  })

  it('點「放大」開啟放大檢視；Esc 只關閉放大檢視，導引還在', async () => {
    const tour = useTour()
    const wrapper = mountGuide()
    await tour.startTour('tasks', null, false)
    await flush()

    await wrapper.find('.carousel-zoom-btn').trigger('click')
    await flush()
    expect(wrapper.find('.tour-lightbox').exists()).toBe(true)
    expect(wrapper.find('.tour-lightbox img').attributes('src')).toBe('/assets/tooltip/test-a.png')

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await flush()
    expect(wrapper.find('.tour-lightbox').exists()).toBe(false)
    expect(tour.isOpen.value).toBe(true)
    wrapper.unmount()
  })

  it('放大檢視開著時 ← → 切換的是圖片而不是步驟，關閉後輪播停在最後看的那張', async () => {
    const tour = useTour()
    const wrapper = mountGuide()
    await tour.startTour('tasks', null, false)
    await flush()

    await wrapper.find('.carousel-zoom-btn').trigger('click')
    await flush()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
    await flush()
    expect(tour.currentSlideIndex.value).toBe(0)
    expect(wrapper.find('.tour-lightbox .lightbox-counter').text()).toBe('2 / 2')

    await wrapper.find('.lightbox-close').trigger('click')
    await flush()
    expect(wrapper.find('.tour-lightbox').exists()).toBe(false)
    expect(carouselNo(wrapper)).toBe(2)
    wrapper.unmount()
  })

  it('換步驟或關閉導引時會一併收起放大檢視', async () => {
    const tour = useTour()
    const wrapper = mountGuide()
    await tour.startTour('tasks', null, false)
    await flush()
    await wrapper.find('.carousel-zoom-btn').trigger('click')
    await flush()
    tour.nextSlide()
    await flush()
    expect(wrapper.find('.tour-lightbox').exists()).toBe(false)

    tour.prevSlide()
    await flush()
    await wrapper.find('.carousel-zoom-btn').trigger('click')
    await flush()
    tour.closeTour()
    await flush()
    expect(wrapper.find('.tour-lightbox').exists()).toBe(false)
    wrapper.unmount()
  })

  it('說明文字放不下時圖片框自動縮小（--media-fit-h）；手機寬度不縮小；關閉導引後清除', async () => {
    // jsdom 沒有排版，模擬量測值：導引視窗已達最大高度 839px，內容區還超出 23px
    const has = (el, cls) => !!el?.classList?.contains(cls)
    const originalInnerWidth = window.innerWidth
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function () {
      if (has(this, 'tour-modal-panel')) return 839
      if (has(this, 'slide-media-container')) return 479
      return 0
    })
    vi.spyOn(Element.prototype, 'scrollHeight', 'get').mockImplementation(function () {
      return has(this, 'modal-body') ? 623 : 0
    })
    vi.spyOn(Element.prototype, 'clientHeight', 'get').mockImplementation(function () {
      return has(this, 'modal-body') ? 600 : 0
    })
    const realGetComputedStyle = window.getComputedStyle.bind(window)
    vi.spyOn(window, 'getComputedStyle').mockImplementation((el, pseudo) => {
      const style = realGetComputedStyle(el, pseudo)
      if (!has(el, 'tour-modal-panel')) return style
      return new Proxy(style, { get: (target, prop) => (prop === 'maxHeight' ? '839px' : Reflect.get(target, prop)) })
    })
    const panelStyle = (wrapper) => wrapper.find('.tour-modal-panel').attributes('style') || ''

    try {
      const tour = useTour()
      const wrapper = mountGuide()
      await tour.startTour('tasks', null, false)
      await flush()
      expect(panelStyle(wrapper)).toContain('--media-fit-h: 456px')

      // 手機寬度：圖片維持滿版寬度，不再限制高度
      Object.defineProperty(window, 'innerWidth', { value: 375, configurable: true, writable: true })
      window.dispatchEvent(new Event('resize'))
      await new Promise((resolve) => setTimeout(resolve, 40))
      await flush()
      expect(panelStyle(wrapper)).not.toContain('--media-fit-h')

      // 回到桌機寬度後重新計算；關閉導引後清除
      Object.defineProperty(window, 'innerWidth', { value: originalInnerWidth, configurable: true, writable: true })
      window.dispatchEvent(new Event('resize'))
      await new Promise((resolve) => setTimeout(resolve, 40))
      await flush()
      expect(panelStyle(wrapper)).toContain('--media-fit-h: 456px')

      tour.closeTour()
      await flush()
      await tour.startTour('simulator', null, false)
      await flush()
      // 配點模擬（測試設定檔沒有圖片）不是大版面，不需要縮放
      expect(panelStyle(wrapper)).not.toContain('--media-fit-h')
      wrapper.unmount()
    } finally {
      Object.defineProperty(window, 'innerWidth', { value: originalInnerWidth, configurable: true, writable: true })
      vi.restoreAllMocks()
    }
  })
})
