<template>
  <div class="share-page">
    <!-- 頂部頁籤與麵包屑導航 -->
    <div class="page-header">
      <div class="header-left">
        <h2 class="neon-text-qigong">🤝 好物交易市集</h2>
        <p class="subtitle">遊戲第三方交易資訊刊登平台。本站僅供刊登與交流，交易請於遊戲內自行進行。</p>
      </div>
      <div class="header-actions" style="display: flex; gap: 10px; align-items: center;">
        <button 
          class="help-btn"
          @click="showHelpModal = true"
          title="使用須知與免責聲明"
        >
          ❓ 使用須知
        </button>
        <button 
          class="help-btn fav-drawer-trigger"
          @click="showFavoriteDrawer = true"
          title="查看關注的收藏商品"
        >
          ♥ 收藏夾 <span class="fav-badge" v-if="myFavorites.length > 0">{{ myFavorites.length }}</span>
        </button>
        <button 
          class="help-btn"
          @click="openMyAppsModal"
          title="載入或切換身分識別碼"
        >
          👤 身分識別: {{ myUserId ? myUserId : '未載入' }}
        </button>
      </div>
    </div>

    <!-- 麵包屑導航列與手機版返回按鈕 -->
    <div class="breadcrumb-bar glass-card">
      <div class="breadcrumb-list">
        <span class="breadcrumb-item" @click="clickBreadcrumb(1)">全部商店</span>
        <span class="breadcrumb-separator" v-if="activeDepth >= 2">›</span>
        <span 
          class="breadcrumb-item" 
          v-if="activeDepth >= 2 && selectedShop" 
          @click="clickBreadcrumb(2)"
        >
          {{ selectedShop.shopName }}
        </span>
        <span class="breadcrumb-separator" v-if="activeDepth >= 3">›</span>
        <span 
          class="breadcrumb-item active-item-crumb" 
          v-if="activeDepth >= 3 && selectedItem"
        >
          {{ selectedItem.name }}
        </span>
      </div>
      <button 
        class="mobile-back-btn help-btn" 
        v-if="activeDepth > 1" 
        @click="goBack"
      >
        ‹ 返回
      </button>
    </div>

    <!-- 主版面：三欄 Miller Columns 容器 -->
    <div class="miller-columns-wrapper" :class="`depth-${activeDepth}`">
      
      <!-- 第一欄：商店清單 (level-1) -->
      <div class="miller-column level-1" :class="{ 'collapsed': activeDepth > 1, 'active': activeDepth === 1 }">
        <div class="column-header">
          <h3>🏪 商店清單</h3>
          <div class="shop-actions">
            <template v-if="isLoggedIn">
              <button 
                v-if="!myShop" 
                class="create-shop-btn neon-border-qigong" 
                @click="openCreateShop"
              >
                ✨ 建立我的商店
              </button>
            </template>
            <span v-else class="login-hint">請先登入後建立商店</span>
          </div>
        </div>

        <!-- 搜尋與篩選列 (伺服器限定新東京、新大阪) -->
        <div class="search-filter-box">
          <select v-model="selectedServer" class="type-select">
            <option value="新東京">新東京</option>
            <option value="新大阪">新大阪</option>
          </select>
          <div class="search-input-wrapper">
            <input 
              type="text" 
              v-model="searchQuery" 
              class="search-input" 
              @keyup.enter="triggerSearch"
              placeholder="搜尋商店或店主名稱..."
            />
            <button class="search-btn" @click="triggerSearch">🔍</button>
          </div>
        </div>

        <LoadingOverlay v-if="isInitialLoading" theme="qigong" message="讀取賣場中..." />
        
        <div class="shop-list-container">
          <template v-if="filteredShops.length > 0">
            <div 
              v-for="shop in filteredShops" 
              :key="shop.id" 
              class="shop-card glass-card"
              :class="{ 'active-card': selectedShop && selectedShop.id === shop.id }"
              @click="selectShop(shop)"
            >
              <div class="shop-card-main">
                <div class="shop-title-row">
                  <h4 class="shop-name">
                    {{ shop.shopName }}
                    <span class="my-shop-badge" v-if="isLoggedIn && shop.ownerId === currentUser.charId && shop.server === currentUser.server">
                      (我<span v-if="shop.status === '休息中'"> - 休</span>)
                    </span>
                  </h4>
                </div>
                <p class="shop-owner">店主: <span class="owner-name">{{ shop.ownerId }}</span></p>
                <div class="shop-meta-row">
                  <span class="shop-server">{{ shop.server }}</span>
                  <span class="shop-count">📦 商品: {{ shop.itemCount }} 件</span>
                </div>
              </div>
            </div>
            <!-- 底部防滾動切除 Spacer -->
            <div class="scroll-spacer"></div>
          </template>
          <!-- 找不到商店提示 (移入容器內，完美繼承左右邊距) -->
          <div class="empty-column-state glass-card" v-else>
            <p>🔍 找不到符合篩選條件的商店</p>
          </div>
        </div>
      </div>

      <!-- 第二欄：商品清單 (level-2) -->
      <div class="miller-column level-2" :class="{ 'hidden': activeDepth < 2, 'collapsed': activeDepth > 2, 'active': activeDepth === 2 }">
        
        <!-- 整合後的商店與賣家詳細資訊 (固定在頂部，支援摺疊) -->
        <div class="shop-seller-info-header sticky-header glass-card" v-if="selectedShop">
          <!-- 簡化收合按鈕 (規格：放在 .shop-seller-info-header sticky-header glass-card 框框內) -->
          <button class="close-column-btn inner-box-btn" @click="clickBreadcrumb(1)" title="收合商店">«</button>

          <!-- 商店主標題列 -->
          <div class="shop-header-title-row">
            <div class="title-with-status">
              <h3>📦 {{ selectedShop.shopName }}</h3>
              <span class="shop-status-text" :class="selectedShop.status === '營業中' ? 'open' : 'closed'">
                ({{ selectedShop.status }})
              </span>
            </div>
            <div class="toggle-info-box">
              <button class="collapse-toggle-btn" @click="isShopInfoCollapsed = !isShopInfoCollapsed">
                {{ isShopInfoCollapsed ? '🔽 顯示賣場公告' : '🔼 隱藏賣場公告' }}
              </button>
            </div>
          </div>

          <!-- 功能操作按鈕列 (店主露出，與編輯商品列表靠近) -->
          <div class="shop-control-bar">
            <button class="help-btn share-link-btn" @click="shareShopLink">
              🔗 分享商店
            </button>
            <template v-if="isShopOwner">
              <button class="help-btn manage-shop-btn" @click="manageMyShop">
                ⚙️ 管理商店
              </button>
              <button class="help-btn add-item-btn" @click="addNewItemToMyShop">
                ➕ 上架商品
              </button>
              <button 
                class="help-btn edit-list-toggle-btn"
                :class="{ 'editing-active': isEditingList }"
                @click="toggleEditList"
              >
                {{ isEditingList ? '💾 儲存修改' : '✏️ 編輯商品列表' }}
              </button>
              <button 
                v-if="isEditingList" 
                class="help-btn cancel-edit-list-btn"
                @click="cancelEditList"
              >
                ✕ 取消
              </button>
            </template>
          </div>

          <!-- 折疊區域：店家詳細資訊與公告 -->
          <transition name="collapse-fade">
            <div v-show="!isShopInfoCollapsed" class="collapsible-info-content">
              <div class="shop-details-grid">
                <div><strong>店主角色:</strong> <span class="owner-name">{{ selectedShop.ownerId }}</span></div>
                <div><strong>伺服器:</strong> {{ selectedShop.server }}</div>
                <div><strong>創立時間:</strong> {{ formatTime(selectedShop.createdAt) }}</div>
                <div><strong>最後更新:</strong> {{ formatTime(selectedShop.updatedAt) }}</div>
              </div>

              <!-- 商店公告 (支援換行條列式) -->
              <div class="shop-notice-bubble" v-if="shopNotices.length > 0">
                📢 <strong>商店公告:</strong>
                <ul class="notice-list">
                  <li v-for="(noticeLine, idx) in shopNotices" :key="idx">{{ noticeLine }}</li>
                </ul>
              </div>
            </div>
          </transition>

          <div class="drag-hint-text" v-if="isShopOwner && isEditingList">
            💡 提示：按住左側 ☰ 拖曳可重排順序；或直接修改列上「排序值」。
          </div>
        </div>

        <!-- 商品列表 (具有與第一層等大的 5 筆高度可視區，防滾動鏈) -->
        <!-- 商品列表 (具有與第一層等大的 5 筆高度可視區，防滾動鏈) -->
        <div class="item-list-container scrollable-list" v-if="selectedShop">
          <template v-if="shopItems.length > 0">
            <div 
              v-for="(item, index) in shopItems" 
              :key="item.id" 
              class="item-row skill-row-style glass-card"
              :class="{ 
                'active-row': selectedItem && selectedItem.id === item.id,
                'draggable-editing': isEditingList && isShopOwner && item.status === '刊登中',
                'sold-out-row': item.status === '已售出'
              }"
              :draggable="isEditingList && isShopOwner && item.status === '刊登中'"
              @dragstart="handleDragStart($event, index)"
              @dragover.prevent
              @drop="handleRowDrop($event, index)"
              @click="isEditingList ? null : selectItem(item)"
            >
              <div class="item-row-left">
                <!-- 拖曳圖示 (僅限刊登中商品與編輯模式) -->
                <span class="drag-handle-icon" v-if="isEditingList && isShopOwner && item.status === '刊登中'">☰</span>
                
                <!-- 編輯狀態與唯讀狀態切換 -->
                <div class="item-row-info" v-if="isEditingList && isShopOwner && item.status === '刊登中'">
                  <div class="inline-edit-group">
                    <input 
                      type="text" 
                      v-model="item.name" 
                      class="inline-input-name" 
                      placeholder="商品名稱" 
                    />
                    <!-- 排序值第二層修改輸入 -->
                    <div class="inline-sort-change">
                      <span class="inline-sort-label">排序:</span>
                      <input 
                        type="number" 
                        v-model.number="item.sortValue" 
                        class="inline-input-sort" 
                        min="1"
                        :max="activeItemsCount"
                        @change="updateItemSortValueDirectly(item, item.sortValue)"
                      />
                    </div>
                  </div>
                  <div class="item-req-line">
                    {{ item.statReq ? item.statReq.join(' / ') : '' }}
                  </div>
                </div>
                <div class="item-row-info" v-else>
                  <div class="item-name-line">
                    <span class="item-name">{{ item.name }}</span>
                    <span class="type-tag">{{ item.type }}</span>
                    <span class="sort-val-badge" v-if="item.status === '刊登中'">#{{ item.sortValue }}</span>
                    <span class="sold-badge" v-else>已售出</span>
                  </div>
                  <div class="item-req-line">
                    {{ item.statReq ? item.statReq.join(' / ') : '' }}
                  </div>
                </div>
              </div>
              
              <div class="item-row-right">
                <!-- 價格編輯或唯讀 -->
                <div class="inline-edit-price-wrapper" v-if="isEditingList && isShopOwner && item.status === '刊登中'">
                  <input 
                    type="number" 
                    v-model.number="item.price" 
                    class="inline-input-price" 
                    placeholder="價格" 
                  />
                  <span class="price-unit">金幣</span>
                </div>
                <div class="item-price" v-else>
                  <span class="price-val">{{ formatPrice(item.price) }}</span>
                  <span class="price-unit">金幣</span>
                </div>
                
                <!-- 收藏狀態按鈕 (持有者不可關注自己，已售出商品無法關注) -->
                <button 
                  v-if="!isMyItem(item) && item.status === '刊登中'" 
                  class="row-fav-btn" 
                  :class="{ 'faved': isFaved(item.id) }" 
                  @click.stop="toggleFavorite(item)"
                >
                  {{ isFaved(item.id) ? '♥' : '♡' }}
                </button>
              </div>
            </div>
            <!-- 底部防滾動切除 Spacer -->
            <div class="scroll-spacer"></div>
          </template>
          <!-- 商店無商品提示 (移入容器內，完美繼承左右邊距) -->
          <div class="empty-column-state glass-card" v-else>
            <p>📭 目前該商店沒有刊登中的商品</p>
          </div>
        </div>
      </div>

      <!-- 第三欄：商品詳情 (level-3) -->
      <div class="miller-column level-3" :class="{ 'hidden': activeDepth < 3, 'active': activeDepth === 3 }">
        
        <!-- 簡化收合按鈕 (置於第三層邊框內) -->
        <div class="column-header" v-if="selectedItem" style="position: relative;">
          <button class="close-column-btn inner-box-btn" @click="goBack" title="收合詳情">«</button>
          
          <h3>🔍 商品詳細內容</h3>
          <div style="display: flex; gap: 8px; margin-right: 35px;">
            <button class="help-btn share-link-btn" @click="shareItemLink">
              🔗 分享商品
            </button>
          </div>
        </div>

        <div class="detail-container scrollable-list" v-if="selectedItem">
          <!-- 過期警示 -->
          <div class="outdate-warning-box" v-if="isOutdated(selectedItem.updatedAt)">
            ⚠ 超過 7 天未更新，可能已售出
          </div>

          <div class="detail-header-panel">
            <div class="detail-img-box" @click="openLightbox(selectedItem.image)">
              <img :src="selectedItem.image || '/assets/share/no-image.png'" @error="handleImgError" />
              <div class="img-zoom-hint">🔍 點擊放大</div>
            </div>
            <div class="detail-main-meta">
              <div class="detail-title-line">
                <h2 class="detail-name neon-text-qigong">{{ selectedItem.name }}</h2>
                <span class="detail-status-badge" :class="selectedItem.status">
                  {{ selectedItem.status }}
                </span>
              </div>
              
              <!-- 排序值與關注數量 -->
              <div class="detail-badge-row">
                <span class="detail-badge">分類: {{ selectedItem.type }}</span>
                <span class="detail-badge fav-count">♥ 關注數: {{ selectedItem.favoriteCount }}</span>
                <span class="detail-badge" v-if="selectedItem.status === '刊登中'">商品排序: #{{ selectedItem.sortValue }}</span>
              </div>
              
              <div class="detail-price-box">
                <span class="price-label">預期售價:</span>
                <span class="price-amount">{{ formatPrice(selectedItem.price) }}</span>
                <span class="price-unit">金幣</span>
              </div>
              
              <div class="detail-fav-action" v-if="!isMyItem(selectedItem) && selectedItem.status === '刊登中'">
                <button 
                  class="fav-toggle-big-btn" 
                  :class="{ 'is-faved': isFaved(selectedItem.id) }"
                  @click="toggleFavorite(selectedItem)"
                >
                  {{ isFaved(selectedItem.id) ? '♥ 已加入關注' : '♡ 關注此商品' }}
                </button>
              </div>
            </div>
          </div>

          <hr class="divider" />

          <!-- 屬性要求 -->
          <div class="detail-section">
            <h4 class="section-title">🛡️ 裝備要求限制</h4>
            <ul class="stats-list">
              <li v-for="(req, idx) in selectedItem.statReq" :key="idx" class="stat-li">
                <span class="stat-bullet">📌</span>
                <span class="stat-text">{{ req }}</span>
              </li>
            </ul>
          </div>

          <!-- 屬性數值 -->
          <div class="detail-section">
            <h4 class="section-title">📊 道具素質屬性</h4>
            <ul class="stats-list">
              <li v-for="(stat, idx) in selectedItem.stats" :key="idx" class="stat-li">
                <span class="stat-bullet">✨</span>
                <span class="stat-text">{{ stat }}</span>
              </li>
            </ul>
          </div>

          <!-- 賣家備註 -->
          <div class="detail-section" v-if="selectedItem.notes">
            <h4 class="section-title">📝 賣家備註</h4>
            <p class="giver-notes">「 {{ selectedItem.notes }} 」</p>
          </div>

          <!-- 商店管理員後台操作區 -->
          <div 
            class="management-panel glass-card" 
            v-if="isShopOwner"
          >
            <h4 class="mgmt-title">⚙️ 賣家管理選單</h4>
            <div class="mgmt-btn-group">
              <button class="mgmt-btn" @click="editItem(selectedItem)">
                ✏️ 編輯商品
              </button>
              <button class="mgmt-btn danger" v-if="selectedItem.status === '刊登中'" @click="sellItem(selectedItem)">
                💰 標記為已售出 (下架)
              </button>
              <button class="mgmt-btn danger-outline" @click="deleteItem(selectedItem)">
                🗑️ 永久刪除
              </button>
            </div>
          </div>

        </div>
        <div class="empty-column-state glass-card" v-else>
          <p>👈 請點擊左側商品以檢視詳細內容</p>
        </div>
      </div>

    </div>

    <!-- 收藏夾側邊抽屜 -->
    <div class="favorite-drawer-overlay" v-if="showFavoriteDrawer" @click="showFavoriteDrawer = false">
      <div class="favorite-drawer glass-card" @click.stop>
        <div class="drawer-header">
          <h3>♥ 我的收藏夾</h3>
          <button class="close-drawer-btn" @click="showFavoriteDrawer = false">✕</button>
        </div>
        <div class="drawer-content">
          <div v-if="myFavorites.length === 0" class="empty-drawer">
            <span class="heart-icon">💔</span>
            <p>目前尚無收藏商品。在商品列表或詳情點選 ♥ 即可加入關注！</p>
          </div>
          <div v-else class="fav-list">
            <div 
              v-for="fav in myFavorites" 
              :key="fav.id" 
              class="fav-card glass-card"
              @click="clickFavoriteItem(fav)"
            >
              <div class="fav-card-header">
                <span class="fav-item-name">{{ fav.itemName }}</span>
                <button class="remove-fav-icon" @click.stop="removeFavoriteById(fav.itemId)">✕</button>
              </div>
              <div class="fav-card-meta">
                <span>所屬商店: {{ fav.shopName }}</span>
                <span>價格: {{ formatPrice(fav.price) }} 金幣</span>
              </div>
              <div class="fav-card-time" v-if="fav.exists">
                收藏於: {{ formatRelativeTime(fav.favoriteTime) }}
              </div>
              <div class="fav-card-time error" v-else style="color: #ff6b6b; font-weight: 700;">
                (商品已下架或不存在)
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 👤 登入與身分識別載入 Modal -->
    <div class="modal-overlay" v-if="showMyAppsModal" @click="showMyAppsModal = false">
      <div class="modal-content glass-card neon-border-qigong" @click.stop style="width: 450px;">
        <h3 class="modal-title neon-text-qigong">👤 玩家身分識別碼</h3>
        <p class="modal-hint-text">
          本平台與「角色登入系統」同步。若您已登入，將自動載入您的身分資訊。
        </p>

        <div v-if="isLoggedIn" class="logged-in-status">
          <p>✓ 已登入角色: <strong class="neon-text-qigong">{{ currentUser.charId }}</strong></p>
          <p>✓ 伺服器: <strong>{{ currentUser.server }}</strong></p>
          <p>✓ 識別碼: <code>{{ currentUser.code }}</code></p>
        </div>
        <div v-else class="not-logged-in-status">
          <p>⚠️ 您尚未登入！請使用網站頂欄的登入功能進行註冊或登入角色，以使用商店與收藏功能。</p>
        </div>

        <div class="modal-buttons" style="justify-content: center; margin-top: 25px;">
          <button class="modal-btn confirm neon-border-qigong" @click="showMyAppsModal = false">確定</button>
        </div>
      </div>
    </div>

    <!-- 🏪 建立商店 Modal -->
    <div class="modal-overlay" v-if="showCreateShopModal" @click="isSubmitting ? null : (showCreateShopModal = false)">
      <div class="modal-content glass-card neon-border-qigong" @click.stop style="width: 480px;">
        <div v-if="isSubmitting" class="submitting-overlay">
          <div class="loader-spinner"></div>
          <p class="loader-text">商店建立中，請稍候...</p>
        </div>
        <h3 class="modal-title neon-text-qigong">🏪 建立個人商店</h3>
        <p class="modal-hint-text">在「{{ currentUser?.server }}」建立商店。建立完成後預設狀態為「營業中」。</p>

        <div class="form-group">
          <label>商店名稱 <span class="required">*</span></label>
          <input type="text" v-model="shopForm.shopName" placeholder="例如：大老的過渡裝備鋪" />
        </div>
        <div class="form-group">
          <label>商店公告 (Notice，支援換行)</label>
          <textarea v-model="shopForm.notice" rows="3" placeholder="換行會自動轉為條列式項目"></textarea>
        </div>

        <div class="modal-buttons">
          <button :disabled="isSubmitting" class="modal-btn cancel" @click="showCreateShopModal = false">取消</button>
          <button :disabled="isSubmitting" class="modal-btn confirm neon-border-qigong" @click="submitCreateShop">確認建立</button>
        </div>
      </div>
    </div>

    <!-- ⚙️ 編輯商店 Modal -->
    <div class="modal-overlay" v-if="showEditShopModal" @click="isSubmitting ? null : (showEditShopModal = false)">
      <div class="modal-content glass-card neon-border-qigong" @click.stop style="width: 480px;">
        <div v-if="isSubmitting" class="submitting-overlay">
          <div class="loader-spinner"></div>
          <p class="loader-text">更新商店中，請稍候...</p>
        </div>
        <h3 class="modal-title neon-text-qigong">⚙️ 編輯商店設定</h3>

        <div class="form-group">
          <label>商店名稱 <span class="required">*</span></label>
          <input type="text" v-model="editShopForm.shopName" />
        </div>
        <div class="form-group">
          <label>營業狀態</label>
          <select v-model="editShopForm.status">
            <option value="營業中">營業中</option>
            <option value="休息中">休息中</option>
          </select>
        </div>
        <div class="form-group">
          <label>商店公告 (支援換行)</label>
          <textarea v-model="editShopForm.notice" rows="3"></textarea>
        </div>

        <div class="modal-buttons">
          <button :disabled="isSubmitting" class="modal-btn cancel" @click="showEditShopModal = false">取消</button>
          <button :disabled="isSubmitting" class="modal-btn confirm neon-border-qigong" @click="submitEditShop">儲存修改</button>
        </div>
      </div>
    </div>

    <!-- 📦 商品刊登/編輯 Modal -->
    <div class="modal-overlay" v-if="showItemModal" @click="isSubmitting ? null : closeItemModal">
      <div class="modal-content glass-card neon-border-qigong" @click.stop style="position: relative; max-height: 90vh; overflow-y: auto; width: 500px;">
        <div v-if="isSubmitting" class="submitting-overlay">
          <div class="loader-spinner"></div>
          <p class="loader-text">商品儲存中，請稍候...</p>
        </div>
        <h3 class="modal-title neon-text-qigong">{{ isEditingItem ? '✏️ 編輯商品資訊' : '➕ 刊登新商品' }}</h3>

        <!-- 圖片上傳區域 -->
        <div class="form-group">
          <label>商品截圖 (點擊或拖放上傳)</label>
          <div 
            class="upload-zone"
            :class="{ 'drag-over': isDragOver }"
            @dragover.prevent="isDragOver = true"
            @dragleave.prevent="isDragOver = false"
            @drop.prevent="handleDrop"
            @click="triggerFileInput"
            style="border: 2px dashed rgba(0, 255, 153, 0.3); border-radius: 8px; padding: 20px; text-align: center; cursor: pointer; background: rgba(255,255,255,0.01);"
          >
            <input 
              type="file" 
              ref="fileInput" 
              style="display: none" 
              accept="image/*" 
              @change="handleFileChange" 
            />
            <div v-if="!itemForm.image" class="upload-placeholder">
              <span style="font-size: 2rem;">📷</span>
              <p style="font-size: 0.8rem; color: var(--text-muted); margin: 5px 0;">點擊或拖曳道具截圖至此處</p>
            </div>
            <div v-else style="position: relative;">
              <img :src="itemForm.image" style="max-height: 140px; object-fit: contain; width: 100%;" />
              <button 
                class="remove-img-btn" 
                style="position: absolute; top: 5px; right: 5px; background: rgba(0,0,0,0.7); color: #fff; border: none; padding: 3px 8px; border-radius: 4px;"
                @click.stop="itemForm.image = ''"
              >
                ✕ 移除
              </button>
            </div>
          </div>
        </div>

        <div class="form-group">
          <label>商品/裝備名稱 <span class="required">*</span></label>
          <input type="text" v-model="itemForm.name" placeholder="例如：朱雀扇 [+7]" />
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>道具類型 <span class="required">*</span></label>
            <select v-model="itemForm.type">
              <option value="武器">武器</option>
              <option value="防具">防具</option>
              <option value="飾品">飾品</option>
              <option value="消耗品">消耗品</option>
              <option value="其他">其他</option>
            </select>
          </div>
          <div class="form-group">
            <label>預期售價 (金幣) <span class="required">*</span></label>
            <input type="number" v-model.number="itemForm.price" placeholder="請輸入金幣價格" />
          </div>
        </div>

        <div class="form-group">
          <label>裝備條件要求 (每行一條，例: 等級 190 / 屬性 敏捷 380)</label>
          <textarea v-model="itemForm.statReqText" rows="2" placeholder="無要求則留空"></textarea>
        </div>

        <div class="form-group">
          <label>道具素質屬性 (每行一條，例: 物理攻擊+20)</label>
          <textarea v-model="itemForm.statsText" rows="3" placeholder="請輸入道具屬性項目"></textarea>
        </div>

        <div class="form-group">
          <label>備註資訊</label>
          <input type="text" v-model="itemForm.notes" placeholder="例如：晚上8點後可交易，商洞門口見" />
        </div>

        <div class="modal-buttons">
          <button :disabled="isSubmitting" class="modal-btn cancel" @click="closeItemModal">取消</button>
          <button :disabled="isSubmitting" class="modal-btn confirm neon-border-qigong" @click="submitItem">確認發布</button>
        </div>
      </div>
    </div>

    <!-- ❓ 使用須知 Modal -->
    <div class="modal-overlay" v-if="showHelpModal" @click="showHelpModal = false">
      <div class="modal-content glass-card help-modal-content neon-border-qigong" @click.stop style="width: 500px;">
        <h3 class="modal-title neon-text-qigong">🔔 市集使用須知與說明</h3>
        
        <div class="help-text-content" style="font-size: 0.9rem; line-height: 1.6; color: var(--text-muted);">
          <p style="margin-bottom: 12px; color: #ffb84d; font-weight: 700;">
            ⚠️ 本站僅提供刊登與交流，交易請於遊戲內進行！
          </p>
          <ul style="padding-left: 18px; margin-bottom: 15px;">
            <li style="margin-bottom: 8px;"><strong>交易安全：</strong> 平台無涉及 any 金錢、付款、下單流程，所有虛寶與遊戲幣交易請於《亂2 Online》遊戲內安全完成。</li>
            <li style="margin-bottom: 8px;"><strong>商店營業管理：</strong> 本次更新商店一律預設為「營業中」，大眾可直接看見商店列表。管理中店主亦可將其調整為「休息中」暫停營業。</li>
            <li style="margin-bottom: 8px;"><strong>商品排序管理：</strong> 店主在「編輯商品列表」模式下，能直接在第二層進行滑鼠拖動排序，或直接輸入排序值數值。</li>
            <li style="margin-bottom: 8px;"><strong>誠信交易：</strong> 商品一旦售出，請店主主動點選「標記為已售出」進行下架。</li>
          </ul>
        </div>

        <div class="modal-buttons" style="justify-content: center;">
          <button class="modal-btn confirm neon-border-qigong" @click="showHelpModal = false">我知道了</button>
        </div>
      </div>
    </div>

    <!-- 圖片放大 Lightbox Modal -->
    <div class="modal-overlay" v-if="showLightbox" @click="showLightbox = false" style="background: rgba(0,0,0,0.95);">
      <button class="close-btn" style="position: absolute; top: 25px; right: 25px; font-size: 2rem; cursor: pointer; background: none; border: none; color: #fff;" @click="showLightbox = false">✕</button>
      <div style="max-width: 90vw; max-height: 90vh;" @click.stop>
        <img 
          :src="lightboxImage" 
          style="max-width: 100%; max-height: 90vh; object-fit: contain; border-radius: 8px; border: 2px solid rgba(0,255,153,0.15);" 
        />
      </div>
    </div>

    <!-- Toast 訊息通知 -->
    <transition name="toast">
      <div class="toast-message glass-card neon-border-qigong" v-if="toastMsg">
        <span class="toast-icon">🔔</span>
        <span class="toast-text">{{ toastMsg }}</span>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import LoadingOverlay from '@/components/LoadingOverlay.vue'
