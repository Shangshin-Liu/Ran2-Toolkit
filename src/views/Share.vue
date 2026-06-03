<template>
  <div class="share-page">
    <div class="page-header">
      <div class="header-left">
        <h2 class="neon-text-qigong">💎 好物分享區</h2>
        <p class="subtitle">大老退坑或溢出神兵利器免費贈與，助廣大萌新早日成材</p>
      </div>
      <div class="header-actions" style="display: flex; gap: 10px; align-items: center;">
        <button 
          class="help-btn"
          @click="openMyAppsModal"
          title="查看並管理我申請的所有道具項目"
        >
          🔍 我的申請紀錄
        </button>
        <button 
          class="help-btn"
          @click="openHistoryModal"
          title="查看所有已成功贈出結案的歷史道具紀錄"
        >
          📜 歷史紀錄
        </button>
      </div>
    </div>

    <!-- 操作列：篩選與發布好物 -->
    <div class="action-bar glass-card">
      <button 
        class="mobile-filter-toggle help-btn" 
        @click="showMobileFilters = !showMobileFilters"
        style="margin-bottom: 10px;"
      >
        {{ showMobileFilters ? '✕ 收合篩選' : '🔍 篩選與搜尋' }}
      </button>

      <div class="filter-controls" :class="{ 'mobile-hidden': !showMobileFilters }">
        <div class="filter-group">
          <label class="select-label">選擇伺服器:</label>
          <select v-model="selectedServer" class="type-select">
            <option value="全部">全部伺服器</option>
            <option value="新東京">新東京</option>
            <option value="新大阪">新大阪</option>
          </select>
        </div>

        <div class="filter-group">
          <label class="select-label">道具類型:</label>
          <select v-model="selectedType" class="type-select">
            <option value="全部">全部道具</option>
            <option value="武器">武器</option>
            <option value="防具">防具</option>
            <option value="飾品">飾品</option>
            <option value="其他">其他</option>
          </select>
        </div>

        <div class="search-box" style="display: flex; gap: 8px;">
          <input 
            type="text" 
            v-model="searchQuery" 
            class="search-input" 
            placeholder="搜尋名稱/素質/要求/分享者" 
            @keyup.enter="triggerSearch"
          />
          <button class="search-btn" @click="triggerSearch" title="搜尋">🔍</button>
        </div>
      </div>
      
      <button class="create-share-btn neon-border-qigong" @click="showShareModal = true">
        🎁 分享我的寶物
      </button>
    </div>

    <LoadingOverlay v-if="isInitialLoading" theme="qigong" message="拉拉拉~~~" />

    <div class="share-layout" v-else-if="filteredItems.length > 0">
      <!-- 左側：好物列表 -->
      <div class="items-list-panel">
        <div style="display: flex; flex-direction: column; gap: 16px;">
          <div 
            v-for="item in filteredItems" 
            :key="item.id" 
            class="item-card glass-card"
            :class="{ 
              'active-item': selectedItem && selectedItem.id === item.id,
              'trading-item': item.status === '交易中'
            }"
            @click="selectItem(item)"
          >
            <div class="item-card-img-wrapper">
              <img :key="item.image" :src="item.image" :alt="item.name" class="item-card-img" @error="handleImgError" />
            </div>
            <div class="item-card-details">
              <h3 class="item-card-name">{{ item.name }}</h3>
              <p class="item-card-server-badge">{{ item.server }}</p>
              <div class="card-status-badge" :class="item.status === '交易中' ? 'trading' : 'sharing'">
                {{ item.status }}
              </div>
              <p class="item-card-giver">分享者: {{ item.giverId }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 右側：道具詳細資訊 -->
      <div class="item-detail-panel glass-card neon-border-qigong" v-if="selectedItem">
        <div class="detail-header">
          <div class="detail-image-box">
            <img 
              :key="selectedItem.image"
              :src="selectedItem.image" 
              :alt="selectedItem.name" 
              class="detail-item-img" 
              style="cursor: zoom-in;" 
              @click="openLightbox(selectedItem.image)"
              @error="handleImgError"
              title="點選查看原圖"
            />
          </div>
          <div class="detail-main-info" style="flex: 1;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; width: 100%;">
              <h2 class="detail-item-name neon-text-qigong">{{ selectedItem.name }}</h2>
              <button 
                v-if="selectedItem.status === '分享中'"
                class="modal-btn confirm"
                style="padding: 4px 12px; font-size: 0.8rem; background: rgba(0, 255, 102, 0.1); margin-top: -4px;"
                @click="promptEdit"
                title="點擊驗證密碼後編輯此寶物資訊"
              >
                ✏️ 編輯
              </button>
            </div>
            <div class="detail-badge-row">
              <span class="detail-badge-item">伺服器: {{ selectedItem.server }}</span>
              <span class="detail-badge-item">類型: {{ selectedItem.type }}</span>
              <span class="detail-badge-item active-count">👥 申請人數: {{ selectedItem.applicantCount }} 人</span>
            </div>
            <p class="giver-info">🎁 寶物提供者: <strong class="neon-text-qigong">{{ selectedItem.giverId }}</strong></p>
          </div>
        </div>

        <!-- 狀態提醒 -->
        <div class="status-alert-box" v-if="selectedItem.status === '交易中'">
          <span class="alert-icon">🤝</span>
          <span class="alert-text">已確認贈與對象：<strong class="neon-text-qigong">{{ selectedItem.receiverId }}</strong> (交易進行中)</span>
        </div>

        <hr class="divider" />

        <!-- 裝備要求 -->
        <div class="detail-section" v-if="selectedItem.statReq && selectedItem.statReq.length > 0">
          <h3 class="section-title">🛡️ 裝備要求</h3>
          <ul class="stats-list">
            <li v-for="(req, idx) in selectedItem.statReq" :key="idx" class="stat-li">
              <span class="stat-bullet">📌</span>
              <span class="stat-text">{{ req }}</span>
            </li>
          </ul>
        </div>

        <!-- 道具屬性數值 -->
        <div class="detail-section" v-if="selectedItem.stats && selectedItem.stats.length > 0">
          <h3 class="section-title">📊 道具素質屬性</h3>
          <ul class="stats-list">
            <li v-for="(stat, idx) in selectedItem.stats" :key="idx" class="stat-li">
              <span class="stat-bullet">✨</span>
              <span class="stat-text">{{ stat }}</span>
            </li>
          </ul>
        </div>

        <!-- 備註說明 -->
        <div class="detail-section" v-if="selectedItem.notes">
          <h3 class="section-title">📝 大老寄語</h3>
          <p class="giver-notes">「{{ selectedItem.notes }}」</p>
        </div>

        <!-- 申請按鈕 (只在狀態為分享中時開放) -->
        <div class="detail-actions" v-if="selectedItem.status === '分享中'">
          <button class="apply-item-btn" @click="openApplyModal">
            我要申請道具
          </button>
        </div>
        <div class="detail-actions" v-else>
          <button class="apply-item-btn disabled" disabled>
            已確認贈與對象 ({{ selectedItem.receiverId }})
          </button>
        </div>

        <!-- 發起人後台管理區塊 -->
        <div class="giver-management-section glass-card" style="margin-top: 30px; border: 1px dashed rgba(255,255,255,0.1); padding: 18px;">
          <h4 style="font-size: 0.95rem; font-weight: 700; color: #fff; margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
            ⚙️ 發起者管理選單
          </h4>
          <div v-if="!isGiverVerified" style="display: flex; gap: 8px;">
            <input 
              type="password" 
              v-model="giverPassword" 
              placeholder="輸入發布時設定的防呆密碼" 
              class="search-input" 
              style="flex: 1; font-size: 0.85rem; padding: 6px 10px;"
              @keyup.enter="verifyGiverPassword"
            />
            <button class="modal-btn confirm" style="padding: 6px 14px; font-size: 0.85rem;" @click="verifyGiverPassword">認證</button>
          </div>
          <div v-else>
            <p style="font-size: 0.85rem; color: var(--color-qigong); margin-bottom: 12px; font-weight: 700;">✓ 已通過發起人身分驗證</p>
            
            <!-- 申請人列表 -->
            <div class="applicants-list-box">
              <h5 style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 8px;">申請人清單：</h5>
              <div v-if="currentItemApplicants.length === 0" style="font-size: 0.85rem; color: var(--text-muted); font-style: italic;">
                目前尚無人申請此道具。
              </div>
              <div v-else style="display: flex; flex-direction: column; gap: 8px;">
                <div 
                  v-for="app in currentItemApplicants" 
                  :key="app.id" 
                  style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.02); padding: 8px 12px; border-radius: 4px;"
                >
                  <span style="font-size: 0.9rem; font-weight: 700; color: #fff;">👤 {{ app.charId }}</span>
                  <button 
                    class="modal-btn confirm" 
                    style="padding: 4px 10px; font-size: 0.75rem;" 
                    @click="confirmGiftTo(app)"
                    v-if="selectedItem.status === '分享中'"
                  >
                    贈與此人
                  </button>
                  <span v-else-if="app.charId === selectedItem.receiverId" style="font-size: 0.85rem; color: var(--color-qigong); font-weight: 700;">得標者</span>
                  <span v-else style="font-size: 0.85rem; color: var(--text-muted); text-decoration: line-through;">未選中</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 空狀態提示 (Empty State) -->
    <div class="empty-state glass-card neon-border-qigong" v-else>
      <div class="empty-state-icon">💎</div>
      <h3 class="empty-state-title neon-text-qigong">目前沒有符合條件的分享道具</h3>
      <p class="empty-state-desc">
        當前沒有正在分享或交易中的道具。你也可以查看右上角的 <strong>📜 歷史紀錄</strong>，或是點擊右上方 <strong>🎁 分享我的寶物</strong> 來發布你的第一個好物！
      </p>
      <button class="create-share-btn neon-border-qigong" @click="showShareModal = true" style="margin-top: 15px;">
        🎁 分享我的寶物
      </button>
    </div>

    <!-- 1. 申請道具 Modal -->
    <div class="modal-overlay" v-if="showApplyModal" @click="showApplyModal = false">
      <div class="modal-content glass-card neon-border-qigong" @click.stop style="width: 450px;">
        <h3 class="modal-title neon-text-qigong">🎁 申請道具驗證</h3>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 20px; line-height: 1.5;">
          申請道具需要輸入您的身分識別碼，若您是第一次使用，請先點擊下方建立識別碼。
        </p>

        <div class="form-group">
          <label>身分識別碼</label>
          <div style="display: flex; gap: 8px;">
            <input 
              type="text" 
              v-model="inputUserId" 
              placeholder="請輸入5碼英數識別碼 (例如: R8X9D)" 
              style="flex: 1"
            />
            <button 
              class="modal-btn confirm" 
              style="padding: 8px 12px; font-size: 0.8rem; white-space: nowrap;"
              @click="toggleIdentityCreate"
            >
              尚未有識別碼? 點我建立
            </button>
          </div>
        </div>

        <div class="form-group" v-if="showCreateIdBlock" style="border-top: 1px dashed rgba(255,255,255,0.08); padding-top: 15px; margin-top: 15px;">
          <label style="color: var(--color-qigong);">建立您的身分識別碼</label>
          <div style="display: flex; gap: 8px;">
            <input 
              type="text" 
              v-model="createCharId" 
              placeholder="輸入遊戲角色ID (例如: 破壞之王)" 
              style="flex: 1"
            />
            <button 
              class="modal-btn confirm" 
              style="padding: 8px 12px; font-size: 0.8rem;"
              @click="handleCreateIdentity"
            >
              生成
            </button>
          </div>
          <span style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px;">相同遊戲ID在任何裝置生成的識別碼皆完全相同，不需註冊即可同步！</span>
        </div>



        <div class="modal-buttons" style="justify-content: space-between; align-items: center; margin-top: 25px;">
          <button class="help-btn" style="border: none; padding: 0; background: none; font-size: 0.8rem; text-decoration: underline;" @click="showForgotIdAlert">我忘了身分識別碼</button>
          <div style="display: flex; gap: 10px;">
            <button class="modal-btn cancel" @click="showApplyModal = false">取消</button>
            <button class="modal-btn confirm neon-border-qigong" @click="submitApplication">送出申請</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 2. 查看我申請的項目 Modal -->
    <div class="modal-overlay" v-if="showMyAppsModal" @click="showMyAppsModal = false">
      <div class="modal-content glass-card neon-border-qigong" @click.stop style="width: 650px; max-width: 95%;">
        <h3 class="modal-title neon-text-qigong">🔍 我的申請紀錄</h3>
        
        <div v-if="!myUserIdVerified" style="padding: 10px 0;">
          <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 16px;">請輸入您的身分識別碼，以載入您的申請進度與歷史紀錄：</p>
          <div style="display: flex; gap: 8px; margin-bottom: 20px;">
            <input 
              type="text" 
              v-model="inputMyUserId" 
              placeholder="請輸入5碼英數識別碼" 
              style="flex: 1"
              @keyup.enter="verifyMyUserId"
            />
            <button class="modal-btn confirm" @click="verifyMyUserId">確認載入</button>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <button class="help-btn" style="border: none; padding: 0; background: none; font-size: 0.8rem; text-decoration: underline;" @click="showForgotIdAlert">我忘了身分識別碼</button>
            <button class="modal-btn cancel" @click="showMyAppsModal = false">關閉</button>
          </div>
        </div>

        <div v-else class="my-apps-container">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
            <span style="font-size: 0.9rem; color: var(--color-qigong); font-weight: 700;">✓ 目前載入之識別碼：{{ myUserId }}</span>
            <button 
              class="modal-btn cancel" 
              style="padding: 4px 10px; font-size: 0.75rem;" 
              @click="logoutMyUserId"
            >
              切換帳號
            </button>
          </div>

          <!-- Tab 切換：活躍中 vs 歷史紀錄 -->
          <div class="help-tabs" style="border-color: rgba(0, 255, 102, 0.1);">
            <button 
              class="help-tab-btn" 
              :class="{ 'active': activeMyAppsTab === 'active' }" 
              @click="activeMyAppsTab = 'active'"
              style="flex: 1"
            >
              ⌛ 進行中申請
            </button>
            <button 
              class="help-tab-btn" 
              :class="{ 'active': activeMyAppsTab === 'history' }" 
              @click="activeMyAppsTab = 'history'"
              style="flex: 1"
            >
              📜 歷史結果
            </button>
          </div>

          <!-- 活躍申請清單 (申請中 / 確認中) -->
          <div v-if="activeMyAppsTab === 'active'" class="fade-in-tab">
            <div v-if="myActiveApplications.length === 0" style="text-align: center; padding: 30px; color: var(--text-muted);">
              目前無進行中的申請項目。你最多可同時申請 3 筆未結案的好物。
            </div>
            <div v-else style="display: flex; flex-direction: column; gap: 12px; max-height: 350px; overflow-y: auto; padding-right: 6px;">
              <div 
                v-for="app in myActiveApplications" 
                :key="app.id" 
                class="glass-card" 
                style="padding: 14px; border: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; align-items: center;"
              >
                <div>
                  <h4 style="font-size: 0.95rem; font-weight: 700; color: #fff; margin-bottom: 4px;">{{ app.itemName }}</h4>
                  <p style="font-size: 0.75rem; color: var(--text-muted);">
                    申請角色: {{ app.charId }} | 申請時間: {{ formatTime(app.applyTime) }}
                  </p>
                </div>
                <div style="display: flex; gap: 8px; align-items: center;">
                  <!-- 狀態標籤 -->
                  <span 
                    class="status-badge" 
                    :class="app.status === '確認中' ? 'trading' : 'sharing'"
                    style="font-size: 0.75rem; padding: 4px 8px; border-radius: 4px;"
                  >
                    {{ app.status }}
                  </span>
                  
                  <!-- 操作鈕 -->
                  <button 
                    class="modal-btn cancel" 
                    style="padding: 6px 12px; font-size: 0.8rem; border-color: rgba(255,0,0,0.3); color: #ff6b6b;" 
                    @click="cancelMyApplication(app)"
                    v-if="app.status === '申請中'"
                  >
                    取消申請
                  </button>
                  <div v-else-if="app.status === '確認中'" style="display: flex; gap: 6px;">
                    <button 
                      class="modal-btn confirm" 
                      style="padding: 6px 12px; font-size: 0.8rem; background: rgba(0,255,102,0.2);" 
                      @click="completeMyApplication(app)"
                    >
                      🎁 感謝收下已領取
                    </button>
                    <button 
                      class="modal-btn cancel" 
                      style="padding: 6px 10px; font-size: 0.8rem; color: #ff6b6b;" 
                      @click="declineMyApplication(app)"
                    >
                      婉拒
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 個人歷史紀錄 (已完成 / 已拒絕) -->
          <div v-if="activeMyAppsTab === 'history'" class="fade-in-tab">
            <div v-if="myHistoryApplications.length === 0" style="text-align: center; padding: 30px; color: var(--text-muted);">
              尚無已拒絕或已完成的歷史申請紀錄。
            </div>
            <div v-else>
              <div style="display: flex; flex-direction: column; gap: 10px; max-height: 300px; overflow-y: auto; padding-right: 6px;">
                <div 
                  v-for="app in paginatedMyHistoryApplications" 
                  :key="app.id" 
                  class="glass-card" 
                  style="padding: 10px 14px; border: 1px solid rgba(255,255,255,0.03); display: flex; justify-content: space-between; align-items: center; opacity: 0.75; cursor: pointer;"
                  @click="viewHistoryItemByApp(app)"
                  title="點擊查看此寶物詳細資訊"
                >
                  <div>
                    <h4 style="font-size: 0.9rem; font-weight: 700; color: #ccc;">{{ app.itemName }}</h4>
                    <p style="font-size: 0.75rem; color: var(--text-muted);">
                      申請角色: {{ app.charId }} | 完成時間: {{ formatTime(app.completeTime || app.applyTime) }}
                    </p>
                  </div>
                  <span 
                    class="status-badge" 
                    :class="app.status === '已完成' ? 'recruiting' : 'closed'"
                    style="font-size: 0.75rem; padding: 4px 8px; border-radius: 4px;"
                  >
                    {{ app.status }}
                  </span>
                </div>
              </div>

              <!-- 分頁按鈕 -->
              <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 15px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 10px;">
                <button 
                  class="modal-btn cancel" 
                  :disabled="myHistoryPage === 1" 
                  @click="myHistoryPage--"
                  style="padding: 4px 10px; font-size: 0.75rem;"
                >
                  ◀ 上一頁
                </button>
                <span style="font-size: 0.8rem; color: var(--text-muted);">第 {{ myHistoryPage }} / {{ totalMyHistoryPages }} 頁</span>
                <button 
                  class="modal-btn cancel" 
                  :disabled="myHistoryPage >= totalMyHistoryPages" 
                  @click="myHistoryPage++"
                  style="padding: 4px 10px; font-size: 0.75rem;"
                >
                  下一頁 ▶
                </button>
              </div>
            </div>
          </div>

          <div style="display: flex; justify-content: flex-end; margin-top: 25px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 15px;">
            <button class="modal-btn cancel" @click="showMyAppsModal = false">關閉</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 3. 共用歷史紀錄 (已完成) Modal -->
    <div class="modal-overlay" v-if="showHistoryModal" @click="showHistoryModal = false">
      <div class="modal-content glass-card neon-border-qigong" @click.stop style="width: 700px; max-width: 95%;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <h3 class="modal-title neon-text-qigong" style="margin-bottom: 0;">📜 歷史紀錄</h3>
          
          <!-- 模擬執行 GAS 按鈕，供手動測試 -->
          <button 
            class="modal-btn confirm" 
            style="padding: 4px 12px; font-size: 0.8rem; background: rgba(255, 0, 85, 0.1); border-color: var(--color-warrior); color: #fff;"
            @click="simulateGasCronJob"
            title="手動模擬雲端排程，自動結案已確認贈與超過7天(測試降為超過1分鐘)的舊好物"
          >
            ⚙ 模擬 GAS 排程檢索
          </button>
        </div>

        <div v-if="historyItems.length === 0 && !historyLoading" style="text-align: center; padding: 40px; color: var(--text-muted);">
          ⚠️ 目前尚無已成功贈出的歷史紀錄。
        </div>

        <div v-else>
          <div v-if="historyLoading" style="text-align: center; padding: 40px; color: var(--color-qigong);">
            載入中，請稍候...
          </div>
          <div v-else class="history-grid" style="max-height: 400px; overflow-y: auto; padding-right: 6px; display: flex; flex-direction: column; gap: 12px;">
            <div 
              v-for="item in historyItems" 
              :key="item.id" 
              class="glass-card" 
              style="padding: 14px; border: 1px solid rgba(255,255,255,0.04); display: flex; gap: 16px; align-items: center; opacity: 0.8; cursor: pointer;"
              @click="openHistoryDetail(item)"
              title="點擊查看此寶物詳細資訊"
            >
              <div style="width: 50px; height: 50px; border-radius: 6px; overflow: hidden; background: #000; border: 1px solid rgba(255,255,255,0.1);">
                <img :key="item.image" :src="item.image" style="width:100%; height:100%; object-fit: cover;" @error="handleImgError" />
              </div>
              <div style="flex: 1;">
                <h4 style="font-size: 0.95rem; font-weight: 700; color: #fff; margin-bottom: 4px;">{{ item.name }}</h4>
                <p style="font-size: 0.75rem; color: var(--text-muted);">
                  分享者: {{ item.giverId }} | 伺服器: {{ item.server }}
                </p>
                <p style="font-size: 0.75rem; color: var(--color-qigong); margin-top: 2px;">
                  得標受贈人: <strong>{{ item.receiverId }}</strong> | 完成時間: {{ formatTime(item.completeTime || item.updatedAt) }}
                </p>
              </div>
              <span class="status-badge closed" style="font-size: 0.75rem; padding: 4px 8px; border-radius: 4px;">已送出</span>
            </div>
          </div>

          <!-- 分頁控制 -->
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 20px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 15px;">
            <button 
              class="modal-btn cancel" 
              :disabled="historyPage === 1 || historyLoading" 
              @click="historyPage--; loadHistoryPage(historyPage)"
              style="padding: 6px 14px; font-size: 0.85rem;"
            >
              ◀ 上一頁
            </button>
            <span style="font-weight: 700; color: #fff; font-size: 0.9rem;">第 {{ historyPage }} 頁</span>
            <button 
              class="modal-btn confirm neon-border-qigong" 
              :disabled="historyItems.length < 20 || historyLoading" 
              @click="historyPage++; loadHistoryPage(historyPage)"
              style="padding: 6px 14px; font-size: 0.85rem;"
            >
              下一頁 ▶
            </button>
          </div>
        </div>

        <div class="modal-buttons" style="justify-content: center; margin-top: 24px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 15px;">
          <button class="modal-btn cancel" @click="showHistoryModal = false">關閉</button>
        </div>
      </div>
    </div>

    <!-- 4. 分享寶物 Modal -->
    <div class="modal-overlay" v-if="showShareModal" @click="isSubmitting ? null : closeShareModal">
      <div class="modal-content glass-card neon-border-qigong" @click.stop style="position: relative; max-height: 90vh; overflow-y: auto; width: 500px;">
        <!-- 載入中遮罩 -->
        <div v-if="isSubmitting" class="submitting-overlay">
          <div class="loader-spinner"></div>
          <p class="loader-text">寶物傳送中，請稍候...</p>
        </div>
        <h3 class="modal-title neon-text-qigong">{{ isEditing ? '✏️ 編輯寶物資訊' : '🎁 分享我的寶物' }}</h3>
        
        <!-- 圖片拖曳上傳預覽 -->
        <div class="form-group">
          <label>上傳道具圖片 (拖放圖片或點選)</label>
          <div 
            class="upload-zone"
            :class="{ 'drag-over': isDragOver }"
            @dragover.prevent="isDragOver = true"
            @dragleave.prevent="isDragOver = false"
            @drop.prevent="handleDrop"
            @click="triggerFileInput"
            style="border: 2px dashed rgba(0, 255, 102, 0.3); border-radius: 8px; padding: 25px 15px; text-align: center; cursor: pointer; transition: all 0.3s; background: rgba(255,255,255,0.01);"
          >
            <input 
              type="file" 
              ref="fileInput" 
              style="display: none" 
              accept="image/*" 
              @change="handleFileChange" 
            />
            <div v-if="!newItem.image" class="upload-placeholder">
              <span style="font-size: 2rem; display: block; margin-bottom: 8px;">📷</span>
              <p style="font-size: 0.85rem; color: var(--text-muted); margin: 4px 0;">拖曳檔案至此處，或點選開啟圖片</p>
              <span style="font-size: 0.7rem; color: rgba(255,255,255,0.3);">支援一般常見圖片檔案格式</span>
            </div>
            <div v-else style="position: relative; display: inline-block; width: 100%; max-height: 150px; overflow: hidden; border-radius: 6px;">
              <img :src="newItem.image" style="width: 100%; max-height: 150px; object-fit: contain;" />
              <button 
                class="modal-btn cancel" 
                style="position: absolute; top: 10px; right: 10px; padding: 4px 8px; font-size: 0.75rem; background: rgba(0,0,0,0.8); border: none; color: #fff;"
                @click.stop="newItem.image = ''"
              >
                ✕ 移除
              </button>
            </div>
          </div>
        </div>

        <div class="form-group">
          <label>道具名稱 <span style="color: var(--color-warrior);">*</span></label>
          <input type="text" v-model="newItem.name" placeholder="例如: +7 冰晶長劍" />
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>分享者 ID (角色名稱) <span style="color: var(--color-warrior);">*</span></label>
            <input type="text" v-model="newItem.giverId" placeholder="您的遊戲內ID" />
          </div>
          <div class="form-group">
            <label>道具類型 <span style="color: var(--color-warrior);">*</span></label>
            <select v-model="newItem.type">
              <option value="武器">武器</option>
              <option value="防具">防具</option>
              <option value="飾品">飾品</option>
              <option value="其他">其他</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>選擇伺服器 <span style="color: var(--color-warrior);">*</span></label>
            <select v-model="newItem.server">
              <option value="新東京">新東京</option>
              <option value="新大阪">新大阪</option>
            </select>
          </div>
          <div class="form-group">
            <label>防呆密碼 (僅數字，必填) <span style="color: var(--color-warrior);" v-if="!isEditing">*</span></label>
            <input :disabled="isEditing" type="password" v-model="newItem.password" :placeholder="isEditing ? '防呆密碼 (不可修改)' : '用於後端認證指定贈與/編輯'" @input="newItem.password = newItem.password.replace(/\D/g, '')" />
          </div>
        </div>

        <div class="form-group">
          <label>裝備要求 (每行一條，例如: 等級要求 190 / 屬性 敏捷 380)</label>
          <textarea v-model="newItem.statReqText" rows="2" placeholder="要求: 等級 190&#10;要求: 力量 380"></textarea>
        </div>

        <div class="form-group">
          <label>道具素質屬性 (每行一條)</label>
          <textarea v-model="newItem.statsText" rows="3" placeholder="物理攻擊力 +120&#10;攻擊速度 +10%&#10;暴擊率 +5%"></textarea>
        </div>

        <div class="form-group">
          <label>寄語 / 備註</label>
          <input type="text" v-model="newItem.notes" placeholder="寫點給萌新的話吧..." />
        </div>

        <div class="modal-buttons" style="border-top: 1px solid rgba(255,255,255,0.05); padding-top: 15px; margin-top: 20px; display: flex; justify-content: space-between; align-items: center; width: 100%;">
          <div>
            <button 
              v-if="isEditing"
              :disabled="isSubmitting" 
              class="modal-btn cancel" 
              style="border-color: rgba(255, 0, 85, 0.4); color: #ff3b30; background: rgba(255, 0, 85, 0.1);" 
              @click="deleteShareItem"
            >
               刪除
            </button>
          </div>
          <div style="display: flex; gap: 14px;">
            <button :disabled="isSubmitting" class="modal-btn cancel" @click="closeShareModal">取消</button>
            <button :disabled="isSubmitting" class="modal-btn confirm neon-border-qigong" @click="shareItem">{{ isEditing ? '儲存' : '發布分享' }}</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 手機版抽屜 (手機版顯示詳細資訊) -->
    <div class="mobile-drawer-overlay" v-if="showMobileDetail" @click="closeMobileDetail">
      <div class="mobile-drawer glass-card neon-border-qigong" @click.stop>
        <button class="close-btn" @click="closeMobileDetail">✕</button>
        <div class="drawer-content" v-if="selectedItem">
          <div class="detail-header" style="flex-direction: column; align-items: center; text-align: center;">
            <div class="detail-image-box" style="margin-right: 0; margin-bottom: 15px;">
              <img 
                :key="selectedItem.image"
                :src="selectedItem.image" 
                :alt="selectedItem.name" 
                class="detail-item-img" 
                style="cursor: zoom-in;" 
                @click="openLightbox(selectedItem.image)"
                @error="handleImgError"
                title="點選查看原圖"
              />
            </div>
            <h2 class="detail-item-name neon-text-qigong">{{ selectedItem.name }}</h2>
            <button 
              v-if="selectedItem.status === '分享中'"
              class="modal-btn confirm"
              style="padding: 4px 12px; font-size: 0.8rem; background: rgba(0, 255, 102, 0.1); margin: 5px 0 10px;"
              @click="promptEdit"
            >
              ✏️ 編輯寶物資訊
            </button>
            <div class="detail-badge-row" style="justify-content: center; margin-bottom: 8px;">
              <span class="detail-badge-item">伺服器: {{ selectedItem.server }}</span>
              <span class="detail-badge-item">👥 申請人數: {{ selectedItem.applicantCount }} 人</span>
            </div>
            <p class="giver-info">分享者: <strong>{{ selectedItem.giverId }}</strong></p>
          </div>

          <div class="status-alert-box" v-if="selectedItem.status === '交易中'">
            <span class="alert-icon">🤝</span>
            <span class="alert-text">已指定受贈對象：<strong class="neon-text-qigong">{{ selectedItem.receiverId }}</strong> (交易中)</span>
          </div>

          <div class="detail-section" v-if="selectedItem.statReq && selectedItem.statReq.length > 0">
            <h3 class="section-title">🛡️ 裝備要求</h3>
            <ul class="stats-list">
              <li v-for="(req, idx) in selectedItem.statReq" :key="idx" class="stat-li">
                <span class="stat-text">{{ req }}</span>
              </li>
            </ul>
          </div>

          <div class="detail-section" v-if="selectedItem.stats && selectedItem.stats.length > 0">
            <h3 class="section-title">📊 道具屬性</h3>
            <ul class="stats-list">
              <li v-for="(stat, idx) in selectedItem.stats" :key="idx" class="stat-li">
                <span class="stat-text">{{ stat }}</span>
              </li>
            </ul>
          </div>

          <div class="detail-section" v-if="selectedItem.notes">
            <h3 class="section-title">📝 大老寄語</h3>
            <p class="giver-notes">「{{ selectedItem.notes }}」</p>
          </div>

          <!-- 申請 -->
          <button 
            v-if="selectedItem.status === '分享中'"
            class="apply-item-btn" 
            @click="openApplyModal"
          >
            我要申請道具
          </button>
          <button v-else class="apply-item-btn disabled" disabled>
            已確認贈與對象 ({{ selectedItem.receiverId }})
          </button>
        </div>
      </div>
    </div>

    <!-- 5. 歷史唯讀詳細資訊 Modal -->
    <div class="modal-overlay" v-if="showHistoryDetailModal" @click="closeHistoryDetail" style="z-index: 1100;">
      <div class="modal-content glass-card neon-border-qigong" @click.stop style="width: 500px; max-height: 85vh; overflow-y: auto;">
        <h3 class="modal-title neon-text-qigong" style="margin-bottom: 20px;">📜 歷史寶物詳細資訊 (唯讀)</h3>
        
        <div v-if="historyDetailItem" class="drawer-content" style="margin-top: 10px;">
          <div class="detail-header" style="flex-direction: column; align-items: center; text-align: center; margin-bottom: 20px;">
            <div class="detail-image-box" style="margin-right: 0; margin-bottom: 15px; width: 100px; height: 100px;">
              <img 
                :key="historyDetailItem.image"
                :src="historyDetailItem.image" 
                :alt="historyDetailItem.name" 
                class="detail-item-img" 
                style="cursor: zoom-in;" 
                @click="openLightbox(historyDetailItem.image)"
                @error="handleImgError"
                title="點選查看原圖"
              />
            </div>
            <h2 class="detail-item-name neon-text-qigong" style="font-size: 1.4rem;">{{ historyDetailItem.name }}</h2>
            <div class="detail-badge-row" style="justify-content: center; margin-top: 8px;">
              <span class="detail-badge-item">伺服器: {{ historyDetailItem.server }}</span>
              <span class="detail-badge-item">類型: {{ historyDetailItem.type }}</span>
            </div>
            <p class="giver-info" style="margin-top: 10px; font-size: 0.9rem;">
              🎁 提供者: <strong>{{ historyDetailItem.giverId }}</strong> 
              <br/>
              🤝 受贈人: <strong class="neon-text-qigong">{{ historyDetailItem.receiverId || '無' }}</strong>
            </p>
          </div>

          <div class="status-alert-box" style="background: rgba(0, 255, 102, 0.05); border-color: rgba(0, 255, 102, 0.15); margin-top: 0; margin-bottom: 20px; display: flex; gap: 8px; justify-content: center; align-items: center;">
            <span class="alert-icon" style="color: var(--color-qigong);">✓</span>
            <span class="alert-text" style="color: var(--color-qigong); font-size: 0.85rem;">
              此道具交易已於 {{ formatTime(historyDetailItem.completeTime || historyDetailItem.updatedAt) }} 順利完成結案。
            </span>
          </div>

          <div class="detail-section" v-if="historyDetailItem.statReq && historyDetailItem.statReq.length > 0">
            <h4 class="section-title" style="font-size: 0.95rem; margin-bottom: 8px;">🛡️ 裝備要求</h4>
            <ul class="stats-list" style="margin-bottom: 15px;">
              <li v-for="(req, idx) in historyDetailItem.statReq" :key="idx" class="stat-li" style="padding: 6px 12px;">
                <span class="stat-text" style="font-size: 0.85rem;">{{ req }}</span>
              </li>
            </ul>
          </div>

          <div class="detail-section" v-if="historyDetailItem.stats && historyDetailItem.stats.length > 0">
            <h4 class="section-title" style="font-size: 0.95rem; margin-bottom: 8px;">📊 道具屬性</h4>
            <ul class="stats-list" style="margin-bottom: 15px;">
              <li v-for="(stat, idx) in historyDetailItem.stats" :key="idx" class="stat-li" style="padding: 6px 12px;">
                <span class="stat-text" style="font-size: 0.85rem;">{{ stat }}</span>
              </li>
            </ul>
          </div>

          <div class="detail-section" v-if="historyDetailItem.notes">
            <h4 class="section-title" style="font-size: 0.95rem; margin-bottom: 8px;">📝 大老寄語</h4>
            <p class="giver-notes" style="font-size: 0.85rem; padding: 10px 14px;">「{{ historyDetailItem.notes }}」</p>
          </div>
        </div>

        <div class="modal-buttons" style="border-top: 1px solid rgba(255,255,255,0.05); padding-top: 15px; margin-top: 25px; justify-content: center;">
          <button class="modal-btn cancel" @click="closeHistoryDetail">關閉詳細資訊</button>
        </div>
      </div>
    </div>

    <!-- 6. 圖片放大 Lightbox Modal -->
    <div class="modal-overlay" v-if="showLightbox" @click="showLightbox = false" style="z-index: 1200; background: rgba(0,0,0,0.95); backdrop-filter: blur(8px);">
      <button class="close-btn" style="top: 25px; right: 25px; font-size: 2rem; cursor: pointer;" @click="showLightbox = false">✕</button>
      <div style="max-width: 90vw; max-height: 90vh; display: flex; justify-content: center; align-items: center;" @click.stop>
        <img 
          :src="lightboxImage" 
          style="max-width: 100%; max-height: 90vh; object-fit: contain; border-radius: 8px; box-shadow: 0 0 30px rgba(0, 255, 102, 0.3); border: 2px solid rgba(255,255,255,0.1);" 
        />
      </div>
    </div>

    <!-- Toast 訊息通知 -->
    <transition name="toast">
      <div class="toast-message glass-card neon-border-qigong" v-if="toastMsg" style="border-color: var(--color-qigong); box-shadow: var(--glow-qigong);">
        <span class="toast-icon">🔔</span>
        <span class="toast-text">{{ toastMsg }}</span>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, onUnmounted } from 'vue'
