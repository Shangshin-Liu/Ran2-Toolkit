<template>
  <div class="quest-tracker-page">
    <!-- 頂部標題與操作區 -->
    <header class="tracker-header">
      <div class="tracker-title-group">
        <h1 class="tracker-title">亂2 任務進度</h1>
        <p class="tracker-subtitle">能力點與技能點相關任務 · 依分類與 NPC 追蹤完成狀況</p>
      </div>

      <div class="tracker-actions">
        <button
          type="button"
          class="action-btn"
          @click="handleExportProgress"
        >
          <svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          <span>匯出進度</span>
        </button>

        <button
          type="button"
          class="action-btn"
          @click="openImportDialog($event)"
        >
          <svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <span>匯入進度</span>
        </button>
        <input
          ref="fileInputRef"
          type="file"
          accept=".json,application/json"
          class="sr-only-input"
          aria-label="選擇進度 JSON 檔案匯入"
          @change="handleFileImportChange"
        />

        <button
          type="button"
          class="action-btn is-ocr-trigger-btn"
          @click="openOcrModal($event)"
        >
          <svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          <span>上傳已完成任務圖片</span>
        </button>

        <button
          type="button"
          class="action-btn is-snipper-btn"
          @click="openCloudSyncModal($event)"
        >
          <svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
          </svg>
          <span>雲端同步</span>
        </button>
      </div>
    </header>

    <!-- 狀態回饋提示（含版本差異警告） -->
    <div v-if="statusBanner" class="status-banner" :class="`is-${statusBanner.type}`" role="status">
      <div class="status-banner-content">
        <svg v-if="statusBanner.type === 'warning'" class="icon-svg" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <svg v-else class="icon-svg" viewBox="0 0 24 24" aria-hidden="true">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <span>{{ statusBanner.text }}</span>
      </div>
      <button type="button" class="banner-close-btn" aria-label="關閉提示" @click="statusBanner = null">
        <svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>

    <!-- 三張統計卡 -->
    <section class="stats-grid" aria-label="任務與點數統計">
      <div class="stat-card card-accent-snipper">
        <div class="stat-card-top">
          <span class="stat-label">任務完成</span>
          <span class="stat-numbers font-num is-snipper">
            <strong>{{ overallStats.completedTasks }}</strong>
            <span class="stat-sep">/</span>
            <span>{{ overallStats.totalTasks }}</span>
          </span>
        </div>
        <div class="progress-track" role="progressbar" :aria-valuenow="overallStats.completedTasks" :aria-valuemin="0" :aria-valuemax="overallStats.totalTasks">
          <div class="progress-fill fill-snipper" :style="{ width: getPercent(overallStats.completedTasks, overallStats.totalTasks) }"></div>
        </div>
      </div>

      <div class="stat-card card-accent-stats">
        <div class="stat-card-top">
          <span class="stat-label">能力點</span>
          <span class="stat-numbers font-num is-stats">
            <strong>{{ overallStats.earnedStatsPoints }}</strong>
            <span class="stat-sep">/</span>
            <span>{{ overallStats.totalStatsPoints }}</span>
          </span>
        </div>
        <div class="progress-track" role="progressbar" :aria-valuenow="overallStats.earnedStatsPoints" :aria-valuemin="0" :aria-valuemax="overallStats.totalStatsPoints">
          <div class="progress-fill fill-stats" :style="{ width: getPercent(overallStats.earnedStatsPoints, overallStats.totalStatsPoints) }"></div>
        </div>
      </div>

      <div class="stat-card card-accent-skills">
        <div class="stat-card-top">
          <span class="stat-label">技能點</span>
          <span class="stat-numbers font-num is-skills">
            <strong>{{ overallStats.earnedSkillPoints }}</strong>
            <span class="stat-sep">/</span>
            <span>{{ overallStats.totalSkillPoints }}</span>
          </span>
        </div>
        <div class="progress-track" role="progressbar" :aria-valuenow="overallStats.earnedSkillPoints" :aria-valuemin="0" :aria-valuemax="overallStats.totalSkillPoints">
          <div class="progress-fill fill-skills" :style="{ width: getPercent(overallStats.earnedSkillPoints, overallStats.totalSkillPoints) }"></div>
        </div>
      </div>
    </section>

    <!-- 載入錯誤 -->
    <div v-if="loadError" class="hint-banner is-warning-hint" role="alert">
      {{ loadError }}
    </div>

    <!-- 主體三欄版面（左、中、右高度一致） -->
    <div class="three-col-layout">
      <!-- 1. 左欄：分類樹 -->
      <aside class="col-panel col-categories" aria-label="任務分類與 NPC 清單">
        <div
          v-for="cat in categoryTree"
          :key="cat.name"
          class="category-block"
        >
          <button
            type="button"
            class="category-row-btn"
            :class="{
              'is-expanded': isCategoryExpanded(cat.name),
              'is-all-completed': cat.stats.isAllCompleted,
            }"
            :aria-expanded="isCategoryExpanded(cat.name)"
            @click="toggleCategory(cat.name)"
          >
            <div class="category-row-top">
              <span class="category-name-wrap">
                <svg
                  class="chevron-svg"
                  :class="{ 'is-open': isCategoryExpanded(cat.name) }"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
                <span class="category-name">{{ cat.name }}</span>
                <svg
                  v-if="cat.stats.isAllCompleted"
                  class="all-done-icon"
                  viewBox="0 0 24 24"
                  aria-label="此分類已全數完成"
                >
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </span>
              <span class="ratio-pill font-num" :class="{ 'is-done-pill': cat.stats.isAllCompleted }">
                {{ cat.stats.completed }}/{{ cat.stats.total }}
              </span>
            </div>

            <div class="category-mini-progress">
              <div
                class="category-mini-fill"
                :class="{ 'is-done-fill': cat.stats.isAllCompleted }"
                :style="{ width: getPercent(cat.stats.completed, cat.stats.total) }"
              ></div>
            </div>
          </button>

          <!-- 展開後的 NPC 列表（與最外層呈現一致，只顯示 X/Y） -->
          <div v-if="isCategoryExpanded(cat.name)" class="npc-sublist">
            <button
              v-for="npc in cat.npcs"
              :key="npc.key"
              type="button"
              class="npc-row-btn"
              :class="{
                'is-selected': selectedNpcKey === npc.key && !isSearching,
                'is-all-completed': npc.stats.isAllCompleted,
              }"
              :aria-pressed="selectedNpcKey === npc.key"
              @click="selectNpc(npc.key)"
            >
              <div class="npc-row-top">
                <span class="npc-name-wrap">
                  <span class="npc-name">{{ npc.name }}</span>
                  <svg
                    v-if="npc.stats.isAllCompleted"
                    class="all-done-icon"
                    viewBox="0 0 24 24"
                    aria-label="此 NPC 任務已全數完成"
                  >
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                </span>
                <span class="ratio-pill font-num" :class="{ 'is-done-pill': npc.stats.isAllCompleted }">
                  {{ npc.stats.completed }}/{{ npc.stats.total }}
                </span>
              </div>
              <div class="category-mini-progress is-npc-progress">
                <div
                  class="category-mini-fill"
                  :class="{ 'is-done-fill': npc.stats.isAllCompleted }"
                  :style="{ width: getPercent(npc.stats.completed, npc.stats.total) }"
                ></div>
              </div>
            </button>
          </div>
        </div>
      </aside>

      <!-- 2. 中欄：文字模糊搜尋 + 任務列表 -->
      <section ref="taskListPanelRef" class="col-panel col-tasks" aria-label="NPC 任務列表">
        <!-- 置頂文字模糊搜尋欄 -->
        <div class="middle-search-bar">
          <div class="search-input-wrap">
            <svg class="search-icon-svg" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              v-model="searchQuery"
              type="search"
              class="middle-search-input"
              placeholder="輸入關鍵字模糊搜尋任務名稱、NPC、分類或 ID..."
              aria-label="模糊搜尋任務"
            />
            <button
              v-if="searchQuery"
              type="button"
              class="search-clear-btn"
              aria-label="清除搜尋關鍵字"
              @click="searchQuery = ''"
            >
              <svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        <!-- A. 搜尋結果模式 -->
        <template v-if="isSearching">
          <header class="middle-header">
            <div class="middle-category-label">模糊搜尋模式（點選任務將自動切換至該分類與 NPC）</div>
            <div class="middle-title-row">
              <h2 class="middle-npc-name">搜尋：「{{ searchQuery.trim() }}」</h2>
              <span class="middle-summary">
                共找到 <span class="font-num">{{ searchResults.length }}</span> 筆任務
              </span>
            </div>
          </header>

          <template v-if="searchResults.length > 0">
            <div class="task-table-head" aria-hidden="true">
              <span class="col-check">狀態</span>
              <span class="col-name">任務名稱（按等級 → 群組 → ID 排序）</span>
              <span class="col-stat">能力點</span>
              <span class="col-skill">技能點</span>
            </div>

            <div class="task-rows">
              <div
                v-for="task in searchResults"
                :key="task.id"
                class="task-row"
                :class="{
                  'is-selected': selectedTaskId === task.id,
                  'is-completed': task.status === 'done' || task.status === 'group-done',
                }"
              >
                <label class="task-check-cell">
                  <input
                    type="checkbox"
                    class="task-checkbox-input"
                    :checked="task.status === 'done'"
                    :aria-label="`標記「${task.cleanName}」為已完成`"
                    @change="handleToggleTask(task.id, $event)"
                  />
                  <span class="custom-checkbox" :class="{ 'is-checked': task.status === 'done', 'is-group-done': task.status === 'group-done' }" aria-hidden="true">
                    <svg v-if="task.status === 'done'" class="check-svg" viewBox="0 0 24 24">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <svg v-else-if="task.status === 'group-done'" class="check-svg" viewBox="0 0 24 24">
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </span>
                </label>

                <button
                  type="button"
                  class="task-name-cell-btn"
                  @click="handleSelectSearchResult(task)"
                >
                  <span v-if="task.directLevel > 0" class="tag-badge tag-level font-num">Lv.{{ task.directLevel }}</span>
                  <span v-if="task.prefix" class="tag-badge tag-prefix">{{ task.prefix }}</span>
                  <span
                    class="task-clean-name"
                    :class="{ 'is-muted-name': task.status === 'done' || task.status === 'group-done' }"
                  >
                    {{ task.cleanName }}
                  </span>
                  <span v-if="task.status === 'group-done'" class="group-done-pill">同群組已完成</span>
                  <span class="search-origin-pill">{{ task.categoryName }} · {{ task.npcName }}</span>
                </button>

                <div class="task-point-cell font-num" :class="task.statsPoints > 0 ? 'pt-stats' : 'pt-zero'">
                  {{ task.statsPoints > 0 ? `+${task.statsPoints}` : '—' }}
                </div>

                <div class="task-point-cell font-num" :class="task.skillPoints > 0 ? 'pt-skills' : 'pt-zero'">
                  {{ task.skillPoints > 0 ? `+${task.skillPoints}` : '—' }}
                </div>
              </div>
            </div>
          </template>

          <div v-else class="panel-empty-prompt">
            <svg class="prompt-svg" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <p>找不到符合「{{ searchQuery.trim() }}」的任務</p>
          </div>
        </template>

        <!-- B. 一般選取 NPC 列表模式 -->
        <template v-else-if="selectedNpc">
          <header class="middle-header">
            <div class="middle-category-label">{{ selectedNpc.categoryName }}</div>
            <div class="middle-title-row">
              <h2 class="middle-npc-name">{{ selectedNpc.name }}</h2>
              <span class="middle-summary">
                已完成 <span class="font-num">{{ selectedNpc.stats.completed }}</span> · 未完成 <span class="font-num">{{ selectedNpc.stats.incomplete }}</span> · 共 <span class="font-num">{{ selectedNpc.stats.total }}</span>
              </span>
            </div>
          </header>

          <div class="task-table-head" aria-hidden="true">
            <span class="col-check">狀態</span>
            <span class="col-name">任務名稱</span>
            <span class="col-stat">能力點</span>
            <span class="col-skill">技能點</span>
          </div>

          <div class="task-rows">
            <div
              v-for="task in selectedNpc.tasks"
              :key="task.id"
              class="task-row"
              :class="{
                'is-selected': selectedTaskId === task.id,
                'is-completed': task.status === 'done' || task.status === 'group-done',
              }"
            >
              <!-- 第一欄：完成勾選框 -->
              <label class="task-check-cell">
                <input
                  type="checkbox"
                  class="task-checkbox-input"
                  :checked="task.status === 'done'"
                  :aria-label="`標記「${task.cleanName}」為已完成`"
                  @change="handleToggleTask(task.id, $event)"
                />
                <span class="custom-checkbox" :class="{ 'is-checked': task.status === 'done', 'is-group-done': task.status === 'group-done' }" aria-hidden="true">
                  <svg v-if="task.status === 'done'" class="check-svg" viewBox="0 0 24 24">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <svg v-else-if="task.status === 'group-done'" class="check-svg" viewBox="0 0 24 24">
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </span>
              </label>

              <!-- 第二欄：任務名稱 -->
              <button
                type="button"
                class="task-name-cell-btn"
                @click="selectTask(task.id)"
              >
                <span v-if="task.directLevel > 0" class="tag-badge tag-level font-num">Lv.{{ task.directLevel }}</span>
                <span v-if="task.prefix" class="tag-badge tag-prefix">{{ task.prefix }}</span>
                <span
                  class="task-clean-name"
                  :class="{ 'is-muted-name': task.status === 'done' || task.status === 'group-done' }"
                >
                  {{ task.cleanName }}
                </span>
                <span v-if="task.status === 'group-done'" class="group-done-pill">同群組已完成</span>
              </button>

              <!-- 第三欄：能力點 -->
              <div class="task-point-cell font-num" :class="task.statsPoints > 0 ? 'pt-stats' : 'pt-zero'">
                {{ task.statsPoints > 0 ? `+${task.statsPoints}` : '—' }}
              </div>

              <!-- 第四欄：技能點 -->
              <div class="task-point-cell font-num" :class="task.skillPoints > 0 ? 'pt-skills' : 'pt-zero'">
                {{ task.skillPoints > 0 ? `+${task.skillPoints}` : '—' }}
              </div>
            </div>
          </div>
        </template>

        <div v-else class="panel-empty-prompt">
          <svg class="prompt-svg" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          <p>從左側展開分類並選擇 NPC，或使用上方搜尋欄查找任務</p>
        </div>
      </section>

      <!-- 3. 右欄：詳細資訊 -->
      <aside ref="detailPanelRef" class="col-panel col-detail" aria-label="任務詳細資訊">
        <template v-if="selectedTask">
          <!-- 3.1 標籤、任務名稱、任務 id -->
          <div class="detail-top">
            <div class="detail-tags">
              <span v-if="selectedTask.prefix" class="tag-badge tag-prefix">{{ selectedTask.prefix }}</span>
              <span v-if="selectedTask.school && selectedTask.school !== '共通'" class="tag-badge tag-school">{{ selectedTask.school }}</span>
              <span v-if="selectedTask.department && selectedTask.department !== '共通'" class="tag-badge tag-dept">{{ selectedTask.department }}</span>
            </div>
            <h2 class="detail-task-name">{{ selectedTask.cleanName }}</h2>
            <div class="detail-task-id font-num">{{ selectedTask.id }}</div>
          </div>

          <!-- 3.2 同群組已完成提示 -->
          <div v-if="selectedTaskStatus === 'group-done'" class="hint-banner is-complete-hint">
            該任務雖然未完成，但由於為同一群組因此無須再解
          </div>

          <!-- 3.3 未解鎖提示 -->
          <div v-if="selectedTaskPrereqs.showLockedHint" class="hint-banner is-warning-hint">
            尚未解鎖：前置任務還沒完成
          </div>

          <!-- 3.4 大型完成開關 -->
          <button
            type="button"
            class="large-toggle-btn"
            :class="{ 'is-done': selectedTaskStatus === 'done' }"
            @click="handleToggleTask(selectedTask.id, $event)"
          >
            <svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true">
              <polyline v-if="selectedTaskStatus === 'done'" points="20 6 9 17 4 12" />
              <circle v-else cx="12" cy="12" r="9" />
            </svg>
            <span>
              {{ selectedTaskStatus === 'done' ? '已完成（取消勾選可改回未完成）' : '標記為已完成' }}
            </span>
          </button>

          <!-- 3.5 兩張獎勵卡 -->
          <div class="detail-rewards-grid">
            <div class="reward-box">
              <span class="reward-label">能力點獎勵</span>
              <strong class="reward-val font-num" :class="selectedTask.statsPoints > 0 ? 'pt-stats' : 'pt-zero'">
                +{{ selectedTask.statsPoints }}
              </strong>
            </div>
            <div class="reward-box">
              <span class="reward-label">技能點獎勵</span>
              <strong class="reward-val font-num" :class="selectedTask.skillPoints > 0 ? 'pt-skills' : 'pt-zero'">
                +{{ selectedTask.skillPoints }}
              </strong>
            </div>
          </div>

          <!-- 3.6 查看任務脈絡按鈕 -->
          <button
            type="button"
            class="context-trigger-btn"
            @click="openContextModal(selectedTask.id, $event)"
          >
            <svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
            <span>查看任務脈絡</span>
          </button>

          <!-- 3.7 接取條件 -->
          <div class="detail-block">
            <h3 class="block-title">接取條件</h3>
            <div v-if="selectedTaskRequirements.length > 0" class="req-capsules">
              <span
                v-for="(req, idx) in selectedTaskRequirements"
                :key="idx"
                class="req-capsule"
                :class="{ 'is-warning-capsule': req.isWarning }"
              >
                {{ req.text }}
              </span>
            </div>
            <p v-else class="muted-empty-text">沒有額外條件</p>
          </div>

          <!-- 3.8 前置任務 -->
          <div class="detail-block">
            <div class="block-title-row">
              <h3 class="block-title">前置任務</h3>
              <span v-if="selectedTaskPrereqs.isSameGroupAny" class="same-group-any-hint">
                完成其中一個即可
              </span>
            </div>

            <div v-if="selectedTaskPrereqs.items.length > 0" class="prereq-list">
              <template v-for="item in selectedTaskPrereqs.items" :key="item.id">
                <button
                  v-if="item.exists"
                  type="button"
                  class="prereq-row-btn"
                  @click="openPrereqModal(item.id, $event)"
                >
                  <span class="status-dot" :class="item.isCompleted ? 'dot-done' : 'dot-todo'" aria-hidden="true"></span>
                  <span class="prereq-name">{{ item.cleanName }}</span>
                  <span class="prereq-status-text" :class="item.isCompleted ? 'text-done' : 'text-todo'">
                    {{ item.isCompleted ? '已完成' : '未完成' }}
                  </span>
                </button>
                <div v-else class="prereq-row-missing is-warning-hint">
                  <span class="status-dot dot-todo" aria-hidden="true"></span>
                  <span class="prereq-name">此任務不存在於資料庫 ({{ item.id }})</span>
                  <span class="prereq-status-text text-todo">未完成</span>
                </div>
              </template>
            </div>
            <p v-else class="muted-empty-text">無</p>
          </div>

          <!-- 3.9 地點與 NPC -->
          <div class="detail-block">
            <h3 class="block-title">地點與 NPC</h3>
            <dl class="meta-dl">
              <div class="meta-pair">
                <dt>地點</dt>
                <dd>{{ selectedTask.locationText }}</dd>
              </div>
              <div class="meta-pair">
                <dt>NPC</dt>
                <dd>{{ selectedTask.npcName }}</dd>
              </div>
              <div class="meta-pair">
                <dt>分類</dt>
                <dd>{{ selectedTask.categoryName }}</dd>
              </div>
            </dl>
          </div>

          <!-- 3.10 群組說明 -->
          <div v-if="selectedTaskGroupDesc" class="detail-block">
            <h3 class="block-title">群組說明</h3>
            <p class="group-desc-box">{{ selectedTaskGroupDesc.text }}</p>
          </div>
        </template>

        <div v-else class="panel-empty-prompt">
          <svg class="prompt-svg" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          <p>點選任務查看詳細資訊</p>
        </div>
      </aside>
    </div>

    <!-- 頁尾：顯示任務庫版本與資料日期 -->
    <footer class="tracker-footer">
      <span>資料日期 / 版本：<span class="font-num">{{ formattedVersion || '—' }}</span></span>
    </footer>

    <!-- =====================================================================
         4. 前置/後續任務連帶完成與取消確認視窗 (Cascade Confirmation Modal)
         ===================================================================== -->
    <div
      v-if="pendingCascadePlan"
      class="dialog-backdrop"
      @click="cancelCascadePlan"
    >
      <div
        ref="cascadeDialogRef"
        class="dialog-panel small-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cascade-dialog-title"
        tabindex="-1"
        @click.stop
      >
        <div class="dialog-header">
          <h2 id="cascade-dialog-title" class="detail-task-name">
            {{ pendingCascadePlan.mode === 'check-prereqs' ? '連帶完成前置任務提示' : '連帶取消後續任務提示' }}
          </h2>
        </div>

        <div class="dialog-body">
          <div
            class="hint-banner"
            :class="pendingCascadePlan.mode === 'check-prereqs' ? 'is-complete-hint' : 'is-warning-hint'"
          >
            <template v-if="pendingCascadePlan.mode === 'check-prereqs'">
              您勾選的「<strong>{{ pendingCascadePlan.targetTask?.cleanName }}</strong>」尚有未完成的前置任務，確認後將會連帶把之前的任務一併標記為已完成：
            </template>
            <template v-else>
              您取消勾選的「<strong>{{ pendingCascadePlan.targetTask?.cleanName }}</strong>」有後續任務已設定為完成，確認後將會連同後續任務一併視為未完成：
            </template>
          </div>

          <ul class="cascade-task-list">
            <li v-for="t in pendingCascadePlan.affectedTasks" :key="t.id" class="cascade-task-item">
              <span class="cascade-task-name">{{ t.cleanName }}</span>
              <span class="cascade-task-id font-num">{{ t.id }}</span>
            </li>
          </ul>
        </div>

        <div class="dialog-footer">
          <button
            type="button"
            class="action-btn is-accent cascade-confirm-btn"
            @click="confirmCascadePlan"
          >
            <span>
              {{ pendingCascadePlan.mode === 'check-prereqs' ? '確認一併完成' : '確認一併取消' }}
            </span>
          </button>
          <button
            type="button"
            class="action-btn"
            @click="cancelCascadePlan"
          >
            <span>取消</span>
          </button>
        </div>
      </div>
    </div>

    <!-- =====================================================================
         5. 前置任務浮動視窗 (Prerequisite Floating Modal)
         ===================================================================== -->
    <div
      v-if="currentPrereqModalTask"
      class="dialog-backdrop"
      @click="closePrereqModal"
    >
      <div
        ref="prereqDialogRef"
        class="dialog-panel prereq-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="prereq-dialog-title"
        tabindex="-1"
        @click.stop
      >
        <div class="dialog-header">
          <div class="detail-tags">
            <span class="tag-badge tag-prereq-modal">前置任務</span>
            <span v-if="currentPrereqModalTask.prefix" class="tag-badge tag-prefix">{{ currentPrereqModalTask.prefix }}</span>
            <span v-if="currentPrereqModalTask.school && currentPrereqModalTask.school !== '共通'" class="tag-badge tag-school">{{ currentPrereqModalTask.school }}</span>
            <span v-if="currentPrereqModalTask.department && currentPrereqModalTask.department !== '共通'" class="tag-badge tag-dept">{{ currentPrereqModalTask.department }}</span>
          </div>
          <h2 id="prereq-dialog-title" class="detail-task-name">{{ currentPrereqModalTask.cleanName }}</h2>
          <div class="detail-task-id font-num">{{ currentPrereqModalTask.id }}</div>
        </div>

        <div class="dialog-body">
          <!-- 同群組已完成說明 -->
          <div v-if="currentPrereqModalStatus === 'group-done'" class="hint-banner is-complete-hint">
            該任務雖然未完成，但由於為同一群組因此無須再解
          </div>

          <!-- 未解鎖提示 -->
          <div v-if="currentPrereqModalPrereqs.showLockedHint" class="hint-banner is-warning-hint">
            尚未解鎖：前置任務還沒完成
          </div>

          <!-- 完成開關 -->
          <button
            type="button"
            class="large-toggle-btn"
            :class="{ 'is-done': currentPrereqModalStatus === 'done' }"
            @click="handleToggleTask(currentPrereqModalTask.id, $event)"
          >
            <svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true">
              <polyline v-if="currentPrereqModalStatus === 'done'" points="20 6 9 17 4 12" />
              <circle v-else cx="12" cy="12" r="9" />
            </svg>
            <span>
              {{ currentPrereqModalStatus === 'done' ? '已完成（取消勾選可改回未完成）' : '標記為已完成' }}
            </span>
          </button>

          <!-- 獎勵 -->
          <div class="detail-rewards-grid">
            <div class="reward-box">
              <span class="reward-label">能力點獎勵</span>
              <strong class="reward-val font-num" :class="currentPrereqModalTask.statsPoints > 0 ? 'pt-stats' : 'pt-zero'">
                +{{ currentPrereqModalTask.statsPoints }}
              </strong>
            </div>
            <div class="reward-box">
              <span class="reward-label">技能點獎勵</span>
              <strong class="reward-val font-num" :class="currentPrereqModalTask.skillPoints > 0 ? 'pt-skills' : 'pt-zero'">
                +{{ currentPrereqModalTask.skillPoints }}
              </strong>
            </div>
          </div>

          <!-- 接取條件 -->
          <div class="detail-block">
            <h3 class="block-title">接取條件</h3>
            <div v-if="currentPrereqModalRequirements.length > 0" class="req-capsules">
              <span
                v-for="(req, idx) in currentPrereqModalRequirements"
                :key="idx"
                class="req-capsule"
                :class="{ 'is-warning-capsule': req.isWarning }"
              >
                {{ req.text }}
              </span>
            </div>
            <p v-else class="muted-empty-text">沒有額外條件</p>
          </div>

          <!-- 它自己的前置任務 -->
          <div class="detail-block">
            <div class="block-title-row">
              <h3 class="block-title">前置任務</h3>
              <span v-if="currentPrereqModalPrereqs.isSameGroupAny" class="same-group-any-hint">
                完成其中一個即可
              </span>
            </div>

            <div v-if="currentPrereqModalPrereqs.items.length > 0" class="prereq-list">
              <template v-for="item in currentPrereqModalPrereqs.items" :key="item.id">
                <button
                  v-if="item.exists"
                  type="button"
                  class="prereq-row-btn"
                  @click="pushPrereqModal(item.id)"
                >
                  <span class="status-dot" :class="item.isCompleted ? 'dot-done' : 'dot-todo'" aria-hidden="true"></span>
                  <span class="prereq-name">{{ item.cleanName }}</span>
                  <span class="prereq-status-text" :class="item.isCompleted ? 'text-done' : 'text-todo'">
                    {{ item.isCompleted ? '已完成' : '未完成' }}
                  </span>
                </button>
                <div v-else class="prereq-row-missing is-warning-hint">
                  <span class="status-dot dot-todo" aria-hidden="true"></span>
                  <span class="prereq-name">此任務不存在於資料庫 ({{ item.id }})</span>
                  <span class="prereq-status-text text-todo">未完成</span>
                </div>
              </template>
            </div>
            <p v-else class="muted-empty-text">無</p>
          </div>

          <!-- 地點與 NPC -->
          <div class="detail-block">
            <h3 class="block-title">地點與 NPC</h3>
            <dl class="meta-dl">
              <div class="meta-pair">
                <dt>地點</dt>
                <dd>{{ currentPrereqModalTask.locationText }}</dd>
              </div>
              <div class="meta-pair">
                <dt>NPC</dt>
                <dd>{{ currentPrereqModalTask.npcName }}</dd>
              </div>
              <div class="meta-pair">
                <dt>分類</dt>
                <dd>{{ currentPrereqModalTask.categoryName }}</dd>
              </div>
            </dl>
          </div>

          <!-- 群組說明 -->
          <div v-if="currentPrereqModalGroupDesc" class="detail-block">
            <h3 class="block-title">群組說明</h3>
            <p class="group-desc-box">{{ currentPrereqModalGroupDesc.text }}</p>
          </div>
        </div>

        <div class="dialog-footer">
          <button
            v-if="prereqModalStack.length > 1"
            type="button"
            class="action-btn"
            @click="popPrereqModal"
          >
            <svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            <span>返回上一個</span>
          </button>

          <button
            type="button"
            class="action-btn is-accent"
            @click="switchFromPrereqToContext"
          >
            <svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
            <span>查看任務脈絡</span>
          </button>

          <button
            type="button"
            class="action-btn"
            @click="closePrereqModal"
          >
            <span>關閉</span>
          </button>
        </div>
      </div>
    </div>

    <!-- =====================================================================
         6. 任務脈絡視窗 (Task Context Modal)
         ===================================================================== -->
    <div
      v-if="isContextModalOpen && contextData"
      class="dialog-backdrop"
      @click="closeContextModal"
    >
      <div
        ref="contextDialogRef"
        class="dialog-panel context-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="context-dialog-title"
        tabindex="-1"
        @click.stop
      >
        <div class="dialog-header context-dialog-header">
          <div>
            <h2 id="context-dialog-title" class="detail-task-name">{{ contextData.centerNode.cleanName }}</h2>
            <p class="context-counts">
              前置 <span class="font-num">{{ contextData.totalPrereqCount }}</span> 個 · 後續 <span class="font-num">{{ contextData.totalFollowUpCount }}</span> 個
            </p>
          </div>

          <div class="context-header-actions">
            <button
              v-if="contextCenterTaskId !== contextOriginTaskId && contextOriginCleanName"
              type="button"
              class="action-btn is-accent"
              @click="contextCenterTaskId = contextOriginTaskId"
            >
              <span>回到「{{ contextOriginCleanName }}」</span>
            </button>

            <button
              type="button"
              class="action-btn"
              @click="closeContextModal"
            >
              <span>關閉</span>
            </button>
          </div>
        </div>

        <div class="dialog-body context-dialog-body">
          <!-- 往上前置各代 -->
          <template v-for="layer in contextData.upLayers" :key="`up-${layer.distance}`">
            <div class="context-generation">
              <div class="generation-label">{{ layer.title }}</div>
              <div class="generation-nodes">
                <button
                  v-for="node in layer.nodes"
                  :key="node.id"
                  type="button"
                  class="context-node-btn"
                  :class="`status-${node.status}`"
                  :disabled="!node.exists"
                  @click="node.exists && (contextCenterTaskId = node.id)"
                >
                  <div class="node-name">{{ node.cleanName }}</div>
                  <div class="node-meta-row">
                    <span class="node-status-tag" :class="`tag-${node.status}`">{{ node.statusLabel }}</span>
                    <span class="node-points font-num">{{ node.pointsText }}</span>
                  </div>
                </button>
              </div>
              <div v-if="layer.overflowCount > 0" class="generation-overflow">
                還有 <span class="font-num">{{ layer.overflowCount }}</span> 個
              </div>
            </div>

            <div class="generation-arrow" aria-hidden="true">
              <svg class="arrow-down-svg" viewBox="0 0 24 24">
                <line x1="12" y1="4" x2="12" y2="20" />
                <polyline points="18 14 12 20 6 14" />
              </svg>
            </div>
          </template>

          <!-- 目前檢視的任務 (中心節點) -->
          <div class="context-generation is-center-generation">
            <div class="generation-label">目前檢視的任務</div>
            <div class="generation-nodes is-single-center">
              <button
                type="button"
                class="context-node-btn is-center-node"
                :class="`status-${contextData.centerNode.status}`"
                @click="contextCenterTaskId = contextData.centerNode.id"
              >
                <div class="node-name">{{ contextData.centerNode.cleanName }}</div>
                <div class="node-meta-row">
                  <span class="node-status-tag" :class="`tag-${contextData.centerNode.status}`">
                    {{ contextData.centerNode.statusLabel }}
                  </span>
                  <span class="node-points font-num">{{ contextData.centerNode.pointsText }}</span>
                </div>
              </button>
            </div>
          </div>

          <!-- 無任何前置與後續時的說明 -->
          <p v-if="contextData.isIsolated" class="isolated-context-note">
            這個任務沒有前置或後續任務。
          </p>

          <!-- 往下後續各代 -->
          <template v-for="layer in contextData.downLayers" :key="`down-${layer.distance}`">
            <div class="generation-arrow" aria-hidden="true">
              <svg class="arrow-down-svg" viewBox="0 0 24 24">
                <line x1="12" y1="4" x2="12" y2="20" />
                <polyline points="18 14 12 20 6 14" />
              </svg>
            </div>

            <div class="context-generation">
              <div class="generation-label">{{ layer.title }}</div>
              <div class="generation-nodes">
                <button
                  v-for="node in layer.nodes"
                  :key="node.id"
                  type="button"
                  class="context-node-btn"
                  :class="`status-${node.status}`"
                  :disabled="!node.exists"
                  @click="node.exists && (contextCenterTaskId = node.id)"
                >
                  <div class="node-name">{{ node.cleanName }}</div>
                  <div class="node-meta-row">
                    <span class="node-status-tag" :class="`tag-${node.status}`">{{ node.statusLabel }}</span>
                    <span class="node-points font-num">{{ node.pointsText }}</span>
                  </div>
                </button>
              </div>
              <div v-if="layer.overflowCount > 0" class="generation-overflow">
                還有 <span class="font-num">{{ layer.overflowCount }}</span> 個
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- =====================================================================
         匯入進度對話框 (支援選擇 JSON 檔案或貼上 JSON 文字，並檢查版本號差異)
         ===================================================================== -->
    <div
      v-if="isImportModalOpen"
      class="dialog-backdrop"
      @click="closeImportModal"
    >
      <div
        ref="importDialogRef"
        class="dialog-panel small-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-dialog-title"
        tabindex="-1"
        @click.stop
      >
        <div class="dialog-header">
          <h2 id="import-dialog-title" class="detail-task-name">匯入進度</h2>
        </div>

        <div class="dialog-body">
          <p class="dialog-desc">
            選擇先前匯出的 JSON 備份檔案，或直接在下方貼上進度 JSON 內容還原（當前任務庫版本：<span class="font-num">{{ dbVersion || '—' }}</span>）：
          </p>

          <button
            type="button"
            class="large-toggle-btn"
            @click="triggerFileSelect"
          >
            <svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <span>選擇 JSON 檔案匯入</span>
          </button>

          <div class="detail-block">
            <label for="import-json-textarea" class="block-title">或貼上 JSON 內容</label>
            <textarea
              id="import-json-textarea"
              v-model="importJsonText"
              class="json-textarea font-num"
              rows="5"
              :placeholder="`{&quot;version&quot;:&quot;${dbVersion || '26101718'}&quot;,&quot;done&quot;:[&quot;quest-0179&quot;]}`"
            ></textarea>
          </div>
        </div>

        <div class="dialog-footer">
          <button
            type="button"
            class="action-btn is-accent"
            @click="handleImportFromText"
          >
            <span>套用貼上內容</span>
          </button>
          <button
            type="button"
            class="action-btn"
            @click="closeImportModal"
          >
            <span>關閉</span>
          </button>
        </div>
      </div>
    </div>

    <!-- =====================================================================
         雲端同步對話框 (整合 completed_tasks，具上傳/下載覆蓋警告與版本比對)
         ===================================================================== -->
    <div
      v-if="isCloudModalOpen"
      class="dialog-backdrop"
      @click="closeCloudModal"
    >
      <div
        ref="cloudDialogRef"
        class="dialog-panel small-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cloud-dialog-title"
        tabindex="-1"
        @click.stop
      >
        <div class="dialog-header">
          <h2 id="cloud-dialog-title" class="detail-task-name">雲端進度同步</h2>
        </div>

        <div class="dialog-body">
          <template v-if="isLoggedIn && currentUser">
            <div class="user-sync-card">
              <div class="user-sync-role">
                [{{ currentUser.server }}][{{ currentUser.school }}][{{ currentUser.dept }}] {{ currentUser.charId }}
              </div>
              <div class="user-sync-code font-num">識別碼 (Key)：{{ currentUser.code }}</div>
            </div>

            <!-- 二次警告確認步驟 -->
            <template v-if="pendingCloudAction">
              <div class="hint-banner is-warning-hint">
                <template v-if="pendingCloudAction === 'upload'">
                  警告：上傳進度將會<strong>覆蓋雲端</strong>（識別碼：{{ currentUser.code }}）原有的任務紀錄，確定要繼續上傳嗎？
                </template>
                <template v-else>
                  警告：從雲端下載將會<strong>覆蓋當前畫面</strong>上的任務完成進度，確定要繼續下載嗎？
                </template>
              </div>

              <div class="cloud-confirm-row">
                <button
                  type="button"
                  class="action-btn is-accent cloud-confirm-exec-btn"
                  :disabled="isCloudSyncing"
                  @click="executeConfirmedCloudAction"
                >
                  <span>{{ isCloudSyncing ? '同步處理中...' : '確定覆蓋並執行' }}</span>
                </button>
                <button
                  type="button"
                  class="action-btn"
                  :disabled="isCloudSyncing"
                  @click="pendingCloudAction = null"
                >
                  <span>返回取消</span>
                </button>
              </div>
            </template>

            <template v-else>
              <p class="dialog-desc">
                目前畫面已勾選 <span class="font-num">{{ doneIds.length }}</span> 筆任務（任務庫版本：<span class="font-num">{{ dbVersion || '—' }}</span>）。請選擇同步方向：
              </p>

              <div class="cloud-btn-stack">
                <button
                  type="button"
                  class="large-toggle-btn"
                  :disabled="isCloudSyncing"
                  @click="pendingCloudAction = 'upload'"
                >
                  <svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true">
                    <polyline points="16 16 12 12 8 16" />
                    <line x1="12" y1="12" x2="12" y2="21" />
                    <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
                  </svg>
                  <span>上傳進度至雲端</span>
                </button>

                <button
                  type="button"
                  class="action-btn is-full-width"
                  :disabled="isCloudSyncing"
                  @click="pendingCloudAction = 'download'"
                >
                  <svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true">
                    <polyline points="8 17 12 21 16 17" />
                    <line x1="12" y1="12" x2="12" y2="21" />
                    <path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.29" />
                  </svg>
                  <span>從雲端同步至當前畫面</span>
                </button>
              </div>
            </template>
          </template>

          <template v-else>
            <div class="hint-banner is-warning-hint">
              尚未登入角色身分，雲端同步需綁定角色識別碼。未登入時可使用「匯出進度／匯入進度」備份紀錄。
            </div>
            <router-link to="/" class="large-toggle-btn link-as-btn" @click="closeCloudModal">
              <span>前往首頁登入／註冊角色</span>
            </router-link>
          </template>
        </div>

        <div class="dialog-footer">
          <button
            type="button"
            class="action-btn"
            @click="closeCloudModal"
          >
            <span>關閉</span>
          </button>
        </div>
      </div>
    </div>

    <!-- =====================================================================
         上傳已完成任務圖片對話框 (OCR 圖片轉文字 + 跨次去重累加 + 嚴格名稱相符匯入)
         ===================================================================== -->
    <div
      v-if="isOcrModalOpen"
      class="dialog-backdrop"
      @click="closeOcrModal"
    >
      <div
        ref="ocrDialogRef"
        class="dialog-panel ocr-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ocr-dialog-title"
        tabindex="-1"
        @click.stop
      >
        <!-- 百分比進度遮罩 -->
        <div v-if="isOcrParsing" class="ocr-progress-mask" role="status" aria-live="polite">
          <div class="ocr-progress-box">
            <div class="ocr-progress-percent font-num">{{ ocrProgress.percent }}%</div>
            <div class="progress-track ocr-progress-track">
              <div
                class="progress-fill fill-snipper"
                :style="{ width: `${ocrProgress.percent}%` }"
              ></div>
            </div>
            <p class="ocr-progress-status">{{ ocrProgress.statusText }}</p>
          </div>
        </div>

        <div class="dialog-header ocr-dialog-header">
          <div>
            <h2 id="ocr-dialog-title" class="detail-task-name">上傳已完成任務圖片</h2>
            <p class="ocr-header-sub">
              支援多選或拖拉最多 {{ MAX_OCR_IMAGES }} 張「已完成任務」截圖，解析文字後自動比對名稱勾選任務
            </p>
          </div>
          <button
            type="button"
            class="action-btn is-snipper-btn sample-image-btn"
            @click="isSampleImageModalOpen = true"
          >
            <svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <span>範例圖片</span>
          </button>
        </div>

        <div class="dialog-body ocr-dialog-body">
          <!-- 拖拉或點選圖片上傳區 -->
          <div
            class="ocr-dropzone"
            :class="{ 'is-dragging': isDraggingOver }"
            role="button"
            tabindex="0"
            aria-label="點選或拖拉已完成任務圖片至此處上傳"
            @click="triggerOcrFileInput"
            @keydown.enter.prevent="triggerOcrFileInput"
            @keydown.space.prevent="triggerOcrFileInput"
            @dragover.prevent="isDraggingOver = true"
            @dragleave.prevent="isDraggingOver = false"
            @drop.prevent="handleOcrDrop"
          >
            <input
              ref="ocrFileInputRef"
              type="file"
              accept="image/*"
              multiple
              class="sr-only-input"
              aria-label="選擇已完成任務截圖檔案"
              @change="handleOcrFileSelect"
            />
            <svg class="ocr-drop-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <div class="ocr-drop-title">點選選取圖片，或將圖片直接拖拉至此</div>
            <div class="ocr-drop-hint">
              可多選或一次拖拉多張（單次上限 <span class="font-num">{{ MAX_OCR_IMAGES }}</span> 張，目前已選 <span class="font-num">{{ ocrFiles.length }}</span> 張）
            </div>
          </div>

          <!-- 已選圖片清單與解析按鈕 -->
          <div v-if="ocrFiles.length > 0" class="ocr-files-section">
            <div class="ocr-files-bar">
              <span class="ocr-files-count">
                待解析圖片：<strong class="font-num">{{ ocrFiles.length }} / {{ MAX_OCR_IMAGES }}</strong> 張
              </span>
              <button
                type="button"
                class="text-link-btn"
                @click="clearOcrFiles"
              >
                清空已選圖片
              </button>
            </div>

            <div class="ocr-file-chips">
              <span
                v-for="(file, idx) in ocrFiles"
                :key="`${file.name}-${idx}`"
                class="ocr-file-chip"
              >
                <span class="ocr-chip-name">{{ file.name }}</span>
                <button
                  type="button"
                  class="ocr-chip-remove"
                  :aria-label="`移除圖片 ${file.name}`"
                  @click="removeOcrFile(idx)"
                >
                  ×
                </button>
              </span>
            </div>
          </div>

          <button
            type="button"
            class="large-toggle-btn ocr-parse-btn"
            :disabled="ocrFiles.length === 0 || isOcrParsing"
            @click="handleParseOcrImages"
          >
            <svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            <span>解析圖片（共 {{ ocrFiles.length }} 張）</span>
          </button>

          <!-- 解析後的文字欄位（可多次解析累加去重，亦可手動輸入） -->
          <div class="ocr-textarea-section">
            <div class="ocr-textarea-header">
              <label for="ocr-parsed-textarea" class="block-title">
                解析後的文字欄位（一行一個任務名稱，可手動編輯或多次解析自動去重累加）
              </label>
              <div class="ocr-textarea-meta">
                <span class="ratio-pill font-num">
                  共 {{ ocrParsedLineCount }} 筆 · 匹配任務庫 {{ ocrMatchPreview.matchedTaskIds.length }} 筆
                </span>
                <button
                  v-if="ocrParsedText"
                  type="button"
                  class="text-link-btn"
                  @click="ocrParsedText = ''"
                >
                  清空文字
                </button>
              </div>
            </div>

            <textarea
              id="ocr-parsed-textarea"
              v-model="ocrParsedText"
              class="json-textarea ocr-parsed-textarea"
              rows="8"
              placeholder="按下上方「解析圖片」後會將辨識出的任務名稱顯示於此（重複名稱不會重複加入）；您也可以直接在此手動輸入或貼上其他工具轉換出的任務文字..."
            ></textarea>

            <p class="ocr-strict-note">
              提示：匯入時僅會勾選「名稱相符」的任務；若該任務的前置任務未出現在上方文字清單內，不會自動將前置任務視為已完成。
            </p>
          </div>
        </div>

        <div class="dialog-footer">
          <button
            type="button"
            class="action-btn is-accent ocr-apply-import-btn"
            :disabled="ocrParsedLineCount === 0 || isOcrParsing"
            @click="handleApplyOcrMatchedTasks"
          >
            <svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>匯入上述已完成的任務</span>
          </button>
          <button
            type="button"
            class="action-btn"
            :disabled="isOcrParsing"
            @click="closeOcrModal"
          >
            <span>關閉</span>
          </button>
        </div>
      </div>
    </div>

    <!-- =====================================================================
         範例圖片懸浮子視窗 (\public\assets\tasks\upload-sample.png)
         ===================================================================== -->
    <div
      v-if="isSampleImageModalOpen"
      class="dialog-backdrop sample-modal-backdrop"
      @click="isSampleImageModalOpen = false"
    >
      <div
        class="dialog-panel sample-image-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sample-dialog-title"
        tabindex="-1"
        @click.stop
      >
        <div class="dialog-header">
          <h2 id="sample-dialog-title" class="detail-task-name">上傳截圖範例圖片</h2>
        </div>

        <div class="dialog-body sample-dialog-body">
          <p class="dialog-desc">
            請於遊戲內開啟「任務（快速鍵 T）→ 已完成任務」分頁，擷取如下方範例的任務清單畫面後上傳：
          </p>
          <div class="sample-image-frame">
            <img
              :src="SAMPLE_IMAGE_URL"
              alt="已完成任務截圖範例"
              class="sample-preview-img"
            />
          </div>
        </div>

        <div class="dialog-footer">
          <button
            type="button"
            class="action-btn is-accent close-sample-btn"
            @click="isSampleImageModalOpen = false"
          >
            <span>關閉範例</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useAuth } from '@/composables/useAuth.js'
