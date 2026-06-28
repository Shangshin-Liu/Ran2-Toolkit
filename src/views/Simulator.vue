<template>
  <div class="simulator-page">
    <!-- 背景特效 -->
    <div class="bg-grid"></div>
    <div class="bg-radial"></div>

    <!-- 頂部標題與奧義模式切換 -->
    <div class="simulator-header">
      <div class="header-title-area">
        <h2 class="neon-text-defender">🛡️ 配點模擬</h2>
        <span class="version-badge font-small">弓箭部 ‧ 奧義敏弓系 v3</span>
      </div>
      
      <!-- 奧義模式核取方塊 -->
      <div class="ultimate-mode-container">
        <label class="checkbox-label">
          <input 
            type="checkbox" 
            v-model="isUltimateMode" 
            @change="triggerUltimateTooltip" 
          />
          <span class="checkbox-custom"></span>
          切換至奧義模式
        </label>
        
        <!-- Tooltip 氣泡 -->
        <transition name="tooltip-fade">
          <div v-if="showUltimateTooltip" class="tooltip-bubble">
            奧義模式開發中... 敬請期待！
          </div>
        </transition>
      </div>
    </div>

    <!-- 主體內容區 (雙欄佈局) -->
    <div class="simulator-body glass-card">
      
      <!-- 左欄：分頁與技能列表 (260px) -->
      <div class="left-panel">
        <!-- 技能樹分頁 Tabs -->
        <div class="tabs-header">
          <button 
            v-for="(tab, idx) in tabs" 
            :key="idx"
            class="tab-btn"
            :class="{ 'active-tab': state.activeTab === idx, 'disabled-tab': idx === 1 || idx === 2 }"
            @click="switchTab(idx)"
          >
            {{ tab }}
          </button>
        </div>

        <!-- 技能列表 -->
        <div class="skills-list-wrapper" v-if="state.activeTab === 0">
          <div v-if="loading" class="list-loading font-small">
            資料讀取中...
          </div>
          <div v-else-if="error" class="list-error font-small">
            ❌ 載入失敗: {{ error }}
          </div>
          <div v-else class="skills-list">
            <div 
              v-for="skill in skillsList" 
              :key="skill.skill_group_id"
              class="skill-row"
              :class="{ 
                'is-selected': state.selectedSkillId === skill.skill_group_id,
                'is-learned': getLevel(skill.skill_group_id) > 0
              }"
              @click="selectSkill(skill.skill_group_id)"
            >
              <!-- 類型 Badge -->
              <span class="type-badge" :class="skill.type === '主動' ? 'badge-active' : 'badge-passive'">
                {{ skill.type }}
              </span>

              <!-- 技能名稱 (允許完整換行不截斷) -->
              <span class="skill-name font-small">
                {{ skill.name }}
              </span>

              <!-- 控制按鈕 -->
              <div class="level-control" @click.stop>
                <button 
                  class="btn-lvl btn-minus"
                  :disabled="getLevel(skill.skill_group_id) === 0"
                  @click="adjustLevel(skill.skill_group_id, -1)"
                >
                  −
                </button>
                <span class="level-num font-small" :class="{ 'is-max': getLevel(skill.skill_group_id) === skill.levels.length }">
                  {{ getLevel(skill.skill_group_id) === skill.levels.length ? 'MAX' : getLevel(skill.skill_group_id) }}
                </span>
                <button 
                  class="btn-lvl btn-plus"
                  :disabled="getLevel(skill.skill_group_id) === skill.levels.length"
                  @click="adjustLevel(skill.skill_group_id, 1)"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 未開放技能樹空狀態 -->
        <div v-else class="empty-tab-state">
          <div class="empty-icon font-large">🔒</div>
          <p class="empty-text font-small">未開放</p>
        </div>
      </div>

      <!-- 右欄：詳細屬性面板 -->
      <div class="right-panel">
        <div v-if="!selectedSkill" class="empty-detail-state">
          <div class="detail-icon">🛡️</div>
          <h3 class="detail-text">請選擇左側技能</h3>
          <p class="detail-sub text-muted font-small">點擊技能項目，即可在此處查看技能數值詳情。</p>
        </div>

        <div v-else class="detail-container">
          
          <!-- A — 標題區 -->
          <div class="section-title-area border-defender">
            <div class="title-left">
              <div class="title-row">
                <h3 class="skill-detail-name">{{ selectedSkill.name }}</h3>
                <span class="type-badge" :class="selectedSkill.type === '主動' ? 'badge-active' : 'badge-passive'">
                  {{ selectedSkill.type }}
                </span>
              </div>
              <div class="unlock-row font-small text-muted">
                學習等級需求：{{ selectedSkill.initial_level }} 級 ｜ 
                能力點要求：敏捷 {{ selectedSkill.levels[currentSkillLevel > 0 ? currentSkillLevel - 1 : 0].learn_condition.stat_required }}
              </div>
            </div>
            <div class="title-right">
              <span class="level-pill" :class="{ 'level-unlearned': currentSkillLevel === 0, 'level-max': currentSkillLevel === selectedSkill.levels.length }">
                {{ currentSkillLevel > 0 ? (currentSkillLevel === selectedSkill.levels.length ? 'MAX' : `Lv ${currentSkillLevel}`) : '—' }}
              </span>
            </div>
          </div>

          <!-- B — 前置需求 (有前置才顯示) -->
          <div v-if="prerequisiteInfo" class="section-prereq glass-card">
            <span class="prereq-label font-small">→ 前置需求：</span>
            <span class="prereq-name font-small">{{ prerequisiteInfo.name }}</span>
            <span 
              class="prereq-status font-small" 
              :class="prerequisiteInfo.isSatisfied ? 'status-ok' : 'status-failed'"
            >
              {{ prerequisiteInfo.isSatisfied ? '✓ 已滿足' : `✗ 未滿足，需達 Lv ${prerequisiteInfo.requiredLevel}` }}
            </span>
          </div>

          <!-- C — 技能說明 -->
          <div class="section-desc font-small">
            {{ selectedSkill.description }}
          </div>

          <!-- E — 數值屬性 (詳細數值調整為由上而下列表呈現) -->
          <div class="section-metrics">
            <div class="metrics-list">
              <div 
                v-for="stat in formattedStats" 
                :key="stat.key" 
                class="metric-row"
              >
                <span class="metric-label font-small">{{ stat.label }}</span>
                <span 
                  class="metric-value font-medium"
                  :class="{ 'text-green': stat.key === 'hp_change' && stat.rawVal > 0 }"
                >
                  {{ stat.value }}
                </span>
              </div>
            </div>
            <div class="metric-tips font-small text-muted" v-if="currentSkillLevel === 0">
              * 目前尚未學習此技能，以上數值展示為 Lv 1 參考屬性。
            </div>
          </div>

          <!-- F — 特殊效果 (有特效才顯示) -->
          <div v-if="formattedEffects.length > 0" class="section-effects">
            <h4 class="effects-title font-small">特殊效果</h4>
            <div class="effects-list">
              <div 
                v-for="(effect, index) in formattedEffects" 
                :key="index"
                class="effect-pill font-small"
              >
                <span class="effect-icon">{{ effect.icon }}</span>
                <span class="effect-text">{{ effect.text }}</span>
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>

    <!-- 底部統計 Footer (條列式呈現) -->
    <div class="simulator-footer glass-card">
      <div class="footer-list">
        <div class="footer-item font-small">
          <span class="item-dot">✦</span>
          <span class="item-content">
            敏弓能力點需求：{{ statType }} <strong class="text-defender">{{ stats.statPoints }}</strong> 點 ／ 技能點消耗：<strong class="text-defender">{{ stats.skillPoints }}</strong> 點
          </span>
        </div>
        <div class="footer-item font-small text-muted">
          <span class="item-dot">✦</span>
          <span class="item-content">未開放：能力點 0 點 ／ 技能點 0 點</span>
        </div>
        <div class="footer-item font-small text-muted">
          <span class="item-dot">✦</span>
          <span class="item-content">未開放：能力點 0 點 ／ 技能點 0 點</span>
        </div>
        <div class="footer-item font-small text-muted">
          <span class="item-dot">✦</span>
          <span class="item-content">共通：能力點 0 點 ／ 技能點 0 點</span>
        </div>
      </div>
      
      <div class="footer-divider"></div>
      
      <div class="footer-summary font-medium">
        <span class="total-label">總計需要:</span>
        <span class="total-val">
          能力點需求 {{ statType }} <strong class="text-defender font-large">{{ stats.statPoints }}</strong> 點 ｜ 
          技能點消耗 <strong class="text-defender font-large">{{ stats.skillPoints }}</strong> 點
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

