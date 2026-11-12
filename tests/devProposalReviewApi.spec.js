// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { reviewProposal, checkReviewRequest } from '../scripts/devProposalReviewApi.js'

const sampleTrees = () => ([{
  id: 'kakuto_com',
  job: '格鬥部',
  skill_tree: '共通',
  skills: [{
    skill_group_id: 'kakuto_com_001',
    name: '冥想',
    description: '舊的說明',
    levels: [1, 2].map(lv => ({
      skill_level: lv,
      learn_condition: { character_level: lv, point_required: 0, prerequisite: null },
      base_stats: { hp_change: lv, delay_time: 5 },
      special_effects: [],
      cost: { mp: 10, sp: 0 }
    }))
  }]
}])

const makeDb = (docs) => {
  const updates = []
  return {
    updates,
    collection: (name) => ({
      doc: (id) => ({
        get: async () => ({ exists: name === 'skill_proposals' && !!docs[id], data: () => docs[id] }),
        update: async (data) => {
          updates.push({ id, data })
          Object.assign(docs[id], data)
        }
      })
    })
  }
}

const pending = () => ({
  skillGroupId: 'kakuto_com_001',
  skillName: '冥想',
  authorCharId: '測試角色',
  status: 'pending',
  reason: '遊戲內不同',
  changes: {
    description: '新的說明',
    levels: { 2: { base_stats: { hp_change: 2, delay_time: 3 }, cost: { mp: 10, sp: 0, other: [{ item: '符咒', amount: 1 }] } } }
  },
  before: {}
})

describe('reviewProposal（本機審核 API）', () => {
  let skillsPath
  beforeEach(() => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ran2-review-'))
    skillsPath = path.join(dir, 'skills.json')
    fs.writeFileSync(skillsPath, JSON.stringify(sampleTrees(), null, 2) + '\n', 'utf8')
  })

  it('採納：套用到技能 JSON，再把提案改為已採納', async () => {
    const docs = { p1: pending() }
    const db = makeDb(docs)
    const result = await reviewProposal({ db, skillsPath, id: 'p1', status: 'accepted', note: ' 已確認 ', now: 123 })
    expect(result).toMatchObject({ id: 'p1', status: 'accepted', skillName: '冥想' })

    const raw = fs.readFileSync(skillsPath, 'utf8')
    expect(raw.endsWith('}\n]\n') || raw.endsWith(']\n')).toBe(true)
    const skill = JSON.parse(raw)[0].skills[0]
    expect(skill.description).toBe('新的說明')
    expect(skill.levels[1].base_stats.delay_time).toBe(3)
    expect(skill.levels[1].cost.other).toEqual([{ item: '符咒', amount: 1 }])
    expect(skill.levels[0].base_stats.delay_time).toBe(5)
    expect(skill.levels[1].learn_condition).toEqual({ character_level: 2, point_required: 0, prerequisite: null })

    expect(db.updates).toEqual([{ id: 'p1', data: { status: 'accepted', reviewNote: '已確認', reviewedAt: 123 } }])
  })

  it('內容不合法或找不到技能時拒絕，且不動到 JSON 與提案', async () => {
    const before = fs.readFileSync(skillsPath, 'utf8')
    const bad = pending()
    bad.changes.levels[2].learn_condition = { character_level: 1 }
    const missing = { ...pending(), skillGroupId: 'not_exist' }
    const db = makeDb({ bad, missing })

    await expect(reviewProposal({ db, skillsPath, id: 'bad', status: 'accepted' })).rejects.toMatchObject({ httpStatus: 422 })
    await expect(reviewProposal({ db, skillsPath, id: 'missing', status: 'accepted' })).rejects.toMatchObject({ httpStatus: 422 })
    await expect(reviewProposal({ db, skillsPath, id: 'nope', status: 'accepted' })).rejects.toMatchObject({ httpStatus: 404 })
    await expect(reviewProposal({ db, skillsPath, id: 'bad', status: 'rejected' })).rejects.toMatchObject({ httpStatus: 400 })
    await expect(reviewProposal({ db, skillsPath, id: 'a/b', status: 'accepted' })).rejects.toMatchObject({ httpStatus: 400 })
    expect(fs.readFileSync(skillsPath, 'utf8')).toBe(before)
    expect(db.updates).toEqual([])
  })

  it('狀態轉換：只有待審核能採納或撤回，只有已撤回能改回待審核', async () => {
    const docs = { a: { ...pending(), status: 'accepted' }, w: { ...pending(), status: 'withdrawn' }, p: pending() }
    const db = makeDb(docs)
    await expect(reviewProposal({ db, skillsPath, id: 'a', status: 'accepted' })).rejects.toMatchObject({ httpStatus: 409 })
    await expect(reviewProposal({ db, skillsPath, id: 'a', status: 'withdrawn' })).rejects.toMatchObject({ httpStatus: 409 })
    await expect(reviewProposal({ db, skillsPath, id: 'a', status: 'pending' })).rejects.toMatchObject({ httpStatus: 409 })

    await reviewProposal({ db, skillsPath, id: 'p', status: 'withdrawn', note: '資料有誤', now: 5 })
    expect(docs.p).toMatchObject({ status: 'withdrawn', reviewNote: '資料有誤', reviewedAt: 5 })
    await reviewProposal({ db, skillsPath, id: 'w', status: 'pending' })
    expect(docs.w).toMatchObject({ status: 'pending', reviewedAt: null })
  })
})

describe('checkReviewRequest', () => {
  const req = (over = {}) => ({
    method: 'POST',
    socket: { remoteAddress: '127.0.0.1' },
    headers: { 'x-ran2-dev-review': '1', origin: 'http://localhost:5173' },
    ...over
  })

  it('只接受本機、帶自訂標頭、來源為 localhost 的 POST', () => {
    expect(checkReviewRequest(req())).toBeNull()
    expect(checkReviewRequest(req({ socket: { remoteAddress: '::1' }, headers: { 'x-ran2-dev-review': '1' } }))).toBeNull()
    expect(checkReviewRequest(req({ method: 'GET' })).status).toBe(405)
    expect(checkReviewRequest(req({ socket: { remoteAddress: '192.168.1.20' } })).status).toBe(403)
    expect(checkReviewRequest(req({ headers: { origin: 'http://localhost:5173' } })).status).toBe(403)
    expect(checkReviewRequest(req({ headers: { 'x-ran2-dev-review': '1', origin: 'https://evil.example' } })).status).toBe(403)
  })
})
