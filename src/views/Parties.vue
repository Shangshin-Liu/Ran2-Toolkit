<template>
  <div class="parties-page">
    <div class="page-header">
      <div class="header-left">
        <h2 class="neon-text-warrior">⚔️ 練功團佈告欄</h2>
        <p class="subtitle">大老帶路、隊友招募！加入練功團，組隊升級效率加倍</p>
      </div>
      <div class="header-actions" style="display: flex; gap: 10px; align-items: center;">
        <button 
          class="help-btn"
          @click="showHelpModal = true"
          title="佈告欄使用須知與通知排解"
        >
          ❓ 佈告欄使用須知
        </button>
        <button 
          class="help-btn"
          @click="openHistoryModal"
          title="查看已關閉及已結束的歷史招募"
        >
          📜 歷史紀錄
        </button>
      </div>
    </div>

    <!-- 頂部操作欄：篩選與發起招募 -->
    <div class="action-bar glass-card">
      <button class="mobile-filter-toggle" @click="isMobileFiltersExpanded = !isMobileFiltersExpanded">
        {{ isMobileFiltersExpanded ? '收起篩選' : '🔍 展開篩選' }}
      </button>

      <div class="filter-controls" :class="{ 'expanded': isMobileFiltersExpanded }">
        <label class="select-label">選擇伺服器:</label>
        <select v-model="selectedServer" class="server-select">
          <option value="全部">全部伺服器</option>
          <option v-for="s in SERVERS" :key="s" :value="s">{{ s }}</option>
        </select>

        <label class="select-label">練功地點:</label>
        <select v-model="selectedLocation" class="server-select">
          <option value="全部">全部地點</option>
          <option v-for="loc in LOCATIONS" :key="loc" :value="loc">{{ loc }}</option>
        </select>
        <div class="search-box">
          <input type="text" v-model="searchQuery" @keyup.enter="executeSearch" class="search-input" />
          <button class="search-btn" @click="executeSearch" title="搜尋">🔍</button>
        </div>
      </div>
      
      <div class="action-buttons" style="display: flex; gap: 12px; align-items: center;">
        <button 
          class="global-subscribe-btn"
          :class="{ 'active': globalSubscribed }"
          @click="toggleGlobalSubscribe"
        >
          {{ globalSubscribed ? '🔕 取消全站通知' : '🔔 接收全站通知' }}
        </button>
        
        <button 
          class="create-party-btn neon-border-warrior" 
          :class="{ 'disabled': !isLoggedIn }"
          :disabled="!isLoggedIn"
          @click="isLoggedIn ? openCreateModal() : null"
          :title="!isLoggedIn ? '請先登入後使用' : ''"
        >
          ➕ 發起招募
        </button>
      </div>
    </div>

    <!-- 練功團卡片列表 -->
    <LoadingOverlay v-if="isInitialLoading" theme="warrior" message="拉拉拉~~~" />
    <LoadingOverlay v-if="isActionLoading" theme="warrior" :message="actionLoadingMessage" fullscreen />

    <div class="parties-grid" v-else-if="filteredParties.length > 0">
      <div 
        v-for="party in filteredParties" 
        :key="party.id" 
        class="party-card glass-card"
        :class="{ 'subscribed-card': isSubscribed(party) }"
      >
        <!-- 伺服器與狀態 -->
        <div class="party-meta">
          <div class="meta-left">
            <span class="server-badge">{{ party.server }}</span>
            <span class="status-badge" :class="getStatusClass(party.status)">
              {{ party.status }}
            </span>
          </div>
          <button v-if="(party.status === '招募中' || party.status === '進行中') && isLoggedIn && currentUser.codeHash === party.creatorHash" class="edit-icon-btn" @click="attemptEdit(party)" title="修改/關閉招募">⚙️</button>
        </div>

        <h3 class="party-title">{{ party.title }}</h3>
        
        <div class="party-info-list">
          <div class="info-item">
            <span class="info-icon">👤</span>
            <span class="info-text">發起人 ID: <strong class="neon-text-warrior">{{ party.leaderId }}</strong></span>
          </div>
          <div class="info-item">
            <span class="info-icon">📍</span>
            <span class="info-text">練功地點: <strong>{{ party.location === '其他' ? party.customLocation : party.location }}</strong></span>
          </div>
          <div class="info-item">
            <span class="info-icon">🕒</span>
            <span class="info-text">開始時間: <strong>{{ formatTime(party.startTime) }}</strong></span>
          </div>
          <div class="info-item">
            <span class="info-icon">⏳</span>
            <span class="info-text">預期結束時間: <strong>{{ formatTime(party.endTime) }}</strong></span>
          </div>
          <div class="info-item">
            <span class="info-icon">⏱️</span>
            <span class="info-text">預期總時數: <strong>{{ getDuration(party.startTime, party.endTime) }}</strong> 小時</span>
          </div>
          <div class="info-item">
            <span class="info-icon">🙋</span>
            <span class="info-text">目前跟團人數: <strong>{{ getMemberCount(party) }}</strong> 人</span>
          </div>
          <div class="info-item" v-if="party.status === '已結束' || party.status === '已關閉'">
            <span class="info-icon">📝</span>
            <span class="info-text">結束原因: <strong>{{ party.closeReason || '無' }}</strong></span>
          </div>
        </div>

        <div class="party-requirements">
          <h4 class="req-title">跟團要求：</h4>
          <ul class="req-list">
            <li v-for="(req, idx) in party.requirements" :key="idx">{{ req }}</li>
          </ul>
        </div>

        <!-- 跟團隊員 -->
        <div class="party-members-section" v-if="party.memberCharIds && party.memberCharIds.length > 0">
          <h4 class="req-title">當前成員：</h4>
          <div class="member-badges">
            <span v-for="mem in party.memberCharIds" :key="mem" class="member-badge">{{ mem }}</span>
          </div>
        </div>

        <!-- 互動按鈕：預約通知 -->
        <div class="party-actions" v-if="party.status === '招募中'">
          <button 
            class="subscribe-btn"
            :class="{ 'subscribed': isSubscribed(party), 'disabled': !isLoggedIn || (isLoggedIn && currentUser.codeHash === party.creatorHash) }"
            :disabled="!isLoggedIn || (isLoggedIn && currentUser.codeHash === party.creatorHash)"
            @click="toggleSubscribe(party)"
            :title="!isLoggedIn ? '請先登入後使用' : (currentUser.codeHash === party.creatorHash ? '您是此招募團的發起人，無法跟團' : '')"
          >
            <span class="bell-icon">{{ isSubscribed(party) ? '🔕' : '🔔' }}</span>
            {{ isSubscribed(party) ? '我這次先pass好了' : '我想參加這團' }}
          </button>
        </div>
        <div class="party-actions disabled-actions" v-else>
          <button class="subscribe-btn disabled" disabled>
            {{ party.status }}
          </button>
        </div>
      </div>
    </div>

    <!-- 空狀態提示 (Empty State) -->
    <div class="empty-state glass-card neon-border-warrior" v-else>
      <div class="empty-state-icon">⚔️</div>
      <h3 class="empty-state-title neon-text-warrior">目前沒有任何活躍招募</h3>
      <p class="empty-state-desc">
        當前沒有正在進行或招募中的練功團。你也可以查看右上角的 <strong>📜 歷史紀錄</strong>，或是點擊右上方 <strong>➕ 發起招募</strong> 來創建你的新隊伍！
      </p>
      <button 
        class="create-party-btn neon-border-warrior" 
        :class="{ 'disabled': !isLoggedIn }"
        :disabled="!isLoggedIn"
        @click="isLoggedIn ? openCreateModal() : null"
        style="margin-top: 15px;"
        :title="!isLoggedIn ? '請先登入後使用' : ''"
      >
        ➕ 發起招募
      </button>
    </div>

    <!-- 發起招募 / 修改 Modal -->
    <div class="modal-overlay" v-if="showCreateModal" @click="closeModal">
      <div class="modal-content glass-card neon-border-warrior" @click.stop>
        <h3 class="modal-title neon-text-warrior">⚔️ {{ isEditMode ? '修改/關閉 招募' : '發起練功招募' }}</h3>
        
        <div class="form-group">
          <label>招募標題</label>
          <input type="text" v-model="formData.title" />
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>發起人 ID</label>
            <input type="text" v-model="formData.leaderId" :disabled="true" />
          </div>
          <div class="form-group">
            <label>伺服器</label>
            <select v-model="formData.server" :disabled="true">
              <option v-for="s in SERVERS" :key="s" :value="s">{{ s }}</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>練功地點</label>
            <select v-model="formData.location">
              <option v-for="loc in LOCATIONS" :key="loc" :value="loc">{{ loc }}</option>
            </select>
          </div>
          <div class="form-group" v-if="formData.location === '其他'">
            <label>自訂練功地點 (最多50字)</label>
            <input type="text" v-model="formData.customLocation" maxlength="50" />
          </div>
        </div>

        <div class="form-group">
          <label>開始時間</label>
          <div class="time-picker-row">
            <input type="date" v-model="formData.startDate" @click="$event.target.showPicker && $event.target.showPicker()" class="date-input" />
            <select v-model="formData.startHour" class="time-select">
              <option v-for="h in HOURS" :key="h" :value="h">{{ h }} 時</option>
            </select>
            <select v-model="formData.startMinute" class="time-select">
              <option v-for="m in MINUTES" :key="m" :value="m">{{ m }} 分</option>
            </select>
          </div>
        </div>
        
        <div class="form-group">
          <label>預計結束時間</label>
          <div class="time-picker-row">
            <input type="date" v-model="formData.endDate" @click="$event.target.showPicker && $event.target.showPicker()" class="date-input" />
            <select v-model="formData.endHour" class="time-select">
              <option v-for="h in HOURS" :key="h" :value="h">{{ h }} 時</option>
            </select>
            <select v-model="formData.endMinute" class="time-select">
              <option v-for="m in MINUTES" :key="m" :value="m">{{ m }} 分</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label>跟團要求 (每行一條)</label>
          <textarea v-model="formData.reqText" rows="3"></textarea>
        </div>

        <!-- 編輯模式專屬欄位 -->
        <template v-if="isEditMode">
          <div class="form-row">
            <div class="form-group">
              <label>招募狀態</label>
              <select v-model="formData.status">
                <option v-for="st in STATUSES" :key="st" :value="st">{{ st }}</option>
              </select>
            </div>
            <div class="form-group" v-if="formData.status === '已關閉' || formData.status === '已結束'">
              <label>結束/關閉原因</label>
              <input type="text" v-model="formData.closeReason" />
            </div>
          </div>
        </template>

        <div class="modal-buttons" style="justify-content: space-between;">
          <div>
            <button v-if="isEditMode" class="modal-btn delete-btn" @click="deleteParty(formData.id)">🗑️ 刪除</button>
          </div>
          <div style="display: flex; gap: 14px;">
            <button class="modal-btn cancel" @click="closeModal">取消</button>
            <button class="modal-btn confirm neon-border-warrior" @click="saveParty">{{ isEditMode ? '儲存修改' : '發布招募' }}</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 佈告欄使用須知與說明 Modal -->
    <div class="modal-overlay" v-if="showHelpModal" @click="showHelpModal = false">
      <div class="modal-content glass-card help-modal-content neon-border-warrior" @click.stop>
        <h3 class="modal-title neon-text-warrior">🔔 佈告欄使用須知與說明</h3>
        
        <!-- Tab 頁籤切換 -->
        <div class="help-tabs">
          <button 
            class="help-tab-btn" 
            :class="{ 'active': activeHelpTab === 'etiquette' }" 
            @click="activeHelpTab = 'etiquette'"
          >
            🤝 遵守禮儀
          </button>
          <button 
            class="help-tab-btn" 
            :class="{ 'active': activeHelpTab === 'disclaimer' }" 
            @click="activeHelpTab = 'disclaimer'"
          >
            ⚖️ 免責聲明
          </button>
          <button 
            class="help-tab-btn" 
            :class="{ 'active': activeHelpTab === 'troubleshoot' }" 
            @click="activeHelpTab = 'troubleshoot'"
          >
            🔧 通知排解
          </button>
        </div>

        <div class="help-content-wrapper" style="min-height: 250px;">
          <!-- 1. 遵守禮儀 -->
          <div v-if="activeHelpTab === 'etiquette'" class="help-tab-content fade-in-tab">
            <ul class="etiquette-list" style="list-style-type: none; padding-left: 0; margin: 0;">
              <li style="margin-bottom: 14px; border-bottom: 1px solid rgba(255,255,255,0.03); padding-bottom: 10px;">
                <strong style="color: #fff; font-size: 0.95rem; display: block; margin-bottom: 4px;">1. 互相尊重、心懷感激</strong>
                <span style="color: var(--text-muted); font-size: 0.88rem; line-height: 1.5; display: block;">有大大願意帶團是自發願意的，跟一次且珍惜一次，跟團的玩家不應要求帶團者該做多少事情。</span>
              </li>
              <li style="margin-bottom: 14px; border-bottom: 1px solid rgba(255,255,255,0.03); padding-bottom: 10px;">
                <strong style="color: #fff; font-size: 0.95rem; display: block; margin-bottom: 4px;">2. 誠信負責、關閉招募</strong>
                <span style="color: var(--text-muted); font-size: 0.88rem; line-height: 1.5; display: block;">發起招募活動後應對活動內容負責，時間約好就該說到做到，不可無故放鴿子，系統有提供關團及刪除的功能哦。</span>
              </li>
              <li style="margin-bottom: 14px; border-bottom: 1px solid rgba(255,255,255,0.03); padding-bottom: 10px;">
                <strong style="color: #fff; font-size: 0.95rem; display: block; margin-bottom: 4px;">3. 合理規範、拒絕無理要求</strong>
                <span style="color: var(--text-muted); font-size: 0.88rem; line-height: 1.5; display: block;">帶團者很辛苦但不應把自身的辛勞轉嫁到跟團的人身上，例如: 要求跟團者一人支付1000萬之類的。</span>
              </li>
              <li style="margin-bottom: 14px; border-bottom: 1px solid rgba(255,255,255,0.03); padding-bottom: 10px;">
                <strong style="color: #fff; font-size: 0.95rem; display: block; margin-bottom: 4px;">4. 自由參團、尊重隊長分配</strong>
                <span style="color: var(--text-muted); font-size: 0.88rem; line-height: 1.5; display: block;">帶團者如何設定道具掉落、金錢拾取都是帶團者可以控制的，跟團者可根據自身意願決定是否參團。</span>
              </li>
              <li style="margin-bottom: 14px; border-bottom: 1px solid rgba(255,255,255,0.03); padding-bottom: 10px;">
                <strong style="color: #fff; font-size: 0.95rem; display: block; margin-bottom: 4px;">5. 限制人數、提早預約聯絡</strong>
                <span style="color: var(--text-muted); font-size: 0.88rem; line-height: 1.5; display: block;">一個隊伍撇開隊長只能組 11 人，若時間到了發現該團沒位子可加入是無法避免的事情，有這份疑慮可以提早上線以密語的方式聯絡發起人。</span>
              </li>
              <li style="margin-bottom: 4px;">
                <strong style="color: #fff; font-size: 0.95rem; display: block; margin-bottom: 4px;">6. 如實填寫 ID</strong>
                <span style="color: var(--text-muted); font-size: 0.88rem; line-height: 1.5; display: block;">發起人 ID 請如實寫下遊戲內的角色名稱，如果角色名稱不便留下也請設定成你的其他角色名稱，方便跟團的人可以聯絡你。</span>
              </li>
            </ul>
          </div>

          <!-- 2. 免責聲明 -->
          <div v-if="activeHelpTab === 'disclaimer'" class="help-tab-content fade-in-tab">
            <ul class="disclaimer-list" style="list-style-type: none; padding-left: 0; margin: 0;">
              <li style="margin-bottom: 16px;">
                <strong style="color: var(--color-warrior); font-size: 0.95rem; display: block; margin-bottom: 4px;">1. 僅提供資訊媒合平台</strong>
                <span style="color: var(--text-muted); font-size: 0.88rem; line-height: 1.5; display: block;">本佈告欄僅提供《亂2 Online》玩家組隊、練功招募之資訊交流與媒合管道。玩家於遊戲內之所有行為（包含但不限於：跟團表現、中途離線/跳車、組隊分配爭議、惡意搶怪或言語衝突等），均屬玩家個人行為，本平台不負任何連帶及法律責任。</span>
              </li>
              <li style="margin-bottom: 16px;">
                <strong style="color: var(--color-warrior); font-size: 0.95rem; display: block; margin-bottom: 4px;">2. 資訊真實性與即時性</strong>
                <span style="color: var(--text-muted); font-size: 0.88rem; line-height: 1.5; display: block;">所有招募資訊均由玩家自行填寫與發布。本平台對招募內容之真實性、準確性及時效性不作任何保證。跟團前請自行評估風險，並於遊戲內與發起人進行最終確認。</span>
              </li>
              <li style="margin-bottom: 16px;">
                <strong style="color: var(--color-warrior); font-size: 0.95rem; display: block; margin-bottom: 4px;">3. 金鑰與編輯密碼保管</strong>
                <span style="color: var(--text-muted); font-size: 0.88rem; line-height: 1.5; display: block;">發起人發布招募時所設定之「編輯密碼」將進行加密處理，但請玩家自行妥善保管。因密碼洩漏、遺失或遭第三方猜測導致招募資訊被惡意修改或刪除，本平台概不負責。</span>
              </li>
              <li>
                <strong style="color: var(--color-warrior); font-size: 0.95rem; display: block; margin-bottom: 4px;">4. 服務中斷與通知延遲</strong>
                <span style="color: var(--text-muted); font-size: 0.88rem; line-height: 1.5; display: block;">本平台之網頁推播與桌面通知功能（包含 GAS 與 FCM 自動排程）可能因網路狀況、伺服器維護或不可抗力因素導致發送延遲、失敗或遺失。本平台不保證服務之絕對穩定性與不中斷。</span>
              </li>
            </ul>
          </div>

          <!-- 3. 通知排解 -->
          <div v-if="activeHelpTab === 'troubleshoot'" class="help-tab-content fade-in-tab">
            <p class="help-desc" style="margin-bottom: 18px; color: var(--text-muted); font-size: 0.92rem; line-height: 1.5;">
              如果您開啟了「接收全站通知」或訂閱了特定招募，但電腦卻無法彈出通知，請依序排查以下設定：
            </p>
            
            <div class="help-item" style="display: flex; gap: 12px; margin-bottom: 18px; align-items: flex-start;">
              <span class="help-icon" style="font-size: 1.2rem; filter: grayscale(1);">1️⃣</span>
              <div class="help-text" style="font-size: 0.9rem; line-height: 1.5;">
                <strong style="color: #fff; font-size: 0.95rem; display: block; margin-bottom: 4px;">瀏覽器安全連線 (Secure Context)</strong>
                <span style="color: var(--text-muted); font-size: 0.88rem;">瀏覽器規定只有在安全連線環境（HTTPS 加密）下，才允許啟用 Service Worker 與接收推播通知。請確認您的網址為 <code>https://</code>。若為一般的 <code>http://</code> 非安全連線，通知功能將被瀏覽器強制禁用。</span>
              </div>
            </div>

            <div class="help-item" style="display: flex; gap: 12px; margin-bottom: 18px; align-items: flex-start;">
              <span class="help-icon" style="font-size: 1.2rem; filter: grayscale(1);">2️⃣</span>
              <div class="help-text" style="font-size: 0.9rem; line-height: 1.5;">
                <strong style="color: #fff; font-size: 0.95rem; display: block; margin-bottom: 4px;">瀏覽器通知權限</strong>
                <span style="color: var(--text-muted); font-size: 0.88rem;">請點擊網址列左側的 <strong>鎖頭或驚嘆號圖示</strong>，確認「通知」權限已設定為 <strong>「允許」</strong>。</span>
              </div>
            </div>

            <div class="help-item" style="display: flex; gap: 12px; margin-bottom: 10px; align-items: flex-start;">
              <span class="help-icon" style="font-size: 1.2rem; filter: grayscale(1);">3️⃣</span>
              <div class="help-text" style="font-size: 0.9rem; line-height: 1.5;">
                <strong style="color: #fff; font-size: 0.95rem; display: block; margin-bottom: 4px;">Windows 系統通知與專注模式攔截</strong>
                <span style="color: var(--text-muted); display: block; margin-bottom: 6px; font-size: 0.88rem;"><strong>專注助理/專注模式</strong>：請確認 Windows 右下角系統列的「專注助理」或「專注模式」已關閉。若開啟，系統會將通知直接移至通知中心而不彈出桌面橫幅。</span>
                <span style="color: var(--text-muted); display: block; font-size: 0.88rem;"><strong>瀏覽器通知設定</strong>：進入 Windows 的「設定 ➔ 系統 ➔ 通知」，確認您的瀏覽器（Chrome/Edge/Firefox 等）通知已開啟，且允許顯示「通知橫幅」。</span>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-buttons" style="justify-content: center; margin-top: 24px;">
          <button class="modal-btn confirm neon-border-warrior" @click="showHelpModal = false">我知道了</button>
        </div>
      </div>
    </div>

    <!-- 歷史紀錄 Modal -->
    <div class="modal-overlay" v-if="showHistoryModal" @click="showHistoryModal = false">
      <div class="modal-content glass-card history-modal-content neon-border-warrior" @click.stop>
        <h3 class="modal-title neon-text-warrior">📜 歷史招募紀錄</h3>
        
        <div v-if="loadingHistory" class="history-loading">
          <div class="spinner" style="margin-top: 30px;"></div>
          <p style="text-align: center; color: var(--text-muted); font-size: 0.9rem;">正在加載歷史資料...</p>
        </div>

        <div v-else-if="historyParties.length === 0" class="history-empty" style="text-align: center; padding: 40px 20px;">
          <p style="color: var(--text-muted); font-size: 0.95rem;">⚠️ 目前尚無已關閉或已結束的招募紀錄。</p>
        </div>

        <div v-else class="history-list-wrapper">
          <div class="history-grid">
            <div 
              v-for="party in historyParties" 
              :key="party.id" 
              class="history-party-card glass-card"
            >
              <div class="party-meta" style="margin-bottom: 12px;">
                <div class="meta-left">
                  <span class="server-badge">{{ party.server }}</span>
                  <span class="status-badge closed">{{ party.status }}</span>
                </div>
              </div>

              <h4 class="history-party-title neon-text-warrior" style="font-size: 1.15rem; font-weight: 800; margin-bottom: 14px;">{{ party.title }}</h4>
              
              <div class="party-info-list" style="display: flex; flex-direction: column; gap: 8px;">
                <div class="info-item">
                  <span class="info-icon">👤</span>
                  <span class="info-text">發起人 ID: <strong class="neon-text-warrior">{{ party.leaderId }}</strong></span>
                </div>
                <div class="info-item">
                  <span class="info-icon">📍</span>
                  <span class="info-text">地點: <strong>{{ party.location === '其他' ? party.customLocation : party.location }}</strong></span>
                </div>
                <div class="info-item">
                  <span class="info-icon">🕒</span>
                  <span class="info-text">時間: <strong>{{ formatTime(party.startTime) }} ~ {{ formatTime(party.endTime) }}</strong></span>
                </div>
                <div class="info-item" v-if="party.closeReason">
                  <span class="info-icon">📝</span>
                  <span class="info-text">結束原因: <strong>{{ party.closeReason }}</strong></span>
                </div>
              </div>
            </div>
          </div>

          <!-- 分頁控制列 -->
          <div class="history-pagination" style="display: flex; justify-content: space-between; align-items: center; margin-top: 20px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 15px;">
            <button 
              class="modal-btn cancel" 
              :disabled="!hasPrevPage || loadingHistory"
              @click="fetchHistoryPrevPage"
              style="padding: 6px 14px; font-size: 0.85rem;"
            >
              ◀️ 上一頁
            </button>
            <span class="page-indicator" style="font-weight: 700; color: #fff; font-size: 0.9rem;">第 {{ currentPage }} 頁</span>
            <button 
              class="modal-btn confirm neon-border-warrior" 
              :disabled="!hasNextPage || loadingHistory"
              @click="fetchHistoryNextPage"
              style="padding: 6px 14px; font-size: 0.85rem;"
            >
              下一頁 ▶️
            </button>
          </div>
        </div>

        <div class="modal-buttons" style="justify-content: center; margin-top: 24px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 15px;">
          <button class="modal-btn cancel" @click="showHistoryModal = false">關閉</button>
        </div>
      </div>
    </div>

    <!-- Toast 訊息通知 -->
    <transition name="toast">
      <div class="toast-message glass-card neon-border-warrior" v-if="toastMsg">
        <span class="toast-icon">🔔</span>
        <span class="toast-text">{{ toastMsg }}</span>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import LoadingOverlay from '@/components/LoadingOverlay.vue'