// Tab名稱
const tabs = ['敏弓', '未開放', '未開放', '共通']

// 模擬器狀態
const state = ref({
  allocations: {},    // { [skill_group_id]: level (0-9) }
  selectedSkillId: null, // 目前選中的 skill_group_id
  activeTab: 0        // 目前分頁
})

// 資料載入狀態
const skillsList = ref([])
const statType = ref('敏捷') // 動態記錄該技能樹的能力屬性點類型
const error = ref(null)
const loading = ref(true)

// 奧義模式核取狀態
const isUltimateMode = ref(false)
const showUltimateTooltip = ref(false)
let tooltipTimer = null

const triggerUltimateTooltip = () => {
  if (isUltimateMode.value) {
    showUltimateTooltip.value = true
    if (tooltipTimer) clearTimeout(tooltipTimer)
    tooltipTimer = setTimeout(() => {
      showUltimateTooltip.value = false
      isUltimateMode.value = false
    }, 2000)
  } else {
    showUltimateTooltip.value = false
  }
}

// 載入技能 JSON 資料
const fetchSkills = async () => {
  try {
    const res = await fetch('/data/ran2_min_skills_v3.json')
    if (!res.ok) throw new Error('無法讀取技能資料 JSON')
    const data = await res.json()
    skillsList.value = data.skills || []
    statType.value = data.require_stat_type || '敏捷'
    
    // 初始化等級為 0
    skillsList.value.forEach(s => {
      state.value.allocations[s.skill_group_id] = 0
    })
    
    // 預設選中第一個技能
    if (skillsList.value.length > 0) {
      state.value.selectedSkillId = skillsList.value[0].skill_group_id
    }
  } catch (err) {
    error.value = err.message
    console.error(err)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchSkills()
})

