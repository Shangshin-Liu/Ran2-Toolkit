// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import TourImageLightbox from '@/components/TourImageLightbox.vue'
import { clampMediaRatio, getZoomWidth, canZoomFurther } from '@/composables/useTour.js'

const IMAGES = ['/assets/tooltip/z-1.webp', '/assets/tooltip/z-2.webp', '/assets/tooltip/z-3.webp']

const mountLightbox = (props = {}) => mount(TourImageLightbox, {
  props: { images: IMAGES, startIndex: 0, title: '建立招募', ...props },
  attachTo: document.body
})

const counterText = (wrapper) => wrapper.find('.lightbox-counter').text()

// jsdom 沒有排版與圖片解碼：手動給圖片原始尺寸與顯示尺寸，再送出 load
const fakeImageLayout = async (wrapper, { natural = [1920, 912], shown = [400, 190] } = {}) => {
  const img = wrapper.find('img.lightbox-image')
  Object.defineProperty(img.element, 'naturalWidth', { value: natural[0], configurable: true })
  Object.defineProperty(img.element, 'naturalHeight', { value: natural[1], configurable: true })
  img.element.getBoundingClientRect = () => ({ left: 0, top: 0, width: shown[0], height: shown[1], right: shown[0], bottom: shown[1] })
  await img.trigger('load')
  return img
}

const firePointer = async (wrapper, type, { clientX, clientY = 100, pointerId = 1, pointerType = 'touch' }) => {
  const el = wrapper.find('.lightbox-stage').element
  const Ctor = typeof window.PointerEvent === 'function' ? window.PointerEvent : window.MouseEvent
  const evt = new Ctor(type, { bubbles: true, cancelable: true, clientX, clientY, button: 0, pointerId, pointerType })
  if (evt.pointerId !== pointerId) Object.defineProperty(evt, 'pointerId', { value: pointerId })
  if (evt.pointerType !== pointerType) Object.defineProperty(evt, 'pointerType', { value: pointerType })
  el.dispatchEvent(evt)
  await wrapper.vm.$nextTick()
}

describe('放大檢視相關計算', () => {
  it('clampMediaRatio：依圖片尺寸計算框的比例，並限制在 1.2～3.2 之間', () => {
    expect(clampMediaRatio(1920, 912)).toBeCloseTo(2.105, 3)
    expect(clampMediaRatio(500, 1000)).toBe(1.2)
    expect(clampMediaRatio(4000, 500)).toBe(3.2)
    expect(clampMediaRatio(0, 500)).toBeNull()
    expect(clampMediaRatio(undefined, undefined)).toBeNull()
  })

  it('getZoomWidth：放大到原始寬度，但最多是全圖寬度的 3 倍', () => {
    expect(getZoomWidth(1920, 1300)).toBe(1920)
    expect(getZoomWidth(1920, 360)).toBe(1080)
    expect(getZoomWidth(0, 360)).toBe(0)
  })

  it('canZoomFurther：全圖已接近原始大小（差不到 15%）時不再提供放大', () => {
    expect(canZoomFurther(1920, 360)).toBe(true)
    expect(canZoomFurther(1920, 1300)).toBe(true)
    expect(canZoomFurther(1920, 1800)).toBe(false)
    expect(canZoomFurther(1920, 0)).toBe(false)
  })
})