import { db, messaging } from '@/firebase.js'
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  increment,
  setDoc,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore'
import { getToken, onMessage } from 'firebase/messaging'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth.js'

const router = useRouter()
const { currentUser, isLoggedIn } = useAuth()
const isFirstLoad = ref(true)
const isInitialLoading = ref(true)
const isActionLoading = ref(false)
const actionLoadingMessage = ref('處理中，請稍候...')

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))

// 瀏覽器桌面通知發送與點擊導向
const triggerNotification = (title, body, partyId) => {
  if ('Notification' in window && Notification.permission === 'granted') {
    const notification = new Notification(title, {
      body: body,
      icon: '/favicon.ico'
    })
    notification.onclick = () => {
      window.focus()
      if (partyId) {
        router.push({ name: 'PartyDetail', params: { id: partyId } })
      } else {
        router.push('/parties')
      }
    }
  } else {
    showToast(`${title}: ${body}`)
  }
}

// 取得 Unix Timestamp 轉換回 Date / Hour / Minute 的輔助函式
const parseUnixToDateFields = (unixMs) => {
  if (!unixMs) return { date: '', hour: '00', minute: '00' }
  const d = new Date(unixMs)
  const YYYY = d.getFullYear()
  const MM = String(d.getMonth()+1).padStart(2, '0')
  const DD = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return {
    date: `${YYYY}-${MM}-${DD}`,
    hour: hh,
    minute: mm
  }
}