import { useAuth } from '@/composables/useAuth.js'

const { currentUser, isLoggedIn } = useAuth()
const route = useRoute()
const router = useRouter()

// 1. 產生 12 筆新東京商店與 0 ~ 30 筆隨機商品的 Mock 資料產生器
const generateMockData = () => {
  const mockShops = []
  const mockShares = []
  
  const owners = [
    { name: '破壞之王', shopName: '破壞之王的絕版武器庫', notice: '只賣絕版好貨，意者密我！\n不定期更新，售出不退。\n交易地點：商洞三樓。' },
    { name: '幻海奇緣', shopName: '幻海萌新救濟站', notice: '新東京萌新過渡裝備免費/低價出。\n來商洞找我。\n請多用遊戲內信件聯繫。' },
    { name: '土豪123', shopName: '新東京土豪道具行', notice: '高價回收稀有禮盒。\n大量金幣收購高加裝備。' },
    { name: '流雲劍客', shopName: '流雲閣劍系專專賣', notice: '專賣劍客高級武器與防具。\n支持少量易物。' },
    { name: '月影刺客', shopName: '暗影工坊', notice: '提供高敏捷刺客裝備。\n價格合理，謝絕還價。' },
    { name: '氣宗太極', shopName: '氣功太極館', notice: '佛系出清氣功氣質裝。\n歡迎議價！' },
    { name: '雷霆法皇', shopName: '元素魔法屋', notice: '雷系與冰系法杖專賣。\n不定期上新。' },
    { name: '百里穿楊', shopName: '神射手軍火庫', notice: '弓箭手高敏、高傷裝備。' },
    { name: '不動明王', shopName: '鋼鐵防線盾牌店', notice: '肉盾專用高防具、高抗性裝備。\n只收金幣，不換物。' },
    { name: '逍遙散人', shopName: '雜貨擺攤小鋪', notice: '各式消耗品、回血藥水、傳送卷軸。\n量大有優惠。' },
    { name: '獨孤求敗', shopName: '求敗神兵坊', notice: '神兵利器，價高者得。' },
    { name: '萌新小妹', shopName: '萌新求收留小鋪', notice: '隨便賣一些自己用不到的雜物。' }
  ]

  const itemCounts = [25, 12, 0, 8, 30, 15, 3, 20, 0, 5, 28, 10]
  
  const itemNames = [
    '朱雀扇', '玄武甲', '青龍劍', '白虎戒', '疾風靴', '泰山項鍊', 
    '烈火護腕', '寒冰護手', '天神之弓', '無極法杖', '修羅戰盔', '金剛護身符',
    '太極長袍', '乾坤腰帶', '九幽護面', '般若拳套', '真武大刀', '龍牙匕首'
  ]
  const itemTypes = ['武器', '防具', '飾品', '消耗品', '其他']
  const statsTemplates = [
    ['物理傷害 +15%', '命中率 +10'],
    ['狀態異常: 麻痺(30%機率)', '攻擊力 +45'],
    ['HP最大值 +500', '防禦力 +25'],
    ['SP最大值 +200', 'SP回復速度 +0.5%'],
    ['敏捷要求 +15', '移動速度 +5%'],
    ['物理防禦 +8%', '抗性 +5%'],
    ['攻擊速度 +10%', '暴擊率 +5%'],
    ['隨機追加傷害 +120', '力量 +8']
  ]

  owners.forEach((owner, i) => {
    const shopId = `shop-${i + 1}`
    const count = itemCounts[i]
    
    mockShops.push({
      id: shopId,
      shopName: owner.shopName,
      ownerId: owner.name,
      server: '新東京',
      notice: owner.notice,
      status: '營業中',
      itemCount: count,
      createdAt: Date.now() - 3600000 * 24 * (12 - i),
      updatedAt: Date.now() - 3600000 * (12 - i),
      lastItemUpdatedAt: Date.now() - 3600000 * (12 - i)
    })

    for (let j = 0; j < count; j++) {
      const nameIdx = (i * 7 + j) % itemNames.length
      const typeIdx = (nameIdx) % itemTypes.length
      const statsIdx = (i + j) % statsTemplates.length
      
      mockShares.push({
        id: `item-${shopId}-${j + 1}`,
        shopId: shopId,
        name: `${itemNames[nameIdx]} [+${(j % 10) + 3}]`,
        type: itemTypes[typeIdx],
        price: 100000 * ((j % 15) + 1) + 50000 * (i + 1),
        statReq: [`等級要求 ${(j % 10) * 10 + 100}`, `能力要求 敏捷 ${(j % 5) * 50 + 200}`],
        stats: statsTemplates[statsIdx],
        image: '',
        notes: `便宜出售，意者直接聯繫店主。`,
        ownerId: owner.name,
        server: '新東京',
        status: '刊登中',
        favoriteCount: (j % 5),
        sortValue: j + 1,
        createdAt: Date.now() - 3600000 * (count - j),
        updatedAt: Date.now() - 3600000 * (count - j),
        closedAt: null
      })
    }

    if (shopId === 'shop-1') {
      for (let k = 0; k < 3; k++) {
        mockShares.push({
          id: `item-shop-1-sold-${k + 1}`,
          shopId: 'shop-1',
          name: `已售絕版神兵-[+${k + 7}]`,
          type: '武器',
          price: 9900000 + k * 1000000,
          statReq: ['等級要求 195'],
          stats: ['攻擊力 +100', '物理追加 +20%'],
          image: '',
          notes: '已售出下架。',
          ownerId: '破壞之王',
          server: '新東京',
          status: '已售出', 
          favoriteCount: 0,
          sortValue: null,
          createdAt: Date.now() - 3600000 * 200,
          updatedAt: Date.now() - 3600000 * 100,
          closedAt: Date.now() - 3600000 * 90
        })
      }
    }
  })

  return { mockShops, mockShares }
}