import {
  VERSION_MISMATCH_WARNING,
  MAX_OCR_IMAGES,
  buildTaskIndexes,
  planToggleTaskWithCascade,
  applyBatchTaskIds,
  getTaskStatus,
  countTaskListCompletion,
  calculateOverallStats,
  evaluatePrerequisites,
  formatRequirements,
  getGroupDescription,
  buildTaskContext,
  formatVersionOrDate,
  parseProgressPayload,
  serializeProgressData,
  filterTasksByQuery,
  mergeUniqueQuestLines,
  matchQuestLinesToTaskIds,
} from '@/utils/taskLogic.js'
import {
  loadMetaTasks,
  syncProgressToCloud,
  fetchProgressFromCloud,
} from '@/services/taskService.js'
import { recognizeQuestImagesBatch } from '@/services/ocrService.js'

const SAMPLE_IMAGE_URL = '/assets/tasks/upload-sample.png'
const { currentUser, isLoggedIn } = useAuth()

// --- 資料與核心狀態（不依賴 localStorage 自動存取，純靠匯出入與雲端同步） ---
const rawTasks = ref([])
const dbVersion = ref('')
const loadError = ref('')
const doneIds = ref([])
const searchQuery = ref('')

// 初始狀態：第一次開啟時分類全部收合，中欄、右欄顯示提示
const expandedCategories = ref([])
const selectedNpcKey = ref(null)
const selectedTaskId = ref(null)

