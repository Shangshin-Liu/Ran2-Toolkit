// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import TourImageCarousel from '@/components/TourImageCarousel.vue'

const IMAGES = ['/assets/tooltip/p-1.png', '/assets/tooltip/p-2.png', '/assets/tooltip/p-3.png']

const mountCarousel = (images = IMAGES) => mount(TourImageCarousel, {
  props: { images, alt: '測試步驟' }
})

// 目前顯示第幾張（從 1 開始），讀取給螢幕閱讀器的文字
const currentNo = (wrapper) => {
  const match = wrapper.find('.sr-only').text().match(/第 (\d+) 張/)
  return match ? Number(match[1]) : null
}

// jsdom 不會跑 CSS 動畫，手動送出 transitionend 代表動畫結束
const endTransition = (wrapper) => wrapper.find('.carousel-track').trigger('transitionend')

// 送出 Pointer 事件（jsdom 沒有完整的 PointerEvent，補上 pointerId / pointerType）
const firePointer = async (wrapper, type, { clientX, clientY, pointerId = 1, pointerType = 'touch', button = 0 }) => {
  const el = wrapper.find('.slide-media-container').element
  const Ctor = typeof window.PointerEvent === 'function' ? window.PointerEvent : window.MouseEvent
  const evt = new Ctor(type, { bubbles: true, cancelable: true, clientX, clientY, button, pointerId, pointerType })
  if (evt.pointerId !== pointerId) Object.defineProperty(evt, 'pointerId', { value: pointerId })
  if (evt.pointerType !== pointerType) Object.defineProperty(evt, 'pointerType', { value: pointerType })
  el.dispatchEvent(evt)
  await wrapper.vm.$nextTick()
}

const swipe = async (wrapper, fromX, toX, { y = 100, pointerType = 'touch' } = {}) => {
  const base = { pointerId: 1, pointerType, clientY: y }
  await firePointer(wrapper, 'pointerdown', { ...base, clientX: fromX })
  await firePointer(wrapper, 'pointermove', { ...base, clientX: (fromX + toX) / 2 })
  await firePointer(wrapper, 'pointermove', { ...base, clientX: toX })
  await firePointer(wrapper, 'pointerup', { ...base, clientX: toX })
}

afterEach(() => {
  vi.useRealTimers()
})

describe('TourImageCarousel 示意圖片輪播', () => {
  it('多張圖片：依陣列順序排列，從第一張開始，顯示左右箭頭與圓點', () => {
    const wrapper = mountCarousel()
    // 頭尾各多一張複製圖：最後一張 + 三張 + 第一張
    const srcs = wrapper.findAll('img.slide-image').map((img) => img.attributes('src'))
    expect(srcs).toEqual([IMAGES[2], ...IMAGES, IMAGES[0]])
    expect(currentNo(wrapper)).toBe(1)
    expect(wrapper.findAll('.carousel-dot')).toHaveLength(3)
    expect(wrapper.find('.carousel-dot.is-active').attributes('aria-label')).toBe('第 1 張圖片')
    expect(wrapper.find('.carousel-arrow.is-prev').exists()).toBe(true)
    expect(wrapper.find('.carousel-arrow.is-next').exists()).toBe(true)
  })

  it('點右箭頭依序看下一張，最後一張再往後回到第一張', async () => {
    const wrapper = mountCarousel()
    const next = wrapper.find('.carousel-arrow.is-next')

    await next.trigger('click')
    await endTransition(wrapper)
    expect(currentNo(wrapper)).toBe(2)

    await next.trigger('click')
    await endTransition(wrapper)
    expect(currentNo(wrapper)).toBe(3)

    await next.trigger('click')
    await endTransition(wrapper)
    expect(currentNo(wrapper)).toBe(1)
    // 動畫結束後從複製圖跳回真正的第一張（軌道位移回到 -100%）
    expect(wrapper.find('.carousel-track').attributes('style')).toContain('-100%')
  })

  it('第一張按左箭頭會回到最後一張', async () => {
    const wrapper = mountCarousel()
    await wrapper.find('.carousel-arrow.is-prev').trigger('click')
    await endTransition(wrapper)
    expect(currentNo(wrapper)).toBe(3)
    expect(wrapper.find('.carousel-track').attributes('style')).toContain('-300%')
  })

  it('動畫進行中再點箭頭不會跳過圖片', async () => {
    const wrapper = mountCarousel()
    const next = wrapper.find('.carousel-arrow.is-next')
    await next.trigger('click')
    await next.trigger('click')
    await endTransition(wrapper)
    expect(currentNo(wrapper)).toBe(2)
  })

  it('點圓點可直接跳到指定的圖片', async () => {
    const wrapper = mountCarousel()
    await wrapper.findAll('.carousel-dot')[2].trigger('click')
    await endTransition(wrapper)
    expect(currentNo(wrapper)).toBe(3)
  })

  it('手指往左滑看下一張、往右滑看上一張，滑到最後一張再往左滑回到第一張', async () => {
    const wrapper = mountCarousel()

    await swipe(wrapper, 300, 150)
    await endTransition(wrapper)
    expect(currentNo(wrapper)).toBe(2)

    await swipe(wrapper, 150, 300)
    await endTransition(wrapper)
    expect(currentNo(wrapper)).toBe(1)

    await swipe(wrapper, 300, 150)
    await endTransition(wrapper)
    await swipe(wrapper, 300, 150, { pointerType: 'mouse' })
    await endTransition(wrapper)
    expect(currentNo(wrapper)).toBe(3)
    await swipe(wrapper, 300, 150)
    await endTransition(wrapper)
    expect(currentNo(wrapper)).toBe(1)
  })

  it('滑動距離太短會彈回原本那張；上下滑動不會切換圖片', async () => {
    const wrapper = mountCarousel()
    await swipe(wrapper, 300, 285)
    await endTransition(wrapper)
    expect(currentNo(wrapper)).toBe(1)

    const base = { pointerId: 2, pointerType: 'touch' }
    await firePointer(wrapper, 'pointerdown', { ...base, clientX: 200, clientY: 100 })
    await firePointer(wrapper, 'pointermove', { ...base, clientX: 190, clientY: 40 })
    await firePointer(wrapper, 'pointerup', { ...base, clientX: 120, clientY: 10 })
    await endTransition(wrapper)
    expect(currentNo(wrapper)).toBe(1)
  })

  it('動畫事件沒觸發時，時間到也會完成切換（不會卡住）', async () => {
    vi.useFakeTimers()
    const wrapper = mountCarousel()
    await wrapper.find('.carousel-arrow.is-prev').trigger('click')
    vi.advanceTimersByTime(600)
    await wrapper.vm.$nextTick()
    expect(currentNo(wrapper)).toBe(3)
    // 解除鎖定後可以繼續操作
    await wrapper.find('.carousel-arrow.is-next').trigger('click')
    vi.advanceTimersByTime(600)
    await wrapper.vm.$nextTick()
    expect(currentNo(wrapper)).toBe(1)
  })

  it('只有一張圖片：不顯示箭頭與圓點，也沒有複製圖', () => {
    const wrapper = mountCarousel(['/assets/tooltip/only.png'])
    expect(wrapper.findAll('img.slide-image')).toHaveLength(1)
    expect(wrapper.find('.carousel-arrow').exists()).toBe(false)
    expect(wrapper.find('.carousel-dot').exists()).toBe(false)
  })

  it('沒有圖片：顯示「示意圖片準備中」', () => {
    const wrapper = mountCarousel([])
    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.find('.slide-image-placeholder').text()).toContain('示意圖片準備中')
    expect(wrapper.find('.carousel-zoom-btn').exists()).toBe(false)
  })
})

