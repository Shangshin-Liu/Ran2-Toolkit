<template>
  <div class="tasks-page">
    <!-- 全域載入遮罩 -->
    <LoadingOverlay v-if="isActionLoading" theme="snipper" :message="actionLoadingMessage" fullscreen />

    <div class="page-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px;">
      <div class="header-left">
        <h2 class="neon-text-snipper">🗺️ 任務指南</h2>
        <p class="subtitle">想以完成全任務為目標嗎? 這裡或許可以幫助你找到缺少的任務</p>
      </div>
      <div class="header-right-btns" style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
        <button 
          class="no-name-list-toggle-btn"
          :class="{ 'active-no-name': useNoNameList }"
          @click="toggleNoNameList"
        >
          {{ useNoNameList ? '★ 使用中：【不要有名字】清單' : '☆ 使用【不要有名字】清單' }}
        </button>
        <button 
          class="help-btn"
          @click="showCompletedTasksModal = true"
          title="查看並管理我的完成任務紀錄"
        >
          📋 我的完成任務
        </button>
      </div>
    </div>

    <!-- 頂部操作欄：篩選與搜尋 -->
    <div class="action-bar glass-card">
      <button class="mobile-filter-toggle" @click="isMobileFiltersExpanded = !isMobileFiltersExpanded">
        {{ isMobileFiltersExpanded ? '收起篩選' : '🔍 展開篩選' }}
      </button>

      <div class="filter-controls" :class="{ 'expanded': isMobileFiltersExpanded }">
        <template v-if="!useNoNameList">
          <label class="select-label">任務獎勵篩選:</label>
          <select v-model="rewardFilter" class="server-select">
            <option value="全部">全部獎勵</option>
            <option value="skills">含技能點數</option>
            <option value="stats">含能力點數</option>
            <option value="both">同時包含技能與能力點數</option>
          </select>

          <label class="select-label">學院篩選:</label>
          <select v-model="schoolFilter" class="server-select">
            <option value="全部">全部學院</option>
            <option value="共通">共通</option>
            <option value="聖門">聖門</option>
            <option value="鳳凰">鳳凰</option>
            <option value="玄嚴">玄嚴</option>
          </select>

          <label class="select-label">部門篩選:</label>
          <select v-model="deptFilter" class="server-select">
            <option value="全部">全部部門</option>
            <option value="共通">共通</option>
            <option value="劍道部">劍道部</option>
            <option value="格鬥部">格鬥部</option>
            <option value="氣功部">氣功部</option>
            <option value="弓箭部">弓箭部</option>
          </select>

          <div class="search-box">
            <input 
              type="text" 
              v-model="searchQuery" 
              class="search-input" 
            />
            <button class="search-btn" title="搜尋">🔍</button>
          </div>
        </template>

        <template v-else>
          <div class="search-box">
            <input 
              type="text" 
              v-model="searchQuery" 
              class="search-input" 
              style="width: 280px;"
            />
          </div>
        </template>
      </div>
    </div>

    <div class="tasks-layout" v-if="filteredTasks.length > 0">
      <!-- 左側：任務清單卡片 -->
      <div class="tasks-list-panel">
        <!-- A. 【不要有名字】折疊樹狀選單 -->
        <template v-if="useNoNameList">
          <div v-for="(npcs, cat) in groupedTasks" :key="cat" class="category-group">
            <!-- 📌 大分類 Category Header -->
            <div class="category-header glass-card" @click="toggleCategory(cat)">
              <span class="arrow-icon">{{ expandedCategories.includes(cat) ? '▼' : '▶' }}</span>
              <span class="category-title">{{ cat }}</span>
              <span class="count-badge">{{ Object.values(npcs).flat().length }}</span>
            </div>

            <!-- 💬 中分類 NPC 列表 -->
            <div v-if="expandedCategories.includes(cat)" class="npcs-list">
              <div v-for="(taskList, npc) in npcs" :key="npc" class="npc-group">
                <div class="npc-header" @click="toggleNpc(cat, npc)">
                  <span class="arrow-icon-sub">{{ expandedNpcs.includes(`${cat}_${npc}`) ? '▼' : '▶' }}</span>
                  <span class="npc-name">👤 {{ npc }}</span>
                  <span class="count-badge-sub">{{ taskList.length }}</span>
                </div>

                <!-- ⚔️ 任務卡片列表 (高度緊湊化) -->
                <div v-if="expandedNpcs.includes(`${cat}_${npc}`)" class="npc-tasks">
                  <div 
                    v-for="task in taskList" 
                    :key="task.id" 
                    class="task-card glass-card grouped-task-card"
                    :class="{ 
                      'active-task': selectedTask && selectedTask.id === task.id,
                      'completed-task-card': myCompletedTaskIds.includes(task.id)
                    }"
                    @click="selectTask(task)"
                  >
                    <div class="task-card-header" style="gap: 5px;">
                      <h4 class="task-card-title" style="font-size: 0.88rem; margin: 0;">
                        {{ getDisplayName(task) }}
                      </h4>
                      <span v-if="myCompletedTaskIds.includes(task.id)" class="completed-badge" style="font-size: 0.75rem; padding: 1px 4px;">✓</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- B. 預設模式卡片列表 -->
        <template v-else>
          <div 
            v-for="task in paginatedTasks" 
            :key="task.id" 
            class="task-card glass-card"
            :class="{ 
              'active-task': selectedTask && selectedTask.id === task.id,
              'completed-task-card': myCompletedTaskIds.includes(task.id)
            }"
            @click="selectTask(task)"
          >
            <div class="task-card-header" style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
              <h3 class="task-card-title" style="margin: 0; font-size: 1.02rem;">
                {{ getDisplayName(task) }}
              </h3>
              <span v-if="myCompletedTaskIds.includes(task.id)" class="completed-badge" style="padding: 2px 6px; font-size: 0.75rem;">✓</span>
            </div>
            <p class="task-card-giver" style="margin-top: 6px; font-size: 0.8rem; color: var(--text-muted); line-height: 1.4;">
              📍 {{ task.startLocation?.desc }}
            </p>
          </div>

          <!-- 🔢 分頁控制項 -->
          <div class="pagination-container" v-if="totalPages > 1">
            <button 
              class="page-btn arrow-btn" 
              :disabled="currentPage === 1" 
              @click="currentPage = 1"
              title="最前頁"
            >
              «
            </button>
            <button 
              class="page-btn arrow-btn" 
              :disabled="currentPage === 1" 
              @click="currentPage--"
              title="上一頁"
            >
              ‹
            </button>

            <button 
              v-for="page in pageNumbers" 
              :key="page" 
              class="page-btn num-btn"
              :class="{ 'active-page': currentPage === page }"
              @click="currentPage = page"
            >
              {{ page }}
            </button>

            <button 
              class="page-btn arrow-btn" 
              :disabled="currentPage === totalPages" 
              @click="currentPage++"
              title="下一頁"
            >
              ›
            </button>
            <button 
              class="page-btn arrow-btn" 
              :disabled="currentPage === totalPages" 
              @click="currentPage = totalPages"
              title="最末頁"
            >
              »
            </button>

            <div class="page-info">
              第 {{ currentPage }} / {{ totalPages }} 頁 (共 {{ filteredTasks.length }} 筆)
            </div>
          </div>
        </template>
      </div>

      <!-- 右側：任務詳細資訊 (Desktop 顯示) -->
      <div class="task-detail-panel glass-card neon-border-snipper" v-if="selectedTask">
        <div class="detail-header">
          <div class="detail-title-row" style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
            <div>
              <h2 class="detail-title neon-text-snipper">{{ getDisplayName(selectedTask) }}</h2>
              <div v-if="selectedTask.customizedName && selectedTask.customizedName.trim()" class="original-name" style="font-size: 0.85rem; color: var(--text-muted); margin-top: 4px;">
                (原始名稱: {{ selectedTask.name }})
              </div>
              <div class="task-badges" v-if="selectedTask.school || selectedTask.department" style="display: flex; gap: 8px; margin-top: 6px;">
                <span :class="['badge-school', `school-${selectedTask.school}`]" v-if="selectedTask.school">{{ selectedTask.school }}</span>
                <span :class="['badge-dept', `dept-${selectedTask.department}`]" v-if="selectedTask.department">{{ selectedTask.department }}</span>
              </div>
            </div>
            <button 
              class="modal-btn" 
              :class="myCompletedTaskIds.includes(selectedTask.id) ? 'confirm' : 'cancel'"
              style="padding: 6px 14px; font-size: 0.85rem; border-radius: 6px;"
              @click="toggleTaskCompleted(selectedTask.id)"
            >
              {{ myCompletedTaskIds.includes(selectedTask.id) ? '✓ 已完成' : '▫ 標記為已完成' }}
            </button>
          </div>

          <div v-if="selectedTask.isQc10726" class="no-name-banner glass-card" style="margin-top: 15px;">
            <div class="banner-title">⭐ 巴哈討論區「不要有名字」必解任務</div>
            <div class="banner-meta">
              <span>攻略分類: {{ selectedTask.qc10726.category }}</span>
              <span class="meta-separator">|</span>
              <span>對應 NPC: {{ selectedTask.qc10726.npc }}</span>
            </div>
          </div>
        </div>

        <hr class="divider" />

        <!-- 接取條件區塊 (清單呈現) -->
        <div class="detail-section" v-if="selectedTask.requirements && selectedTask.requirements.length">
          <h3 class="section-title">📋 接取條件</h3>
          <ul class="bullet-list">
            <li v-for="(req, idx) in selectedTask.requirements" :key="idx">
              <template v-if="req.isPrerequisite && req.url">
                完成 
                <a 
                  href="#" 
                  class="req-link" 
                  @click.prevent="openTaskPreview(req.url.split('/').pop())"
                >
                  {{ req.desc.replace('完成 ', '') }}
                </a>
              </template>
              <template v-else>
                {{ req.desc }}
              </template>
            </li>
          </ul>
        </div>

        <!-- 地點與地圖示意 -->
        <div class="detail-section">
          <h3 class="section-title">📍 任務地點示意</h3>
          <p class="detail-giver" style="margin-bottom: 12px; font-size: 0.95rem; color: var(--text-muted);">
            <strong>NPC：</strong>{{ selectedTask.startLocation.desc }}
          </p>
          <div class="map-container" v-if="selectedTask.startLocation.image">
            <template v-if="loadedImages[`map_${selectedTask.id}`]">
              <img :src="selectedTask.startLocation.image" alt="Map Location" class="map-img" />
            </template>
            <button v-else class="lazy-load-img-btn" @click="loadedImages[`map_${selectedTask.id}`] = true">
              🗺️ 點擊載入起點地圖
            </button>
          </div>
        </div>

        <!-- 流程時間軸 -->
        <div class="detail-section">
          <h3 class="section-title">⚡ 執行流程</h3>
          <div class="timeline">
            <div v-for="(step, idx) in selectedTask.steps" :key="idx" class="timeline-item">
              <div class="timeline-badge">{{ idx + 1 }}</div>
              <div class="timeline-content">
                <p class="step-desc">{{ step.desc }}</p>
                <template v-if="step.image">
                  <template v-if="loadedImages[`step_${selectedTask.id}_${idx}`]">
                    <img :src="step.image" alt="Step Screenshot" class="step-img" />
                  </template>
                  <button v-else class="lazy-load-img-btn steps-lazy-btn" @click="loadedImages[`step_${selectedTask.id}_${idx}`] = true">
                    📷 點擊載入步驟圖片
                  </button>
                </template>
              </div>
            </div>
          </div>
        </div>

        <!-- 獎勵區塊 -->
        <div class="detail-section">
          <h3 class="section-title">🎁 任務獎勵</h3>
          <div class="rewards-grid">
            <div v-for="(reward, idx) in getRewardsList(selectedTask)" :key="idx" class="reward-item">
              <span class="reward-icon">{{ reward.icon }}</span>
              <div class="reward-info">
                <span class="reward-name">{{ reward.name }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 小技巧與注意事項 -->
        <div class="detail-tips-warnings">
          <div class="tips-box" v-if="selectedTask.tips && selectedTask.tips.length">
            <h4>💡 小技巧</h4>
            <ul class="bullet-list">
              <li v-for="(tip, idx) in selectedTask.tips" :key="idx">{{ tip }}</li>
            </ul>
          </div>
          <div class="warnings-box" v-if="selectedTask.notes && selectedTask.notes.length">
            <h4>⚠️ 注意事項</h4>
            <ul class="bullet-list">
              <li v-for="(note, idx) in selectedTask.notes" :key="idx">{{ note }}</li>
            </ul>
          </div>
        </div>
        <!-- 我要回報按鈕 -->
        <div class="report-section" style="margin-top: 20px; text-align: right;">
          <button 
            class="report-btn" 
            :disabled="!isLoggedIn"
            @click="openReportModal(selectedTask)"
            :title="isLoggedIn ? '點擊回報此任務建議' : '請先登入後使用回報功能'"
          >
            💬 我要回報
          </button>
        </div>
      </div>
    </div>

    <!-- 查無資料 Empty State -->
    <div class="empty-state glass-card neon-border-snipper" v-else style="text-align: center; padding: 60px 20px;">
      <div class="empty-state-icon" style="font-size: 3rem; margin-bottom: 16px;">🔍</div>
      <h3 class="empty-state-title neon-text-snipper" style="font-size: 1.5rem; margin-bottom: 8px;">找不到符合條件的任務</h3>
      <p class="empty-state-desc" style="color: var(--text-muted);">請嘗試調整篩選條件或重新輸入關鍵字搜尋。</p>
    </div>

    <!-- 手機版抽屜 (iPhone 17 彈窗顯示詳細資訊) -->
    <div class="mobile-drawer-overlay" v-if="showMobileDetail && selectedTask" @click="closeMobileDetail">
      <div class="mobile-drawer glass-card neon-border-snipper" @click.stop>
        <button class="close-btn" @click="closeMobileDetail">✕</button>
        <div class="drawer-content">
          <div class="detail-title-row" style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
            <div>
              <h2 class="detail-title neon-text-snipper">{{ getDisplayName(selectedTask) }}</h2>
              <div v-if="selectedTask.customizedName && selectedTask.customizedName.trim()" class="original-name" style="font-size: 0.85rem; color: var(--text-muted); margin-top: 4px;">
                (原始名稱: {{ selectedTask.name }})
              </div>
              <div class="task-badges" v-if="selectedTask.school || selectedTask.department" style="display: flex; gap: 8px; margin-top: 6px;">
                <span :class="['badge-school', `school-${selectedTask.school}`]" v-if="selectedTask.school">{{ selectedTask.school }}</span>
                <span :class="['badge-dept', `dept-${selectedTask.department}`]" v-if="selectedTask.department">{{ selectedTask.department }}</span>
              </div>
            </div>
            <button 
              class="modal-btn" 
              :class="myCompletedTaskIds.includes(selectedTask.id) ? 'confirm' : 'cancel'"
              style="padding: 6px 14px; font-size: 0.85rem; border-radius: 6px;"
              @click="toggleTaskCompleted(selectedTask.id)"
            >
              {{ myCompletedTaskIds.includes(selectedTask.id) ? '✓ 已完成' : '▫ 標記為已完成' }}
            </button>
          </div>

          <div v-if="selectedTask.isQc10726" class="no-name-banner glass-card" style="margin-top: 15px; margin-bottom: 15px;">
            <div class="banner-title">⭐ 巴哈討論區「不要有名字」必解任務</div>
            <div class="banner-meta">
              <span>分類: {{ selectedTask.qc10726.category }}</span>
              <span class="meta-separator">|</span>
              <span>NPC: {{ selectedTask.qc10726.npc }}</span>
            </div>
          </div>
          
          <div class="detail-section" v-if="selectedTask.requirements && selectedTask.requirements.length" style="margin-top: 10px;">
            <h3 class="section-title" style="font-size: 1rem;">📋 接取條件</h3>
            <ul class="bullet-list">
              <li v-for="(req, idx) in selectedTask.requirements" :key="idx">
                <template v-if="req.isPrerequisite && req.url">
                  完成 
                  <a 
                    href="#" 
                    class="req-link" 
                    @click.prevent="openTaskPreview(req.url.split('/').pop())"
                  >
                    {{ req.desc.replace('完成 ', '') }}
                  </a>
                </template>
                <template v-else>
                  {{ req.desc }}
                </template>
              </li>
            </ul>
          </div>

          <div class="detail-section">
            <h3 class="section-title" style="font-size: 1rem;">📍 任務地點示意</h3>
            <p class="detail-giver" style="margin-bottom: 10px; font-size: 0.85rem; color: var(--text-muted);">
              <strong>NPC：</strong>{{ selectedTask.startLocation.desc }}
            </p>
            <div class="map-container" v-if="selectedTask.startLocation.image">
              <template v-if="loadedImages[`map_${selectedTask.id}`]">
                <img :src="selectedTask.startLocation.image" alt="Map Location" class="map-img" />
              </template>
              <button v-else class="lazy-load-img-btn" @click="loadedImages[`map_${selectedTask.id}`] = true">
                🗺️ 點擊載入起點地圖
              </button>
            </div>
          </div>

          <div class="timeline">
            <div v-for="(step, idx) in selectedTask.steps" :key="idx" class="timeline-item">
              <div class="timeline-badge">{{ idx + 1 }}</div>
              <div class="timeline-content">
                <p class="step-desc">{{ step.desc }}</p>
                <template v-if="step.image">
                  <template v-if="loadedImages[`step_${selectedTask.id}_${idx}`]">
                    <img :src="step.image" alt="Step Screenshot" class="step-img" />
                  </template>
                  <button v-else class="lazy-load-img-btn steps-lazy-btn" @click="loadedImages[`step_${selectedTask.id}_${idx}`] = true">
                    📷 點擊載入步驟圖片
                  </button>
                </template>
              </div>
            </div>
          </div>

          <div class="rewards-grid">
            <div v-for="(reward, idx) in getRewardsList(selectedTask)" :key="idx" class="reward-item">
              <span class="reward-icon">{{ reward.icon }}</span>
              <div class="reward-info">
                <span class="reward-name">{{ reward.name }}</span>
              </div>
            </div>
          </div>

          <div class="tips-box" style="margin-top: 15px;" v-if="selectedTask.tips && selectedTask.tips.length">
            <h4>💡 小技巧</h4>
            <ul class="bullet-list">
              <li v-for="(tip, idx) in selectedTask.tips" :key="idx">{{ tip }}</li>
            </ul>
          </div>
          
          <div class="warnings-box" style="margin-top: 15px;" v-if="selectedTask.notes && selectedTask.notes.length">
            <h4>⚠️ 注意事項</h4>
            <ul class="bullet-list">
              <li v-for="(note, idx) in selectedTask.notes" :key="idx">{{ note }}</li>
            </ul>
          </div>
          <!-- 我要回報按鈕 -->
          <div class="report-section" style="margin-top: 15px; text-align: right;">
            <button 
              class="report-btn" 
              :disabled="!isLoggedIn"
              @click="openReportModal(selectedTask)"
              :title="isLoggedIn ? '點擊回報此任務建議' : '請先登入後使用回報功能'"
            >
              💬 我要回報
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 🗺️ 前置任務詳情預覽 Modal -->
    <div class="modal-overlay" v-if="showPreviewModal" @click="showPreviewModal = false" style="z-index: 2200;">
      <div class="modal-content glass-card neon-border-snipper" @click.stop>
        <button class="modal-close-btn" @click="showPreviewModal = false">✕</button>
        
        <div class="modal-body" v-if="previewTask">
          <div class="detail-header">
            <div class="detail-title-row">
              <div>
                <h2 class="detail-title neon-text-snipper" style="font-size: 1.5rem; margin-bottom: 0;">{{ getDisplayName(previewTask) }}</h2>
                <div v-if="previewTask.customizedName && previewTask.customizedName.trim()" class="original-name" style="font-size: 0.85rem; color: var(--text-muted); margin-top: 4px;">
                  (原始名稱: {{ previewTask.name }})
                </div>
                <div class="task-badges" v-if="previewTask.school || previewTask.department" style="display: flex; gap: 8px; margin-top: 6px;">
                  <span :class="['badge-school', `school-${previewTask.school}`]" v-if="previewTask.school">{{ previewTask.school }}</span>
                  <span :class="['badge-dept', `dept-${previewTask.department}`]" v-if="previewTask.department">{{ previewTask.department }}</span>
                </div>
              </div>
            </div>
            <p class="detail-giver" style="font-size: 0.85rem; margin-top: 8px;"><strong>NPC：</strong>{{ previewTask.startLocation.desc }}</p>
            
            <div v-if="previewTask.isQc10726" class="no-name-banner glass-card" style="margin-top: 15px; margin-bottom: 5px;">
              <div class="banner-title">⭐ 巴哈討論區「不要有名字」必解任務</div>
              <div class="banner-meta">
                <span>分類: {{ previewTask.qc10726.category }}</span>
                <span class="meta-separator">|</span>
                <span>NPC: {{ previewTask.qc10726.npc }}</span>
              </div>
            </div>
          </div>

          <hr class="divider" />

          <!-- 滾動內容區 -->
          <div class="modal-scroll-area">
            <!-- 流程時間軸 -->
            <div class="detail-section">
              <h3 class="section-title" style="font-size: 1rem;">⚡ 執行流程</h3>
              <div class="timeline">
                <div v-for="(step, idx) in previewTask.steps" :key="idx" class="timeline-item">
                  <div class="timeline-badge">{{ idx + 1 }}</div>
                  <div class="timeline-content">
                    <p class="step-desc">{{ step.desc }}</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- 獎勵區塊 -->
            <div class="detail-section">
              <h3 class="section-title" style="font-size: 1rem;">🎁 任務獎勵</h3>
              <div class="rewards-grid">
                <div v-for="(reward, idx) in getRewardsList(previewTask)" :key="idx" class="reward-item">
                  <span class="reward-icon">{{ reward.icon }}</span>
                  <div class="reward-info">
                    <span class="reward-name">{{ reward.name }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 小技巧與注意事項 -->
            <div class="detail-tips-warnings" style="margin-top: 15px;">
              <div class="tips-box" v-if="previewTask.tips && previewTask.tips.length">
                <h4>💡 小技巧</h4>
                <ul class="bullet-list">
                  <li v-for="(tip, idx) in previewTask.tips" :key="idx">{{ tip }}</li>
                </ul>
              </div>
              <div class="warnings-box" v-if="previewTask.notes && previewTask.notes.length">
                <h4>⚠️ 注意事項</h4>
                <ul class="bullet-list">
                  <li v-for="(note, idx) in previewTask.notes" :key="idx">{{ note }}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>



    <!-- 📋 我的完成任務 Modal -->
    <div class="modal-overlay" v-if="showCompletedTasksModal" @click="showCompletedTasksModal = false">
      <div class="modal-content glass-card neon-border-snipper" @click.stop style="width: 600px; max-width: 95%;">
        <button class="modal-close-btn" @click="showCompletedTasksModal = false">✕</button>
        <h3 class="modal-title neon-text-snipper" style="margin-bottom: 20px; text-align: center; font-weight: 800; font-size: 1.4rem;">📋 我的完成任務</h3>
        
        <!-- 未選取角色狀態：登入介面 -->
        <div v-if="!isLoggedIn" style="padding: 20px 0; text-align: center;">
          <p style="font-size: 1rem; color: #ff0055; font-weight: 700; margin-bottom: 12px;">⚠️ 尚未登入角色身分</p>
          <p style="font-size: 0.88rem; color: var(--text-muted); margin-bottom: 20px;">任務指南需要讀取您的角色以進行進度記錄，請先前往登入。</p>
          <button class="modal-btn cancel" @click="showCompletedTasksModal = false" style="margin-right: 12px;">關閉</button>
          <router-link to="/" class="modal-btn confirm neon-border-snipper" style="display: inline-block; text-decoration: none;">去登入/註冊</router-link>
        </div>

        <!-- 已登入狀態：展示完成紀錄與同步功能 -->
        <div v-else class="completed-tasks-container">
          <!-- 帳號資訊 -->
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 10px;">
            <span style="font-size: 0.9rem; color: var(--color-snipper); font-weight: 700;">✓ 當前角色：[{{ currentUser.server }}][{{ currentUser.school }}][{{ currentUser.dept }}] {{ currentUser.charId }}</span>
            <span style="font-size: 0.8rem; color: var(--text-muted);">主帳號: {{ currentUser.code }}</span>
          </div>

          <!-- 點數統計區 -->
          <div class="points-summary-box glass-card" style="padding: 12px; margin-bottom: 15px; display: flex; justify-content: space-around; background: rgba(0, 229, 255, 0.02); border: 1px dashed rgba(0, 229, 255, 0.2); border-radius: 8px;">
            <div style="text-align: center;">
              <span style="font-size: 0.85rem; color: var(--text-muted); display: block;">💪 能力點數總和</span>
              <strong style="font-size: 1.4rem; color: var(--color-snipper);">+{{ totalCompletedPoints.stats }}</strong>
            </div>
            <div style="text-align: center;">
              <span style="font-size: 0.85rem; color: var(--text-muted); display: block;">✨ 技能點數總和</span>
              <strong style="font-size: 1.4rem; color: var(--color-snipper);">+{{ totalCompletedPoints.skills }}</strong>
            </div>
          </div>

          <!-- 同步與控制按鈕 -->
          <div style="display: flex; gap: 10px; margin-bottom: 15px;">
            <button class="help-btn" style="flex: 1; font-size: 0.85rem; padding: 8px;" @click="syncToCloudDirect">
              📤 同步至雲端
            </button>
            <button class="help-btn" style="flex: 1; font-size: 0.85rem; padding: 8px;" @click="syncToLocalDirect">
              📥 同步至本地端
            </button>
          </div>

          <!-- 完成任務清單 -->
          <h4 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 8px;">已完成任務清單：</h4>
          <div v-if="completedTasksList.length === 0" style="text-align: center; padding: 30px; color: var(--text-muted); font-style: italic;">
            目前尚無已標記完成的任務。
          </div>
          <div v-else style="display: flex; flex-direction: column; gap: 8px; max-height: 220px; overflow-y: auto; padding-right: 6px;">
            <div 
              v-for="task in completedTasksList" 
              :key="task.id" 
              class="glass-card" 
              style="padding: 10px 14px; border: 1px solid rgba(255,255,255,0.03); display: flex; justify-content: space-between; align-items: center; cursor: pointer; flex-shrink: 0; border-radius: 8px;"
              @click="openTaskPreview(task.id)"
              title="點擊查看詳細流程"
            >
              <div>
                <h5 style="font-size: 0.9rem; font-weight: 700; color: #fff;">{{ getDisplayName(task) }}</h5>
                <p style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">📍 接取地點: {{ task.startLocation.desc.split('(')[0].trim() }}</p>
              </div>
              <span style="font-size: 0.75rem; color: var(--color-snipper); font-weight: 700;">完成 ✓</span>
            </div>
          </div>

          <div style="display: flex; justify-content: flex-end; margin-top: 20px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 15px;">
            <button class="modal-btn cancel" @click="showCompletedTasksModal = false">關閉</button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 💬 我要回報 Modal -->
    <div class="modal-overlay" v-if="showReportModal" @click="showReportModal = false" style="z-index: 2400;">
      <div class="modal-content glass-card neon-border-snipper" @click.stop style="width: 550px; max-width: 95%;">
        <button class="modal-close-btn" @click="showReportModal = false">✕</button>
        <h3 class="modal-title neon-text-snipper" style="margin-bottom: 20px; text-align: center; font-weight: 800; font-size: 1.4rem;">💬 回報任務內容建議</h3>
        
        <div class="modal-body" v-if="reportingTask">
          <!-- 提報者資訊 (唯讀) -->
          <div class="input-group">
            <label class="input-label">提報者身分 (固定不可改)</label>
            <input 
              type="text" 
              class="modal-text-input" 
              :value="`${currentUser.code} [${currentUser.server}][${currentUser.school}][${currentUser.dept}]${currentUser.charId}`" 
              readonly 
            />
          </div>

          <!-- 任務名稱說明 -->
          <div class="input-group">
            <label class="input-label">回報對應任務</label>
            <p class="modal-read-only-box">
              {{ getDisplayName(reportingTask) }}
            </p>
          </div>

          <!-- 回報內容輸入 -->
          <div class="input-group">
            <label class="input-label">回報建議內容</label>
            <textarea 
              v-model="reportContent" 
              class="modal-text-input" 
              rows="6" 
              required
            ></textarea>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 12px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 15px;">
            <button class="modal-btn cancel" @click="showReportModal = false">取消</button>
            <button class="modal-btn confirm neon-border-snipper" @click="handleSendReport">確認送出</button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Toast 訊息通知 -->
    <transition name="toast">
      <div class="toast-message glass-card neon-border-snipper" v-if="toastMsg" style="border-color: var(--color-snipper); box-shadow: var(--glow-snipper); z-index: 4000;">
        <span class="toast-icon">🔔</span>
        <span class="toast-text">{{ toastMsg }}</span>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { collection, query, where, getDocs, getDoc, doc } from 'firebase/firestore'
import { db } from '@/firebase.js'
import LoadingOverlay from '@/components/LoadingOverlay.vue'
import { useAuth } from '@/composables/useAuth.js'

const { currentUser, isLoggedIn } = useAuth()

const searchQuery = ref('')
const isActionLoading = ref(false)
const actionLoadingMessage = ref('拉拉拉~~~')

// --- 我要回報功能相關變數與邏輯 ---
const showReportModal = ref(false)
const reportContent = ref('')
const reportingTask = ref(null)

const openReportModal = (task) => {
  reportingTask.value = task
  reportContent.value = ''
  showReportModal.value = true
}

const handleSendReport = async () => {
  if (!reportContent.value.trim()) {
    alert('請輸入回報內容！')
    return
  }
  isActionLoading.value = true
  actionLoadingMessage.value = '正在傳送回報，請稍候...'
  try {
    await sendReportToDiscord(reportingTask.value, reportContent.value)
    showReportModal.value = false
    showToast('感謝您的回報！我們會盡快處理。')
  } catch (err) {
    console.error('回報發送失敗:', err)
    alert('回報失敗：' + err.message)
  } finally {
    isActionLoading.value = false
  }
}

const sendReportToDiscord = async (task, content) => {
  const webhookUrl = import.meta.env.VITE_DISCORD_TASK_WEBHOOK_URL || ''
  if (!webhookUrl) {
    console.warn('未設定 Discord Webhook 網址，跳過發送並模擬成功')
    return
  }
  
  const reporter = `${currentUser.value.code} [${currentUser.value.server}][${currentUser.value.school}][${currentUser.value.dept}]${currentUser.value.charId}`
  const title = `任務指南 [${task.name}](${task.id}) 內容建議`
  
  const payload = {
    username: "RAN2 任務回報小助手",
    avatar_url: "https://ran2-toolkit.web.app/assets/logo.jpg",
    embeds: [{
      title: title,
      color: 16711765, // 霓虹粉紅 (#ff0055)
      fields: [
        { name: "👤 提報者", value: reporter, inline: false },
        { name: "📝 建議內容", value: content }
      ],
      timestamp: new Date().toISOString()
    }]
  }
  
  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  
  if (!res.ok) {
    throw new Error(`Discord Webhook 回傳失敗: ${res.statusText}`)
  }
}

// --- 任務指南與【不要有名字】清單資料載入與邏輯 ---
const useNoNameList = ref(isLoggedIn.value && localStorage.getItem('ran2_use_no_name_list') === 'true')

const tasks = ref([])
const hasLoadedAllTasks = ref(false)
const isLoadingAllTasks = ref(false)
const loadedImages = ref({})

const qcTasks = computed(() => {
  return tasks.value.filter(t => t.isQc10726)
})

const NO_NAME_ORDER = [
  "學院生註冊","學生主任的測驗","結界認證","通過正門的測驗","突如其來的研究論文","異象調查","定期測驗","戰爭的召喚","自我防衛","守護學院","公車司機的請求","公車司機的請求2","作業班長的請求","物理老師的呼叫","技術老師的考試","打倒冰凍可滷","清除炸彈","淨化公園","物理老師的考試","紙幣驗證","發布命令書","回收地圖","獲得特殊ID卡","前往虎令學院2樓","特遣人員的考試","特遣人員的請求","警察的委託","調查實驗體","鮮紅色的影子","請求支援","伏擊","深入死牢","實力的證明","更難突破的虛空要塞","預言家","古老的詛咒","火焰的印記","寒冰霸主的密令","機械交響曲","愛情解毒劑","破壞之力","墮星之光","深淵的序曲","激戰前的測試","228公園的治安問題(一)","228公園的治安問題(二)","第一次考試","第二次考試","第三次考試","回收卡車鑰匙","獲得汽油","修理卡車","去見老人","確認淨水池的水質","修理發電機","拿到「青」秘密據點的帶子","復原「青」秘密據點的帶子","確認／沒收走私物品","逮補走私犯","調查建築物","侵入「青」的秘密據點","搜索「青」的秘密據點","搜索「青」的秘密據點2樓","搜索「青」的秘密據點3樓","交回證據","來自青基地的援助","青基地的主事者","找尋遺物","死亡領域","尋找背包鑰匙","確認信紙","搜集珠子","找尋嫌犯","謎樣的探險家","未知的動亂","拾回舊書","測試執行能力","測試執行能力II","測試執行能力III","製作特殊戒指","鐵絲網上的小花","蒐集認證書材料","我們的約定","血荒","封印結界","蟲之血","亡羊補牢","暴動的學生","暴動的真相","瘋狂的開端","成績單","議會的委託","深牢之怨","失落的一段情","秘密生化實驗","原罪之書的關聯","小龍女的消失","追姬","龍女憐香","不遠的未來","發現青基地","龍女憐香的煩惱","九方黎生的請求(一)","蒼龍的未來","九方黎生的請求(二)","最後的機會","混亂的始源","邪惡之源-善妒之女","邪惡之源-猜忌之子","學生會長的下落","七原罪-妒忌之源","變態三男的逆襲","賊頭殺殺殺","怒殺野鴛鴦","隱隱騷動之聲","抑制噪音","探查異變","詭異的異變人種","阻止異變加劇","異界虎令的毒惡深淵","例行性訓練I","例行性訓練II","例行性訓練III","例行性訓練IV","例行性訓練V","歲月的痕跡","莫名的指責","另一個自己","災難的開始"
]

const loadAllTasks = async () => {
  if (hasLoadedAllTasks.value || isLoadingAllTasks.value) return
  isLoadingAllTasks.value = true
  isActionLoading.value = true
  actionLoadingMessage.value = '拉拉拉~~~'
  try {
    // 1. 取得資料庫上的任務最後更新時間
    let dbLastUpdated = 0
    try {
      const metaDoc = await getDoc(doc(db, 'metadata', 'tasks'))
      if (metaDoc.exists()) {
        dbLastUpdated = metaDoc.data().lastUpdated || 0
      }
    } catch (metaErr) {
      console.warn('讀取中介資料失敗，改為直接由雲端更新任務:', metaErr)
    }

    // 2. 取得本地的快取與更新時間
    const localLastUpdated = Number(localStorage.getItem('ran2_tasks_last_updated') || '0')
    const localCache = localStorage.getItem('ran2_tasks_cache')

    // 3. 比對時間與快取完整度
    if (localCache && localLastUpdated && localLastUpdated >= dbLastUpdated) {
      tasks.value = JSON.parse(localCache)
      hasLoadedAllTasks.value = true
      console.log('成功從本地快取載入官方任務！更新時間：', new Date(localLastUpdated).toLocaleString())
      return
    }

    // 4. 若本地快取不存在或資料庫有更新，則從雲端重新獲取
    const querySnapshot = await getDocs(collection(db, 'tasks'))
    const list = []
    querySnapshot.forEach(doc => {
      list.push(doc.data())
    })
    tasks.value = list
    hasLoadedAllTasks.value = true

    // 5. 寫入本地快取
    localStorage.setItem('ran2_tasks_cache', JSON.stringify(list))
    localStorage.setItem('ran2_tasks_last_updated', (dbLastUpdated || Date.now()).toString())
    console.log('成功從雲端同步官方任務，並已更新本地快取！')
  } catch (err) {
    console.error('載入全部任務失敗:', err)
    alert('載入資料失敗，請檢查網路連線！')
  } finally {
    isLoadingAllTasks.value = false
    isActionLoading.value = false
  }
}

watch(isLoggedIn, (newVal) => {
  if (!newVal) {
    useNoNameList.value = false
    localStorage.setItem('ran2_use_no_name_list', 'false')
  }
})

const toggleNoNameList = () => {
  if (!isLoggedIn.value) {
    alert('請先登入帳號以使用此功能！')
    return
  }
  useNoNameList.value = !useNoNameList.value
  localStorage.setItem('ran2_use_no_name_list', useNoNameList.value.toString())
}

// --- 折疊分組顯示邏輯 ---
const expandedCategories = ref([])
const expandedNpcs = ref([]) // 格式為 "Category_NPC"

const groupedTasks = computed(() => {
  const groups = {}
  filteredTasks.value.forEach(task => {
    const cat = task.qc10726?.category || '其他'
    const npc = task.qc10726?.npc || '未知NPC'
    
    if (!groups[cat]) {
      groups[cat] = {}
    }
    if (!groups[cat][npc]) {
      groups[cat][npc] = []
    }
    groups[cat][npc].push(task)
  })
  return groups
})

const toggleCategory = (cat) => {
  const idx = expandedCategories.value.indexOf(cat)
  if (idx > -1) {
    expandedCategories.value.splice(idx, 1)
  } else {
    expandedCategories.value.push(cat)
  }
}

const toggleNpc = (cat, npc) => {
  const key = `${cat}_${npc}`
  const idx = expandedNpcs.value.indexOf(key)
  if (idx > -1) {
    expandedNpcs.value.splice(idx, 1)
  } else {
    expandedNpcs.value.push(key)
  }
}

// 搜尋文字有輸入時，自動展開所有匹配任務的節點
watch(searchQuery, (newQuery) => {
  if (newQuery.trim() && useNoNameList.value) {
    const catsToExpand = new Set()
    const npcsToExpand = new Set()
    
    filteredTasks.value.forEach(task => {
      const cat = task.qc10726?.category
      const npc = task.qc10726?.npc
      if (cat) catsToExpand.add(cat)
      if (cat && npc) npcsToExpand.add(`${cat}_${npc}`)
    })
    
    expandedCategories.value = Array.from(catsToExpand)
    expandedNpcs.value = Array.from(npcsToExpand)
  }
})



const getDisplayName = (task) => {
  if (!task) return ''
  return (task.customizedName && task.customizedName.trim()) ? task.customizedName : task.name
}

const selectedTask = ref(tasks.value[0])
const showMobileDetail = ref(false)
const previewTask = ref(null)
const showPreviewModal = ref(false)

const tasksMap = computed(() => {
  const allTasks = [...tasks.value, ...qcTasks.value]
  return new Map(allTasks.map(t => [t.id, t]))
})

// 篩選與搜尋狀態
const rewardFilter = ref('全部')
const schoolFilter = ref('全部')
const deptFilter = ref('全部')
const isMobileFiltersExpanded = ref(false)

// 條件過濾邏輯
const filteredTasks = computed(() => {
  if (useNoNameList.value) {
    // 【不要有名字】清單過濾邏輯
    let list = qcTasks.value.filter(task => {
      // 1. 學院篩選：共通 or 當前登入者學院
      const userSchool = currentUser.value?.school
      if (task.school !== '共通' && task.school !== userSchool) return false

      // 2. 部門篩選：共通 or 當前登入者部門
      const userDept = currentUser.value?.dept
      if (task.department !== '共通' && task.department !== userDept) return false

      // 3. 文字模糊搜尋
      const query = searchQuery.value.trim().toLowerCase()
      if (!query) return true

      const matchName = task.name.toLowerCase().includes(query) ||
                        (task.customizedName && task.customizedName.toLowerCase().includes(query))
      const matchLocation = task.startLocation?.desc?.toLowerCase().includes(query) || false
      const matchRequirements = task.requirements?.some(req => {
        if (req.url) return false
        return req.desc.toLowerCase().includes(query)
      }) || false
      const matchSteps = task.steps?.some(step => {
        return step.desc.toLowerCase().includes(query)
      }) || false

      return matchName || matchLocation || matchRequirements || matchSteps
    })

    // 4. 按固定順序排序
    list.sort((a, b) => {
      const idxA = NO_NAME_ORDER.indexOf(a.name)
      const idxB = NO_NAME_ORDER.indexOf(b.name)
      return (idxA === -1 ? 9999 : idxA) - (idxB === -1 ? 9999 : idxB)
    })
    
    return list
  } else {
    // 預設清單過濾邏輯
    return tasks.value.filter(task => {
      // 1. 任務獎勵條件篩選
      const hasSkill = task.rewards.skillPoints > 0
      const hasStats = task.rewards.statsPoints > 0
      
      if (rewardFilter.value === 'skills' && !hasSkill) return false
      if (rewardFilter.value === 'stats' && !hasStats) return false
      if (rewardFilter.value === 'both' && (!hasSkill || !hasStats)) return false

      // 1.2 學院與部門篩選
      if (schoolFilter.value !== '全部' && task.school !== schoolFilter.value) return false
      if (deptFilter.value !== '全部' && task.department !== deptFilter.value) return false

      // 2. 文字模糊搜尋
      const query = searchQuery.value.trim().toLowerCase()
      if (!query) return true

      // A. 任務名稱
      const matchName = task.name.toLowerCase().includes(query) ||
                        (task.customizedName && task.customizedName.toLowerCase().includes(query))

      // B. 接取地點描述
      const matchLocation = task.startLocation?.desc?.toLowerCase().includes(query) || false

      // C. 接取條件
      const matchRequirements = task.requirements?.some(req => {
        if (req.url) return false
        return req.desc.toLowerCase().includes(query)
      }) || false

      // D. 任務流程
      const matchSteps = task.steps?.some(step => {
        return step.desc.toLowerCase().includes(query)
      }) || false

      return matchName || matchLocation || matchRequirements || matchSteps
    })
  }
})

// --- 分頁邏輯 ---
const currentPage = ref(1)
const pageSize = 5

const totalPages = computed(() => {
  return Math.ceil(filteredTasks.value.length / pageSize)
})

const paginatedTasks = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredTasks.value.slice(start, start + pageSize)
})