// 組合 Date / Hour / Minute 回 Unix Timestamp
const compileToUnix = (dateStr, hourStr, minuteStr) => {
  if (!dateStr || !hourStr || !minuteStr) return 0
  const dateObj = new Date(`${dateStr}T${hourStr}:${minuteStr}:00`)
  return dateObj.getTime()
}

// 取得 FCM 推播 Token 輔助函式
const getFcmToken = async () => {
  try {
    if (!('Notification' in window)) {
      console.warn("此瀏覽器不支援桌面通知功能。")
      return null
    }
    
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      showToast("需要桌面通知權限才能接收開團提醒！")
      return null
    }

    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY
    })
    return token
  } catch (err) {
    console.error("取得 FCM Token 失敗：", err)
    return null
  }
}


const LOCATIONS = [
  '失落異界迴廊',
  '超自然研究中心3F', '超自然研究中心4F', '超自然研究中心5F', '超自然研究中心6F',
  '101大樓1F', '101大樓2F', '101大樓3F', '101大樓4F', '101大樓5F',
  '其他'
]

const SERVERS = ['新東京', '新大阪']
const STATUSES = ['招募中', '進行中', '已結束', '已關閉']

const selectedServer = ref('全部')
const selectedLocation = ref('全部')
const searchQuery = ref('')
const activeSearchQuery = ref('')