// DOM 參照
const taskListPanelRef = ref(null)
const detailPanelRef = ref(null)
const fileInputRef = ref(null)
const ocrFileInputRef = ref(null)
const cascadeDialogRef = ref(null)
const prereqDialogRef = ref(null)
const contextDialogRef = ref(null)
const importDialogRef = ref(null)
const cloudDialogRef = ref(null)
const ocrDialogRef = ref(null)
const lastTriggerElement = ref(null)

// 視窗狀態
const pendingCascadePlan = ref(null)
const prereqModalStack = ref([])
const isContextModalOpen = ref(false)
const contextOriginTaskId = ref(null)
const contextCenterTaskId = ref(null)
const isImportModalOpen = ref(false)
const importJsonText = ref('')
const isCloudModalOpen = ref(false)
const pendingCloudAction = ref(null)
const isCloudSyncing = ref(false)

// OCR 圖片上傳與解析視窗狀態
const isOcrModalOpen = ref(false)
const isSampleImageModalOpen = ref(false)
const ocrFiles = ref([])
const isDraggingOver = ref(false)
const isOcrParsing = ref(false)
const ocrProgress = ref({
  percent: 0,
  currentIndex: 0,
  total: 0,
  statusText: '',
})
const ocrParsedText = ref('')

// 頂部狀態橫幅
const statusBanner = ref(null)
const showStatus = (text, type = 'success') => {
  statusBanner.value = { text, type }
}

