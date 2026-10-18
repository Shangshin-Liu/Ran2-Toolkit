/**
 * 亂2 任務指南核心純函式模組
 * 處理：名稱解析、排序（等級 -> 群組 -> id）、分類與反向索引、群組連動、
 * 前置/後續連鎖勾選與取消、完成數與點數統計、前置任務判定、接取條件格式化、任務脈絡 BFS、
 * 進度匯出入與版本比對、模糊搜尋
 */

export const VERSION_MISMATCH_WARNING =
  '偵測到任務庫版本有差異，不存在的任務可能會發生未完成，請檢察任務列表內是否存在與預期不符的狀況'

export const MANUAL_GROUP_THRESHOLD = 10000
export const MAX_CONTEXT_DEPTH = 8
export const MAX_NODES_PER_LAYER = 8

/**
 * 拆解任務名稱開頭的 【…】 前綴標籤與顯示名稱
 * 例：「【劇情】回收地圖 (聖門)」 -> { prefix: '劇情', cleanName: '回收地圖 (聖門)' }
 */
export function parseTaskName(rawName) {
  if (!rawName || typeof rawName !== 'string') {
    return { prefix: null, cleanName: '' }
  }
  const trimmed = rawName.trim()
  const match = trimmed.match(/^【([^】]+)】\s*(.*)$/)
  if (match) {
    return {
      prefix: match[1] || null,
      cleanName: match[2] ? match[2].trim() : trimmed,
    }
  }
  return {
    prefix: null,
    cleanName: trimmed,
  }
}

/**
 * 取得不含 【…】 前綴的任務名稱
 */
export function getCleanTaskName(task) {
  if (!task) return ''
  return parseTaskName(task.name).cleanName
}

/**
 * 判斷是否為遊戲原生群組 (groupId < 10000)
 */
export function isGameGroup(groupId) {
  return typeof groupId === 'number' && groupId < MANUAL_GROUP_THRESHOLD
}

/**
 * 判斷是否為手動補齊群組 (groupId >= 10000)
 */
export function isManualGroup(groupId) {
  return typeof groupId === 'number' && groupId >= MANUAL_GROUP_THRESHOLD
}

/**
 * 取得單一任務本身的最低等級需求（無等級限制則回傳 0）
 */
export function getTaskDirectLevel(task) {
  const reqs = Array.isArray(task?.requirements) ? task.requirements : []
  const levelReq = reqs.find((r) => r.type === 'level')
  if (levelReq && !Number.isNaN(Number(levelReq.value))) {
    return Number(levelReq.value)
  }
  const skillLevelReq = reqs.find((r) => r.type === 'levelWithSkill')
  if (skillLevelReq && !Number.isNaN(Number(skillLevelReq.value))) {
    return Number(skillLevelReq.value)
  }
  return 0
}

/**
 * 依規則排序任務清單：
 * 等級(低->高) -> 群組(小->大，同群組的要靠在一起) -> id
 * 為確保同群組任務即使個別等級不同（如 groupId 18）也一定靠在一起，有群組的任務統一使用該群組的最低等級作為等級排序鍵
 */
export function sortTasksList(tasks = [], groupMinLevelMap = new Map()) {
  return [...tasks].sort((a, b) => {
    const hasGroupA = a.groupId !== null && a.groupId !== undefined
    const hasGroupB = b.groupId !== null && b.groupId !== undefined

    const levelA = hasGroupA && groupMinLevelMap.has(a.groupId)
      ? groupMinLevelMap.get(a.groupId)
      : getTaskDirectLevel(a)
    const levelB = hasGroupB && groupMinLevelMap.has(b.groupId)
      ? groupMinLevelMap.get(b.groupId)
      : getTaskDirectLevel(b)

    if (levelA !== levelB) {
      return levelA - levelB
    }

    const groupA = hasGroupA ? Number(a.groupId) : Number.MAX_SAFE_INTEGER
    const groupB = hasGroupB ? Number(b.groupId) : Number.MAX_SAFE_INTEGER

    if (groupA !== groupB) {
      return groupA - groupB
    }

    return String(a.id).localeCompare(String(b.id), 'en', { numeric: true })
  })
}

/**
 * 建立任務資料的各類索引與分類樹結構
 * - taskMap: id -> task
 * - groupMap: groupId -> task[]
 * - groupMinLevelMap: groupId -> minLevel
 * - reverseReqMap: requiredTaskId -> dependentTask[] (後續任務反向索引)
 * - categories: 依 tasks 首次出現順序排列的分類與 NPC 樹狀結構（NPC 內的任務依 等級->群組->id 排序）
 */
export function buildTaskIndexes(tasks = []) {
  const taskMap = new Map()
  const groupMap = new Map()
  const groupMinLevelMap = new Map()
  const reverseReqMap = new Map()
  const categoryMap = new Map()
  const categories = []

  for (const rawTask of tasks) {
    if (!rawTask || typeof rawTask.id !== 'string') continue
    const { prefix, cleanName } = parseTaskName(rawTask.name)
    const categoryName = rawTask.category ?? '未分類'
    const npcName = rawTask.npc ?? '未知 NPC'
    const locationText = rawTask.location ?? '（未記載）'
    const directLevel = getTaskDirectLevel(rawTask)

    const enrichedTask = {
      ...rawTask,
      prefix,
      cleanName,
      categoryName,
      npcName,
      locationText,
      directLevel,
      requiredIds: Array.isArray(rawTask.requiredIds) ? rawTask.requiredIds : [],
      requirements: Array.isArray(rawTask.requirements) ? rawTask.requirements : [],
      statsPoints: Number(rawTask.statsPoints) || 0,
      skillPoints: Number(rawTask.skillPoints) || 0,
    }

    taskMap.set(enrichedTask.id, enrichedTask)

    if (enrichedTask.groupId !== null && enrichedTask.groupId !== undefined) {
      if (!groupMap.has(enrichedTask.groupId)) {
        groupMap.set(enrichedTask.groupId, [])
      }
      groupMap.get(enrichedTask.groupId).push(enrichedTask)

      const prevMin = groupMinLevelMap.get(enrichedTask.groupId)
      if (prevMin === undefined || directLevel < prevMin) {
        groupMinLevelMap.set(enrichedTask.groupId, directLevel)
      }
    }

    if (!categoryMap.has(categoryName)) {
      const catEntry = {
        name: categoryName,
        npcs: [],
        npcMap: new Map(),
        tasks: [],
      }
      categoryMap.set(categoryName, catEntry)
      categories.push(catEntry)
    }

    const catEntry = categoryMap.get(categoryName)
    catEntry.tasks.push(enrichedTask)

    if (!catEntry.npcMap.has(npcName)) {
      const npcEntry = {
        key: `${categoryName}__${npcName}`,
        categoryName,
        name: npcName,
        tasks: [],
      }
      catEntry.npcMap.set(npcName, npcEntry)
      catEntry.npcs.push(npcEntry)
    }
    catEntry.npcMap.get(npcName).tasks.push(enrichedTask)
  }

  // 對每個 NPC 底下的任務套用排序：等級(低->高) -> 群組(小->大，同群組靠在一起) -> id
  for (const cat of categories) {
    for (const npc of cat.npcs) {
      npc.tasks = sortTasksList(npc.tasks, groupMinLevelMap)
    }
  }

  // 建立反向索引（後續任務：requiredIds 含有該任務的其他任務，保持資料順序）
  for (const task of taskMap.values()) {
    const seenReq = new Set()
    for (const reqId of task.requiredIds) {
      if (seenReq.has(reqId)) continue
      seenReq.add(reqId)
      if (!reverseReqMap.has(reqId)) {
        reverseReqMap.set(reqId, [])
      }
      reverseReqMap.get(reqId).push(task)
    }
  }

  return {
    taskMap,
    groupMap,
    groupMinLevelMap,
    reverseReqMap,
    categories,
  }
}

