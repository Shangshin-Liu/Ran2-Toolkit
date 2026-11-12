import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import { useScrollLock } from '@/composables/useScrollLock.js'

const Dialog = defineComponent({
  props: { open: Boolean },
  setup(props) {
    useScrollLock(() => props.open)
    return () => h('div')
  }
})

describe('useScrollLock', () => {
  it('開啟時鎖定背景捲動，全部關閉後才還原', async () => {
    document.body.style.overflow = 'auto'
    const a = mount(Dialog, { props: { open: false } })
    const b = mount(Dialog, { props: { open: false } })
    expect(document.body.style.overflow).toBe('auto')

    await a.setProps({ open: true })
    expect(document.body.style.overflow).toBe('hidden')
    await b.setProps({ open: true })
    await a.setProps({ open: false })
    await nextTick()
    expect(document.body.style.overflow).toBe('hidden') // b 還開著

    b.unmount() // 開啟狀態下被卸載也要還原
    expect(document.body.style.overflow).toBe('auto')
    a.unmount()
    document.body.style.overflow = ''
  })
})