// --- 索引與衍生計算 ---
const indexes = computed(() => buildTaskIndexes(rawTasks.value))

const doneSet = computed(() => new Set(doneIds.value))

const overallStats = computed(() =>
  calculateOverallStats(
    Array.from(indexes.value.taskMap.values()),
    doneSet.value,
    indexes.value
  )
)

const formattedVersion = computed(() => formatVersionOrDate(dbVersion.value))

// 搜尋狀態與結果
const isSearching = computed(() => searchQuery.value.trim().length > 0)

const searchResults = computed(() => {
  if (!isSearching.value) return []
  return filterTasksByQuery(searchQuery.value, doneSet.value, indexes.value)
})

// 左欄分類樹與各分類/NPC完成數
const categoryTree = computed(() => {
  return indexes.value.categories.map((cat) => {
    const catStats = countTaskListCompletion(cat.tasks, doneSet.value, indexes.value)
    const npcs = cat.npcs.map((npc) => {
      const npcStats = countTaskListCompletion(npc.tasks, doneSet.value, indexes.value)
      const enrichedTasks = npc.tasks.map((task) => ({
        ...task,
        status: getTaskStatus(task, doneSet.value, indexes.value),
      }))
      return {
        ...npc,
        stats: npcStats,
        tasks: enrichedTasks,
      }
    })
    return {
      name: cat.name,
      stats: catStats,
      npcs,
    }
  })
})

