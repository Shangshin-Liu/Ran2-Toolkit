import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import fs from 'fs'
import path from 'path'

const mockGetDoc = vi.fn()
const mockGetDocs = vi.fn()
const mockSetDoc = vi.fn()

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_db, name) => ({ type: 'collection', name })),
  doc: vi.fn((_db, col, id) => ({ type: 'doc', col, id })),
  getDoc: (...args) => mockGetDoc(...args),
  getDocs: (...args) => mockGetDocs(...args),
  setDoc: (...args) => mockSetDoc(...args),
}))

vi.mock('@/firebase.js', () => ({
  db: {},
  messaging: null,
}))

import Tasks from '@/views/Tasks.vue'
import {
  FirestoreTaskProvider,
  TASKS_CACHE_KEY,
  TASKS_LAST_UPDATED_KEY,
} from '@/services/taskService.js'
import {
  VERSION_MISMATCH_WARNING,
  parseTaskName,
  buildTaskIndexes,
  parseProgressData,
  parseProgressPayload,
  serializeProgressData,
  toggleTaskDone,
  planToggleTaskWithCascade,
  getTaskStatus,
  calculateOverallStats,
  evaluatePrerequisites,
  formatRequirements,
  buildTaskContext,
  formatExportedDate,
  normalizeQuestNameForOcr,
  filterTasksByQuery,
} from '@/utils/taskLogic.js'

const metaTasksJsonPath = path.resolve(__dirname, '../backups/meta-tasks.json')
const metaTasksPayload = JSON.parse(fs.readFileSync(metaTasksJsonPath, 'utf-8'))
const realTasks = metaTasksPayload.tasks
const currentDbVersion = metaTasksPayload.version