/**
 * 過濾並正規化已勾選的任務 ID 清單
 * - 忽略不存在於 taskMap 的 ID 或非字串項目
 * - 若遊戲群組 (groupId < 10000) 中有任一任務被勾選，確保同群組全部一併勾選
 */
export function sanitizeDoneIds(rawDoneIds, indexes) {
  if (!Array.isArray(rawDoneIds) || !indexes?.taskMap) {
    return []
  }
  const { taskMap, groupMap } = indexes
  const doneSet = new Set()

  for (const id of rawDoneIds) {
    if (typeof id !== 'string') continue
    const task = taskMap.get(id)
    if (!task) continue
    doneSet.add(id)
    if (isGameGroup(task.groupId)) {
      const siblings = groupMap.get(task.groupId) || []
      for (const sibling of siblings) {
        doneSet.add(sibling.id)
      }
    }
  }

  const result = []
  for (const id of taskMap.keys()) {
    if (doneSet.has(id)) {
      result.push(id)
    }
  }
  return result
}

/**
 * 解析匯入或雲端的進度資料，並檢查版本號是否與當前任務庫 version 一致
 * 回傳 { valid: boolean, doneIds: string[], versionMismatch: boolean, incomingVersion: string | number | null }
 */
export function parseProgressPayload(rawInput, indexes, currentDbVersion = '') {
  if (!rawInput) {
    return {
      valid: false,
      doneIds: [],
      versionMismatch: false,
      incomingVersion: null,
    }
  }
  try {
    const parsed = typeof rawInput === 'string' ? JSON.parse(rawInput) : rawInput
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.done)) {
      return {
        valid: false,
        doneIds: [],
        versionMismatch: false,
        incomingVersion: null,
      }
    }
    const doneIds = sanitizeDoneIds(parsed.done, indexes)
    const incomingVersion = parsed.version ?? null
    const versionMismatch =
      Boolean(currentDbVersion) &&
      String(incomingVersion ?? '') !== String(currentDbVersion)

    return {
      valid: true,
      doneIds,
      versionMismatch,
      incomingVersion,
    }
  } catch {
    return {
      valid: false,
      doneIds: [],
      versionMismatch: false,
      incomingVersion: null,
    }
  }
}

/**
 * 向下相容純陣列回傳之解析函式
 */
export function parseProgressData(rawInput, indexes) {
  return parseProgressPayload(rawInput, indexes).doneIds
}

/**
 * 建立進度物件（匯出與 Firestore completed_tasks 共用同一格式）
 */
export function createProgressObject(doneIds, dbVersion = '') {
  const list = Array.isArray(doneIds) ? doneIds : Array.from(doneIds || [])
  return {
    version: dbVersion || '1',
    done: list,
  }
}

/**
 * 序列化完成進度為 JSON 字串 { version, done: [...] }
 */
export function serializeProgressData(doneIds, dbVersion = '') {
  return JSON.stringify(createProgressObject(doneIds, dbVersion))
}

/**
 * 取得單一任務的狀態：
 * - 'done'：已直接勾選
 * - 'group-done'：未直接勾選，但屬於手動群組 (groupId >= 10000) 且同群組有任一版本已勾選
 * - 'todo'：未完成
 */
export function getTaskStatus(taskOrId, doneSetOrArray, indexes) {
  const task =
    typeof taskOrId === 'string' ? indexes?.taskMap?.get(taskOrId) : taskOrId
  if (!task) return 'todo'

  const doneSet =
    doneSetOrArray instanceof Set ? doneSetOrArray : new Set(doneSetOrArray || [])

  if (doneSet.has(task.id)) {
    return 'done'
  }

  if (isManualGroup(task.groupId)) {
    const groupTasks = indexes?.groupMap?.get(task.groupId) || []
    if (groupTasks.some((t) => doneSet.has(t.id))) {
      return 'group-done'
    }
  }

  return 'todo'
}

/**
 * 判斷任務是否視為「已完成」（已勾選 或 同群組已完成）
 */
export function isTaskCompleted(taskOrId, doneSetOrArray, indexes) {
  const status = getTaskStatus(taskOrId, doneSetOrArray, indexes)
  return status === 'done' || status === 'group-done'
}

/**
 * 切換單一任務的勾選狀態（不考慮前置/後續連鎖之純群組切換）
 * - groupId < 10000：勾選或取消其中一個，同群組全部一起勾選或取消
 * - groupId >= 10000 或 null：只影響該任務本身
 */
export function toggleTaskDone(doneIds, targetTaskId, indexes) {
  if (!indexes?.taskMap) return []
  const { taskMap, groupMap } = indexes
  const task = taskMap.get(targetTaskId)
  if (!task) return sanitizeDoneIds(doneIds, indexes)

  const doneSet = new Set(sanitizeDoneIds(doneIds, indexes))
  const isCurrentlyChecked = doneSet.has(targetTaskId)

  if (isGameGroup(task.groupId)) {
    const groupTasks = groupMap.get(task.groupId) || [task]
    for (const member of groupTasks) {
      if (isCurrentlyChecked) {
        doneSet.delete(member.id)
      } else {
        doneSet.add(member.id)
      }
    }
  } else {
    if (isCurrentlyChecked) {
      doneSet.delete(targetTaskId)
    } else {
      doneSet.add(targetTaskId)
    }
  }

  return sanitizeDoneIds(Array.from(doneSet), indexes)
}

/**
 * 規劃勾選或取消勾選時的連帶影響（前置任務一併完成 / 後續任務一併取消）
 * - 當要勾選的任務有未完成的前置任務時：needsConfirm = true, mode = 'check-prereqs'
 * - 當要取消勾選的任務有已完成的後續任務時：needsConfirm = true, mode = 'uncheck-followups'
 * - 否則：needsConfirm = false, mode = 'direct'
 */