const pageNumbers = computed(() => {
  const current = currentPage.value
  const total = totalPages.value
  const delta = 3
  const range = []
  
  let start = Math.max(1, current - delta)
  let end = Math.min(total, current + delta)
  
  for (let i = start; i <= end; i++) {
    range.push(i)
  }
  return range
})

// 當任何篩選條件變動時，重置當前頁碼為 1
watch([rewardFilter, schoolFilter, deptFilter, searchQuery, useNoNameList], () => {
  currentPage.value = 1
})

// 監聽篩選清單，防制 select 斷頭
watch(filteredTasks, (newVal) => {
  if (newVal.length > 0) {
    const stillExists = newVal.some(t => t.id === selectedTask.value?.id)
    if (!stillExists) {
      selectedTask.value = newVal[0]
    }
  } else {
    selectedTask.value = null
  }
})

const selectTask = (task) => {
  selectedTask.value = task
  if (window.innerWidth <= 900) {
    showMobileDetail.value = true
  }
}

const selectTaskById = (id) => {
  const found = tasksMap.value.get(id)
  if (found) {
    selectedTask.value = found
    if (window.innerWidth <= 900) {
      showMobileDetail.value = true
    }
  }
}

const openTaskPreview = (id) => {
  const found = tasksMap.value.get(id)
  if (found) {
    previewTask.value = found
    showPreviewModal.value = true
  }
}