import LoadingOverlay from '@/components/LoadingOverlay.vue'
import { db } from '@/firebase'
import { 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  getDoc, 
  getDocs,
  onSnapshot, 
  writeBatch, 
  increment,
  query,
  where,
  orderBy,
  limit,
  startAfter
} from 'firebase/firestore'

// 1. 本地 LocalStorage 模擬庫設定
const IDENTITIES_KEY = 'ran2_share_identities'

const loadIdentities = () => {
  const data = localStorage.getItem(IDENTITIES_KEY)
  if (!data) {
    const defaultIdentities = {
      'R8X9D': '破壞之王',
      'TEST1': '幻海奇緣',
      'TEST2': '新東京萌新',
      'TEST3': '新大阪大老'
    }
    localStorage.setItem(IDENTITIES_KEY, JSON.stringify(defaultIdentities))
    return defaultIdentities
  }
  return JSON.parse(data)
}

const saveIdentity = (userId, charId) => {
  const idMap = loadIdentities()
  idMap[userId] = charId
  localStorage.setItem(IDENTITIES_KEY, JSON.stringify(idMap))
}

const MOCK_SHARES_KEY = 'ran2_mock_shares'
const MOCK_APPLICATIONS_KEY = 'ran2_mock_applications'

const initialShares = [
  {
    id: 'item-1',
    name: '雷神弓‧天誅',
    type: '武器',
    image: '/assets/share/asset1.jpg',
    giverId: '幻海奇緣',
    server: '新東京',
    passwordHash: '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', // '1234'
    status: '分享中',
    statReq: ['要求: 等級 195'],
    stats: ['狀態異常: 麻痺(35%機率)', '3回+0.8%'],
    notes: '大老退坑免費贈送',
    createdAt: Date.now() - 3600000 * 24, // 1天前
    updatedAt: Date.now() - 3600000 * 24,
    claimTime: null,
    completeTime: null,
    receiverId: null,
    applicantCount: 0
  },
  {
    id: 'item-2',
    name: '強化角弓(冰正)[+7]',
    type: '武器',
    image: '/assets/share/asset2.jpg',
    giverId: '破壞之王',
    server: '新大阪',
    passwordHash: '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', // '1234'
    status: '分享中',
    statReq: ['敏捷 406'],
    stats: ['隨機+4.04%', 'SP回+0.3%'],
    notes: '過渡好用',
    createdAt: Date.now() - 3600000 * 12, // 12小時前
    updatedAt: Date.now() - 3600000 * 12,
    claimTime: null,
    completeTime: null,
    receiverId: null,
    applicantCount: 0
  },
  {
    id: 'item-3',
    name: 'B級磐石氣功手套(正)[+12]',
    type: '武器',
    image: '/assets/share/asset3.jpg',
    giverId: '土豪123',
    server: '新東京',
    passwordHash: '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', // '1234'
    status: '分享中',
    statReq: ['無屬性要求'],
    stats: ['隨機+16.93%', 'HP回0.04'],
    notes: '打怪必備',
    createdAt: Date.now() - 3600000 * 2, // 2小時前
    updatedAt: Date.now() - 3600000 * 2,
    claimTime: null,
    completeTime: null,
    receiverId: null,
    applicantCount: 0
  }
]

