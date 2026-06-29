<template>
  <div class="simulator-page">
    <!-- 背景特效 -->
    <div class="bg-grid"></div>
    <div class="bg-radial"></div>

    <!-- 頂部標題與奧義模式切換 -->
    <div class="simulator-header">
      <div class="header-title-area">
        <h2 class="neon-text-defender">🛡️ 配點模擬</h2>
        <span class="version-badge font-small">亂2 Online ‧ 完整配點模擬器 v3</span>
      </div>
      
      <!-- 頂部控制項整合區 -->
      <div class="header-controls-area">
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
              已成功切換至奧義模式！
            </div>
          </transition>
        </div>

        <!-- 配點重置按鈕 -->
        <button class="btn-reset font-small" @click="resetAllocations">
          🔄 配點重置
        </button>
      </div>
    </div>

    <!-- 主體內容區 (雙欄佈局) -->
    <div class="simulator-body glass-card">
      
      <!-- 左欄：分頁與技能列表 (350px) -->
      <div class="left-panel">
        
        <!-- 職業選擇器 -->
        <div class="job-selector-container">
          <label class="job-label font-small">職業選擇：</label>
          <select v-model="selectedJob" class="job-select font-small">
            <option v-for="job in jobsList" :key="job" :value="job">
              {{ job }}
            </option>
          </select>
        </div>

        <!-- 技能樹分頁 Tabs (包含奧義鎖定按鈕) -->
        <div class="tabs-header-container">
          <button 
            v-if="isUltimateMode"
            class="lock-btn"
            :class="{ 'is-locked': isDropdownLocked }"
            @click="isDropdownLocked = !isDropdownLocked"
            title="鎖定/解鎖奧義技能樹下拉選單"
          >
            {{ isDropdownLocked ? '🔒' : '🔓' }}
          </button>
          
          <div class="tabs-header">
            <div 
              v-for="(tabId, idx) in tabTreeIds" 
              :key="idx"
              class="tab-btn-wrapper"
              :class="{ 'active-tab': state.activeTab === idx }"
            >
              <!-- 奧義模式、前三條技能樹、且未鎖定下拉選單：渲染為選單 -->
              <select
                v-if="isUltimateMode && idx < 3 && !isDropdownLocked"
                v-model="ultimateSelections[idx]"
                class="tab-tree-select font-small"
                @change="handleUltimateSelectionChange(idx)"
                @click="switchTab(idx)"
              >
                <option 
                  v-for="opt in ultimateTreeOptions" 
                  :key="opt" 
                  :value="opt"
                  :disabled="isOptionDisabled(opt, idx)"
                >
                  {{ getTreeName(opt) }}
                </option>
              </select>

              <!-- 普通分頁按鈕 (普通模式、或奧義已鎖定、或共通分頁) -->
              <button
                v-else
                class="tab-btn"
                @click="switchTab(idx)"
              >
                {{ getTreeName(tabId) }}
              </button>
            </div>
          </div>
        </div>

        <!-- 技能列表 -->
        <div class="skills-list-wrapper">
          <div v-if="loading" class="list-loading font-small">
            資料讀取中 (V3)...
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
              <div class="unlock-row">
                <div class="unlock-item">
                  <span class="unlock-icon">🎖️</span>
                  <span>學習等級需求：<strong class="text-defender">Lv.{{ curCharLevel }}級({{ isSkillMaxed ? '已滿級' : '下一級Lv.' + nextCharLevel }})</strong></span>
                </div>
                <div class="unlock-item">
                  <span class="unlock-icon">🔮</span>
                  <span>技能點數需求：<strong class="text-defender">{{ isSkillMaxed ? maxCumulativePoints : curCumulativePoints }}點({{ isSkillMaxed ? '已滿級' : '下一級需要' + nextPointRequiredVal + '點' }})</strong></span>
                </div>
                <div class="unlock-item" v-if="hasStatRequired">
                  <span class="unlock-icon">📊</span>
                  <span>能力屬性要求：<strong class="text-defender">{{ statType }}{{ curStatRequired }}({{ isSkillMaxed ? '已滿級' : '下一級' + statType + nextStatRequiredVal }})</strong></span>
                </div>
              </div>
            </div>
            <div class="title-right">
              <span class="level-pill" :class="{ 'level-unlearned': currentSkillLevel === 0, 'level-max': currentSkillLevel === selectedSkill.levels.length }">
                {{ currentSkillLevel > 0 ? (currentSkillLevel === selectedSkill.levels.length ? 'MAX' : `Lv ${currentSkillLevel}`) : '未習得' }}
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

          <!-- 手機版展開/收合詳細資訊按鈕 -->
          <div v-if="isMobile" class="mobile-expand-toggle">
            <button 
              class="btn-expand font-small" 
              @click="isDetailExpanded = !isDetailExpanded"
            >
              {{ isDetailExpanded ? '🔼 收合詳細資訊' : '🔽 展開詳細資訊' }}
            </button>
          </div>

          <!-- 詳細資訊折疊區塊 (手機版可展開收合) -->
          <div v-if="!isMobile || isDetailExpanded" class="collapsible-details">
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

    </div>

    <!-- 底部統計 Footer (條列式呈現) -->
    <div class="simulator-footer glass-card">
      <div class="footer-list">
        <!-- 技能樹 1 -->
        <div class="footer-item font-small">
          <span class="item-dot">✦</span>
          <span class="item-content">
            {{ getTreeName(tabTreeIds[0]) }}能力點需求：{{ tree1Cost.statType }} <strong class="text-defender">{{ tree1Cost.statPoints }}</strong> 點 ／ 技能點消耗：<strong class="text-defender">{{ tree1Cost.skillPoints }}</strong> 點
          </span>
        </div>
        <!-- 技能樹 2 -->
        <div class="footer-item font-small">
          <span class="item-dot">✦</span>
          <span class="item-content">
            {{ getTreeName(tabTreeIds[1]) }}能力點需求：{{ tree2Cost.statType }} <strong class="text-defender">{{ tree2Cost.statPoints }}</strong> 點 ／ 技能點消耗：<strong class="text-defender">{{ tree2Cost.skillPoints }}</strong> 點
          </span>
        </div>
        <!-- 技能樹 3 -->
        <div class="footer-item font-small">
          <span class="item-dot">✦</span>
          <span class="item-content">
            {{ getTreeName(tabTreeIds[2]) }}能力點需求：{{ tree3Cost.statType }} <strong class="text-defender">{{ tree3Cost.statPoints }}</strong> 點 ／ 技能點消耗：<strong class="text-defender">{{ tree3Cost.skillPoints }}</strong> 點
          </span>
        </div>
        <!-- 共通 -->
        <div class="footer-item font-small">
          <span class="item-dot">✦</span>
          <span class="item-content">
            {{ getTreeName(tabTreeIds[3]) }}能力點需求：{{ comTreeCost.statType }} <strong class="text-defender">{{ comTreeCost.statPoints }}</strong> 點 ／ 技能點消耗：<strong class="text-defender">{{ comTreeCost.skillPoints }}</strong> 點
          </span>
        </div>
      </div>
      
      <div class="footer-divider"></div>
      
      <div class="footer-summary font-medium">
        <span class="total-label">總計需要:</span>
        <div class="total-val">
          <span class="total-item">敏捷需求 <strong class="text-defender font-large">{{ totalStatsSummary.agi }}</strong> 點</span>
          <span class="total-divider">｜</span>
          <span class="total-item">力量需求 <strong class="text-defender font-large">{{ totalStatsSummary.str }}</strong> 點</span>
          <span class="total-divider">｜</span>
          <span class="total-item">精神需求 <strong class="text-defender font-large">{{ totalStatsSummary.spi }}</strong> 點</span>
          <span class="total-divider">｜</span>
          <span class="total-item">技能點總計 <strong class="text-defender font-large">{{ totalStatsSummary.skillPoints }}</strong> 點</span>
          <span class="total-divider">｜</span>
          <span class="total-item">所需最大角色等級 <strong class="text-defender font-large">{{ maxCharLevelRequired }}</strong> 級</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