const closeMobileDetail = () => {
  showMobileDetail.value = false
}

// 取得接取 NPC
const getTaskGiver = (task) => {
  const desc = task.startLocation.desc
  const match = desc.match(/\(NPC:\s*([^)]+)\)/)
  return match ? match[1] : desc
}

// 扁平化獎勵清單
const getRewardsList = (task) => {
  const list = []
  if (task.rewards.exp > 0) {
    list.push({ icon: '📈', name: `經驗值 +${task.rewards.exp}`, type: 'point' })
  }
  if (task.rewards.statsPoints > 0) {
    list.push({ icon: '💪', name: `能力點數 +${task.rewards.statsPoints}`, type: 'point' })
  }
  if (task.rewards.skillPoints > 0) {
    list.push({ icon: '✨', name: `技能點數 +${task.rewards.skillPoints}`, type: 'point' })
  }
  if (task.rewards.customRewards) {
    task.rewards.customRewards.forEach(r => {
      list.push({ icon: '🎁', name: r.desc, type: 'box' })
    })
  }
  return list
}

// --- 「我的完成任務」功能相關變數 ---
const showCompletedTasksModal = ref(false)

// 當前角色已完成的任務 ID 陣列
const myCompletedTaskIds = ref([])



// 本地端儲存鍵
const COMPLETED_PREFIX = 'ran2_tasks_completed_'
const MOCK_CLOUD_KEY = 'ran2_mock_cloud_completed_tasks'