// ── 輔助 getters ──
const getLevel = (skillGroupId) => {
  return state.value.allocations[skillGroupId] || 0
}

const selectedSkill = computed(() => {
  return skillsList.value.find(s => s.skill_group_id === state.value.selectedSkillId) || null
})

const currentSkillLevel = computed(() => {
  return selectedSkill.value ? getLevel(selectedSkill.value.skill_group_id) : 0
})

// 切換 Tab
const switchTab = (index) => {
  state.value.activeTab = index
}

// 切換選中技能
const selectSkill = (skillGroupId) => {
  state.value.selectedSkillId = skillGroupId
}

// ── 驗證與配點核心邏輯 ──

// 檢查是否可升級至 targetLevel
const canLearnLevel = (skillGroupId, targetLevel) => {
  if (targetLevel < 1 || targetLevel > 9) return false
  
  const skill = skillsList.value.find(s => s.skill_group_id === skillGroupId)
  if (!skill) return false

  // 取得目標等級的實例
  const targetInstance = skill.levels[targetLevel - 1]
  if (!targetInstance) return false

  // 前置技能需求驗證
  const prereq = targetInstance.learn_condition.prerequisite
  if (prereq) {
    const prereqSkill = skillsList.value.find(s => s.name === prereq.skill_name)
    if (!prereqSkill) return false
    
    const prereqCurrentLevel = getLevel(prereqSkill.skill_group_id)
    if (prereqCurrentLevel < prereq.required_skill_level) {
      return false
    }
  }

  return true
}

// 檢查是否可降級至 targetLevel
const canUnlearnLevel = (skillGroupId, targetLevel) => {
  if (targetLevel < 0 || targetLevel > 9) return false
  
  const skill = skillsList.value.find(s => s.skill_group_id === skillGroupId)
  if (!skill) return false

  // 檢查所有其他技能是否依賴當前技能降級後的水準
  for (const otherSkill of skillsList.value) {
    if (otherSkill.skill_group_id === skillGroupId) continue
    
    const otherLevel = getLevel(otherSkill.skill_group_id)
    if (otherLevel > 0) {
      const otherInstance = otherSkill.levels[otherLevel - 1]
      const prereq = otherInstance.learn_condition.prerequisite
      if (prereq && prereq.skill_name === skill.name) {
        if (targetLevel < prereq.required_skill_level) {
          // 降級後將低於其他技能的前置需求門檻
          return false
        }
      }
    }
  }

  return true
}