export function planToggleTaskWithCascade(doneIds, targetTaskId, indexes) {
  if (!indexes?.taskMap) {
    return {
      needsConfirm: false,
      mode: 'direct',
      targetTask: null,
      affectedTasks: [],
      nextDoneIds: [],
    }
  }

  const { taskMap, groupMap, reverseReqMap } = indexes
  const targetTask = taskMap.get(targetTaskId)
  if (!targetTask) {
    return {
      needsConfirm: false,
      mode: 'direct',
      targetTask: null,
      affectedTasks: [],
      nextDoneIds: sanitizeDoneIds(doneIds, indexes),
    }
  }

  const currentDoneList = sanitizeDoneIds(doneIds, indexes)
  const workingDone = new Set(currentDoneList)
  const isCurrentlyChecked = workingDone.has(targetTaskId)

  if (!isCurrentlyChecked) {
    // 準備勾選：檢查是否有未完成的前置任務（含遞迴前置）
    const addTaskWithGameGroup = (t, targetSet) => {
      targetSet.add(t.id)
      if (isGameGroup(t.groupId)) {
        for (const sib of groupMap.get(t.groupId) || []) {
          targetSet.add(sib.id)
        }
      }
    }

    addTaskWithGameGroup(targetTask, workingDone)

    const affectedRepTasks = []
    const visitedTasks = new Set([targetTask.id])
    const queue = [targetTask]

    while (queue.length > 0) {
      const curr = queue.shift()
      const prereqEval = evaluatePrerequisites(curr, workingDone, indexes)

      if (!prereqEval.isSatisfied) {
        if (prereqEval.isSameGroupAny) {
          // 同群組擇一即可：優先挑選學院/部門相符的版本，否則取第一個存在於資料庫的版本
          const existingItems = prereqEval.items.filter((i) => i.exists)
          const preferred =
            existingItems.find(
              (i) =>
                (curr.school === '共通' || i.task.school === curr.school) &&
                (curr.department === '共通' || i.task.department === curr.department)
            ) || existingItems[0]

          if (preferred?.task) {
            addTaskWithGameGroup(preferred.task, workingDone)
            affectedRepTasks.push(preferred.task)
            if (!visitedTasks.has(preferred.task.id)) {
              visitedTasks.add(preferred.task.id)
              queue.push(preferred.task)
            }
          }
        } else {
          // 所有未完成的前置皆須完成
          for (const item of prereqEval.items) {
            if (!item.exists || !item.task) continue
            if (!isTaskCompleted(item.task, workingDone, indexes)) {
              addTaskWithGameGroup(item.task, workingDone)
              affectedRepTasks.push(item.task)
            }
            if (!visitedTasks.has(item.task.id)) {
              visitedTasks.add(item.task.id)
              queue.push(item.task)
            }
          }
        }
      } else {
        // 即使當前層已滿足，仍確保已完成的直接前置若有未完成的更上層前置也能被檢查
        for (const item of prereqEval.items) {
          if (item.exists && item.task && isTaskCompleted(item.task, workingDone, indexes)) {
            if (!visitedTasks.has(item.task.id)) {
              visitedTasks.add(item.task.id)
              queue.push(item.task)
            }
          }
        }
      }
    }

    // 去重受影響的前置任務代表清單
    const uniqueAffected = []
    const seenIds = new Set()
    for (const t of affectedRepTasks) {
      if (!seenIds.has(t.id)) {
        seenIds.add(t.id)
        uniqueAffected.push(t)
      }
    }

    const nextDoneIds = sanitizeDoneIds(Array.from(workingDone), indexes)
    return {
      needsConfirm: uniqueAffected.length > 0,
      mode: uniqueAffected.length > 0 ? 'check-prereqs' : 'direct',
      targetTask,
      affectedTasks: uniqueAffected,
      nextDoneIds,
    }
  } else {
    // 準備取消勾選：檢查是否有已完成的後續任務（含遞迴後續）
    const removeTaskAndGroup = (t, targetSet) => {
      const removedIds = []
      if (isGameGroup(t.groupId)) {
        for (const sib of groupMap.get(t.groupId) || []) {
          if (targetSet.has(sib.id)) {
            targetSet.delete(sib.id)
            removedIds.push(sib.id)
          }
        }
      } else if (isManualGroup(t.groupId)) {
        // 若手動群組作為後續被連帶取消，移除該手動群組內已勾選的版本
        for (const sib of groupMap.get(t.groupId) || []) {
          if (targetSet.has(sib.id)) {
            targetSet.delete(sib.id)
            removedIds.push(sib.id)
          }
        }
      } else {
        if (targetSet.has(t.id)) {
          targetSet.delete(t.id)
          removedIds.push(t.id)
        }
      }
      return removedIds
    }

    // 取消目標任務本身（遊戲群組則整組取消）
    const initialRemoved = []
    if (isGameGroup(targetTask.groupId)) {
      for (const sib of groupMap.get(targetTask.groupId) || [targetTask]) {
        if (workingDone.has(sib.id)) {
          workingDone.delete(sib.id)
          initialRemoved.push(sib.id)
        }
      }
    } else {
      workingDone.delete(targetTask.id)
      initialRemoved.push(targetTask.id)
    }

    const affectedFollowUpTasks = []
    const queue = [...initialRemoved]
    const visitedDown = new Set(initialRemoved)

    while (queue.length > 0) {
      const currId = queue.shift()
      const dependents = reverseReqMap.get(currId) || []

      for (const depTask of dependents) {
        // 若該後續任務目前仍處於已完成狀態，但因前置取消而不再滿足前置條件
        if (
          isTaskCompleted(depTask, workingDone, indexes) &&
          !evaluatePrerequisites(depTask, workingDone, indexes).isSatisfied
        ) {
          affectedFollowUpTasks.push(depTask)
          const newlyRemoved = removeTaskAndGroup(depTask, workingDone)
          for (const rId of newlyRemoved) {
            if (!visitedDown.has(rId)) {
              visitedDown.add(rId)
              queue.push(rId)
            }
          }
        }
      }
    }

    const uniqueAffected = []
    const seenIds = new Set()
    for (const t of affectedFollowUpTasks) {
      if (!seenIds.has(t.id)) {
        seenIds.add(t.id)
        uniqueAffected.push(t)
      }
    }

    const nextDoneIds = sanitizeDoneIds(Array.from(workingDone), indexes)
    return {
      needsConfirm: uniqueAffected.length > 0,
      mode: uniqueAffected.length > 0 ? 'uncheck-followups' : 'direct',
      targetTask,
      affectedTasks: uniqueAffected,
      nextDoneIds,
    }
  }
}

/**
 * 批次套用勾選任務（供匯入或第二階段截圖自動標註使用）
 */
export function applyBatchTaskIds(doneIds, taskIdsToAdd, indexes) {
  if (!indexes?.taskMap) return []
  const combined = [
    ...(Array.isArray(doneIds) ? doneIds : Array.from(doneIds || [])),
    ...(Array.isArray(taskIdsToAdd) ? taskIdsToAdd : Array.from(taskIdsToAdd || [])),
  ]
  return sanitizeDoneIds(combined, indexes)
}

