<template>
  <div class="simulator-page">
    <!-- 背景特效 -->
    <div class="bg-grid"></div>
    <div class="bg-radial"></div>

    <!-- 頂部標題與奧義模式切換 -->
    <div class="simulator-header">
      <div class="header-title-area">
        <h2 class="neon-text-defender">🛡️ 配點模擬</h2>
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

        <!-- 我的技能庫按鈕 -->
        <div class="build-library-btn-wrapper" style="align-items: center; gap: 8px;">
          <button 
            class="btn-library font-small" 
            :class="{ 'is-disabled': !isLoggedIn }"
            :disabled="!isLoggedIn"
            @click="showBuildLibrary = true"
          >
            📦 我的技能庫
          </button>
          <span v-if="isLoggedIn" class="cloud-sync-badge font-small" :class="syncStatus">
            {{ syncStatus === 'saving' ? '☁️ 保存中...' : '☁️ 已同步' }}
          </span>
          <span v-if="!isLoggedIn" class="disabled-tooltip">登入後可使用此功能</span>
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
          <LoadingOverlay v-if="loading" theme="defender" message="拉拉拉~~~" />
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
              <!-- 技能 Icon -->
              <img 
                v-if="skill.icon"
                :src="getSkillIconUrl(skill.icon)"
                :alt="skill.name"
                class="skill-icon"
                loading="lazy"
              />
              <span v-else class="skill-icon-placeholder">❓</span>

              <!-- 類型 Badge -->
              <span class="type-badge" :class="skill.type === '主動' ? 'badge-active' : 'badge-passive'">
                {{ skill.type }}
              </span>

              <!-- 元素屬性 Badge -->
              <span 
                v-if="skill.element_property && elementMeta[skill.element_property]" 
                class="element-badge" 
                :class="elementMeta[skill.element_property].class"
              >
                {{ elementMeta[skill.element_property].icon }}{{ elementMeta[skill.element_property].text }}
              </span>

              <!-- 技能名稱 + 等級 -->
              <span class="skill-name font-small">
                {{ skill.name }}<span v-if="getLevel(skill.skill_group_id) > 0" class="skill-inline-lv">Lv.{{ getLevel(skill.skill_group_id) }}</span>
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
                <img 
                  v-if="selectedSkill.icon"
                  :src="getSkillIconUrl(selectedSkill.icon)"
                  :alt="selectedSkill.name"
                  class="detail-skill-icon"
                />
                <h3 class="skill-detail-name">{{ selectedSkill.name }}</h3>
              </div>
              <!-- 招式操作按鈕區 -->
              <div class="detail-actions-row">
                <button 
                  v-if="selectedSkill.type === '主動'"
                  class="btn-animation ran2-attack-cursor"
                  @click="handleAnimationClick"
                >
                  ⚔️ 發動招式
                </button>
                <button 
                  class="btn-prereq-path"
                  @click="openParentSkillsModal"
                >
                  🌳 技能路徑
                </button>
                <span class="type-badge" :class="selectedSkill.type === '主動' ? 'badge-active' : 'badge-passive'">
                  {{ selectedSkill.type }}
                </span>
                <!-- 元素屬性 Badge -->
                <span 
                  v-if="selectedSkill.element_property && elementMeta[selectedSkill.element_property]" 
                  class="element-badge detail-element-badge" 
                  :class="elementMeta[selectedSkill.element_property].class"
                >
                  {{ elementMeta[selectedSkill.element_property].icon }} {{ elementMeta[selectedSkill.element_property].text }}
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
                  <span>能力屬性要求：<strong class="text-defender">{{ displayStatType }} {{ curStatRequired }} ({{ isSkillMaxed ? '已滿級' : '下一級 ' + displayStatType + ' ' + nextStatRequiredVal }})</strong></span>
                </div>
              </div>
            </div>
            <div class="title-right">
              <span class="level-pill" :class="{ 'level-unlearned': currentSkillLevel === 0, 'level-max': currentSkillLevel === selectedSkill.levels.length }">
                {{ currentSkillLevel > 0 ? (currentSkillLevel === selectedSkill.levels.length ? 'MAX' : `Lv ${currentSkillLevel}`) : '未習得' }}
              </span>
            </div>
          </div>

          <!-- 招式動畫浮動框 -->
          <Teleport to="body">
            <transition name="anim-popup">
              <div 
                v-if="showAnimationPopup && selectedSkill.animation" 
                class="animation-popup-overlay"
                @click.self="showAnimationPopup = false"
              >
                <div class="animation-popup-card">
                  <div class="animation-popup-header">
                    <span class="animation-popup-title">{{ selectedSkill.name }} — 招式預覽</span>
                    <button class="animation-popup-close" @click="showAnimationPopup = false">✕</button>
                  </div>
                  <div class="animation-popup-body">
                    <img 
                      :src="getSkillAnimationUrl(selectedSkill.animation)"
                      :alt="selectedSkill.name + ' 招式動畫'"
                      class="animation-img"
                    />
                  </div>
                </div>
              </div>
            </transition>
          </Teleport>

          <!-- 缺少動畫提示 Toast -->
          <Teleport to="body">
            <transition name="tooltip-fade">
              <div v-if="showMissingToast" class="missing-animation-toast">
                <span class="missing-toast-icon">😢</span>
                <span>這個招式缺少技能動畫</span>
              </div>
            </transition>
          </Teleport>

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
            {{ getTreeName(tabTreeIds[0]) }}能力點需求：{{ tree1Cost.statType }} <strong class="text-defender">{{ tree1Cost.statPoints }}</strong> 點 ／ 技能點消耗：<strong class="text-defender">{{ tree1Cost.skillPoints }}</strong> 點 ／ 最大等級需求：<strong class="text-defender">Lv.{{ tree1Cost.maxCharLevel }}</strong>
          </span>
        </div>
        <!-- 技能樹 2 -->
        <div class="footer-item font-small">
          <span class="item-dot">✦</span>
          <span class="item-content">
            {{ getTreeName(tabTreeIds[1]) }}能力點需求：{{ tree2Cost.statType }} <strong class="text-defender">{{ tree2Cost.statPoints }}</strong> 點 ／ 技能點消耗：<strong class="text-defender">{{ tree2Cost.skillPoints }}</strong> 點 ／ 最大等級需求：<strong class="text-defender">Lv.{{ tree2Cost.maxCharLevel }}</strong>
          </span>
        </div>
        <!-- 技能樹 3 -->
        <div class="footer-item font-small">
          <span class="item-dot">✦</span>
          <span class="item-content">
            {{ getTreeName(tabTreeIds[2]) }}能力點需求：{{ tree3Cost.statType }} <strong class="text-defender">{{ tree3Cost.statPoints }}</strong> 點 ／ 技能點消耗：<strong class="text-defender">{{ tree3Cost.skillPoints }}</strong> 點 ／ 最大等級需求：<strong class="text-defender">Lv.{{ tree3Cost.maxCharLevel }}</strong>
          </span>
        </div>
        <!-- 共通 -->
        <div class="footer-item font-small">
          <span class="item-dot">✦</span>
          <span class="item-content">
            {{ getTreeName(tabTreeIds[3]) }}技能點消耗：<strong class="text-defender">{{ comTreeCost.skillPoints }}</strong> 點 ／ 最大等級需求：<strong class="text-defender">Lv.{{ comTreeCost.maxCharLevel }}</strong>
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

      <!-- 已學技能清單 -->
      <div v-if="learnedSkillsSummary.length > 0" class="footer-learned">
        <div class="footer-divider"></div>
        <h4 class="learned-title font-small">已學技能一覽</h4>
        <div class="learned-tree-groups">
          <div v-for="group in learnedSkillsSummary" :key="group.treeId" class="learned-tree-group">
            <div class="learned-tree-group-title font-small">{{ group.treeName }}</div>
            <div class="learned-list">
              <div 
                v-for="skill in group.skills" 
                :key="skill.id" 
                class="learned-pill"
                :class="{ 
                  ['clash-' + skill.effect_group]: skill.effect_group && clashingEffectGroups.has(skill.effect_group)
                }"
                :title="skill.effect_group && clashingEffectGroups.has(skill.effect_group) ? '發現有不可疊加的增益效果' : null"
              >
                <span v-if="skill.effect_group && clashingEffectGroups.has(skill.effect_group)" class="clash-warning-dot">!</span>
                <img v-if="skill.icon" :src="getSkillIconUrl(skill.icon)" class="learned-icon" />
                <span class="learned-name">{{ skill.name }}</span>
                <span class="learned-lv">Lv.{{ skill.level }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 操作按鈕區 -->
      <div class="footer-divider"></div>
      <div class="footer-actions">
        <button class="btn-share font-small" @click="copyShareUrl">
          🔗 分享配點
        </button>
        <div class="build-library-btn-wrapper">
          <button 
            class="btn-save-library font-small" 
            :class="{ 'is-disabled': !isLoggedIn }"
            :disabled="!isLoggedIn"
            @click="promptSaveToBuildLibrary"
          >
            📦 加入我的技能庫
          </button>
          <span v-if="!isLoggedIn" class="disabled-tooltip">登入後可使用此功能</span>
        </div>
      </div>
    </div>

    <!-- 複製成功 Toast -->
    <Teleport to="body">
      <transition name="tooltip-fade">
        <div v-if="showCopyToast" class="missing-animation-toast">
          <span class="missing-toast-icon">✅</span>
          <span>分享連結已複製到剪貼簿！</span>
        </div>
      </transition>
    </Teleport>

    <!-- 分享連結小面板 Modal -->
    <Teleport to="body">
      <transition name="anim-popup">
        <div v-if="showShareLinkModal" class="animation-popup-overlay" @click.self="showShareLinkModal = false">
          <div class="build-library-modal share-link-modal">
            <div class="animation-popup-header">
              <span class="animation-popup-title">🔗 產生分享連結</span>
              <button class="animation-popup-close" @click="showShareLinkModal = false">✕</button>
            </div>
            <div class="build-library-body" style="padding: 20px;">
              <p class="font-small text-muted" style="margin-bottom: 12px; line-height: 1.4;">您可以複製下方連結分享這組配點給其他人：</p>
              <div class="share-link-input-wrapper">
                <input 
                  type="text" 
                  readonly 
                  :value="generatedShareUrl" 
                  class="share-link-input"
                  @click="$event.target.select()"
                />
                <button class="btn-copy-link font-small" @click="handleManualCopy">複製</button>
              </div>
              <div class="share-link-footer" style="margin-top: 20px; display: flex; justify-content: flex-end;">
                <button class="btn-close-link font-small" @click="showShareLinkModal = false">關閉</button>
              </div>
            </div>
          </div>
        </div>
      </transition>
    </Teleport>

    <!-- 技能前置關係 Modal -->
    <Teleport to="body">
      <transition name="anim-popup">
        <div v-if="showParentSkillsModal && selectedSkill" class="animation-popup-overlay" @click.self="showParentSkillsModal = false">
          <div class="build-library-modal prereq-path-modal">
            <div class="animation-popup-header">
              <span class="animation-popup-title">🌳 技能學習路徑 ({{ selectedSkill.name }})</span>
              <button class="animation-popup-close" @click="showParentSkillsModal = false">✕</button>
            </div>
            <div class="build-library-body" style="padding: 20px;">
              <div v-if="parentSkillsChain.length === 0" class="prereq-empty">
                <p>此技能無任何前置技能要求</p>
                <p class="text-muted font-small">您可以直接花費技能點數與滿足能力值要求來學習此技能。</p>
              </div>
              <div v-else class="prereq-chain">
                <!-- 遞迴顯示前置節點 -->
                <div v-for="node in parentSkillsChain" :key="node.name" class="prereq-node-container">
                  <div 
                    class="prereq-node"
                    :class="node.isSatisfied ? 'is-satisfied' : 'is-not-satisfied'"
                  >
                    <img v-if="node.icon" :src="getSkillIconUrl(node.icon)" class="prereq-node-icon" />
                    <span v-else class="prereq-node-icon-placeholder">❓</span>
                    <div class="prereq-node-info">
                      <div class="prereq-node-name font-small">{{ node.name }}</div>
                      <div class="prereq-node-level font-small">
                        解鎖需求: <strong class="text-defender">Lv.{{ node.requiredLevel }}</strong>
                        <span class="prereq-node-slash"> / </span>
                        目前等級: <strong class="text-defender">Lv.{{ node.currentLevel }}</strong>
                      </div>
                    </div>
                    <div class="prereq-status-badge font-small">
                      {{ node.isSatisfied ? '✓ 已滿足' : '❌ 未滿足' }}
                    </div>
                  </div>
                  <div class="prereq-arrow">↓</div>
                </div>
                
                <!-- 當前招式節點 -->
                <div class="prereq-node-container current-node">
                  <div class="prereq-node is-current">
                    <img v-if="selectedSkill.icon" :src="getSkillIconUrl(selectedSkill.icon)" class="prereq-node-icon" />
                    <span v-else class="prereq-node-icon-placeholder">❓</span>
                    <div class="prereq-node-info">
                      <div class="prereq-node-name font-small">{{ selectedSkill.name }} (當前招式)</div>
                      <div class="prereq-node-level font-small">
                        目前等級: <strong class="text-defender">Lv.{{ getLevel(selectedSkill.skill_group_id) }}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </transition>
    </Teleport>

    <!-- 技能庫 Modal -->
    <Teleport to="body">
      <transition name="anim-popup">
        <div v-if="showBuildLibrary" class="animation-popup-overlay" @click.self="showBuildLibrary = false">
          <div class="build-library-modal">
            <div class="animation-popup-header">
              <span class="animation-popup-title">📦 我的技能庫</span>
              <button class="animation-popup-close" @click="showBuildLibrary = false">✕</button>
            </div>
            <div class="build-library-body">
              <div v-if="savedBuilds.length === 0" class="library-empty">
                <p>尚未儲存任何配置</p>
                <p class="text-muted font-small">在配點模擬器中完成配點後，點擊「加入我的技能庫」即可儲存。</p>
              </div>
              <div v-else class="library-list">
                <div v-for="build in savedBuilds" :key="build.id" class="library-item">
                  <div class="library-item-info">
                    <span class="library-item-name">{{ build.name }}</span>
                    <span class="library-item-meta font-small text-muted">{{ build.job }}{{ build.isUltimate ? '（奧義）' : '' }}</span>
                  </div>
                  <div class="library-item-actions">
                    <button class="btn-lib-action" @click="loadBuild(build)" title="載入">▶</button>
                    <button class="btn-lib-action" @click="renameBuild(build.id)" title="重新命名">✏️</button>
                    <button class="btn-lib-action" @click="shareBuildFromLibrary(build)" title="分享">🔗</button>
                  </div>
              </div>
            </div>
              
              <!-- 提示非同步儲存與雲端同步狀態 -->
              <div class="library-sync-footer" style="margin-top: 20px; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255, 255, 255, 0.05); padding-top: 15px;">
                <span class="sync-footer-hint font-small" style="color: var(--text-muted); opacity: 0.8;">* 配置異動將於 5 秒內自動同步至雲端</span>
                <span class="sync-footer-status font-small" :class="syncStatus" style="font-weight: bold;">
                  {{ syncStatus === 'saving' ? '☁️ 保存中...' : '☁️ 已同步' }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </transition>
    </Teleport>

    <!-- 分享預覽 Modal -->
    <Teleport to="body">
      <transition name="anim-popup">
        <div v-if="showSharePreview && sharedBuildData" class="animation-popup-overlay" @click.self="showSharePreview = false; router.replace({ query: {} })">
          <div class="build-library-modal share-preview-modal">
            <div class="animation-popup-header">
              <span class="animation-popup-title">🔗 配點分享預覽</span>
              <button class="animation-popup-close" @click="showSharePreview = false; router.replace({ query: {} })">✕</button>
            </div>
            <div class="build-library-body">
              <div class="share-preview-info">
                <div class="share-preview-row">
                  <span class="share-preview-label">職業</span>
                  <span class="share-preview-value">{{ sharedBuildData.job }}{{ sharedBuildData.isUltimate ? '（奧義模式）' : '' }}</span>
                </div>
              </div>

              <!-- 統計資訊區 (比照總計功能 Footer) -->
              <div class="share-preview-stats" style="margin-top: 15px;">
                <div class="stats-group-title font-small">總計需要</div>
                <div class="stats-summary-box font-medium">
                  <div class="stats-summary-grid">
                    <span class="summary-grid-item">敏捷需求 <strong class="text-defender font-medium-large">{{ sharedTotalStatsSummary.agi }}</strong> 點</span>
                    <span class="summary-grid-item">力量需求 <strong class="text-defender font-medium-large">{{ sharedTotalStatsSummary.str }}</strong> 點</span>
                    <span class="summary-grid-item">精神需求 <strong class="text-defender font-medium-large">{{ sharedTotalStatsSummary.spi }}</strong> 點</span>
                    <span class="summary-grid-item">技能點總計 <strong class="text-defender font-medium-large">{{ sharedTotalStatsSummary.skillPoints }}</strong> 點</span>
                    <span class="summary-grid-item" style="grid-column: span 2;">所需最大角色等級 <strong class="text-defender font-medium-large">{{ sharedMaxCharLevelRequired }}</strong> 級</span>
                  </div>
                </div>
              </div>

              <!-- 已學技能清單 -->
              <div v-if="sharedLearnedSkillsSummary.length > 0" class="share-preview-learned">
                <div class="stats-group-title font-small" style="margin-top: 15px; margin-bottom: 8px;">已學技能一覽</div>
                <div class="scrollable-learned-list">
                  <div class="learned-tree-groups">
                    <div v-for="group in sharedLearnedSkillsSummary" :key="group.treeId" class="learned-tree-group">
                      <div class="learned-tree-group-title font-small">{{ group.treeName }}</div>
                      <div class="learned-list">
                        <div v-for="skill in group.skills" :key="skill.id" class="learned-pill">
                          <img v-if="skill.icon" :src="getSkillIconUrl(skill.icon)" class="learned-icon" />
                          <span class="learned-name">{{ skill.name }}</span>
                          <span class="learned-lv">Lv.{{ skill.level }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="footer-divider" style="margin: 20px 0 15px 0;"></div>

              <div class="share-preview-actions">
                <button class="btn-share-apply font-small" @click="applySharedBuild">
                  ▶ 套用到模擬器上
                </button>
                <div class="build-library-btn-wrapper">
                  <button 
                    class="btn-save-library font-small" 
                    :class="{ 'is-disabled': !isLoggedIn }"
                    :disabled="!isLoggedIn"
                    @click="promptSaveSharedBuild"
                  >
                    📦 加入我的技能庫
                  </button>
                  <span v-if="!isLoggedIn" class="disabled-tooltip">登入後可使用此功能</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth.js'
import { encodeBuild, decodeBuild } from '@/utils/buildCodec.js'
import { db } from '@/firebase.js'
import { doc, getDoc, getDocs, setDoc, collection } from 'firebase/firestore'
import LoadingOverlay from '@/components/LoadingOverlay.vue'

const route = useRoute()
const router = useRouter()
const { isLoggedIn, currentUser } = useAuth()

// 技能元素屬性配置
const elementMeta = {
  '冰': { icon: '❄️', text: '冰', class: 'elem-ice' },
  '火': { icon: '🔥', text: '火', class: 'elem-fire' },
  '毒': { icon: '🤢', text: '毒', class: 'elem-poison' },
  '電': { icon: '⚡', text: '電', class: 'elem-lightning' }
}

// 模擬器主要狀態
const isUltimateMode = ref(false)
const selectedJob = ref('弓箭部')
const showAnimationPopup = ref(false)
const showMissingToast = ref(false)
let missingToastTimer = null
const isDropdownLocked = ref(false) // 奧義模式下拉選單鎖定狀態
const showBuildLibrary = ref(false)
const showSharePreview = ref(false)
const sharedBuildData = ref(null)
const showCopyToast = ref(false)
let copyToastTimer = null
const showShareLinkModal = ref(false)
const generatedShareUrl = ref('')
const showParentSkillsModal = ref(false)
const parentSkillsChain = ref([])


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
    let dbLastUpdated = 0
    try {
      const metaDoc = await getDoc(doc(db, 'metadata', 'skills'))
      if (metaDoc.exists()) {
        dbLastUpdated = metaDoc.data().lastUpdated || 0
      }
    } catch (metaErr) {
      console.warn('讀取中介資料失敗，改為直接由雲端載入技能:', metaErr)
    }

    const localLastUpdated = Number(localStorage.getItem('ran2_skills_last_updated') || '0')
    const localCache = localStorage.getItem('ran2_skills_cache')

    if (localCache && localLastUpdated && localLastUpdated >= dbLastUpdated) {
      const cachedData = JSON.parse(localCache)
      allSkillTrees.value = cachedData || []
      console.log('成功從本地快取載入技能資料！更新時間：', new Date(localLastUpdated).toLocaleString())
    } else {
      // 本地無快取或雲端有更新，從 Firestore 載入整個 skills 集合
      const querySnapshot = await getDocs(collection(db, 'skills'))
      const list = []
      querySnapshot.forEach(doc => {
        list.push(doc.data())
      })
      allSkillTrees.value = list

      // 寫入本地快取
      localStorage.setItem('ran2_skills_cache', JSON.stringify(list))
      localStorage.setItem('ran2_skills_last_updated', (dbLastUpdated || Date.now()).toString())
      console.log('成功從雲端同步技能資料，並已更新本地快取！')
    }
    
    // 初始化 allocations
    allSkillTrees.value.forEach(tree => {
      tree.skills.forEach(s => {
        state.value.allocations[s.skill_group_id] = 0
      })
    })

    setDefaultSelectedSkill()
  } catch (err) {
    error.value = err.message
    console.error('載入技能資料失敗:', err)
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
  window.addEventListener('beforeunload', handleBeforeUnload)

  if (isLoggedIn.value) {
    fetchCloudBuilds()
  } else {
    refreshSavedBuilds()
  }
  
  startSyncTimer()

  // 偵測分享連結
  if (route.query.build) {
    const decoded = decodeBuild(decodeURIComponent(route.query.build))
    if (decoded) {
      sharedBuildData.value = decoded
      showSharePreview.value = true
    }
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  window.removeEventListener('beforeunload', handleBeforeUnload)
  if (syncTimer) clearInterval(syncTimer)
})

onBeforeUnmount(() => {
  syncImmediately()
})

// 監聽登入狀態以執行一次性雲端載入或登出清空
watch(isLoggedIn, (newVal) => {
  if (newVal) {
    fetchCloudBuilds()
  } else {
    savedBuilds.value = []
    hasLoadedCloudBuilds.value = false
    localStorage.setItem(BUILDS_KEY, '[]')
  }
})

// ── Icon / Animation URL 輔助 ──
const getSkillIconUrl = (iconFile) => {
  return `/assets/skills/icons/${iconFile}`
}

const getSkillAnimationUrl = (animFile) => {
  return `/assets/skills/animations/${animFile}`
}

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
  if (selectedSkill.value && selectedSkill.value.require_stat_type) {
    return selectedSkill.value.require_stat_type
  }
  return currentSkillTree.value ? currentSkillTree.value.require_stat_type : '共通'
})