// 響應式狀態
const items = ref([])
const applications = ref([])

const selectedServer = ref('全部')
const selectedType = ref('全部')
const searchQuery = ref('')
const activeSearchQuery = ref('')
const showMobileFilters = ref(false)

const showSuccessModal = ref(false)
const showShareModal = ref(false)
const showMobileDetail = ref(false)
const showApplyModal = ref(false)
const showMyAppsModal = ref(false)
const showHistoryModal = ref(false)
const showHistoryDetailModal = ref(false)
const historyDetailItem = ref(null)
const showLightbox = ref(false)
const lightboxImage = ref('')

const openLightbox = (imgUrl) => {
  if (!imgUrl) return
  lightboxImage.value = imgUrl
  showLightbox.value = true
}

const openHistoryDetail = (item) => {
  historyDetailItem.value = item
  showHistoryDetailModal.value = true
}

const closeHistoryDetail = () => {
  showHistoryDetailModal.value = false
  historyDetailItem.value = null
}

const viewHistoryItemByApp = (app) => {
  const targetItem = items.value.find(x => x.id === app.itemId)
  if (targetItem) {
    openHistoryDetail(targetItem)
  } else {
    alert('找不到該道具的詳細歷史紀錄！')
  }
}

// 圖片上傳拖曳
const isDragOver = ref(false)
const fileInput = ref(null)