// 響應式本地資料狀態
const shops = ref([])
const items = ref([])
const favorites = ref([])

const activeDepth = ref(1) // 1: 商店, 2: 商品列表, 3: 商品詳情
const selectedShop = ref(null)
const selectedItem = ref(null)

// 篩選與搜尋
const selectedServer = ref('新東京')
const searchQuery = ref('')
const activeSearchQuery = ref('')

// 隨機打亂排序後的商店陣列
const allShopsOrdered = ref([])

// 活躍商店商品
const shopItems = ref([])

// 商店公告是否摺疊
const isShopInfoCollapsed = ref(true)

// 活躍在售商品總量
const activeItemsCount = computed(() => {
  return shopItems.value.filter(i => i.status === '刊登中').length
})

// 條列式公告陣列
const shopNotices = computed(() => {
  if (!selectedShop.value || !selectedShop.value.notice) return []
  return selectedShop.value.notice.split('\n').filter(n => n.trim() !== '')
})

// 是否正在進行第二層列表編輯
const isEditingList = ref(false)

// Modal 控制
const showHelpModal = ref(false)
const showFavoriteDrawer = ref(false)
const showMyAppsModal = ref(false)
const showCreateShopModal = ref(false)
const showEditShopModal = ref(false)
const showItemModal = ref(false)
const showLightbox = ref(false)