/**
 * 計算指定任務清單的完成數與未完成數
 */
export function countTaskListCompletion(taskList, doneSetOrArray, indexes) {
  const doneSet =
    doneSetOrArray instanceof Set ? doneSetOrArray : new Set(doneSetOrArray || [])
  let completed = 0
  for (const task of taskList || []) {
    if (isTaskCompleted(task, doneSet, indexes)) {
      completed++
    }
  }
  const total = (taskList || []).length
  return {
    completed,
    incomplete: total - completed,
    total,
    isAllCompleted: total > 0 && completed === total,
  }
}

/**
 * 計算全站統計卡數據：
 * - 「已完成」＝已勾選，或屬於「同群組已完成」
 * - 總點數＝所有任務的點數加總，但每個手動群組只算一次
 * - 已獲得點數＝已勾選任務的點數加總，每個手動群組最多算一次
 */
export function calculateOverallStats(tasks, doneSetOrArray, indexes) {
  const doneSet =
    doneSetOrArray instanceof Set ? doneSetOrArray : new Set(doneSetOrArray || [])

  const totalTasks = (tasks || []).length
  let completedTasks = 0

  let totalStatsPoints = 0
  let totalSkillPoints = 0
  const seenTotalManualGroups = new Set()

  let earnedStatsPoints = 0
  let earnedSkillPoints = 0
  const seenEarnedManualGroups = new Set()

  for (const task of tasks || []) {
    const status = getTaskStatus(task, doneSet, indexes)
    if (status === 'done' || status === 'group-done') {
      completedTasks++
    }

    if (isManualGroup(task.groupId)) {
      if (!seenTotalManualGroups.has(task.groupId)) {
        seenTotalManualGroups.add(task.groupId)
        totalStatsPoints += Number(task.statsPoints) || 0
        totalSkillPoints += Number(task.skillPoints) || 0
      }
    } else {
      totalStatsPoints += Number(task.statsPoints) || 0
      totalSkillPoints += Number(task.skillPoints) || 0
    }

    if (doneSet.has(task.id)) {
      if (isManualGroup(task.groupId)) {
        if (!seenEarnedManualGroups.has(task.groupId)) {
          seenEarnedManualGroups.add(task.groupId)
          earnedStatsPoints += Number(task.statsPoints) || 0
          earnedSkillPoints += Number(task.skillPoints) || 0
        }
      } else {
        earnedStatsPoints += Number(task.statsPoints) || 0
        earnedSkillPoints += Number(task.skillPoints) || 0
      }
    }
  }

  return {
    totalTasks,
    completedTasks,
    incompleteTasks: totalTasks - completedTasks,
    totalStatsPoints,
    earnedStatsPoints,
    totalSkillPoints,
    earnedSkillPoints,
  }
}

/**
 * 評估任務的前置任務狀態與解鎖狀態
 */
export function evaluatePrerequisites(task, doneSetOrArray, indexes) {
  if (!task) {
    return {
      items: [],
      isSameGroupAny: false,
      isSatisfied: true,
      showLockedHint: false,
    }
  }

  const doneSet =
    doneSetOrArray instanceof Set ? doneSetOrArray : new Set(doneSetOrArray || [])
  const reqIds = Array.isArray(task.requiredIds) ? task.requiredIds : []

  const items = reqIds.map((reqId) => {
    const reqTask = indexes?.taskMap?.get(reqId)
    if (!reqTask) {
      return {
        id: reqId,
        exists: false,
        task: null,
        cleanName: '此任務不存在於資料庫',
        status: 'missing',
        isCompleted: false,
      }
    }
    const status = getTaskStatus(reqTask, doneSet, indexes)
    const isCompleted = status === 'done' || status === 'group-done'
    return {
      id: reqId,
      exists: true,
      task: reqTask,
      cleanName: getCleanTaskName(reqTask),
      status,
      isCompleted,
    }
  })

  const isSameGroupAny =
    items.length > 1 &&
    items.every(
      (item) =>
        item.exists &&
        item.task.groupId !== null &&
        item.task.groupId !== undefined &&
        item.task.groupId === items[0].task.groupId
    )

  let isSatisfied = true
  if (items.length > 0) {
    isSatisfied = isSameGroupAny
      ? items.some((item) => item.isCompleted)
      : items.every((item) => item.isCompleted)
  }

  const selfCompleted = isTaskCompleted(task, doneSet, indexes)
  const showLockedHint = !selfCompleted && !isSatisfied

  return {
    items,
    isSameGroupAny,
    isSatisfied,
    showLockedHint,
  }
}

/**
 * 格式化接取條件 (requirements) 為顯示文字與狀態
 */
export function formatRequirements(task, doneSetOrArray, indexes) {
  const reqs = Array.isArray(task?.requirements) ? task.requirements : []
  if (reqs.length === 0) return []

  const doneSet =
    doneSetOrArray instanceof Set ? doneSetOrArray : new Set(doneSetOrArray || [])

  const levelReq = reqs.find((r) => r.type === 'level')
  const levelMaxReq = reqs.find((r) => r.type === 'levelMax')
  const hasBothLevels = Boolean(levelReq && levelMaxReq)
  let levelRangeEmitted = false

  const result = []

  for (const req of reqs) {
    if (!req || typeof req.type !== 'string') continue

    if (req.type === 'level' || req.type === 'levelMax') {
      if (hasBothLevels) {
        if (!levelRangeEmitted) {
          levelRangeEmitted = true
          result.push({
            type: 'levelRange',
            text: `等級 ${levelReq.value}～${levelMaxReq.value}`,
            isWarning: false,
          })
        }
        continue
      }

      if (req.type === 'level') {
        result.push({
          type: 'level',
          text: `等級 ${req.value} 以上`,
          isWarning: false,
        })
      } else {
        result.push({
          type: 'levelMax',
          text: `等級 ${req.value} 以下`,
          isWarning: false,
        })
      }
      continue
    }

    switch (req.type) {
      case 'levelWithSkill': {
        const skillsText = Array.isArray(req.skills) ? req.skills.join('、') : ''
        result.push({
          type: 'levelWithSkill',
          text: `學過技能 ${skillsText} 者：等級 ${req.value} 以上`,
          isWarning: false,
        })
        break
      }
      case 'timeLimit': {
        result.push({
          type: 'timeLimit',
          text: `限時 ${req.value} 分鐘`,
          isWarning: false,
        })
        break
      }
      case 'failOnDeath': {
        result.push({
          type: 'failOnDeath',
          text: '死亡即任務失敗',
          isWarning: false,
        })
        break
      }
      case 'item': {
        result.push({
          type: 'item',
          text: `需持有道具 ${req.value}`,
          isWarning: false,
        })
        break
      }
      case 'fee': {
        const num = Number(req.value)
        const formattedFee = !Number.isNaN(num)
          ? num.toLocaleString('en-US')
          : String(req.value)
        result.push({
          type: 'fee',
          text: `接取時支付 ${formattedFee} 金幣`,
          isWarning: false,
        })
        break
      }
      case 'school': {
        result.push({
          type: 'school',
          text: `限${req.value}學院`,
          isWarning: false,
        })
        break
      }
      case 'advancedClass': {
        const text =
          req.value === 'required'
            ? '限奧義職業'
            : req.value === 'forbidden'
              ? '已轉職奧義者不可接取'
              : `advancedClass：${req.value}`
        result.push({
          type: 'advancedClass',
          text,
          isWarning: false,
        })
        break
      }
      case 'notCompleted': {
        const targetTask = indexes?.taskMap?.get(req.value)
        const targetName = targetTask
          ? getCleanTaskName(targetTask)
          : '此任務不存在於資料庫'
        const isTargetCompleted = targetTask
          ? isTaskCompleted(targetTask, doneSet, indexes)
          : false
        result.push({
          type: 'notCompleted',
          text: `需尚未完成：${targetName}`,
          isWarning: isTargetCompleted,
          targetTaskId: req.value,
        })
        break
      }
      default: {
        result.push({
          type: req.type,
          text: `${req.type}：${req.value}`,
          isWarning: false,
        })
      }
    }
  }

  return result
}

