import { mount, flushPromises } from '@vue/test-utils'
import Share from '@/views/Share.vue'
import { describe, it, expect, vi } from 'vitest'

// 0. Mock vue-router
vi.mock('vue-router', () => ({
  useRoute: () => ({ query: {}, path: '/share' }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() })
}))

// 1. Mock firebase/app, @/firebase, and firebase/firestore
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({}))
}))

vi.mock('@/firebase', () => ({
  db: {},
  messaging: {}
}))

vi.mock('firebase/messaging', () => ({
  getMessaging: vi.fn(() => ({})),
  getToken: vi.fn(async () => 'mock-fcm-token'),
  onMessage: vi.fn(() => () => {})
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

const mountShare = () => mount(Share, {
  global: {
    stubs: {
      RouterLink: true,
      'router-link': true
    }
  }
})

describe('Share.vue 好物交易測試', () => {
  it('初始狀態下，好物交易頁面應正常渲染與呈現', async () => {
    const wrapper = mountShare()
    await flushPromises()
    
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.find('.share-page').exists()).toBe(true)
  })

  it('應呈現交易平台搜尋與商店清單區域', async () => {
    const wrapper = mountShare()
    await flushPromises()
    
    const searchBar = wrapper.find('input[type="text"]')
    expect(searchBar.exists()).toBe(true)
  })
})
