<template>
  <div class="tasks-page">
    <!-- 全域載入遮罩 -->
    <LoadingOverlay v-if="isActionLoading" theme="qigong" :message="actionLoadingMessage" fullscreen />

    <div class="page-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px;">
      <div class="header-left">
        <h2 class="neon-text-snipper">🗺️ 任務指南</h2>
        <p class="subtitle">追尋冒險的腳步，完成任務獲取豐厚獎勵與神秘禮盒</p>
      </div>
      <button 
        class="help-btn"
        @click="showCompletedTasksModal = true"
        title="查看並管理我的完成任務紀錄"
      >
        📋 我的完成任務
      </button>
    </div>

    <!-- 頂部操作欄：篩選與搜尋 -->
    <div class="action-bar glass-card">
      <button class="mobile-filter-toggle" @click="isMobileFiltersExpanded = !isMobileFiltersExpanded">
        {{ isMobileFiltersExpanded ? '收起篩選' : '🔍 展開篩選' }}
      </button>

      <div class="filter-controls" :class="{ 'expanded': isMobileFiltersExpanded }">
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
            placeholder="模糊搜尋(任務名/地點/流程/無連結條件)..." 
          />
          <button class="search-btn" title="搜尋">🔍</button>
        </div>
      </div>
    </div>

    <div class="tasks-layout" v-if="filteredTasks.length > 0">
      <!-- 左側：任務清單卡片 -->
      <div class="tasks-list-panel">
        <div 
          v-for="task in filteredTasks" 
          :key="task.id" 
          class="task-card glass-card"
          :class="{ 
            'active-task': selectedTask && selectedTask.id === task.id,
            'completed-task-card': myCompletedTaskIds.includes(task.id)
          }"
          @click="selectTask(task)"
        >
          <div class="task-card-header" style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
            <h3 class="task-card-title">{{ getDisplayName(task) }}</h3>
            <span v-if="myCompletedTaskIds.includes(task.id)" class="completed-badge">✓ 已完成</span>
          </div>
          <p class="task-card-giver">接取NPC: {{ getTaskGiver(task) }}</p>
          <div class="task-card-rewards-preview">
            <span v-for="(reward, idx) in getRewardsList(task).slice(0, 3)" :key="idx" class="reward-preview-badge">
              {{ reward.icon }} {{ reward.name }}
            </span>
          </div>
        </div>
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
            <img :src="selectedTask.startLocation.image" alt="Map Location" class="map-img" />
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
                <img v-if="step.image" :src="step.image" alt="Step Screenshot" class="step-img" />
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
                <!-- 禮盒超連結預覽 -->
                <a 
                  v-if="reward.isLink" 
                  href="#"
                  class="reward-link-btn"
                  @click.prevent="openBoxPreview(reward.url)"
                >
                  {{ reward.name }} <span class="link-arrow">↗</span>
                </a>
                <span v-else class="reward-name">{{ reward.name }}</span>
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
              <img :src="selectedTask.startLocation.image" alt="Map Location" class="map-img" />
            </div>
          </div>

          <div class="timeline">
            <div v-for="(step, idx) in selectedTask.steps" :key="idx" class="timeline-item">
              <div class="timeline-badge">{{ idx + 1 }}</div>
              <div class="timeline-content">
                <p class="step-desc">{{ step.desc }}</p>
                <img v-if="step.image" :src="step.image" alt="Step Screenshot" class="step-img" />
              </div>
            </div>
          </div>

          <div class="rewards-grid">
            <div v-for="(reward, idx) in getRewardsList(selectedTask)" :key="idx" class="reward-item">
              <span class="reward-icon">{{ reward.icon }}</span>
              <div class="reward-info">
                <a 
                  v-if="reward.isLink" 
                  href="#"
                  class="reward-link-btn"
                  @click.prevent="openBoxPreview(reward.url)"
                >
                  {{ reward.name }} ↗
                </a>
                <span v-else class="reward-name">{{ reward.name }}</span>
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
                    <a 
                      v-if="reward.isLink" 
                      href="#"
                      class="reward-link-btn"
                      @click.prevent="openBoxPreview(reward.url)"
                    >
                      {{ reward.name }} ↗
                    </a>
                    <span v-else class="reward-name">{{ reward.name }}</span>
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

    <!-- 🎁 禮盒內容物詳情預覽 Modal -->
    <div class="modal-overlay" v-if="showBoxModal" @click="showBoxModal = false" style="z-index: 2300;">
      <div class="modal-content glass-card" @click.stop style="border-color: rgba(200, 0, 255, 0.25); box-shadow: 0 10px 40px rgba(0, 0, 0, 0.8), 0 0 30px rgba(200, 0, 255, 0.15);">
        <button class="modal-close-btn" @click="showBoxModal = false">✕</button>
        
        <div class="modal-body" v-if="previewBox">
          <div class="detail-header">
            <div class="detail-title-row">
              <h2 class="detail-title neon-text-box" style="font-size: 1.5rem; margin-bottom: 0;">{{ previewBox.name }}</h2>
            </div>
            <p class="detail-giver" style="font-size: 0.85rem; margin-top: 8px;">📂 獲取途徑：<strong>{{ previewBox.obtain }}</strong></p>
          </div>

          <hr class="divider" />

          <div class="modal-scroll-area">
            <!-- 內容物預覽 -->
            <div class="detail-section">
              <h3 class="section-title" style="font-size: 1rem; border-left-color: var(--color-box);">🎒 內容物預覽</h3>
              <ul class="stats-list">
                <li v-for="(item, idx) in previewBox.items" :key="idx" class="stat-li">
                  <span class="stat-bullet">{{ getItemIcon(item.rarity) }}</span>
                  <span class="stat-text" :class="item.rarity + '-text'">
                    {{ item.name }} 
                    <span class="rate-val" v-if="item.rate">({{ item.rate }})</span>
                  </span>
                </li>
              </ul>
            </div>

            <!-- 注意事項 -->
            <div class="detail-section" v-if="previewBox.warning">
              <div class="warnings-box" style="background: rgba(200, 0, 255, 0.03); border-color: rgba(200, 0, 255, 0.1);">
                <h4 style="color: var(--color-box); margin-bottom: 6px;">⚠️ 注意事項</h4>
                <p style="font-size: 0.85rem; color: var(--text-muted); line-height: 1.5;">{{ previewBox.warning }}</p>
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
        <div v-if="!isLoggedIn" style="padding: 10px 0;">
          <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 16px;">首次使用請先輸入伺服器與角色ID以建立/載入完成紀錄：</p>
          <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px;">
            <div style="display: flex; gap: 10px; align-items: center;">
              <span style="font-size: 0.9rem; width: 90px; font-weight: 700;">選擇伺服器</span>
              <select v-model="inputServer" class="server-select" style="flex: 1;">
                <option value="新東京">新東京</option>
                <option value="新大阪">新大阪</option>
              </select>
            </div>
            <div style="display: flex; gap: 10px; align-items: center;">
              <span style="font-size: 0.9rem; width: 90px; font-weight: 700;">角色 ID</span>
              <input 
                type="text" 
                v-model="inputCharId" 
                placeholder="請輸入您的遊戲內角色 ID" 
                class="search-input" 
                style="flex: 1;"
                @keyup.enter="loginUser"
              />
            </div>
          </div>
          <div style="display: flex; justify-content: flex-end; gap: 10px;">
            <button class="modal-btn cancel" @click="showCompletedTasksModal = false">關閉</button>
            <button class="modal-btn confirm neon-border-snipper" @click="loginUser">確認設定</button>
          </div>
        </div>

        <!-- 已登入狀態：展示完成紀錄與同步功能 -->
        <div v-else class="completed-tasks-container">
          <!-- 帳號資訊 -->
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 10px;">
            <span style="font-size: 0.9rem; color: var(--color-snipper); font-weight: 700;">✓ 當前角色：[{{ currentServer }}] {{ currentCharId }}</span>
            <button class="modal-btn cancel" style="padding: 4px 10px; font-size: 0.75rem;" @click="logoutUser">切換帳號</button>
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
            <button class="help-btn" style="flex: 1; font-size: 0.85rem; padding: 8px;" @click="openSyncToCloud">
              📤 同步至雲端 (OTP)
            </button>
            <button class="help-btn" style="flex: 1; font-size: 0.85rem; padding: 8px;" @click="openSyncToLocal">
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

    <!-- 📤/📥 同步雲端 OTP Modal -->
    <div class="modal-overlay" v-if="showSyncModal" @click="isActionLoading ? null : (showSyncModal = false)" style="z-index: 2100;">
      <div class="modal-content glass-card neon-border-snipper" @click.stop style="width: 450px;">
        <button class="modal-close-btn" @click="showSyncModal = false" v-if="!isActionLoading">✕</button>
        <h3 class="modal-title neon-text-snipper" style="margin-bottom: 20px; text-align: center; font-weight: 800; font-size: 1.4rem;">
          {{ syncType === 'to_cloud' ? '📤 同步至雲端 (OTP)' : '📥 同步至本地端' }}
        </h3>

        <!-- 同步至雲端表單 -->
        <div v-if="syncType === 'to_cloud'">
          <div v-if="checkCloudRecordExists(syncServer, syncCharId)">
            <!-- 覆蓋同步 -->
            <p style="font-size: 0.85rem; color: var(--color-warrior); margin-bottom: 15px; font-weight: 700;">
              ⚠️ 雲端已存在此角色資料，請輸入原本密碼驗證並更新本次新密碼！
            </p>
            <div class="form-group" style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 15px;">
              <div>
                <label style="font-size: 0.85rem; color: var(--text-muted); display: block; margin-bottom: 4px;">原同步密碼</label>
                <input type="password" v-model="syncPassword" placeholder="輸入上次同步設定的密碼" class="search-input" style="width: 100%;" />
              </div>
              <div style="display: flex; align-items: center; gap: 6px; margin: 4px 0;">
                <input type="checkbox" id="keep-old-pwd" v-model="keepOldPassword" style="cursor: pointer;" />
                <label for="keep-old-pwd" style="font-size: 0.85rem; color: var(--text-muted); cursor: pointer; user-select: none;">沿用原本密碼 (不更新密碼)</label>
              </div>
              <div v-if="!keepOldPassword">
                <label style="font-size: 0.85rem; color: var(--text-muted); display: block; margin-bottom: 4px;">新一次性同步密碼 (本次同步使用)</label>
                <input type="password" v-model="syncNewPasswordInput" placeholder="設定本次上傳的新一次性密碼" class="search-input" style="width: 100%;" />
              </div>
            </div>
          </div>
          <div v-else>
            <!-- 首次同步 -->
            <p style="font-size: 0.85rem; color: var(--color-snipper); margin-bottom: 15px; font-weight: 700;">
              ✓ 首次上傳至雲端，請設定您本次的一次性同步密碼：
            </p>
            <div class="form-group" style="margin-bottom: 15px;">
              <label style="font-size: 0.85rem; color: var(--text-muted); display: block; margin-bottom: 4px;">一次性同步密碼</label>
              <input type="password" v-model="syncNewPasswordInput" placeholder="設定本次上傳的一次性密碼" class="search-input" style="width: 100%;" />
            </div>
          </div>
        </div>

        <!-- 同步至本地端表單 -->
        <div v-else>
          <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 15px;">
            正在為當前角色 <strong>[{{ syncServer }}] {{ syncCharId }}</strong> 從雲端拉取進度。請輸入您先前同步時設定的一次性雲端密碼：
          </p>
          <div class="form-group" style="margin-bottom: 15px;">
            <label style="font-size: 0.85rem; color: var(--text-muted); display: block; margin-bottom: 4px;">雲端同步密碼</label>
            <input type="password" v-model="syncPassword" placeholder="輸入該角色的雲端一次性密碼" class="search-input" style="width: 100%;" />
          </div>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 10px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 15px; margin-top: 15px;">
          <button class="modal-btn cancel" @click="showSyncModal = false" :disabled="isActionLoading">取消</button>
          <button class="modal-btn confirm neon-border-snipper" @click="handleSyncSubmit" :disabled="isActionLoading">
            確認提交
          </button>
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
import { ref, computed, watch, onMounted } from 'vue'
import boxesData from '@/assets/data/boxes.json'
import LoadingOverlay from '@/components/LoadingOverlay.vue'