// sha256 雜湊
const sha256 = async (message) => {
  const msgBuffer = new TextEncoder().encode(message)
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

// 載入當前角色與完成清單
const loadCompletedTasksData = () => {
  if (isLoggedIn.value && currentUser.value) {
    const server = currentUser.value.server
    const charId = currentUser.value.charId
    const completedData = localStorage.getItem(`${COMPLETED_PREFIX}${server}_${charId}`)
    myCompletedTaskIds.value = completedData ? JSON.parse(completedData) : []
  } else {
    myCompletedTaskIds.value = []
  }
}

watch(currentUser, () => {
  loadCompletedTasksData()
}, { immediate: true })

// 切換任務完成狀態
const toggleTaskCompleted = (taskId) => {
  if (!isLoggedIn.value || !currentUser.value) {
    alert('請先登入帳號！')
    return
  }
  const idx = myCompletedTaskIds.value.indexOf(taskId)
  if (idx > -1) {
    myCompletedTaskIds.value.splice(idx, 1)
  } else {
    // 完成非共通且不符合自身學院、部門的任務時，提示警告
    const task = tasksMap.value.get(taskId)
    if (task) {
      const isSchoolMatch = task.school === '共通' || task.school === currentUser.value.school
      const isDeptMatch = task.department === '共通' || task.department === currentUser.value.dept
      
      if (!isSchoolMatch || !isDeptMatch) {
        const warningMsg = `【提示警告】\n此任務不屬於您的所屬學院/部門：\n` +
          `任務學院：${task.school} (您：${currentUser.value.school || '無'})\n` +
          `任務部門：${task.department} (您：${currentUser.value.dept || '無'})\n\n` +
          `確定仍要標記為已完成嗎？`
        if (!confirm(warningMsg)) {
          return
        }
      }
    }
    myCompletedTaskIds.value.push(taskId)
  }
  localStorage.setItem(
    `${COMPLETED_PREFIX}${currentUser.value.server}_${currentUser.value.charId}`,
    JSON.stringify(myCompletedTaskIds.value)
  )
}

// 已完成的任務詳細列表 (包含預設與不要有名字清單中已載入的任務)
const completedTasksList = computed(() => {
  const allTasks = [...tasks.value, ...qcTasks.value]
  return allTasks.filter(t => myCompletedTaskIds.value.includes(t.id))
})

// 計算能力點數與技能點數總和
const totalCompletedPoints = computed(() => {
  let stats = 0
  let skills = 0
  completedTasksList.value.forEach(t => {
    stats += t.rewards.statsPoints || 0
    skills += t.rewards.skillPoints || 0
  })
  return { stats, skills }
})

// 顯示 Toast 訊息
const toastMsg = ref('')
const showToast = (msg) => {
  toastMsg.value = msg
  setTimeout(() => {
    toastMsg.value = ''
  }, 3000)
}

// 雲端同步邏輯
const syncToCloudDirect = async () => {
  if (!isLoggedIn.value || !currentUser.value) {
    alert('請先登入角色！')
    return
  }
  
  isActionLoading.value = true
  actionLoadingMessage.value = '正在上傳進度至雲端...'
  await delay(1200)
  
  try {
    const key = `${currentUser.value.server}_${currentUser.value.charId}`
    const cloud = JSON.parse(localStorage.getItem(MOCK_CLOUD_KEY) || '{}')
    
    cloud[key] = {
      server: currentUser.value.server,
      charId: currentUser.value.charId,
      taskIds: JSON.parse(JSON.stringify(myCompletedTaskIds.value)),
      totalStatsPoints: totalCompletedPoints.value.stats,
      totalSkillPoints: totalCompletedPoints.value.skills,
      updatedAt: Date.now()
    }
    
    localStorage.setItem(MOCK_CLOUD_KEY, JSON.stringify(cloud))
    showToast('進度成功備份至雲端！')
  } catch (err) {
    console.error(err)
    alert('同步失敗！')
  } finally {
    isActionLoading.value = false
  }
}

const syncToLocalDirect = async () => {
  if (!isLoggedIn.value || !currentUser.value) {
    alert('請先登入角色！')
    return
  }
  
  isActionLoading.value = true
  actionLoadingMessage.value = '正在從雲端拉取進度...'
  await delay(1200)
  
  try {
    const key = `${currentUser.value.server}_${currentUser.value.charId}`
    const cloud = JSON.parse(localStorage.getItem(MOCK_CLOUD_KEY) || '{}')
    const record = cloud[key]
    
    if (!record) {
      alert('雲端無此角色的同步紀錄！')
      return
    }
    
    // 覆蓋本地此角色資料
    localStorage.setItem(`${COMPLETED_PREFIX}${key}`, JSON.stringify(record.taskIds))
    loadCompletedTasksData()
    showToast('已成功從雲端同步最新進度！')
  } catch (err) {
    console.error(err)
    alert('載入失敗！')
  } finally {
    isActionLoading.value = false
  }
}

// 載入雲端真實任務指南資料
loadAllTasks()
</script>

<style scoped>
.no-name-tag {
  background: rgba(204, 0, 255, 0.12);
  color: #e500ff;
  border: 1px solid rgba(204, 0, 255, 0.45);
  padding: 1px 6px;
  font-size: 0.7rem;
  border-radius: 4px;
  font-weight: 700;
  margin-left: 8px;
  white-space: nowrap;
  text-shadow: 0 0 5px rgba(229, 0, 255, 0.3);
  display: inline-block;
  vertical-align: middle;
}

.no-name-banner {
  background: rgba(204, 0, 255, 0.05) !important;
  border: 1px dashed rgba(204, 0, 255, 0.3) !important;
  padding: 12px 16px;
  border-radius: 8px;
  box-shadow: inset 0 0 10px rgba(204, 0, 255, 0.05);
}
.banner-title {
  color: #e500ff;
  font-weight: 800;
  font-size: 0.95rem;
  margin-bottom: 6px;
  text-shadow: 0 0 8px rgba(229, 0, 255, 0.2);
}
.banner-meta {
  font-size: 0.8rem;
  color: var(--text-muted);
  display: flex;
  gap: 8px;
  align-items: center;
}
.meta-separator {
  opacity: 0.3;
}

.tasks-page {
  animation: fadeIn 0.4s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.page-header {
  margin-bottom: 30px;
}

.page-header h2 {
  font-size: 2rem;
  font-weight: 800;
  margin-bottom: 8px;
}

.subtitle {
  color: var(--text-muted);
}

/* 操作列 */
.action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 25px;
  margin-bottom: 30px;
}

.filter-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.no-name-list-toggle-btn {
  background: rgba(8, 9, 13, 0.6);
  border: 1px solid rgba(0, 229, 255, 0.25);
  color: var(--text-muted);
  padding: 8px 16px;
  border-radius: 6px;
  outline: none;
  font-weight: 700;
  cursor: url('/assets/ran2-cursor.cur'), pointer;
  transition: all 0.3s ease;
  display: inline-flex;
  align-items: center;
}

.no-name-list-toggle-btn:hover {
  border-color: rgba(0, 229, 255, 0.6);
  box-shadow: 0 0 10px rgba(0, 229, 255, 0.3);
  color: #fff;
}

.no-name-list-toggle-btn.active-no-name {
  background: rgba(0, 229, 255, 0.15);
  border-color: #00e5ff;
  color: #00e5ff;
  box-shadow: 0 0 15px rgba(0, 229, 255, 0.4), inset 0 0 10px rgba(0, 229, 255, 0.2);
  text-shadow: 0 0 5px rgba(0, 229, 255, 0.5);
}

.category-group {
  margin-bottom: 8px;
}

.category-header {
  display: flex;
  align-items: center;
  padding: 10px 14px;
  cursor: pointer;
  background: rgba(0, 229, 255, 0.03);
  border: 1px solid rgba(0, 229, 255, 0.15);
  border-radius: 8px;
  transition: all 0.25s ease;
  user-select: none;
}

.category-header:hover {
  background: rgba(0, 229, 255, 0.08);
  border-color: rgba(0, 229, 255, 0.4);
  box-shadow: 0 0 10px rgba(0, 229, 255, 0.15);
}

.arrow-icon, .arrow-icon-sub {
  font-size: 0.7rem;
  margin-right: 8px;
  color: rgba(255, 255, 255, 0.4);
  transition: transform 0.2s;
  width: 12px;
  display: inline-block;
}

.category-title {
  font-weight: 800;
  color: #fff;
  font-size: 0.95rem;
}

.npcs-list {
  padding-left: 12px;
  border-left: 1px dashed rgba(0, 229, 255, 0.15);
  margin: 6px 0 8px 12px;
}

.npc-group {
  margin-bottom: 6px;
}

.npc-header {
  display: flex;
  align-items: center;
  padding: 6px 10px;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.03);
  border-radius: 6px;
  font-size: 0.88rem;
  transition: all 0.2s;
  user-select: none;
}