// 中欄目前選取的 NPC
const selectedNpc = computed(() => {
  if (!selectedNpcKey.value) return null
  for (const cat of categoryTree.value) {
    const found = cat.npcs.find((n) => n.key === selectedNpcKey.value)
    if (found) return found
  }
  return null
})

// 右欄目前選取的任務與衍生資訊
const selectedTask = computed(() => {
  if (!selectedTaskId.value) return null
  return indexes.value.taskMap.get(selectedTaskId.value) || null
})

const selectedTaskStatus = computed(() => {
  if (!selectedTask.value) return 'todo'
  return getTaskStatus(selectedTask.value, doneSet.value, indexes.value)
})

const selectedTaskPrereqs = computed(() =>
  evaluatePrerequisites(selectedTask.value, doneSet.value, indexes.value)
)

const selectedTaskRequirements = computed(() =>
  formatRequirements(selectedTask.value, doneSet.value, indexes.value)
)

const selectedTaskGroupDesc = computed(() =>
  getGroupDescription(selectedTask.value, indexes.value)
)

// --- 5. 前置任務浮動視窗衍生資料 ---
const currentPrereqModalTask = computed(() => {
  if (prereqModalStack.value.length === 0) return null
  const topId = prereqModalStack.value[prereqModalStack.value.length - 1]
  return indexes.value.taskMap.get(topId) || null
})

const currentPrereqModalStatus = computed(() => {
  if (!currentPrereqModalTask.value) return 'todo'
  return getTaskStatus(currentPrereqModalTask.value, doneSet.value, indexes.value)
})

const currentPrereqModalPrereqs = computed(() =>
  evaluatePrerequisites(currentPrereqModalTask.value, doneSet.value, indexes.value)
)

const currentPrereqModalRequirements = computed(() =>
  formatRequirements(currentPrereqModalTask.value, doneSet.value, indexes.value)
)

const currentPrereqModalGroupDesc = computed(() =>
  getGroupDescription(currentPrereqModalTask.value, indexes.value)
)

// --- 6. 任務脈絡視窗衍生資料 ---
const contextData = computed(() => {
  if (!isContextModalOpen.value || !contextCenterTaskId.value) return null
  return buildTaskContext(contextCenterTaskId.value, doneSet.value, indexes.value)
})

const contextOriginCleanName = computed(() => {
  if (!contextOriginTaskId.value) return ''
  const task = indexes.value.taskMap.get(contextOriginTaskId.value)
  return task ? task.cleanName : ''
})

// --- 互動處理函式 ---
const getPercent = (val, max) => {
  if (!max || max <= 0) return '0%'
  const pct = Math.min(100, Math.max(0, (val / max) * 100))
  return `${pct.toFixed(1)}%`
}

const isCategoryExpanded = (catName) => expandedCategories.value.includes(catName)

const toggleCategory = (catName) => {
  const idx = expandedCategories.value.indexOf(catName)
  if (idx > -1) {
    expandedCategories.value.splice(idx, 1)
  } else {
    expandedCategories.value.push(catName)
  }
}

const scrollToElementOnMobile = (elRef) => {
  if (typeof window !== 'undefined' && window.innerWidth <= 1120 && elRef?.value) {
    if (typeof elRef.value.scrollIntoView === 'function') {
      elRef.value.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }
}

const selectNpc = (npcKey) => {
  searchQuery.value = ''
  selectedNpcKey.value = npcKey
  selectedTaskId.value = null
  nextTick(() => {
    scrollToElementOnMobile(taskListPanelRef)
  })
}

const selectTask = (taskId) => {
  selectedTaskId.value = taskId
  nextTick(() => {
    scrollToElementOnMobile(detailPanelRef)
  })
}

/**
 * 點擊模糊搜尋結果中的任務：自動展開該任務所屬 category、選取該 npc 並選取該任務
 */
const handleSelectSearchResult = (task) => {
  if (!task) return
  if (!expandedCategories.value.includes(task.categoryName)) {
    expandedCategories.value.push(task.categoryName)
  }
  selectedNpcKey.value = `${task.categoryName}__${task.npcName}`
  selectedTaskId.value = task.id
  searchQuery.value = ''
  nextTick(() => {
    scrollToElementOnMobile(detailPanelRef)
  })
}

/**
 * 勾選或取消勾選任務（若存在未完成前置或已完成後續，彈出確認提示視窗）
 */
const handleToggleTask = (taskId, event) => {
  const plan = planToggleTaskWithCascade(doneIds.value, taskId, indexes.value)
  if (!plan.needsConfirm) {
    doneIds.value = plan.nextDoneIds
    return
  }

  // 若由原生 checkbox 觸發，先還原視覺勾選狀態直到使用者按下確認
  if (event?.target && typeof event.target.checked === 'boolean') {
    event.target.checked = doneSet.value.has(taskId)
  }

  lastTriggerElement.value = event?.currentTarget || document.activeElement
  pendingCascadePlan.value = plan
  nextTick(() => {
    cascadeDialogRef.value?.focus()
  })
}

const confirmCascadePlan = () => {
  if (!pendingCascadePlan.value) return
  doneIds.value = pendingCascadePlan.value.nextDoneIds
  pendingCascadePlan.value = null
  restoreFocus()
}

const cancelCascadePlan = () => {
  pendingCascadePlan.value = null
  restoreFocus()
}

// --- Modal 焦點與背景捲動控制 ---
const isAnyModalOpen = computed(
  () =>
    Boolean(pendingCascadePlan.value) ||
    prereqModalStack.value.length > 0 ||
    isContextModalOpen.value ||
    isImportModalOpen.value ||
    isCloudModalOpen.value ||
    isOcrModalOpen.value ||
    isSampleImageModalOpen.value
)

watch(isAnyModalOpen, (open) => {
  if (typeof document !== 'undefined') {
    document.body.style.overflow = open ? 'hidden' : ''
  }
})

const restoreFocus = () => {
  const trigger = lastTriggerElement.value
  lastTriggerElement.value = null
  if (trigger && typeof trigger.focus === 'function') {
    nextTick(() => {
      trigger.focus()
    })
  }
}

const openPrereqModal = (taskId, event) => {
  if (!indexes.value.taskMap.has(taskId)) return
  lastTriggerElement.value = event?.currentTarget || document.activeElement
  isContextModalOpen.value = false
  isImportModalOpen.value = false
  isCloudModalOpen.value = false
  isOcrModalOpen.value = false
  prereqModalStack.value = [taskId]
  nextTick(() => {
    prereqDialogRef.value?.focus()
  })
}

const pushPrereqModal = (taskId) => {
  if (!indexes.value.taskMap.has(taskId)) return
  prereqModalStack.value.push(taskId)
  nextTick(() => {
    prereqDialogRef.value?.focus()
  })
}

const popPrereqModal = () => {
  if (prereqModalStack.value.length > 1) {
    prereqModalStack.value.pop()
  }
}

const closePrereqModal = () => {
  prereqModalStack.value = []
  restoreFocus()
}

const openContextModal = (taskId, event) => {
  if (!indexes.value.taskMap.has(taskId)) return
  if (event?.currentTarget) {
    lastTriggerElement.value = event.currentTarget
  } else if (!lastTriggerElement.value) {
    lastTriggerElement.value = document.activeElement
  }
  prereqModalStack.value = []
  isImportModalOpen.value = false
  isCloudModalOpen.value = false
  isOcrModalOpen.value = false
  contextOriginTaskId.value = taskId
  contextCenterTaskId.value = taskId
  isContextModalOpen.value = true
  nextTick(() => {
    contextDialogRef.value?.focus()
  })
}

const switchFromPrereqToContext = () => {
  const currentId = currentPrereqModalTask.value?.id
  if (!currentId) return
  prereqModalStack.value = []
  contextOriginTaskId.value = currentId
  contextCenterTaskId.value = currentId
  isContextModalOpen.value = true
  nextTick(() => {
    contextDialogRef.value?.focus()
  })
}

const closeContextModal = () => {
  isContextModalOpen.value = false
  contextOriginTaskId.value = null
  contextCenterTaskId.value = null
  restoreFocus()
}

// --- 匯出與匯入進度 ---
const handleExportProgress = () => {
  const jsonStr = serializeProgressData(doneIds.value, dbVersion.value)
  try {
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'ran2-quest-progress.json'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    showStatus('已匯出進度檔案 (ran2-quest-progress.json)', 'success')
  } catch {
    showStatus('已產生進度資料', 'success')
  }
}

const openImportDialog = (event) => {
  lastTriggerElement.value = event?.currentTarget || document.activeElement
  prereqModalStack.value = []
  isContextModalOpen.value = false
  isCloudModalOpen.value = false
  isOcrModalOpen.value = false
  importJsonText.value = ''
  isImportModalOpen.value = true
  nextTick(() => {
    importDialogRef.value?.focus()
  })
}

const closeImportModal = () => {
  isImportModalOpen.value = false
  restoreFocus()
}

const triggerFileSelect = () => {
  fileInputRef.value?.click()
}

const applyImportedRawData = (rawContent) => {
  const parsed = parseProgressPayload(rawContent, indexes.value, dbVersion.value)
  if (!parsed.valid) {
    showStatus('匯入格式不正確，請確認是否為有效的進度 JSON', 'warning')
    return
  }
  doneIds.value = parsed.doneIds
  isImportModalOpen.value = false
  restoreFocus()

  if (parsed.versionMismatch) {
    showStatus(VERSION_MISMATCH_WARNING, 'warning')
  } else {
    showStatus(`已成功還原進度（共勾選 ${parsed.doneIds.length} 個任務）`, 'success')
  }
}

const handleFileImportChange = async (event) => {
  const file = event.target?.files?.[0]
  if (!file) return
  try {
    const text = await file.text()
    applyImportedRawData(text)
  } catch {
    showStatus('讀取檔案失敗，請確認檔案格式是否為 JSON', 'warning')
  } finally {
    event.target.value = ''
  }
}

const handleImportFromText = () => {
  if (!importJsonText.value.trim()) {
    showStatus('請先貼上 JSON 內容', 'warning')
    return
  }
  applyImportedRawData(importJsonText.value)
}

// --- 雲端同步（含覆蓋警告與版本差異檢查） ---
const openCloudSyncModal = (event) => {
  lastTriggerElement.value = event?.currentTarget || document.activeElement
  prereqModalStack.value = []
  isContextModalOpen.value = false
  isImportModalOpen.value = false
  isOcrModalOpen.value = false
  pendingCloudAction.value = null
  isCloudModalOpen.value = true
  nextTick(() => {
    cloudDialogRef.value?.focus()
  })
}

const closeCloudModal = () => {
  isCloudModalOpen.value = false
  pendingCloudAction.value = null
  restoreFocus()
}

const executeConfirmedCloudAction = async () => {
  if (pendingCloudAction.value === 'upload') {
    await handleCloudUpload()
  } else if (pendingCloudAction.value === 'download') {
    await handleCloudDownload()
  }
}

const handleCloudUpload = async () => {
  if (!isLoggedIn.value || !currentUser.value?.code) return
  isCloudSyncing.value = true
  try {
    await syncProgressToCloud(currentUser.value.code, doneIds.value, dbVersion.value)
    closeCloudModal()
    showStatus('已成功將進度上傳備份至雲端！', 'success')
  } catch (err) {
    showStatus(`雲端上傳失敗：${err.message}`, 'warning')
  } finally {
    isCloudSyncing.value = false
  }
}

const handleCloudDownload = async () => {
  if (!isLoggedIn.value || !currentUser.value?.code) return
  isCloudSyncing.value = true
  try {
    const res = await fetchProgressFromCloud(currentUser.value.code, indexes.value, dbVersion.value)
    if (!res.exists) {
      closeCloudModal()
      showStatus('雲端尚無此角色的進度紀錄', 'warning')
      return
    }
    doneIds.value = res.doneIds
    closeCloudModal()
    if (res.versionMismatch) {
      showStatus(VERSION_MISMATCH_WARNING, 'warning')
    } else {
      showStatus(`已從雲端同步進度（共勾選 ${res.doneIds.length} 個任務）`, 'success')
    }
  } catch (err) {
    showStatus(`雲端下載失敗：${err.message}`, 'warning')
  } finally {
    isCloudSyncing.value = false
  }
}

// --- 上傳已完成任務圖片 (OCR 解析與嚴格名稱匯入) ---
const ocrParsedLineCount = computed(() => {
  return ocrParsedText.value
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean).length
})