const lightboxImage = ref('')
const toastMsg = ref('')

// 表單綁定
const shopForm = ref({
  shopName: '',
  notice: ''
})
const editShopForm = ref({
  shopName: '',
  status: '營業中',
  notice: ''
})
const itemForm = ref({
  id: '',
  name: '',
  type: '武器',
  price: 0,
  statReqText: '',
  statsText: '',
  image: '',
  notes: ''
})

const isEditingItem = ref(false)
const isSubmitting = ref(false)
const isInitialLoading = ref(true)

// LocalStorage 載入
const loadFromStorage = () => {
  const storedShops = localStorage.getItem('ran2_mock_shops')
  const storedShares = localStorage.getItem('ran2_mock_shares')
  const storedFavs = localStorage.getItem('ran2_mock_favorites')

  let parsedShops = null
  try { parsedShops = JSON.parse(storedShops) } catch (e) {}

  let needsReset = !storedShops || !parsedShops || parsedShops.length !== 12
  if (parsedShops && parsedShops.length === 12) {
    const hasClosed = parsedShops.some(s => s.status !== '營業中')
    if (hasClosed) needsReset = true
  }

  if (needsReset) {
    const generated = generateMockData()
    shops.value = generated.mockShops
    items.value = generated.mockShares
    favorites.value = []
    
    saveShops()
    saveShares()
    saveFavorites()
    localStorage.removeItem('ran2_cache_shop_items')
  } else {
    shops.value = parsedShops
    items.value = JSON.parse(storedShares)
    favorites.value = JSON.parse(storedFavs)
  }

  // 規格：商店一律設定為營業中，否則我看不到列表資料
  shops.value.forEach(s => {
    s.status = '營業中'
  })
  saveShops()

  isInitialLoading.value = false
}

const saveShops = () => {
  localStorage.setItem('ran2_mock_shops', JSON.stringify(shops.value))
}
const saveShares = () => {
  localStorage.setItem('ran2_mock_shares', JSON.stringify(items.value))
}
const saveFavorites = () => {
  localStorage.setItem('ran2_mock_favorites', JSON.stringify(favorites.value))
}

// 登入角色對應的商店
const myShop = computed(() => {
  if (!isLoggedIn.value) return null
  return shops.value.find(s => s.ownerId === currentUser.value.charId && s.server === currentUser.value.server)
})

// 目前身分識別碼
const myUserId = computed(() => {
  return currentUser.value?.code || ''
})

// 判定當前選中商店的管理權限
const isShopOwner = computed(() => {
  if (!isLoggedIn.value || !selectedShop.value) return false
  return currentUser.value.charId === selectedShop.value.ownerId && 
         currentUser.value.server === selectedShop.value.server
})

// 載入當前使用者的收藏清單與最新價格快照
const myFavorites = computed(() => {
  const userId = myUserId.value
  if (!userId) return []
  
  const list = favorites.value.filter(fav => fav.userId === userId)
  return list.map(fav => {
    const item = items.value.find(i => i.id === fav.itemId)
    const shop = shops.value.find(s => s.id === fav.shopId)
    return {
      ...fav,
      price: item ? item.price : 0,
      shopName: shop ? shop.shopName : '已關閉賣場',
      exists: !!item && ['刊登中'].includes(item.status)
    }
  }).sort((a, b) => b.favoriteTime - a.favoriteTime)
})

// 模糊篩選過濾後的商店列表
const filteredShops = computed(() => {
  let list = allShopsOrdered.value

  list = list.filter(s => {
    const isMine = isLoggedIn.value && s.ownerId === currentUser.value.charId && s.server === currentUser.value.server
    return s.status === '營業中' || isMine
  })

  // 伺服器篩選
  list = list.filter(s => s.server === selectedServer.value)

  // 關鍵字模糊搜尋
  if (activeSearchQuery.value.trim() !== '') {
    const q = activeSearchQuery.value.toLowerCase().trim()
    list = list.filter(s => 
      s.shopName.toLowerCase().includes(q) || 
      s.ownerId.toLowerCase().includes(q)
    )
  }

  return list
})

// 商店隨機洗牌排序 (自家商店固定第 1 位，其餘隨機)
const shuffleShops = () => {
  const activeShops = shops.value
  
  let myShopObj = null
  let others = []

  if (isLoggedIn.value) {
    myShopObj = activeShops.find(s => s.ownerId === currentUser.value.charId && s.server === currentUser.value.server)
    others = activeShops.filter(s => !(s.ownerId === currentUser.value.charId && s.server === currentUser.value.server))
  } else {
    others = [...activeShops]
  }

  // 對其餘商店進行 Fisher-Yates 隨機打亂
  for (let i = others.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [others[i], others[j]] = [others[j], others[i]]
  }

  const result = []
  if (myShopObj) {
    result.push(myShopObj)
  }
  result.push(...others)
  
  allShopsOrdered.value = result
}

watch([selectedServer, shops], () => {
  shuffleShops()
})

watch(() => isLoggedIn.value, () => {
  shuffleShops()
})

const triggerSearch = () => {
  activeSearchQuery.value = searchQuery.value
}

// 選擇商店與快取校驗比對
const selectShop = (shop) => {
  selectedShop.value = shop
  selectedItem.value = null
  activeDepth.value = 2
  isEditingList.value = false
  isShopInfoCollapsed.value = true
  
  loadShopItems(shop.id)
}

// 快取比對載入商品
const loadShopItems = (shopId) => {
  const shop = shops.value.find(s => s.id === shopId)
  if (!shop) return

  const dbLastUpdated = shop.lastItemUpdatedAt || 0
  const cacheStr = localStorage.getItem('ran2_cache_shop_items')
  let cache = {}
  if (cacheStr) {
    try { cache = JSON.parse(cacheStr) } catch (e) { cache = {} }
  }

  const cacheData = cache[shopId]
  const isOwner = isLoggedIn.value && shop.ownerId === currentUser.value.charId && shop.server === currentUser.value.server

  if (cacheData && cacheData.lastItemUpdatedAt === dbLastUpdated && cacheData.isOwnerView === isOwner) {
    console.log(`[Cache Hit] 商店「${shop.shopName}」快取命中。時間戳一致: ${formatTime(dbLastUpdated)}。`)
    shopItems.value = JSON.parse(JSON.stringify(cacheData.items))
  } else {
    console.log(`[Cache Miss/Expired] 商店「${shop.shopName}」快取失效或首次加載。從資料庫(LocalStorage庫)重載商品...`)
    
    let freshItems = []
    if (isOwner) {
      freshItems = items.value.filter(item => item.shopId === shopId && ['刊登中', '已售出'].includes(item.status))
    } else {
      freshItems = items.value.filter(item => item.shopId === shopId && item.status === '刊登中')
    }
    
    cache[shopId] = {
      items: freshItems,
      lastItemUpdatedAt: dbLastUpdated,
      isOwnerView: isOwner
    }
    localStorage.setItem('ran2_cache_shop_items', JSON.stringify(cache))
    shopItems.value = JSON.parse(JSON.stringify(freshItems))
  }

  sortActiveItems()
}

// 排序活躍商品
const sortActiveItems = () => {
  shopItems.value.sort((a, b) => {
    const statusA = a.status === '刊登中' ? 0 : 1
    const statusB = b.status === '刊登中' ? 0 : 1
    if (statusA !== statusB) return statusA - statusB

    const sortA = a.sortValue !== undefined && a.sortValue !== null ? a.sortValue : 99999
    const sortB = b.sortValue !== undefined && b.sortValue !== null ? b.sortValue : 99999
    if (sortA !== sortB) return sortA - sortB
    
    if (b.updatedAt !== a.updatedAt) return b.updatedAt - a.updatedAt
    
    return b.createdAt - a.createdAt
  })
}

// 重新編排排序值 1 ~ N
const reindexShopItems = (shopId) => {
  const activeOnly = shopItems.value.filter(item => item.status === '刊登中')
  
  activeOnly.forEach((item, index) => {
    item.sortValue = index + 1
    
    const dbIdx = items.value.findIndex(i => i.id === item.id)
    if (dbIdx !== -1) {
      items.value[dbIdx].sortValue = index + 1
    }
  })
  saveShares()

  const shopIdx = shops.value.findIndex(s => s.id === shopId)
  if (shopIdx !== -1) {
    const now = Date.now()
    shops.value[shopIdx].lastItemUpdatedAt = now
    shops.value[shopIdx].updatedAt = now
    saveShops()
  }

  loadShopItems(shopId)
}

// 選擇商品
const selectItem = (item) => {
  selectedItem.value = item
  activeDepth.value = 3
}

// 返回上一層
const goBack = () => {
  if (activeDepth.value === 3) {
    activeDepth.value = 2
    selectedItem.value = null
  } else if (activeDepth.value === 2) {
    activeDepth.value = 1
    selectedShop.value = null
    isEditingList.value = false
  }
}

// 麵包屑導航點擊跳層
const clickBreadcrumb = (depth) => {
  if (depth === 1) {
    selectedShop.value = null
    selectedItem.value = null
    activeDepth.value = 1
    isEditingList.value = false
  } else if (depth === 2 && selectedShop.value) {
    selectedItem.value = null
    activeDepth.value = 2
  }
}

// 判斷商品是否屬於自己角色
const isMyItem = (item) => {
  if (!isLoggedIn.value || !item) return false
  return currentUser.value.charId === item.ownerId && currentUser.value.server === item.server
}

// 判斷是否為收藏狀態
const isFaved = (itemId) => {
  return favorites.value.some(fav => fav.userId === myUserId.value && fav.itemId === itemId)
}

// 關注收藏切換
const toggleFavorite = (item) => {
  const userId = myUserId.value
  if (!userId) {
    alert('請先點擊右上方載入或登入身分識別碼！')
    return
  }

  if (isMyItem(item)) {
    alert('您無法關注自己商店刊登的商品！')
    return
  }

  const favId = `${userId}_${item.id}`
  const favIndex = favorites.value.findIndex(f => f.id === favId)
  const itemIndex = items.value.findIndex(i => i.id === item.id)

  if (itemIndex === -1) return

  if (favIndex !== -1) {
    favorites.value.splice(favIndex, 1)
    items.value[itemIndex].favoriteCount = Math.max(0, items.value[itemIndex].favoriteCount - 1)
    showToast('已取消關注該商品。')
  } else {
    const newFav = {
      id: favId,
      itemId: item.id,
      shopId: item.shopId,
      itemName: item.name,
      userId: userId,
      favoriteTime: Date.now()
    }
    favorites.value.push(newFav)
    items.value[itemIndex].favoriteCount += 1
    showToast('已成功關注此商品！')
  }
  
  if (selectedItem.value && selectedItem.value.id === item.id) {
    selectedItem.value = { ...items.value[itemIndex] }
  }

  saveFavorites()
  saveShares()

  const shopIdx = shops.value.findIndex(s => s.id === item.shopId)
  if (shopIdx !== -1) {
    shops.value[shopIdx].lastItemUpdatedAt = Date.now()
    saveShops()
  }
  loadShopItems(item.shopId)
}

