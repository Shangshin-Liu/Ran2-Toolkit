<template>
  <div class="app-container">
    <!-- 電競背景特效 -->
    <div class="bg-grid"></div>
    <div class="bg-radial"></div>

    <!-- 子頁面通用導覽 Header (首頁不顯示) -->
    <header v-if="route.path !== '/'" class="sub-header">
      <div class="header-content">
        <router-link to="/" class="logo-link">
          <img src="/assets/logo.jpg" alt="Ran2 Logo" class="header-logo" />
          <span class="header-title neon-text-snipper">亂2萬事通</span>
        </router-link>
        <nav class="nav-links">
          <router-link to="/parties" class="nav-btn" active-class="active-warrior">練功團</router-link>
          <router-link to="/share" class="nav-btn" active-class="active-qigong">好物分享</router-link>
          <router-link to="/boxes" class="nav-btn" active-class="active-box">禮盒查詢</router-link>
          <router-link to="/tasks" class="nav-btn" active-class="active-snipper">任務指南</router-link>
        </nav>
        <div class="header-auth">
          <button @click="openContactModal" class="btn-contact" title="聯絡我們">📞 聯絡我們</button>
          <span v-if="isLoggedIn" class="user-info">
            <span class="user-name">[{{ currentUser.server }}][{{ currentUser.school }}][{{ currentUser.dept }}]{{ currentUser.charId }}</span>
            <button @click="handleHeaderLogout" class="btn-logout" title="登出">登出</button>
          </span>
          <span v-else class="visitor-info">
            <span class="visitor-text">訪客模式</span>
            <router-link to="/" class="btn-login-link">去登入</router-link>
          </span>
        </div>
      </div>
    </header>

    <!-- 頁面切換 -->
    <main class="main-content" :class="{ 'is-home': route.path === '/' }">
      <router-view />
    </main>

    <!-- 頁面跳轉遮罩 -->
    <transition name="mask">
      <div v-if="isTransitioning" class="page-transition-mask"></div>
    </transition>

    <!-- 全局 Footer，特別在手機版上優化 -->
    <footer class="app-footer">
      <p style="margin-bottom: 8px;">© 2026 亂2萬事通 - Design By 幻海奇緣</p>
      <div class="disclaimer-text" style="font-size: 0.78rem; line-height: 1.6; opacity: 0.75; max-width: 800px; margin: 0 auto; padding-top: 6px; border-top: 1px dashed rgba(255,255,255,0.05);">
        <p>本站為玩家獨立架設之非營利遊戲資訊站。</p>
        <p>本站所刊登、引用之遊戲內所有圖像、文字數據、商標及相關資產，其版權均歸《依斯楚互動娛樂股份有限公司》及《亂2 Online》官方所有。</p>
        <p>本站與官方無任何關聯，若有任何侵權疑慮，請透過上方的"聯絡我們"功能聯絡我方，我們將立即配合處理。</p>
      </div>
    </footer>

    <!-- 📞 聯絡我們 Modal -->
    <div class="modal-overlay" v-if="showContactModal" @click="showContactModal = false" style="z-index: 9999;">
      <div class="modal-content glass-card" @click.stop style="width: 550px; max-width: 95%;">
        <button class="modal-close-btn" @click="showContactModal = false">✕</button>
        <h3 class="modal-title neon-text-contact" style="margin-bottom: 20px; text-align: center; font-weight: 800; font-size: 1.4rem;">📞 聯絡我們</h3>
        
        <!-- Tab 切換 -->
        <div class="tab-header" style="display: flex; gap: 10px; margin-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 10px;">
          <button 
            class="tab-btn" 
            :class="{ 'active-tab': activeContactTab === 'discord' }" 
            @click="activeContactTab = 'discord'"
          >
            💬 Discord 聯絡
          </button>
          <button 
            class="tab-btn" 
            :class="{ 'active-tab': activeContactTab === 'email' }" 
            @click="activeContactTab = 'email'"
          >
            ✉️ 電子郵件
          </button>
        </div>

        <div class="modal-body">
          <!-- Discord Tab -->
          <div v-if="activeContactTab === 'discord'">
            <div class="input-group">
              <label class="input-label">聯絡標題</label>
              <input 
                type="text" 
                class="modal-text-input" 
                v-model="contactTitle"
                placeholder="請輸入主旨，例如：網站功能建議、Bug 回報..."
                required
              />
            </div>

            <div class="input-group">
              <label class="input-label">提供者 / 聯絡方式 (自由填寫)</label>
              <input 
                type="text" 
                class="modal-text-input" 
                v-model="contactProvider"
                placeholder="例如：小明 [聖門][劍道部] 或 Discord ID、Email 等..."
              />
            </div>

            <div class="input-group">
              <label class="input-label">聯絡內容</label>
              <textarea 
                v-model="contactContent" 
                class="modal-text-input" 
                rows="5" 
                placeholder="請詳細填寫您想說的話或回報的內容..."
                required
              ></textarea>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 12px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 15px;">
              <button class="modal-btn cancel" @click="showContactModal = false">取消</button>
              <button class="modal-btn confirm" @click="handleSendContact" :disabled="isSendingContact">確認送出</button>
            </div>
          </div>

          <!-- Email Tab -->
          <div v-if="activeContactTab === 'email'" style="text-align: center; padding: 20px 0 10px 0;">
            <p style="font-size: 1.05rem; margin-bottom: 15px; color: #fff;">您可以寄信至我們的電子郵件信箱：</p>
            <div style="display: inline-flex; align-items: center; gap: 10px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); padding: 12px 20px; border-radius: 8px; margin-bottom: 20px;">
              <span style="font-size: 1.1rem; font-weight: 700; color: #00e5ff; letter-spacing: 0.5px;">some91347@gmail.com</span>
              <button class="copy-email-btn" @click="handleCopyEmail" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #fff; padding: 4px 10px; border-radius: 4px; font-size: 0.8rem; cursor: pointer; transition: all 0.2s;">
                {{ hasCopied ? '✓ 已複製' : '📋 複製' }}
              </button>
            </div>
            <p style="font-size: 0.85rem; color: var(--text-muted);">歡迎來信提供建議，我們會儘快抽空回信，謝謝！</p>
            
            <div style="display: flex; justify-content: flex-end; margin-top: 30px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 15px;">
              <button class="modal-btn cancel" @click="showContactModal = false">關閉</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, provide } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth.js'