const tasks = ref([
  {
    id: 'task-74f81bd4',
    name: '【劇情】『KO』滑輪高手',
    customizedName: '滑輪高手 (客製)',
    school: '共通',
    department: '共通',
    requirements: [
      { desc: '等級達到 Lv. 80', url: '' }
    ],
    startLocation: {
      desc: '商洞 中央廣場周圍的四塊草皮很多 (NPC: 自動接取)',
      image: '/assets/tasks/asset1.jpg'
    },
    steps: [
      { desc: '擊殺滑輪高手 35 個', image: '' }
    ],
    rewards: {
      exp: 0,
      statsPoints: 0,
      skillPoints: 0,
      customRewards: [
        { desc: '劍道部練功禮盒(7D)【LV.80】', url: '/boxes/box-3' }
      ]
    },
    tips: [
      '穿著校服全點敏捷就能扛住了'
    ],
    notes: [
      '不要引太多，滑輪高手會麻痺敵人',
      '被麻痺的時候，G奶七仔會主動攻擊',
      '看到拐子手快跑，他會晕人'
    ]
  },
  {
    id: 'task-c28db94',
    name: '【劇情】惹事生非的街道',
    customizedName: '',
    school: '共通',
    department: '共通',
    requirements: [
      { desc: '完成 【劇情】『KO』滑輪高手', url: '/tasks/task-1', isPrerequisite: true },
      { desc: '等級達到 Lv. 100', url: '' },
      { desc: '接取限制：不可超過 120 等', url: '' }
    ],
    startLocation: {
      desc: '涉谷 (NPC: 人人有功練100等任務，可從商洞進入)',
      image: '/assets/tasks/asset2.jpg'
    },
    steps: [
      { desc: '收集草莓有奶 19 個，糖本肛 19 個 (涉谷約28/49)', image: '' }
    ],
    rewards: {
      exp: 0,
      statsPoints: 0,
      skillPoints: 0,
      customRewards: [
        { desc: '劍道部練功禮盒(7D)【LV.100】', url: '/boxes/box-4' }
      ]
    },
    tips: [
      '先穿上 KO 滑輪高手拿到的 80 等獎勵再去挑戰',
      '怕時間不夠可以先移動到涉谷大約 37/22 的位置後，利用新手送的起點卡飛回學院再接任務後立刻用前點回原本位置',
      '糖本肛所在的位置周圍都是主動怪還會給麻痺狀態很煩，少量打搭配修練念珠熬死對方'
    ],
    notes: [
      '任務有時間限制：30 分鐘',
      '死掉不會導致任務失敗',
      '任務獎勵還不到太重要，可不接',
      '任務獎勵送的 C 停卡有限制 120 等以下才能使用，若不想浪費 C 停卡要盡快使用'
    ]
  },
  {
    id: 'task-7884e63e',
    name: '【劇情】變態三男的逆襲',
    customizedName: null,
    school: '共通',
    department: '共通',
    requirements: [
      { desc: '完成 【劇情】惹事生非的街道', url: '/tasks/task-2', isPrerequisite: true },
      { desc: '等級達到 Lv. 110', url: '' },
      { desc: '接取限制：不可超過 130 等', url: '' }
    ],
    startLocation: {
      desc: '圍繞商洞周邊 (NPC: 人人有功練110等任務)',
      image: '/assets/tasks/asset3.jpg'
    },
    steps: [
      { desc: '擊殺光頭猛男 13 個 (商洞 84/168 左右，俗稱高爾夫球場)', image: '' },
      { desc: '擊殺漁夫 13 個 (綜合碼頭 68/117)', image: '' },
      { desc: '擊殺腳文字C 13 個 (涉谷 35/38)', image: '' }
    ],
    rewards: {
      exp: 0,
      statsPoints: 1,
      skillPoints: 1,
      customRewards: [
        { desc: '劍道部練功禮盒(7D)【LV.110】', url: '/boxes/box-5' }
      ]
    },
    tips: [
      '怕時間不夠可以先調查怪物所在的位置後，搭配起點/前點在接任務',
      '打光頭的時候，附近怪物都會讓人暈眩，太多怪追著你的時候，使用起點/前點快速切圖可以讓怪物不追',
      '打完光頭後直接起點回到學院，再搭乘小轎車到商洞去碼頭會比較快，也可以防止小怪騷擾',
      '打漁夫不要走太深，因為涉谷很遙遠'
    ],
    notes: [
      '任務有時間限制：30 分鐘',
      '死掉不會導致任務失敗',
      '千萬不可錯過'
    ]
  },
  {
    id: 'task-19013434',
    name: '【劇情】賊頭殺殺殺',
    school: '共通',
    department: '共通',
    requirements: [
      { desc: '完成 【劇情】變態三男的逆襲', url: '/tasks/task-3', isPrerequisite: true },
      { desc: '等級達到 Lv. 120', url: '' },
      { desc: '接取限制：不可超過 140 等', url: '' }
    ],
    startLocation: {
      desc: '綜合碼頭 (NPC: 人人有功練120等任務)',
      image: '/assets/tasks/asset3.jpg'
    },
    steps: [
      { desc: '擊殺警棍賊頭 21 個 (85/110)', image: '' },
      { desc: '擊殺賊頭槍手 21 個 (102/81)', image: '' }
    ],
    rewards: {
      exp: 0,
      statsPoints: 1,
      skillPoints: 1,
      customRewards: [
        { desc: '劍道部練功禮盒(7D)【LV.120】', url: '/boxes/box-6' }
      ]
    },
    tips: [
      '怕時間不夠可以先調查怪物所在的位置後，搭配起點/前點在接任務',
      '警棍賊頭會麻痺，既然都會行動不便不如多引幾隻打',
      '賊頭槍手會暈眩，中這個狀態會被斷招，建議引 3 隻打就好，太多隻會導致一直被暈'
    ],
    notes: [
      '任務有時間限制：30 分鐘',
      '死掉不會導致任務失敗',
      '千萬不可錯過'
    ]
  }
])