const ocrMatchPreview = computed(() => {
  return matchQuestLinesToTaskIds(ocrParsedText.value, indexes.value)
})

const openOcrModal = (event) => {
  lastTriggerElement.value = event?.currentTarget || document.activeElement
  prereqModalStack.value = []
  isContextModalOpen.value = false
  isImportModalOpen.value = false
  isCloudModalOpen.value = false
  isOcrModalOpen.value = true
  nextTick(() => {
    ocrDialogRef.value?.focus()
  })
}

const closeOcrModal = () => {
  if (isOcrParsing.value) return
  isSampleImageModalOpen.value = false
  isOcrModalOpen.value = false
  restoreFocus()
}

const triggerOcrFileInput = () => {
  if (isOcrParsing.value) return
  ocrFileInputRef.value?.click()
}

const addOcrFiles = (incomingFileList) => {
  const incoming = Array.from(incomingFileList || []).filter(
    (f) => f && (!f.type || f.type.startsWith('image/'))
  )
  if (incoming.length === 0) return

  const combined = [...ocrFiles.value, ...incoming]
  if (combined.length > MAX_OCR_IMAGES) {
    ocrFiles.value = combined.slice(0, MAX_OCR_IMAGES)
    showStatus(`一次最多僅能放入 ${MAX_OCR_IMAGES} 張圖片，已自動保留前 ${MAX_OCR_IMAGES} 張`, 'warning')
  } else {
    ocrFiles.value = combined
  }
}

const handleOcrFileSelect = (event) => {
  const files = event.target?.files
  if (files?.length) {
    addOcrFiles(files)
  }
  if (event.target) {
    event.target.value = ''
  }
}

const handleOcrDrop = (event) => {
  isDraggingOver.value = false
  if (isOcrParsing.value) return
  const files = event.dataTransfer?.files
  if (files?.length) {
    addOcrFiles(files)
  }
}

const removeOcrFile = (idx) => {
  ocrFiles.value.splice(idx, 1)
}

const clearOcrFiles = () => {
  ocrFiles.value = []
}

const handleParseOcrImages = async () => {
  if (ocrFiles.value.length === 0 || isOcrParsing.value) return
  isOcrParsing.value = true
  ocrProgress.value = {
    percent: 0,
    currentIndex: 1,
    total: ocrFiles.value.length,
    statusText: '準備開始解析圖片...',
  }

  try {
    const newNames = await recognizeQuestImagesBatch(
      ocrFiles.value,
      indexes.value,
      (prog) => {
        ocrProgress.value = prog
      }
    )

    ocrParsedText.value = mergeUniqueQuestLines(
      ocrParsedText.value,
      newNames,
      indexes.value
    )
    ocrFiles.value = []
  } catch (err) {
    showStatus(`解析圖片失敗：${err.message}`, 'warning')
  } finally {
    isOcrParsing.value = false
  }
}

/**
 * 根據「解析後的文字欄位」找出名稱相符的任務並自動勾選
 * 嚴格遵守：若完成的任務其前置任務不在解析的內容內，不可自動視為已完成
 */
const handleApplyOcrMatchedTasks = () => {
  if (ocrParsedText.value.trim()) {
    ocrParsedText.value = mergeUniqueQuestLines(
      '',
      ocrParsedText.value.split(/\r?\n/),
      indexes.value
    )
  }

  const { matchedTaskIds, totalLines } = matchQuestLinesToTaskIds(
    ocrParsedText.value,
    indexes.value
  )
  if (totalLines === 0) return

  if (matchedTaskIds.length === 0) {
    showStatus('解析後的文字欄位中未找到與任務庫名稱相符的任務', 'warning')
    return
  }

  doneIds.value = applyBatchTaskIds(doneIds.value, matchedTaskIds, indexes.value)
  closeOcrModal()
  showStatus(
    `已根據文字欄位匯入 ${matchedTaskIds.length} 筆名稱相符的任務（未在清單內的前置任務不會自動勾選）`,
    'success'
  )
}

// --- 全域 Esc 關閉視窗 ---
const handleGlobalKeydown = (e) => {
  if (e.key !== 'Escape') return
  if (isSampleImageModalOpen.value) {
    e.preventDefault()
    isSampleImageModalOpen.value = false
  } else if (pendingCascadePlan.value) {
    e.preventDefault()
    cancelCascadePlan()
  } else if (prereqModalStack.value.length > 0) {
    e.preventDefault()
    closePrereqModal()
  } else if (isContextModalOpen.value) {
    e.preventDefault()
    closeContextModal()
  } else if (isImportModalOpen.value) {
    e.preventDefault()
    closeImportModal()
  } else if (isCloudModalOpen.value) {
    e.preventDefault()
    closeCloudModal()
  } else if (isOcrModalOpen.value && !isOcrParsing.value) {
    e.preventDefault()
    closeOcrModal()
  }
}

// --- 初始化讀取 ---
const initTasksPage = async () => {
  loadError.value = ''
  try {
    const data = await loadMetaTasks()
    rawTasks.value = data.tasks
    dbVersion.value = data.version
  } catch (err) {
    console.error('載入任務資料失敗:', err)
    loadError.value = `無法載入任務資料：${err.message}`
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleGlobalKeydown)
  initTasksPage()
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleGlobalKeydown)
  if (typeof document !== 'undefined') {
    document.body.style.overflow = ''
  }
})
</script>

<style scoped>
.quest-tracker-page {
  /* 結合任務指南主題色 (#00e5ff) 與強化邊界層次感的深色色票 */
  --qt-bg: #090e16;
  --qt-panel: #0f1722;
  --qt-card: #162130;
  --qt-card-hover: #1d2b3f;
  --qt-sub-bg: #182434;
  --qt-border: #2a3d54;
  --qt-border-strong: #3b5370;
  --qt-snipper: #00e5ff;
  --qt-snipper-glow: rgba(0, 229, 255, 0.25);
  --qt-text: #EDF2F7;
  --qt-muted: #94A8BE;
  --qt-accent: #3CC6B0;
  --qt-done-emerald: #10B981;
  --qt-done-bright: #34D399;
  --qt-stats: #F2A93B;
  --qt-skills: #7DB8FF;

  --qt-complete-text: #A9E6DA;
  --qt-complete-bg: #132B27;
  --qt-complete-border: #2F6F63;

  --qt-warn-text: #FFB59E;
  --qt-warn-bg: #2E1D18;
  --qt-warn-border: #8A4A36;

  font-family: 'Noto Sans TC', system-ui, -apple-system, sans-serif;
  color: var(--qt-text);
  background: linear-gradient(180deg, #0b121c 0%, #090e16 100%);
  border: 1px solid rgba(0, 229, 255, 0.28);
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.65), 0 0 24px rgba(0, 229, 255, 0.08);
  border-radius: 14px;
  padding: 22px;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  overflow-x: hidden;
}

.font-num {
  font-family: 'Chakra Petch', monospace, sans-serif;
}

.sr-only-input {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}

.icon-svg {
  width: 18px;
  height: 18px;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
  fill: none;
  flex-shrink: 0;
}

/* 頂部標題與工具列 */
.tracker-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 18px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--qt-border);
}

.tracker-title {
  font-size: 1.7rem;
  font-weight: 800;
  color: var(--qt-snipper);
  text-shadow: 0 0 12px rgba(0, 229, 255, 0.35);
  margin: 0 0 6px 0;
  line-height: 1.25;
}

.tracker-subtitle {
  font-size: 0.92rem;
  color: var(--qt-muted);
  margin: 0;
}

.tracker-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  padding: 8px 16px;
  background-color: var(--qt-card);
  color: var(--qt-text);
  border: 1px solid var(--qt-border-strong);
  border-radius: 8px;
  font-family: inherit;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
  transition: all 0.2s ease;
}

.action-btn:hover:not(:disabled) {
  border-color: var(--qt-snipper);
  background-color: var(--qt-card-hover);
  box-shadow: 0 0 12px var(--qt-snipper-glow);
}

.action-btn.is-snipper-btn {
  border-color: rgba(0, 229, 255, 0.55);
  background: linear-gradient(135deg, rgba(0, 229, 255, 0.14), rgba(22, 33, 48, 0.9));
  color: #e0faff;
}

.action-btn.is-accent {
  border-color: var(--qt-accent);
  color: var(--qt-complete-text);
  background-color: var(--qt-complete-bg);
}

.action-btn.is-full-width {
  width: 100%;
}

/* 狀態提示橫幅 */
.status-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 8px;
  margin-bottom: 16px;
  font-size: 0.9rem;
  font-weight: 500;
}

.status-banner-content {
  display: flex;
  align-items: center;
  gap: 10px;
}

.status-banner.is-success {
  color: var(--qt-complete-text);
  background-color: var(--qt-complete-bg);
  border: 1px solid var(--qt-complete-border);
}

.status-banner.is-warning {
  color: var(--qt-warn-text);
  background-color: var(--qt-warn-bg);
  border: 1px solid var(--qt-warn-border);
}

.banner-close-btn {
  min-width: 44px;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: inherit;
  cursor: pointer;
}

/* 統計卡 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.stat-card {
  background-color: var(--qt-panel);
  border: 1px solid var(--qt-border-strong);
  border-radius: 10px;
  padding: 14px 18px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.stat-card.card-accent-snipper {
  border-top: 3px solid var(--qt-snipper);
}

.stat-card.card-accent-stats {
  border-top: 3px solid var(--qt-stats);
}

.stat-card.card-accent-skills {
  border-top: 3px solid var(--qt-skills);
}

.stat-card-top {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 10px;
}

.stat-label {
  font-size: 0.94rem;
  color: var(--qt-text);
  font-weight: 600;
}

.stat-numbers {
  font-size: 1.25rem;
  color: var(--qt-text);
}

.stat-numbers strong {
  font-size: 1.5rem;
  font-weight: 700;
}

.stat-numbers.is-snipper strong {
  color: var(--qt-snipper);
}

.stat-numbers.is-stats strong {
  color: var(--qt-stats);
}

.stat-numbers.is-skills strong {
  color: var(--qt-skills);
}

.stat-sep {
  margin: 0 4px;
  color: var(--qt-muted);
}

.progress-track {
  width: 100%;
  height: 7px;
  background-color: #080c12;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 999px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.25s ease;
}

.fill-snipper {
  background: linear-gradient(90deg, #00b4d8, var(--qt-snipper));
  box-shadow: 0 0 8px var(--qt-snipper);
}

.fill-stats {
  background: linear-gradient(90deg, #d97706, var(--qt-stats));
}

.fill-skills {
  background: linear-gradient(90deg, #3b82f6, var(--qt-skills));
}

/* 三欄主體版面：左、中、右高度嚴格一致 */
.three-col-layout {
  display: grid;
  grid-template-columns: 310px minmax(0, 1fr) 390px;
  gap: 16px;
  align-items: stretch;
}

.col-panel {
  background-color: var(--qt-panel);
  border: 1px solid var(--qt-border-strong);
  border-radius: 12px;
  height: 680px;
  overflow-y: auto;
  padding: 14px;
  box-sizing: border-box;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.04);
  display: flex;
  flex-direction: column;
}

/* 左欄：分類樹與 NPC 列表 */
.category-block + .category-block {
  margin-top: 10px;
}

.category-row-btn {
  width: 100%;
  min-height: 48px;
  background-color: var(--qt-card);
  border: 1px solid var(--qt-border-strong);
  border-radius: 8px;
  padding: 10px 12px;
  color: var(--qt-text);
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
  transition: all 0.18s ease;
}

.category-row-btn:hover {
  background-color: var(--qt-card-hover);
  border-color: var(--qt-snipper);
}

.category-row-btn.is-expanded {
  border-color: var(--qt-snipper);
  background-color: #1a293c;
  box-shadow: 0 0 10px rgba(0, 229, 255, 0.15);
}