// 身份識別碼 states
const myUserId = ref('')
const myUserIdVerified = ref(false)
const inputUserId = ref('')
const inputMyUserId = ref('')
const showCreateIdBlock = ref(false)
const createCharId = ref('')
const applyCharId = ref('')

// 忘記識別碼提示
const toastMsg = ref('')

// 發佈好物 state
const newItem = ref({
  name: '',
  giverId: '',
  server: '新東京',
  type: '武器',
  password: '',
  statReqText: '',
  statsText: '',
  notes: '',
  image: ''
})
const isEditing = ref(false)
// 發起者密碼驗證 state
const giverPassword = ref('')
const verifiedGiverItemIds = ref([]) // 記錄當前已成功驗證密碼的 itemId 列表

// 分頁控制
const historyPage = ref(1)
const myHistoryPage = ref(1)
const activeMyAppsTab = ref('active') // 'active' | 'history'

// 密碼雜湊
const sha256 = async (message) => {
  const msgBuffer = new TextEncoder().encode(message)
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// 根據遊戲ID生成固定的 5 碼英數識別碼
const generateIdentityCode = (charId) => {
  if (!charId) return ''
  let hash = 0
  for (let i = 0; i < charId.length; i++) {
    hash = charId.charCodeAt(i) + ((hash << 5) - hash)
  }
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // 避開 O, I, 0, 1 等混淆字元
  let code = ''
  for (let j = 0; j < 5; j++) {
    const index = Math.abs((hash + j * 31) % chars.length)
    code += chars[index]
  }
  return code
}

// 顯示 Toast 訊息
const showToast = (msg) => {
  toastMsg.value = msg
  setTimeout(() => {
    toastMsg.value = ''
  }, 3500)
}

const isSubmitting = ref(false)
const isInitialLoading = ref(true)

const imgRetryCounts = new Map()

const handleImgError = (event) => {
  const imgEl = event.target
  const originalSrc = imgEl.getAttribute('data-original-src') || imgEl.src

  if (!originalSrc || originalSrc.includes('/assets/share/no-image.png')) {
    imgEl.src = '/assets/share/no-image.png'
    return
  }

  if (!imgEl.getAttribute('data-original-src')) {
    imgEl.setAttribute('data-original-src', originalSrc)
  }

  let retryCount = imgRetryCounts.get(originalSrc) || 0

  if (retryCount < 3) {
    retryCount++
    imgRetryCounts.set(originalSrc, retryCount)
    
    setTimeout(() => {
      try {
        const url = new URL(originalSrc, window.location.origin)
        url.searchParams.set('t', String(Date.now()))
        imgEl.src = url.toString()
      } catch (e) {
        const connector = originalSrc.includes('?') ? '&' : '?'
        imgEl.src = `${originalSrc}${connector}t=${Date.now()}`
      }
    }, 1500)
  } else {
    imgEl.src = '/assets/share/no-image.png'
  }
}

// 讀取 LocalStorage
const loadFromStorage = () => {
  const sharesData = localStorage.getItem(MOCK_SHARES_KEY)
  if (!sharesData) {
    localStorage.setItem(MOCK_SHARES_KEY, JSON.stringify(initialShares))
    items.value = JSON.parse(JSON.stringify(initialShares))
  } else {
    items.value = JSON.parse(sharesData)
  }

  const appsData = localStorage.getItem(MOCK_APPLICATIONS_KEY)
  if (!appsData) {
    localStorage.setItem(MOCK_APPLICATIONS_KEY, JSON.stringify([]))
    applications.value = []
  } else {
    applications.value = JSON.parse(appsData)
  }
}

// 實體圖片壓縮與上傳 Google Drive 機制
const pendingImageFile = ref(null)

const compressImageToWebpBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height
        
        const MAX_WIDTH = 800
        const MAX_HEIGHT = 800
        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width
            width = MAX_WIDTH
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height
            height = MAX_HEIGHT
          }
        }
        
        canvas.width = width
        canvas.height = height
        
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)
        
        let quality = 0.7
        let base64 = canvas.toDataURL('image/webp', quality)
        
        // 限制在 80KB 以下 (大約 110,000 個字元的 Base64 長度)
        while (base64.length > 110000 && quality > 0.1) {
          quality -= 0.1
          base64 = canvas.toDataURL('image/webp', quality)
        }
        resolve(base64)
      }
      img.onerror = reject
      img.src = e.target.result
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