const getDisplayName = (task) => {
  if (!task) return ''
  return (task.customizedName && task.customizedName.trim()) ? task.customizedName : task.name
}

const selectedTask = ref(tasks.value[0])
const showMobileDetail = ref(false)
const previewTask = ref(null)
const showPreviewModal = ref(false)
const previewBox = ref(null)
const showBoxModal = ref(false)

// 效能優化：建立 Map 加速 O(1) 查詢
const boxesMap = new Map(boxesData.map(b => [b.id, b]))
const tasksMap = computed(() => new Map(tasks.value.map(t => [t.id, t])))

// 篩選與搜尋狀態
const rewardFilter = ref('全部')
const schoolFilter = ref('全部')
const deptFilter = ref('全部')
const searchQuery = ref('')
const isMobileFiltersExpanded = ref(false)

// 條件過濾邏輯
const filteredTasks = computed(() => {
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
    const matchLocation = task.startLocation.desc.toLowerCase().includes(query)

    // C. 接取條件（不包含帶有 url 的前置任務欄位）
    const matchRequirements = task.requirements.some(req => {
      if (req.url) return false // 排除有 url 的條件
      return req.desc.toLowerCase().includes(query)
    })

    // D. 任務流程
    const matchSteps = task.steps.some(step => {
      return step.desc.toLowerCase().includes(query)
    })

    return matchName || matchLocation || matchRequirements || matchSteps
  })
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

