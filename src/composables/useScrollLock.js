// 彈出視窗開啟時鎖定背景頁面捲動，讓捲軸只作用在視窗本身
// 以計數方式處理多個視窗同時開啟的情況：全部關閉後才還原

import { watch, onBeforeUnmount } from 'vue'

let lockCount = 0
let prevBodyOverflow = ''

const acquire = () => {
  if (typeof document === 'undefined') return
  if (lockCount === 0) {
    prevBodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  }
  lockCount++
}

const release = () => {
  if (typeof document === 'undefined' || lockCount === 0) return
  lockCount--
  if (lockCount === 0) document.body.style.overflow = prevBodyOverflow
}

/**
 * @param {() => boolean} isOpen 回傳視窗是否開啟的 getter
 */
export function useScrollLock(isOpen) {
  let locked = false
  const apply = (open) => {
    if (open && !locked) {
      locked = true
      acquire()
    } else if (!open && locked) {
      locked = false
      release()
    }
  }
  watch(isOpen, apply, { immediate: true })
  onBeforeUnmount(() => apply(false))
}