// 遞迴收集所有需要自動升級的前置技能與其等級要求
const collectPrereqUpgrades = (skillGroupId, targetLevel, plan) => {
  const currentLvl = getLevel(skillGroupId)
  if (targetLevel <= currentLvl) return

  const skill = skillsList.value.find(s => s.skill_group_id === skillGroupId)
  if (!skill) return

  // 逐步模擬升級以收集依賴項
  for (let lv = currentLvl + 1; lv <= targetLevel; lv++) {
    const levelData = skill.levels[lv - 1]
    const prereq = levelData.learn_condition.prerequisite
    if (prereq) {
      const prereqSkill = skillsList.value.find(s => s.name === prereq.skill_name)
      if (prereqSkill) {
        const reqLvl = prereq.required_skill_level
        // 遞迴收集前置技能的升級需求
        collectPrereqUpgrades(prereqSkill.skill_group_id, reqLvl, plan)
      }
    }
  }

  // 記錄此技能自己需要的目標等級
  if (!plan[skillGroupId] || plan[skillGroupId] < targetLevel) {
    plan[skillGroupId] = targetLevel
  }
}

// 執行升級與遞迴自動補點
const upgradeWithPrereqs = (skillGroupId, targetLevel) => {
  const currentLvl = getLevel(skillGroupId)
  if (targetLevel <= currentLvl) return

  const plan = {}
  collectPrereqUpgrades(skillGroupId, targetLevel, plan)

  // 找出需要額外升級的前置技能
  const prereqsNeeded = []
  Object.keys(plan).forEach(id => {
    if (id !== skillGroupId) {
      const curr = getLevel(id)
      const target = plan[id]
      if (curr < target) {
        const skill = skillsList.value.find(s => s.skill_group_id === id)
        prereqsNeeded.push(`${skill.name} (需達 Lv ${target}，當前 Lv ${curr})`)
      }
    }
  })

  // 如果需要補點前置技能，跳出 confirm 詢問
  if (prereqsNeeded.length > 0) {
    const msg = `升級此技能需要滿足前置條件。是否自動學習以下前置技能？\n\n` + 
                prereqsNeeded.map(s => `‧ ${s}`).join('\n')
    
    if (confirm(msg)) {
      // 玩家同意，一鍵套用所有前置升級
      Object.keys(plan).forEach(id => {
        state.value.allocations[id] = plan[id]
      })
    }
  } else {
    // 前置皆已滿足，直接升級
    state.value.allocations[skillGroupId] = targetLevel
  }
}

// 調整等級 (+ / -)
const adjustLevel = (skillGroupId, delta) => {
  const currentLvl = getLevel(skillGroupId)
  const targetLvl = currentLvl + delta
  
  if (delta > 0) {
    // 升級時支援前置自動補點
    upgradeWithPrereqs(skillGroupId, targetLvl)
  } else if (delta < 0) {
    // 降級時依舊進行合法性檢查
    if (canUnlearnLevel(skillGroupId, targetLvl)) {
      state.value.allocations[skillGroupId] = targetLvl
    }
  }
}

// ── 右側欄詳細資料 Computeds ──

// 前置條件狀態
const prerequisiteInfo = computed(() => {
  if (!selectedSkill.value) return null
  const prereq = selectedSkill.value.levels[0].learn_condition.prerequisite
  if (!prereq) return null

  const prereqSkill = skillsList.value.find(s => s.name === prereq.skill_name)
  const currentLvl = prereqSkill ? getLevel(prereqSkill.skill_group_id) : 0
  const isSatisfied = currentLvl >= prereq.required_skill_level

  return {
    name: prereq.skill_name,
    requiredLevel: prereq.required_skill_level,
    currentLevel: currentLvl,
    isSatisfied
  }
})

// 數值屬性格式化對照與輸出
const formattedStats = computed(() => {
  if (!selectedSkill.value) return []
  
  const lvl = currentSkillLevel.value
  const displayLvl = lvl > 0 ? lvl : 1 // 若未學，展示 Lv 1 參考數值
  const levelData = selectedSkill.value.levels[displayLvl - 1]
  if (!levelData) return []

  const stats = []
  const baseStats = levelData.base_stats || {}

  // 欄位標籤對照表
  const labelMap = {
    hp_change: '傷害',
    target_count: '目標數',
    range: '射程',
    angle: '攻擊角度',
    duration: '持續時間',
    cast_time: '冷卻時間', // 詠唱時間文字調整為冷卻時間
    delay_time: '冷卻時間',
    evasion_rate_change: '迴避率變化',
    accuracy_rate_change: '命中率變化',
    attack_change: '攻擊力變化'
  }

  // 格式化基礎屬性
  Object.keys(baseStats).forEach(key => {
    if (labelMap[key] !== undefined) {
      const val = baseStats[key]
      let displayVal = ''
      
      if (key === 'hp_change') {
        displayVal = val < 0 ? `-${Math.abs(val)}` : `+${val}`
      } else if (['duration', 'cast_time', 'delay_time'].includes(key)) {
        displayVal = `${val.toFixed(1)} 秒`
      } else if (['evasion_rate_change', 'accuracy_rate_change'].includes(key)) {
        displayVal = `${val > 0 ? '+' : ''}${val}%`
      } else {
        displayVal = val.toString()
      }

      stats.push({
        key,
        label: labelMap[key],
        value: displayVal,
        rawVal: val
      })
    }
  })

  // 格式化 cost
  if (selectedSkill.value.type !== '被動' && levelData.cost) {
    stats.push({
      key: 'mp',
      label: 'MP 消耗',
      value: levelData.cost.mp.toString()
    })
    stats.push({
      key: 'sp',
      label: 'SP 消耗',
      value: levelData.cost.sp.toString()
    })
  }

  return stats
})