const displayStatType = computed(() => {
  return statType.value.split('|').join('、')
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
  showAnimationPopup.value = false // 切換技能時關閉動畫浮框
  showMissingToast.value = false
}

// 發動招式按鈕 — 檢查動畫檔案是否存在
const handleAnimationClick = async () => {
  if (!selectedSkill.value) return
  const anim = selectedSkill.value.animation
  if (!anim) {
    triggerMissingToast()
    return
  }
  try {
    const res = await fetch(getSkillAnimationUrl(anim))
    const contentType = res.headers.get('content-type')
    if (res.ok && contentType && !contentType.includes('text/html')) {
      showAnimationPopup.value = true
    } else {
      triggerMissingToast()
    }
  } catch {
    triggerMissingToast()
  }
}

const triggerMissingToast = () => {
  showMissingToast.value = true
  if (missingToastTimer) clearTimeout(missingToastTimer)
  missingToastTimer = setTimeout(() => {
    showMissingToast.value = false
  }, 2500)
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
    continuous_hit_value: '持續打擊間隔',
    resistance_change: '抗性變化'
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
    } else if (eff.effect_type === '防止狀態異常') {
      const states = eff.immune_states || []
      text = `免疫：${states.join('、')}`
      icon = '🛡️'
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
  if (!tree) return { statPoints: 0, skillPoints: 0, statType: '無', maxCharLevel: 0 }

  let totalStatPoints = 0
  let totalSkillPoints = 0
  let maxCharLevel = 0
  const treeStatType = tree.require_stat_type || '共通'

  tree.skills.forEach(s => {
    const lvl = getLevel(s.skill_group_id)
    if (lvl > 0) {
      const sStatTypes = (s.require_stat_type || treeStatType).split('|')
      const statReq = s.levels[lvl - 1].learn_condition.stat_required || 0
      const charLvl = s.levels[lvl - 1].learn_condition.character_level || 0
      
      if (charLvl > maxCharLevel) {
        maxCharLevel = charLvl
      }
      if (sStatTypes.includes(treeStatType)) {
        if (statReq > totalStatPoints) {
          totalStatPoints = statReq
        }
      }
      for (let i = 0; i < lvl; i++) {
        totalSkillPoints += s.levels[i].learn_condition.point_required || 0
      }
    }
  })

  return {
    statPoints: totalStatPoints,
    skillPoints: totalSkillPoints,
    statType: treeStatType,
    maxCharLevel
  }
}

const totalStatsSummary = computed(() => {
  const stats = { '敏捷': 0, '力量': 0, '精神': 0 }
  let skillPoints = 0
  
  tabTreeIds.value.forEach(treeId => {
    const tree = allSkillTrees.value.find(t => t.id === treeId)
    if (!tree) return

    tree.skills.forEach(s => {
      const lvl = getLevel(s.skill_group_id)
      if (lvl > 0) {
        const sStatTypeStr = s.require_stat_type || tree.require_stat_type || '共通'
        const sStatTypes = sStatTypeStr.split('|')
        const statReq = s.levels[lvl - 1].learn_condition.stat_required || 0
        
        sStatTypes.forEach(type => {
          if (type in stats) {
            if (statReq > stats[type]) {
              stats[type] = statReq
            }
          }
        })
        for (let i = 0; i < lvl; i++) {
          skillPoints += s.levels[i].learn_condition.point_required || 0
        }
      }
    })
  })
  
  return {
    agi: stats['敏捷'],
    str: stats['力量'],
    spi: stats['精神'],
    skillPoints
  }
})

const learnedSkillsSummary = computed(() => {
  const groups = []
  tabTreeIds.value.forEach(treeId => {
    const tree = allSkillTrees.value.find(t => t.id === treeId)
    if (!tree) return
    
    const skills = []
    tree.skills.forEach(s => {
      const lvl = getLevel(s.skill_group_id)
      if (lvl > 0) {
        skills.push({
          id: s.skill_group_id,
          name: s.name,
          icon: s.icon,
          level: lvl,
          maxLevel: s.levels.length,
          effect_group: s.effect_group || null
        })
      }
    })
    
    if (skills.length > 0) {
      groups.push({
        treeId,
        treeName: getTreeName(treeId),
        skills
      })
    }
  })
  return groups
})

// ── 追蹤有衝突的增益效果群組 ──
const clashingEffectGroups = computed(() => {
  const counts = {}
  learnedSkillsSummary.value.forEach(group => {
    group.skills.forEach(s => {
      if (s.effect_group) {
        counts[s.effect_group] = (counts[s.effect_group] || 0) + 1
      }
    })
  })
  
  const clashing = new Set()
  for (const [eg, count] of Object.entries(counts)) {
    if (count >= 2) {
      clashing.add(eg)
    }
  }
  return clashing
})

// ── 分享預覽統計 computed ──
const sharedTabTreeIds = computed(() => {
  if (!sharedBuildData.value) return []
  const build = sharedBuildData.value
  if (!build.isUltimate) {
    const mapping = {
      '劍道部': ['kendo_stab', 'kendo_slash', 'kendo_qi', 'kendo_com'],
      '格鬥部': ['kakuto_fist', 'kakuto_foot', 'kakuto_qi', 'kakuto_com'],
      '弓箭部': ['archer_swift', 'archer_power', 'archer_qi', 'archer_com'],
      '氣功部': ['qigong_staff', 'qigong_atk', 'qigong_sup', 'qigong_com']
    }
    return mapping[build.job] || mapping['弓箭部']
  } else {
    const comMapping = {
      '神劍部': 'shinken_com',
      '神鬥部': 'shintou_com',
      '神弓部': 'shinbow_com',
      '神氣部': 'shinki_com'
    }
    const comId = comMapping[build.job] || 'shinbow_com'
    return [
      build.ultimateSelections?.[0] || '',
      build.ultimateSelections?.[1] || '',
      build.ultimateSelections?.[2] || '',
      comId
    ]
  }
})

const calculateCostForSharedTree = (treeId) => {
  if (!sharedBuildData.value) return { statPoints: 0, skillPoints: 0, statType: '無', maxCharLevel: 0 }
  const tree = allSkillTrees.value.find(t => t.id === treeId)
  if (!tree) return { statPoints: 0, skillPoints: 0, statType: '無', maxCharLevel: 0 }

  let totalStatPoints = 0
  let totalSkillPoints = 0
  let maxCharLevel = 0
  const treeStatType = tree.require_stat_type || '共通'
  const allocations = sharedBuildData.value.allocations || {}

  tree.skills.forEach(s => {
    const lvl = allocations[s.skill_group_id] || 0
    if (lvl > 0) {
      const sStatTypes = (s.require_stat_type || treeStatType).split('|')
      const statReq = s.levels[lvl - 1]?.learn_condition?.stat_required || 0
      const charLvl = s.levels[lvl - 1]?.learn_condition?.character_level || 0
      
      if (charLvl > maxCharLevel) {
        maxCharLevel = charLvl
      }
      if (sStatTypes.includes(treeStatType)) {
        if (statReq > totalStatPoints) {
          totalStatPoints = statReq
        }
      }
      for (let i = 0; i < lvl; i++) {
        totalSkillPoints += s.levels[i]?.learn_condition?.point_required || 0
      }
    }
  })

  return {
    statPoints: totalStatPoints,
    skillPoints: totalSkillPoints,
    statType: treeStatType,
    maxCharLevel
  }
}

const sharedTree1Cost = computed(() => calculateCostForSharedTree(sharedTabTreeIds.value[0]))
const sharedTree2Cost = computed(() => calculateCostForSharedTree(sharedTabTreeIds.value[1]))
const sharedTree3Cost = computed(() => calculateCostForSharedTree(sharedTabTreeIds.value[2]))
const sharedComTreeCost = computed(() => calculateCostForSharedTree(sharedTabTreeIds.value[3]))

const sharedTotalStatsSummary = computed(() => {
  if (!sharedBuildData.value) return { agi: 0, str: 0, spi: 0, skillPoints: 0 }
  const stats = { '敏捷': 0, '力量': 0, '精神': 0 }
  let skillPoints = 0
  const allocations = sharedBuildData.value.allocations || {}
  
  sharedTabTreeIds.value.forEach(treeId => {
    const tree = allSkillTrees.value.find(t => t.id === treeId)
    if (!tree) return

    tree.skills.forEach(s => {
      const lvl = allocations[s.skill_group_id] || 0
      if (lvl > 0) {
        const sStatTypeStr = s.require_stat_type || tree.require_stat_type || '共通'
        const sStatTypes = sStatTypeStr.split('|')
        const statReq = s.levels[lvl - 1]?.learn_condition?.stat_required || 0
        
        sStatTypes.forEach(type => {
          if (type in stats) {
            if (statReq > stats[type]) {
              stats[type] = statReq
            }
          }
        })
        for (let i = 0; i < lvl; i++) {
          skillPoints += s.levels[i]?.learn_condition?.point_required || 0
        }
      }
    })
  })
  
  return {
    agi: stats['敏捷'],
    str: stats['力量'],
    spi: stats['精神'],
    skillPoints
  }
})

const sharedMaxCharLevelRequired = computed(() => {
  if (!sharedBuildData.value) return 1
  let maxLvl = 1
  const allocations = sharedBuildData.value.allocations || {}
  
  for (const tree of allSkillTrees.value) {
    for (const skill of tree.skills) {
      const lvl = allocations[skill.skill_group_id] || 0
      if (lvl > 0) {
        const levelData = skill.levels[lvl - 1]
        if (levelData) {
          const charLvl = levelData.learn_condition?.character_level || 0
          if (charLvl > maxLvl) {
            maxLvl = charLvl
          }
        }
      }
    }
  }
  return maxLvl
})

const sharedLearnedSkillsSummary = computed(() => {
  if (!sharedBuildData.value) return []
  const groups = []
  const allocations = sharedBuildData.value.allocations || {}
  
  sharedTabTreeIds.value.forEach(treeId => {
    const tree = allSkillTrees.value.find(t => t.id === treeId)
    if (!tree) return
    
    const skills = []
    tree.skills.forEach(s => {
      const lvl = allocations[s.skill_group_id] || 0
      if (lvl > 0) {
        skills.push({
          id: s.skill_group_id,
          name: s.name,
          icon: s.icon,
          level: lvl,
          maxLevel: s.levels.length
        })
      }
    })
    
    if (skills.length > 0) {
      groups.push({
        treeId,
        treeName: getTreeName(treeId),
        skills
      })
    }
  })
  return groups
})

// ── 個人技能庫操作 (支援 Firebase 雲端與快取) ──
const BUILDS_KEY = 'ran2_skill_builds'
const MAX_BUILDS = 30

const savedBuilds = ref([])
const hasLoadedCloudBuilds = ref(false)
const hasPendingChanges = ref(false)
const syncStatus = ref('synced') // 'synced' | 'saving'

// 本地暫存重新整理載入
const refreshSavedBuilds = () => {
  try {
    savedBuilds.value = JSON.parse(localStorage.getItem(BUILDS_KEY) || '[]')
  } catch { savedBuilds.value = [] }
}

// 雲端一次性載入
const fetchCloudBuilds = async () => {
  if (!isLoggedIn.value || !currentUser.value || hasLoadedCloudBuilds.value) return
  try {
    const userCode = currentUser.value.code
    const docSnap = await getDoc(doc(db, 'skill_builds', userCode))
    if (docSnap.exists()) {
      const cloudData = docSnap.data()
      savedBuilds.value = cloudData.builds || []
      localStorage.setItem(BUILDS_KEY, JSON.stringify(savedBuilds.value))
    } else {
      savedBuilds.value = []
      localStorage.setItem(BUILDS_KEY, '[]')
    }
    hasLoadedCloudBuilds.value = true
    console.log('成功從雲端同步個人技能庫')
  } catch (err) {
    console.error('從雲端載入個人技能庫失敗，降級使用本地暫存:', err)
    refreshSavedBuilds()
  }
}

// 定時同步 (每 5 秒)
let syncTimer = null
const startSyncTimer = () => {
  if (syncTimer) clearInterval(syncTimer)
  syncTimer = setInterval(async () => {
    if (hasPendingChanges.value && isLoggedIn.value && currentUser.value) {
      syncStatus.value = 'saving'
      try {
        const userCode = currentUser.value.code
        await setDoc(doc(db, 'skill_builds', userCode), {
          builds: savedBuilds.value,
          lastUpdated: Date.now()
        })
        hasPendingChanges.value = false
        syncStatus.value = 'synced'
        console.log('☁️ 技能配置已自動同步至雲端')
      } catch (err) {
        console.error('背景同步至雲端失敗:', err)
      }
    }
  }, 5000)
}

// 離頁/卸載緊急同步
const syncImmediately = async () => {
  if (hasPendingChanges.value && isLoggedIn.value && currentUser.value) {
    try {
      const userCode = currentUser.value.code
      await setDoc(doc(db, 'skill_builds', userCode), {
        builds: savedBuilds.value,
        lastUpdated: Date.now()
      })
      hasPendingChanges.value = false
      syncStatus.value = 'synced'
      console.log('☁️ 離頁緊急同步成功')
    } catch (err) {
      console.error('離頁緊急同步失敗:', err)
    }
  }
}

const handleBeforeUnload = () => {
  if (hasPendingChanges.value) {
    syncImmediately()
  }
}

// 統一變更狀態並設定 Dirty 標記
const setSavedBuilds = (builds) => {
  savedBuilds.value = builds
  localStorage.setItem(BUILDS_KEY, JSON.stringify(builds))
  if (isLoggedIn.value) {
    hasPendingChanges.value = true
  }
}

const saveToBuildLibrary = (name) => {
  if (savedBuilds.value.length >= MAX_BUILDS) {
    alert('技能庫已滿（上限 30 組），請先刪除不需要的配置。')
    return false
  }
  const compactAllocations = {}
  for (const [key, val] of Object.entries(state.value.allocations)) {
    if (val > 0) compactAllocations[key] = val
  }
  const builds = [...savedBuilds.value]
  builds.push({
    id: Math.random().toString(16).slice(2, 10),
    name,
    job: selectedJob.value,
    isUltimate: isUltimateMode.value,
    allocations: compactAllocations,
    ultimateSelections: [...ultimateSelections.value],
    createdAt: Date.now()
  })
  setSavedBuilds(builds)
  return true
}

const deleteBuild = (id) => {
  if (!confirm('確定要刪除此配置嗎？')) return
  const builds = savedBuilds.value.filter(b => b.id !== id)
  setSavedBuilds(builds)
}

const renameBuild = (id) => {
  const builds = [...savedBuilds.value]
  const build = builds.find(b => b.id === id)
  if (!build) return
  const newName = prompt('請輸入新名稱：', build.name)
  if (newName && newName.trim()) {
    build.name = newName.trim()
    setSavedBuilds(builds)
  }
}

const loadBuild = (build) => {
  selectedJob.value = build.job
  isUltimateMode.value = build.isUltimate
  if (build.ultimateSelections) {
    ultimateSelections.value = [...build.ultimateSelections]
  }
  setTimeout(() => {
    state.value.allocations = { ...build.allocations }
    showBuildLibrary.value = false
  }, 300)
}

// ── 分享功能 ──
const generateShareUrl = () => {
  const compactAllocations = {}
  for (const [key, val] of Object.entries(state.value.allocations)) {
    if (val > 0) compactAllocations[key] = val
  }
  const encoded = encodeBuild({
    job: selectedJob.value,
    isUltimate: isUltimateMode.value,
    allocations: compactAllocations,
    ultimateSelections: [...ultimateSelections.value]
  })
  const url = `${window.location.origin}${window.location.pathname}?build=${encodeURIComponent(encoded)}`
  return url
}

const copyShareUrl = async () => {
  const url = generateShareUrl()
  generatedShareUrl.value = url
  showShareLinkModal.value = true
  try {
    await navigator.clipboard.writeText(url)
    showCopyToast.value = true
    if (copyToastTimer) clearTimeout(copyToastTimer)
    copyToastTimer = setTimeout(() => { showCopyToast.value = false }, 2500)
  } catch (err) {
    console.warn('自動複製失敗，請手動複製面板上的連結：', err)
  }
}

const shareBuildFromLibrary = (build) => {
  const encoded = encodeBuild({
    job: build.job,
    isUltimate: build.isUltimate,
    allocations: build.allocations,
    ultimateSelections: build.ultimateSelections
  })
  const url = `${window.location.origin}${window.location.pathname}?build=${encodeURIComponent(encoded)}`
  generatedShareUrl.value = url
  showShareLinkModal.value = true
  showBuildLibrary.value = false // 關閉技能庫 Modal，讓分享連結 Modal 露出來
  
  navigator.clipboard.writeText(url).then(() => {
    showCopyToast.value = true
    if (copyToastTimer) clearTimeout(copyToastTimer)
    copyToastTimer = setTimeout(() => { showCopyToast.value = false }, 2500)
  }).catch((err) => {
    console.warn('自動複製失敗，請手動複製面板上的連結：', err)
  })
}

const handleManualCopy = async () => {
  try {
    await navigator.clipboard.writeText(generatedShareUrl.value)
    showCopyToast.value = true
    if (copyToastTimer) clearTimeout(copyToastTimer)
    copyToastTimer = setTimeout(() => { showCopyToast.value = false }, 2500)
  } catch (err) {
    alert('複製失敗，請手動選取文字複製。')
  }
}

const promptSaveToBuildLibrary = () => {
  const name = prompt('請為這組配點命名：')
  if (name && name.trim()) {
    if (saveToBuildLibrary(name.trim())) {
      alert('已成功加入技能庫！')
    }
  }
}

const promptSaveSharedBuild = () => {
  if (!sharedBuildData.value) return
  const name = prompt('請為這組配點命名：')
  if (name && name.trim()) {
    refreshSavedBuilds()
    if (savedBuilds.value.length >= MAX_BUILDS) {
      alert('技能庫已滿（上限 30 組），請先刪除不需要的配置。')
      return
    }
    const data = sharedBuildData.value
    const builds = [...savedBuilds.value]
    builds.push({
      id: Math.random().toString(16).slice(2, 10),
      name: name.trim(),
      job: data.job,
      isUltimate: data.isUltimate,
      allocations: data.allocations,
      ultimateSelections: data.ultimateSelections,
      createdAt: Date.now()
    })
    setSavedBuilds(builds)
    alert('已成功加入技能庫！')
  }
}

const applySharedBuild = () => {
  if (!sharedBuildData.value) return
  const data = sharedBuildData.value
  selectedJob.value = data.job
  isUltimateMode.value = data.isUltimate
  if (data.ultimateSelections) {
    ultimateSelections.value = [...data.ultimateSelections]
  }
  setTimeout(() => {
    state.value.allocations = { ...data.allocations }
    showSharePreview.value = false
    router.replace({ query: {} })
  }, 300)
}

// ── 遞迴查詢前置技能鏈 (父節點) ──
const getParentSkills = (skillName) => {
  const path = []
  let currentName = skillName
  let visited = new Set()
  
  while (currentName) {
    if (visited.has(currentName)) break
    visited.add(currentName)
    
    let foundSkill = null
    for (const tree of allSkillTrees.value) {
      foundSkill = tree.skills.find(s => s.name === currentName)
      if (foundSkill) break
    }
    
    if (!foundSkill) break
    
    const prereq = foundSkill.levels[0]?.learn_condition?.prerequisite
    if (prereq && prereq.skill_name) {
      // 尋找這個前置技能的 ID 與屬性
      let prereqSkill = null
      for (const tree of allSkillTrees.value) {
        prereqSkill = tree.skills.find(s => s.name === prereq.skill_name)
        if (prereqSkill) break
      }
      
      const currentLevel = prereqSkill ? getLevel(prereqSkill.skill_group_id) : 0
      const isSatisfied = currentLevel >= prereq.required_skill_level
      
      path.unshift({
        id: prereqSkill ? prereqSkill.skill_group_id : '',
        name: prereq.skill_name,
        requiredLevel: prereq.required_skill_level,
        currentLevel,
        isSatisfied,
        icon: prereqSkill ? prereqSkill.icon : ''
      })
      currentName = prereq.skill_name
    } else {
      break
    }
  }
  return path
}

const openParentSkillsModal = () => {
  if (!selectedSkill.value) return
  parentSkillsChain.value = getParentSkills(selectedSkill.value.name)
  showParentSkillsModal.value = true
}
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
  transform: translate(-50%, 5px);
}
.tooltip-fade-enter-to, .tooltip-fade-leave-from {
  opacity: 1;
  transform: translate(-50%, 0);
}