// 收藏夾卡片點擊，載入該商品並跳轉，若不存在則提示刪除
const clickFavoriteItem = (fav) => {
  showFavoriteDrawer.value = false
  const item = items.value.find(i => i.id === fav.itemId)
  if (!item || !['刊登中'].includes(item.status)) {
    if (confirm('此商品已不存在或已下架。是否將其從收藏夾中移除？')) {
      removeFavoriteById(fav.itemId)
    }
    return
  }

  const shop = shops.value.find(s => s.id === item.shopId)
  if (shop && shop.status === '營業中') {
    selectedShop.value = shop
    selectedItem.value = item
    activeDepth.value = 3
    loadShopItems(shop.id)
  } else {
    alert('該商品所屬商店已暫停營業或關閉！')
  }
}

const removeFavoriteById = (itemId) => {
  const userId = myUserId.value
  if (!userId) return
  const favId = `${userId}_${itemId}`

  favorites.value = favorites.value.filter(f => f.id !== favId)

  const itemIndex = items.value.findIndex(i => i.id === itemId)
  if (itemIndex !== -1) {
    items.value[itemIndex].favoriteCount = Math.max(0, items.value[itemIndex].favoriteCount - 1)
    if (selectedItem.value && selectedItem.value.id === itemId) {
      selectedItem.value = { ...items.value[itemIndex] }
    }
  }

  saveFavorites()
  saveShares()
  showToast('已從收藏夾移除。')
}

// 建立個人商店
const openCreateShop = () => {
  shopForm.value = { shopName: '', notice: '' }
  showCreateShopModal.value = true
}

const submitCreateShop = () => {
  if (!shopForm.value.shopName) {
    alert('請填寫商店名稱！')
    return
  }

  isSubmitting.value = true
  try {
    const newShop = {
      id: 'shop-' + Math.random().toString(36).substr(2, 9),
      shopName: shopForm.value.shopName,
      ownerId: currentUser.value.charId,
      server: currentUser.value.server,
      notice: shopForm.value.notice || '',
      status: '營業中',
      itemCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastItemUpdatedAt: Date.now()
    }

    shops.value.push(newShop)
    saveShops()
    shuffleShops()
    showToast('商店建立成功！')
    showCreateShopModal.value = false
  } catch (err) {
    console.error('建立商店失敗:', err)
    alert(`建立商店失敗: ${err.message}`)
  } finally {
    isSubmitting.value = false
  }
}

// 編輯與管理商店
const manageMyShop = () => {
  const shop = myShop.value
  if (!shop) return
  editShopForm.value = {
    shopName: shop.shopName,
    status: shop.status,
    notice: shop.notice
  }
  showEditShopModal.value = true
}

const submitEditShop = () => {
  if (!editShopForm.value.shopName) {
    alert('請填寫商店名稱！')
    return
  }

  const shop = myShop.value
  isSubmitting.value = true
  try {
    const shopIndex = shops.value.findIndex(s => s.id === shop.id)
    if (shopIndex !== -1) {
      shops.value[shopIndex].shopName = editShopForm.value.shopName
      shops.value[shopIndex].status = editShopForm.value.status
      shops.value[shopIndex].notice = editShopForm.value.notice || ''
      shops.value[shopIndex].updatedAt = Date.now()

      if (selectedShop.value && selectedShop.value.id === shop.id) {
        selectedShop.value = { ...shops.value[shopIndex] }
      }

      items.value.forEach(item => {
        if (item.shopId === shop.id) {
          item.ownerId = shop.ownerId
          item.server = shop.server
          item.updatedAt = Date.now()
        }
      })

      saveShops()
      saveShares()
      shuffleShops()
      showToast('商店資訊更新成功！')
      showEditShopModal.value = false
    }
  } catch (err) {
    console.error('更新商店失敗:', err)
    alert(`更新失敗: ${err.message}`)
  } finally {
    isSubmitting.value = false
  }
}

// 商品建立與編輯
const addNewItemToMyShop = () => {
  isEditingItem.value = false
  itemForm.value = {
    id: '',
    name: '',
    type: '武器',
    price: 0,
    statReqText: '',
    statsText: '',
    image: '',
    notes: ''
  }
  showItemModal.value = true
}

const editItem = (item) => {
  isEditingItem.value = true
  itemForm.value = {
    id: item.id,
    name: item.name,
    type: item.type,
    price: item.price,
    statReqText: item.statReq ? item.statReq.join('\n') : '',
    statsText: item.stats ? item.stats.join('\n') : '',
    image: item.image,
    notes: item.notes
  }
  showItemModal.value = true
}

const closeItemModal = () => {
  showItemModal.value = false
  isEditingItem.value = false
  pendingImageFile.value = null
}

const submitItem = async () => {
  if (!itemForm.value.name || itemForm.value.price === '') {
    alert('請填寫商品名稱與預期售價！')
    return
  }

  isSubmitting.value = true
  try {
    let displayImage = itemForm.value.image || '/assets/share/no-image.png'
    if (pendingImageFile.value) {
      let oldFileId = ''
      if (itemForm.value.image && itemForm.value.image.includes('lh3.googleusercontent.com/d/')) {
        const parts = itemForm.value.image.split('/')
        oldFileId = parts[parts.length - 1]
      }
      const uploadedUrl = await uploadImageViaGAS(pendingImageFile.value, oldFileId)
      if (uploadedUrl) {
        displayImage = uploadedUrl
      }
    }

    const reqArr = itemForm.value.statReqText ? itemForm.value.statReqText.split('\n').filter(r => r.trim() !== '') : ['無特殊裝備要求']
    const statArr = itemForm.value.statsText ? itemForm.value.statsText.split('\n').filter(s => s.trim() !== '') : ['基礎屬性，無額外加成']

    const shop = selectedShop.value || myShop.value

    if (isEditingItem.value) {
      const itemIndex = items.value.findIndex(i => i.id === itemForm.value.id)
      if (itemIndex !== -1) {
        items.value[itemIndex] = {
          ...items.value[itemIndex],
          name: itemForm.value.name,
          type: itemForm.value.type,
          price: Number(itemForm.value.price) || 0,
          statReq: reqArr,
          stats: statArr,
          image: displayImage,
          notes: itemForm.value.notes,
          updatedAt: Date.now()
        }

        if (selectedItem.value && selectedItem.value.id === itemForm.value.id) {
          selectedItem.value = { ...items.value[itemIndex] }
        }

        saveShares()
        
        const shopIndex = shops.value.findIndex(s => s.id === shop.id)
        if (shopIndex !== -1) {
          shops.value[shopIndex].lastItemUpdatedAt = Date.now()
          shops.value[shopIndex].updatedAt = Date.now()
          saveShops()
        }

        loadShopItems(shop.id)
        showToast('商品資訊編輯成功！')
      }
    } else {
      const activeCount = items.value.filter(i => i.shopId === shop.id && i.status === '刊登中').length
      
      const newItem = {
        id: 'item-' + Math.random().toString(36).substr(2, 9),
        shopId: shop.id,
        name: itemForm.value.name,
        type: itemForm.value.type,
        price: Number(itemForm.value.price) || 0,
        statReq: reqArr,
        stats: statArr,
        image: displayImage,
        notes: itemForm.value.notes,
        ownerId: shop.ownerId,
        server: shop.server,
        status: '刊登中',
        favoriteCount: 0,
        sortValue: activeCount + 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        closedAt: null
      }

      items.value.push(newItem)

      const shopIndex = shops.value.findIndex(s => s.id === shop.id)
      if (shopIndex !== -1) {
        shops.value[shopIndex].itemCount += 1
        shops.value[shopIndex].lastItemUpdatedAt = Date.now()
        shops.value[shopIndex].updatedAt = Date.now()
        saveShops()
      }

      saveShares()
      loadShopItems(shop.id)
      showToast('商品上架成功！')
    }
    closeItemModal()
  } catch (err) {
    console.error('儲存商品失敗:', err)
    alert(`儲存失敗: ${err.message}`)
  } finally {
    isSubmitting.value = false
  }
}

// 標記為已售出
const sellItem = (item) => {
  if (!confirm(`確定要將商品【${item.name}】標記為已售出並下架嗎？`)) return
  
  const itemIndex = items.value.findIndex(i => i.id === item.id)
  if (itemIndex !== -1) {
    const oldStatus = items.value[itemIndex].status
    items.value[itemIndex].status = '已售出'
    items.value[itemIndex].closedAt = Date.now()
    items.value[itemIndex].updatedAt = Date.now()

    if (oldStatus === '刊登中') {
      const shopIndex = shops.value.findIndex(s => s.id === item.shopId)
      if (shopIndex !== -1) {
        shops.value[shopIndex].itemCount = Math.max(0, shops.value[shopIndex].itemCount - 1)
        shops.value[shopIndex].lastItemUpdatedAt = Date.now()
        shops.value[shopIndex].updatedAt = Date.now()
        saveShops()
      }
    }

    saveShares()
    
    loadShopItems(item.shopId)
    reindexShopItems(item.shopId)

    showToast('已將商品標記為已售出。')
    selectedItem.value = null
    activeDepth.value = 2
  }
}

// 永久刪除商品
const deleteItem = (item) => {
  if (!confirm(`確定要永久刪除【${item.name}】嗎？此操作無法復原，並將一併移除所有收藏紀錄。`)) return
  
  const itemIndex = items.value.findIndex(i => i.id === item.id)
  if (itemIndex !== -1) {
    const oldStatus = items.value[itemIndex].status
    items.value.splice(itemIndex, 1)

    if (oldStatus === '刊登中') {
      const shopIndex = shops.value.findIndex(s => s.id === item.shopId)
      if (shopIndex !== -1) {
        shops.value[shopIndex].itemCount = Math.max(0, shops.value[shopIndex].itemCount - 1)
        shops.value[shopIndex].lastItemUpdatedAt = Date.now()
        shops.value[shopIndex].updatedAt = Date.now()
        saveShops()
      }
    }

    favorites.value = favorites.value.filter(f => f.itemId !== item.id)

    saveShares()
    saveFavorites()

    loadShopItems(item.shopId)
    reindexShopItems(item.shopId)

    if (item.image && item.image.includes('lh3.googleusercontent.com/d/')) {
      const parts = item.image.split('/')
      const fileId = parts[parts.length - 1]
      const functionUrl = import.meta.env.VITE_GAS_FUNCTION_URL
      if (functionUrl && fileId) {
        fetch(functionUrl, {
          method: 'POST',
          mode: 'cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ image: '', name: '', oldFileId: fileId })
        }).catch(err => console.error('GAS回收圖片失敗:', err))
      }
    }

    showToast('商品已永久刪除！')
    selectedItem.value = null
    activeDepth.value = 2
  }
}

// 第二層行內編輯控制
const toggleEditList = () => {
  if (isEditingList.value) {
    shopItems.value.forEach(item => {
      const dbIdx = items.value.findIndex(i => i.id === item.id)
      if (dbIdx !== -1) {
        items.value[dbIdx].name = item.name
        items.value[dbIdx].price = Number(item.price) || 0
        items.value[dbIdx].updatedAt = Date.now()
      }
    })
    saveShares()
    updateShopLastItemTime(selectedShop.value.id)
    loadShopItems(selectedShop.value.id)
    isEditingList.value = false
    showToast('商品列表內容儲存成功！')
  } else {
    isEditingList.value = true
  }
}