// 特殊效果格式化與圖示對照
const formattedEffects = computed(() => {
  if (!selectedSkill.value) return []
  
  const lvl = currentSkillLevel.value
  const displayLvl = lvl > 0 ? lvl : 1
  const levelData = selectedSkill.value.levels[displayLvl - 1]
  if (!levelData || !levelData.special_effects) return []

  return levelData.special_effects.map(eff => {
    let text = ''
    let icon = ''
    
    if (eff.effect_type === '拉/推') {
      text = `拉/推 ${eff.probability * 100}% 距離 ${eff.distance}`
      icon = '⚡'
    } else if (eff.effect_type === '移動速度') {
      text = `移動速度 ${eff.speed_rate > 0 ? '+' : ''}${eff.speed_rate * 100}%`
      icon = '🏃'
    } else if (eff.effect_type === '中毒') {
      text = `中毒 ${eff.probability * 100}% 傷害 ${eff.continuous_hit}/tick`
      icon = '🤢'
    } else if (eff.effect_type === '燃燒') {
      text = `燃燒 ${eff.probability * 100}% 傷害 ${eff.continuous_hit}/tick`
      icon = '🔥'
    }

    return { text, icon }
  })
})

// ── Footer 統計 Computeds ──
const stats = computed(() => {
  let totalStatPoints = 0
  let totalSkillPoints = 0

  skillsList.value.forEach(s => {
    const lvl = getLevel(s.skill_group_id)
    if (lvl > 0) {
      // 1. 能力點需求 (stat_required 取最高值)
      const statReq = s.levels[lvl - 1].learn_condition.stat_required || 0
      if (statReq > totalStatPoints) {
        totalStatPoints = statReq
      }
      
      // 2. 技能點消耗 (point_required 逐級累加)
      for (let i = 0; i < lvl; i++) {
        totalSkillPoints += s.levels[i].learn_condition.point_required || 0
      }
    }
  })

  return {
    statPoints: totalStatPoints,
    skillPoints: totalSkillPoints
  }
})
</script>

<style scoped>
.simulator-page {
  position: relative;
  min-height: 85vh;
  width: 100%;
  display: flex;
  flex-direction: column;
  padding: 30px 20px;
  box-sizing: border-box;
  overflow: hidden;
  color: var(--text-main);
}

/* 科技背景 */
.bg-grid {
  position: absolute;
  inset: 0;
  background-image: 
    linear-gradient(rgba(255, 119, 0, 0.02) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 119, 0, 0.02) 1px, transparent 1px);
  background-size: 35px 35px;
  background-position: center;
  z-index: -2;
  pointer-events: none;
}

.bg-radial {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 50% 30%, rgba(255, 119, 0, 0.04) 0%, rgba(0, 0, 0, 0) 70%);
  z-index: -1;
  pointer-events: none;
}

/* 頂部標頭與切換模式 */
.simulator-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  width: 1000px;
  max-width: 100%;
  margin-left: auto;
  margin-right: auto;
}

.header-title-area {
  display: flex;
  align-items: flex-end;
  gap: 12px;
}

.neon-text-defender {
  color: var(--color-defender);
  text-shadow: 0 0 10px rgba(255, 119, 0, 0.4);
  font-family: 'Microsoft JhengHei', '微軟正黑體', sans-serif;
  font-size: 1.8rem;
  font-weight: 800;
  margin: 0;
}

.version-badge {
  color: var(--text-muted);
  background: rgba(255, 119, 0, 0.05);
  border: 1px solid rgba(255, 119, 0, 0.15);
  border-radius: 4px;
  padding: 2px 8px;
}