const uploadImageViaGAS = async (file, oldFileId = '') => {
  const uploadUrl = import.meta.env.VITE_GAS_UPLOAD_URL
  if (!uploadUrl) {
    console.warn('VITE_GAS_UPLOAD_URL 未設定，無法上傳圖片。將使用預設 placeholder。')
    return null
  }
  
  try {
    const base64 = await compressImageToWebpBase64(file)
    const payload = {
      image: base64,
      name: file.name,
      oldFileId: oldFileId
    }
    
    const response = await fetch(uploadUrl, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(payload)
    })
    
    if (!response.ok) {
      throw new Error(`HTTP 錯誤! 狀態碼: ${response.status}`)
    }
    
    const result = await response.json()
    if (result.success) {
      return result.url
    } else {
      throw new Error(result.error || '上傳失敗')
    }
  } catch (error) {
    console.error('上傳圖片至 Google Drive 失敗:', error)
    alert(`圖片上傳失敗: ${error.message}。將使用預設或原有的圖片。`)
    return null
  }
}

// 實體環境下不需本地同步，轉為空操作 (No-op) 避免遺留調用出錯
const saveSharesToStorage = () => {}
const saveAppsToStorage = () => {}

// 歷史紀錄查詢機制
const historyItems = ref([])
const historyLoading = ref(false)
let historyPageCursors = []

const loadHistoryPage = async (page) => {
  historyLoading.value = true
  try {
    let q = query(
      collection(db, 'shares'),
      where('status', '==', '已完成'),
      orderBy('completeTime', 'desc'),
      limit(20)
    )
    if (page > 1 && historyPageCursors[page - 2]) {
      q = query(q, startAfter(historyPageCursors[page - 2]))
    }
    const snap = await getDocs(q)
    const list = []
    snap.forEach(doc => {
      list.push({ id: doc.id, ...doc.data() })
    })
    historyItems.value = list
    if (snap.docs.length > 0) {
      historyPageCursors[page - 1] = snap.docs[snap.docs.length - 1]
    }
  } catch (err) {
    console.error('載入歷史紀錄失敗:', err)
  } finally {
    historyLoading.value = false
  }
}

// 申請紀錄實時監聽隔離與優化
const currentItemApplicants = ref([])
let unsubscribeShares = null
let unsubscribeMyApps = null
let unsubscribeItemApplicants = null

const watchMyApps = () => {
  if (unsubscribeMyApps) {
    unsubscribeMyApps()
    unsubscribeMyApps = null
  }
  if (!myUserId.value) {
    applications.value = []
    return
  }
  const q = query(
    collection(db, 'applications'),
    where('userId', '==', myUserId.value)
  )
  unsubscribeMyApps = onSnapshot(q, (snapshot) => {
    const list = []
    snapshot.forEach(doc => {
      list.push({ id: doc.id, ...doc.data() })
    })
    applications.value = list
  }, (err) => {
    console.error('監聽個人申請失敗:', err)
  })
}

const watchItemApplicants = () => {
  if (unsubscribeItemApplicants) {
    unsubscribeItemApplicants()
    unsubscribeItemApplicants = null
  }
  if (!selectedItem.value || !isGiverVerified.value) {
    currentItemApplicants.value = []
    return
  }
  const q = query(
    collection(db, 'applications'),
    where('itemId', '==', selectedItem.value.id)
  )
  unsubscribeItemApplicants = onSnapshot(q, (snapshot) => {
    const list = []
    snapshot.forEach(doc => {
      const data = doc.data()
      if (data.status === '申請中' || data.status === '確認中') {
        list.push({ id: doc.id, ...data })
      }
    })
    currentItemApplicants.value = list
  }, (err) => {
    console.error('監聽道具申請人失敗:', err)
  })
}

watch(myUserId, () => {
  watchMyApps()
})



onMounted(() => {
  // 監聽 shares 實時變更 (僅限分享中與交易中)
  const sharesQuery = query(
    collection(db, 'shares'),
    where('status', 'in', ['分享中', '交易中']),
    orderBy('updatedAt', 'asc')
  )
  unsubscribeShares = onSnapshot(sharesQuery, (snapshot) => {
    const list = []
    snapshot.forEach((doc) => {
      list.push({ id: doc.id, ...doc.data() })
    })
    items.value = list
    isInitialLoading.value = false
  }, (err) => {
    console.error('監聽 shares 失敗:', err)
    isInitialLoading.value = false
  })

  // 啟動個人申請監聽
  watchMyApps()

  loadIdentities() // 初始化本地身分對照備份
  const savedId = localStorage.getItem('ran2_share_user_id')
  if (savedId) {
    myUserId.value = savedId
    inputUserId.value = savedId
    inputMyUserId.value = savedId
    myUserIdVerified.value = true
  }
})

onUnmounted(() => {
  if (unsubscribeShares) unsubscribeShares()
  if (unsubscribeMyApps) unsubscribeMyApps()
  if (unsubscribeItemApplicants) unsubscribeItemApplicants()
})

// 道具過濾與搜尋邏輯 (僅限活躍中的道具：分享中、交易中)
const filteredItems = computed(() => {
  // 只顯示狀態為 分享中、交易中 的道具
  let list = items.value.filter(item => item.status === '分享中' || item.status === '交易中')
  
  // 1. 伺服器篩選
  if (selectedServer.value !== '全部') {
    list = list.filter(item => item.server === selectedServer.value)
  }
  
  // 2. 道具類型篩選
  if (selectedType.value !== '全部') {
    list = list.filter(item => item.type === selectedType.value)
  }
  
  // 3. 模糊文字搜尋 (點按鈕後觸發的 activeSearchQuery)
  if (activeSearchQuery.value.trim() !== '') {
    const q = activeSearchQuery.value.toLowerCase().trim()
    list = list.filter(item => {
      const matchName = item.name.toLowerCase().includes(q)
      const matchGiver = item.giverId.toLowerCase().includes(q)
      const matchStats = item.stats.some(s => s.toLowerCase().includes(q))
      const matchReq = item.statReq ? item.statReq.some(r => r.toLowerCase().includes(q)) : false
      return matchName || matchGiver || matchStats || matchReq
    })
  }
  
  // 4. 排序：資料異動時間 (updatedAt) 愈早的愈前面
  return list.sort((a, b) => a.updatedAt - b.updatedAt)
})

// 當前選擇的好物
const selectedItem = ref(null)

// 當選擇切換時
const selectItem = (item) => {
  selectedItem.value = item
  giverPassword.value = '' // 重置密碼輸入
  if (window.innerWidth <= 900) {
    showMobileDetail.value = true
  }
}

// 若有項目，預設選擇第一個符合的，並在 items 變更時自動同步選中項目的最新狀態
watch(filteredItems, (newVal) => {
  if (newVal.length > 0 && !selectedItem.value) {
    selectedItem.value = newVal[0]
  }
}, { immediate: true })

watch(items, (newItems) => {
  if (selectedItem.value) {
    const found = newItems.find(x => x.id === selectedItem.value.id)
    if (found) {
      selectedItem.value = found
    }
  }
}, { deep: true })

const closeMobileDetail = () => {
  showMobileDetail.value = false
}

// 觸發手動搜尋
const triggerSearch = () => {
  activeSearchQuery.value = searchQuery.value
}

