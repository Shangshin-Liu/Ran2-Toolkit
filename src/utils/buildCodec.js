/**
 * buildCodec.js — 配點模擬器分享編碼 / 解碼工具
 *
 * 編碼資料結構：
 * {
 *   job: string,
 *   isUltimate: boolean,
 *   allocations: { [skill_group_id]: level },  // 只含 > 0 的
 *   ultimateSelections: string[]
 * }
 *
 * 編碼流程：JSON → Base64 → 字元位移混淆
 * 解碼流程：反向操作
 */

const SHIFT = 3 // 字元位移量

const JOBS = [
  '劍道部', '格鬥部', '弓箭部', '氣功部',
  '神劍部', '神鬥部', '神弓部', '神氣部'
]

const CAT_MAP = {
  'agi': 'a', 'str': 's', 'spi': 'p', 'com': 'c',
  'fist': 'f', 'foot': 't', 'qi': 'q', 'staff': 'g',
  'atk': 'k', 'sup': 'u', 'swift': 'w', 'power': 'o',
  'stab': 'b', 'slash': 'l'
}

const REV_CAT_MAP = Object.fromEntries(
  Object.entries(CAT_MAP).map(([k, v]) => [v, k])
)

/**
 * 根據職業與奧義狀態取得技能 ID 前綴
 */
const getJobPrefix = (job, isUltimate) => {
  if (!isUltimate) {
    const prefixes = {
      '劍道部': 'kendo_',
      '格鬥部': 'kakuto_',
      '弓箭部': 'archer_',
      '氣功部': 'qigong_'
    }
    return prefixes[job] || ''
  } else {
    const prefixes = {
      '神劍部': 'shinken_',
      '神鬥部': 'shintou_',
      '神弓部': 'shinbow_',
      '神氣部': 'shinki_'
    }
    return prefixes[job] || ''
  }
}

/**
 * 簡單字元位移混淆
 */
const shiftEncode = (str) => {
  return str
    .split('')
    .map((c) => String.fromCharCode(c.charCodeAt(0) + SHIFT))
    .join('')
}

const shiftDecode = (str) => {
  return str
    .split('')
    .map((c) => String.fromCharCode(c.charCodeAt(0) - SHIFT))
    .join('')
}

/**
 * 將配點資料編碼為極精簡的可分享字串 (方案 B)
 * @param {{ job: string, isUltimate: boolean, allocations: object, ultimateSelections: string[] }} buildData
 * @returns {string} 編碼後的字串
 */
export const encodeBuild = (buildData) => {
  const jobIdx = JOBS.indexOf(buildData.job)
  const isUlt = buildData.isUltimate ? 1 : 0
  const prefix = getJobPrefix(buildData.job, buildData.isUltimate)

  // 1. 壓縮 ultimateSelections 縮寫 (如: agi, str, spi -> a, s, p -> asp)
  const compactSelections = (buildData.ultimateSelections || [])
    .map(val => {
      const short = prefix && val.startsWith(prefix) ? val.slice(prefix.length) : val
      return CAT_MAP[short] || short
    })
    .join(',')

  // 2. 壓縮 allocations (如: shinbow_fist_001: 5 -> f1_5)
  const allocationParts = []
  for (const [key, val] of Object.entries(buildData.allocations || {})) {
    if (val > 0) {
      const shortKey = prefix && key.startsWith(prefix) ? key.slice(prefix.length) : key
      // shortKey 通常是 "fist_001" 或 "com_004"
      const parts = shortKey.split('_')
      if (parts.length === 2) {
        const cat = CAT_MAP[parts[0]] || parts[0]
        const num = parseInt(parts[1], 10)
        allocationParts.push(`${cat}${num}_${val}`)
      } else {
        allocationParts.push(`${shortKey}_${val}`)
      }
    }
  }
  const compactAllocationsStr = allocationParts.join(',')

  // 組裝為單一字串流: jobIdx|isUlt|compactSelections|compactAllocationsStr
  const payloadStr = `${jobIdx}|${isUlt}|${compactSelections}|${compactAllocationsStr}`

  // 轉 Base64 與位移混淆
  const base64 = btoa(unescape(encodeURIComponent(payloadStr)))
  return shiftEncode(base64)
}

/**
 * 將編碼字串解碼為配點資料 (方案 B)
 * @param {string} encodedStr
 * @returns {{ job: string, isUltimate: boolean, allocations: object, ultimateSelections: string[] } | null}
 */
export const decodeBuild = (encodedStr) => {
  try {
    const base64 = shiftDecode(encodedStr)
    const payloadStr = decodeURIComponent(escape(atob(base64)))
    
    const parts = payloadStr.split('|')
    if (parts.length < 4) return null

    const jobIdx = parseInt(parts[0], 10)
    const isUltimate = parts[1] === '1'
    const job = JOBS[jobIdx] || '弓箭部'
    const prefix = getJobPrefix(job, isUltimate)

    // 1. 還原 ultimateSelections
    const restoredSelections = parts[2] ? parts[2].split(',').map(val => {
      const catName = REV_CAT_MAP[val] || val
      return prefix ? `${prefix}${catName}` : catName
    }) : []

    // 2. 還原 allocations
    const restoredAllocations = {}
    const allocationsStr = parts[3]
    if (allocationsStr) {
      allocationsStr.split(',').forEach(item => {
        const itemParts = item.split('_')
        if (itemParts.length === 2) {
          const shortKey = itemParts[0]
          const level = parseInt(itemParts[1], 10)

          // 解析 shortKey (如 a1 -> agi_001)
          // 尋找第一個數字的位置以切開字母與數字
          const numMatch = shortKey.match(/\d+$/)
          if (numMatch) {
            const numStr = numMatch[0]
            const letterPart = shortKey.slice(0, shortKey.length - numStr.length)
            const catName = REV_CAT_MAP[letterPart] || letterPart
            const num = numStr.padStart(3, '0')
            
            const fullKey = prefix ? `${prefix}${catName}_${num}` : `${catName}_${num}`
            restoredAllocations[fullKey] = level
          } else {
            const fullKey = prefix ? `${prefix}${shortKey}` : shortKey
            restoredAllocations[fullKey] = level
          }
        }
      })
    }

    return {
      job,
      isUltimate,
      allocations: restoredAllocations,
      ultimateSelections: restoredSelections
    }
  } catch (e) {
    console.error('解碼配點分享資料失敗:', e)
    return null
  }
}