/* 奧義核取方塊與 Tooltip */
.ultimate-mode-container {
  position: relative;
  display: flex;
  align-items: center;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  color: var(--text-main);
  user-select: none;
}

.checkbox-label input {
  display: none;
}

.checkbox-custom {
  width: 16px;
  height: 16px;
  border: 1.5px solid rgba(255, 119, 0, 0.4);
  border-radius: 4px;
  background: rgba(0,0,0,0.4);
  display: inline-block;
  position: relative;
  transition: all 0.2s ease;
}

.checkbox-label input:checked + .checkbox-custom {
  background: var(--color-defender);
  border-color: var(--color-defender);
  box-shadow: 0 0 8px var(--color-defender);
}

.checkbox-label input:checked + .checkbox-custom::after {
  content: '';
  position: absolute;
  left: 4.5px;
  top: 1px;
  width: 4px;
  height: 8px;
  border: solid #000;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.tooltip-bubble {
  position: absolute;
  top: -45px;
  right: 0;
  background: rgba(20, 20, 30, 0.95);
  border: 1.5px solid var(--color-defender);
  border-radius: 6px;
  padding: 8px 16px;
  color: #fff;
  font-size: 0.82rem;
  white-space: nowrap;
  box-shadow: 0 4px 15px rgba(0,0,0,0.5), 0 0 8px rgba(255, 119, 0, 0.2);
  z-index: 100;
}

.tooltip-bubble::after {
  content: '';
  position: absolute;
  bottom: -6px;
  right: 25px;
  width: 8px;
  height: 8px;
  background: rgba(20, 20, 30, 0.95);
  border-right: 1.5px solid var(--color-defender);
  border-bottom: 1.5px solid var(--color-defender);
  transform: rotate(45deg);
}

.tooltip-fade-enter-active, .tooltip-fade-leave-active {
  transition: all 0.25s ease;
}
.tooltip-fade-enter-from, .tooltip-fade-leave-to {
  opacity: 0;
  transform: translateY(5px);
}

/* 主體雙欄容器 */
.simulator-body {
  display: flex;
  width: 1000px;
  max-width: 100%;
  height: 60vh;
  min-height: 500px;
  border-radius: 16px;
  border: 1px solid rgba(255, 119, 0, 0.15);
  box-shadow: 0 0 30px rgba(255, 119, 0, 0.03), inset 0 0 20px rgba(0, 0, 0, 0.6);
  background: rgba(10, 14, 23, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  overflow: hidden;
  margin-left: auto;
  margin-right: auto;
}

/* ── 左欄面板 ── */
.left-panel {
  width: 320px; /* 稍微拉寬，確保名稱不被遮擋 */
  border-right: 1px solid rgba(255, 119, 0, 0.12);
  display: flex;
  flex-direction: column;
  background: rgba(8, 10, 16, 0.4);
}

/* 分頁選單 */
.tabs-header {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  border-bottom: 1px solid rgba(255, 119, 0, 0.12);
}

.tab-btn {
  padding: 12px 2px;
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.8rem;
  font-weight: 600;
  text-align: center;
  border-bottom: 2px solid transparent;
}

.tab-btn:hover:not(.disabled-tab) {
  color: var(--text-main);
  background: rgba(255, 119, 0, 0.02);
}

.tab-btn.active-tab {
  color: var(--color-defender);
  background: rgba(255, 119, 0, 0.04);
  border-bottom-color: var(--color-defender);
  text-shadow: 0 0 8px rgba(255, 119, 0, 0.25);
}

.disabled-tab {
  opacity: 0.4;
  cursor: not-allowed;
}

/* 技能滾動清單 */
.skills-list-wrapper {
  flex: 1;
  overflow-y: auto;
  padding: 15px 12px;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 119, 0, 0.2) transparent;
}

.skills-list-wrapper::-webkit-scrollbar {
  width: 4px;
}
.skills-list-wrapper::-webkit-scrollbar-thumb {
  background: rgba(255, 119, 0, 0.2);
  border-radius: 2px;
}

.skills-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* 技能單列項目 (預設未學習：直接灰底) */
.skill-row {
  display: flex;
  align-items: center;
  padding: 12px 10px;
  background: rgba(30, 30, 40, 0.6); /* 暗灰底 */
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  user-select: none;
  opacity: 0.85;
}