// 模擬器主要狀態
const isUltimateMode = ref(false)
const selectedJob = ref('弓箭部')
const isDropdownLocked = ref(false) // 奧義模式下拉選單鎖定狀態

const resetAllocations = () => {
  if (confirm('確定要重置所有技能配點嗎？')) {
    state.value.allocations = {}
    setDefaultSelectedSkill()
  }
}

// 奧義選單所有的 12 個技能樹 ID
const ultimateTreeOptions = [
  'shintou_agi',
  'shintou_str',
  'shintou_spi',
  'shinken_agi',
  'shinken_spi',
  'shinken_str',
  'shinbow_agi',
  'shinbow_str',
  'shinbow_spi',
  'shinki_str',
  'shinki_spi_atk',
  'shinki_spi_sup'
]

// 奧義模式前 3 個 Tab 選擇的技能樹 ID
const ultimateSelections = ref(['shinbow_agi', 'shinbow_str', 'shinbow_spi'])

// 模擬器配點與分頁狀態
const state = ref({
  allocations: {},       // { [skill_group_id]: level (0-N) }
  selectedSkillId: null, // 目前選中的 skill_group_id
  activeTab: 0           // 目前分頁
})

// 資料載入狀態
const allSkillTrees = ref([])
const error = ref(null)
const loading = ref(true)

// 手機版自適應與詳細資訊展開狀態
const isMobile = ref(false)
const isDetailExpanded = ref(false)

// 奧義模式核取狀態
const showUltimateTooltip = ref(false)
let tooltipTimer = null

const triggerUltimateTooltip = () => {
  showUltimateTooltip.value = true
  if (tooltipTimer) clearTimeout(tooltipTimer)
  tooltipTimer = setTimeout(() => {
    showUltimateTooltip.value = false
  }, 2000)
}

// ── 計算屬性：動態職業清單 ──
const jobsList = computed(() => {
  return !isUltimateMode.value
    ? ['劍道部', '格鬥部', '弓箭部', '氣功部']
    : ['神劍部', '神鬥部', '神弓部', '神氣部']
})

// ── 計算屬性：動態分頁 Tree ID 對應 ──
const tabTreeIds = computed(() => {
  if (!isUltimateMode.value) {
    const mapping = {
      '劍道部': ['kendo_stab', 'kendo_slash', 'kendo_qi', 'kendo_com'],
      '格鬥部': ['kakuto_fist', 'kakuto_foot', 'kakuto_qi', 'kakuto_com'],
      '弓箭部': ['archer_swift', 'archer_power', 'archer_qi', 'archer_com'],
      '氣功部': ['qigong_staff', 'qigong_atk', 'qigong_sup', 'qigong_com']
    }
    return mapping[selectedJob.value] || mapping['弓箭部']
  } else {
    const comMapping = {
      '神劍部': 'shinken_com',
      '神鬥部': 'shintou_com',
      '神弓部': 'shinbow_com',
      '神氣部': 'shinki_com'
    }
    const comId = comMapping[selectedJob.value] || 'shinbow_com'
    return [
      ultimateSelections.value[0],
      ultimateSelections.value[1],
      ultimateSelections.value[2],
      comId
    ]
  }
})