/* 主體雙欄容器 */
.simulator-body {
  display: flex;
  width: 1380px; /* 拓寬至 1380px 以容納更寬的左欄面板 */
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
  width: 520px; /* 拓寬至 520px，確保奧義模式長名稱選單與長技能名稱完全展示 */
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
  overscroll-behavior-y: contain;
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

/* 技能列表 Icon */
.skill-icon {
  width: 32px;
  height: 32px;
  border-radius: 4px;
  border: 1px solid rgba(255, 119, 0, 0.2);
  background: rgba(0, 0, 0, 0.4);
  object-fit: contain;
  flex-shrink: 0;
  margin-right: 8px;
  transition: all 0.3s ease;
}

.skill-row.is-learned .skill-icon {
  border-color: var(--color-defender);
  box-shadow: 0 0 6px rgba(255, 119, 0, 0.3);
}

.skill-icon-placeholder {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  flex-shrink: 0;
  margin-right: 8px;
  opacity: 0.3;
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

/* 元素屬性 Badge */
.element-badge {
  font-size: 0.7rem;
  font-weight: bold;
  padding: 1px 4px;
  border-radius: 4px;
  margin-right: 6px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  line-height: 1.2;
}

.detail-element-badge {
  font-size: 0.85rem;
  padding: 3px 8px;
  border-radius: 6px;
  gap: 4px;
  margin-right: 8px;
}

.elem-fire {
  background: rgba(255, 69, 0, 0.12);
  border: 1px solid rgba(255, 69, 0, 0.4);
  color: #ff6633;
  text-shadow: 0 0 5px rgba(255, 69, 0, 0.3);
}

.elem-ice {
  background: rgba(0, 210, 255, 0.1);
  border: 1px solid rgba(0, 210, 255, 0.35);
  color: #33d6ff;
  text-shadow: 0 0 5px rgba(0, 210, 255, 0.3);
}

.elem-poison {
  background: rgba(57, 255, 20, 0.08);
  border: 1px solid rgba(57, 255, 20, 0.3);
  color: #55ff33;
  text-shadow: 0 0 5px rgba(57, 255, 20, 0.3);
}

.elem-lightning {
  background: rgba(255, 215, 0, 0.1);
  border: 1px solid rgba(255, 215, 0, 0.35);
  color: #ffdd33;
  text-shadow: 0 0 5px rgba(255, 215, 0, 0.3);
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

.skill-inline-lv {
  margin-left: 4px;
  font-size: 0.85rem;
  color: var(--color-defender);
  font-weight: 600;
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
  align-items: flex-start;
  padding-bottom: 15px;
  border-bottom: 1.5px solid rgba(255, 119, 0, 0.12);
  gap: 16px;
}

.title-left {
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.detail-skill-icon {
  width: 48px;
  height: 48px;
  border-radius: 6px;
  border: 1.5px solid rgba(255, 119, 0, 0.3);
  background: rgba(0, 0, 0, 0.5);
  object-fit: contain;
  box-shadow: 0 0 12px rgba(255, 119, 0, 0.15);
}

.skill-detail-name {
  font-family: inherit;
  font-size: 1.8rem;
  font-weight: 700;
  color: #fff;
  margin: 0;
  letter-spacing: 1px;
}

/* 發動招式按鈕 */
.btn-animation {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  background: rgba(255, 50, 50, 0.06);
  border: 1px solid rgba(255, 50, 50, 0.25);
  color: #ff5555;
  border-radius: 4px;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: crosshair;
  transition: all 0.25s ease;
  white-space: nowrap;
  letter-spacing: 0.5px;
  align-self: flex-start;
}

.btn-animation:hover {
  background: rgba(255, 50, 50, 0.15);
  border-color: rgba(255, 50, 50, 0.5);
  box-shadow: 0 0 10px rgba(255, 50, 50, 0.2);
  color: #ff3333;
}

.btn-animation:active {
  transform: scale(0.97);
}

/* 缺少動畫提示 Toast */
.missing-animation-toast {
  position: fixed;
  top: 50px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10005;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  background: rgba(30, 30, 45, 0.95);
  border: 1px solid rgba(255, 200, 0, 0.3);
  border-radius: 8px;
  color: #ffcc00;
  font-size: 0.9rem;
  font-weight: 600;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5), 0 0 10px rgba(255, 200, 0, 0.1);
  pointer-events: none;
}

.missing-toast-icon {
  font-size: 1.3rem;
}

/* 招式動畫浮動框 */
.animation-popup-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  z-index: 9999;
  display: flex;
  justify-content: center;
  align-items: center;
}

.animation-popup-card {
  background: rgba(12, 16, 26, 0.97);
  border: 1.5px solid rgba(255, 119, 0, 0.3);
  border-radius: 12px;
  box-shadow: 0 0 40px rgba(255, 119, 0, 0.15), 0 20px 60px rgba(0, 0, 0, 0.8);
  overflow: hidden;
  max-width: 90vw;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
}

.animation-popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 20px;
  border-bottom: 1px solid rgba(255, 119, 0, 0.15);
  background: rgba(255, 119, 0, 0.03);
}

.animation-popup-title {
  font-weight: 700;
  font-size: 1rem;
  color: var(--color-defender);
  letter-spacing: 1px;
}

.animation-popup-close {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.03);
  color: var(--text-muted);
  font-size: 0.85rem;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: all 0.2s ease;
}