.npc-header:hover {
  background: rgba(255, 255, 255, 0.06);
  color: #00e5ff;
}

.npc-name {
  font-weight: 700;
  color: var(--text-muted);
}

.npc-tasks {
  padding-left: 16px;
  margin-top: 4px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* 緊湊化折疊任務卡片，以容納大量數據 */
.grouped-task-card {
  padding: 8px 12px !important;
  border-radius: 6px !important;
  border: 1px solid rgba(255, 255, 255, 0.04) !important;
}

.count-badge, .count-badge-sub {
  margin-left: auto;
  font-size: 0.75rem;
  padding: 1px 6px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-muted);
  font-weight: 700;
}

.category-header:hover .count-badge {
  background: rgba(0, 229, 255, 0.2);
  color: #00e5ff;
}

.report-btn {
  background: rgba(255, 0, 85, 0.08);
  border: 1px solid rgba(255, 0, 85, 0.25);
  color: #ff0055;
  padding: 8px 16px;
  border-radius: 6px;
  font-weight: 700;
  cursor: url('/assets/ran2-cursor.cur'), pointer;
  transition: all 0.3s ease;
  box-shadow: 0 0 5px rgba(255, 0, 85, 0.05);
}

.report-btn:hover:not(:disabled) {
  background: rgba(255, 0, 85, 0.15);
  border-color: #ff0055;
  box-shadow: 0 0 12px rgba(255, 0, 85, 0.3);
  text-shadow: 0 0 5px rgba(255, 0, 85, 0.5);
  color: #fff;
}