// ── 監聽器 ──
watch(isUltimateMode, (newVal) => {
  isDropdownLocked.value = false // 切換模式時自動解鎖
  state.value.allocations = {} // 清除所有配點配置，防止統計錯誤
  if (newVal) {
    if (selectedJob.value === '弓箭部') selectedJob.value = '神弓部'
    else if (selectedJob.value === '劍道部') selectedJob.value = '神劍部'
    else if (selectedJob.value === '格鬥部') selectedJob.value = '神鬥部'
    else if (selectedJob.value === '氣功部') selectedJob.value = '神氣部'
    else selectedJob.value = '神弓部'
  } else {
    if (selectedJob.value === '神弓部') selectedJob.value = '弓箭部'
    else if (selectedJob.value === '神劍部') selectedJob.value = '劍道部'
    else if (selectedJob.value === '神鬥部') selectedJob.value = '格鬥部'
    else if (selectedJob.value === '神氣部') selectedJob.value = '氣功部'
    else selectedJob.value = '弓箭部'
  }
  resetUltimateDropdowns()
  setDefaultSelectedSkill()
})

watch(selectedJob, () => {
  state.value.allocations = {} // 更換職業時清除所有配點配置
  resetUltimateDropdowns()
  setDefaultSelectedSkill()
})

const resetUltimateDropdowns = () => {
  if (selectedJob.value === '神劍部') {
    ultimateSelections.value = ['shinken_agi', 'shinken_str', 'shinken_spi']
  } else if (selectedJob.value === '神鬥部') {
    ultimateSelections.value = ['shintou_agi', 'shintou_str', 'shintou_spi']
  } else if (selectedJob.value === '神氣部') {
    ultimateSelections.value = ['shinki_str', 'shinki_spi_atk', 'shinki_spi_sup']
  } else {
    ultimateSelections.value = ['shinbow_agi', 'shinbow_str', 'shinbow_spi']
  }
}

// ── 輔助搜尋器 ──
const getTreeName = (treeId) => {
  const tree = allSkillTrees.value.find(t => t.id === treeId)
  if (!tree) return treeId
  let name = tree.skill_tree
  if (isUltimateMode.value) {
    name = name.replace('奧義', '')
  }
  return name
}

const findSkillByName = (name) => {
  for (const tree of allSkillTrees.value) {
    const s = tree.skills.find(sk => sk.name === name)
    if (s) return s
  }
  return null
}

const findSkillById = (skillGroupId) => {
  for (const tree of allSkillTrees.value) {
    const s = tree.skills.find(sk => sk.skill_group_id === skillGroupId)
    if (s) return s
  }
  return null
}

// 載入技能 JSON 資料
const fetchSkills = async () => {
  try {
    const res = await fetch('/data/ran2_all_skills.json')
    if (!res.ok) throw new Error('無法讀取技能資料 JSON')
    const data = await res.json()
    
    allSkillTrees.value = data || []
    
    // 初始化 allocations
    allSkillTrees.value.forEach(tree => {
      tree.skills.forEach(s => {
        state.value.allocations[s.skill_group_id] = 0
      })
    })

    setDefaultSelectedSkill()
  } catch (err) {
    error.value = err.message
    console.error(err)
  } finally {
    loading.value = false
  }
}

const handleResize = () => {
  isMobile.value = window.innerWidth <= 768
}

onMounted(() => {
  fetchSkills()
  handleResize()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})

// ── 輔助 getters ──
const getLevel = (skillGroupId) => {
  return state.value.allocations[skillGroupId] || 0
}

const currentSkillTree = computed(() => {
  const targetId = tabTreeIds.value[state.value.activeTab]
  return allSkillTrees.value.find(tree => tree.id === targetId) || null
})

const skillsList = computed(() => {
  return currentSkillTree.value ? currentSkillTree.value.skills : []
})

const statType = computed(() => {
  return currentSkillTree.value ? currentSkillTree.value.require_stat_type : '共通'
})

const selectedSkill = computed(() => {
  return skillsList.value.find(s => s.skill_group_id === state.value.selectedSkillId) || null
})

const currentSkillLevel = computed(() => {
  return selectedSkill.value ? getLevel(selectedSkill.value.skill_group_id) : 0
})

// ── 計算屬性：詳細面板的當前與下一級解鎖需求對照 ──
const hasStatRequired = computed(() => {
  if (!selectedSkill.value) return false
  return selectedSkill.value.levels.some(lvl => lvl.learn_condition.stat_required !== undefined)
})

const curCharLevel = computed(() => {
  if (!selectedSkill.value) return 0
  const lvl = currentSkillLevel.value
  return lvl > 0 ? selectedSkill.value.levels[lvl - 1].learn_condition.character_level : 0
})

const nextCharLevel = computed(() => {
  if (!selectedSkill.value) return 'MAX'
  const lvl = currentSkillLevel.value
  if (lvl >= selectedSkill.value.levels.length) return 'MAX'
  return selectedSkill.value.levels[lvl].learn_condition.character_level
})

const curPointRequired = computed(() => {
  if (!selectedSkill.value) return 0
  const lvl = currentSkillLevel.value
  return lvl > 0 ? selectedSkill.value.levels[lvl - 1].learn_condition.point_required : 0
})

const nextPointRequiredVal = computed(() => {
  if (!selectedSkill.value) return 'MAX'
  const lvl = currentSkillLevel.value
  if (lvl >= selectedSkill.value.levels.length) return 'MAX'
  return selectedSkill.value.levels[lvl].learn_condition.point_required
})