.animation-popup-close:hover {
  background: rgba(255, 50, 50, 0.15);
  border-color: rgba(255, 50, 50, 0.4);
  color: #ff4444;
}

.animation-popup-body {
  padding: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: auto;
}

.animation-img {
  max-width: 100%;
  max-height: 65vh;
  border-radius: 8px;
  object-fit: contain;
}

/* 動畫浮框 transition */
.anim-popup-enter-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.anim-popup-leave-active {
  transition: all 0.2s ease-in;
}
.anim-popup-enter-from {
  opacity: 0;
}
.anim-popup-enter-from .animation-popup-card {
  transform: scale(0.9) translateY(20px);
  opacity: 0;
}
.anim-popup-leave-to {
  opacity: 0;
}
.anim-popup-leave-to .animation-popup-card {
  transform: scale(0.95);
  opacity: 0;
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
  width: 1380px; /* 拓寬至 1380px 與主體容器對齊 */
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

/* 雲端同步狀態標籤 */
.cloud-sync-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  transition: all 0.3s ease;
  white-space: nowrap;
}

.cloud-sync-badge.synced {
  color: var(--text-muted);
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.cloud-sync-badge.saving, .sync-footer-status.saving {
  color: #ffaa00;
  background: rgba(255, 170, 0, 0.06);
  border: 1px solid rgba(255, 170, 0, 0.25);
  animation: cloud-pulse 1.5s infinite ease-in-out;
}

.sync-footer-status.synced {
  color: #00ff80;
  background: rgba(0, 255, 128, 0.06);
  border: 1px solid rgba(0, 255, 128, 0.25);
  padding: 2px 6px;
  border-radius: 4px;
}

@keyframes cloud-pulse {
  0% { opacity: 0.6; box-shadow: 0 0 4px rgba(255, 170, 0, 0.1); }
  50% { opacity: 1; box-shadow: 0 0 10px rgba(255, 170, 0, 0.3); }
  100% { opacity: 0.6; box-shadow: 0 0 4px rgba(255, 170, 0, 0.1); }
}

/* 我的技能庫按鈕 */
.build-library-btn-wrapper {
  position: relative;
  display: inline-flex;
}

.btn-library {
  padding: 6px 14px;
  background: rgba(200, 0, 255, 0.08);
  border: 1px solid rgba(200, 0, 255, 0.3);
  color: #d845ff;
  border-radius: 6px;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.25s ease;
  white-space: nowrap;
}

.btn-library:hover:not(:disabled) {
  background: rgba(200, 0, 255, 0.18);
  box-shadow: 0 0 12px rgba(200, 0, 255, 0.2);
}

.btn-library.is-disabled, .btn-save-library.is-disabled {
  opacity: 0.35;
  cursor: not-allowed;
  filter: grayscale(1);
}

.disabled-tooltip {
  display: none;
  position: absolute;
  bottom: -30px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(20, 20, 30, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  padding: 4px 10px;
  color: var(--text-muted);
  font-size: 0.75rem;
  white-space: nowrap;
  z-index: 100;
  pointer-events: none;
}

.build-library-btn-wrapper:hover .disabled-tooltip {
  display: block;
}

/* 已學技能清單 */
.footer-learned {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.learned-title {
  color: var(--text-main);
  font-weight: 700;
  margin: 0;
}

.learned-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.learned-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  background: rgba(255, 119, 0, 0.06);
  border: 1px solid rgba(255, 119, 0, 0.2);
  border-radius: 6px;
  font-size: 0.8rem;
  color: var(--text-main);
  transition: all 0.2s ease;
}

.learned-pill:hover {
  border-color: var(--color-defender);
  background: rgba(255, 119, 0, 0.12);
}

.learned-icon {
  width: 20px;
  height: 20px;
  border-radius: 3px;
  object-fit: contain;
}

.learned-name {
  font-weight: 500;
}

.learned-lv {
  color: var(--color-defender);
  font-weight: bold;
  font-size: 0.75rem;
}

/* Footer 操作按鈕區 */
.footer-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.btn-share {
  padding: 8px 18px;
  background: rgba(0, 229, 255, 0.08);
  border: 1px solid rgba(0, 229, 255, 0.3);
  color: #00e5ff;
  border-radius: 6px;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.25s ease;
}

.btn-share:hover {
  background: rgba(0, 229, 255, 0.18);
  box-shadow: 0 0 12px rgba(0, 229, 255, 0.2);
}

.btn-save-library {
  padding: 8px 18px;
  background: rgba(200, 0, 255, 0.08);
  border: 1px solid rgba(200, 0, 255, 0.3);
  color: #d845ff;
  border-radius: 6px;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.25s ease;
}

.btn-save-library:hover:not(:disabled) {
  background: rgba(200, 0, 255, 0.18);
  box-shadow: 0 0 12px rgba(200, 0, 255, 0.2);
}

.btn-share-apply {
  padding: 8px 18px;
  background: rgba(255, 119, 0, 0.1);
  border: 1px solid var(--color-defender);
  color: var(--color-defender);
  border-radius: 6px;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.25s ease;
}

.btn-share-apply:hover {
  background: var(--color-defender);
  color: #000;
  box-shadow: 0 0 12px var(--color-defender);
}

/* 技能庫 Modal */
.build-library-modal {
  background: rgba(12, 16, 26, 0.97);
  border: 1.5px solid rgba(255, 119, 0, 0.3);
  border-radius: 12px;
  box-shadow: 0 0 40px rgba(255, 119, 0, 0.15), 0 20px 60px rgba(0, 0, 0, 0.8);
  overflow: hidden;
  width: 550px;
  max-width: 90vw;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.build-library-body {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 119, 0, 0.2) transparent;
}

.library-empty {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-muted);
}

.library-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.library-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  transition: all 0.2s ease;
}