.skill-row:hover {
  background: rgba(40, 40, 50, 0.8);
  border-color: rgba(255, 255, 255, 0.12);
  opacity: 1;
}

/* 未學習時被選中：僅有微弱白邊框，背景依然保持灰底，不發光 */
.skill-row.is-selected {
  border-color: rgba(255, 255, 255, 0.25);
  background: rgba(35, 35, 45, 0.7);
  opacity: 1;
}
/* 已學習狀態 (亮燈) */
.skill-row.is-learned {
  border-color: var(--color-defender);
  background: rgba(255, 119, 0, 0.08);
  box-shadow: 0 0 12px rgba(255, 119, 0, 0.15);
  opacity: 1;
}

/* 已學習狀態且被選中：更強烈的橘色高亮與發光 */
.skill-row.is-learned.is-selected {
  border-color: var(--color-defender);
  background: rgba(255, 119, 0, 0.18);
  box-shadow: 0 0 18px rgba(255, 119, 0, 0.3);
  opacity: 1;
}

/* 類型 Badge */
.type-badge {
  font-size: 0.68rem;
  font-weight: bold;
  padding: 2px 6px;
  border-radius: 4px;
  margin-right: 8px;
  flex-shrink: 0;
}

.badge-active {
  background: rgba(0, 229, 255, 0.1);
  border: 1px solid rgba(0, 229, 255, 0.3);
  color: #00e5ff;
}

.badge-passive {
  background: rgba(0, 255, 102, 0.1);
  border: 1px solid rgba(0, 255, 102, 0.3);
  color: #00ff66;
}

/* 技能名稱 (不截斷，折行完整顯示，預設未學時字體置灰) */
.skill-name {
  flex: 1;
  color: rgba(255, 255, 255, 0.4);
  font-weight: 500;
  white-space: normal;
  word-break: break-word;
  line-height: 1.3;
  margin-right: 8px;
  transition: color 0.3s ease;
}

.skill-row.is-selected .skill-name {
  color: rgba(255, 255, 255, 0.7);
}

.skill-row.is-learned .skill-name {
  color: #fff; /* 已學習時亮起白色字 */
  text-shadow: 0 0 5px rgba(255, 119, 0, 0.2);
}

/* 等級控制器 */
.level-control {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.btn-lvl {
  width: 22px;
  height: 22px;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.03);
  color: var(--text-main);
  font-size: 0.85rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0;
}

.btn-lvl:hover:not(:disabled) {
  background: var(--color-defender);
  border-color: var(--color-defender);
  color: #000;
  box-shadow: 0 0 8px rgba(255, 119, 0, 0.3);
}

.btn-lvl:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.level-num {
  width: 32px; /* 拉寬以完美容納 MAX */
  text-align: center;
  font-weight: bold;
  color: var(--color-defender);
  transition: all 0.25s ease;
}

.level-num.is-max {
  color: #ff0055; /* MAX 狀態以亮紅色醒目呈現 */
  text-shadow: 0 0 8px rgba(255, 0, 85, 0.4);
}

/* 空頁籤狀態 */
.empty-tab-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 30px;
}

.empty-icon {
  opacity: 0.3;
  margin-bottom: 10px;
}

.empty-text {
  color: var(--text-muted);
}

/* ── 右欄面板 ── */
.right-panel {
  flex: 1;
  padding: 30px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 119, 0, 0.2) transparent;
}

.right-panel::-webkit-scrollbar {
  width: 4px;
}
.right-panel::-webkit-scrollbar-thumb {
  background: rgba(255, 119, 0, 0.2);
  border-radius: 2px;
}

/* 右欄空狀態 */
.empty-detail-state {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
}

.detail-icon {
  font-size: 3.5rem;
  opacity: 0.15;
  margin-bottom: 15px;
  animation: float-detail 4s ease-in-out infinite;
}

@keyframes float-detail {
  0% { transform: translateY(0px); }
  50% { transform: translateY(-8px); }
  100% { transform: translateY(0px); }
}

.detail-text {
  font-family: inherit;
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--text-main);
  margin-bottom: 8px;
}

.detail-sub {
  max-width: 320px;
  line-height: 1.5;
}

/* 右欄詳細內容 */
.detail-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* A — 標題區 */
.section-title-area {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 12px;
  border-bottom: 1.5px solid rgba(255, 119, 0, 0.12);
}

.title-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.skill-detail-name {
  font-family: inherit;
  font-size: 1.4rem;
  font-weight: 700;
  color: #fff;
  margin: 0;
  letter-spacing: 1px;
}