const route = useRoute()
const router = useRouter()
const isTransitioning = ref(false)

const { currentUser, isLoggedIn, logout } = useAuth()

const handleHeaderLogout = () => {
  logout()
  router.push('/')
}

// --- 📞 聯絡我們功能相關變數與邏輯 ---
const showContactModal = ref(false)
const activeContactTab = ref('discord')
const contactTitle = ref('')
const contactProvider = ref('')
const contactContent = ref('')
const isSendingContact = ref(false)
const hasCopied = ref(false)

const openContactModal = () => {
  contactTitle.value = ''
  contactProvider.value = ''
  contactContent.value = ''
  hasCopied.value = false
  activeContactTab.value = 'discord'
  showContactModal.value = true
}

provide('openContactModal', openContactModal)

const handleCopyEmail = () => {
  navigator.clipboard.writeText('some91347@gmail.com')
  hasCopied.value = true
  setTimeout(() => {
    hasCopied.value = false
  }, 2000)
}

const handleSendContact = async () => {
  if (!contactTitle.value.trim()) {
    alert('請輸入聯絡標題！')
    return
  }
  if (!contactContent.value.trim()) {
    alert('請輸入聯絡內容！')
    return
  }

  isSendingContact.value = true
  try {
    const webhookUrl = import.meta.env.VITE_DISCORD_CONTACT_WEBHOOK_URL || ''
    if (!webhookUrl) {
      console.warn('未設定 Discord 聯絡 Webhook 網址，跳過發送並模擬成功')
    } else {
      const provider = contactProvider.value.trim() || '未填寫'
      const payload = {
        username: "RAN2 聯絡我們小助手",
        avatar_url: "https://ran2-toolkit.web.app/assets/logo.jpg",
        embeds: [{
          title: `📞 收到聯絡信件：${contactTitle.value}`,
          color: 589823, // 藍色/青色 (#09ffff)
          fields: [
            { name: "👤 提供者 / 聯絡方式", value: provider, inline: false },
            { name: "📝 聯絡內容", value: contactContent.value }
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
        throw new Error(`Discord Webhook 回傳錯誤: ${res.statusText}`)
      }
    }

    showContactModal.value = false
    alert('您的聯絡訊息已送出，感謝您的回饋！')
  } catch (err) {
    console.error('發送聯絡訊息失敗:', err)
    alert('發送失敗：' + err.message)
  }
  isSendingContact.value = false
}

// 路由跳轉前顯示遮罩，並等待遮罩蓋上後再跳轉
router.beforeEach(async (to, from, next) => {
  if (to.path !== from.path) {
    isTransitioning.value = true
    // 等待遮罩淡入動畫完成 (0.35s)
    await new Promise(resolve => setTimeout(resolve, 350))
  }
  next()
})

// 路由跳轉後隱藏遮罩
router.afterEach(() => {
  // 稍微延遲一下確保畫面已渲染完成
  setTimeout(() => {
    isTransitioning.value = false
  }, 50)
})
</script>

<style scoped>
.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
}

.sub-header {
  background: rgba(8, 9, 13, 0.9);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(12px);
  position: sticky;
  top: 0;
  z-index: 100;
  padding: 12px 24px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.5);
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo-link {
  display: flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
}

.header-logo {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid rgba(255,255,255,0.2);
  object-fit: cover;
}

.header-title {
  font-size: 1.25rem;
  font-weight: 800;
  letter-spacing: 1px;
}

.nav-links {
  display: flex;
  gap: 16px;
}

.nav-btn {
  color: var(--text-muted);
  text-decoration: none;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid transparent;
  transition: all 0.25s ease;
  font-size: 0.95rem;
}

.nav-btn:hover {
  color: var(--text-main);
  background: rgba(255, 255, 255, 0.05);
}

/* 各個分頁 Active 的霓虹光暈 */
.active-snipper {
  color: var(--color-snipper) !important;
  border-color: var(--color-snipper) !important;
  box-shadow: 0 0 10px rgba(0, 229, 255, 0.2);
  background: rgba(0, 229, 255, 0.05);
}
.active-box {
  color: var(--color-box) !important;
  border-color: var(--color-box) !important;
  box-shadow: 0 0 10px rgba(200, 0, 255, 0.2);
  background: rgba(200, 0, 255, 0.05);
}
.active-warrior {
  color: var(--color-warrior) !important;
  border-color: var(--color-warrior) !important;
  box-shadow: 0 0 10px rgba(255, 0, 85, 0.2);
  background: rgba(255, 0, 85, 0.05);
}
.active-qigong {
  color: var(--color-qigong) !important;
  border-color: var(--color-qigong) !important;
  box-shadow: 0 0 10px rgba(0, 255, 102, 0.2);
  background: rgba(0, 255, 102, 0.05);
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.main-content:not(.is-home) {
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
  padding: 30px 20px;
}

.app-footer {
  text-align: center;
  padding: 20px;
  color: var(--text-muted);
  font-size: 0.85rem;
  border-top: 1px solid rgba(255,255,255,0.02);
}

/* 頁面跳轉遮罩 */
.page-transition-mask {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: #0d0f17; /* 遊戲風格深色底 */
  z-index: 9999;
  pointer-events: none; /* 防止遮罩時阻擋操作，雖然過渡很短 */
}

.mask-enter-active,
.mask-leave-active {
  transition: opacity 0.35s ease;
}

.mask-enter-from,
.mask-leave-to {
  opacity: 0;
}

/* 登入狀態樣式 */
.header-auth {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.85rem;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-main);
  background: rgba(255, 255, 255, 0.05);
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.user-name {
  color: #00e5ff;
  font-weight: 600;
  text-shadow: 0 0 5px rgba(0, 229, 255, 0.3);
}

.btn-logout {
  background: rgba(255, 0, 85, 0.1);
  border: 1px solid rgba(255, 0, 85, 0.3);
  color: #ff0055;
  padding: 2px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
  transition: all 0.2s ease;
}

.btn-logout:hover {
  background: #ff0055;
  color: #fff;
  box-shadow: 0 0 8px rgba(255, 0, 85, 0.5);
}

.visitor-info {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-muted);
  background: rgba(255, 255, 255, 0.02);
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.visitor-text {
  font-weight: 500;
}

.btn-login-link {
  color: #00e5ff;
  text-decoration: none;
  font-weight: 600;
  border-bottom: 1px dashed #00e5ff;
  font-size: 0.8rem;
}

.btn-login-link:hover {
  color: #fff;
  border-color: #fff;
}

/* 響應式：手機版 (以 iPhone 17 (460px 以下) 為主要適配) */
@media (max-width: 768px) {
  .sub-header {
    padding: 10px 16px;
  }
  
  .header-content {
    flex-direction: column;
    gap: 10px;
  }

  .nav-links {
    width: 100%;
    justify-content: space-around;
    gap: 4px;
  }

  .nav-btn {
    padding: 4px 8px;
    font-size: 0.85rem;
  }

  .header-auth {
    width: 100%;
    justify-content: center;
    margin-top: 2px;
  }
}

/* --- 📞 聯絡我們按鈕與 Modal 樣式 --- */
.btn-contact {
  background: rgba(0, 229, 255, 0.05);
  border: 1px solid rgba(0, 229, 255, 0.3);
  color: #fff;
  padding: 6px 14px;
  border-radius: 6px;
  font-weight: 700;
  font-size: 0.85rem;
  cursor: url('/assets/ran2-cursor.cur'), pointer;
  transition: all 0.3s ease;
  margin-right: 12px;
}

.btn-contact:hover {
  background: rgba(0, 229, 255, 0.15);
  border-color: #00e5ff;
  box-shadow: 0 0 12px rgba(0, 229, 255, 0.3);
  transform: translateY(-1px);
}

.neon-text-contact {
  color: #00e5ff;
  text-shadow: 0 0 10px rgba(0, 229, 255, 0.8), 0 0 20px rgba(0, 229, 255, 0.4);
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(6px);
  z-index: 9999;
  display: flex;
  justify-content: center;
  align-items: center;
}

.modal-content {
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
}

.input-group {
  margin-bottom: 18px;
  text-align: left;
}

.input-label {
  display: block;
  font-size: 0.85rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.55);
  margin-bottom: 8px;
  letter-spacing: 0.5px;
}

.modal-text-input {
  width: 100%;
  background: rgba(13, 14, 19, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.16);
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

.modal-text-input:hover {
  border-color: rgba(0, 229, 255, 0.45);
  background: rgba(18, 20, 27, 0.9);
}

.modal-text-input:focus {
  border-color: #00e5ff;
  background: rgba(10, 11, 15, 0.98);
  box-shadow: 0 0 12px rgba(0, 229, 255, 0.35), inset 0 2px 4px rgba(0, 0, 0, 0.6);
}

.modal-btn {
  background: rgba(8, 9, 13, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #fff;
  padding: 8px 20px;
  border-radius: 6px;
  font-weight: 700;
  cursor: url('/assets/ran2-cursor.cur'), pointer;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.modal-btn.confirm {
  border-color: #00e5ff;
  background: rgba(0, 229, 255, 0.08);
  color: #fff;
  text-shadow: 0 0 8px #00e5ff;
  box-shadow: 0 0 10px rgba(0, 229, 255, 0.1);
}

.modal-btn.confirm:hover {
  background: rgba(0, 229, 255, 0.15);
  box-shadow: 0 0 15px rgba(0, 229, 255, 0.3);
  transform: translateY(-2px);
}

.modal-btn.cancel {
  border-color: rgba(255, 255, 255, 0.1);
  color: var(--text-muted);
}

.modal-btn.cancel:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.3);
  color: #fff;
  transform: translateY(-2px);
}

/* Tab CSS */
.tab-header {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  padding-bottom: 10px;
}

.tab-btn {
  background: transparent;
  border: none;
  color: var(--text-muted);
  padding: 8px 16px;
  font-weight: 700;
  cursor: url('/assets/ran2-cursor.cur'), pointer;
  transition: all 0.2s;
  border-radius: 6px;
}

.tab-btn:hover {
  color: #fff;
  background: rgba(255,255,255,0.03);
}

.tab-btn.active-tab {
  color: #00e5ff;
  background: rgba(0, 229, 255, 0.08);
  text-shadow: 0 0 8px rgba(0, 229, 255, 0.3);
}

.copy-email-btn:hover {
  background: rgba(0, 229, 255, 0.1) !important;
  border-color: #00e5ff !important;
  box-shadow: 0 0 8px rgba(0, 229, 255, 0.2);
}
</style>