.library-item:hover {
  border-color: rgba(255, 119, 0, 0.15);
  background: rgba(255, 119, 0, 0.02);
}

.library-item-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.library-item-name {
  font-weight: 600;
  color: #fff;
  font-size: 0.95rem;
}

.library-item-meta {
  font-size: 0.8rem;
}

.library-item-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.btn-lib-action {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.02);
  color: var(--text-muted);
  font-size: 0.85rem;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: all 0.2s ease;
}

.btn-lib-action:hover {
  background: rgba(255, 119, 0, 0.1);
  border-color: rgba(255, 119, 0, 0.3);
  color: var(--color-defender);
}

.btn-lib-delete:hover {
  background: rgba(255, 50, 50, 0.1);
  border-color: rgba(255, 50, 50, 0.3);
  color: #ff4444;
}

/* 分享預覽 */
.share-preview-modal {
  width: 580px;
}

.share-preview-info {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
}

.share-preview-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 8px;
}

.share-preview-label {
  color: var(--text-muted);
  font-size: 0.9rem;
}

.share-preview-value {
  color: var(--color-defender);
  font-weight: bold;
  font-size: 1rem;
}

.share-preview-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.stats-group-title {
  color: var(--color-defender);
  font-weight: bold;
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stats-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
  background: rgba(255, 255, 255, 0.01);
  border: 1px solid rgba(255, 255, 255, 0.03);
  border-radius: 6px;
  padding: 10px;
}