const cancelEditList = () => {
  isEditingList.value = false
  loadShopItems(selectedShop.value.id)
}

// --- 拖曳排序實作 ---
const draggedIndex = ref(null)

const handleDragStart = (event, index) => {
  if (!isEditingList.value || !isShopOwner.value) return
  const item = shopItems.value[index]
  if (item.status !== '刊登中') return
  
  draggedIndex.value = index
  event.dataTransfer.effectAllowed = 'move'
}

const handleRowDrop = (event, index) => {
  if (draggedIndex.value === null || draggedIndex.value === index) return
  const item = shopItems.value[index]
  if (item.status !== '刊登中') return

  const targetItem = shopItems.value[draggedIndex.value]
  
  shopItems.value.splice(draggedIndex.value, 1)
  shopItems.value.splice(index, 0, targetItem)

  const activeOnly = shopItems.value.filter(it => it.status === '刊登中')
  activeOnly.forEach((it, i) => {
    it.sortValue = i + 1
    const dbIdx = items.value.findIndex(dbIt => dbIt.id === it.id)
    if (dbIdx !== -1) {
      items.value[dbIdx].sortValue = i + 1
    }
  })

  saveShares()
  updateShopLastItemTime(selectedShop.value.id)
  loadShopItems(selectedShop.value.id)
  
  draggedIndex.value = null
  showToast('列表位置排序已更新！')
}

// --- 第二層修改排序值重排演算法 ---
const updateItemSortValueDirectly = (item, newSortVal) => {
  const shopId = item.shopId
  
  const activeItems = shopItems.value.filter(i => i.status === '刊登中')
  const curIdx = activeItems.findIndex(i => i.id === item.id)
  if (curIdx === -1) return

  let targetSortValue = newSortVal
  if (targetSortValue === undefined || targetSortValue === null || isNaN(targetSortValue)) {
    targetSortValue = activeItems.length
  }
  const targetIdx = Math.max(0, Math.min(activeItems.length - 1, targetSortValue - 1))

  activeItems.splice(curIdx, 1)
  activeItems.splice(targetIdx, 0, item)

  activeItems.forEach((it, idx) => {
    it.sortValue = idx + 1
    const dbIdx = items.value.findIndex(dbIt => dbIt.id === it.id)
    if (dbIdx !== -1) {
      items.value[dbIdx].sortValue = idx + 1
    }
  })

  saveShares()
  updateShopLastItemTime(shopId)
  loadShopItems(shopId)

  showToast('商品排序已重新編排！')
}

const updateShopLastItemTime = (shopId) => {
  const shopIndex = shops.value.findIndex(s => s.id === shopId)
  if (shopIndex !== -1) {
    const now = Date.now()
    shops.value[shopIndex].lastItemUpdatedAt = now
    shops.value[shopIndex].updatedAt = now
    saveShops()
    shuffleShops()
  }
}

// 分享按鈕
const shareShopLink = () => {
  const link = `${window.location.origin}/share?shopId=${selectedShop.value.id}`
  navigator.clipboard.writeText(link).then(() => {
    showToast('個人商店分享連結已複製到剪貼簿！')
  }).catch(() => {
    alert('複製連結失敗，請手動複製！')
  })
}

const shareItemLink = () => {
  const link = `${window.location.origin}/share?shopId=${selectedShop.value.id}&itemId=${selectedItem.value.id}`
  navigator.clipboard.writeText(link).then(() => {
    showToast('商品分享連結已複製到剪貼簿！')
  }).catch(() => {
    alert('複製連結失敗，請手動複製！')
  })
}

// 身份識別 Modal 載入
const openMyAppsModal = () => {
  showMyAppsModal.value = true
}

// 7天未更新判斷
const isOutdated = (updatedAt) => {
  if (!updatedAt) return false
  const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000
  return (Date.now() - updatedAt) > SEVEN_DAYS
}

// 時間格式化與相對時間
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