/* 當分類或 NPC 底下的任務全數完成時，使用顯眼的翡翠綠完成配色 */
.category-row-btn.is-all-completed,
.npc-row-btn.is-all-completed {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(6, 78, 59, 0.38) 100%);
  border-color: var(--qt-done-emerald);
  box-shadow: 0 0 12px rgba(16, 185, 129, 0.22);
}

.category-row-top,
.npc-row-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.category-name-wrap,
.npc-name-wrap {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  font-size: 0.94rem;
  min-width: 0;
}

.all-done-icon {
  width: 16px;
  height: 16px;
  stroke: var(--qt-done-bright);
  stroke-width: 2.5;
  stroke-linecap: round;
  stroke-linejoin: round;
  fill: none;
  flex-shrink: 0;
  filter: drop-shadow(0 0 4px rgba(52, 211, 153, 0.5));
}

.chevron-svg {
  width: 16px;
  height: 16px;
  stroke: var(--qt-muted);
  stroke-width: 2.2;
  fill: none;
  transition: transform 0.2s ease;
  flex-shrink: 0;
}

.chevron-svg.is-open {
  transform: rotate(90deg);
  stroke: var(--qt-snipper);
}

.ratio-pill {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--qt-muted);
  background-color: rgba(9, 14, 22, 0.65);
  border: 1px solid var(--qt-border);
  padding: 2px 8px;
  border-radius: 999px;
  flex-shrink: 0;
}

.ratio-pill.is-done-pill {
  color: #06281e;
  background-color: var(--qt-done-bright);
  border-color: var(--qt-done-bright);
  font-weight: 700;
}

.category-mini-progress {
  width: 100%;
  height: 4px;
  background-color: #090e16;
  border-radius: 999px;
  margin-top: 8px;
  overflow: hidden;
}

.category-mini-progress.is-npc-progress {
  height: 3px;
  margin-top: 6px;
}

.category-mini-fill {
  height: 100%;
  background-color: var(--qt-snipper);
  transition: width 0.25s ease;
}

.category-mini-fill.is-done-fill {
  background-color: var(--qt-done-bright);
}

.npc-sublist {
  margin-top: 8px;
  padding-left: 14px;
  border-left: 2px solid rgba(0, 229, 255, 0.25);
  margin-left: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.npc-row-btn {
  width: 100%;
  min-height: 44px;
  background-color: #131c29;
  border: 1px solid var(--qt-border);
  border-radius: 8px;
  padding: 8px 10px;
  color: var(--qt-text);
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition: all 0.15s ease;
}

.npc-row-btn:hover {
  background-color: var(--qt-card-hover);
  border-color: rgba(0, 229, 255, 0.55);
}

.npc-row-btn.is-selected {
  background: linear-gradient(90deg, rgba(0, 229, 255, 0.16) 0%, rgba(22, 33, 48, 0.95) 100%);
  border-color: var(--qt-snipper);
  box-shadow: 0 0 12px rgba(0, 229, 255, 0.22), inset 3px 0 0 var(--qt-snipper);
}

.npc-name {
  font-size: 0.9rem;
  font-weight: 500;
}

/* 中欄：置頂模糊搜尋欄與任務列表 */
.middle-search-bar {
  position: sticky;
  top: 0;
  z-index: 5;
  background-color: var(--qt-panel);
  padding-bottom: 12px;
  margin-bottom: 12px;
  border-bottom: 1px solid var(--qt-border);
}

.search-input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon-svg {
  position: absolute;
  left: 12px;
  width: 18px;
  height: 18px;
  stroke: var(--qt-snipper);
  stroke-width: 2;
  fill: none;
  pointer-events: none;
}

.middle-search-input {
  width: 100%;
  min-height: 44px;
  padding: 8px 40px 8px 38px;
  background-color: #090e16;
  border: 1px solid var(--qt-border-strong);
  border-radius: 8px;
  color: var(--qt-text);
  font-family: inherit;
  font-size: 0.92rem;
  box-sizing: border-box;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.middle-search-input:focus {
  outline: none;
  border-color: var(--qt-snipper);
  box-shadow: 0 0 10px var(--qt-snipper-glow);
}

.search-clear-btn {
  position: absolute;
  right: 4px;
  min-width: 36px;
  min-height: 36px;
  background: transparent;
  border: none;
  color: var(--qt-muted);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.search-clear-btn:hover {
  color: var(--qt-text);
}

.middle-header {
  background-color: var(--qt-card);
  border: 1px solid var(--qt-border);
  border-left: 3px solid var(--qt-snipper);
  border-radius: 8px;
  padding: 10px 14px;
  margin-bottom: 12px;
}

.middle-category-label {
  font-size: 0.78rem;
  color: var(--qt-snipper);
  font-weight: 600;
  margin-bottom: 4px;
}

.middle-title-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 8px;
}

.middle-npc-name {
  font-size: 1.18rem;
  font-weight: 700;
  margin: 0;
  color: var(--qt-text);
}

.middle-summary {
  font-size: 0.84rem;
  color: var(--qt-muted);
}

.task-table-head {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) 64px 64px;
  gap: 8px;
  padding: 6px 10px;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--qt-muted);
  border-bottom: 1px solid var(--qt-border);
  margin-bottom: 8px;
}

.task-table-head .col-stat,
.task-table-head .col-skill {
  text-align: right;
}

.task-rows {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.task-row {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) 64px 64px;
  gap: 8px;
  align-items: center;
  background-color: var(--qt-card);
  border: 1px solid var(--qt-border);
  padding: 4px 8px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.25);
  transition: all 0.15s ease;
}

.task-row:hover {
  background-color: var(--qt-card-hover);
  border-color: var(--qt-border-strong);
}

.task-row.is-completed {
  background-color: rgba(18, 28, 38, 0.65);
  border-color: rgba(42, 61, 84, 0.6);
}

.task-row.is-selected {
  background: linear-gradient(90deg, rgba(0, 229, 255, 0.14) 0%, rgba(22, 33, 48, 0.95) 100%);
  border-color: var(--qt-snipper);
  box-shadow: 0 0 12px rgba(0, 229, 255, 0.2), inset 3px 0 0 var(--qt-snipper);
}

.task-check-cell {
  min-width: 44px;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  position: relative;
}

.task-checkbox-input {
  position: absolute;
  opacity: 0;
  width: 44px;
  height: 44px;
  margin: 0;
  cursor: pointer;
}

.custom-checkbox {
  width: 20px;
  height: 20px;
  border: 2px solid var(--qt-muted);
  border-radius: 5px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background-color: var(--qt-bg);
  transition: all 0.15s ease;
}

.task-checkbox-input:focus-visible + .custom-checkbox {
  outline: 2px solid var(--qt-snipper);
  outline-offset: 2px;
}

.custom-checkbox.is-checked {
  background-color: var(--qt-done-emerald);
  border-color: var(--qt-done-bright);
  color: #041f17;
  box-shadow: 0 0 8px rgba(16, 185, 129, 0.4);
}

.custom-checkbox.is-group-done {
  background-color: var(--qt-complete-bg);
  border-color: var(--qt-complete-border);
  color: var(--qt-complete-text);
}

.check-svg {
  width: 14px;
  height: 14px;
  stroke: currentColor;
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
  fill: none;
}

.task-name-cell-btn {
  min-height: 44px;
  width: 100%;
  background: transparent;
  border: none;
  color: var(--qt-text);
  font-family: inherit;
  font-size: 0.94rem;
  text-align: left;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  padding: 6px 4px;
  cursor: pointer;
}

.task-clean-name {
  font-weight: 600;
  word-break: break-word;
}

.task-clean-name.is-muted-name {
  color: var(--qt-muted);
  font-weight: 400;
}

.group-done-pill {
  font-size: 0.74rem;
  padding: 2px 6px;
  border-radius: 4px;
  color: var(--qt-complete-text);
  background-color: var(--qt-complete-bg);
  border: 1px solid var(--qt-complete-border);
}

.search-origin-pill {
  font-size: 0.74rem;
  padding: 2px 7px;
  border-radius: 4px;
  color: var(--qt-snipper);
  background-color: rgba(0, 229, 255, 0.08);
  border: 1px solid rgba(0, 229, 255, 0.25);
  margin-left: auto;
}

.task-point-cell {
  text-align: right;
  font-size: 0.96rem;
  font-weight: 700;
  padding-right: 6px;
}

.pt-stats {
  color: var(--qt-stats);
}

.pt-skills {
  color: var(--qt-skills);
}

.pt-zero {
  color: var(--qt-muted);
  opacity: 0.65;
}

/* 標籤樣式 */
.tag-badge {
  display: inline-flex;
  align-items: center;
  font-size: 0.74rem;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 4px;
  background-color: #0b111a;
  border: 1px solid var(--qt-border-strong);
  color: var(--qt-muted);
  flex-shrink: 0;
}

.tag-level {
  color: var(--qt-snipper);
  border-color: rgba(0, 229, 255, 0.35);
  background-color: rgba(0, 229, 255, 0.08);
}

.tag-prefix {
  color: var(--qt-text);
}

.tag-school {
  color: var(--qt-skills);
  border-color: rgba(125, 184, 255, 0.4);
}

.tag-dept {
  color: var(--qt-stats);
  border-color: rgba(242, 169, 59, 0.4);
}

.tag-prereq-modal {
  color: var(--qt-complete-text);
  background-color: var(--qt-complete-bg);
  border-color: var(--qt-complete-border);
}

/* 右欄：詳細資訊 */
.detail-top {
  background-color: var(--qt-card);
  border: 1px solid var(--qt-border-strong);
  border-left: 3px solid var(--qt-snipper);
  border-radius: 8px;
  padding: 12px 14px;
  margin-bottom: 12px;
}

.detail-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}

.detail-task-name {
  font-size: 1.24rem;
  font-weight: 700;
  color: var(--qt-text);
  margin: 0 0 4px 0;
  line-height: 1.3;
}

.detail-task-id {
  font-size: 0.8rem;
  color: var(--qt-muted);
}

.hint-banner {
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 0.86rem;
  line-height: 1.5;
  margin-bottom: 12px;
}

.is-complete-hint {
  color: var(--qt-complete-text);
  background-color: var(--qt-complete-bg);
  border: 1px solid var(--qt-complete-border);
}

.is-warning-hint {
  color: var(--qt-warn-text);
  background-color: var(--qt-warn-bg);
  border: 1px solid var(--qt-warn-border);
}

.large-toggle-btn {
  width: 100%;
  min-height: 44px;
  padding: 10px 14px;
  border-radius: 8px;
  font-family: inherit;
  font-size: 0.94rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  background-color: var(--qt-card);
  color: var(--qt-text);
  border: 1px solid var(--qt-snipper);
  box-shadow: 0 0 10px rgba(0, 229, 255, 0.12);
  margin-bottom: 12px;
  transition: all 0.2s ease;
  box-sizing: border-box;
  text-decoration: none;
}

.large-toggle-btn.is-done {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.22), rgba(19, 43, 39, 0.95));
  border-color: var(--qt-done-emerald);
  color: var(--qt-done-bright);
}

.large-toggle-btn:hover:not(:disabled) {
  filter: brightness(1.12);
}

.detail-rewards-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 12px;
}