.stats-list-item {
  color: var(--text-muted);
  line-height: 1.4;
}

.stats-summary-box {
  background: rgba(255, 119, 0, 0.03);
  border: 1px solid rgba(255, 119, 0, 0.1);
  border-radius: 6px;
  padding: 12px;
}

.stats-summary-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px 16px;
}

.summary-grid-item {
  color: var(--text-main);
  font-size: 0.9rem;
}

.font-medium-large {
  font-size: 1.05rem;
}

.scrollable-learned-list {
  padding: 6px;
  background: rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.03);
  border-radius: 6px;
}

.clash-warning-dot {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  background: #ffcc00;
  color: #000;
  border-radius: 50%;
  font-size: 10px;
  font-weight: 900;
  margin-right: 6px;
  line-height: 1;
  flex-shrink: 0;
  box-shadow: 0 0 6px rgba(255, 204, 0, 0.6);
  transform: translateY(-0.5px);
}

/* 招式增益效果碰撞衝突邊框 (加強版發光與脈動效果) */
.clash-move_speed_up {
  border-width: 1.5px !important;
  border-color: rgba(0, 191, 255, 0.95) !important;
  background: rgba(0, 191, 255, 0.15) !important;
  animation: clash-pulse-blue 2s infinite ease-in-out;
}