const globalSubscribed = ref(localStorage.getItem('ran2_global_subscribed') === 'true')
const isMobileFiltersExpanded = ref(false)

const toggleGlobalSubscribe = async () => {
  isActionLoading.value = true
  actionLoadingMessage.value = globalSubscribed.value ? '正在關閉全站通知...' : '正在開啟全站通知...'
  if (!globalSubscribed.value) {
    const token = await getFcmToken()
    if (!token) {
      isActionLoading.value = false
      return
    }
    
    try {
      await setDoc(doc(db, 'global_tokens', token), {
        token: token,
        createdAt: Date.now()
      })
      
      globalSubscribed.value = true
      localStorage.setItem('ran2_global_subscribed', 'true')
      localStorage.setItem('ran2_fcm_token', token)
      showToast('已開啟「接收全站招募通知」！有新團發起將主動通知您。')
    } catch (err) {
      console.error("訂閱全站通知失敗：", err)
      showToast("開啟失敗，請稍後再試！")
    } finally {
      isActionLoading.value = false
    }
  } else {
    const token = localStorage.getItem('ran2_fcm_token')
    try {
      if (token) {
        await deleteDoc(doc(db, 'global_tokens', token))
      }
      globalSubscribed.value = false
      localStorage.setItem('ran2_global_subscribed', 'false')
      showToast('已關閉全站招募通知。')
    } catch (err) {
      console.error("取消全站通知失敗：", err)
      showToast("關閉失敗，請稍後再試！")
    } finally {
      isActionLoading.value = false
    }
  }
}

const executeSearch = () => {
  activeSearchQuery.value = searchQuery.value
}

const showCreateModal = ref(false)
const showHelpModal = ref(false)
const activeHelpTab = ref('etiquette')