const curStatRequired = computed(() => {
  if (!selectedSkill.value) return 0
  const lvl = currentSkillLevel.value
  if (lvl === 0) return 0
  const val = selectedSkill.value.levels[lvl - 1].learn_condition.stat_required
  return val !== undefined ? val : 0
})

const nextStatRequiredVal = computed(() => {
  if (!selectedSkill.value) return 'MAX'
  const lvl = currentSkillLevel.value
  if (lvl >= selectedSkill.value.levels.length) return 'MAX'
  const val = selectedSkill.value.levels[lvl].learn_condition.stat_required
  return val !== undefined ? val : 0
})

const isSkillMaxed = computed(() => {
  if (!selectedSkill.value) return false
  return currentSkillLevel.value === selectedSkill.value.levels.length
})

const maxCumulativePoints = computed(() => {
  if (!selectedSkill.value) return 0
  return selectedSkill.value.levels.reduce((sum, lvl) => sum + (lvl.learn_condition.point_required || 0), 0)
})

const curCumulativePoints = computed(() => {
  if (!selectedSkill.value || currentSkillLevel.value === 0) return 0
  let sum = 0
  for (let i = 0; i < currentSkillLevel.value; i++) {
    sum += (selectedSkill.value.levels[i].learn_condition.point_required || 0)
  }
  return sum
})

// ── 計算屬性：已點技能所需的最高角色等級 ──
const maxCharLevelRequired = computed(() => {
  let maxLvl = 1
  for (const tree of allSkillTrees.value) {
    for (const skill of tree.skills) {
      const lvl = getLevel(skill.skill_group_id)
      if (lvl > 0) {
        const levelData = skill.levels[lvl - 1]
        if (levelData) {
          const charLvl = levelData.learn_condition.character_level
          if (charLvl > maxLvl) {
            maxLvl = charLvl
          }
        }
      }
    }
  }
  return maxLvl
})

// 設定預設選中技能
const setDefaultSelectedSkill = () => {
  const currentSkills = skillsList.value
  if (currentSkills && currentSkills.length > 0) {
    state.value.selectedSkillId = currentSkills[0].skill_group_id
  } else {
    state.value.selectedSkillId = null
  }
}

// 切換 Tab
const switchTab = (index) => {
  state.value.activeTab = index
  setDefaultSelectedSkill()
}

// 切換選中技能
const selectSkill = (skillGroupId) => {
  state.value.selectedSkillId = skillGroupId
  isDetailExpanded.value = false // 手機版切換技能時預設收合詳細資訊
}

// ── 奧義下拉選單排它選取驗證 ──
const isOptionDisabled = (optId, currentIdx) => {
  return ultimateSelections.value.some((selectedId, idx) => {
    return idx !== currentIdx && selectedId === optId
  })
}

const handleUltimateSelectionChange = (idx) => {
  state.value.allocations = {} // 奧義模式下重選下拉選單時，清空配點配置
  state.value.activeTab = idx
  setDefaultSelectedSkill()
}

// ── 驗證與配點核心邏輯 ──
const canLearnLevel = (skillGroupId, targetLevel) => {
  if (targetLevel < 1) return false
  const skill = findSkillById(skillGroupId)
  if (!skill || targetLevel > skill.levels.length) return false

  const targetInstance = skill.levels[targetLevel - 1]
  if (!targetInstance) return false

  const prereq = targetInstance.learn_condition.prerequisite
  if (prereq) {
    const prereqSkill = findSkillByName(prereq.skill_name)
    if (!prereqSkill) return false
    const prereqCurrentLevel = getLevel(prereqSkill.skill_group_id)
    if (prereqCurrentLevel < prereq.required_skill_level) return false
  }

  return true
}

const canUnlearnLevel = (skillGroupId, targetLevel) => {
  if (targetLevel < 0) return false
  const skill = findSkillById(skillGroupId)
  if (!skill || targetLevel >= skill.levels.length) return false

  for (const tree of allSkillTrees.value) {
    for (const otherSkill of tree.skills) {
      if (otherSkill.skill_group_id === skillGroupId) continue
      const otherLevel = getLevel(otherSkill.skill_group_id)
      if (otherLevel > 0) {
        const otherInstance = otherSkill.levels[otherLevel - 1]
        const prereq = otherInstance.learn_condition.prerequisite
        if (prereq && prereq.skill_name === skill.name) {
          if (targetLevel < prereq.required_skill_level) return false
        }
      }
    }
  }

  return true
}

// 遞迴收集因為降級而受影響的所有後續技能及其需降低到的安全等級
const collectUnlearnPlan = (skillGroupId, targetLevel, plan) => {
  plan[skillGroupId] = targetLevel
  const skill = findSkillById(skillGroupId)
  if (!skill) return

  for (const tree of allSkillTrees.value) {
    for (const otherSkill of tree.skills) {
      if (otherSkill.skill_group_id === skillGroupId) continue
      
      const otherCurrLvl = plan[otherSkill.skill_group_id] !== undefined 
        ? plan[otherSkill.skill_group_id] 
        : getLevel(otherSkill.skill_group_id)
        
      if (otherCurrLvl > 0) {
        let safeLvl = otherCurrLvl
        while (safeLvl > 0) {
          const levelData = otherSkill.levels[safeLvl - 1]
          if (!levelData) {
            safeLvl--
            continue
          }
          const prereq = levelData.learn_condition.prerequisite
          
          if (prereq && prereq.skill_name === skill.name) {
            if (prereq.required_skill_level > targetLevel) {
              safeLvl--
              continue
            }
          }
          break
        }
        
        if (safeLvl < otherCurrLvl) {
          collectUnlearnPlan(otherSkill.skill_group_id, safeLvl, plan)
        }
      }
    }
  }
}