const openBoxPreview = (url) => {
  if (!url) return
  const id = url.split('/').pop()
  const found = boxesMap.get(id)
  if (found) {
    previewBox.value = found
    showBoxModal.value = true
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
      list.push({ icon: '🎁', name: r.desc, isLink: !!r.url, url: r.url, type: 'box' })
    })
  }
  return list
}

const getItemIcon = (rarity) => {
  switch (rarity) {
    case 'legendary': return '👑'
    case 'epic': return '🔮'
    case 'rare': return '🔷'
    case 'uncommon': return '🟢'
    default: return '⚪'
  }
}

// --- 「我的完成任務」功能相關變數 ---
const showCompletedTasksModal = ref(false)
const isLoggedIn = ref(false)
const currentCharId = ref('')
const currentServer = ref('新東京')

// 登入輸入用變數
const inputCharId = ref('')
const inputServer = ref('新東京')

// 遮罩相關
const isActionLoading = ref(false)
const actionLoadingMessage = ref('載入中，請稍候...')

// 當前角色已完成的任務 ID 陣列
const myCompletedTaskIds = ref([])

// 密碼同步相關
const syncServer = ref('新東京')
const syncCharId = ref('')
const syncPassword = ref('')
const syncNewPasswordInput = ref('')
const keepOldPassword = ref(false)
const syncType = ref('to_cloud') // 'to_cloud' | 'to_local'
const showSyncModal = ref(false)