.unlock-row {
  letter-spacing: 0.5px;
}

.title-right {
  display: flex;
  align-items: center;
}

.level-pill {
  font-size: 0.9rem;
  font-weight: bold;
  background: rgba(200, 0, 255, 0.12);
  border: 1px solid rgba(200, 0, 255, 0.4);
  color: #d845ff;
  box-shadow: 0 0 10px rgba(200, 0, 255, 0.15);
  border-radius: 6px;
  padding: 4px 12px;
  letter-spacing: 1px;
}

.level-pill.level-unlearned {
  background: rgba(255, 255, 255, 0.03);
  border-color: rgba(255, 255, 255, 0.1);
  color: var(--text-muted);
  box-shadow: none;
}

.level-pill.level-max {
  background: rgba(255, 0, 85, 0.12);
  border-color: rgba(255, 0, 85, 0.4);
  color: #ff0055;
  box-shadow: 0 0 10px rgba(255, 0, 85, 0.25);
}

/* B — 前置需求 */
.section-prereq {
  padding: 10px 16px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  display: flex;
  align-items: center;
}

.prereq-label {
  color: var(--text-muted);
}

.prereq-name {
  color: #fff;
  font-weight: 600;
  margin-right: 12px;
}

.prereq-status {
  font-weight: bold;
}

.status-ok {
  color: #00ff66;
  text-shadow: 0 0 8px rgba(0, 255, 102, 0.2);
}

.status-failed {
  color: #ff0055;
  text-shadow: 0 0 8px rgba(255, 0, 85, 0.2);
}

/* C — 技能說明 */
.section-desc {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  padding: 12px 16px;
  line-height: 1.6;
  color: var(--text-muted);
  border: 1px solid rgba(255, 255, 255, 0.02);
}

/* E — 數值屬性 (由上而下列表) */
.section-metrics {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.metrics-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.metric-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 18px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  transition: all 0.25s ease;
}

.metric-row:hover {
  border-color: rgba(255, 119, 0, 0.12);
  background: rgba(255, 119, 0, 0.01);
}

.metric-label {
  color: var(--text-muted);
  font-weight: 500;
}

.metric-value {
  font-weight: bold;
  color: var(--color-defender);
  text-shadow: 0 0 6px rgba(255, 119, 0, 0.2);
}

.text-green {
  color: #00ff66 !important;
  text-shadow: 0 0 6px rgba(0, 255, 102, 0.2) !important;
}

.metric-tips {
  font-size: 0.75rem;
}

/* F — 特殊效果 */
.section-effects {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.effects-title {
  font-weight: bold;
  margin: 0;
  color: var(--text-main);
}

.effects-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.effect-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 6px;
  background: rgba(255, 150, 0, 0.08);
  border: 1px solid rgba(255, 150, 0, 0.25);
  color: #ffa600;
  font-weight: 500;
  box-shadow: 0 0 8px rgba(255, 150, 0, 0.05);
}

.effect-icon {
  font-size: 1rem;
}

/* ── 統計 Footer (條列式呈現) ── */
.simulator-footer {
  width: 1000px;
  max-width: 100%;
  margin-top: 20px;
  margin-left: auto;
  margin-right: auto;
  border-radius: 12px;
  border: 1px solid rgba(255, 119, 0, 0.12);
  background: rgba(10, 14, 23, 0.85);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  padding: 20px 30px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.footer-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.footer-item {
  display: flex;
  align-items: center;
  gap: 10px;
  line-height: 1.4;
}

.item-dot {
  color: var(--color-defender);
  text-shadow: 0 0 5px var(--color-defender);
}

.footer-item.text-muted .item-dot {
  color: var(--text-muted);
  text-shadow: none;
}

.item-content strong {
  font-weight: 600;
}

.footer-divider {
  width: 100%;
  height: 1px;
  border-bottom: 1px dashed rgba(255, 119, 0, 0.15);
}

.footer-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.total-label {
  color: var(--text-main);
  font-weight: 700;
}

.total-val {
  letter-spacing: 1px;
}

/* 響應式排版 */
@media (max-width: 768px) {
  .simulator-body {
    flex-direction: column;
    height: auto;
    min-height: auto;
  }

  .left-panel {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid rgba(255, 119, 0, 0.12);
    max-height: 280px;
  }

  .right-panel {
    height: auto;
    padding: 20px;
  }
  
  .tabs-header {
    grid-template-columns: repeat(4, 1fr);
  }
}
</style>
