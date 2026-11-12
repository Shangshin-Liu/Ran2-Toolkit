// 離線套用「已採納」的技能修正提案
//
// 用法：
//   node scripts/apply_proposals.js <提案JSON路徑>            # 只預覽差異，不寫檔
//   node scripts/apply_proposals.js <提案JSON路徑> --write    # 輸出到 backups/ran2_all_skills.patched.json
//
// <提案JSON路徑> 可使用本地審核面板「匯出已採納 JSON」下載的檔案。
// 本腳本只讀寫本機檔案，不會連線 Firestore，也不會覆蓋 backups/ran2_all_skills.json；
// 確認 patched 檔內容無誤後，再自行決定是否取代原檔並執行 upload_skills.js。

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { applyProposal, validateProposal, describeChanges, checkStale } from '../src/utils/skillProposal.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SKILLS_PATH = path.join(__dirname, '../backups/ran2_all_skills.json')
const OUTPUT_PATH = path.join(__dirname, '../backups/ran2_all_skills.patched.json')

const args = process.argv.slice(2)
const proposalsPath = args.find(a => !a.startsWith('--'))
const shouldWrite = args.includes('--write')

if (!proposalsPath) {
  console.error('用法：node scripts/apply_proposals.js <提案JSON路徑> [--write]')
  process.exit(1)
}

const proposals = JSON.parse(fs.readFileSync(proposalsPath, 'utf8'))
if (!Array.isArray(proposals)) {
  console.error('❌ 提案檔格式錯誤：預期為陣列')
  process.exit(1)
}

let trees = JSON.parse(fs.readFileSync(SKILLS_PATH, 'utf8'))
const accepted = proposals
  .filter(p => p.status === 'accepted')
  .sort((a, b) => (a.reviewedAt || 0) - (b.reviewedAt || 0))

console.log(`共 ${proposals.length} 筆提案，其中已採納 ${accepted.length} 筆\n`)

let appliedCount = 0
for (const p of accepted) {
  console.log(`── ${p.skillName}（${p.skillGroupId}）提案 ${p.id}`)
  const errors = validateProposal(p)
  if (errors.length) {
    console.log(`   ⏭️ 略過，驗證失敗：${errors.join('；')}\n`)
    continue
  }
  const stale = checkStale(trees, p)
  if (stale.length) {
    console.log(`   ⚠️ 原始資料與提案當時不同：${stale.join('、')}（仍會以提案內容覆蓋）`)
  }
  describeChanges(p).forEach(r => {
    console.log(`   ${r.scope} ${r.label}：${r.before} → ${r.after}`)
  })
  const result = applyProposal(trees, p)
  result.warnings.forEach(w => console.log(`   ⚠️ ${w}`))
  if (result.applied) {
    trees = result.trees
    appliedCount++
  }
  console.log('')
}

console.log(`✅ 成功套用 ${appliedCount} 筆`)

if (shouldWrite) {
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(trees, null, 2), 'utf8')
  console.log(`📄 已輸出：${OUTPUT_PATH}`)
} else {
  console.log('（預覽模式，未寫檔。加上 --write 可輸出 patched 檔）')
}