describe('taskLogic 純函式單元測試', () => {
  const indexes = buildTaskIndexes(realTasks)

  it('1. 名稱拆解與分類樹：共 169 個任務、18 個分類、能力點總計 122、技能點總計 202', () => {
    expect(parseTaskName('【劇情】回收地圖 (聖門)')).toEqual({
      prefix: '劇情',
      cleanName: '回收地圖 (聖門)',
    })
    expect(indexes.taskMap.size).toBe(169)
    expect(indexes.categories.length).toBe(18)

    const stats = calculateOverallStats(realTasks, [], indexes)
    expect(stats.totalTasks).toBe(169)
    expect(stats.completedTasks).toBe(0)
    expect(stats.totalStatsPoints).toBe(122)
    expect(stats.totalSkillPoints).toBe(202)
  })

  it('2. 遊戲群組 (groupId < 10000)：勾選「學院生註冊 (聖門弓箭)」(quest-0006) 會一併勾選同群組 12 個任務，取消時 12 個一起取消', () => {
    const doneAfterCheck = toggleTaskDone([], 'quest-0006', indexes)
    expect(doneAfterCheck.length).toBe(12)
    const statsAfterCheck = calculateOverallStats(realTasks, doneAfterCheck, indexes)
    expect(statsAfterCheck.completedTasks).toBe(12)

    const doneAfterUncheck = toggleTaskDone(doneAfterCheck, 'quest-0006', indexes)
    expect(doneAfterUncheck.length).toBe(0)
  })

  it('3. 手動群組 (groupId >= 10000)：勾選「變態三男的逆襲 (弓箭)」(quest-2070)，其他 3 個版本為 group-done，完成數 +4，能力點與技能點各只 +1', () => {
    const done = toggleTaskDone([], 'quest-2070', indexes)
    expect(done).toEqual(['quest-2070'])

    expect(getTaskStatus('quest-2070', done, indexes)).toBe('done')
    expect(getTaskStatus('quest-2068', done, indexes)).toBe('group-done')
    expect(getTaskStatus('quest-2069', done, indexes)).toBe('group-done')
    expect(getTaskStatus('quest-2071', done, indexes)).toBe('group-done')

    const stats = calculateOverallStats(realTasks, done, indexes)
    expect(stats.completedTasks).toBe(4)
    expect(stats.earnedStatsPoints).toBe(1)
    expect(stats.earnedSkillPoints).toBe(1)
  })

  it('4. 前置任務判斷：「學生主任的測驗 (聖門)」(quest-0012) 含 4 個同群組前置，顯示完成其中一個即可；若前置不存在則提示「此任務不存在於資料庫」', () => {
    const task0012 = indexes.taskMap.get('quest-0012')
    const prereqEval = evaluatePrerequisites(task0012, [], indexes)
    expect(prereqEval.items.length).toBe(4)
    expect(prereqEval.isSameGroupAny).toBe(true)
    expect(prereqEval.isSatisfied).toBe(false)
    expect(prereqEval.showLockedHint).toBe(true)

    const mockTask = {
      id: 'quest-mock',
      name: '測試任務',
      requiredIds: ['quest-non-existent'],
    }
    const mockEval = evaluatePrerequisites(mockTask, [], indexes)
    expect(mockEval.items[0].exists).toBe(false)
    expect(mockEval.items[0].cleanName).toBe('此任務不存在於資料庫')
  })

  it('5. 接取條件格式化：支援全部 10 種條件與 notCompleted 警示判斷', () => {
    const task0172 = indexes.taskMap.get('quest-0172')
    const reqsBefore = formatRequirements(task0172, [], indexes)
    const notCompBefore = reqsBefore.find((r) => r.type === 'notCompleted')
    expect(notCompBefore.text).toBe('需尚未完成：物理老師的考試 (聖門)')
    expect(notCompBefore.isWarning).toBe(false)

    const reqsAfter = formatRequirements(task0172, ['quest-0173'], indexes)
    const notCompAfter = reqsAfter.find((r) => r.type === 'notCompleted')
    expect(notCompAfter.isWarning).toBe(true)

    const task2408 = indexes.taskMap.get('quest-2408')
    const reqs2408 = formatRequirements(task2408, [], indexes)
    expect(reqs2408.map((r) => r.text)).toContain('限時 40 分鐘')
    expect(reqs2408.map((r) => r.text)).toContain('等級 150～170')

    const customTask = {
      requirements: [
        { type: 'levelWithSkill', value: '167', skills: ['142/10', '142/14'] },
        { type: 'failOnDeath', value: 'true' },
        { type: 'item', value: '164/7' },
        { type: 'fee', value: '50000' },
        { type: 'school', value: '聖門' },
        { type: 'advancedClass', value: 'required' },
        { type: 'advancedClass', value: 'forbidden' },
      ],
    }
    const formattedCustom = formatRequirements(customTask, [], indexes).map((r) => r.text)
    expect(formattedCustom).toEqual([
      '學過技能 142/10、142/14 者：等級 167 以上',
      '死亡即任務失敗',
      '需持有道具 164/7',
      '接取時支付 50,000 金幣',
      '限聖門學院',
      '限奧義職業',
      '已轉職奧義者不可接取',
    ])
  })

  it('6. 任務脈絡 BFS：驗證「莫名的指責」、「第二次考試 [限時]」往前 8 層與「掃除剪刀手」孤立節點', () => {
    const ctx2192 = buildTaskContext('quest-2192', [], indexes)
    expect(ctx2192.upLayers.length).toBe(0)
    expect(ctx2192.downLayers.length).toBe(3)
    expect(ctx2192.downLayers[0].nodes.map((n) => n.cleanName)).toEqual(['另一個自己?!'])
    expect(ctx2192.downLayers[1].nodes.map((n) => n.cleanName)).toEqual(['災難的開始'])
    expect(ctx2192.downLayers[2].nodes.length).toBe(4)

    const ctx0382 = buildTaskContext('quest-0382', [], indexes)
    expect(ctx0382.upLayers.length).toBe(8)
    expect(ctx0382.upLayers[0].title).toBe('前置任務 · 往前第 8 層')
    expect(ctx0382.upLayers[7].title).toBe('前置任務 · 往前第 1 層')

    const ctx0232 = buildTaskContext('quest-0232', [], indexes)
    expect(ctx0232.isIsolated).toBe(true)
    expect(ctx0232.totalPrereqCount).toBe(0)
    expect(ctx0232.totalFollowUpCount).toBe(0)
  })

  it('7. 進度儲存容錯、版本比對與第二階段 OCR 正規化', () => {
    expect(parseProgressData(null, indexes)).toEqual([])
    expect(parseProgressData('invalid json {', indexes)).toEqual([])
    expect(parseProgressData('{"version":"26101718","done":["invalid-id", 123, "quest-0179"]}', indexes)).toEqual([
      'quest-0179',
      'quest-0215',
      'quest-0255',
    ])

    const matchPayload = parseProgressPayload(
      serializeProgressData(['quest-0179'], currentDbVersion),
      indexes,
      currentDbVersion
    )
    expect(matchPayload.versionMismatch).toBe(false)
    expect(matchPayload.incomingVersion).toBe(currentDbVersion)

    const mismatchPayload = parseProgressPayload(
      JSON.stringify({ version: 'old-ver', done: ['quest-0179'] }),
      indexes,
      currentDbVersion
    )
    expect(mismatchPayload.versionMismatch).toBe(true)

    expect(formatExportedDate('2026-10-17T07:41:49.203Z')).toBe('2026-10-17')
    expect(normalizeQuestNameForOcr('【劇情】 其名的指責 （玄巖）')).toBe('莫名的指責(玄嚴)')
  })

  it('8. NPC 任務排序：按照 等級(低->高) -> 群組(小->大，同群組靠在一起) -> id 排序', () => {
    // 測試「聖門/玄嚴/鳳凰洞」->「物理老師」，內含 groupId 13(Lv29), 14(Lv31), 15(Lv31), null(Lv36)
    const holeCat = indexes.categories.find((c) => c.name === '聖門/玄嚴/鳳凰洞')
    const physicsNpc = holeCat.npcs.find((n) => n.name === '物理老師')
    const physicsTasks = physicsNpc.tasks

    const firstGroup13Idx = physicsTasks.findIndex((t) => t.groupId === 13)
    const firstGroup14Idx = physicsTasks.findIndex((t) => t.groupId === 14)
    const firstGroup15Idx = physicsTasks.findIndex((t) => t.groupId === 15)
    const scissorIdx = physicsTasks.findIndex((t) => t.id === 'quest-0232')
    expect(firstGroup13Idx).toBeLessThan(firstGroup14Idx)
    expect(firstGroup14Idx).toBeLessThan(firstGroup15Idx)
    expect(firstGroup15Idx).toBeLessThan(scissorIdx)

    // 測試含不同等級同群組任務 (groupId 18，含 Lv43 與 Lv46) 的 NPC，確認同群組任務全部緊鄰在一起
    const sampleG18 = indexes.groupMap.get(18)[0]
    const g18Cat = indexes.categories.find((c) => c.name === sampleG18.categoryName)
    const g18Npc = g18Cat.npcs.find((n) => n.name === sampleG18.npcName)
    const group18Indices = g18Npc.tasks
      .map((t, idx) => (t.groupId === 18 ? idx : -1))
      .filter((idx) => idx !== -1)
    expect(group18Indices.length).toBe(3)
    expect(group18Indices[2] - group18Indices[0]).toBe(2)
  })

  it('9. 連帶完成前置與連帶取消後續任務計算 (planToggleTaskWithCascade)', () => {
    // 勾選 quest-0179 (回收地圖 聖門)，其前置為 quest-0174 -> quest-0173，皆尚未完成
    const checkPlan = planToggleTaskWithCascade([], 'quest-0179', indexes)
    expect(checkPlan.mode).toBe('check-prereqs')
    expect(checkPlan.needsConfirm).toBe(true)
    expect(checkPlan.affectedTasks.map((t) => t.id)).toContain('quest-0174')
    expect(checkPlan.affectedTasks.map((t) => t.id)).toContain('quest-0173')
    expect(getTaskStatus('quest-0179', checkPlan.nextDoneIds, indexes)).toBe('done')
    expect(getTaskStatus('quest-0174', checkPlan.nextDoneIds, indexes)).toBe('done')
    expect(getTaskStatus('quest-0173', checkPlan.nextDoneIds, indexes)).toBe('done')

    // 當前置與後續皆已完成時，取消勾選最上游的 quest-0173，應提示連帶取消 quest-0174 與 quest-0179
    const uncheckPlan = planToggleTaskWithCascade(checkPlan.nextDoneIds, 'quest-0173', indexes)
    expect(uncheckPlan.mode).toBe('uncheck-followups')
    expect(uncheckPlan.needsConfirm).toBe(true)
    expect(uncheckPlan.affectedTasks.map((t) => t.id)).toContain('quest-0174')
    expect(uncheckPlan.affectedTasks.map((t) => t.id)).toContain('quest-0179')
    expect(getTaskStatus('quest-0173', uncheckPlan.nextDoneIds, indexes)).toBe('todo')
    expect(getTaskStatus('quest-0174', uncheckPlan.nextDoneIds, indexes)).toBe('todo')
    expect(getTaskStatus('quest-0179', uncheckPlan.nextDoneIds, indexes)).toBe('todo')
  })

  it('10. 文字模糊搜尋 (filterTasksByQuery)', () => {
    const results = filterTasksByQuery('回收地圖', [], indexes)
    expect(results.length).toBeGreaterThanOrEqual(3)
    expect(results.some((t) => t.id === 'quest-0179')).toBe(true)
  })
})