// 歷史紀錄狀態與分頁查詢
const showHistoryModal = ref(false)
const historyParties = ref([])
const loadingHistory = ref(false)
const currentPage = ref(1)
const hasNextPage = ref(false)
const hasPrevPage = ref(false)
const pageCursors = ref([]) // 記錄每一頁最後一個 Document 的 snapshot
const lastVisibleDoc = ref(null)

const fetchHistoryFirstPage = async () => {
  loadingHistory.value = true
  try {
    const q = query(
      collection(db, 'parties'),
      where('status', 'in', ['已關閉', '已結束']),
      orderBy('endTime', 'desc'),
      limit(10)
    )
    const snap = await getDocs(q)
    historyParties.value = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    lastVisibleDoc.value = snap.docs[snap.docs.length - 1] || null
    
    currentPage.value = 1
    pageCursors.value = [lastVisibleDoc.value]
    
    hasNextPage.value = snap.docs.length === 10
    hasPrevPage.value = false
  } catch (err) {
    console.error("載入歷史第一頁失敗：", err)
  } finally {
    loadingHistory.value = false
  }
}

const fetchHistoryNextPage = async () => {
  if (!lastVisibleDoc.value) return
  loadingHistory.value = true
  try {
    const q = query(
      collection(db, 'parties'),
      where('status', 'in', ['已關閉', '已結束']),
      orderBy('endTime', 'desc'),
      startAfter(lastVisibleDoc.value),
      limit(10)
    )
    const snap = await getDocs(q)
    if (snap.docs.length > 0) {
      historyParties.value = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      lastVisibleDoc.value = snap.docs[snap.docs.length - 1] || null
      
      currentPage.value++
      pageCursors.value.push(lastVisibleDoc.value)
      
      hasNextPage.value = snap.docs.length === 10
      hasPrevPage.value = true
    } else {
      hasNextPage.value = false
    }
  } catch (err) {
    console.error("載入歷史下一頁失敗：", err)
  } finally {
    loadingHistory.value = false
  }
}

const fetchHistoryPrevPage = async () => {
  if (currentPage.value <= 1) return
  if (currentPage.value === 2) {
    await fetchHistoryFirstPage()
    return
  }
  
  loadingHistory.value = true
  try {
    const targetCursor = pageCursors.value[currentPage.value - 3]
    const q = query(
      collection(db, 'parties'),
      where('status', 'in', ['已關閉', '已結束']),
      orderBy('endTime', 'desc'),
      startAfter(targetCursor),
      limit(10)
    )
    const snap = await getDocs(q)
    if (snap.docs.length > 0) {
      historyParties.value = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      lastVisibleDoc.value = snap.docs[snap.docs.length - 1] || null
      
      currentPage.value--
      pageCursors.value.pop()
      
      hasNextPage.value = true
      hasPrevPage.value = currentPage.value > 1
    }
  } catch (err) {
    console.error("載入歷史上一頁失敗：", err)
  } finally {
    loadingHistory.value = false
  }
}

const openHistoryModal = async () => {
  showHistoryModal.value = true
  await fetchHistoryFirstPage()
}

const isEditMode = ref(false)
const toastMsg = ref('')

const formData = ref({
  id: '',
  title: '',
  leaderId: '',
  server: '新東京',
  location: '失落異界迴廊',
  customLocation: '',
  startDate: '',
  startHour: '00',
  startMinute: '00',
  endDate: '',
  endHour: '00',
  endMinute: '00',
  reqText: '',
  password: '',
  status: '招募中',
  closeReason: ''
})

const parties = ref([])
const localSubscribedIds = ref(JSON.parse(localStorage.getItem('ran2_subscribed_party_ids') || '[]'))
const localNotified10minIds = ref([])

// 根據時間與當前狀態動態呈現最精確的狀態，避免資料庫頻繁寫入
const getEffectiveStatus = (party) => {
  const now = Date.now()
  if (party.status === '已關閉' || party.status === '已結束') return party.status
  if (now >= party.endTime) return '已結束'
  if (now >= party.startTime) return '進行中'
  return party.status // 招募中
}

const filteredParties = computed(() => {
  return parties.value.filter(p => {
    // 1. Server filter
    if (selectedServer.value !== '全部' && p.server !== selectedServer.value) return false
    
    // 2. Location filter
    const actualLocation = p.location === '其他' ? p.customLocation : p.location
    if (selectedLocation.value !== '全部' && p.location !== selectedLocation.value) return false

    // 3. Keyword fuzzy search
    if (activeSearchQuery.value) {
      const keyword = activeSearchQuery.value.toLowerCase()
      const matchTitle = p.title.toLowerCase().includes(keyword)
      const matchLeader = p.leaderId.toLowerCase().includes(keyword)
      const matchLoc = actualLocation.toLowerCase().includes(keyword)
      if (!matchTitle && !matchLeader && matchLoc === false) return false
    }

    return true
  }).map(p => {
    // 動態填入訂閱狀態與有效狀態
    return {
      ...p,
      subscribed: localSubscribedIds.value.includes(p.id),
      status: getEffectiveStatus(p)
    }
  })
})

const formatTime = (unixMs) => {
  if (!unixMs) return ''
  const d = new Date(unixMs)
  const YYYY = d.getFullYear()
  const MM = String(d.getMonth()+1).padStart(2, '0')
  const DD = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${YYYY}/${MM}/${DD} ${hh}:${mm}`
}

const formatTimeShort = (unixMs) => {
  if (!unixMs) return ''
  const d = new Date(unixMs)
  const MM = String(d.getMonth()+1).padStart(2, '0')
  const DD = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${MM}/${DD} ${hh}:${mm}`
}

