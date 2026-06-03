import { mount, flushPromises } from '@vue/test-utils'
import Share from '@/views/Share.vue'
import { describe, it, expect, vi } from 'vitest'

// 1. Mock firebase/app, @/firebase, and firebase/firestore
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({}))
}))

vi.mock('@/firebase', () => ({
  db: {}
}))

vi.mock('firebase/firestore', () => {
  const initialShares = [
    {
      id: 'item-1',
      name: '雷神弓‧天誅',
      type: '武器',
      image: '/assets/share/asset1.jpg',
      giverId: '幻海奇緣',
      server: '新東京',
      passwordHash: '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', // '1234'
      status: '分享中',
      statReq: ['要求: 等級 195'],
      stats: ['狀態異常: 麻痺(35%機率)', '3回+0.8%'],
      notes: '大老退坑免費贈送',
      createdAt: Date.now() - 3600000 * 24,
      updatedAt: Date.now() - 3600000 * 24,
      claimTime: null,
      completeTime: null,
      receiverId: null,
      applicantCount: 0
    }
  ]

  const mockOnSnapshot = vi.fn((queryRef, callback) => {
    const docs = []
    if (queryRef && queryRef._path === 'shares') {
      initialShares.forEach(item => {
        docs.push({
          id: item.id,
          data: () => item
        })
      })
    }
    // 即刻呼叫 callback 以載入資料
    callback({
      forEach: (cb) => docs.forEach(cb)
    })
    return () => {}
  })

  const mockGetDoc = vi.fn(async (docRef) => {
    if (docRef && docRef._id === 'TEST1') {
      return {
        exists: () => true,
        data: () => ({ charId: '幻海奇緣', createdAt: Date.now() })
      }
    }
    return { exists: () => false }
  })

  const mockDoc = vi.fn((db, coll, id) => ({ _coll: coll, _id: id }))
  const mockCollection = vi.fn((db, coll) => ({ _path: coll }))

  const mockQuery = vi.fn((collRef, ...constraints) => {
    return {
      _path: collRef._path,
      ...collRef
    }
  })

  const mockGetDocs = vi.fn(async (queryRef) => {
    const docs = []
    if (queryRef && queryRef._path === 'shares') {
      docs.push({
        id: 'item-history-1',
        data: () => ({
          id: 'item-history-1',
          name: '雷神弓‧天誅',
          type: '武器',
          image: '/assets/share/asset1.jpg',
          giverId: '幻海奇緣',
          server: '新東京',
          status: '已完成',
          completeTime: Date.now() - 3600000,
          receiverId: '破壞之王',
          notes: '贈予成功！'
        })
      })
    }
    return {
      docs,
      forEach: (cb) => docs.forEach(cb)
    }
  })

  const mockWriteBatch = vi.fn(() => ({
    set: vi.fn(),
    update: vi.fn(),
    commit: vi.fn(async () => {})
  }))

  return {
    getFirestore: vi.fn(),
    collection: mockCollection,
    doc: mockDoc,
    setDoc: vi.fn(async () => {}),
    addDoc: vi.fn(async () => ({ id: 'new-id' })),
    updateDoc: vi.fn(async () => {}),
    getDoc: mockGetDoc,
    getDocs: mockGetDocs,
    onSnapshot: mockOnSnapshot,
    writeBatch: mockWriteBatch,
    increment: vi.fn((n) => n),
    query: mockQuery,
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    startAfter: vi.fn()
  }
})

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