describe('Tasks.vue 元件與驗收清單整合測試', () => {
  beforeEach(() => {
    localStorage.clear()
    mockGetDoc.mockReset()
    mockGetDocs.mockReset()
    mockSetDoc.mockReset()

    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        lastUpdated: 1792240772515,
        version: currentDbVersion,
        total: realTasks.length,
      }),
    })

    mockGetDocs.mockResolvedValue({
      forEach: (cb) => {
        for (const t of realTasks) {
          cb({ id: t.id, data: () => ({ ...t }) })
        }
      },
    })
  })

  it('FirestoreTaskProvider 快取機制：首次進入下載完整任務庫並寫入快取；lastUpdated 未異動時直接讀本地快取不拉取集合；lastUpdated 異動時重新下載', async () => {
    // 1. 首次載入：本地無快取，應讀取 metadata/tasks 並下載完整 tasks 集合
    const firstLoad = await FirestoreTaskProvider.fetchMetaTasks()
    expect(firstLoad.tasks.length).toBe(169)
    expect(firstLoad.version).toBe(currentDbVersion)
    expect(mockGetDoc).toHaveBeenCalledTimes(1)
    expect(mockGetDocs).toHaveBeenCalledTimes(1)
    expect(localStorage.getItem(TASKS_LAST_UPDATED_KEY)).toBe('1792240772515')
    expect(localStorage.getItem(TASKS_CACHE_KEY)).toBeTruthy()

    // 2. 第二次載入：metadata/tasks 的 lastUpdated 未異動，不應再次呼叫 getDocs 下載完整集合
    const secondLoad = await FirestoreTaskProvider.fetchMetaTasks()
    expect(secondLoad.tasks.length).toBe(169)
    expect(mockGetDoc).toHaveBeenCalledTimes(2)
    expect(mockGetDocs).toHaveBeenCalledTimes(1)

    // 3. 第三次載入：模擬雲端 metadata/tasks 的 lastUpdated 發生異動，應重新呼叫 getDocs 下載並更新快取
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        lastUpdated: 1792249999999,
        version: currentDbVersion,
        total: realTasks.length,
      }),
    })
    const thirdLoad = await FirestoreTaskProvider.fetchMetaTasks()
    expect(thirdLoad.tasks.length).toBe(169)
    expect(mockGetDoc).toHaveBeenCalledTimes(3)
    expect(mockGetDocs).toHaveBeenCalledTimes(2)
    expect(localStorage.getItem(TASKS_LAST_UPDATED_KEY)).toBe('1792249999999')
  })

  it('完整走過驗收清單：分類展開、精簡 NPC 顯示、連帶前置/後續提示、模糊搜尋定位與版本差異提示', async () => {
    const wrapper = mount(Tasks, {
      global: {
        stubs: {
          'router-link': true,
        },
      },
    })
    await flushPromises()

    // 驗收 1：初始狀態 0/169、0/122、0/202，共 18 個分類
    expect(wrapper.text()).toContain('亂2 任務進度')
    expect(wrapper.text()).toContain('0/169')
    expect(wrapper.text()).toContain('0/122')
    expect(wrapper.text()).toContain('0/202')
    const categoryBtns = wrapper.findAll('.category-row-btn')
    expect(categoryBtns.length).toBe(18)

    // 驗收 2：學院本館 → 學院主任：NPC 列表只顯示 X/Y，不顯示「已完成 · 未完成」冗長文字
    const mainHallBtn = categoryBtns.find((b) => b.text().includes('學院本館'))
    await mainHallBtn.trigger('click')
    const directorBtn = wrapper.findAll('.npc-row-btn').find((b) => b.text().includes('學院主任'))
    expect(directorBtn.text()).not.toContain('已完成')
    expect(directorBtn.find('.ratio-pill').exists()).toBe(true)
    await directorBtn.trigger('click')

    // 勾選「學院生註冊 (聖門弓箭)」(無前置任務)：同群組 12 個一起勾選
    const regBowCheckbox = wrapper.find('input[aria-label="標記「學院生註冊 (聖門弓箭)」為已完成"]')
    await regBowCheckbox.setValue(true)
    expect(wrapper.text()).toContain('12/169')

    await regBowCheckbox.setValue(false)
    expect(wrapper.text()).toContain('0/169')

    // 驗收 3：人人有功練系列 → 人人有功練 → 勾選「變態三男的逆襲 (弓箭)」：其他 3 個版本顯示「同群組已完成」，完成 +4，能力/技能各 +1
    const kungfuCatBtn = wrapper.findAll('.category-row-btn').find((b) => b.text().includes('人人有功練系列'))
    await kungfuCatBtn.trigger('click')
    const kungfuNpcBtn = wrapper.findAll('.npc-row-btn').find((b) => b.text().includes('人人有功練'))
    await kungfuNpcBtn.trigger('click')

    const trioBowCheckbox = wrapper.find('input[aria-label="標記「變態三男的逆襲 (弓箭)」為已完成"]')
    await trioBowCheckbox.setValue(true)
    expect(wrapper.text()).toContain('4/169')
    expect(wrapper.text()).toContain('1/122')
    expect(wrapper.text()).toContain('1/202')
    expect(wrapper.findAll('.group-done-pill').length).toBe(3)

    // 驗證當某分類/NPC 下的任務全數完成時，顯示 .is-all-completed 顯眼高亮（例如「本洞」→「陽台」僅 1 筆任務「鐵絲網上的小花」）
    const hole2CatBtn = wrapper.findAll('.category-row-btn').find((b) => b.text().includes('本洞'))
    await hole2CatBtn.trigger('click')
    const balconyNpcBtn = wrapper.findAll('.npc-row-btn').find((b) => b.text().includes('陽台'))
    await balconyNpcBtn.trigger('click')
    const flowerCheckbox = wrapper.find('input[aria-label="標記「鐵絲網上的小花」為已完成"]')
    await flowerCheckbox.setValue(true)
    expect(balconyNpcBtn.classes()).toContain('is-all-completed')

    // 驗收 4：文字模糊搜尋功能 — 在中間欄最上方輸入「回收地圖 (聖門)」，點選結果後自動切換分類、NPC 並選取該任務
    const searchInput = wrapper.find('.middle-search-input')
    expect(searchInput.exists()).toBe(true)
    await searchInput.setValue('回收地圖 (聖門)')
    const searchResultBtns = wrapper.findAll('.col-tasks .task-name-cell-btn')
    expect(searchResultBtns.length).toBeGreaterThan(0)
    await searchResultBtns[0].trigger('click')

    // 搜尋結果點選後，應自動收合搜尋並定位到「聖門/玄嚴/鳳凰洞」->「物理老師」->「回收地圖 (聖門)」
    expect(wrapper.find('.middle-search-input').element.value).toBe('')
    expect(wrapper.find('.col-detail').text()).toContain('回收地圖 (聖門)')

    // 驗收 5：連帶完成前置任務提示 — 直接勾選「回收地圖 (聖門)」時，因前置「紙幣驗證 (聖門)」與「物理老師的考試 (聖門)」未完成，應跳出提示視窗
    const mapCheckbox = wrapper.find('input[aria-label="標記「回收地圖 (聖門)」為已完成"]')
    await mapCheckbox.setValue(true)
    expect(wrapper.find('#cascade-dialog-title').exists()).toBe(true)
    expect(wrapper.find('#cascade-dialog-title').text()).toContain('連帶完成前置任務提示')
    expect(wrapper.find('.cascade-task-list').text()).toContain('紙幣驗證 (聖門)')
    expect(wrapper.find('.cascade-task-list').text()).toContain('物理老師的考試 (聖門)')

    // 確認一併完成
    await wrapper.find('.cascade-confirm-btn').trigger('click')
    expect(wrapper.find('#cascade-dialog-title').exists()).toBe(false)
    // 群組 13 (3個) + 群組 14 (3個) + 群組 15 (3個) + 變態三男 (4個) + 鐵絲網上的小花 (1個) = 14 個完成
    expect(wrapper.text()).toContain('14/169')

    // 驗收 6：連帶取消後續任務提示 — 取消勾選「物理老師的考試 (聖門)」時，因後續「紙幣驗證」與「回收地圖」已完成，應跳出提示視窗
    const examPhysicsCheckbox = wrapper.find('input[aria-label="標記「物理老師的考試 (聖門)」為已完成"]')
    await examPhysicsCheckbox.setValue(false)
    expect(wrapper.find('#cascade-dialog-title').exists()).toBe(true)
    expect(wrapper.find('#cascade-dialog-title').text()).toContain('連帶取消後續任務提示')
    await wrapper.find('.cascade-confirm-btn').trigger('click')
    expect(wrapper.text()).toContain('5/169')

    // 驗收 7：匯入進度版本號差異檢查 — 當匯入的 JSON version 與當前 meta-tasks.json version 不同時，顯示版本差異警告
    const importBtn = wrapper.findAll('.tracker-actions .action-btn').find((b) => b.text().includes('匯入進度'))
    await importBtn.trigger('click')
    await wrapper
      .find('#import-json-textarea')
      .setValue(JSON.stringify({ version: '19990101', done: ['quest-2070'] }))
    const applyBtn = wrapper
      .findAll('.small-dialog .dialog-footer .action-btn')
      .find((b) => b.text().includes('套用貼上內容'))
    await applyBtn.trigger('click')

    expect(wrapper.find('.status-banner.is-warning').exists()).toBe(true)
    expect(wrapper.find('.status-banner.is-warning').text()).toContain(VERSION_MISMATCH_WARNING)
  })
})