// --- 圖片上傳處理 ---
const triggerFileInput = () => {
  if (!newItem.value.image && fileInput.value) {
    fileInput.value.click()
  }
}
const handleFileChange = (event) => {
  const file = event.target.files[0]
  if (file) {
    processImageFile(file)
  }
}
const handleDrop = (event) => {
  isDragOver.value = false
  const file = event.dataTransfer.files[0]
  if (file && file.type.startsWith('image/')) {
    processImageFile(file)
  }
}
const processImageFile = (file) => {
  pendingImageFile.value = file
  newItem.value.image = URL.createObjectURL(file)
}

// --- 發布好物 ---
const shareItem = async () => {
  const { name, giverId, server, type, password, statReqText, statsText, notes } = newItem.value
  
  if (!name || !giverId || !server || !type || !password) {
    alert('請填寫必填欄位：道具名稱、分享者 ID、伺服器、防呆密碼！')
    return
  }

  isSubmitting.value = true

  // 編輯模式處理
  if (isEditing.value) {
    try {
      let displayImage = newItem.value.image || '/assets/share/no-image.png'
      if (pendingImageFile.value) {
        let oldFileId = ''
        if (newItem.value.image && newItem.value.image.includes('lh3.googleusercontent.com/d/')) {
          const parts = newItem.value.image.split('/')
          oldFileId = parts[parts.length - 1]
        }
        const uploadedUrl = await uploadImageViaGAS(pendingImageFile.value, oldFileId)
        if (uploadedUrl) {
          displayImage = uploadedUrl
        }
      }

      const reqArr = statReqText ? statReqText.split('\n').filter(r => r.trim() !== '') : ['無特殊裝備要求']
      const statArr = statsText ? statsText.split('\n').filter(s => s.trim() !== '') : ['基礎屬性，無額外加成']

      const shareRef = doc(db, 'shares', newItem.value.id)
      await updateDoc(shareRef, {
        name,
        giverId,
        server,
        type,
        statReq: reqArr,
        stats: statArr,
        notes: notes || '大老很慷慨，什麼都沒留下。',
        image: displayImage,
        updatedAt: Date.now()
      })
      showToast('好物資訊編輯成功！')
      closeShareModal()
    } catch (err) {
      console.error('更新好物失敗:', err)
      alert(`編輯失敗: ${err.message}`)
    } finally {
      isSubmitting.value = false
    }
    return
  }

  // 雜湊防呆密碼
  const hash = await sha256(password)

  // 切割多行欄位
  const reqArr = statReqText
    ? statReqText.split('\n').filter(r => r.trim() !== '')
    : ['無特殊裝備要求']
  const statArr = statsText
    ? statsText.split('\n').filter(s => s.trim() !== '')
    : ['基礎屬性，無額外加成']

  try {
    // 圖片上傳
    let displayImage = '/assets/share/no-image.png'
    if (pendingImageFile.value) {
      const uploadedUrl = await uploadImageViaGAS(pendingImageFile.value)
      if (uploadedUrl) {
        displayImage = uploadedUrl
      }
    }

    const newItemData = {
      name,
      giverId,
      server,
      type,
      passwordHash: hash,
      status: '分享中',
      image: displayImage,
      statReq: reqArr,
      stats: statArr,
      notes: notes || '大老很慷慨，什麼都沒留下。',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      claimTime: null,
      completeTime: null,
      receiverId: null,
      applicantCount: 0
    }
    await addDoc(collection(db, 'shares'), newItemData)
    showToast('好物發布成功！')
    closeShareModal()
  } catch (err) {
    console.error('新增好物失敗:', err)
    alert(`發布失敗: ${err.message}`)
  } finally {
    isSubmitting.value = false
  }
}

const closeShareModal = () => {
  showShareModal.value = false
  isEditing.value = false
  pendingImageFile.value = null
  newItem.value = {
    name: '',
    giverId: '',
    server: '新東京',
    type: '武器',
    password: '',
    statReqText: '',
    statsText: '',
    notes: '',
    image: ''
  }
}

const openEditModal = () => {
  if (!selectedItem.value) return
  isEditing.value = true
  newItem.value = {
    id: selectedItem.value.id,
    name: selectedItem.value.name,
    giverId: selectedItem.value.giverId,
    server: selectedItem.value.server,
    type: selectedItem.value.type,
    password: '123', // 置灰不可改
    statReqText: selectedItem.value.statReq ? selectedItem.value.statReq.join('\n') : '',
    statsText: selectedItem.value.stats ? selectedItem.value.stats.join('\n') : '',
    notes: selectedItem.value.notes,
    image: selectedItem.value.image
  }
  showShareModal.value = true
  showMobileDetail.value = false
}

const promptEdit = async () => {
  if (!selectedItem.value) return
  
  // 如果已驗證過發起人身分，直接開起編輯
  if (verifiedGiverItemIds.value.includes(selectedItem.value.id)) {
    openEditModal()
    return
  }

  const pwd = prompt('你是分享者嗎? 輸入分享時設定的密碼才可異動資料哦')
  if (pwd === null) return // 使用者取消

  if (!pwd) {
    alert('防呆密碼不可為空！')
    return
  }

  const hash = await sha256(pwd)
  if (hash === selectedItem.value.passwordHash) {
    if (!verifiedGiverItemIds.value.includes(selectedItem.value.id)) {
      verifiedGiverItemIds.value.push(selectedItem.value.id)
    }
    openEditModal()
  } else {
    alert('防呆密碼錯誤！認證失敗，無法編輯。')
  }
}

// --- 申請道具與身分驗證 ---
const openApplyModal = () => {
  if (myUserId.value) {
    inputUserId.value = myUserId.value
  }
  showApplyModal.value = true
}

const toggleIdentityCreate = () => {
  showCreateIdBlock.value = !showCreateIdBlock.value
  createCharId.value = ''
}

// 建立識別碼
const handleCreateIdentity = async () => {
  if (!createCharId.value.trim()) {
    alert('請輸入您的角色 ID (遊戲 ID)')
    return
  }
  const char = createCharId.value.trim()
  const code = generateIdentityCode(char)
  try {
    const identityRef = doc(db, 'identities', code)
    await setDoc(identityRef, {
      charId: char,
      createdAt: Date.now()
    })
    saveIdentity(code, char) // 同步在本地存一份備份
    inputUserId.value = code
    showCreateIdBlock.value = false
    showToast(`身分識別碼建立成功！請牢記您的代碼：${code}`)
  } catch (err) {
    console.error('建立身分識別碼失敗:', err)
    alert(`建立識別碼失敗: ${err.message}`)
  }
}

// 忘了識別碼提示
const showForgotIdAlert = () => {
  alert('【我忘了識別碼】\n若遺失了您的身分識別碼，請密語遊戲內的「Antigravity」開發團隊，或寄件至系統管理信箱，我們將會協助為您的角色 ID 找回專屬識別碼。')
}

// 提交道具申請
const submitApplication = async () => {
  if (!inputUserId.value.trim()) {
    alert('請輸入「身分識別碼」！')
    return
  }

  const code = inputUserId.value.trim().toUpperCase()
  
  try {
    const identitySnap = await getDoc(doc(db, 'identities', code))
    if (!identitySnap.exists()) {
      alert('此身分識別碼不存在！請先在下方「建立識別碼」或確認是否輸入正確。')
      return
    }
    const char = identitySnap.data().charId

    // 1. 檢查同識別碼上限 (最多3筆「申請中/確認中」)
    const activeApps = applications.value.filter(app => 
      app.userId === code && 
      (app.status === '申請中' || app.status === '確認中')
    )
    if (activeApps.length >= 3) {
      alert(`申請失敗！您目前已有 ${activeApps.length} 筆進行中的道具申請，最多同時只能有 3 筆未結案的申請。請先前往「我的申請清單」完成或取消現有申請。`)
      return
    }

    // 2. 檢查是否已經申請過該道具
    const alreadyApplied = applications.value.some(app => 
      app.userId === code && app.itemId === selectedItem.value.id && 
      (app.status === '申請中' || app.status === '確認中')
    )
    if (alreadyApplied) {
      alert('您已經申請過該道具，且目前正在處理中！')
      return
    }

    // 寫入 DB 與遞增人數 (原子操作)
    const batch = writeBatch(db)
    const appRef = doc(db, 'applications', `${code}_${selectedItem.value.id}`)
    batch.set(appRef, {
      itemId: selectedItem.value.id,
      itemName: selectedItem.value.name,
      charId: char,
      userId: code,
      status: '申請中',
      applyTime: Date.now(),
      completeTime: null
    })
    const shareRef = doc(db, 'shares', selectedItem.value.id)
    batch.update(shareRef, {
      applicantCount: increment(1)
    })
    await batch.commit()

    // 儲存本地識別碼自動登入
    myUserId.value = code
    localStorage.setItem('ran2_share_user_id', code)
    myUserIdVerified.value = true

    showApplyModal.value = false
    showMobileDetail.value = false
    showToast('道具申請提交成功！')
  } catch (err) {
    console.error('提交申請失敗:', err)
    alert(`提交申請失敗: ${err.message}`)
  }
}

// --- 我的申請進度清單管理 ---
const openMyAppsModal = () => {
  showMyAppsModal.value = true
  if (myUserId.value) {
    inputMyUserId.value = myUserId.value
    myUserIdVerified.value = true
  } else {
    myUserIdVerified.value = false
  }
}

const verifyMyUserId = async () => {
  if (!inputMyUserId.value.trim()) {
    alert('請輸入身分識別碼！')
    return
  }
  const code = inputMyUserId.value.trim().toUpperCase()
  try {
    const snap = await getDoc(doc(db, 'identities', code))
    if (!snap.exists()) {
      alert('無此身分識別碼，驗證失敗！')
      return
    }
    myUserId.value = code
    localStorage.setItem('ran2_share_user_id', code)
    myUserIdVerified.value = true
    myHistoryPage.value = 1
    showToast('驗證成功並同步！')
  } catch (err) {
    console.error('驗證識別碼失敗:', err)
    alert(`驗證失敗: ${err.message}`)
  }
}

const logoutMyUserId = () => {
  myUserId.value = ''
  myUserIdVerified.value = false
  localStorage.removeItem('ran2_share_user_id')
}

// 取得當前個人的「進行中申請」
const myActiveApplications = computed(() => {
  if (!myUserId.value) return []
  return applications.value.filter(app => 
    app.userId === myUserId.value && 
    (app.status === '申請中' || app.status === '確認中')
  ).sort((a, b) => a.applyTime - b.applyTime) // 申請時間愈早愈前面
})

// 取得當前個人的「歷史申請結果」
const myHistoryApplications = computed(() => {
  if (!myUserId.value) return []
  return applications.value.filter(app => 
    app.userId === myUserId.value && 
    (app.status === '已完成' || app.status === '已拒絕')
  ).sort((a, b) => (b.completeTime || b.applyTime) - (a.completeTime || a.applyTime)) // 完成時間愈晚愈前面
})