const formatForInput = (unixMs) => {
  if (!unixMs) return ''
  const d = new Date(unixMs)
  const YYYY = d.getFullYear()
  const MM = String(d.getMonth()+1).padStart(2, '0')
  const DD = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${YYYY}-${MM}-${DD}T${hh}:${mm}`
}

const getDuration = (start, end) => {
  const hours = (end - start) / 3600000
  return Number.isInteger(hours) ? hours : hours.toFixed(2)
}

const getStatusClass = (status) => {
  if (status === '招募中') return 'recruiting'
  if (status === '進行中') return 'in-progress'
  if (status === '已結束' || status === '已關閉') return 'closed'
  return ''
}

const isSubscribed = (party) => {
  if (!isLoggedIn.value) return false
  return party.memberCharIds && party.memberCharIds.includes(currentUser.value.charId)
}

const getMemberCount = (party) => {
  return party.memberCharIds ? party.memberCharIds.length : (party.expectedCount || 0)
}

const toggleSubscribe = async (party) => {
  if (!isLoggedIn.value) {
    showToast('請先登入後再進行此操作！')
    return
  }

  // 伺服器校驗
  if (currentUser.value.server !== party.server) {
    alert(`伺服器不匹配！您的角色在「${currentUser.value.server}」，無法加入「${party.server}」的練功團。`)
    return
  }

  // 發起人不可跟團校驗
  const userHash = currentUser.value.codeHash
  if (currentUser.value.charId === party.leaderId || userHash === party.creatorHash) {
    alert('您是此招募團的發起人，無法參加自己發起的團！')
    return
  }

  const isSubbed = isSubscribed(party)
  const docRef = doc(db, 'parties', party.id)
  
  isActionLoading.value = true
  actionLoadingMessage.value = isSubbed ? '正在取消參加此團...' : '正在登記參加此團...'
  
  try {
    if (!isSubbed) {
      const token = await getFcmToken()
      if (!token) {
        isActionLoading.value = false
        return
      }
      
      const subId = `${token}_${party.id}`
      await setDoc(doc(db, 'party_subscriptions', subId), {
        token: token,
        partyId: party.id,
        createdAt: Date.now()
      })
      
      localSubscribedIds.value.push(party.id)
      localStorage.setItem('ran2_subscribed_party_ids', JSON.stringify(localSubscribedIds.value))
      await updateDoc(docRef, {
        memberCharIds: arrayUnion(currentUser.value.charId),
        expectedCount: increment(1)
      })
      showToast(`參加成功！開團前將通知您。`)
    } else {
      const token = localStorage.getItem('ran2_fcm_token') || await getFcmToken()
      if (token) {
        const subId = `${token}_${party.id}`
        await deleteDoc(doc(db, 'party_subscriptions', subId))
      }
      
      localSubscribedIds.value = localSubscribedIds.value.filter(id => id !== party.id)
      localStorage.setItem('ran2_subscribed_party_ids', JSON.stringify(localSubscribedIds.value))
      await updateDoc(docRef, {
        memberCharIds: arrayRemove(currentUser.value.charId),
        expectedCount: increment(-1)
      })
      showToast(`已取消參加。`)
    }
  } catch (err) {
    console.error("更新訂閱人數失敗：", err)
    showToast("操作失敗，請稍後再試！")
  } finally {
    isActionLoading.value = false
  }
}

const showToast = (msg) => {
  toastMsg.value = msg
  setTimeout(() => {
    toastMsg.value = ''
  }, 3000)
}

const openCreateModal = () => {
  isEditMode.value = false
  const now = new Date()
  const start = new Date(now.getTime() + 10 * 60000) // 預設 10 分鐘後
  const end = new Date(now.getTime() + 130 * 60000) // 預設 2 小時 10 分鐘後

  const startFields = parseUnixToDateFields(start.getTime())
  const endFields = parseUnixToDateFields(end.getTime())

  formData.value = {
    id: '',
    title: '',
    leaderId: currentUser.value ? currentUser.value.charId : '',
    server: currentUser.value ? currentUser.value.server : '新東京',
    location: '失落異界迴廊',
    customLocation: '',
    startDate: startFields.date,
    startHour: startFields.hour,
    startMinute: startFields.minute,
    endDate: endFields.date,
    endHour: endFields.hour,
    endMinute: endFields.minute,
    reqText: '',
    status: '招募中',
    closeReason: ''
  }
  showCreateModal.value = true
}

const attemptEdit = (party) => {
  isEditMode.value = true
  const startFields = parseUnixToDateFields(party.startTime)
  const endFields = parseUnixToDateFields(party.endTime)

  formData.value = {
    id: party.id,
    title: party.title,
    leaderId: party.leaderId,
    server: party.server,
    location: party.location,
    customLocation: party.customLocation || '',
    startDate: startFields.date,
    startHour: startFields.hour,
    startMinute: startFields.minute,
    endDate: endFields.date,
    endHour: endFields.hour,
    endMinute: endFields.minute,
    reqText: party.requirements.join('\n'),
    status: party.status,
    closeReason: party.closeReason || ''
  }
  showCreateModal.value = true
}

const saveParty = async () => {
  if (!formData.value.title || !formData.value.leaderId || !formData.value.startDate || !formData.value.endDate) {
    showToast('請填寫所有必要資訊！')
    return
  }
  
  const startMs = compileToUnix(formData.value.startDate, formData.value.startHour, formData.value.startMinute)
  const endMs = compileToUnix(formData.value.endDate, formData.value.endHour, formData.value.endMinute)
  
  if (startMs >= endMs) {
    showToast('結束時間必須晚於開始時間！')
    return
  }

  const reqs = formData.value.reqText
    ? formData.value.reqText.split('\n').filter(r => r.trim() !== '')
    : ['無特殊要求']

  isActionLoading.value = true
  actionLoadingMessage.value = isEditMode.value ? '正在儲存修改...' : '正在建立招募...'

  try {
    if (isEditMode.value) {
      const docRef = doc(db, 'parties', formData.value.id)
      const oldParty = parties.value.find(p => p.id === formData.value.id)
      if (oldParty) {
        const updatePayload = {
          title: formData.value.title,
          location: formData.value.location,
          customLocation: formData.value.customLocation || '',
          startTime: startMs,
          endTime: endMs,
          requirements: reqs,
          status: formData.value.status,
          closeReason: formData.value.closeReason || ''
        }
        
        // 如果時間有被往後改，且是未來的時間，重設通知標記為 false 以便重新通知
        if (oldParty.startTime !== startMs && startMs > Date.now()) {
          updatePayload.notified10min = false
        }
        
        await updateDoc(docRef, updatePayload)
        
        // 模擬單一招募通知（如果已訂閱且資訊變更）
        const locChanged = oldParty.location !== formData.value.location || oldParty.customLocation !== formData.value.customLocation
        const timeChanged = oldParty.startTime !== startMs || oldParty.endTime !== endMs
        const statusChanged = oldParty.status !== formData.value.status
        const isSubscribedParty = localSubscribedIds.value.includes(oldParty.id)
        
        if (isSubscribedParty && (locChanged || timeChanged || statusChanged)) {
          console.log(`%c【單一招募通知】%c ${oldParty.leaderId}變更了「${oldParty.title}」的招募資訊，趕快確認看看是否會造成影響`, 'background: #00e5ff; color: #000; padding: 2px 6px; border-radius: 4px;', 'color: #00e5ff; font-weight: bold;')
        }
        showToast('招募修改成功！')
      }
    } else {
      const hash = currentUser.value.codeHash
      const newParty = {
        title: formData.value.title,
        leaderId: formData.value.leaderId,
        server: formData.value.server,
        location: formData.value.location,
        customLocation: formData.value.customLocation || '',
        startTime: startMs,
        endTime: endMs,
        requirements: reqs,
        creatorHash: hash,
        memberCharIds: [],
        status: '招募中',
        closeReason: '',
        expectedCount: 0,
        createdAt: Date.now(),
        notified10min: false
      }
      
      await addDoc(collection(db, 'parties'), newParty)
      
      const actualLoc = formData.value.location === '其他' ? formData.value.customLocation : formData.value.location
      if (globalSubscribed.value) {
        console.log(`%c【全訂閱推播】%c ${formData.value.leaderId}於【${actualLoc}】發起了全新招募(時間: ${formatTimeShort(startMs)} ~ ${formatTimeShort(endMs)})`, 'background: #ff0055; color: #fff; padding: 2px 6px; border-radius: 4px;', 'color: #ff0055; font-weight: bold;')
      }
      showToast('招募發布成功！')
    }
    closeModal()
  } catch (err) {
    console.error("儲存招募失敗：", err)
    showToast("儲存失敗，請檢查資料庫連線！")
  } finally {
    isActionLoading.value = false
  }
}

const deleteParty = async (id) => {
  if (confirm("確定要刪除此招募嗎？此操作無法還原。")) {
    try {
      const p = parties.value.find(x => x.id === id)
      const isSubscribed = localSubscribedIds.value.includes(id)
      
      await deleteDoc(doc(db, 'parties', id))
      
      if (p && isSubscribed) {
        console.log(`%c【單一招募通知】%c ${p.leaderId}刪除了招募: ${p.title}`, 'background: #00e5ff; color: #000; padding: 2px 6px; border-radius: 4px;', 'color: #00e5ff; font-weight: bold;')
      }
      
      // 清除本地訂閱記錄
      if (isSubscribed) {
        localSubscribedIds.value = localSubscribedIds.value.filter(x => x !== id)
        localStorage.setItem('ran2_subscribed_party_ids', JSON.stringify(localSubscribedIds.value))
      }
      
      closeModal()
      showToast('招募已刪除！')
    } catch (err) {
      console.error("刪除招募失敗：", err)
      showToast("刪除失敗，請稍後再試！")
    }
  }
}

const closeModal = () => {
  showCreateModal.value = false
}

// 實時監聽與定時器排程
let unsubscribeParties = null
let schedulerTimer = null

onMounted(() => {
  const q = query(
    collection(db, 'parties'),
    where('status', 'in', ['招募中', '進行中']),
    orderBy('startTime', 'asc')
  )
  
  // 建立 Firestore 的實時監聽器，僅載入招募中與進行中之資料
  unsubscribeParties = onSnapshot(q, (snapshot) => {
    const list = []
    snapshot.forEach((doc) => {
      list.push({
        id: doc.id,
        ...doc.data()
      })
    })

    // 若不是第一次載入，比對變更以彈出桌面通知
    if (!isFirstLoad.value) {
      snapshot.docChanges().forEach((change) => {
        const partyData = change.doc.data()
        const partyId = change.doc.id
        
        if (change.type === 'added') {
          if (globalSubscribed.value && partyData.createdAt && (Date.now() - partyData.createdAt < 10000)) {
            const locName = partyData.location === '其他' ? partyData.customLocation : partyData.location
            triggerNotification(
              "⚔️ 全新招募發起",
              `${partyData.leaderId}於【${locName}】發起了全新招募(時間: ${formatTimeShort(partyData.startTime)} ~ ${formatTimeShort(partyData.endTime)})`,
              partyId
            )
          }
        }
        
        if (change.type === 'modified') {
          const isSub = localSubscribedIds.value.includes(partyId)
          if (isSub) {
            const oldParty = parties.value.find(p => p.id === partyId)
            if (oldParty) {
              const locChanged = oldParty.location !== partyData.location || oldParty.customLocation !== partyData.customLocation
              const timeChanged = oldParty.startTime !== partyData.startTime || oldParty.endTime !== partyData.endTime
              const statusChanged = oldParty.status !== partyData.status
              
              if (locChanged || timeChanged || statusChanged) {
                triggerNotification(
                  "⚙️ 招募資訊變更",
                  `${partyData.leaderId}變更了「${partyData.title}」的招募資訊，趕快確認看看是否會造成影響`,
                  partyId
                )
              }
            }
          }
        }
        
        if (change.type === 'removed') {
          const isSub = localSubscribedIds.value.includes(partyId)
          if (isSub) {
            const oldParty = parties.value.find(p => p.id === partyId)
            const leaderName = oldParty ? oldParty.leaderId : (partyData.leaderId || "發起人")
            const titleText = oldParty ? oldParty.title : (partyData.title || "練功團")
            
            if (partyData.status === '已關閉' || partyData.status === '已結束') {
              // 此 Document 屬性被修改（如關閉/結束）而不再匹配活躍 query，對 snapshot 而言被移出
              triggerNotification(
                "⚙️ 招募資訊變更",
                `${leaderName}變更了「${titleText}」的招募資訊，趕快確認看看是否會造成影響`,
                partyId
              )
            } else {
              // 真正的刪除
              triggerNotification(
                "🗑️ 招募已刪除",
                `${leaderName}刪除了招募: ${titleText}`
              )
            }
            localSubscribedIds.value = localSubscribedIds.value.filter(id => id !== partyId)
            localStorage.setItem('ran2_subscribed_party_ids', JSON.stringify(localSubscribedIds.value))
          }
        }
      })
    }
    
    parties.value = list
    isFirstLoad.value = false
    isInitialLoading.value = false
  }, (err) => {
    console.error("Firestore 監聽失敗：", err)
    isInitialLoading.value = false
  })

  // 前台推播監聽，收到 FCM 訊號後僅作日誌記錄（因 onSnapshot 與定時器已在前景即時彈出桌面通知，此處避免重複彈窗）
  onMessage(messaging, (payload) => {
    console.log('接收到前台推播訊息（已在前景，略過重複彈窗）：', payload)
  })

  // 每 10 秒檢查一次是否有即將開始的招募需要顯示通知
  schedulerTimer = setInterval(() => {
    const now = Date.now()
    parties.value.forEach(p => {
      const isSubscribed = localSubscribedIds.value.includes(p.id)
      const effectiveStatus = getEffectiveStatus(p)
      
      if (
        !localNotified10minIds.value.includes(p.id) &&
        effectiveStatus === '招募中' &&
        p.startTime > now &&
        (p.startTime - now <= 10 * 60 * 1000)
      ) {
        localNotified10minIds.value.push(p.id)
        if (isSubscribed) {
          const locName = p.location === '其他' ? p.customLocation : p.location
          triggerNotification(
            "⚔️ 練功準備出發！",
            `${p.leaderId}所發起的「${p.title}」即將於 10 分鐘內在【${locName}】開始！`,
            p.id
          )
        }
      }
    })
  }, 10000)
})

onUnmounted(() => {
  if (unsubscribeParties) unsubscribeParties()
  if (schedulerTimer) clearInterval(schedulerTimer)
})
</script>

<style scoped>
.parties-page {
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

.help-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  border-color: rgba(255,255,255,0.3);
}

.global-subscribe-btn {
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

.global-subscribe-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.global-subscribe-btn.active {
  background: rgba(0, 229, 255, 0.1);
  border-color: var(--color-snipper);
  color: var(--color-snipper);
  box-shadow: 0 0 10px rgba(0, 229, 255, 0.2);
}

.search-input {
  min-width: 200px;
}
.search-input:focus, .server-select:focus {
  border-color: var(--color-warrior);
}

.create-party-btn {
  background: rgba(255, 0, 85, 0.1);
  color: #fff;
  border: 1px solid var(--color-warrior);
  padding: 8px 20px;
  border-radius: 6px;
  font-weight: 700;
  font-size: 0.9rem;
  cursor: url('/assets/ran2-cursor.cur'), pointer;
  transition: all 0.3s;
  white-space: nowrap;
}

.create-party-btn:hover {
  background: var(--color-warrior);
  color: #000;
  box-shadow: var(--glow-warrior);
  transform: translateY(-2px);
}

/* 練功團卡片網格 */
.parties-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 24px;
}

.party-card {
  border-top: 3px solid rgba(255, 255, 255, 0.1);
  padding: 24px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 380px;
  transition: all 0.35s cubic-bezier(0.25, 0.8, 0.25, 1);
  position: relative;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 60px 20px;
  margin: 30px auto;
  animation: fadeIn 0.4s ease-out;
}

.empty-state-icon {
  font-size: 3rem;
  margin-bottom: 16px;
  animation: floatIcon 3s ease-in-out infinite;
}

.empty-state-title {
  font-size: 1.5rem;
  font-weight: 800;
  margin-bottom: 8px;
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

.party-card:hover {
  border-top-color: var(--color-warrior);
  box-shadow: 0 5px 20px rgba(255, 0, 85, 0.1);
}

.party-card.subscribed-card {
  border-color: var(--color-warrior);
  box-shadow: var(--glow-warrior);
  background: rgba(255, 0, 85, 0.03);
}

.party-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}
.meta-left {
  display: flex;
  gap: 8px;
  align-items: center;
}

.server-badge {
  background: rgba(255, 255, 255, 0.08);
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-muted);
}

.status-badge {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-muted);
}

.status-badge.recruiting {
  background: rgba(255, 0, 85, 0.15);
  color: var(--color-warrior);
}
.status-badge.in-progress {
  background: rgba(0, 255, 102, 0.15);
  color: var(--color-qigong);
}
.status-badge.closed {
  background: rgba(255, 255, 255, 0.1);
  color: #888;
}

.edit-icon-btn {
  background: none;
  border: none;
  font-size: 1.1rem;
  cursor: url('/assets/ran2-cursor.cur'), pointer;
  opacity: 0.6;
  transition: opacity 0.2s;
}
.edit-icon-btn:hover {
  opacity: 1;
}

.party-title {
  font-size: 1.25rem;
  font-weight: 800;
  margin-bottom: 18px;
  line-height: 1.4;
}

.party-info-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
}

.info-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 0.9rem;
  color: var(--text-muted);
}

.info-icon {
  font-size: 1.1rem;
}

.party-requirements {
  background: rgba(255,255,255,0.02);
  padding: 12px;
  border-radius: 6px;
  border: 1px solid rgba(255,255,255,0.03);
  margin-bottom: 20px;
}

.req-title {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-main);
  margin-bottom: 6px;
}

.req-list {
  list-style-type: none;
  padding-left: 0;
  margin: 0;
}

.req-list li {
  font-size: 0.8rem;
  color: var(--text-muted);
  position: relative;
  padding-left: 12px;
  line-height: 1.5;
}

.req-list li::before {
  content: '•';
  color: var(--color-warrior);
  position: absolute;
  left: 0;
}

/* 互動訂閱按鈕 */
.subscribe-btn {
  width: 100%;
  padding: 12px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #fff;
  font-weight: 700;
  font-size: 0.95rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: url('/assets/ran2-cursor.cur'), pointer;
  transition: all 0.3s;
}

.subscribe-btn:hover:not(.disabled) {
  background: rgba(255, 0, 85, 0.1);
  border-color: var(--color-warrior);
  box-shadow: 0 0 10px rgba(255, 0, 85, 0.2);
}

.subscribe-btn.subscribed {
  background: var(--color-warrior);
  color: #000;
  border-color: var(--color-warrior);
  box-shadow: var(--glow-warrior);
}

.subscribe-btn.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: rgba(255,255,255,0.05);
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
  max-height: 90vh;
  overflow-y: auto;
}

.help-modal-content {
  width: 650px;
  max-width: 95%;
}

.history-modal-content {
  width: 700px;
  max-width: 95%;
}

.history-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  max-height: 50vh;
  overflow-y: auto;
  padding-right: 8px;
}

.history-party-card {
  border-top: 2px solid rgba(255, 255, 255, 0.05);
  padding: 16px !important;
  background: rgba(255, 255, 255, 0.01) !important;
  min-height: auto !important;
}

.history-party-card:hover {
  border-color: var(--color-warrior);
  box-shadow: 0 0 10px rgba(255, 0, 85, 0.1);
}

.help-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  padding-bottom: 10px;
}

.help-tab-btn {
  flex: 1;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  color: var(--text-muted);
  padding: 10px 12px;
  border-radius: 6px;
  font-weight: 700;
  font-size: 0.9rem;
  cursor: url('/assets/ran2-cursor.cur'), pointer;
  transition: all 0.3s;
  text-align: center;
}

.help-tab-btn:hover {
  background: rgba(255, 255, 255, 0.06);
  color: #fff;
}

.help-tab-btn.active {
  background: rgba(255, 0, 85, 0.1);
  border-color: var(--color-warrior);
  color: var(--color-warrior);
  box-shadow: 0 0 8px rgba(255, 0, 85, 0.2);
}

.fade-in-tab {
  animation: fadeInTab 0.35s ease-out;
}

@keyframes fadeInTab {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes scaleUp {
  from { transform: scale(0.9); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.modal-title {
  font-size: 1.4rem;
  font-weight: 800;
  margin-bottom: 20px;
  text-align: center;
}

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

.form-group input:disabled, .form-group select:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.form-group input:focus:not(:disabled), .form-group select:focus:not(:disabled), .form-group textarea:focus {
  border-color: var(--color-warrior);
}

.modal-buttons {
  display: flex;
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

.modal-btn.cancel {
  background: transparent;
  border: 1px solid rgba(255,255,255,0.1);
  color: var(--text-muted);
}

.modal-btn.cancel:hover {
  color: #fff;
  background: rgba(255,255,255,0.05);
}

.modal-btn.confirm {
  background: rgba(255, 0, 85, 0.2);
  border: 1px solid var(--color-warrior);
  color: #fff;
}

.modal-btn.confirm:hover {
  background: var(--color-warrior);
  color: #000;
  box-shadow: var(--glow-warrior);
}

.modal-btn.delete-btn {
  background: rgba(255,0,0,0.1);
  border: 1px solid red;
  color: #ff4d4d;
}
.modal-btn.delete-btn:hover {
  background: red;
  color: white;
  box-shadow: 0 0 10px rgba(255,0,0,0.5);
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
  box-shadow: var(--glow-warrior);
}

.toast-icon {
  font-size: 1.4rem;
}

.toast-text {
  font-weight: 700;
  font-size: 0.95rem;
}

.toast-enter-active, .toast-leave-active {
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}
.toast-enter-from, .toast-leave-to {
  transform: translateY(30px);
  opacity: 0;
}

/* 手機版篩選收合按鈕 (電腦版隱藏) */
.mobile-filter-toggle {
  display: none;
}

/* 響應式手機版 */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
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
  .action-buttons {
    flex-direction: column;
    width: 100%;
  }
  .help-btn, .global-subscribe-btn, .create-party-btn {
    width: 100%;
    text-align: center;
  }
  .parties-grid {
    grid-template-columns: 1fr;
  }
  .toast-message {
    left: 20px;
    right: 20px;
    bottom: 20px;
    justify-content: center;
  }
}

.time-picker-row {
  display: flex;
  gap: 8px;
}
.date-input {
  flex: 2;
}
.time-select {
  flex: 1;
  background: rgba(8, 9, 13, 0.8) !important;
  border: 1px solid rgba(255,255,255,0.1);
  padding: 10px;
  border-radius: 6px;
  color: #fff;
  outline: none;
  font-size: 0.9rem;
  cursor: pointer;
}
.time-select:focus {
  border-color: var(--color-warrior);
}

/* 統一身分新增樣式 */
.party-members-section {
  margin-top: 15px;
  padding: 10px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}
.member-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}
.member-badge {
  background: rgba(255, 0, 85, 0.1);
  border: 1px solid rgba(255, 0, 85, 0.3);
  color: #ff0055;
  padding: 3px 10px;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 700;
  text-shadow: 0 0 5px rgba(255, 0, 85, 0.3);
  box-shadow: 0 0 10px rgba(255, 0, 85, 0.1);
}

.create-party-btn.disabled,
.subscribe-btn.disabled {
  background: rgba(255, 255, 255, 0.03) !important;
  border-color: rgba(255, 255, 255, 0.08) !important;
  color: rgba(255, 255, 255, 0.15) !important;
  box-shadow: none !important;
  cursor: not-allowed !important;
  pointer-events: none;
}
</style>