.clash-attack_speed_up {
  border-width: 1.5px !important;
  border-color: rgba(0, 255, 64, 0.95) !important;
  background: rgba(0, 255, 64, 0.15) !important;
  animation: clash-pulse-green 2s infinite ease-in-out;
}

.clash-attack_power_up {
  border-width: 1.5px !important;
  border-color: rgba(255, 128, 0, 0.95) !important;
  background: rgba(255, 128, 0, 0.15) !important;
  animation: clash-pulse-orange 2s infinite ease-in-out;
}

@keyframes clash-pulse-blue {
  0% { box-shadow: 0 0 6px rgba(0, 191, 255, 0.3); }
  50% { box-shadow: 0 0 16px rgba(0, 191, 255, 0.7); }
  100% { box-shadow: 0 0 6px rgba(0, 191, 255, 0.3); }
}

@keyframes clash-pulse-green {
  0% { box-shadow: 0 0 6px rgba(0, 255, 64, 0.3); }
  50% { box-shadow: 0 0 16px rgba(0, 255, 64, 0.7); }
  100% { box-shadow: 0 0 6px rgba(0, 255, 64, 0.3); }
}

@keyframes clash-pulse-orange {
  0% { box-shadow: 0 0 6px rgba(255, 128, 0, 0.3); }
  50% { box-shadow: 0 0 16px rgba(255, 128, 0, 0.7); }
  100% { box-shadow: 0 0 6px rgba(255, 128, 0, 0.3); }
}