// 個人歷史分頁
const totalMyHistoryPages = computed(() => {
  return Math.ceil(myHistoryApplications.value.length / 20) || 1
})
const paginatedMyHistoryApplications = computed(() => {
  const start = (myHistoryPage.value - 1) * 20
  return myHistoryApplications.value.slice(start, start + 20)
})

// --- 申請人端操作按鈕 ---
// 取消申請
const cancelMyApplication = async (app) => {
  if (confirm(`確定要取消對【${app.itemName}】的申請嗎？`)) {
    try {
      const batch = writeBatch(db)
      const appRef = doc(db, 'applications', app.id)
      batch.delete(appRef)

      const shareRef = doc(db, 'shares', app.itemId)
      batch.update(shareRef, {
        applicantCount: increment(-1)
      })
      await batch.commit()
      showToast('已取消該申請。')
    } catch (err) {
      console.error('取消申請失敗:', err)
      alert(`操作失敗: ${err.message}`)
    }
  }
}

// 感謝收下並領取 (完成結案)
const completeMyApplication = async (app) => {
  try {
    const batch = writeBatch(db)
    const now = Date.now()

    // 1. 更新好物狀態
    const shareRef = doc(db, 'shares', app.itemId)
    batch.update(shareRef, {
      status: '已完成',
      completeTime: now,
      updatedAt: now
    })

    // 2. 更新當前申請單
    const currentAppRef = doc(db, 'applications', app.id)
    batch.update(currentAppRef, {
      status: '已完成',
      completeTime: now
    })



    await batch.commit()
    showToast('恭喜完成領取！感謝大老的無私贈與！')
  } catch (err) {
    console.error('確認收貨失敗:', err)
    alert(`確認收貨失敗: ${err.message}`)
  }
}

// 婉拒贈與者
const declineMyApplication = async (app) => {
  if (confirm('確定要婉拒此道具嗎？婉拒後好物將重新上架開放他人申請。')) {
    try {
      const batch = writeBatch(db)
      const now = Date.now()

      // 1. 更新好物狀態
      const shareRef = doc(db, 'shares', app.itemId)
      batch.update(shareRef, {
        status: '分享中',
        receiverId: null,
        claimTime: null,
        updatedAt: now,
        applicantCount: increment(-1)
      })

      // 2. 更新當前申請狀態
      const currentAppRef = doc(db, 'applications', app.id)
      batch.update(currentAppRef, {
        status: '已拒絕',
        completeTime: now
      })

      await batch.commit()
      showToast('已婉拒贈送，道具已重新開放他人申請。')
    } catch (err) {
      console.error('婉拒失敗:', err)
      alert(`操作失敗: ${err.message}`)
    }
  }
}

// --- 發起人/贈與者端操作 ---
const verifyGiverPassword = async () => {
  if (!selectedItem.value) return
  if (!giverPassword.value) {
    alert('請輸入防呆密碼！')
    return
  }
  
  const hash = await sha256(giverPassword.value)
  if (hash === selectedItem.value.passwordHash) {
    if (!verifiedGiverItemIds.value.includes(selectedItem.value.id)) {
      verifiedGiverItemIds.value.push(selectedItem.value.id)
    }
    giverPassword.value = ''
    showToast('發起人身分驗證通過！')
  } else {
    alert('密碼錯誤！認證失敗。')
  }
}



const isGiverVerified = computed(() => {
  return selectedItem.value ? verifiedGiverItemIds.value.includes(selectedItem.value.id) : false
})

watch([selectedItem, isGiverVerified], () => {
  watchItemApplicants()
})

// 指定贈送人
const confirmGiftTo = async (app) => {
  if (!selectedItem.value) return
  if (confirm(`確定要將【${selectedItem.value.name}】贈送給玩家「${app.charId}」嗎？`)) {
    try {
      const batch = writeBatch(db)
      const now = Date.now()

      // 1. 更新好物狀態為 交易中，並寫入受贈人
      const shareRef = doc(db, 'shares', selectedItem.value.id)
      batch.update(shareRef, {
        status: '交易中',
        receiverId: app.charId,
        claimTime: now,
        updatedAt: now
      })

      // 2. 更新得標申請人為 確認中
      const appRef = doc(db, 'applications', app.id)
      batch.update(appRef, {
        status: '確認中'
      })

      // 3. 更新其他申請此道具的人為 已拒絕 (釋放他們的申請上限)
      const otherApps = currentItemApplicants.value.filter(x => x.id !== app.id)
      otherApps.forEach(x => {
        const ref = doc(db, 'applications', x.id)
        batch.update(ref, {
          status: '已拒絕',
          completeTime: now
        })
      })

      await batch.commit()
      showToast(`已成功指定對象！遊戲 ID「${app.charId}」將會出現在該好物封面上。`)
    } catch (err) {
      console.error('指定贈送失敗:', err)
      alert(`操作失敗: ${err.message}`)
    }
  }
}

// 刪除寶物及其所有申請紀錄，並呼叫 GAS 回收 Google Drive 圖檔空間
const deleteShareItem = async () => {
  if (!selectedItem.value) return
  if (!confirm(`確定要永久刪除此寶物【${selectedItem.value.name}】及所有申請紀錄嗎？此操作無法還原！`)) {
    return
  }

  isSubmitting.value = true

  try {
    const itemId = selectedItem.value.id
    const imageUrl = selectedItem.value.image
    const batch = writeBatch(db)

    // 1. 刪除好物文件本身
    const shareRef = doc(db, 'shares', itemId)
    batch.delete(shareRef)

    // 2. 搜尋並刪除所有相關的 applications 申請文件
    const appsSnap = await getDocs(query(
      collection(db, 'applications'),
      where('itemId', '==', itemId)
    ))
    appsSnap.forEach(appDoc => {
      batch.delete(doc(db, 'applications', appDoc.id))
    })

    // 3. 提交 Firestore 批次操作
    await batch.commit()

    // 4. 若有 Google Drive 圖檔，發送請求給 GAS 進行空間回收
    if (imageUrl && imageUrl.includes('lh3.googleusercontent.com/d/')) {
      const parts = imageUrl.split('/')
      const fileId = parts[parts.length - 1]
      const uploadUrl = import.meta.env.VITE_GAS_UPLOAD_URL
      if (uploadUrl && fileId) {
        fetch(uploadUrl, {
          method: 'POST',
          mode: 'cors',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8'
          },
          body: JSON.stringify({
            image: '',
            name: '',
            oldFileId: fileId
          })
        }).then(response => response.json())
          .then(res => {
            console.log('GAS Drive 圖片刪除回應:', res)
          })
          .catch(err => {
            console.error('呼叫 GAS 刪除圖片失敗:', err)
          })
      }
    }

    showToast('寶物及申請紀錄已成功刪除！')
    
    // 5. 重置選擇，讓 watch filteredItems 自動選中新列表的第一個
    selectedItem.value = null
    giverPassword.value = ''
    showMobileDetail.value = false
    closeShareModal()
  } catch (err) {
    console.error('刪除寶物失敗:', err)
    alert(`刪除失敗: ${err.message}`)
  } finally {
    isSubmitting.value = false
  }
}

// --- 共用歷史紀錄頁面 (已完成) ---
const openHistoryModal = () => {
  showHistoryModal.value = true
  historyPage.value = 1
  historyPageCursors = []
  loadHistoryPage(1)
}

// 模擬運行 GAS 自動結案排程 (7天超時，測試上降為1分鐘超時，方便手動演示)
const simulateGasCronJob = async () => {
  const now = Date.now()
  let updatedCount = 0
  const batch = writeBatch(db)
  
  // 檢索所有「交易中(已指定對象)」的道具
  for (const item of items.value) {
    if (item.status === '交易中' && item.claimTime) {
      const elapsedMs = now - item.claimTime
      const TEST_TIMEOUT = 60 * 1000 // 1分鐘超時，方便手動演示
      
      if (elapsedMs >= TEST_TIMEOUT) {
        const shareRef = doc(db, 'shares', item.id)
        batch.update(shareRef, {
          status: '已完成',
          completeTime: now,
          updatedAt: now
        })
        
        // 連帶將對應的「確認中」申請改為 已完成
        try {
          const appsSnap = await getDocs(query(
            collection(db, 'applications'),
            where('itemId', '==', item.id),
            where('status', '==', '確認中')
          ))
          appsSnap.forEach(appDoc => {
            const appRef = doc(db, 'applications', appDoc.id)
            batch.update(appRef, {
              status: '已完成',
              completeTime: now
            })
          })
        } catch (err) {
          console.error(`獲取項目 ${item.id} 的申請單失敗:`, err)
        }
        updatedCount++
      }
    }
  }

  if (updatedCount > 0) {
    try {
      await batch.commit()
      historyPage.value = 1
      showToast(`實體模擬成功！已將 ${updatedCount} 個超時的交易案件變更為已完成狀態。`)
    } catch (err) {
      console.error('實體模擬結案失敗:', err)
      alert(`操作失敗: ${err.message}`)
    }
  } else {
    alert('模擬檢索完畢：目前沒有超時未確認的交易案件。')
  }
}