const collectPrereqUpgrades = (skillGroupId, targetLevel, plan) => {
  const currentLvl = getLevel(skillGroupId)
  if (targetLevel <= currentLvl) return
  const skill = findSkillById(skillGroupId)
  if (!skill) return

  for (let lv = currentLvl + 1; lv <= targetLevel; lv++) {
    const levelData = skill.levels[lv - 1]
    const prereq = levelData.learn_condition.prerequisite
    if (prereq) {
      const prereqSkill = findSkillByName(prereq.skill_name)
      if (prereqSkill) {
        collectPrereqUpgrades(prereqSkill.skill_group_id, prereq.required_skill_level, plan)
      }
    }
  }

  if (!plan[skillGroupId] || plan[skillGroupId] < targetLevel) {
    plan[skillGroupId] = targetLevel
  }
}

const upgradeWithPrereqs = (skillGroupId, targetLevel) => {
  const currentLvl = getLevel(skillGroupId)
  if (targetLevel <= currentLvl) return

  const plan = {}
  collectPrereqUpgrades(skillGroupId, targetLevel, plan)

  const prereqsNeeded = []
  Object.keys(plan).forEach(id => {
    if (id !== skillGroupId) {
      const curr = getLevel(id)
      const target = plan[id]
      if (curr < target) {
        const skill = findSkillById(id)
        prereqsNeeded.push(`${skill.name} (需達 Lv ${target}，當前 Lv ${curr})`)
      }
    }
  })

  if (prereqsNeeded.length > 0) {
    const msg = `升級此技能需要滿足前置條件。是否自動學習以下前置技能？\n\n` + 
                prereqsNeeded.map(s => `‧ ${s}`).join('\n')
    
    if (confirm(msg)) {
      Object.keys(plan).forEach(id => {
        state.value.allocations[id] = plan[id]
      })
    }
  } else {
    state.value.allocations[skillGroupId] = targetLevel
  }
}

const adjustLevel = (skillGroupId, delta) => {
  selectSkill(skillGroupId) // 當點選技能 +/- 時，自動選中並關注該技能以顯示詳細資訊
  const currentLvl = getLevel(skillGroupId)
  const targetLvl = currentLvl + delta
  
  if (delta > 0) {
    upgradeWithPrereqs(skillGroupId, targetLvl)
  } else if (delta < 0) {
    // 收集退點計畫
    const plan = {}
    collectUnlearnPlan(skillGroupId, targetLvl, plan)
    
    // 篩選出需要連帶降低點數的後續技能
    const affectedSkills = []
    Object.keys(plan).forEach(id => {
      if (id !== skillGroupId) {
        const curr = getLevel(id)
        const target = plan[id]
        if (curr > target) {
          const skill = findSkillById(id)
          if (skill) {
            affectedSkills.push(`${skill.name} (當前 Lv ${curr} → 需降至 Lv ${target === 0 ? '未習得' : target})`)
          }
        }
      }
    })
    
    // 若有後續相依技能受影響，彈出 confirm 詢問
    if (affectedSkills.length > 0) {
      const msg = `減少此技能配點將會導致後續依賴技能無法習得，是否同步取消這些技能的學習？\n\n` + 
                  affectedSkills.map(s => `‧ ${s}`).join('\n')
      
      if (confirm(msg)) {
        Object.keys(plan).forEach(id => {
          state.value.allocations[id] = plan[id]
        })
      }
    } else {
      // 無連帶影響，直接降低等級
      state.value.allocations[skillGroupId] = targetLvl
    }
  }
}

// ── 右欄與 Footer 統計 Computeds ──
const prerequisiteInfo = computed(() => {
  if (!selectedSkill.value) return null
  const prereq = selectedSkill.value.levels[0].learn_condition.prerequisite
  if (!prereq) return null

  const prereqSkill = findSkillByName(prereq.skill_name)
  const currentLvl = prereqSkill ? getLevel(prereqSkill.skill_group_id) : 0
  const isSatisfied = currentLvl >= prereq.required_skill_level

  return {
    name: prereq.skill_name,
    requiredLevel: prereq.required_skill_level,
    currentLevel: currentLvl,
    isSatisfied
  }
})

