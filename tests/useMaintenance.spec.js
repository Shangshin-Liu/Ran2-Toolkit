import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useMaintenance } from '@/composables/useMaintenance.js'

vi.mock('@/firebase', () => ({
  db: {}
}))

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  onSnapshot: vi.fn((ref, callback) => {
    callback({
      exists: () => true,
      data: () => ({
        password: 'testpassword123',
        boxes: { enabled: true, title: '禮盒維護中', message: '測試訊息' }
      })
    })
    return () => {}
  })
}))

describe('useMaintenance composable 測試', () => {
  beforeEach(() => {
    localStorage.clear()
    const { lockMaintenance } = useMaintenance()
    lockMaintenance()
  })

  it('初始狀態下 isBypassed 應為 false', () => {
    const { isBypassed } = useMaintenance()
    expect(isBypassed.value).toBe(false)
  })

  it('驗證密碼時，輸入正確密碼應回傳 true，錯誤密碼回傳 false', async () => {
    const { initMaintenance, verifyPassword } = useMaintenance()
    await initMaintenance()

    expect(await verifyPassword('testpassword123')).toBe(true)
    expect(await verifyPassword('  testpassword123  ')).toBe(true)
    expect(await verifyPassword('wrongpass')).toBe(false)
    expect(await verifyPassword('')).toBe(false)
  })

  it('調用 unlockMaintenance() 後 isBypassed 應為 true 且持久化存至 localStorage', () => {
    const { isBypassed, unlockMaintenance } = useMaintenance()
    unlockMaintenance()

    expect(isBypassed.value).toBe(true)
    expect(localStorage.getItem('ran2_maintenance_bypassed')).toBe('true')
  })

  it('調用 lockMaintenance() 後 isBypassed 應恢復為 false', () => {
    const { isBypassed, unlockMaintenance, lockMaintenance } = useMaintenance()
    unlockMaintenance()
    expect(isBypassed.value).toBe(true)

    lockMaintenance()
    expect(isBypassed.value).toBe(false)
    expect(localStorage.getItem('ran2_maintenance_bypassed')).toBeNull()
  })
})