/**
 * 取得群組說明文字
 */
export function getGroupDescription(task, indexes) {
  if (!task || task.groupId === null || task.groupId === undefined) {
    return null
  }
  const groupTasks = indexes?.groupMap?.get(task.groupId) || []
  const count = groupTasks.length
  if (isGameGroup(task.groupId)) {
    return {
      type: 'game',
      count,
      text: `遊戲群組（共 ${count} 個任務）：完成其中一個，其他會一起標記完成；重置後每個任務的點數都會計算。`,
    }
  }
  return {
    type: 'manual',
    count,
    text: `手動群組（共 ${count} 個版本）：完成自己學院／部門的版本即可，獎勵不會重複。`,
  }
}

/**
 * 格式化任務脈絡節點的點數摘要文字
 */
export function formatNodePointsText(task) {
  if (!task) return '無點數'
  const stats = Number(task.statsPoints) || 0
  const skills = Number(task.skillPoints) || 0
  if (stats === 0 && skills === 0) {
    return '無點數'
  }
  const parts = []
  if (stats > 0) parts.push(`能力 +${stats}`)
  if (skills > 0) parts.push(`技能 +${skills}`)
  return parts.join(' · ')
}

/**
 * 建立任務脈絡視窗的廣度優先搜尋 (BFS) 結構
 */
export function buildTaskContext(centerTaskId, doneSetOrArray, indexes) {
  const centerTask = indexes?.taskMap?.get(centerTaskId)
  if (!centerTask) {
    return null
  }

  const doneSet =
    doneSetOrArray instanceof Set ? doneSetOrArray : new Set(doneSetOrArray || [])

  const toNode = (taskOrMissingId) => {
    if (typeof taskOrMissingId === 'string') {
      return {
        id: taskOrMissingId,
        exists: false,
        cleanName: '此任務不存在於資料庫',
        status: 'todo',
        statusLabel: '未完成',
        pointsText: '無點數',
        statsPoints: 0,
        skillPoints: 0,
      }
    }
    const status = getTaskStatus(taskOrMissingId, doneSet, indexes)
    const statusLabel =
      status === 'done'
        ? '已完成'
        : status === 'group-done'
          ? '同群組已完成'
          : '未完成'
    return {
      id: taskOrMissingId.id,
      exists: true,
      task: taskOrMissingId,
      cleanName: getCleanTaskName(taskOrMissingId),
      status,
      statusLabel,
      pointsText: formatNodePointsText(taskOrMissingId),
      statsPoints: taskOrMissingId.statsPoints,
      skillPoints: taskOrMissingId.skillPoints,
    }
  }

  // 1. 往前搜尋前置任務 (Upward BFS)
  const visitedUp = new Set([centerTaskId])
  const rawUpLayers = []
  let currentUpIds = [centerTaskId]
  let totalPrereqCount = 0

  for (let depth = 1; depth <= MAX_CONTEXT_DEPTH; depth++) {
    const nextIds = []
    for (const id of currentUpIds) {
      const t = indexes.taskMap.get(id)
      if (!t) continue
      for (const reqId of t.requiredIds) {
        if (!visitedUp.has(reqId)) {
          visitedUp.add(reqId)
          nextIds.push(reqId)
        }
      }
    }
    if (nextIds.length === 0) break

    totalPrereqCount += nextIds.length
    const allNodes = nextIds.map((id) => indexes.taskMap.get(id) || id).map(toNode)
    const visibleNodes = allNodes.slice(0, MAX_NODES_PER_LAYER)
    const overflowCount = Math.max(0, allNodes.length - MAX_NODES_PER_LAYER)

    rawUpLayers.push({
      direction: 'up',
      distance: depth,
      title: `前置任務 · 往前第 ${depth} 層`,
      nodes: visibleNodes,
      totalInLayer: allNodes.length,
      overflowCount,
    })

    currentUpIds = nextIds
  }

  const upLayers = rawUpLayers.reverse()

  // 2. 往後搜尋後續任務 (Downward BFS)
  const visitedDown = new Set([centerTaskId])
  const downLayers = []
  let currentDownIds = [centerTaskId]
  let totalFollowUpCount = 0

  for (let depth = 1; depth <= MAX_CONTEXT_DEPTH; depth++) {
    const nextIds = []
    for (const id of currentDownIds) {
      const dependents = indexes.reverseReqMap.get(id) || []
      for (const depTask of dependents) {
        if (!visitedDown.has(depTask.id)) {
          visitedDown.add(depTask.id)
          nextIds.push(depTask.id)
        }
      }
    }
    if (nextIds.length === 0) break

    totalFollowUpCount += nextIds.length
    const allNodes = nextIds.map((id) => indexes.taskMap.get(id) || id).map(toNode)
    const visibleNodes = allNodes.slice(0, MAX_NODES_PER_LAYER)
    const overflowCount = Math.max(0, allNodes.length - MAX_NODES_PER_LAYER)

    downLayers.push({
      direction: 'down',
      distance: depth,
      title: `後續任務 · 往後第 ${depth} 層`,
      nodes: visibleNodes,
      totalInLayer: allNodes.length,
      overflowCount,
    })

    currentDownIds = nextIds
  }

  const centerNode = toNode(centerTask)
  const isIsolated = upLayers.length === 0 && downLayers.length === 0

  return {
    centerNode,
    upLayers,
    downLayers,
    totalPrereqCount,
    totalFollowUpCount,
    isIsolated,
  }
}

/**
 * 文字模糊搜尋任務
 * 比對任務名稱、ID、分類、NPC、地點，並依 等級(低->高) -> 群組(小->大) -> id 排序
 */