describe('TourImageCarousel 點圖片放大', () => {
  // 點一下：按下、放開（移動不超過 6px），接著瀏覽器送出 click
  const tap = async (wrapper, x = 200, y = 100) => {
    await firePointer(wrapper, 'pointerdown', { clientX: x, clientY: y, pointerType: 'mouse' })
    await firePointer(wrapper, 'pointerup', { clientX: x + 2, clientY: y + 1, pointerType: 'mouse' })
    await wrapper.find('.slide-media-container').trigger('click', { clientX: x + 2, clientY: y + 1 })
  }

  it('點一下圖片會要求放大檢視目前這張', async () => {
    const wrapper = mountCarousel()
    await tap(wrapper)
    expect(wrapper.emitted('zoom')[0]).toEqual([0])

    await wrapper.find('.carousel-arrow.is-next').trigger('click')
    await endTransition(wrapper)
    await tap(wrapper)
    expect(wrapper.emitted('zoom')[1]).toEqual([1])
  })

  it('右上角「放大」按鈕也能開啟放大檢視', async () => {
    const wrapper = mountCarousel()
    await wrapper.find('.carousel-zoom-btn').trigger('click')
    expect(wrapper.emitted('zoom')[0]).toEqual([0])
  })

  it('滑動切換圖片或點箭頭時不會開啟放大檢視', async () => {
    const wrapper = mountCarousel()
    // 滑鼠拖曳切換：放開後瀏覽器仍會送出 click，但拖曳過所以不算點圖片
    await swipe(wrapper, 300, 150, { pointerType: 'mouse' })
    await wrapper.find('.slide-media-container').trigger('click', { clientX: 150, clientY: 100 })
    await endTransition(wrapper)
    expect(currentNo(wrapper)).toBe(2)

    // 點箭頭與圓點只會切換圖片
    await wrapper.find('.carousel-arrow.is-next').trigger('click')
    await endTransition(wrapper)
    await wrapper.findAll('.carousel-dot')[0].trigger('click')
    await endTransition(wrapper)
    expect(currentNo(wrapper)).toBe(1)
    expect(wrapper.emitted('zoom')).toBeUndefined()
  })

  it('只有一張圖片也可以點圖片放大', async () => {
    const wrapper = mountCarousel(['/assets/tooltip/only.png'])
    await tap(wrapper)
    expect(wrapper.emitted('zoom')[0]).toEqual([0])
  })

  it('圖片載入失敗時不提供放大', async () => {
    const wrapper = mountCarousel(['/assets/tooltip/broken.png'])
    await wrapper.find('img.slide-image').trigger('error')
    expect(wrapper.find('.carousel-zoom-btn').exists()).toBe(false)
    await tap(wrapper)
    expect(wrapper.emitted('zoom')).toBeUndefined()
  })

  it('第一張圖片載入後回報它的寬高比（複製圖不重複回報）', async () => {
    const wrapper = mountCarousel()
    const imgs = wrapper.findAll('img.slide-image')
    for (const img of imgs) {
      Object.defineProperty(img.element, 'naturalWidth', { value: 1920, configurable: true })
      Object.defineProperty(img.element, 'naturalHeight', { value: 912, configurable: true })
      await img.trigger('load')
    }
    expect(wrapper.emitted('ratio')).toHaveLength(1)
    expect(wrapper.emitted('ratio')[0][0]).toBeCloseTo(2.105, 3)
  })

  it('jumpTo 可不帶動畫直接切到指定的圖片', async () => {
    const wrapper = mountCarousel()
    wrapper.vm.jumpTo(2)
    await wrapper.vm.$nextTick()
    expect(currentNo(wrapper)).toBe(3)
    expect(wrapper.find('.carousel-track').classes()).not.toContain('is-animating')
  })
})