.report-btn:disabled {
  background: rgba(255, 255, 255, 0.03) !important;
  border-color: rgba(255, 255, 255, 0.08) !important;
  color: var(--text-muted) !important;
  cursor: not-allowed !important;
  box-shadow: none !important;
  text-shadow: none !important;
}

.select-label {
  font-size: 0.9rem;
  color: var(--text-muted);
  font-weight: 700;
}

.server-select, .search-input {
  background: rgba(8, 9, 13, 0.6);
  border: 1px solid rgba(255,255,255,0.1);
  color: #fff;
  padding: 8px 12px;
  border-radius: 6px;
  outline: none;
  font-weight: 700;
  cursor: url('/assets/ran2-cursor.cur'), text;
}
.server-select {
  cursor: url('/assets/ran2-cursor.cur'), pointer;
}
.search-box {
  display: flex;
  gap: 8px;
}
.search-btn {
  background: rgba(8, 9, 13, 0.6);
  border: 1px solid rgba(255,255,255,0.1);
  color: #fff;
  border-radius: 6px;
  padding: 0 12px;
  cursor: url('/assets/ran2-cursor.cur'), pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
}
.search-btn:hover {
  background: rgba(255,255,255,0.1);
  border-color: rgba(255,255,255,0.3);
  transform: translateY(-2px);
}
.search-input {
  min-width: 200px;
}
.search-input:focus, .server-select:focus {
  border-color: var(--color-warrior);
}
.mobile-filter-toggle {
  display: none;
}