export function filterTasksByQuery(query, doneSetOrArray, indexes) {
  const q = (query || '').trim().toLowerCase()
  if (!q || !indexes?.taskMap) return []

  const normalizedQ = q.replace(/玄巖/g, '玄嚴')
  const doneSet =
    doneSetOrArray instanceof Set ? doneSetOrArray : new Set(doneSetOrArray || [])

  const matched = []
  for (const task of indexes.taskMap.values()) {
    const haystack = [
      task.name,
      task.cleanName,
      task.id,
      task.categoryName,
      task.npcName,
      task.locationText,
      task.school,
      task.department,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .replace(/玄巖/g, '玄嚴')

    if (haystack.includes(normalizedQ)) {
      matched.push({
        ...task,
        status: getTaskStatus(task, doneSet, indexes),
      })
    }
  }

  return sortTasksList(matched, indexes.groupMinLevelMap)
}

/**
 * 格式化 version 或 exportedAt 供頁尾顯示
 */
export function formatVersionOrDate(versionOrDate) {
  if (!versionOrDate) return ''
  const str = String(versionOrDate).trim()
  // 若為 8 碼 YYMMDDHH (如 26101718)，轉為 YYYY-MM-DD (v26101718)
  if (/^\d{8}$/.test(str)) {
    const yy = str.slice(0, 2)
    const mm = str.slice(2, 4)
    const dd = str.slice(4, 6)
    return `20${yy}-${mm}-${dd} (v${str})`
  }
  const isoMatch = str.match(/^(\d{4}-\d{2}-\d{2})/)
  if (isoMatch) return isoMatch[1]
  return str
}

/**
 * 向下相容舊名稱
 */
export const formatExportedDate = formatVersionOrDate

export const MAX_OCR_IMAGES = 30

/**
 * 檢視 meta-tasks.json 全部 169 筆任務後歸納出的「合法學院與部門後綴」正則片段
 */
const LEGAL_SCHOOL_DEPT_PATTERN =
  '(?:聖門|玄嚴|玄巖|鳳凰)(?:格鬥|劍道|弓箭|氣功)|(?:聖門|玄嚴|玄巖|鳳凰)|(?:格鬥|劍道|弓箭|氣功)'

const LEGAL_SCHOOL_DEPT_SUFFIX_REGEX = new RegExp(
  `^(.+?)\\((${LEGAL_SCHOOL_DEPT_PATTERN})\\).*$`
)

/**
 * 合法任務名稱正則表達式：
 * 格式：^【(劇情|重複)】<核心名稱>(?:([1-9]))?(?: (<學院/部門>)| \[限時\])?$
 */
export const LEGAL_QUEST_NAME_REGEX = new RegExp(
  `^【(劇情|重複)】([\\u4e00-\\u9fa50-9「」ID\\-?!]+(?:\\([1-9]\\))?)(?: \\((${LEGAL_SCHOOL_DEPT_PATTERN})\\)| \\[限時\\])?$`
)

/**
 * 檢查字串是否符合資料庫定義的「合法任務名稱」格式
 */
export function isValidLegalQuestName(name) {
  if (!name || typeof name !== 'string') return false
  return LEGAL_QUEST_NAME_REGEX.test(name.trim())
}

/**
 * 第二階段（OCR 截圖比對）之任務名稱正規化純函式
 */
export function normalizeQuestNameForOcr(rawName) {
  if (!rawName || typeof rawName !== 'string') return ''
  const { cleanName } = parseTaskName(rawName)
  return cleanName
    .replace(/（/g, '(')
    .replace(/）/g, ')')
    .replace(/玄巖/g, '玄嚴')
    .replace(/其名的指責/g, '莫名的指責')
    .replace(/\s+/g, '')
}

/**
 * 計算兩個字串的編輯距離相似度 (0 ~ 1)
 */
function calcStringSimilarity(a, b) {
  if (a === b) return 1
  if (!a || !b) return 0
  const m = a.length
  const n = b.length
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return 1 - dp[m][n] / Math.max(m, n)
}

/**
 * 拆解任務名稱為結構化特徵（供正則標準化與同結構錯字校正使用，避免跨學院/跨編號誤配）
 */
function decomposeQuestStructure(fullName) {
  const { prefix, cleanName } = parseTaskName(fullName)
  let body = cleanName.replace(/（/g, '(').replace(/）/g, ')').trim()
  let schoolDept = ''
  let isTimeLimit = false

  const sdMatch = body.match(new RegExp(`^(.+?)\\s*\\((${LEGAL_SCHOOL_DEPT_PATTERN})\\)$`))
  if (sdMatch) {
    body = sdMatch[1].trim()
    schoolDept = sdMatch[2].replace(/玄巖/g, '玄嚴')
  } else if (/\s*\[限時\]$/.test(body)) {
    body = body.replace(/\s*\[限時\]$/, '').trim()
    isTimeLimit = true
  }

  let numTag = ''
  const numMatch = body.match(/^(.*?)(\([1-9]\)|[23]樓)$/)
  let baseCore = body
  if (numMatch) {
    baseCore = numMatch[1]
    numTag = numMatch[2]
  }

  return {
    prefix: prefix ? `【${prefix}】` : '【劇情】',
    baseCore,
    numTag,
    schoolDept,
    isTimeLimit,
  }
}

/**
 * 將單行 OCR 原始文字或使用者輸入文字透過正則表達式標準化為「合法的任務名稱」
 * 例：
 * - `學院生註冊(聖門氣功)喇功` -> `【劇情】學院生註冊 (聖門氣功)`
 * - `【劇情】 回收卡車鑰匙 [成功/執行次數:1]` -> `【劇情】回收卡車鑰匙`
 * - `蟲之血 [成功/執行次數:1]` -> `【重複】蟲之血`
 */
const OCR_SCHOOL_RAW = '(?:[聖聲宮守誤詞伺謊慌加密圖][門問們站]|[玄立][嚴巖岩旋廢]|[鳳風恩峽岬詹逢仙田什做央奧盎][凰皇風央轉團盎])'
const OCR_DEPT_RAW = '(?:格[鬥斗門問辣閏開間]|[劍劉創鋪語]道|[弓引宮寢][箭前簡痕策]|[氣氧][功切])'
const OCR_SCHOOL_DEPT_TAIL_REGEX = new RegExp(
  `^(.+?)[(\\s]*(${OCR_SCHOOL_RAW}${OCR_DEPT_RAW}|${OCR_SCHOOL_RAW}|${OCR_DEPT_RAW})\\).*$`
)

function normalizeOcrSchoolDeptToken(rawToken) {
  if (!rawToken) return ''
  return rawToken
    .replace(/^[聖聲宮守誤詞伺謊慌加密圖][門問們站]/, '聖門')
    .replace(/^[玄立][嚴巖岩旋廢]/, '玄嚴')
    .replace(/^[鳳風恩峽岬詹逢仙田什做央奧盎][凰皇風央轉團盎]/, '鳳凰')
    .replace(/格[鬥斗門問辣閏開間]$/, '格鬥')
    .replace(/[劍劉創鋪語]道$/, '劍道')
    .replace(/[弓引宮寢][箭前簡痕策]$/, '弓箭')
    .replace(/[氣氧][功切]$/, '氣功')
}

const OCR_KNOWN_CORE_FIXES = [
  [/^[是還串劇處加一重其]情(?=.{2,})/, ''],
  [/打倒[水冰][齋凍]可[沾滷]/g, '打倒冰凍可滷'],
  [/[賦賊]頭[競殺][親殺][親殺]/g, '賊頭殺殺殺'],
  [/怒[漆殺]野[駕鴛][伏鴦]/g, '怒殺野鴛鴦'],
  [/[蟻隱]隱[馭騷]動之[起聲]/g, '隱隱騷動之聲'],
  [/[諮諸請]求支[攏援]/g, '請求支援'],
  [/[諮諸]求/g, '請求'],
  [/廚求/g, '請求'],
  [/公車司梯/g, '公車司機'],
  [/紙聞驗證/g, '紙幣驗證'],
  [/回收地回/g, '回收地圖'],
  [/回書館/g, '圖書館'],
  [/凈化/g, '淨化'],
  [/11繡/g, '11級'],
  [/暈過正門/g, '通過正門'],
  [/^估擊$/, '伏擊'],
  [/^血巷$/, '血荒'],
  [/其名的指責/g, '莫名的指責'],
]

export function cleanSingleOcrQuestLine(rawLine, indexes = null) {
  if (!rawLine || typeof rawLine !== 'string') return ''
  let s = rawLine.trim()
  if (!s) return ''

  // 1. 移除所有空白並統一全形標點符號
  s = s
    .replace(/\s+/g, '')
    .replace(/（/g, '(')
    .replace(/）/g, ')')
    .replace(/？/g, '?')
    .replace(/！/g, '!')

  // 2. 解析或推斷開頭分類前綴 【劇情】 / 【重複】（若缺失則預設補上 【劇情】）
  let prefix = '【劇情】'
  const prefixMatch =
    s.match(/^[\[【〖(]*([劇處加一重其每][情清惰般複他日])[\]】〗)]*/) ||
    s.match(/^【([^】]+)】/)
  if (prefixMatch) {
    if (/[重複]/.test(prefixMatch[1])) {
      prefix = '【重複】'
    }
    s = s.slice(prefixMatch[0].length)
  }

  // 去除開頭可能殘留的視窗邊框雜訊字元（合法任務核心名稱必以中文字或「開頭）
  s = s.replace(/^[^\u4e00-\u9fa5「]+/, '')
  if (!s) return ''

  // 3. 修復括號內學院／部門常見 OCR 形近錯字
  s = s.replace(/\(([^)]+)\)/g, (full, inner) => {
    const fixed = normalizeOcrSchoolDeptToken(inner)
    return `(${fixed})`
  })

  let core = s
  let schoolDept = ''
  let isTimeLimit = false

  // 4. 若含有合法或形近 (學院/部門) 後綴（包含漏掉左括號如 `誤門)`、`恩凰格鬥)`、`箭)`），直接提取並截斷右側雜訊
  const sdMatch = core.match(LEGAL_SCHOOL_DEPT_SUFFIX_REGEX)
  if (sdMatch) {
    core = sdMatch[1]
    schoolDept = sdMatch[2]
  } else {
    const rawSdMatch = core.match(OCR_SCHOOL_DEPT_TAIL_REGEX)
    if (rawSdMatch) {
      core = rawSdMatch[1]
      schoolDept = normalizeOcrSchoolDeptToken(rawSdMatch[2])
    } else if (/^(.+?)[(]?弓?箭\).*$/.test(core)) {
      const mArrow = core.match(/^(.+?)[(]?弓?箭\).*$/)
      core = mArrow[1]
      schoolDept = '弓箭'
    } else {
      // 5. 若含有 [限時] 後綴（含 OCR 誤判如 `忠時`、`芷時`、`啃時`），亦屬於任務絕對結尾，直接截斷右側所有雜訊
      const tlMatch = core.match(/^(.+?)(?:[\[【(]?[限忠芷啃]時[\]】)]?).*$/)
      if (tlMatch) {
        core = tlMatch[1]
        isTimeLimit = true
      }
    }
  }

  // 6. 清除核心名稱尾端的 [成功/執行次數:1] 及其各種 OCR 誤判變體
  core = core
    .replace(/[\[【〖(]+[^氣\])]*?(?:[功切]|行次|次數|執行).*$/, '')
    .replace(/[\[【〖(]*[^\s氣()][功切].*$/, '')
    .replace(/[\[【〖(]*[執幸熟吝]?行次數.*$/, '')
    .replace(/[\[【〖(]*次數.*$/, '')
    .replace(/[\[【〖][^\]】〗]*$/, '')

  // 7. 修復階段編號：
  // - 若 OCR 將 `(2)` 漏讀左括號與數字僅剩單一右括號 `)`（如 `守衛的諮求)`、`公車司機的諸求)`、`例行性訓練)`），還原為 `(2)`
  core = core.replace(/([\u4e00-\u9fa5])\)$/, '$1(2)')
  // - 修復階段編號 (1)~(9)（如 OCR 將 (5) 誤判為 5)），並截斷編號括號右側殘留雜訊
  core = core.replace(/([\u4e00-\u9fa5])[(]?([1-9])[)].*$/, '$1($2)')

  // 8. 過濾非合法任務核心字元（僅保留中文、數字、()、「」、ID、-、?!）並套用已知像素字型形近字修正
  core = core.replace(/[^\u4e00-\u9fa50-9()「」ID\-?!]/g, '')
  for (const [pattern, replacement] of OCR_KNOWN_CORE_FIXES) {
    core = core.replace(pattern, replacement)
  }

  if (!core) return ''

  // 校正資料庫特定名稱習慣
  if (core === '蟲之血') {
    prefix = '【重複】'
  }
  if (core === '定期測驗' && schoolDept === '玄嚴') {
    schoolDept = '玄巖'
  }
  if (core === '例行性訓練(6)') {
    core = '例行性訓練(5)'
  }

  const suffix = schoolDept
    ? ` (${schoolDept})`
    : isTimeLimit
      ? ' [限時]'
      : ''
  const candidateLegalName = `${prefix}${core}${suffix}`

  // 9. 若提供任務庫 indexes，在相同結構條件（同學院部門、同編號、同限時）下進行資料庫精確與近似校正
  if (indexes?.taskMap && indexes.taskMap.size > 0) {
    const candidateNorm = normalizeQuestNameForOcr(candidateLegalName)
    for (const t of indexes.taskMap.values()) {
      if (normalizeQuestNameForOcr(t.name) === candidateNorm) {
        return t.name
      }
    }

    const candStruct = decomposeQuestStructure(candidateLegalName)
    let bestTask = null
    let bestScore = 0

    for (const t of indexes.taskMap.values()) {
      const tStruct = decomposeQuestStructure(t.name)
      if (tStruct.schoolDept !== candStruct.schoolDept) continue
      if (tStruct.isTimeLimit !== candStruct.isTimeLimit) continue
      if (tStruct.numTag !== candStruct.numTag) continue

      if (
        candStruct.baseCore.length > tStruct.baseCore.length &&
        candStruct.baseCore.length - tStruct.baseCore.length <= 2 &&
        candStruct.baseCore.startsWith(tStruct.baseCore) &&
        tStruct.baseCore.length >= 4
      ) {
        const prefixScore = 0.92 + tStruct.baseCore.length * 0.001
        if (prefixScore > bestScore) {
          bestScore = prefixScore
          bestTask = t
        }
        continue
      }

      if (Math.abs(tStruct.baseCore.length - candStruct.baseCore.length) > 1) continue
      const score = calcStringSimilarity(candStruct.baseCore, tStruct.baseCore)
      if (score > bestScore) {
        bestScore = score
        bestTask = t
      }
    }

    if (bestTask && bestScore >= 0.6) {
      return bestTask.name
    }
  }

  return candidateLegalName
}

/**
 * 從單張或多張圖片的 Tesseract OCR 原始文字中提取「合法任務名稱」清單
 * - 過濾非任務行的視窗雜訊（如「任務」、「進行中任務」、「已完成任務」、「詳細說」或單字元雜訊）
 * - 每行皆經過 cleanSingleOcrQuestLine 正則表達式標準化為 `【劇情】...` / `【重複】...` 格式
 */
export function extractQuestNamesFromOcrText(rawOcrText, indexes = null) {
  if (!rawOcrText || typeof rawOcrText !== 'string') return []

  const knownNormSet = indexes?.taskMap
    ? new Set(
        Array.from(indexes.taskMap.values()).map((t) =>
          normalizeQuestNameForOcr(t.name)
        )
      )
    : new Set()

  const rawLines = rawOcrText.split(/\r?\n/)
  const results = []
  const seenNorm = new Set()

  const UI_NOISE_SET = new Set([
    '任務',
    '進行中任務',
    '已完成任務',
    '詳細說',
    '詳細說明',
  ])

  for (const raw of rawLines) {
    const trimmed = raw.trim()
    if (!trimmed) continue

    const compact = trimmed.replace(/\s+/g, '')
    if (UI_NOISE_SET.has(compact)) continue

    // 判斷是否具備任務行特徵（含前綴括號、成功/執行次數後綴，或本身長度足夠）
    const hasQuestMarker =
      /[\[【〖][劇處加一重其]/.test(compact) ||
      /[功切].*[行次]/.test(compact) ||
      /[^\s氣()][功切]/.test(compact) ||
      /^【[^】]+】/.test(compact)

    const legalName = cleanSingleOcrQuestLine(trimmed, indexes)
    if (!legalName) continue

    const { cleanName } = parseTaskName(legalName)
    if (!cleanName || cleanName.length < 2) continue
    if (UI_NOISE_SET.has(cleanName)) continue

    // 若沒有任務標記且只是一兩個雜訊字元（如捲軸或邊框誤判的 "李"、"wa"），除非完全命中任務庫否則略過
    const cleanedNorm = normalizeQuestNameForOcr(legalName)
    if (!hasQuestMarker) {
      const isKnown = knownNormSet.has(cleanedNorm)
      if (!isKnown && (/^[a-zA-Z0-9\W]+$/.test(cleanName) || cleanName.length <= 2)) {
        continue
      }
    }

    if (!cleanedNorm || seenNorm.has(cleanedNorm)) continue
    seenNorm.add(cleanedNorm)
    results.push(legalName)
  }

  return results
}

/**
 * 合併既有的「解析後文字欄位」內容與新解析出的任務名稱清單（跨次操作去重，並自動正則標準化為合法任務名稱格式）
 * 例：第一次解析 50 筆、第二次解析 30 筆（其中 5 筆與第一次重疊）-> 合併後共 75 筆
 */
export function mergeUniqueQuestLines(existingText = '', newQuestNames = [], indexes = null) {
  const existingLines = String(existingText || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  const seenNorm = new Set()
  const merged = []

  for (const line of existingLines) {
    const cleaned = cleanSingleOcrQuestLine(line, indexes) || line
    const norm = normalizeQuestNameForOcr(cleaned) || line
    if (seenNorm.has(norm)) continue
    seenNorm.add(norm)
    merged.push(cleaned)
  }

  for (const rawNew of newQuestNames || []) {
    const trimmed = String(rawNew || '').trim()
    if (!trimmed) continue
    const cleaned = cleanSingleOcrQuestLine(trimmed, indexes) || trimmed
    const norm = normalizeQuestNameForOcr(cleaned) || trimmed
    if (seenNorm.has(norm)) continue
    seenNorm.add(norm)
    merged.push(cleaned)
  }

  return merged.join('\n')
}

/**
 * 根據「解析後的文字欄位」找出名稱相符的任務清單（嚴格實事求是：僅比對名稱相符的任務，絕不自動連帶完成未出現的前置任務）
 * 回傳 { matchedTaskIds: string[], matchedTasks: object[], unmatchedLines: string[], totalLines: number }
 */
export function matchQuestLinesToTaskIds(linesTextOrArray, indexes) {
  const rawLines = Array.isArray(linesTextOrArray)
    ? linesTextOrArray
    : String(linesTextOrArray || '').split(/\r?\n/)

  const nonEmptyLines = rawLines.map((l) => String(l || '').trim()).filter(Boolean)
  if (!indexes?.taskMap || nonEmptyLines.length === 0) {
    return {
      matchedTaskIds: [],
      matchedTasks: [],
      unmatchedLines: nonEmptyLines,
      totalLines: nonEmptyLines.length,
    }
  }

  // 建立正規化名稱 -> Task[] 映射
  const normToTasksMap = new Map()
  for (const task of indexes.taskMap.values()) {
    const norm = normalizeQuestNameForOcr(task.name)
    if (!norm) continue
    if (!normToTasksMap.has(norm)) {
      normToTasksMap.set(norm, [])
    }
    normToTasksMap.get(norm).push(task)
  }

  const matchedIdSet = new Set()
  const matchedTasks = []
  const unmatchedLines = []

  for (const line of nonEmptyLines) {
    const cleaned = cleanSingleOcrQuestLine(line, indexes) || line
    const norm = normalizeQuestNameForOcr(cleaned)
    const hits = norm ? normToTasksMap.get(norm) : null

    if (hits && hits.length > 0) {
      for (const task of hits) {
        if (!matchedIdSet.has(task.id)) {
          matchedIdSet.add(task.id)
          matchedTasks.push(task)
        }
      }
    } else {
      unmatchedLines.push(line)
    }
  }

  return {
    matchedTaskIds: Array.from(matchedIdSet),
    matchedTasks,
    unmatchedLines,
    totalLines: nonEmptyLines.length,
  }
}