.reward-box {
  background-color: var(--qt-card);
  border: 1px solid var(--qt-border-strong);
  border-radius: 8px;
  padding: 10px 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.reward-label {
  font-size: 0.84rem;
  color: var(--qt-muted);
}

.reward-val {
  font-size: 1.15rem;
}

.context-trigger-btn {
  width: 100%;
  min-height: 44px;
  padding: 10px 14px;
  background-color: var(--qt-card);
  border: 1px solid var(--qt-border-strong);
  border-radius: 8px;
  color: var(--qt-text);
  font-family: inherit;
  font-size: 0.92rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  margin-bottom: 14px;
  transition: all 0.2s;
}

.context-trigger-btn:hover {
  border-color: var(--qt-snipper);
  background-color: var(--qt-card-hover);
  box-shadow: 0 0 10px var(--qt-snipper-glow);
}

.detail-block {
  background-color: rgba(22, 33, 48, 0.55);
  border: 1px solid var(--qt-border);
  border-radius: 8px;
  padding: 12px;
  margin-top: 10px;
}

.block-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.block-title {
  font-size: 0.86rem;
  font-weight: 700;
  color: var(--qt-snipper);
  margin: 0 0 8px 0;
  display: block;
}

.block-title-row .block-title {
  margin-bottom: 0;
}

.same-group-any-hint {
  font-size: 0.76rem;
  color: var(--qt-complete-text);
  background-color: var(--qt-complete-bg);
  border: 1px solid var(--qt-complete-border);
  padding: 2px 8px;
  border-radius: 999px;
}

.req-capsules {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.req-capsule {
  display: inline-flex;
  align-items: center;
  padding: 5px 10px;
  border-radius: 999px;
  font-size: 0.84rem;
  background-color: var(--qt-card);
  border: 1px solid var(--qt-border-strong);
  color: var(--qt-text);
}

.req-capsule.is-warning-capsule {
  color: var(--qt-warn-text);
  background-color: var(--qt-warn-bg);
  border-color: var(--qt-warn-border);
}

.muted-empty-text {
  font-size: 0.86rem;
  color: var(--qt-muted);
  margin: 0;
}

.prereq-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.prereq-row-btn,
.prereq-row-missing {
  width: 100%;
  min-height: 44px;
  padding: 8px 10px;
  border-radius: 8px;
  background-color: var(--qt-card);
  border: 1px solid var(--qt-border-strong);
  color: var(--qt-text);
  font-family: inherit;
  font-size: 0.88rem;
  display: flex;
  align-items: center;
  gap: 8px;
  text-align: left;
  box-sizing: border-box;
}

.prereq-row-btn {
  cursor: pointer;
  transition: all 0.15s;
}

.prereq-row-btn:hover {
  border-color: var(--qt-snipper);
  background-color: var(--qt-card-hover);
}

.status-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  flex-shrink: 0;
}

.dot-done {
  background-color: var(--qt-done-bright);
  box-shadow: 0 0 6px var(--qt-done-bright);
}

.dot-todo {
  background-color: #E06C50;
}

.prereq-name {
  flex: 1;
  font-weight: 500;
}

.prereq-status-text {
  font-size: 0.8rem;
  flex-shrink: 0;
}

.text-done {
  color: var(--qt-done-bright);
}

.text-todo {
  color: var(--qt-warn-text);
}

.meta-dl {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.meta-pair {
  display: grid;
  grid-template-columns: 52px minmax(0, 1fr);
  gap: 8px;
  font-size: 0.88rem;
}

.meta-pair dt {
  color: var(--qt-muted);
}

.meta-pair dd {
  margin: 0;
  color: var(--qt-text);
  word-break: break-word;
}

.group-desc-box {
  margin: 0;
  padding: 10px 12px;
  border-radius: 8px;
  background-color: var(--qt-card);
  border: 1px solid var(--qt-border);
  font-size: 0.85rem;
  color: var(--qt-muted);
  line-height: 1.5;
}

/* 空狀態提示 */
.panel-empty-prompt {
  flex: 1;
  min-height: 320px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--qt-muted);
  text-align: center;
  padding: 24px;
}

.prompt-svg {
  width: 38px;
  height: 38px;
  stroke: var(--qt-snipper);
  stroke-width: 1.5;
  fill: none;
  opacity: 0.65;
}

/* 頁尾 */
.tracker-footer {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--qt-border);
  font-size: 0.84rem;
  color: var(--qt-muted);
  text-align: right;
}

/* =====================================================================
   Modals (連帶確認視窗 / 前置任務浮動視窗 / 任務脈絡視窗 / 匯入與雲端視窗)
   ===================================================================== */
.dialog-backdrop {
  position: fixed;
  inset: 0;
  background-color: rgba(6, 10, 15, 0.82);
  backdrop-filter: blur(4px);
  z-index: 3000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  box-sizing: border-box;
}

.dialog-panel {
  background-color: var(--qt-panel);
  border: 1px solid rgba(0, 229, 255, 0.4);
  border-radius: 12px;
  color: var(--qt-text);
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  width: 100%;
  box-sizing: border-box;
  outline: none;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.75), 0 0 24px rgba(0, 229, 255, 0.12);
}

.prereq-dialog {
  max-width: 520px;
}

.context-dialog {
  max-width: 920px;
}

.small-dialog {
  max-width: 480px;
}

.dialog-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--qt-border);
}

.context-dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 12px;
}

.context-counts {
  margin: 4px 0 0 0;
  font-size: 0.86rem;
  color: var(--qt-muted);
}

.context-header-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.dialog-body {
  padding: 16px 20px;
  overflow-y: auto;
  flex: 1;
}

.dialog-footer {
  padding: 12px 20px;
  border-top: 1px solid var(--qt-border);
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;
}

/* 連帶影響任務清單 */
.cascade-task-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 240px;
  overflow-y: auto;
}

.cascade-task-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background-color: var(--qt-card);
  border: 1px solid var(--qt-border-strong);
  border-radius: 6px;
  font-size: 0.88rem;
}

.cascade-task-name {
  font-weight: 600;
  color: var(--qt-text);
}

.cascade-task-id {
  font-size: 0.78rem;
  color: var(--qt-muted);
}

/* 任務脈絡世代排版 */
.context-dialog-body {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.context-generation {
  width: 100%;
  background-color: var(--qt-sub-bg);
  border: 1px solid var(--qt-border-strong);
  border-radius: 10px;
  padding: 12px 14px;
  box-sizing: border-box;
}

.context-generation.is-center-generation {
  border-color: var(--qt-snipper);
  background-color: rgba(0, 229, 255, 0.06);
}

.generation-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--qt-snipper);
  margin-bottom: 10px;
  text-align: center;
}

.generation-nodes {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 10px;
}

.generation-nodes.is-single-center {
  max-width: 360px;
  margin: 0 auto;
}

.context-node-btn {
  min-height: 44px;
  padding: 10px 12px;
  border-radius: 8px;
  background-color: var(--qt-card);
  border: 1px solid var(--qt-border-strong);
  color: var(--qt-text);
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 6px;
  transition: border-color 0.15s, transform 0.15s;
}

.context-node-btn:hover:not(:disabled) {
  border-color: var(--qt-snipper);
}

.context-node-btn.is-center-node {
  border: 2px solid var(--qt-snipper);
  box-shadow: 0 0 12px rgba(0, 229, 255, 0.25);
}

.node-name {
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--qt-text);
  word-break: break-word;
}

.node-meta-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  font-size: 0.78rem;
}

.node-status-tag {
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 0.74rem;
}

.node-status-tag.tag-done,
.node-status-tag.tag-group-done {
  color: var(--qt-complete-text);
  background-color: var(--qt-complete-bg);
  border: 1px solid var(--qt-complete-border);
}

.node-status-tag.tag-todo {
  color: var(--qt-muted);
  background-color: var(--qt-bg);
  border: 1px solid var(--qt-border);
}

.node-points {
  color: var(--qt-muted);
}

.generation-overflow {
  margin-top: 8px;
  text-align: center;
  font-size: 0.82rem;
  color: var(--qt-muted);
}

.generation-arrow {
  display: flex;
  justify-content: center;
  padding: 6px 0;
  color: var(--qt-snipper);
}

.arrow-down-svg {
  width: 20px;
  height: 20px;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
  fill: none;
}

.isolated-context-note {
  margin-top: 14px;
  font-size: 0.9rem;
  color: var(--qt-muted);
  text-align: center;
}

/* 匯入與雲端輔助元件 */
.dialog-desc {
  font-size: 0.88rem;
  color: var(--qt-muted);
  line-height: 1.5;
  margin: 0 0 12px 0;
}

.json-textarea {
  width: 100%;
  background-color: var(--qt-bg);
  border: 1px solid var(--qt-border-strong);
  border-radius: 8px;
  color: var(--qt-text);
  padding: 10px;
  font-size: 0.85rem;
  box-sizing: border-box;
  resize: vertical;
}

.user-sync-card {
  background-color: var(--qt-card);
  border: 1px solid var(--qt-border-strong);
  border-left: 3px solid var(--qt-snipper);
  border-radius: 8px;
  padding: 10px 12px;
  margin-bottom: 12px;
}

.user-sync-role {
  font-weight: 700;
  color: var(--qt-snipper);
  font-size: 0.92rem;
}

.user-sync-code {
  font-size: 0.8rem;
  color: var(--qt-muted);
  margin-top: 4px;
}

.cloud-btn-stack {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cloud-confirm-row {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 12px;
}

/* =====================================================================
   上傳已完成任務圖片 (OCR 對話框、拖放區、進度遮罩與範例圖片視窗)
   ===================================================================== */
.ocr-dialog {
  max-width: 720px;
  position: relative;
}

.ocr-dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.ocr-header-sub {
  margin: 4px 0 0 0;
  font-size: 0.82rem;
  color: var(--qt-muted);
}

.ocr-dialog-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.ocr-dropzone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 20px 16px;
  border: 2px dashed var(--qt-border-strong);
  border-radius: 10px;
  background-color: rgba(15, 23, 36, 0.65);
  cursor: pointer;
  text-align: center;
  transition: border-color 0.2s, background-color 0.2s;
}

.ocr-dropzone:hover,
.ocr-dropzone.is-dragging {
  border-color: var(--qt-snipper);
  background-color: var(--qt-snipper-bg);
}

.ocr-drop-icon {
  width: 28px;
  height: 28px;
  stroke: var(--qt-snipper);
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
  fill: none;
}

.ocr-drop-title {
  font-size: 0.92rem;
  font-weight: 700;
  color: var(--qt-text);
}

.ocr-drop-hint {
  font-size: 0.8rem;
  color: var(--qt-muted);
}

.ocr-files-section {
  background-color: var(--qt-card);
  border: 1px solid var(--qt-border);
  border-radius: 8px;
  padding: 10px 12px;
}

.ocr-files-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 0.82rem;
  color: var(--qt-muted);
}

.text-link-btn {
  background: transparent;
  border: none;
  color: var(--qt-snipper);
  font-size: 0.8rem;
  cursor: pointer;
  padding: 2px 4px;
}

.text-link-btn:hover {
  text-decoration: underline;
}

.ocr-file-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  max-height: 92px;
  overflow-y: auto;
}

.ocr-file-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 8px;
  border-radius: 999px;
  background-color: var(--qt-bg);
  border: 1px solid var(--qt-border-strong);
  font-size: 0.78rem;
  color: var(--qt-text);
}

.ocr-chip-name {
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ocr-chip-remove {
  background: transparent;
  border: none;
  color: var(--qt-muted);
  cursor: pointer;
  font-size: 0.92rem;
  line-height: 1;
  padding: 0 2px;
}

.ocr-chip-remove:hover {
  color: var(--qt-warning);
}

.ocr-textarea-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ocr-textarea-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.ocr-textarea-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ocr-parsed-textarea {
  min-height: 150px;
  line-height: 1.55;
}

.ocr-strict-note {
  margin: 0;
  font-size: 0.78rem;
  color: var(--qt-muted);
  line-height: 1.45;
}

/* 百分比進度遮罩 */
.ocr-progress-mask {
  position: absolute;
  inset: 0;
  z-index: 30;
  background-color: rgba(10, 15, 24, 0.86);
  backdrop-filter: blur(3px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  border-radius: inherit;
}

.ocr-progress-box {
  width: 100%;
  max-width: 380px;
  background-color: var(--qt-panel);
  border: 1px solid var(--qt-snipper);
  border-radius: 12px;
  padding: 22px 20px;
  text-align: center;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.65);
}

.ocr-progress-percent {
  font-size: 2rem;
  font-weight: 800;
  color: var(--qt-snipper);
  margin-bottom: 10px;
}

.ocr-progress-track {
  height: 10px;
  margin-bottom: 12px;
}

.ocr-progress-status {
  margin: 0;
  font-size: 0.85rem;
  color: var(--qt-text);
}

/* 範例圖片子視窗 */
.sample-modal-backdrop {
  z-index: 3200;
}

.sample-image-dialog {
  max-width: 520px;
}

.sample-dialog-body {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.sample-image-frame {
  border: 1px solid var(--qt-border-strong);
  border-radius: 8px;
  overflow: hidden;
  background-color: #000;
  max-width: 100%;
}

.sample-preview-img {
  display: block;
  max-width: 100%;
  height: auto;
}

/* =====================================================================
   響應式設計 (寬度不足時三欄改為上下堆疊，手機 375px 無水平捲軸)
   ===================================================================== */
@media (max-width: 1120px) {
  .three-col-layout {
    grid-template-columns: 1fr;
  }

  .col-panel {
    height: auto;
    max-height: none;
    min-height: auto;
  }
}

@media (max-width: 640px) {
  .quest-tracker-page {
    padding: 12px;
  }

  .stats-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .task-table-head,
  .task-row {
    grid-template-columns: 44px minmax(0, 1fr) 48px 48px;
    gap: 4px;
  }

  .dialog-panel {
    max-height: 92vh;
  }

  .generation-nodes {
    grid-template-columns: 1fr;
  }
}
</style>