.tasks-layout {
  display: grid;
  grid-template-columns: 350px 1fr;
  gap: 30px;
  align-items: start;
}

.tasks-list-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 494px; /* 固定 5 筆卡片與其間距的最低高度，防止翻頁跳動 */
}

.task-card {
  cursor: url('/assets/ran2-cursor.cur'), pointer;
  border-left: 4px solid transparent;
  height: 86px; /* 固定卡片高度 */
  padding: 14px 16px !important; /* 精確控制內邊距 */
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: center;
  overflow: hidden;
}

.task-card:hover {
  border-left: 4px solid rgba(0, 229, 255, 0.4);
}

.task-card.active-task {
  border-color: var(--color-snipper);
  background: var(--bg-card-hover);
  box-shadow: 0 0 15px rgba(0, 229, 255, 0.15);
}

.task-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0px; /* 卡片內部緊湊化，移除底部間距 */
}

.task-level {
  font-size: 0.75rem;
  background: rgba(0, 229, 255, 0.15);
  color: var(--color-snipper);
  padding: 2px 8px;
  border-radius: 20px;
  font-weight: 700;
}

.task-card-title {
  font-size: 1.05rem;
  font-weight: 700;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.task-card-giver {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-top: 6px;
  margin-bottom: 0px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.task-card-rewards-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.reward-preview-badge {
  font-size: 0.75rem;
  background: rgba(255,255,255,0.04);
  padding: 2px 6px;
  border-radius: 4px;
  color: var(--text-muted);
}

/* 右側詳細面板 */
.task-detail-panel {
  padding: 30px;
  min-height: 600px;
}

.detail-header {
  margin-bottom: 20px;
}

.detail-title-row {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 12px;
}

.detail-level-badge {
  font-size: 0.85rem;
  background: var(--color-snipper);
  color: #000;
  font-weight: 800;
  padding: 4px 12px;
  border-radius: 4px;
  box-shadow: 0 0 10px rgba(0, 229, 255, 0.3);
}

.detail-title {
  font-size: 1.8rem;
  font-weight: 800;
}

.task-badges {
  display: flex;
  gap: 8px;
}

.badge-school, .badge-dept {
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 700;
  border: 1px solid rgba(255,255,255,0.15);
  text-shadow: none;
}

/* 學院顏色 */
.school-共通 { background: rgba(255, 255, 255, 0.1); color: #ccc; }
.school-聖門 { background: rgba(0, 255, 102, 0.15); color: #00ff66; border-color: rgba(0, 255, 102, 0.3); }
.school-鳳凰 { background: rgba(255, 30, 80, 0.15); color: #ff1e50; border-color: rgba(255, 30, 80, 0.3); }
.school-玄嚴 { background: rgba(0, 220, 255, 0.15); color: #00dcff; border-color: rgba(0, 220, 255, 0.3); }

/* 部門顏色 */
.dept-共通 { background: rgba(255, 255, 255, 0.1); color: #ccc; }
.dept-劍道部 { background: rgba(204, 0, 255, 0.15); color: #cc00ff; border-color: rgba(204, 0, 255, 0.3); }
.dept-格鬥部 { background: rgba(255, 153, 0, 0.15); color: #ff9900; border-color: rgba(255, 153, 0, 0.3); }
.dept-氣功部 { background: rgba(0, 255, 204, 0.15); color: #00ffcc; border-color: rgba(0, 255, 204, 0.3); }
.dept-弓箭部 { background: rgba(255, 255, 0, 0.15); color: #ffff00; border-color: rgba(255, 255, 0, 0.3); }

.detail-giver {
  color: var(--text-muted);
  font-size: 0.95rem;
}

.divider {
  border: 0;
  height: 1px;
  background: linear-gradient(90deg, rgba(255,255,255,0.1), transparent);
  margin: 20px 0;
}

.detail-section {
  margin-bottom: 28px;
}

.section-title {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text-main);
  margin-bottom: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  border-left: 3px solid var(--color-snipper);
  padding-left: 10px;
}

/* 地圖示意 */
.map-container {
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,0.1);
  max-height: 240px;
}

.map-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.map-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  background: linear-gradient(to top, rgba(0,0,0,0.85), transparent);
  padding: 15px;
}

.coords-tag {
  color: var(--color-snipper);
  font-weight: 700;
  font-size: 0.9rem;
}

/* 流程時間軸 */
.timeline {
  display: flex;
  flex-direction: column;
  gap: 16px;
  position: relative;
  padding-left: 20px;
}

.timeline::before {
  content: '';
  position: absolute;
  left: 30px;
  top: 10px;
  bottom: 10px;
  width: 2px;
  background: rgba(255, 255, 255, 0.05);
}

.timeline-item {
  display: flex;
  gap: 20px;
  position: relative;
}

.timeline-badge {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #121622;
  border: 2px solid var(--color-snipper);
  color: var(--color-snipper);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 0.8rem;
  z-index: 2;
  box-shadow: 0 0 8px rgba(0, 229, 255, 0.4);
}

.timeline-content {
  flex: 1;
  background: rgba(255, 255, 255, 0.02);
  padding: 12px 16px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.03);
}

.step-title {
  font-size: 0.95rem;
  font-weight: 700;
  margin-bottom: 4px;
}

.step-desc {
  font-size: 0.85rem;
  color: var(--text-muted);
  line-height: 1.4;
}

/* 獎勵區塊 */
.rewards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

.reward-item {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(255, 255, 255, 0.03);
  padding: 12px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.reward-icon {
  font-size: 1.8rem;
}

.reward-info {
  display: flex;
  flex-direction: column;
}

.reward-val {
  font-weight: 700;
  font-size: 1.1rem;
}

.reward-name {
  font-size: 0.85rem;
  color: var(--text-muted);
}

.reward-link-btn {
  color: var(--color-box);
  text-decoration: none;
  font-weight: 700;
  font-size: 0.95rem;
  transition: all 0.25s ease;
  text-shadow: 0 0 8px rgba(200, 0, 255, 0.2);
}

.reward-link-btn:hover {
  text-shadow: 0 0 12px rgba(200, 0, 255, 0.6);
  color: #fff;
}

.link-arrow {
  display: inline-block;
  transition: transform 0.25s ease;
}

.reward-link-btn:hover .link-arrow {
  transform: translate(2px, -2px);
}

/* 小技巧與注意事項 */
.detail-tips-warnings {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-top: 30px;
}

.tips-box {
  background: rgba(0, 229, 255, 0.03);
  border: 1px solid rgba(0, 229, 255, 0.1);
  padding: 16px;
  border-radius: 8px;
}

.tips-box h4 {
  color: var(--color-snipper);
  margin-bottom: 8px;
}

.tips-box p, .warnings-box p {
  font-size: 0.85rem;
  color: var(--text-muted);
  line-height: 1.5;
}

.warnings-box {
  background: rgba(255, 0, 85, 0.03);
  border: 1px solid rgba(255, 0, 85, 0.1);
  padding: 16px;
  border-radius: 8px;
}

.warnings-box h4 {
  color: var(--color-warrior);
  margin-bottom: 8px;
}

/* 響應式：手機版 (iPhone 17) */
@media (max-width: 900px) {
  .mobile-filter-toggle {
    display: block;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255,255,255,0.1);
    color: #fff;
    padding: 10px 16px;
    border-radius: 6px;
    width: 100%;
    font-weight: 700;
    cursor: url('/assets/ran2-cursor.cur'), pointer;
    text-align: center;
  }
  .action-bar {
    flex-direction: column;
    align-items: stretch;
    gap: 14px;
    padding: 15px;
  }
  .filter-controls {
    display: none;
    flex-direction: column;
    align-items: stretch;
  }
  .filter-controls.expanded {
    display: flex;
  }

  .tasks-layout {
    grid-template-columns: 1fr;
  }

  .task-detail-panel {
    display: none; /* 在手機版隱藏右側面板，改用 drawer */
  }

  /* 手機版抽屜樣式 */
  .mobile-drawer-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0,0,0,0.8);
    backdrop-filter: blur(4px);
    z-index: 1000;
    display: flex;
    justify-content: center;
    align-items: flex-end;
  }

  .mobile-drawer {
    width: 100%;
    max-height: 80vh;
    border-radius: 20px 20px 0 0;
    background: #0d0f17;
    border-top: 2px solid var(--color-snipper);
    padding: 20px;
    overflow-y: auto;
    position: relative;
    animation: slideUp 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  }

  @keyframes slideUp {
    from { transform: translateY(100%); }
    to { transform: translateY(0); }
  }

  .close-btn {
    position: absolute;
    top: 15px;
    right: 15px;
    background: transparent;
    border: none;
    color: #fff;
    font-size: 1.5rem;
    cursor: pointer;
  }

  .drawer-content {
    margin-top: 20px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
}

/* 接取條件、清單與步驟截圖樣式 */
.detail-requirements {
  margin-top: 10px;
  font-size: 0.95rem;
  color: var(--text-muted);
}

.req-link {
  color: var(--color-snipper);
  text-decoration: none;
  font-weight: 700;
  border-bottom: 1px dashed var(--color-snipper);
  transition: all 0.2s ease;
  cursor: url('/assets/ran2-cursor.cur'), pointer;
}

.req-link:hover {
  color: #fff;
  border-bottom-color: #fff;
  text-shadow: 0 0 8px var(--color-snipper);
}

.step-img {
  margin-top: 12px;
  border-radius: 8px;
  max-width: 100%;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.bullet-list {
  list-style: disc;
  padding-left: 20px;
  margin: 0;
}

.bullet-list li {
  font-size: 0.85rem;
  color: var(--text-muted);
  line-height: 1.6;
  margin-bottom: 6px;
}

.bullet-list li:last-child {
  margin-bottom: 0;
}

/* Modal 彈窗樣式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(6px);
  z-index: 2000;
  display: flex;
  justify-content: center;
  align-items: center;
}

.modal-content {
  width: 650px;
  max-width: 90%;
  max-height: 85vh;
  background: rgba(13, 15, 23, 0.95);
  border: 1px solid rgba(0, 229, 255, 0.25);
  padding: 24px;
  border-radius: 16px;
  position: relative;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.8), 0 0 30px rgba(0, 229, 255, 0.1);
}

.modal-close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-size: 1.5rem;
  cursor: url('/assets/ran2-cursor.cur'), pointer;
  transition: color 0.2s ease;
  z-index: 10;
}

.modal-close-btn:hover {
  color: #fff;
}

.modal-body {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.modal-scroll-area {
  overflow-y: auto;
  flex: 1;
  padding-right: 8px;
  margin-top: 15px;
}

.modal-scroll-area::-webkit-scrollbar {
  width: 6px;
}

.modal-scroll-area::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.02);
}

.modal-scroll-area::-webkit-scrollbar-thumb {
  background: rgba(0, 229, 255, 0.25);
  border-radius: 3px;
}

.modal-scroll-area::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 229, 255, 0.45);
}

/* 禮盒預覽 Modal 內容物清單樣式 */
.stats-list {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stat-li {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(255, 255, 255, 0.02);
  padding: 8px 14px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.03);
}

.stat-bullet {
  font-size: 1.2rem;
}

.stat-text {
  font-size: 0.95rem;
  font-weight: 600;
}

.rate-val {
  font-weight: 700;
  margin-left: 4px;
  opacity: 0.8;
}

/* 品質文字顏色 */
.common-text { color: #f0f3f8; }
.uncommon-text { color: #00ff66; }
.rare-text { color: #00e5ff; }
.epic-text { color: #bd00ff; }
.legendary-text { color: #ff9900; }

/* 我的完成任務按鈕與表單樣式 */
.help-btn {
  background: rgba(8, 9, 13, 0.6);
  border: 1px solid rgba(0, 229, 255, 0.2);
  color: #fff;
  padding: 8px 16px;
  border-radius: 6px;
  font-weight: 700;
  cursor: url('/assets/ran2-cursor.cur'), pointer;
  transition: all 0.3s;
  box-shadow: 0 0 10px rgba(0, 229, 255, 0.05);
}
.help-btn:hover {
  background: rgba(255,255,255,0.05);
  border-color: var(--color-snipper);
  text-shadow: 0 0 8px var(--color-snipper);
  transform: translateY(-2px);
  box-shadow: 0 0 15px rgba(0, 229, 255, 0.15);
}

.modal-btn {
  background: rgba(8, 9, 13, 0.8);
  border: 1px solid rgba(255,255,255,0.1);
  color: #fff;
  padding: 8px 20px;
  border-radius: 6px;
  font-weight: 700;
  cursor: url('/assets/ran2-cursor.cur'), pointer;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}
.modal-btn.confirm {
  border-color: var(--color-snipper);
  background: rgba(0, 229, 255, 0.08);
  color: #fff;
  text-shadow: 0 0 8px var(--color-snipper);
  box-shadow: 0 0 10px rgba(0, 229, 255, 0.1);
}
.modal-btn.confirm:hover {
  background: rgba(0, 229, 255, 0.15);
  box-shadow: 0 0 15px rgba(0, 229, 255, 0.3);
  transform: translateY(-2px);
}
.modal-btn.cancel {
  border-color: rgba(255,255,255,0.1);
  color: var(--text-muted);
}
.modal-btn.cancel:hover {
  background: rgba(255,255,255,0.05);
  border-color: rgba(255,255,255,0.3);
  color: #fff;
  transform: translateY(-2px);
}

.modal-btn:disabled, .help-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed !important;
  transform: none !important;
}

/* Toast Message */
.toast-message {
  position: fixed;
  bottom: 40px;
  right: 40px;
  padding: 16px 24px;
  z-index: 3000;
  background: rgba(8, 9, 13, 0.95);
  display: flex;
  align-items: center;
  gap: 12px;
  border-radius: 6px;
}
.toast-icon {
  font-size: 1.4rem;
}
.toast-text {
  font-weight: 700;
  font-size: 0.95rem;
  color: #fff;
}
.toast-enter-active, .toast-leave-active {
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}
.toast-enter-from, .toast-leave-to {
  transform: translateY(30px);
  opacity: 0;
}

/* 已完成卡片與 Badge 樣式 */
.completed-badge {
  font-size: 0.75rem;
  background: rgba(0, 229, 255, 0.1);
  border: 1px solid var(--color-snipper);
  color: var(--color-snipper);
  padding: 2px 8px;
  border-radius: 20px;
  font-weight: 700;
  white-space: nowrap;
  box-shadow: 0 0 8px rgba(0, 229, 255, 0.2);
}

.task-card.completed-task-card {
  border-right: 3px solid rgba(0, 229, 255, 0.3);
}

/* 💬 回報 Modal 版面與輸入框美化 */
.input-group {
  margin-bottom: 22px;
  text-align: left;
}

.input-label {
  display: block;
  font-size: 0.85rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.55);
  margin-bottom: 10px; /* 增加標題與文字框的間距 */
  letter-spacing: 0.5px;
}

.modal-text-input {
  width: 100%;
  background: rgba(13, 14, 19, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.16); /* 明確清晰的輸入框邊界 */
  color: #ffffff;
  border-radius: 8px;
  padding: 12px 16px;
  font-size: 0.95rem;
  font-family: inherit;
  line-height: 1.5;
  outline: none;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  box-sizing: border-box;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  resize: vertical;
}

.modal-text-input::placeholder {
  color: rgba(255, 255, 255, 0.3);
  font-weight: 500;
}

.modal-text-input:hover {
  border-color: rgba(255, 0, 85, 0.45); /* Hover 時清晰的粉色邊緣 */
  background: rgba(18, 20, 27, 0.9);
}

.modal-text-input:focus {
  border-color: #ff0055;
  background: rgba(10, 11, 15, 0.98);
  box-shadow: 0 0 12px rgba(255, 0, 85, 0.35), inset 0 2px 4px rgba(0, 0, 0, 0.6);
}

/* 唯讀輸入框 */
.modal-text-input[readonly] {
  background: rgba(255, 255, 255, 0.02) !important;
  border: 1px solid rgba(255, 255, 255, 0.06) !important; /* 清晰的唯讀邊界 */
  color: rgba(255, 0, 85, 0.75) !important;
  font-weight: 700;
  cursor: not-allowed;
  box-shadow: none !important;
  text-shadow: 0 0 5px rgba(255, 0, 85, 0.3);
}

/* 任務名稱說明唯讀區塊 */
.modal-read-only-box {
  font-size: 0.95rem;
  color: #ffffff;
  font-weight: 700;
  margin: 0;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.08); /* 細緻但清晰的邊界 */
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.3);
}

/* 📷 圖片被動式載入按鈕樣式 */
.lazy-load-img-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 140px;
  background: rgba(255, 255, 255, 0.015);
  border: 1px dashed rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.7);
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: url('/assets/ran2-cursor.cur'), pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  box-sizing: border-box;
  margin: 10px 0;
}

.lazy-load-img-btn:hover {
  background: rgba(0, 229, 255, 0.04);
  border: 1px solid rgba(0, 229, 255, 0.5);
  color: #00e5ff;
  box-shadow: 0 0 12px rgba(0, 229, 255, 0.15);
  text-shadow: 0 0 3px rgba(0, 229, 255, 0.3);
}

.lazy-load-img-btn.steps-lazy-btn {
  min-height: 80px;
  max-width: 350px;
  font-size: 0.88rem;
  margin: 8px 0 0 0;
}

/* 🔢 分頁控制項樣式 */
.pagination-container {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 25px;
  padding: 12px 16px;
  background: rgba(13, 14, 19, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  backdrop-filter: blur(4px);
}

.page-btn {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #fff;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 0.88rem;
  font-weight: 700;
  cursor: url('/assets/ran2-cursor.cur'), pointer;
  transition: all 0.25s ease;
  min-width: 36px;
  display: inline-flex;
  justify-content: center;
  align-items: center;
}

.page-btn:hover:not(:disabled) {
  background: rgba(0, 229, 255, 0.08);
  border-color: #00e5ff;
  color: #00e5ff;
  box-shadow: 0 0 8px rgba(0, 229, 255, 0.2);
  text-shadow: 0 0 3px rgba(0, 229, 255, 0.3);
}

.page-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
  background: transparent;
  border-color: rgba(255, 255, 255, 0.03);
}

.page-btn.active-page {
  background: rgba(0, 229, 255, 0.15);
  border-color: #00e5ff;
  color: #00e5ff;
  box-shadow: 0 0 10px rgba(0, 229, 255, 0.3);
  text-shadow: 0 0 5px rgba(0, 229, 255, 0.5);
}

.page-info {
  font-size: 0.85rem;
  color: var(--text-muted);
  font-weight: 600;
  margin-left: 10px;
}
</style>