describe('TourImageLightbox 放大檢視', () => {
  it('從指定的那張開始顯示，並顯示標題與張數', () => {
    const wrapper = mountLightbox({ startIndex: 1 })
    expect(wrapper.find('img.lightbox-image').attributes('src')).toBe(IMAGES[1])
    expect(wrapper.find('.lightbox-title').text()).toBe('建立招募')
    expect(counterText(wrapper)).toBe('2 / 3')
    wrapper.unmount()
  })

  it('左右箭頭切換圖片，頭尾循環', async () => {
    const wrapper = mountLightbox()
    await wrapper.find('.lightbox-arrow.is-prev').trigger('click')
    expect(counterText(wrapper)).toBe('3 / 3')
    await wrapper.find('.lightbox-arrow.is-next').trigger('click')
    expect(counterText(wrapper)).toBe('1 / 3')
    await wrapper.find('.lightbox-arrow.is-next').trigger('click')
    expect(wrapper.find('img.lightbox-image').attributes('src')).toBe(IMAGES[1])
    wrapper.unmount()
  })

  it('全圖模式左右滑動切換圖片', async () => {
    const wrapper = mountLightbox()
    await firePointer(wrapper, 'pointerdown', { clientX: 300 })
    await firePointer(wrapper, 'pointerup', { clientX: 150 })
    expect(counterText(wrapper)).toBe('2 / 3')
    await firePointer(wrapper, 'pointerdown', { clientX: 150 })
    await firePointer(wrapper, 'pointerup', { clientX: 320 })
    expect(counterText(wrapper)).toBe('1 / 3')
    wrapper.unmount()
  })

  it('關閉時回傳最後看的那張（✕ 按鈕或點圖片以外的地方）', async () => {
    const wrapper = mountLightbox()
    await wrapper.find('.lightbox-arrow.is-next').trigger('click')
    await wrapper.find('.lightbox-close').trigger('click')
    expect(wrapper.emitted('close')[0]).toEqual([1])

    await wrapper.find('.lightbox-canvas').trigger('click')
    expect(wrapper.emitted('close')[1]).toEqual([1])
    wrapper.unmount()
  })

  it('全圖小於原始大小時，點圖片放大到原始尺寸，再點一次縮回全圖', async () => {
    const wrapper = mountLightbox()
    const img = await fakeImageLayout(wrapper, { natural: [1920, 912], shown: [400, 190] })
    expect(wrapper.find('.lightbox-hint').text()).toContain('點圖片放大')

    await img.trigger('click', { clientX: 200, clientY: 95 })
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.lightbox-stage').classes()).toContain('is-zoomed')
    // 手機寬度：最多放大到全圖的 3 倍（1200px），不會直接放到 1920px
    expect(img.attributes('style')).toContain('width: 1200px')
    expect(wrapper.find('.lightbox-hint').text()).toContain('縮回全圖')

    await img.trigger('click', { clientX: 10, clientY: 10 })
    expect(wrapper.find('.lightbox-stage').classes()).not.toContain('is-zoomed')
    expect(wrapper.emitted('close')).toBeUndefined()
    wrapper.unmount()
  })

  it('全圖已接近原始大小時，點圖片不會放大', async () => {
    const wrapper = mountLightbox()
    const img = await fakeImageLayout(wrapper, { natural: [1920, 912], shown: [1850, 879] })
    await img.trigger('click', { clientX: 900, clientY: 400 })
    expect(wrapper.find('.lightbox-stage').classes()).not.toContain('is-zoomed')
    expect(wrapper.emitted('close')).toBeUndefined()
    wrapper.unmount()
  })

  it('切換圖片時自動縮回全圖', async () => {
    const wrapper = mountLightbox()
    const img = await fakeImageLayout(wrapper)
    await img.trigger('click', { clientX: 200, clientY: 95 })
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.lightbox-stage').classes()).toContain('is-zoomed')
    await wrapper.find('.lightbox-arrow.is-next').trigger('click')
    expect(wrapper.find('.lightbox-stage').classes()).not.toContain('is-zoomed')
    wrapper.unmount()
  })

  it('只有一張圖片時不顯示箭頭與張數', () => {
    const wrapper = mountLightbox({ images: ['/assets/tooltip/only.webp'] })
    expect(wrapper.find('.lightbox-arrow').exists()).toBe(false)
    expect(wrapper.find('.lightbox-counter').exists()).toBe(false)
    wrapper.unmount()
  })
})