const formattedStats = computed(() => {
  if (!selectedSkill.value) return []
  const lvl = currentSkillLevel.value
  const displayLvl = lvl > 0 ? lvl : 1
  const levelData = selectedSkill.value.levels[displayLvl - 1]
  if (!levelData) return []

  const stats = []
  const baseStats = levelData.base_stats || {}

  const labelMap = {
    hp_change: '傷害',
    target_count: '目標數',
    range: '射程',
    angle: '攻擊角度',
    duration: '持續時間',
    cast_time: '冷卻時間',
    delay_time: '冷卻時間',
    evasion_rate_change: '迴避率變化',
    accuracy_rate_change: '命中率變化',
    attack_change: '攻擊力變化',
    attack_value_change: '攻擊值變化',
    attack_rate_change: '攻擊率變化',
    defense_rate_change: '防禦率變化',
    defense_value_change: '防禦值變化',
    combat_value: '格鬥值變化',
    spirit_value: '氣力值變化',
    hp_rate_change: 'HP 變化率',
    hp_increase_rate: 'HP上限增加率',
    mp_rate_change: 'MP 變化率',
    sp_rate: 'SP 變化率',
    hp_mp_sp_rate: 'HP/MP/SP變化率',
    magic_value: '魔力值變化',
    shoot_value: '射擊值變化',
    critical_rate: '爆擊率變化',
    detox_value: '解毒效果值',
    continuous_hit_value: '持續打擊間隔'
  }

  Object.keys(baseStats).forEach(key => {
    if (labelMap[key] !== undefined) {
      const val = baseStats[key]
      let displayVal = ''
      
      if (typeof val === 'string' && val.includes('%')) {
        displayVal = val
      } else if (key === 'hp_change') {
        displayVal = val < 0 ? `-${Math.abs(val)}` : `+${val}`
      } else if (['duration', 'cast_time', 'delay_time', 'continuous_hit_value'].includes(key)) {
        displayVal = `${val.toFixed(1)} 秒`
      } else if (['evasion_rate_change', 'critical_rate'].includes(key)) {
        displayVal = `${val > 0 ? '+' : ''}${val}%`
      } else {
        displayVal = val.toString()
      }

      stats.push({ key, label: labelMap[key], value: displayVal, rawVal: val })
    }
  })

  if (selectedSkill.value.type !== '被動' && levelData.cost) {
    stats.push({ key: 'mp', label: 'MP 消耗', value: levelData.cost.mp.toString() })
    stats.push({ key: 'sp', label: 'SP 消耗', value: levelData.cost.sp.toString() })
  }

  return stats
})

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
      const probStr = eff.probability !== undefined ? ` 發動率 ${eff.probability * 100}%` : ''
      text = `移動速度 ${eff.speed_rate > 0 ? '+' : ''}${eff.speed_rate * 100}%${probStr}`
      icon = '🏃'
    } else if (eff.effect_type === '中毒') {
      text = `中毒 ${eff.probability * 100}% 傷害 ${eff.continuous_hit}/tick`
      icon = '🤢'
    } else if (eff.effect_type === '燃燒') {
      text = `燃燒 ${eff.probability * 100}% 傷害 ${eff.continuous_hit}/tick`
      icon = '🔥'
    } else if (eff.effect_type === '攻擊速度') {
      const probStr = eff.probability !== undefined ? ` 發動率 ${eff.probability * 100}%` : ''
      const speedStr = eff.speed_rate !== undefined ? ` 減速 ${eff.speed_rate * 100}%` : ''
      text = `攻擊速度 ${eff.attack_speed_rate}${probStr}${speedStr}`
      icon = '⚔️'
    } else if (eff.effect_type === '冰凍') {
      text = `冰凍 ${eff.probability * 100}% 減速 ${eff.freeze_speed_rate} 傷害加成 ${eff.hit_bonus_rate}`
      icon = '❄️'
    } else if (eff.effect_type === '昏厥') {
      text = `昏厥 ${eff.probability * 100}%`
      icon = '💫'
    } else if (eff.effect_type === '貫穿程度') {
      text = `貫穿 ${eff.penetrate_value} 目標`
      icon = '🏹'
    }

    return { text, icon }
  })
})

// ── 各技能樹個別統計與總計計算 ──
const tree1Cost = computed(() => calculateCostForTree(tabTreeIds.value[0]))
const tree2Cost = computed(() => calculateCostForTree(tabTreeIds.value[1]))
const tree3Cost = computed(() => calculateCostForTree(tabTreeIds.value[2]))
const comTreeCost = computed(() => calculateCostForTree(tabTreeIds.value[3]))

const calculateCostForTree = (treeId) => {
  const tree = allSkillTrees.value.find(t => t.id === treeId)
  if (!tree) return { statPoints: 0, skillPoints: 0, statType: '無' }

  let totalStatPoints = 0
  let totalSkillPoints = 0

  tree.skills.forEach(s => {
    const lvl = getLevel(s.skill_group_id)
    if (lvl > 0) {
      const statReq = s.levels[lvl - 1].learn_condition.stat_required || 0
      if (statReq > totalStatPoints) {
        totalStatPoints = statReq
      }
      for (let i = 0; i < lvl; i++) {
        totalSkillPoints += s.levels[i].learn_condition.point_required || 0
      }
    }
  })

  return {
    statPoints: totalStatPoints,
    skillPoints: totalSkillPoints,
    statType: tree.require_stat_type || '共通'
  }
}