// 本地端儲存鍵
const CURRENT_USER_KEY = 'ran2_tasks_current_user'
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
  const userData = localStorage.getItem(CURRENT_USER_KEY)
  if (userData) {
    const user = JSON.parse(userData)
    currentServer.value = user.server
    currentCharId.value = user.charId
    isLoggedIn.value = true
    
    const completedData = localStorage.getItem(`${COMPLETED_PREFIX}${user.server}_${user.charId}`)
    myCompletedTaskIds.value = completedData ? JSON.parse(completedData) : []
  } else {
    isLoggedIn.value = false
    myCompletedTaskIds.value = []
  }
}

onMounted(() => {
  loadCompletedTasksData()
})

// 登入角色
const loginUser = () => {
  if (!inputCharId.value.trim()) {
    alert('請輸入角色 ID！')
    return
  }
  const user = {
    server: inputServer.value,
    charId: inputCharId.value.trim()
  }
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user))
  loadCompletedTasksData()
  inputCharId.value = ''
  showToast('登入成功！')
}

// 登出/切換帳號
const logoutUser = () => {
  localStorage.removeItem(CURRENT_USER_KEY)
  currentCharId.value = ''
  currentServer.value = ''
  isLoggedIn.value = false
  myCompletedTaskIds.value = []
  showToast('已登出角色！')
}