const formatRelativeTime = (unixMs) => {
  if (!unixMs) return '未知'
  const diff = Date.now() - unixMs
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '剛剛'
  if (mins < 60) return `${mins} 分鐘前`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} 小時前`
  const days = Math.floor(hours / 24)
  return `${days} 天前`
}

const formatPrice = (val) => {
  if (val === undefined || val === null) return '0'
  return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

// --- URL query 參數監聽與自動跳轉定位 ---
const updateUrl = () => {
  const queryParams = {}
  if (selectedShop.value) {
    queryParams.shopId = selectedShop.value.id
  }
  if (selectedItem.value) {
    queryParams.itemId = selectedItem.value.id
  }
  router.replace({ query: queryParams })
}

watch([selectedShop, selectedItem], () => {
  updateUrl()
})

const handleUrlNavigation = () => {
  const queryShopId = route.query.shopId
  const queryItemId = route.query.itemId
  
  if (queryShopId) {
    const shop = shops.value.find(s => s.id === queryShopId)
    const isMine = isLoggedIn.value && shop?.ownerId === currentUser.value.charId && shop?.server === currentUser.value.server
    if (shop && (shop.status === '營業中' || isMine)) {
      selectedShop.value = shop
      activeDepth.value = 2
      loadShopItems(shop.id)
      
      if (queryItemId) {
        const item = items.value.find(i => i.id === queryItemId && i.shopId === queryShopId)
        if (item && (item.status === '刊登中' || isMine)) {
          selectedItem.value = item
          activeDepth.value = 3
        }
      }
    }
  }
}

watch(() => route.query, (newQuery) => {
  if (!newQuery.shopId) {
    selectedShop.value = null
    selectedItem.value = null
    activeDepth.value = 1
  } else {
    const shop = shops.value.find(s => s.id === newQuery.shopId)
    const isMine = isLoggedIn.value && shop?.ownerId === currentUser.value.charId && shop?.server === currentUser.value.server
    if (shop && (shop.status === '營業中' || isMine)) {
      if (selectedShop.value?.id !== shop.id) {
        selectedShop.value = shop
        activeDepth.value = 2
        loadShopItems(shop.id)
      }
      if (newQuery.itemId) {
        const item = items.value.find(i => i.id === newQuery.itemId)
        if (item && selectedItem.value?.id !== item.id) {
          selectedItem.value = item
          activeDepth.value = 3
        }
      } else {
        selectedItem.value = null
        if (activeDepth.value === 3) {
          activeDepth.value = 2
        }
      }
    }
  }
}, { deep: true })

// --- 圖片上傳基礎設施保留與 GAS 對接 ---
const pendingImageFile = ref(null)
const isDragOver = ref(false)
const fileInput = ref(null)

const triggerFileInput = () => {
  if (!itemForm.value.image && fileInput.value) {
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
  itemForm.value.image = URL.createObjectURL(file)
}

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
  const uploadUrl = import.meta.env.VITE_GAS_FUNCTION_URL
  if (!uploadUrl) {
    console.warn('VITE_GAS_FUNCTION_URL 未設定，無法上傳圖片。將使用預設 placeholder。')
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
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    })
    if (!response.ok) throw new Error(`HTTP 錯誤: ${response.status}`)
    const result = await response.json()
    return result.success ? result.url : null
  } catch (error) {
    console.error('上傳圖片至 Google Drive 失敗:', error)
    alert(`圖片上傳失敗: ${error.message}，將使用預設或原圖。`)
    return null
  }
}

// 圖片載入錯誤處理
const handleImgError = (event) => {
  event.target.src = '/assets/share/no-image.png'
}

const openLightbox = (url) => {
  if (!url) return
  lightboxImage.value = url
  showLightbox.value = true
}

const showToast = (msg) => {
  toastMsg.value = msg
  setTimeout(() => {
    toastMsg.value = ''
  }, 3000)
}

// 監聽視窗寬度決定是否退化
const checkWindowSize = () => {
  if (window.innerWidth <= 820) {
    if (activeDepth.value === 3 && !selectedItem.value) {
      activeDepth.value = 2
    }
    if (activeDepth.value === 2 && !selectedShop.value) {
      activeDepth.value = 1
    }
  }
}

onMounted(() => {
  loadFromStorage()
  selectedServer.value = isLoggedIn.value ? currentUser.value.server : '新東京'
  shuffleShops()
  handleUrlNavigation()
  window.addEventListener('resize', checkWindowSize)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkWindowSize)
})
</script>

<style scoped>
/* 頁面基本動畫與配色 - 優化為綠色主題 (Razer霓虹綠) */
.share-page {
  animation: fadeIn 0.4s ease-out;
  color: #fff;
  min-height: 100vh;
  padding: 20px 0;
  font-family: 'Noto Sans TC', sans-serif;
  --color-gold: #00ff99; /* 主題色改為霓虹綠 */
  --color-dark-blue: #0c120f;
  --color-border: rgba(0, 255, 153, 0.15); /* 綠色透明框線 */
  --color-bg-panel: rgba(12, 18, 15, 0.85); /* 帶有暗綠質地的面板背景 */
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
  gap: 20px;
}

.neon-text-qigong {
  font-family: 'Noto Serif TC', serif;
  font-size: 2rem;
  font-weight: 800;
  color: var(--color-gold);
  text-shadow: 0 0 10px rgba(0, 255, 153, 0.4);
}

.subtitle {
  color: #8c9c94;
  font-size: 0.9rem;
  margin-top: 5px;
}

.help-btn {
  background: rgba(0, 255, 153, 0.03);
  color: #8c9c94;
  border: 1px solid var(--color-border);
  padding: 8px 16px;
  border-radius: 6px;
  font-weight: 700;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;
}

.help-btn:hover {
  background: rgba(0, 255, 153, 0.1);
  color: #fff;
  border-color: rgba(0, 255, 153, 0.4);
  box-shadow: 0 0 8px rgba(0, 255, 153, 0.2);
}

.fav-badge {
  background: #ff4b4b;
  color: #fff;
  font-size: 0.75rem;
  padding: 2px 6px;
  border-radius: 10px;
  margin-left: 4px;
}

/* 麵包屑導航 */
.breadcrumb-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  margin-bottom: 25px;
  background: var(--color-bg-panel);
  border: 1px solid var(--color-border);
}

.breadcrumb-list {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  color: #8c9c94;
  flex-wrap: wrap;
}

.breadcrumb-item {
  cursor: pointer;
  transition: color 0.3s;
}

.breadcrumb-item:hover {
  color: var(--color-gold);
}

.breadcrumb-item.active-item-crumb {
  color: #fff;
  font-weight: 700;
}

.breadcrumb-separator {
  color: rgba(0, 255, 153, 0.2);
}

.mobile-back-btn {
  display: none;
}

/* 三欄 Miller Columns 佈局 */
.miller-columns-wrapper {
  display: flex;
  gap: 20px;
  align-items: stretch;
  width: 100%;
  height: calc(100vh - 220px);
  min-height: 580px;
  overflow: hidden;
}

.miller-column {
  background: var(--color-bg-panel);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
  overflow: hidden;
  box-sizing: border-box;
  position: relative;
}

.column-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  flex-shrink: 0;
}

.column-header h3 {
  font-size: 1.1rem;
  font-weight: 800;
  color: #fff;
}

/* 寬度動態分配 (寬螢幕模式下) */
@media (min-width: 821px) {
  .depth-1 .level-1 {
    width: 600px;
    margin: 0 auto;
    opacity: 1;
  }
  .depth-1 .level-2,
  .depth-1 .level-3 {
    width: 0;
    margin: 0;
    padding: 0;
    opacity: 0;
    border: none;
    pointer-events: none;
  }

  .depth-2 .level-1 {
    width: calc(50% - 10px);
  }
  .depth-2 .level-2 {
    width: calc(50% - 10px);
    opacity: 1;
  }
  .depth-2 .level-3 {
    width: 0;
    margin: 0;
    padding: 0;
    opacity: 0;
    border: none;
    pointer-events: none;
  }

  .depth-3 .level-1 {
    width: 320px;
  }
  .depth-3 .level-2 {
    width: 320px;
  }
  .depth-3 .level-3 {
    flex: 1;
    opacity: 1;
  }
}

/* 搜尋與篩選 */
.search-filter-box {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 15px 20px;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.type-select {
  background: rgba(8, 13, 10, 0.85);
  border: 1px solid var(--color-border);
  color: #fff;
  padding: 8px 12px;
  border-radius: 6px;
  outline: none;
  font-weight: 700;
  cursor: pointer;
  width: 100%;
}

.type-select:focus {
  border-color: var(--color-gold);
}

.search-input-wrapper {
  display: flex;
  width: 100%;
  gap: 6px;
}

.search-input {
  flex: 1;
  background: rgba(8, 13, 10, 0.85);
  border: 1px solid var(--color-border);
  color: #fff;
  padding: 8px 12px;
  border-radius: 6px;
  outline: none;
  font-size: 0.85rem;
}

.search-input:focus {
  border-color: var(--color-gold);
}

.search-btn {
  background: rgba(0, 255, 153, 0.05);
  border: 1px solid var(--color-border);
  color: #fff;
  border-radius: 6px;
  padding: 0 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
}

.search-btn:hover {
  background: rgba(0, 255, 153, 0.15);
  border-color: rgba(0, 255, 153, 0.4);
}

.create-shop-btn {
  background: rgba(0, 255, 153, 0.08);
  color: #fff;
  border: 1px solid var(--color-gold);
  padding: 6px 14px;
  border-radius: 6px;
  font-weight: 700;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.3s;
}

.create-shop-btn:hover {
  background: var(--color-gold);
  color: #000;
  box-shadow: 0 0 10px rgba(0, 255, 153, 0.4);
}

/* 商店列表與商品列表滾動容器：規格設定為等大 (475px)，一次一眼呈現 5 筆卡片 */
.shop-list-container,
.item-list-container {
  flex: 1; /* 彈性填滿剩餘高度，防止超出被外層容器裁切 */
  max-height: 578px; /* (100px卡片*5 + 12px間距*4) + 15px頂部間距 + 15px底部間距 = 578px */
  min-height: 0; /* Flex 佈局防止溢出 */
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px; /* 統一卡片間距為 12px */
  padding: 15px 20px 15px; /* 頂端與底端留出 15px 間距 */
  box-sizing: border-box;
  overscroll-behavior: contain;
}

/* 底部防裁切滾動 spacer */
.scroll-spacer {
  height: 15px;
  flex-shrink: 0;
}

/* 商店卡片加大調整：高度固定為 85px，與商品卡片完全同大 */
.shop-card {
  height: 100px; /* 從 85px 加大為 100px */
  box-sizing: border-box;
  padding: 14px 18px; /* 寬裕的 padding，字元空間更充裕 */
  margin: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  background: rgba(30, 35, 32, 0.4);
  border: 1px solid rgba(0, 255, 153, 0.08);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.25s;
  border-left: 4px solid transparent;
  flex-shrink: 0; /* 防止 Flex 容器高度限制下卡片被壓縮 */
}

.shop-card:hover {
  border-left: 4px solid rgba(0, 255, 153, 0.4);
  background: rgba(0, 255, 153, 0.015);
  border-color: rgba(0, 255, 153, 0.2);
}

.shop-card.active-card {
  border-left-color: var(--color-gold);
  background: rgba(0, 255, 153, 0.05) !important;
  box-shadow: 0 0 15px rgba(0, 255, 153, 0.1);
  border-color: var(--color-gold) !important;
}

.shop-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.shop-name {
  font-size: 0.94rem;
  font-weight: 700;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.my-shop-badge {
  font-size: 0.7rem;
  color: #ff9f43;
  margin-left: 4px;
}

.shop-owner {
  font-size: 0.76rem;
  color: #8c9c94;
  margin-bottom: 4px;
}

.owner-name {
  color: var(--color-gold);
  font-weight: 700;
}

.shop-meta-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.72rem;
  color: #8c9c94;
}

.shop-server {
  color: var(--color-gold);
  font-weight: 700;
}

/* 簡化收合按鈕 (規格：放在 .shop-seller-info-header sticky-header glass-card 框框內) */
.close-column-btn.inner-box-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  background: rgba(0, 255, 153, 0.04);
  border: 1px solid var(--color-border);
  color: var(--color-gold);
  border-radius: 4px;
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 1.1rem;
  font-weight: 800;
  transition: all 0.25s;
  z-index: 15;
}

.close-column-btn.inner-box-btn:hover {
  background: rgba(255, 107, 107, 0.15);
  color: #ff6b6b;
  border-color: rgba(255, 107, 107, 0.3);
  box-shadow: 0 0 8px rgba(255, 107, 107, 0.2);
}

/* 第二層 Header */
.shop-seller-info-header {
  padding: 16px;
  margin: 15px 15px 12px;
  border: 1px solid var(--color-border);
  background: rgba(12, 18, 15, 0.75);
  flex-shrink: 0;
  position: sticky;
  top: 0;
  z-index: 10;
}

.title-with-status {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-right: 35px; /* 避開右上角收合按鈕 */
  flex-wrap: wrap;
}

.shop-status-text {
  font-size: 0.75rem;
  font-weight: 700;
}

.shop-status-text.open {
  color: var(--color-gold);
}

.shop-status-text.closed {
  color: #ff9f43;
}

/* 賣家資訊折疊區切換按鈕 */
.toggle-info-box {
  margin-top: 6px;
}

.collapse-toggle-btn {
  background: transparent;
  border: none;
  color: var(--color-gold);
  font-size: 0.78rem;
  cursor: pointer;
  padding: 2px 0;
  font-weight: 700;
  text-decoration: underline;
  outline: none;
}

/* 折疊動畫與過渡效果 */
.collapse-fade-enter-active, .collapse-fade-leave-active {
  transition: all 0.3s ease;
  max-height: 250px;
  overflow: hidden;
}

.collapse-fade-enter-from, .collapse-fade-leave-to {
  max-height: 0;
  opacity: 0;
  padding-top: 0;
  padding-bottom: 0;
}

.collapsible-info-content {
  overflow: hidden; /* 防止 transition 結束後移除 overflow-hidden 導致 margin collapsing 抖動 */
}

/* 控制功能工具列 */
.shop-control-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
  margin-bottom: 10px;
}

.shop-control-bar .help-btn {
  padding: 5px 10px;
  font-size: 0.76rem;
}

.shop-details-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 6px;
  font-size: 0.75rem;
  color: #8c9c94;
  margin-top: 10px;
  margin-bottom: 10px;
}

@media (min-width: 1000px) {
  .shop-details-grid {
    grid-template-columns: 1fr 1fr;
  }
}

.shop-notice-bubble {
  background: rgba(0, 0, 0, 0.3);
  border-left: 3px solid var(--color-gold);
  padding: 10px 14px;
  border-radius: 4px;
  font-size: 0.8rem;
  color: #c4d4cc;
  line-height: 1.5;
  margin-top: 10px;
}

.notice-list {
  list-style-type: decimal;
  padding-left: 18px;
  margin-top: 6px;
}

.notice-list li {
  margin-bottom: 4px;
}

.drag-hint-text {
  font-size: 0.68rem;
  color: var(--color-gold);
  margin-top: 8px;
  font-style: italic;
}

/* 商品卡片樣式：高度固定為 85px，與第一層完全同大，比照配點模擬器 */
.item-row.skill-row-style {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 100px; /* 與第一層商店卡片完全等高 100px */
  box-sizing: border-box;
  padding: 14px 18px; /* 寬裕 padding，給予充足空間，比照配點模擬器 */
  background: rgba(30, 35, 32, 0.6);
  border: 1px solid rgba(0, 255, 153, 0.08);
  border-radius: 8px;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  user-select: none;
  opacity: 0.88;
  flex-shrink: 0; /* 防止 Flex 壓縮卡片高度 */
}

.item-row.skill-row-style:hover {
  background: rgba(40, 50, 45, 0.8);
  border-color: rgba(0, 255, 153, 0.3);
  box-shadow: 0 0 10px rgba(0, 255, 153, 0.15);
  opacity: 1;
}

.item-row.skill-row-style.active-row {
  background: rgba(0, 255, 153, 0.08) !important;
  border-color: var(--color-gold) !important;
  box-shadow: 0 0 14px rgba(0, 255, 153, 0.3) !important;
  opacity: 1;
}

.item-row.skill-row-style.sold-out-row {
  opacity: 0.5;
  background: rgba(20, 20, 20, 0.4);
  border-color: rgba(255, 255, 255, 0.04);
}

.draggable-editing {
  cursor: grab;
}
.draggable-editing:active {
  cursor: grabbing;
}

.drag-handle-icon {
  color: #5c6c64;
  margin-right: 8px;
  font-size: 1rem;
  cursor: grab;
}

.item-row-left {
  display: flex;
  align-items: center;
  flex: 1;
  gap: 6px;
  min-width: 0;
}

.item-row-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 0;
}

.item-name-line {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.item-name {
  font-size: 0.94rem;
  font-weight: 700;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 140px;
}

.type-tag {
  font-size: 0.65rem;
  padding: 1px 5px;
  background: rgba(0, 255, 153, 0.08);
  border-radius: 3px;
  color: #a4b4ac;
}

.sort-val-badge {
  font-size: 0.65rem;
  color: var(--color-gold);
  border: 1px solid rgba(0, 255, 153, 0.3);
  padding: 1px 4px;
  border-radius: 3px;
  font-weight: 700;
}

.sold-badge {
  font-size: 0.65rem;
  background: rgba(255, 255, 255, 0.15);
  color: #8c9c94;
  padding: 1px 5px;
  border-radius: 3px;
}

.item-req-line {
  font-size: 0.72rem;
  color: #7c8c84;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-row-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.item-price {
  font-family: monospace;
}

.price-val {
  font-size: 0.96rem;
  font-weight: 700;
  color: var(--color-gold);
}

.price-unit {
  font-size: 0.7rem;
  color: var(--color-gold);
  margin-left: 2px;
}

.row-fav-btn {
  background: none;
  border: none;
  color: #ff4b4b;
  font-size: 1.1rem;
  cursor: pointer;
  padding: 2px;
  transition: transform 0.2s;
  outline: none;
}

.row-fav-btn:hover {
  transform: scale(1.2);
}

/* 行內編輯樣式 */
.inline-edit-group {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.inline-input-name {
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid var(--color-border);
  color: #fff;
  padding: 4px 6px;
  border-radius: 4px;
  font-size: 0.82rem;
  width: 90px;
}

.inline-sort-change {
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 0.7rem;
  color: #8c9c94;
}

.inline-input-sort {
  width: 38px;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid var(--color-border);
  color: var(--color-gold);
  padding: 3px 2px;
  border-radius: 4px;
  text-align: center;
}

.inline-input-price {
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid var(--color-border);
  color: var(--color-gold);
  padding: 4px 6px;
  border-radius: 4px;
  font-size: 0.82rem;
  width: 65px;
  text-align: right;
  font-family: monospace;
}

.inline-edit-price-wrapper {
  display: flex;
  align-items: center;
  gap: 2px;
}

/* 空狀態 */
.empty-column-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100px; /* 與卡片等高 */
  box-sizing: border-box;
  padding: 20px;
  text-align: center;
  color: #8c9c94;
  font-size: 0.88rem;
  border: 1px dashed rgba(0, 255, 153, 0.18);
  background: rgba(30, 35, 32, 0.2);
  border-radius: 8px;
  width: 100%;
  flex-shrink: 0;
}

.empty-column-state p {
  word-break: break-all;
  line-height: 1.5;
  max-width: 100%;
}

/* 商品詳情層 (第三層，與第一二層等高) */
.detail-container {
  padding: 25px;
  flex: 1; /* 與一、二層高度行為對齊 */
  max-height: 578px; /* 與一、二層等高 */
  min-height: 0;
  overflow-y: auto;
  box-sizing: border-box;
  overscroll-behavior: contain;
}

.outdate-warning-box {
  background: rgba(255, 75, 75, 0.08);
  border: 1px solid rgba(255, 75, 75, 0.2);
  color: #ff4b4b;
  padding: 10px 15px;
  border-radius: 6px;
  font-size: 0.8rem;
  margin-bottom: 20px;
  font-weight: 700;
}

.detail-header-panel {
  display: flex;
  gap: 20px;
  align-items: flex-start;
  margin-bottom: 20px;
}

.detail-img-box {
  width: 140px;
  height: 140px;
  border-radius: 8px;
  border: 2px solid var(--color-border);
  background: #000;
  overflow: hidden;
  position: relative;
  cursor: zoom-in;
}

.detail-img-box img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.img-zoom-hint {
  position: absolute;
  bottom: 0;
  width: 100%;
  text-align: center;
  background: rgba(0,0,0,0.6);
  font-size: 0.65rem;
  padding: 3px 0;
  color: rgba(255,255,255,0.7);
}

.detail-main-meta {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-title-line {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 15px;
}

.detail-name {
  font-size: 1.5rem;
  font-weight: 800;
  color: #fff;
}

.detail-status-badge {
  font-size: 0.75rem;
  padding: 3px 8px;
  border-radius: 4px;
  font-weight: 700;
}

.detail-status-badge.刊登中 {
  background: rgba(0,255,153,0.1);
  color: #00ff99;
}

.detail-status-badge.已售出 {
  background: rgba(138, 144, 160, 0.15);
  color: #8c9c94;
}

.detail-badge-row {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.detail-badge {
  font-size: 0.7rem;
  background: rgba(255,255,255,0.04);
  border: 1px solid var(--color-border);
  padding: 3px 8px;
  border-radius: 4px;
  color: #8c9c94;
}

.detail-badge.fav-count {
  border-color: rgba(255, 75, 75, 0.2);
  color: #ff4b4b;
}

.detail-price-box {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-top: 8px;
}

.price-label {
  font-size: 0.85rem;
  color: #8c9c94;
}

.price-amount {
  font-size: 1.6rem;
  font-weight: 800;
  color: var(--color-gold);
  font-family: monospace;
}

.fav-toggle-big-btn {
  background: rgba(255, 75, 75, 0.15);
  border: 1px solid #ff4b4b;
  color: #ff4b4b;
  padding: 8px 18px;
  border-radius: 6px;
  font-weight: 700;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.3s;
}

.fav-toggle-big-btn:hover {
  background: #ff4b4b;
  color: #fff;
  box-shadow: 0 0 10px rgba(255, 75, 75, 0.4);
}

.fav-toggle-big-btn.is-faved {
  background: #ff4b4b;
  color: #fff;
}

.divider {
  border: none;
  height: 1px;
  background: linear-gradient(90deg, var(--color-border), transparent);
  margin: 20px 0;
}

.detail-section {
  margin-bottom: 22px;
}

.section-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: #fff;
  border-left: 3px solid var(--color-gold);
  padding-left: 8px;
  margin-bottom: 10px;
}

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
  gap: 8px;
  background: rgba(255,255,255,0.015);
  padding: 6px 12px;
  border-radius: 4px;
  border: 1px solid rgba(255,255,255,0.03);
}

.stat-bullet {
  color: var(--color-gold);
}

.stat-text {
  font-size: 0.85rem;
}

.giver-notes {
  background: rgba(0, 255, 153, 0.01);
  border-left: 3px solid rgba(0, 255, 153, 0.3);
  padding: 12px 16px;
  border-radius: 4px;
  font-size: 0.85rem;
  color: #8c9c94;
  font-style: italic;
  line-height: 1.5;
}

/* 後台管理選單 */
.management-panel {
  margin-top: 30px;
  border: 1px dashed rgba(0, 255, 153, 0.3);
  padding: 20px;
}

.mgmt-title {
  font-size: 0.95rem;
  font-weight: 800;
  color: #fff;
  margin-bottom: 15px;
}

.mgmt-btn-group {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.mgmt-btn {
  background: rgba(255,255,255,0.04);
  border: 1px solid var(--color-border);
  color: #fff;
  padding: 8px 14px;
  border-radius: 6px;
  font-size: 0.8rem;
  cursor: pointer;
  font-weight: 700;
  transition: all 0.3s;
}

.mgmt-btn:hover {
  background: rgba(255,255,255,0.1);
}

.mgmt-btn.primary {
  background: rgba(0, 255, 153, 0.15);
  border-color: var(--color-gold);
  color: var(--color-gold);
}

.mgmt-btn.primary:hover {
  background: var(--color-gold);
  color: #000;
}

.mgmt-btn.danger {
  background: rgba(255, 107, 107, 0.1);
  border-color: #ff6b6b;
  color: #ff6b6b;
}

.mgmt-btn.danger:hover {
  background: #ff6b6b;
  color: #fff;
}

.mgmt-btn.danger-outline {
  border-color: rgba(255, 107, 107, 0.3);
  color: rgba(255, 107, 107, 0.7);
}

.mgmt-btn.danger-outline:hover {
  border-color: #ff6b6b;
  color: #ff6b6b;
}

/* 收藏夾側邊抽屜 */
.favorite-drawer-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0,0,0,0.6);
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.favorite-drawer {
  position: absolute;
  top: 0;
  right: 0;
  width: 360px;
  height: 100%;
  background: #090e0c;
  border-left: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}

.drawer-header {
  padding: 20px;
  border-bottom: 1px solid var(--color-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.drawer-header h3 {
  font-size: 1.1rem;
  font-weight: 800;
}

.close-drawer-btn {
  background: none;
  border: none;
  color: #8c9c94;
  font-size: 1.2rem;
  cursor: pointer;
}

.drawer-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.empty-drawer {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  margin-top: 60px;
  color: #5c6c64;
}

.empty-drawer .heart-icon {
  font-size: 2.5rem;
  margin-bottom: 12px;
}

.fav-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.fav-card {
  padding: 14px;
  cursor: pointer;
  border-left: 3px solid transparent;
  transition: all 0.25s;
}

.fav-card:hover {
  border-left-color: #ff4b4b;
  background: rgba(255, 255, 255, 0.015);
}

.fav-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.fav-item-name {
  font-weight: 700;
  color: #fff;
  font-size: 0.9rem;
}

.remove-fav-icon {
  background: none;
  border: none;
  color: #5c6c64;
  cursor: pointer;
  font-size: 0.85rem;
}

.remove-fav-icon:hover {
  color: #ff6b6b;
}

.fav-card-meta {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: #8c9c94;
  margin-bottom: 6px;
}

.fav-card-time {
  font-size: 0.7rem;
  color: #4c5c54;
  text-align: right;
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
  z-index: 1100;
  display: flex;
  justify-content: center;
  align-items: center;
}

.modal-content {
  padding: 30px;
  background: #080d0a;
  border-radius: 8px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-title {
  font-family: 'Noto Serif TC', serif;
  font-size: 1.4rem;
  margin-bottom: 12px;
  color: var(--color-gold);
}

.modal-hint-text {
  font-size: 0.8rem;
  color: #8c9c94;
  margin-bottom: 20px;
  line-height: 1.5;
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
  font-size: 0.8rem;
  font-weight: 700;
  color: #8c9c94;
}

.form-group label .required {
  color: #ff6b6b;
}

.form-group input, .form-group select, .form-group textarea {
  background: rgba(4, 8, 6, 0.95);
  border: 1px solid var(--color-border);
  padding: 10px 14px;
  border-radius: 6px;
  color: #fff;
  outline: none;
  font-size: 0.88rem;
}

.form-group input:focus, .form-group select:focus, .form-group textarea:focus {
  border-color: var(--color-gold);
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
  font-size: 0.88rem;
  cursor: pointer;
  transition: all 0.25s;
}

.modal-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.modal-btn.cancel {
  background: transparent;
  border: 1px solid var(--color-border);
  color: #8c9c94;
}

.modal-btn.cancel:hover:not(:disabled) {
  color: #fff;
  background: rgba(255,255,255,0.05);
}

.modal-btn.confirm {
  background: rgba(0, 255, 153, 0.15);
  border: 1px solid var(--color-gold);
  color: #fff;
}

.modal-btn.confirm:hover:not(:disabled) {
  background: var(--color-gold);
  color: #000;
  box-shadow: 0 0 10px rgba(0, 255, 153, 0.4);
}

.logged-in-status, .not-logged-in-status {
  background: rgba(255,255,255,0.01);
  padding: 15px;
  border-radius: 6px;
  border: 1px solid var(--color-border);
  font-size: 0.85rem;
  line-height: 1.6;
}

.submitting-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(8, 13, 10, 0.9);
  z-index: 10;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.loader-spinner {
  border: 3px solid rgba(0, 255, 153, 0.1);
  border-top: 3px solid var(--color-gold);
  border-radius: 50%;
  width: 36px;
  height: 36px;
  animation: spin 1s linear infinite;
  margin-bottom: 12px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loader-text {
  font-size: 0.85rem;
  color: var(--color-gold);
}

/* Toast */
.toast-message {
  position: fixed;
  bottom: 30px;
  right: 30px;
  padding: 12px 24px;
  background: #080d0a;
  border: 1px solid var(--color-gold);
  box-shadow: 0 0 15px rgba(0, 255, 153, 0.25);
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 10px;
  z-index: 1200;
}

.toast-icon {
  font-size: 1.1rem;
}

.toast-text {
  font-size: 0.85rem;
  font-weight: 700;
  color: #fff;
}

.toast-enter-active, .toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from, .toast-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

/* RWD 響應式優化 */
@media (max-width: 820px) {
  .page-header {
    flex-direction: column;
    gap: 15px;
    align-items: flex-start;
  }

  .header-actions {
    width: 100%;
    overflow-x: auto;
    padding-bottom: 5px;
  }

  .breadcrumb-bar {
    padding: 10px 15px;
  }

  .mobile-back-btn {
    display: block;
    padding: 5px 12px;
  }

  .miller-columns-wrapper {
    position: relative;
    height: calc(100vh - 280px);
    min-height: 480px;
  }

  .miller-column {
    width: 100% !important;
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    z-index: 1;
  }

  .miller-column.hidden {
    display: none !important;
  }

  .depth-1 .level-1 { display: flex !important; z-index: 5; }
  .depth-1 .level-2, .depth-1 .level-3 { display: none !important; }

  .depth-2 .level-2 { display: flex !important; z-index: 5; }
  .depth-2 .level-1, .depth-2 .level-3 { display: none !important; }

  .depth-3 .level-3 { display: flex !important; z-index: 5; }
  .depth-3 .level-1, .depth-3 .level-2 { display: none !important; }

  .detail-header-panel {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .detail-img-box {
    width: 120px;
    height: 120px;
  }

  .detail-title-line {
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .detail-badge-row {
    justify-content: center;
  }

  .detail-price-box {
    justify-content: center;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }
  
  .shop-seller-info-header {
    margin: 10px 10px 0;
  }
}
</style>