// 輔助時間轉換 24 小時制
const formatTime = (unixMs) => {
  if (!unixMs) return ''
  const d = new Date(unixMs)
  const YYYY = d.getFullYear()
  const MM = String(d.getMonth() + 1).padStart(2, '0')
  const DD = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${YYYY}/${MM}/${DD} ${hh}:${mm}`
}
</script>

<style scoped>
.share-page {
  animation: fadeIn 0.4s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 25px;
  gap: 20px;
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
  gap: 16px;
}

.filter-controls {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.select-label {
  font-size: 0.9rem;
  color: var(--text-muted);
  font-weight: 700;
}

.type-select {
  background: rgba(8, 9, 13, 0.6);
  border: 1px solid rgba(255,255,255,0.1);
  color: #fff;
  padding: 8px 16px;
  border-radius: 6px;
  outline: none;
  font-weight: 700;
  cursor: url('/assets/ran2-cursor.cur'), pointer;
}

.search-input {
  background: rgba(8, 9, 13, 0.6);
  border: 1px solid rgba(255,255,255,0.1);
  color: #fff;
  padding: 8px 12px;
  border-radius: 6px;
  outline: none;
  font-size: 0.9rem;
  width: 200px;
}
.search-input:focus, .type-select:focus {
  border-color: var(--color-qigong);
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
}

.create-share-btn {
  background: rgba(0, 255, 102, 0.1);
  color: #fff;
  border: 1px solid var(--color-qigong);
  padding: 8px 20px;
  border-radius: 6px;
  font-weight: 700;
  font-size: 0.9rem;
  cursor: url('/assets/ran2-cursor.cur'), pointer;
  transition: all 0.3s;
  white-space: nowrap;
}

.create-share-btn:hover {
  background: var(--color-qigong);
  color: #000;
  box-shadow: var(--glow-qigong);
  transform: translateY(-2px);
}

.help-btn {
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-muted);
  border: 1px solid rgba(255,255,255,0.1);
  padding: 8px 16px;
  border-radius: 6px;
  font-weight: 700;
  font-size: 0.9rem;
  cursor: url('/assets/ran2-cursor.cur'), pointer;
  transition: all 0.3s;
  white-space: nowrap;
}
.mobile-filter-toggle {
  display: none;
}
.help-btn:hover {
  background: rgba(255,255,255,0.1);
  color: #fff;
}

/* 佈局 */
.share-layout {
  display: grid;
  grid-template-columns: 360px 1fr;
  gap: 30px;
  align-items: start;
}

.items-list-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 60px 30px;
  margin: 30px auto;
  max-width: 600px;
  animation: fadeIn 0.4s ease-out;
}

.empty-state-icon {
  font-size: 3.5rem;
  margin-bottom: 16px;
  animation: floatIcon 3s ease-in-out infinite;
}

.empty-state-title {
  font-size: 1.5rem;
  font-weight: 800;
  margin-bottom: 12px;
}

.empty-state-desc {
  color: var(--text-muted);
  font-size: 0.95rem;
  line-height: 1.6;
  max-width: 480px;
  margin-bottom: 20px;
}

@keyframes floatIcon {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

.item-card {
  display: flex;
  gap: 16px;
  align-items: center;
  padding: 16px;
  cursor: url('/assets/ran2-cursor.cur'), pointer;
  border-left: 4px solid transparent;
  transition: all 0.25s;
}

.item-card:hover {
  border-left: 4px solid rgba(0, 255, 102, 0.4);
  background: rgba(255,255,255,0.01);
}

.item-card.active-item {
  border-color: var(--color-qigong);
  background: var(--bg-card-hover) !important;
  box-shadow: 0 0 15px rgba(0, 255, 102, 0.15);
}

.item-card.trading-item {
  border-left-style: dashed;
}

.item-card-img-wrapper {
  width: 60px;
  height: 60px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,0.1);
  background: #000;
  flex-shrink: 0;
}

.item-card-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.item-card-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.item-card-name {
  font-size: 1rem;
  font-weight: 700;
  color: #fff;
}

.item-card-server-badge {
  font-size: 0.75rem;
  color: var(--color-qigong);
  font-weight: 700;
}

.card-status-badge {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 3px;
  width: fit-content;
}
.card-status-badge.sharing {
  background: rgba(0,255,102,0.1);
  color: var(--color-qigong);
}
.card-status-badge.trading {
  background: rgba(255,165,0,0.1);
  color: orange;
}

.item-card-giver {
  font-size: 0.8rem;
  color: var(--text-muted);
}

/* 右側詳細 */
.item-detail-panel {
  padding: 30px;
  min-height: 500px;
}

.detail-header {
  display: flex;
  align-items: center;
}

.detail-image-box {
  width: 120px;
  height: 120px;
  border-radius: 12px;
  overflow: hidden;
  border: 2px solid rgba(255,255,255,0.15);
  background: #000;
  margin-right: 24px;
  box-shadow: 0 5px 15px rgba(0,0,0,0.5);
  flex-shrink: 0;
}

.detail-item-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.detail-main-info {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.detail-item-name {
  font-size: 1.8rem;
  font-weight: 900;
}

.detail-badge-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.detail-badge-item {
  font-size: 0.75rem;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1);
  color: var(--text-muted);
  padding: 4px 10px;
  border-radius: 4px;
  font-weight: 700;
}
.detail-badge-item.active-count {
  border-color: rgba(0,255,102,0.3);
  color: var(--color-qigong);
}

.giver-info {
  font-size: 0.95rem;
  color: var(--text-muted);
}

.status-alert-box {
  display: flex;
  gap: 10px;
  align-items: center;
  background: rgba(255,165,0,0.1);
  padding: 12px 18px;
  border-radius: 6px;
  margin-top: 20px;
  border: 1px solid rgba(255,165,0,0.2);
}
.alert-text {
  font-size: 0.9rem;
  color: #ffb84d;
}

.divider {
  border: 0;
  height: 1px;
  background: linear-gradient(90deg, rgba(255,255,255,0.1), transparent);
  margin: 20px 0;
}

.detail-section {
  margin-bottom: 24px;
}

.section-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-main);
  margin-bottom: 12px;
  border-left: 3px solid var(--color-qigong);
  padding-left: 8px;
}

/* 屬性清單 */
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
  background: rgba(255,255,255,0.02);
  padding: 8px 14px;
  border-radius: 6px;
  border: 1px solid rgba(255,255,255,0.03);
}

.stat-bullet {
  color: var(--color-qigong);
  font-size: 0.9rem;
}

.stat-text {
  font-size: 0.9rem;
  font-weight: 600;
}

.giver-notes {
  font-style: italic;
  font-size: 0.9rem;
  color: var(--text-muted);
  background: rgba(0, 255, 102, 0.02);
  padding: 12px 18px;
  border-radius: 6px;
  border-left: 3px solid rgba(0, 255, 102, 0.2);
}

/* 申請按鈕 */
.detail-actions {
  margin-top: 30px;
}

.apply-item-btn {
  width: 100%;
  background: linear-gradient(135deg, rgba(0, 255, 102, 0.2) 0%, rgba(0, 255, 102, 0.05) 100%);
  border: 1px solid var(--color-qigong);
  color: #fff;
  font-weight: 800;
  font-size: 1.1rem;
  letter-spacing: 2px;
  padding: 14px;
  border-radius: 8px;
  box-shadow: var(--glow-qigong);
  cursor: url('/assets/ran2-cursor.cur'), pointer;
  transition: all 0.3s ease;
}

.apply-item-btn:hover:not(.disabled) {
  background: var(--color-qigong);
  color: #000;
  box-shadow: 0 0 25px rgba(0, 255, 102, 0.6);
  transform: translateY(-2px);
}

.apply-item-btn.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: rgba(255,255,255,0.05);
  border-color: rgba(255,255,255,0.1);
  box-shadow: none;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0,0,0,0.85);
  backdrop-filter: blur(5px);
  z-index: 1000;
  display: flex;
  justify-content: center;
  align-items: center;
}

.modal-content {
  width: 500px;
  max-width: 90%;
  padding: 30px;
  background: #0d0f17;
  animation: scaleUp 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  border-radius: 8px;
  max-height: 90vh;
  overflow-y: auto;
}

.text-center {
  text-align: center;
}

.success-icon {
  font-size: 3.5rem;
  margin-bottom: 16px;
}

.success-desc {
  font-size: 0.95rem;
  color: var(--text-muted);
  line-height: 1.6;
  margin-bottom: 24px;
}

/* 表單 */
.form-group {
  margin-bottom: 18px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-group label {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-muted);
}

.form-group input, .form-group select, .form-group textarea {
  background: rgba(8, 9, 13, 0.8);
  border: 1px solid rgba(255,255,255,0.1);
  padding: 10px 14px;
  border-radius: 6px;
  color: #fff;
  outline: none;
  font-size: 0.9rem;
}

.form-group input:focus, .form-group select:focus, .form-group textarea:focus {
  border-color: var(--color-qigong);
}

.modal-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 14px;
  margin-top: 24px;
}

.modal-btn {
  padding: 10px 24px;
  border-radius: 6px;
  font-weight: 700;
  font-size: 0.9rem;
  cursor: url('/assets/ran2-cursor.cur'), pointer;
  transition: all 0.25s;
}

.modal-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.modal-btn.cancel {
  background: transparent;
  border: 1px solid rgba(255,255,255,0.1);
  color: var(--text-muted);
}

.modal-btn.cancel:hover:not(:disabled) {
  color: #fff;
  background: rgba(255,255,255,0.05);
}

.modal-btn.confirm {
  background: rgba(0, 255, 102, 0.2);
  border: 1px solid var(--color-qigong);
  color: #fff;
}

.modal-btn.confirm:hover:not(:disabled) {
  background: var(--color-qigong);
  color: #000;
  box-shadow: var(--glow-qigong);
}

/* Tabs */
.help-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  padding-bottom: 10px;
}
.help-tab-btn {
  background: rgba(255,255,255,0.01);
  border: 1px solid rgba(255,255,255,0.05);
  color: var(--text-muted);
  font-weight: 700;
  font-size: 0.85rem;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: url('/assets/ran2-cursor.cur'), pointer;
  transition: all 0.3s;
}
.help-tab-btn:hover {
  color: #fff;
  background: rgba(255,255,255,0.05);
}
.help-tab-btn.active {
  color: var(--color-qigong);
  background: rgba(0,255,102,0.1);
  border-color: var(--color-qigong);
  box-shadow: 0 0 8px rgba(0,255,102,0.15);
}
.fade-in-tab {
  animation: fadeInTab 0.35s ease-out;
}
@keyframes fadeInTab {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

.history-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 400px;
  overflow-y: auto;
}

/* 響應式手機版 */
@media (max-width: 900px) {
  .share-layout {
    grid-template-columns: 1fr;
  }

  .item-detail-panel {
    display: none; /* 手機版隱藏右邊面板，使用 drawer */
  }

  .action-bar {
    flex-direction: column;
    align-items: stretch;
    gap: 14px;
    padding: 15px;
  }

  .mobile-filter-toggle {
    display: block !important;
    width: 100%;
    text-align: center;
  }

  .filter-controls {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .filter-controls.mobile-hidden {
    display: none !important;
  }

  .page-header {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .help-btn {
    width: 100%;
    text-align: center;
  }
  .header-actions {
    flex-direction: column;
    width: 100%;
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
    max-height: 85vh;
    border-radius: 20px 20px 0 0;
    background: #0d0f17;
    border-top: 2px solid var(--color-qigong);
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

.spinner {
  border: 4px solid rgba(255, 255, 255, 0.1);
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border-left-color: var(--color-qigong);
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Toast Message */
.toast-message {
  position: fixed;
  bottom: 40px;
  right: 40px;
  padding: 16px 24px;
  z-index: 2000;
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

/* Submitting Loading Overlay */
.submitting-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(8, 9, 13, 0.9);
  backdrop-filter: blur(8px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 10;
  border-radius: 8px;
}
.loader-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(0, 255, 102, 0.1);
  border-top: 4px solid var(--color-qigong);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 12px;
}
.loader-text {
  color: var(--color-qigong);
  font-size: 0.95rem;
  font-weight: 700;
  text-shadow: var(--glow-qigong);
}
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