// 切換任務完成狀態
const toggleTaskCompleted = (taskId) => {
  if (!isLoggedIn.value) {
    alert('請先登入/設定您的角色！')
    showCompletedTasksModal.value = true
    return
  }
  const idx = myCompletedTaskIds.value.indexOf(taskId)
  if (idx > -1) {
    myCompletedTaskIds.value.splice(idx, 1)
  } else {
    myCompletedTaskIds.value.push(taskId)
  }
  localStorage.setItem(
    `${COMPLETED_PREFIX}${currentServer.value}_${currentCharId.value}`,
    JSON.stringify(myCompletedTaskIds.value)
  )
}

// 已完成的任務詳細列表
const completedTasksList = computed(() => {
  return tasks.value.filter(t => myCompletedTaskIds.value.includes(t.id))
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
const checkCloudRecordExists = (server, charId) => {
  const cloudData = localStorage.getItem(MOCK_CLOUD_KEY)
  if (!cloudData) return false
  const cloud = JSON.parse(cloudData)
  return !!cloud[`${server}_${charId}`]
}

const openSyncToCloud = () => {
  if (!isLoggedIn.value) {
    alert('請先登入角色！')
    return
  }
  syncType.value = 'to_cloud'
  syncServer.value = currentServer.value
  syncCharId.value = currentCharId.value
  syncPassword.value = ''
  syncNewPasswordInput.value = ''
  keepOldPassword.value = false
  showSyncModal.value = true
}

const openSyncToLocal = () => {
  if (!isLoggedIn.value) {
    alert('請先登入角色！')
    return
  }
  syncType.value = 'to_local'
  syncServer.value = currentServer.value
  syncCharId.value = currentCharId.value
  syncPassword.value = ''
  syncNewPasswordInput.value = ''
  showSyncModal.value = true
}

const handleSyncSubmit = async () => {
  if (syncType.value === 'to_cloud') {
    const key = `${syncServer.value}_${syncCharId.value}`
    const exists = checkCloudRecordExists(syncServer.value, syncCharId.value)
    
    if (exists) {
      if (!syncPassword.value) {
        alert('請輸入原同步密碼進行身分驗證！')
        return
      }
      if (!keepOldPassword.value && !syncNewPasswordInput.value) {
        alert('請輸入本次同步的新一次性密碼！')
        return
      }
      
      isActionLoading.value = true
      actionLoadingMessage.value = '正在驗證並更新雲端資料...'
      await delay(1200)
      
      try {
        const cloud = JSON.parse(localStorage.getItem(MOCK_CLOUD_KEY) || '{}')
        const record = cloud[key]
        const oldHash = await sha256(syncPassword.value)
        
        if (oldHash !== record.passwordHash) {
          alert('驗證失敗！原同步密碼錯誤。')
          return
        }
        
        if (!keepOldPassword.value) {
          const newHash = await sha256(syncNewPasswordInput.value)
          record.passwordHash = newHash
        }
        
        record.taskIds = JSON.parse(JSON.stringify(myCompletedTaskIds.value))
        record.totalStatsPoints = totalCompletedPoints.value.stats
        record.totalSkillPoints = totalCompletedPoints.value.skills
        record.updatedAt = Date.now()
        
        cloud[key] = record
        localStorage.setItem(MOCK_CLOUD_KEY, JSON.stringify(cloud))
        
        showSyncModal.value = false
        showToast(keepOldPassword.value ? '雲端資料覆蓋更新成功！(沿用原密碼)' : '雲端資料覆蓋更新成功！(新密碼已啟用)')
      } catch (err) {
        console.error(err)
        alert('同步失敗！')
      } finally {
        isActionLoading.value = false
      }
      
    } else {
      if (!syncNewPasswordInput.value) {
        alert('請設定本次同步的一份一次性密碼！')
        return
      }
      
      isActionLoading.value = true
      actionLoadingMessage.value = '正在首次上傳至雲端...'
      await delay(1200)
      
      try {
        const cloud = JSON.parse(localStorage.getItem(MOCK_CLOUD_KEY) || '{}')
        const newHash = await sha256(syncNewPasswordInput.value)
        
        cloud[key] = {
          server: syncServer.value,
          charId: syncCharId.value,
          taskIds: JSON.parse(JSON.stringify(myCompletedTaskIds.value)),
          totalStatsPoints: totalCompletedPoints.value.stats,
          totalSkillPoints: totalCompletedPoints.value.skills,
          passwordHash: newHash,
          updatedAt: Date.now()
        }
        
        localStorage.setItem(MOCK_CLOUD_KEY, JSON.stringify(cloud))
        showSyncModal.value = false
        showToast('首次雲端同步成功！請記住本次的一次性密碼。')
      } catch (err) {
        console.error(err)
        alert('首次同步失敗！')
      } finally {
        isActionLoading.value = false
      }
    }
    
  } else {
    if (!syncPassword.value) {
      alert('請輸入該角色的雲端一次性密碼！')
      return
    }
    
    isActionLoading.value = true
    actionLoadingMessage.value = '正在與雲端連線驗證中...'
    await delay(1200)
    
    try {
      const cloud = JSON.parse(localStorage.getItem(MOCK_CLOUD_KEY) || '{}')
      const key = `${syncServer.value}_${syncCharId.value}`
      const record = cloud[key]
      
      if (!record) {
        alert('雲端無此角色的同步紀錄！')
        return
      }
      
      const inputHash = await sha256(syncPassword.value)
      if (inputHash !== record.passwordHash) {
        alert('密碼驗證失敗！無法拉取資料。')
        return
      }
      
      // 驗證成功，覆蓋本地此角色資料
      localStorage.setItem(`${COMPLETED_PREFIX}${key}`, JSON.stringify(record.taskIds))
      
      loadCompletedTasksData()
      showSyncModal.value = false
      showToast('已成功從雲端同步最新進度至本地端！')
    } catch (err) {
      console.error(err)
      alert('載入失敗！')
    } finally {
      isActionLoading.value = false
    }
  }
}
</script>

<style scoped>
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
}

.task-card {
  cursor: url('/assets/ran2-cursor.cur'), pointer;
  border-left: 4px solid transparent;
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
  margin-bottom: 8px;
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
  font-size: 1.1rem;
  font-weight: 700;
  flex: 1;
}

.task-card-giver {
  font-size: 0.85rem;
  color: var(--text-muted);
  margin-bottom: 12px;
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
</style>
