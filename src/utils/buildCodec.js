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

/**
 * 簡單字元位移混淆（Caesar cipher 變體）
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
 * 將配點資料編碼為可分享的字串
 * @param {{ job: string, isUltimate: boolean, allocations: object, ultimateSelections: string[] }} buildData
 * @returns {string} 編碼後的字串
 */
export const encodeBuild = (buildData) => {
  // 過濾掉 allocations 中值為 0 的欄位
  const compactAllocations = {}
  for (const [key, val] of Object.entries(buildData.allocations || {})) {
    if (val > 0) {
      compactAllocations[key] = val
    }
  }

  const payload = {
    j: buildData.job,
    u: buildData.isUltimate ? 1 : 0,
    a: compactAllocations,
    s: buildData.ultimateSelections || []
  }

  const json = JSON.stringify(payload)
  const base64 = btoa(unescape(encodeURIComponent(json)))
  return shiftEncode(base64)
}

/**
 * 將編碼字串解碼為配點資料
 * @param {string} encodedStr
 * @returns {{ job: string, isUltimate: boolean, allocations: object, ultimateSelections: string[] } | null}
 */
export const decodeBuild = (encodedStr) => {
  try {
    const base64 = shiftDecode(encodedStr)
    const json = decodeURIComponent(escape(atob(base64)))
    const payload = JSON.parse(json)

    return {
      job: payload.j,
      isUltimate: !!payload.u,
      allocations: payload.a || {},
      ultimateSelections: payload.s || []
    }
  } catch (e) {
    console.error('解碼配點分享資料失敗:', e)
    return null
  }
}