const totalStatsSummary = computed(() => {
  const stats = { '敏捷': 0, '力量': 0, '精神': 0 }
  let skillPoints = 0
  
  tabTreeIds.value.forEach(treeId => {
    const cost = calculateCostForTree(treeId)
    skillPoints += cost.skillPoints
    
    if (cost.statType in stats) {
      if (cost.statPoints > stats[cost.statType]) {
        stats[cost.statType] = cost.statPoints
      }
    }
  })
  
  return {
    agi: stats['敏捷'],
    str: stats['力量'],
    spi: stats['精神'],
    skillPoints
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
  width: 1300px; /* 拓寬至 1300px */
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
  font-size: 2rem;
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

/* 頂部控制項整合區 */
.header-controls-area {
  display: flex;
  align-items: center;
  gap: 20px;
}

/* 配點重置按鈕 */
.btn-reset {
  background: rgba(255, 0, 85, 0.1);
  border: 1px solid rgba(255, 0, 85, 0.35);
  color: #ff0055;
  border-radius: 6px;
  padding: 6px 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: bold;
  transition: all 0.25s ease;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
}

.btn-reset:hover {
  background: rgba(255, 0, 85, 0.22);
  border-color: #ff0055;
  box-shadow: 0 0 10px rgba(255, 0, 85, 0.25);
  transform: translateY(-1px);
}

.btn-reset:active {
  transform: translateY(0);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 1rem;
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
  font-size: 0.9rem;
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
  width: 1300px; /* 拓寬至 1300px */
  max-width: 100%;
  height: 75vh;
  min-height: 700px;
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
  width: 450px; /* 拓寬至 450px，確保奧義模式長名稱選單完全展示 */
  border-right: 1px solid rgba(255, 119, 0, 0.12);
  display: flex;
  flex-direction: column;
  background: rgba(8, 10, 16, 0.4);
}

/* 職業選擇器 */
.job-selector-container {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 15px 12px 10px;
  border-bottom: 1px solid rgba(255, 119, 0, 0.12);
  background: rgba(255, 119, 0, 0.02);
}

.job-label {
  color: var(--text-muted);
  font-weight: 600;
  flex-shrink: 0;
}

.job-select {
  flex: 1;
  height: 42px;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 119, 0, 0.25);
  color: #fff;
  border-radius: 6px;
  padding: 0 10px;
  outline: none;
  cursor: pointer;
  font-weight: bold;
  font-size: 1rem;
  transition: all 0.25s ease;
  box-shadow: inset 0 0 6px rgba(0,0,0,0.5);
}

.job-select:hover {
  border-color: var(--color-defender);
  box-shadow: 0 0 8px rgba(255, 119, 0, 0.25);
}

.job-select option {
  background: #0a0e17;
  color: var(--text-main);
}

/* 分頁選單整合容器 */
.tabs-header-container {
  display: flex;
  align-items: center;
  border-bottom: 1px solid rgba(255, 119, 0, 0.12);
  width: 100%;
}

/* 奧義下拉選單鎖定按鈕 */
.lock-btn {
  width: 48px;
  height: 52px;
  background: rgba(0, 0, 0, 0.4);
  border: none;
  border-right: 1px solid rgba(255, 119, 0, 0.12);
  font-size: 1.1rem;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: all 0.3s ease;
  outline: none;
}

.lock-btn:hover {
  background: rgba(255, 119, 0, 0.05);
}

.lock-btn.is-locked {
  color: var(--color-defender);
  text-shadow: 0 0 8px rgba(255, 119, 0, 0.5);
  background: rgba(255, 119, 0, 0.03);
}

.tabs-header {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
}

.tab-btn-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  border-bottom: 2px solid transparent;
  transition: all 0.3s ease;
  overflow: hidden;
}

.tab-btn-wrapper:hover {
  background: rgba(255, 119, 0, 0.02);
}

.tab-btn-wrapper.active-tab {
  background: rgba(255, 119, 0, 0.04);
  border-bottom-color: var(--color-defender);
}

.tab-btn-wrapper.active-tab .tab-btn {
  color: var(--color-defender);
  text-shadow: 0 0 8px rgba(255, 119, 0, 0.25);
}

.tab-btn-wrapper.active-tab .tab-tree-select {
  color: var(--color-defender);
  border-color: rgba(255, 119, 0, 0.3);
  text-shadow: 0 0 8px rgba(255, 119, 0, 0.25);
}

.tab-btn {
  width: 100%;
  height: 52px;
  padding: 10px 4px;
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 600;
  text-align: center;
  white-space: normal;
  word-break: break-all;
  line-height: 1.25;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: color 0.3s ease;
}

/* 奧義下拉分頁選單 */
.tab-tree-select {
  width: 95%;
  height: 46px;
  background: rgba(0, 0, 0, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--text-muted);
  font-family: inherit;
  font-size: 0.9rem;
  font-weight: 600;
  border-radius: 4px;
  padding: 0 4px;
  cursor: pointer;
  outline: none;
  transition: all 0.3s ease;
  text-align-last: center;
}

.tab-tree-select:hover {
  border-color: var(--color-defender);
}

.tab-tree-select option {
  background: #0a0e17;
  color: var(--text-main);
}

.tab-tree-select option:disabled {
  color: rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.02);
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

.skill-row {
  display: flex;
  align-items: center;
  padding: 14px 12px;
  background: rgba(30, 30, 40, 0.6);
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

.skill-row.is-selected {
  border-color: rgba(255, 255, 255, 0.25);
  background: rgba(35, 35, 45, 0.7);
  opacity: 1;
}

.skill-row.is-learned {
  border-color: var(--color-defender);
  background: rgba(255, 119, 0, 0.08);
  box-shadow: 0 0 12px rgba(255, 119, 0, 0.15);
  opacity: 1;
}

.skill-row.is-learned.is-selected {
  border-color: var(--color-defender);
  background: rgba(255, 119, 0, 0.18);
  box-shadow: 0 0 18px rgba(255, 119, 0, 0.3);
  opacity: 1;
}

/* 類型 Badge */
.type-badge {
  font-size: 0.75rem;
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

.skill-name {
  flex: 1;
  color: rgba(255, 255, 255, 0.4);
  font-weight: 500;
  white-space: normal;
  word-break: break-word;
  line-height: 1.3;
  margin-right: 8px;
  font-size: 1.05rem;
  transition: color 0.3s ease;
}

.skill-row.is-selected .skill-name {
  color: rgba(255, 255, 255, 0.7);
}

.skill-row.is-learned .skill-name {
  color: #fff;
  text-shadow: 0 0 5px rgba(255, 119, 0, 0.2);
}

/* 等級控制器 */
.level-control {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.btn-lvl {
  width: 30px;
  height: 30px;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.03);
  color: var(--text-main);
  font-size: 1.05rem;
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
  width: 42px;
  text-align: center;
  font-weight: bold;
  font-size: 1.05rem;
  color: var(--color-defender);
  transition: all 0.25s ease;
}

.level-num.is-max {
  color: #ff0055;
  text-shadow: 0 0 8px rgba(255, 0, 85, 0.4);
}

/* ── 右欄面板 ── */
.right-panel {
  flex: 1;
  padding: 40px;
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

.empty-detail-state {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
}

.detail-icon {
  font-size: 4rem;
  opacity: 0.15;
  margin-bottom: 20px;
  animation: float-detail 4s ease-in-out infinite;
}

@keyframes float-detail {
  0% { transform: translateY(0px); }
  50% { transform: translateY(-8px); }
  100% { transform: translateY(0px); }
}

.detail-text {
  font-family: inherit;
  font-size: 1.6rem;
  font-weight: 700;
  color: var(--text-main);
  margin-bottom: 12px;
}

.detail-sub {
  max-width: 360px;
  line-height: 1.6;
}

.detail-container {
  display: flex;
  flex-direction: column;
  gap: 25px;
}

/* A — 標題區 */
.section-title-area {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 15px;
  border-bottom: 1.5px solid rgba(255, 119, 0, 0.12);
}

.title-left {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 15px;
}

.skill-detail-name {
  font-family: inherit;
  font-size: 1.8rem;
  font-weight: 700;
  color: #fff;
  margin: 0;
  letter-spacing: 1px;
}

.unlock-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 8px;
}

.unlock-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.95rem;
  color: var(--text-muted);
}

.unlock-item strong {
  color: var(--color-defender); /* 數值高亮主題橘 */
}

.unlock-icon {
  font-size: 1rem;
}

.title-right {
  display: flex;
  align-items: center;
}

.level-pill {
  font-size: 1.15rem;
  font-weight: bold;
  background: rgba(200, 0, 255, 0.12);
  border: 1px solid rgba(200, 0, 255, 0.4);
  color: #d845ff;
  box-shadow: 0 0 10px rgba(200, 0, 255, 0.15);
  border-radius: 6px;
  padding: 8px 18px;
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
  padding: 16px 20px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  display: flex;
  align-items: center;
  font-size: 1rem;
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
  padding: 16px 20px;
  line-height: 1.8;
  color: var(--text-muted);
  font-size: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.02);
}

/* E — 數值屬性 */
.section-metrics {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.metrics-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.metric-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 20px;
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
  font-size: 1rem;
}

.metric-value {
  font-weight: bold;
  color: var(--color-defender);
  font-size: 1.15rem;
  text-shadow: 0 0 6px rgba(255, 119, 0, 0.2);
}

.text-green {
  color: #00ff66 !important;
  text-shadow: 0 0 6px rgba(0, 255, 102, 0.2) !important;
}

.metric-tips {
  font-size: 0.9rem;
}

/* F — 特殊效果 */
.section-effects {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.effects-title {
  font-weight: bold;
  margin: 0;
  color: var(--text-main);
  font-size: 1.05rem;
}

.effects-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.effect-pill {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 6px;
  background: rgba(255, 150, 0, 0.08);
  border: 1px solid rgba(255, 150, 0, 0.25);
  color: #ffa600;
  font-weight: 500;
  box-shadow: 0 0 8px rgba(255, 150, 0, 0.05);
}

.effect-icon {
  font-size: 1.1rem;
}

/* ── 統計 Footer (條列式呈現) ── */
.simulator-footer {
  width: 1300px; /* 拓寬至 1300px */
  max-width: 100%;
  margin-top: 25px;
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
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px;
  letter-spacing: 1px;
}

/* 手機版展開按鈕樣式 */
.mobile-expand-toggle {
  display: flex;
  justify-content: center;
  margin-top: 10px;
  width: 100%;
}

.btn-expand {
  width: 100%;
  padding: 8px 16px;
  background: rgba(255, 119, 0, 0.04);
  border: 1px solid var(--color-defender);
  color: var(--color-defender);
  border-radius: 6px;
  cursor: pointer;
  font-weight: bold;
  letter-spacing: 1px;
  transition: all 0.25s ease;
  text-shadow: 0 0 5px rgba(255, 119, 0, 0.3);
  box-shadow: 0 0 8px rgba(255, 119, 0, 0.05);
}

.btn-expand:hover, .btn-expand:active {
  background: var(--color-defender);
  color: #000;
  text-shadow: none;
  box-shadow: 0 0 12px var(--color-defender);
}

.collapsible-details {
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
}

/* 響應式排版 */
@media (max-width: 768px) {
  .simulator-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
    padding: 0 10px;
  }

  .header-title-area {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }

  .neon-text-defender {
    font-size: 1.5rem;
  }

  .version-badge {
    font-size: 0.72rem;
  }

  .ultimate-mode-container {
    width: auto;
  }

  .header-controls-area {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
  }

  .tooltip-bubble {
    right: auto;
    left: 0;
  }

  .tooltip-bubble::after {
    right: auto;
    left: 25px;
  }

  .simulator-body {
    flex-direction: column;
    height: auto;
    min-height: auto;
  }

  .left-panel {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid rgba(255, 119, 0, 0.12);
    max-height: 380px; /* 手機版略微拉高以容納職業選單與 Tab */
  }

  .right-panel {
    height: auto;
    padding: 20px;
  }

  .tabs-header {
    grid-template-columns: repeat(4, 1fr);
  }

  .footer-summary {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .total-val {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }

  .total-divider {
    display: none;
  }
}
</style>