/* 分享連結彈窗 */
.share-link-modal {
  width: 500px;
}
.share-link-input-wrapper {
  display: flex;
  gap: 8px;
}
.share-link-input {
  flex: 1;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 119, 0, 0.2);
  border-radius: 6px;
  padding: 8px 12px;
  color: #fff;
  font-family: monospace;
  font-size: 0.85rem;
  outline: none;
  transition: border-color 0.2s ease;
}
.share-link-input:focus {
  border-color: var(--color-defender);
}
.btn-copy-link {
  padding: 8px 16px;
  background: rgba(255, 119, 0, 0.1);
  border: 1px solid var(--color-defender);
  color: var(--color-defender);
  border-radius: 6px;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.2s ease;
}
.btn-copy-link:hover {
  background: var(--color-defender);
  color: #000;
}
.btn-close-link {
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: var(--text-muted);
  border-radius: 6px;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.2s ease;
}
.btn-close-link:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

/* 已學技能分組展示 */
.learned-tree-groups {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
}
.learned-tree-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.learned-tree-group-title {
  color: var(--color-defender);
  font-weight: bold;
  font-size: 0.85rem;
  border-left: 2px solid var(--color-defender);
  padding-left: 8px;
  line-height: 1.2;
}

/* 詳細面板橫排操作按鈕 */
.detail-actions-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 18px;
}
.btn-prereq-path {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  background: rgba(0, 255, 128, 0.06);
  border: 1px solid rgba(0, 255, 128, 0.25);
  color: #00ff80;
  border-radius: 4px;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s ease;
  white-space: nowrap;
  letter-spacing: 0.5px;
  align-self: flex-start;
}
.btn-prereq-path:hover {
  background: rgba(0, 255, 128, 0.15);
  border-color: rgba(0, 255, 128, 0.5);
  box-shadow: 0 0 10px rgba(0, 255, 128, 0.2);
}
.btn-prereq-path:active {
  transform: scale(0.97);
}

/* 前置技能關係 Modal */
.prereq-path-modal {
  width: 520px;
}
.prereq-empty {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-muted);
}
.prereq-chain {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  width: 100%;
}
.prereq-node-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}
.prereq-node {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 12px 16px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  transition: all 0.25s ease;
  box-sizing: border-box;
}
.prereq-node.is-satisfied {
  border-color: rgba(0, 255, 128, 0.25);
  background: rgba(0, 255, 128, 0.03);
}
.prereq-node.is-not-satisfied {
  border-color: rgba(255, 0, 85, 0.25);
  background: rgba(255, 0, 85, 0.03);
}
.prereq-node.is-current {
  border-color: var(--color-defender);
  background: rgba(255, 119, 0, 0.08);
  box-shadow: 0 0 15px rgba(255, 119, 0, 0.15);
}
.prereq-node-icon {
  width: 32px;
  height: 32px;
  border-radius: 4px;
  margin-right: 12px;
  flex-shrink: 0;
}
.prereq-node-icon-placeholder {
  width: 32px;
  height: 32px;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-right: 12px;
  flex-shrink: 0;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 4px;
  color: var(--text-muted);
}
.prereq-node-info {
  flex: 1;
  min-width: 0;
}
.prereq-node-name {
  font-weight: bold;
  color: #fff;
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.prereq-node-level {
  color: var(--text-muted);
  font-size: 0.8rem;
}
.prereq-node-slash {
  color: rgba(255, 255, 255, 0.15);
  margin: 0 4px;
}
.prereq-status-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: bold;
  flex-shrink: 0;
  margin-left: 12px;
}
.prereq-node.is-satisfied .prereq-status-badge {
  background: rgba(0, 255, 128, 0.12);
  color: #00ff80;
}
.prereq-node.is-not-satisfied .prereq-status-badge {
  background: rgba(255, 0, 85, 0.12);
  color: #ff0055;
}
.prereq-arrow {
  color: rgba(255, 255, 255, 0.2);
  font-size: 1.25rem;
  font-weight: bold;
  margin-top: 8px;
  text-shadow: 0 0 5px rgba(255, 255, 255, 0.1);
}
</style>
