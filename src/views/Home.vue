<template>
  <div class="home-wrapper">
    <!-- Layer 0: Dark textured city background -->
    <img :src="assets.bg" alt="" class="layer-bg" aria-hidden="true" />

    <!-- 首頁登入/註冊入口浮動區塊 -->
    <div class="home-auth-bar">
      <!-- 手機版頂部 Logo -->
      <div class="mobile-logo-title">
        <router-link to="/" class="logo-link">
          <img src="/favicon.png" alt="Ran2 Logo" class="header-logo">
          <span class="header-title neon-text-snipper">亂2萬事通</span>
        </router-link>
      </div>

      <div v-if="isLoggedIn" class="user-badge-container">
        <!-- 桌機版顯示原來的長文字 + 登出 -->
        <div class="desktop-user-badge">
          <button @click="openContactModal" class="btn-home-auth btn-contact-home" style="margin-right: 8px;">📞 聯絡我們</button>
          <span class="user-text">[{{ currentUser.server }}][{{ currentUser.school }}][{{ currentUser.dept }}] {{ currentUser.charId }}</span>
          <button @click="logout" class="btn-home-auth btn-logout-home">登出</button>
        </div>
        
        <!-- 手機版顯示精簡的頭像按鈕與下拉選單 -->
        <div class="mobile-user-badge">
          <button @click="toggleUserDropdown" class="mobile-avatar-btn">
            👤 {{ currentUser.charId }} <span class="arrow-down">▼</span>
          </button>
          
          <transition name="fade-scale">
            <div v-if="showUserDropdown" class="mobile-user-dropdown glass-card">
              <div class="dropdown-item">
                <span class="label">伺服器</span>
                <span class="value">{{ currentUser.server }}</span>
              </div>
              <div class="dropdown-item">
                <span class="label">學院</span>
                <span class="value">{{ currentUser.school }}</span>
              </div>
              <div class="dropdown-item">
                <span class="label">部門</span>
                <span class="value">{{ currentUser.dept }}</span>
              </div>
              <div class="dropdown-item">
                <span class="label">角色ID</span>
                <span class="value">{{ currentUser.charId }}</span>
              </div>
              <button @click="openContactModalAndClose" class="btn-home-auth btn-contact-home dropdown-contact-btn" style="width: 100%; margin-bottom: 8px;">
                📞 聯絡我們
              </button>
              <button @click="logoutAndClose" class="btn-home-auth btn-logout-home dropdown-logout-btn">
                🚪 登出帳號
              </button>
            </div>
          </transition>
        </div>
      </div>
      
      <div v-else class="auth-buttons">
        <button @click="openContactModal" class="btn-home-auth btn-contact-home" style="margin-right: 8px;">📞 聯絡我們</button>
        <button @click="openAuthModal('login')" class="btn-home-auth btn-login-home">登入</button>
        <button @click="openAuthModal('register')" class="btn-home-auth btn-register-home">註冊</button>
      </div>
    </div>



    <!-- 桌面版：3D 弧形選角環 -->
    <div v-if="!isMobile" class="desktop-carousel-container">
      <!-- 左右控制箭頭 -->
      <button class="nav-arrow prev-arrow" :class="`theme-${activeChar.id}`" @click="prevCard" aria-label="上一個功能">‹</button>
      <button class="nav-arrow next-arrow" :class="`theme-${activeChar.id}`" @click="nextCard" aria-label="下一個功能">›</button>

      <!-- 中央舞台區 -->
      <div class="central-stage">
        <!-- 霓虹全息投影盤 -->
        <div class="hologram-disk" :class="`theme-${activeChar.id}`"></div>
        
        <!-- 大角色立繪與背後發光效果 -->
        <div class="large-char-wrapper">
          <div class="glow-bg" :class="`glow-${activeChar.id}`"></div>
          <img 
            v-for="c in displayChars"
            :key="c.id"
            :src="processedImages[c.id]" 
            class="large-char-img" 
            :class="{ 'is-visible': c.id === activeChar.id }"
            alt="Character" 
          />
        </div>

        <!-- 傳送按鈕與資訊 -->
        <div class="teleport-panel" :class="`border-${activeChar.id}`">
          <transition name="info-fade" mode="out-in">
            <div :key="activeChar.id" class="info-content">
              <h2 class="active-title" :class="`text-${activeChar.id}`">{{ activeChar.label }}</h2>
              <button @click="navigate(activeChar.path)" class="btn-teleport" :class="`btn-${activeChar.id}`">
                ⚡ 傳送進入 ⚡
              </button>
            </div>
          </transition>
        </div>
      </div>

      <!-- 底部 3D 弧形卡片區 -->
      <div class="carousel-arc-container">
        <div
          v-for="(c, idx) in displayChars"
          :key="c.id"
          v-show="idx !== selectedIndex"
          class="arc-card"
          :class="`card-${c.id}`"
          :style="getCardStyle(idx)"
          @click="selectCard(idx)"
          role="button"
          :aria-label="c.label"
        >
          <span class="card-icon">{{ c.icon }}</span>
          <h3 class="card-label">{{ c.label }}</h3>
        </div>
      </div>
    </div>

    <!-- 手機版：上方大立繪，下方頭像快速切換 -->
    <div v-else class="mobile-carousel-container">
      <!-- 上半部立繪 -->
      <div class="mobile-stage">
        <div class="mobile-glow-bg" :class="`glow-${activeChar.id}`"></div>
        <img 
          v-for="c in displayChars"
          :key="c.id"
          :src="processedImages[c.id]" 
          class="mobile-char-img" 
          :class="{ 'is-visible': c.id === activeChar.id }"
          alt="Character" 
        />
      </div>

      <!-- 中間傳送按鈕與資訊 (放置在頭像列上方) -->
      <div class="mobile-info-panel" :class="`border-${activeChar.id}`">
        <h2 class="mobile-active-title" :class="`text-${activeChar.id}`">{{ activeChar.label }}</h2>
        <button @click="navigate(activeChar.path)" class="btn-mobile-teleport" :class="`btn-${activeChar.id}`">
          ⚡ 進入系統 ⚡
        </button>
      </div>

      <!-- 下半部水平頭像選單 -->
      <div class="mobile-avatar-bar">
        <button
          v-for="(c, idx) in displayChars"
          :key="c.id"
          class="mobile-avatar-btn"
          :class="[
            `btn-avatar-${c.id}`,
            { 'is-active': idx === selectedIndex }
          ]"
          @click="selectCard(idx)"
        >
          <span class="avatar-icon">{{ c.icon }}</span>
          <span class="avatar-label">{{ c.label }}</span>
        </button>
      </div>
    </div>

    <!-- 登入/註冊彈窗 -->
    <transition name="fade-scale">
      <div v-if="showAuthModal" class="modal-overlay" @click.self="closeAuthModal">
        <div class="neon-modal" :class="authMode === 'login' ? 'login-border' : 'register-border'">
          <button class="modal-close-btn" @click="closeAuthModal">✕</button>
          
          <div class="modal-tabs">
            <button 
              class="tab-btn" 
              :class="{ 'active': authMode === 'login' }" 
              @click="authMode = 'login'"
            >登入</button>
            <button 
              class="tab-btn" 
              :class="{ 'active': authMode === 'register' }" 
              @click="authMode = 'register'"
            >註冊</button>
          </div>

          <!-- 登入表單 -->
          <div v-if="authMode === 'login'" class="modal-form-content">
            <h3 class="form-title text-cyan">使用者登入</h3>
            <div class="input-group">
              <label class="input-label">請輸入您的 6 碼唯一識別碼</label>
              <input 
                type="text" 
                v-model="loginCode" 
                class="modal-text-input"
                maxlength="6"
                @keyup.enter="handleLogin"
              />
            </div>
            <div class="form-actions-column">
              <button @click="handleLogin" :disabled="isLoading" class="btn-submit btn-login-glow">
                {{ isLoading ? '登入中...' : '確認登入' }}
              </button>
              <button @click="openForgotModal" class="btn-forgot-link">忘記唯一識別碼？</button>
            </div>
          </div>

          <!-- 註冊表單 -->
          <div v-else class="modal-form-content">
            <template v-if="!showSuccessPanel">
              <h3 class="form-title text-green">創建新角色身分</h3>
              
              <div class="input-row">
                <div class="input-group flex-1">
                  <label class="input-label">選擇伺服器</label>
                  <select v-model="regServer" class="modal-select">
                    <option value="新東京">新東京</option>
                    <option value="新大阪">新大阪</option>
                  </select>
                </div>
                <div class="input-group flex-1">
                  <label class="input-label">選擇學院</label>
                  <select v-model="regSchool" class="modal-select">
                    <option value="聖門">聖門</option>
                    <option value="鳳凰">鳳凰</option>
                    <option value="玄嚴">玄嚴</option>
                  </select>
                </div>
                <div class="input-group flex-1">
                  <label class="input-label">選擇部門</label>
                  <select v-model="regDept" class="modal-select">
                    <option value="格鬥部">格鬥部</option>
                    <option value="劍道部">劍道部</option>
                    <option value="弓箭部">弓箭部</option>
                    <option value="氣功部">氣功部</option>
                  </select>
                </div>
              </div>

              <div class="input-group">
                <label class="input-label">遊戲角色名稱</label>
                <input 
                  type="text" 
                  v-model="regCharId" 
                  class="modal-text-input"
                />
              </div>

              <div class="input-group">
                <label class="input-label">選擇安全問答 (忘記識別碼時驗證)</label>
                <select v-model="regQuestionId" class="modal-select font-small">
                  <option v-for="(q, idx) in questionList" :key="idx" :value="idx + 1">
                    {{ idx + 1 }}. {{ q }}
                  </option>
                </select>
              </div>

              <div class="input-group">
                <label class="input-label">安全問題答案</label>
                <input 
                  type="text" 
                  v-model="regAnswer" 
                  class="modal-text-input"
                />
              </div>

              <div class="form-actions">
                <button @click="handleRegister" :disabled="isLoading" class="btn-submit btn-register-glow">
                  {{ isLoading ? '註冊中...' : '提交註冊' }}
                </button>
              </div>
            </template>

            <!-- 註冊成功面板 -->
            <template v-else>
              <h3 class="form-title text-green">🎉 帳號建立成功！</h3>
              <p class="success-intro" style="font-size: 0.88rem; color: var(--text-muted); text-align: center; margin-bottom: 15px; line-height: 1.5;">
                此代碼為您登入本工具箱的唯一憑證，系統已自動為您登入。
              </p>

              <div class="code-display-panel" style="background: rgba(0, 255, 85, 0.05); border: 2px dashed rgba(0, 255, 85, 0.3); border-radius: 8px; padding: 15px; text-align: center; margin-bottom: 20px; box-shadow: 0 0 15px rgba(0, 255, 85, 0.1);">
                <span style="font-size: 0.8rem; color: var(--text-muted); display: block; margin-bottom: 6px;">您的唯一識別碼</span>
                <span class="neon-code-text" style="font-size: 2.2rem; font-weight: 800; letter-spacing: 4px; color: #00ff55; text-shadow: 0 0 10px rgba(0, 255, 85, 0.5); display: inline-block; margin-bottom: 12px; font-family: monospace;">{{ registeredCode }}</span>
                
                <div style="display: flex; justify-content: center; gap: 8px;">
                  <button @click="copyRegisteredCode" class="btn-submit" style="padding: 6px 14px; font-size: 0.85rem; border-radius: 6px; background: rgba(0, 255, 85, 0.15); border: 1px solid #00ff55; color: #00ff55; width: auto; cursor: pointer;">
                    {{ isCopied ? '✓ 已複製代碼' : '📋 複製識別碼' }}
                  </button>
                </div>
              </div>

              <div class="safety-warning-box" style="background: rgba(255, 0, 85, 0.05); border: 1px solid rgba(255, 0, 85, 0.2); border-radius: 6px; padding: 12px; margin-bottom: 20px;">
                <h4 style="color: #ff0055; font-size: 0.85rem; font-weight: 700; margin-bottom: 6px; display: flex; align-items: center; gap: 4px;">⚠️ 安全性提醒</h4>
                <p style="font-size: 0.78rem; color: var(--text-muted); line-height: 1.5; margin: 0; text-align: left;">
                  後端資料庫以安全單向雜湊儲存，工程師亦無法查看您的明文代碼。若不慎遺失，請至登入頁面點選「忘記唯一識別碼」透過安全問答找回。
                </p>
              </div>

              <div class="confirm-backup-row" style="display: flex; align-items: flex-start; gap: 8px; margin-bottom: 20px; text-align: left; padding: 0 5px;">
                <input type="checkbox" id="confirm-backup" v-model="hasConfirmedBackup" style="cursor: pointer; margin-top: 3px;" />
                <label for="confirm-backup" style="font-size: 0.82rem; color: #fff; cursor: pointer; user-select: none; line-height: 1.4;">
                  我已複製並安全備份此 6 碼識別碼，並知悉若遺失需使用安全問答找回。
                </label>
              </div>

              <div class="form-actions">
                <button 
                  @click="closeAuthModal" 
                  :disabled="!hasConfirmedBackup" 
                  class="btn-submit btn-register-glow"
                  style="transition: all 0.3s ease; padding: 12px; width: 100%; border-radius: 8px;"
                  :style="{ opacity: hasConfirmedBackup ? 1 : 0.4, cursor: hasConfirmedBackup ? 'pointer' : 'not-allowed' }"
                >
                  完成新進學生註冊
                </button>
              </div>
            </template>
          </div>
        </div>
      </div>
    </transition>

    <!-- 忘記識別碼彈窗 -->
    <transition name="fade-scale">
      <div v-if="showForgotModal" class="modal-overlay" @click.self="closeForgotModal">
        <div class="neon-modal forgot-border">
          <button class="modal-close-btn" @click="closeForgotModal">✕</button>
          
          <div class="modal-form-content">
            <h3 class="form-title text-pink">找回唯一識別碼</h3>
            
            <!-- 步驟 1: 輸入角色資訊 -->
            <div v-if="forgotStep === 1">
              <div class="input-row">
                <div class="input-group flex-1">
                  <label class="input-label">選擇伺服器</label>
                  <select v-model="forgotServer" class="modal-select">
                    <option value="新東京">新東京</option>
                    <option value="新大阪">新大阪</option>
                  </select>
                </div>
                <div class="input-group flex-1">
                  <label class="input-label">選擇部門</label>
                  <select v-model="forgotDept" class="modal-select">
                    <option value="格鬥部">格鬥部</option>
                    <option value="劍道部">劍道部</option>
                    <option value="弓箭部">弓箭部</option>
                    <option value="氣功部">氣功部</option>
                  </select>
                </div>
              </div>

              <div class="input-group">
                <label class="input-label">遊戲角色名稱</label>
                <input 
                  type="text" 
                  v-model="forgotCharId" 
                  class="modal-text-input"
                />
              </div>

              <div class="form-actions">
                <button @click="handleForgotNext" :disabled="isLoading" class="btn-submit btn-forgot-glow">
                  {{ isLoading ? '查詢中...' : '確認角色資訊' }}
                </button>
              </div>
            </div>

            <!-- 步驟 2: 安全問答校驗 -->
            <div v-else-if="forgotStep === 2 && !showRetrievedBlock && !showContactBlock">
              <div class="question-display-box">
                <span class="question-tag">安全問題：</span>
                <p class="question-text">{{ forgotQuestion ? forgotQuestion.questionText : '' }}</p>
              </div>

              <div class="input-group">
                <label class="input-label">請輸入您的答案</label>
                <input 
                  type="text" 
                  v-model="forgotAnswer" 
                  class="modal-text-input"
                  @keyup.enter="handleForgotVerify"
                />
              </div>

              <div class="form-actions-column">
                <button @click="handleForgotVerify" :disabled="isLoading" class="btn-submit btn-forgot-glow">
                  確認送出
                </button>
                <button @click="showContactBlock = true" class="btn-forgot-help-link">我忘記安全問題答案了，求助工程師</button>
              </div>
            </div>

            <!-- 成功找回識別碼 -->
            <div v-else-if="showRetrievedBlock" class="success-display-box">
              <div class="success-icon">🔑</div>
              <p class="success-title">成功找回您的唯一識別碼！</p>
              <div class="code-display-value">{{ retrievedCode }}</div>
              <p class="success-note">請妥善記下此 6 碼識別碼，日後登入僅需輸入此識別碼即可。</p>
              <div class="form-actions">
                <button @click="handleAutoLoginAfterRetrieve" class="btn-submit btn-login-glow">
                  直接登入並關閉
                </button>
              </div>
            </div>

            <!-- 客服聯絡資訊 -->
            <div v-else-if="showContactBlock" class="contact-display-box">
              <div class="contact-icon">💡</div>
              <h4 class="contact-title">聯絡客服 / 工程師指南</h4>
              <p class="contact-content">
                若您遺失了識別碼且忘記安全問題答案，請使用本站的「聯絡我們」功能與開發團隊聯繫，或寄件至系統管理信箱，我們將會協助核對角色身分並找回您的識別碼。
              </p>
              <div class="form-actions" style="flex-direction: column; gap: 8px;">
                <button @click="openContactModalFromForgot" class="btn-submit btn-forgot-glow" style="background: rgba(0, 229, 255, 0.15); border-color: #00e5ff; color: #fff; text-shadow: 0 0 8px #00e5ff; box-shadow: 0 0 10px rgba(0, 229, 255, 0.1);">
                  📞 開啟聯絡我們
                </button>
                <button @click="closeForgotModal" class="btn-submit btn-forgot-glow">關閉</button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, inject } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth, SECURITY_QUESTIONS } from '@/composables/useAuth.js'

const router = useRouter()
const hovered = ref(null)
const isMobile = ref(true)

const openContactModal = inject('openContactModal')

const { 
  currentUser, 
  isLoggedIn, 
  register, 
  login, 
  logout, 
  getSecurityQuestion, 
  verifyAnswer 
} = useAuth()

// Auth modal state
const showAuthModal = ref(false)
const authMode = ref('login') // 'login' | 'register'
const isLoading = ref(false)
const showUserDropdown = ref(false)
const toggleUserDropdown = () => {
  showUserDropdown.value = !showUserDropdown.value
}
const logoutAndClose = () => {
  logout()
  showUserDropdown.value = false
}
const openContactModalAndClose = () => {
  showUserDropdown.value = false
  if (openContactModal) openContactModal()
}

const openContactModalFromForgot = () => {
  showForgotModal.value = false
  if (openContactModal) openContactModal()
}

const loginCode = ref('')

const regServer = ref('新東京')
const regSchool = ref('聖門')
const regDept = ref('格鬥部')
const regCharId = ref('')
const regQuestionId = ref(1)
const regAnswer = ref('')

const questionList = computed(() => SECURITY_QUESTIONS.slice(1))

// 註冊成功面板控制與狀態變數
const registeredCode = ref('')
const showSuccessPanel = ref(false)
const hasConfirmedBackup = ref(false)
const isCopied = ref(false)

const copyRegisteredCode = async () => {
  if (!registeredCode.value) return
  try {
    await navigator.clipboard.writeText(registeredCode.value)
    isCopied.value = true
    setTimeout(() => {
      isCopied.value = false
    }, 2000)
  } catch (err) {
    console.error('複製失敗:', err)
    alert(`無法自動複製，請手動複製此代碼: ${registeredCode.value}`)
  }
}

// Forgot Code Modal state
const showForgotModal = ref(false)
const forgotStep = ref(1)
const forgotServer = ref('新東京')
const forgotDept = ref('格鬥部')
const forgotCharId = ref('')
const forgotQuestion = ref(null) // { code, questionId, questionText }
const forgotAnswer = ref('')
const retrievedCode = ref('')
const showRetrievedBlock = ref(false)
const showContactBlock = ref(false)

const openAuthModal = (mode) => {
  authMode.value = mode
  showAuthModal.value = true
}

const closeAuthModal = () => {
  showAuthModal.value = false
  loginCode.value = ''
  regCharId.value = ''
  regAnswer.value = ''
  regQuestionId.value = 1
  regSchool.value = '聖門'
  registeredCode.value = ''
  showSuccessPanel.value = false
  hasConfirmedBackup.value = false
}

const openForgotModal = () => {
  showAuthModal.value = false
  showForgotModal.value = true
  forgotStep.value = 1
  forgotCharId.value = ''
  forgotAnswer.value = ''
  retrievedCode.value = ''
  showRetrievedBlock.value = false
  showContactBlock.value = false
}

const closeForgotModal = () => {
  showForgotModal.value = false
}

const handleRegister = async () => {
  if (!regCharId.value.trim()) {
    alert('請輸入角色名稱！')
    return
  }
  if (!regAnswer.value.trim()) {
    alert('請設定安全問題答案！')
    return
  }
  isLoading.value = true
  try {
    const code = await register({
      server: regServer.value,
      dept: regDept.value,
      school: regSchool.value,
      charId: regCharId.value,
      questionId: regQuestionId.value,
      answer: regAnswer.value
    })
    registeredCode.value = code
    showSuccessPanel.value = true
  } catch (err) {
    alert(err.message || '註冊失敗')
  } finally {
    isLoading.value = false
  }
}

const handleLogin = async () => {
  if (!loginCode.value.trim()) {
    alert('請輸入唯一識別碼！')
    return
  }
  isLoading.value = true
  try {
    await login(loginCode.value)
    closeAuthModal()
  } catch (err) {
    alert(err.message || '登入失敗')
  } finally {
    isLoading.value = false
  }
}

const handleForgotNext = async () => {
  if (!forgotCharId.value.trim()) {
    alert('請輸入角色名稱！')
    return
  }
  isLoading.value = true
  try {
    const question = await getSecurityQuestion({
      server: forgotServer.value,
      dept: forgotDept.value,
      charId: forgotCharId.value
    })
    forgotQuestion.value = question
    forgotStep.value = 2
  } catch (err) {
    alert(err.message)
  } finally {
    isLoading.value = false
  }
}

const handleForgotVerify = async () => {
  if (!forgotAnswer.value.trim()) {
    alert('請輸入答案！')
    return
  }
  isLoading.value = true
  try {
    const code = await verifyAnswer({
      code: forgotQuestion.value.code,
      answer: forgotAnswer.value
    })
    retrievedCode.value = code
    showRetrievedBlock.value = true
  } catch (err) {
    alert(err.message || '驗證失敗，請重試！')
  } finally {
    isLoading.value = false
  }
}

const handleAutoLoginAfterRetrieve = async () => {
  try {
    await login(retrievedCode.value)
  } catch (err) {
    console.error(err)
  } finally {
    closeForgotModal()
  }
}

const handleResize = () => {
  isMobile.value = window.innerWidth <= 768
}

onMounted(() => {
  handleResize()
  window.addEventListener('resize', handleResize)

  // 預載所有大立繪圖片以達到秒切換體驗
  Object.values(processedImages).forEach((src) => {
    const img = new Image()
    img.src = src
  })
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})

const assets = {
  bg: '/assets/bg-city.webp',
}

// 原始系統設定
const CHARS = [
  { id: 'box',     label: '禮盒查詢', icon: '🎁', path: '/boxes'   },
  { id: 'qigong',  label: '好物分享', icon: '💎', path: '/share'   },
  { id: 'warrior', label: '練功團',   icon: '⚔️', path: '/parties' },
  { id: 'snipper', label: '任務指南', icon: '🗺️', path: '/tasks'   },
  { id: 'defender', label: '配點模擬', icon: '🛡️', path: '/simulator' },
]

// 根據提示詞設定的顯示順序：warrior, qigong, box, snipper, defender
const displayOrder = ['warrior', 'qigong', 'box', 'snipper', 'defender']
const displayChars = computed(() => {
  return displayOrder.map(id => CHARS.find(c => c.id === id))
})

const processedImages = {
  qigong: '/assets/char-qigong.webp',
  box: '/assets/char-box.webp',
  warrior: '/assets/char-warrior.webp',
  snipper: '/assets/char-snipper.webp',
  defender: '/assets/char-defender.webp',
}

const navigate = (path) => router.push(path)

// ── 3D 選角環新增邏輯 ──
const selectedIndex = ref(0) // 預設選中 warrior (練功團)

// 取得當前選中的卡片資料
const activeChar = computed(() => {
  return displayChars.value[selectedIndex.value] || displayChars.value[0]
})

// 點擊卡片選取
const selectCard = (index) => {
  selectedIndex.value = index
}

// 往左切換
const prevCard = () => {
  selectedIndex.value = (selectedIndex.value - 1 + displayChars.value.length) % displayChars.value.length
}

// 往右切換
const nextCard = () => {
  selectedIndex.value = (selectedIndex.value + 1) % displayChars.value.length
}

// 3D 弧形樣式計算
const getCardStyle = (index) => {
  const diff = index - selectedIndex.value
  
  // 5個卡片循環處理
  let adjustedDiff = diff
  if (adjustedDiff > 2) adjustedDiff -= 5
  if (adjustedDiff < -2) adjustedDiff += 5
  
  const absDiff = Math.abs(adjustedDiff)
  
  const translateX = adjustedDiff * 230       // 左右偏移
  const translateY = absDiff * 45             // 弧形下沉，形成圓弧感
  const translateZ = -absDiff * 160           // 3D 景深後退
  const rotateY = -adjustedDiff * 30           // 3D 旋轉偏角
  const scale = 1 - absDiff * 0.15             // 遠小近大
  const opacity = 1 - absDiff * 0.35           // 側邊半透明
  const zIndex = 10 - absDiff                 // 選中在最上層
  
  return {
    transform: `translateX(${translateX}px) translateY(${translateY}px) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
    opacity: opacity,
    zIndex: zIndex,
    pointerEvents: absDiff > 2 ? 'none' : 'auto'
  }
}

</script>

<style scoped>
/* ==========================================
   Typography
   ========================================== */
@import url('https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@900&display=swap');

/* ==========================================
   Main Wrapper
   ========================================== */
.home-wrapper {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background: #000;
  cursor: url('/assets/ran2-cursor.cur'), auto;
}

/* ==========================================
   Background with darker filter
   ========================================== */
.layer-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  z-index: 0;
  /* Darken the background to emphasize the neon glow */
  filter: brightness(0.2) saturate(0.8) blur(2px);
}

/* ==========================================
   3D Carousel & Central Stage Layout
   ========================================== */
.desktop-carousel-container {
  position: absolute;
  inset: 0;
  z-index: 2;
  perspective: 1200px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

/* ── 中央舞台 ── */
.central-stage {
  position: absolute;
  top: 48%;
  left: 50%;
  transform: translate(-50%, -55%);
  width: 500px;
  height: 500px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 3;
  pointer-events: none; /* 穿透以防擋住底部卡片點擊 */
}

/* 全息投影底盤 */
.hologram-disk {
  position: absolute;
  bottom: 80px;
  width: 380px;
  height: 90px;
  background: radial-gradient(ellipse at center, var(--neon-color) 0%, transparent 75%);
  border: 2px solid var(--neon-color);
  border-radius: 50%;
  transform: rotateX(75deg);
  opacity: 0.55;
  box-shadow: 0 0 30px var(--neon-color), inset 0 0 20px var(--neon-color);
  animation: disk-rotate 10s linear infinite;
  z-index: 1;
  transition: all 0.6s cubic-bezier(0.25, 0.8, 0.25, 1);
}

@keyframes disk-rotate {
  0% { transform: rotateX(75deg) rotate(0deg); }
  100% { transform: rotateX(75deg) rotate(360deg); }
}

/* 大立繪包覆層 */
.large-char-wrapper {
  position: relative;
  width: 100%;
  height: 480px;
  display: flex;
  justify-content: center;
  align-items: flex-end;
  z-index: 2;
  pointer-events: none;
  animation: float-large 6s ease-in-out infinite; /* 漂浮動畫改到包覆層，防止與立繪 transition 衝突 */
}

.large-char-img {
  position: absolute;
  bottom: 0;
  max-width: 120%;
  max-height: 100%;
  object-fit: contain;
  object-position: bottom center;
  filter: drop-shadow(0 0 20px rgba(0, 0, 0, 0.8));
  opacity: 0;
  transform: translateY(15px) scale(0.97);
  transition: opacity 0.4s cubic-bezier(0.25, 0.8, 0.25, 1), transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
  z-index: 1;
}

.large-char-img.is-visible {
  opacity: 1;
  transform: translateY(0) scale(1);
  z-index: 2;
}

/* 巨幅角色背後霓虹發光背景 */
.glow-bg {
  position: absolute;
  bottom: 80px;
  width: 250px;
  height: 250px;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.35;
  z-index: -1;
  transition: all 0.6s ease;
}

/* 傳送控制面板 */
.teleport-panel {
  position: absolute;
  bottom: -40px;
  background: rgba(10, 14, 23, 0.88);
  border: 1px solid var(--border-color);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-radius: 12px;
  padding: 15px 30px;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5), inset 0 0 15px rgba(255, 255, 255, 0.02);
  z-index: 4;
  transition: all 0.5s ease;
  min-width: 240px;
  pointer-events: auto; /* 恢復可點擊狀態 */
}

.info-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.active-title {
  font-family: 'Microsoft JhengHei', '微軟正黑體', sans-serif;
  font-size: 1.8rem;
  font-weight: 900;
  letter-spacing: 4px;
  margin: 0;
  text-shadow: 0 0 10px var(--neon-color);
  transition: color 0.5s ease;
}

.btn-teleport {
  font-family: inherit;
  font-weight: bold;
  font-size: 0.95rem;
  letter-spacing: 2px;
  padding: 8px 24px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--neon-color);
  color: #fff;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  text-shadow: 0 0 5px #fff;
  pointer-events: auto; /* 恢復可點擊狀態 */
}

.btn-teleport:hover {
  background: var(--neon-color);
  box-shadow: 0 0 25px var(--neon-color);
  color: #000;
  text-shadow: none;
  transform: translateY(-2px);
}

/* 左右控制箭頭 */
.nav-arrow {
  position: absolute;
  top: 48%;
  transform: translateY(-50%);
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: rgba(10, 14, 23, 0.65);
  border: 1.5px solid rgba(255, 255, 255, 0.15);
  color: rgba(255, 255, 255, 0.7);
  font-size: 2.5rem;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  z-index: 10;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  pointer-events: auto; /* 確保可點擊 */
}

.prev-arrow {
  left: 5vw;
}

.next-arrow {
  right: 5vw;
}

/* 隨選中角色的霓虹主題色發光 */
.nav-arrow:hover {
  color: #fff;
  border-color: var(--neon-color);
  box-shadow: 0 0 15px var(--neon-color);
  background: rgba(10, 14, 23, 0.9);
  text-shadow: 0 0 5px #fff;
}

.prev-arrow:hover {
  transform: translateY(-50%) translateX(-5px);
}

.next-arrow:hover {
  transform: translateY(-50%) translateX(5px);
}

/* ── 底部 3D 弧形卡片 ── */
.carousel-arc-container {
  position: absolute;
  bottom: 10vh;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  height: 180px;
  display: flex;
  justify-content: center;
  align-items: center;
  transform-style: preserve-3d;
  z-index: 5;
  pointer-events: none; /* 穿透以防擋住傳送面板的點擊 */
}

.arc-card {
  position: absolute;
  width: 170px;
  height: 100px;
  background: rgba(10, 15, 25, 0.8);
  border: 1.5px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.6s cubic-bezier(0.25, 0.8, 0.25, 1);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.4), inset 0 0 10px rgba(255, 255, 255, 0.02);
  backface-visibility: hidden;
  pointer-events: auto; /* 恢復可點擊狀態 */
}

.arc-card:hover {
  border-color: rgba(255, 255, 255, 0.25);
  box-shadow: 0 8px 25px rgba(255, 255, 255, 0.05);
}

.card-icon {
  font-size: 1.8rem;
}

.card-label {
  font-family: 'Microsoft JhengHei', '微軟正黑體', sans-serif;
  font-size: 0.95rem;
  font-weight: bold;
  color: var(--text-muted);
  letter-spacing: 1px;
  margin: 0;
  transition: color 0.4s ease;
}

/* ── 各角色的色彩與霓虹主題定義 ── */
.theme-qigong { --neon-color: #00ff66; }
.theme-box { --neon-color: #c800ff; }
.theme-warrior { --neon-color: #ff0055; }
.theme-snipper { --neon-color: #00e5ff; }
.theme-defender { --neon-color: #ff7700; }

.glow-qigong { background: #00ff66; }
.glow-box { background: #c800ff; }
.glow-warrior { background: #ff0055; }
.glow-snipper { background: #00e5ff; }
.glow-defender { background: #ff7700; }

.text-qigong { color: #00ff66; }
.text-box { color: #c800ff; }
.text-warrior { color: #ff0055; }
.text-snipper { color: #00e5ff; }
.text-defender { color: #ff7700; }

.border-qigong { border-color: #00ff66; box-shadow: 0 0 20px rgba(0, 255, 102, 0.15); }
.border-box { border-color: #c800ff; box-shadow: 0 0 20px rgba(200, 0, 255, 0.15); }
.border-warrior { border-color: #ff0055; box-shadow: 0 0 20px rgba(255, 0, 85, 0.15); }
.border-snipper { border-color: #00e5ff; box-shadow: 0 0 20px rgba(0, 229, 255, 0.15); }
.border-defender { border-color: #ff7700; box-shadow: 0 0 20px rgba(255, 119, 0, 0.15); }

/* ── Vue Transition 動態效果 ── */
.char-fade-enter-active, .char-fade-leave-active {
  transition: all 0.35s cubic-bezier(0.25, 0.8, 0.25, 1);
}
.char-fade-enter-from {
  opacity: 0;
  transform: translateY(15px) scale(0.97);
}
.char-fade-leave-to {
  opacity: 0;
  transform: translateY(-15px) scale(0.97);
}

.info-fade-enter-active, .info-fade-leave-active {
  transition: all 0.3s ease;
}
.info-fade-enter-from, .info-fade-leave-to {
  opacity: 0;
  transform: scale(0.9);
}

/* 角色立繪漂浮效果 */
@keyframes float-large {
  0% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
  100% { transform: translateY(0px); }
}

/* ── Vue Transition 舊動態效果已不再使用 ── */

/* ==========================================
   手機版響應式專屬樣式
   ========================================== */
@media (max-width: 768px) {
  .mobile-carousel-container {
    display: flex;
    flex-direction: column;
    height: 80vh;
    justify-content: space-between;
    padding-top: 60px;
    z-index: 2;
    box-sizing: border-box;
  }

  .mobile-stage {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
    pointer-events: none; /* 穿透以防擋住底部頭像點擊 */
    animation: float-large 5s ease-in-out infinite; /* 手機版漂浮動畫改到舞台 */
  }

  .mobile-char-img {
    position: absolute;
    bottom: 10px; /* 立繪移至舞台底部，不再被面板擠壓 */
    max-height: 48vh;
    max-width: 90%;
    object-fit: contain;
    z-index: 1;
    filter: drop-shadow(0 0 15px rgba(0,0,0,0.5));
    opacity: 0;
    transform: scale(0.97);
    transition: opacity 0.35s ease, transform 0.35s ease;
  }

  .mobile-char-img.is-visible {
    opacity: 1;
    transform: scale(1);
    z-index: 2;
  }

  .mobile-glow-bg {
    position: absolute;
    top: 40%;
    width: 180px;
    height: 180px;
    border-radius: 50%;
    filter: blur(60px);
    opacity: 0.3;
    z-index: 1;
  }

  .mobile-info-panel {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    z-index: 3;
    background: rgba(10, 14, 23, 0.75);
    border-radius: 12px;
    padding: 10px 20px;
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    margin-top: 10px;
    border: 1px solid rgba(255,255,255,0.05);
    pointer-events: auto; /* 恢復可點擊狀態 */
  }

  .mobile-active-title {
    font-family: inherit;
    font-size: 1.4rem;
    font-weight: 800;
    letter-spacing: 2px;
    margin: 0;
    text-shadow: 0 0 8px var(--neon-color);
  }

  .btn-mobile-teleport {
    font-family: inherit;
    font-weight: bold;
    font-size: 0.85rem;
    letter-spacing: 1px;
    padding: 6px 18px;
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--neon-color);
    color: #fff;
    cursor: pointer;
    transition: all 0.2s ease;
    pointer-events: auto; /* 恢復可點擊狀態 */
  }

  .btn-mobile-teleport:active {
    background: var(--neon-color);
    color: #000;
  }

  /* 底部頭像滾動欄 */
  .mobile-avatar-bar {
    height: 90px;
    display: flex;
    gap: 12px;
    padding: 0 20px 10px;
    overflow-x: auto;
    scrollbar-width: none; /* Firefox */
    -ms-overflow-style: none;  /* IE/Edge */
    align-items: center;
    justify-content: flex-start;
    position: relative;
    z-index: 10;
    pointer-events: auto; /* 確保頭像欄可點擊 */
  }

  .mobile-avatar-bar::-webkit-scrollbar {
    display: none; /* Chrome/Safari */
  }

  .mobile-avatar-btn {
    flex-shrink: 0;
    width: 70px;
    height: 70px;
    border-radius: 50%;
    background: rgba(10, 15, 25, 0.85);
    border: 1.5px solid rgba(255, 255, 255, 0.08);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  }

  .mobile-avatar-btn.is-active {
    border-color: var(--neon-color);
    box-shadow: 0 0 12px var(--neon-color);
    transform: translateY(-5px);
    background: rgba(10, 15, 25, 0.98);
  }

  .avatar-icon {
    font-size: 1.4rem;
  }

  .avatar-label {
    font-size: 0.65rem;
    font-weight: bold;
    color: var(--text-muted);
  }

  .mobile-avatar-btn.is-active .avatar-label {
    color: #fff;
  }
}

/* ==========================================
   Home Auth Bar & Modal Styles
   ========================================== */
.home-auth-bar {
  position: absolute;
  top: 25px;
  right: 25px;
  z-index: 100;
  display: flex;
  gap: 12px;
}

.auth-buttons {
  display: flex;
  gap: 12px;
}

.btn-home-auth {
  font-family: inherit;
  font-weight: 700;
  font-size: 0.9rem;
  padding: 8px 20px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  background: rgba(10, 15, 25, 0.65);
  backdrop-filter: blur(12px);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4);
  letter-spacing: 1px;
}

.btn-login-home {
  border: 1px solid rgba(0, 229, 255, 0.4);
  color: #00e5ff;
}

.btn-login-home:hover {
  background: #00e5ff;
  color: #000;
  box-shadow: 0 0 20px rgba(0, 229, 255, 0.5);
  transform: translateY(-2px);
}

.btn-register-home {
  border: 1px solid rgba(0, 255, 102, 0.4);
  color: #00ff66;
}

.btn-register-home:hover {
  background: #00ff66;
  color: #000;
  box-shadow: 0 0 20px rgba(0, 255, 102, 0.5);
  transform: translateY(-2px);
}

.desktop-user-badge {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(10, 15, 25, 0.75);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 6px 16px;
  border-radius: 10px;
  color: #fff;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5);
}

/* 預設隱藏手機版專用組件 */
.mobile-user-badge {
  display: none;
  position: relative;
}
.mobile-logo-title {
  display: none;
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

/* 手機版頭像按鈕 */
.mobile-avatar-btn {
  font-family: inherit;
  font-weight: 700;
  font-size: 0.85rem;
  color: #00e5ff;
  background: rgba(0, 229, 255, 0.1);
  border: 1px solid rgba(0, 229, 255, 0.3);
  padding: 6px 12px;
  border-radius: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  transition: all 0.2s ease;
}
.mobile-avatar-btn:active {
  transform: scale(0.95);
  background: rgba(0, 229, 255, 0.2);
}
.arrow-down {
  font-size: 0.7rem;
  opacity: 0.7;
}

/* 手機版下拉氣泡選單 */
.mobile-user-dropdown {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  width: 200px;
  padding: 16px;
  border-radius: 12px;
  background: rgba(15, 22, 36, 0.95) !important;
  border: 1px solid rgba(0, 229, 255, 0.2) !important;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.6) !important;
  z-index: 150;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.dropdown-item {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  padding-bottom: 6px;
}
.dropdown-item .label {
  color: var(--text-muted);
}
.dropdown-item .value {
  color: #fff;
  font-weight: 700;
}
.dropdown-logout-btn, .dropdown-contact-btn {
  width: 100%;
  margin-top: 6px;
  font-size: 0.8rem;
  padding: 6px 12px;
  border-radius: 6px;
}

.user-text {
  color: #00e5ff;
  font-weight: 700;
  text-shadow: 0 0 8px rgba(0, 229, 255, 0.4);
  font-size: 0.9rem;
}

.btn-logout-home {
  border: 1px solid rgba(255, 0, 85, 0.5);
  color: #ff0055;
  padding: 4px 10px;
  font-size: 0.8rem;
  background: transparent;
  box-shadow: none;
}

.btn-logout-home:hover {
  background: #ff0055;
  color: #fff;
  box-shadow: 0 0 15px rgba(255, 0, 85, 0.6);
  transform: translateY(-1px);
}

.btn-contact-home {
  border: 1px solid rgba(0, 229, 255, 0.4);
  color: #00e5ff;
}

.btn-contact-home:hover {
  background: #00e5ff;
  color: #000;
  box-shadow: 0 0 20px rgba(0, 229, 255, 0.5);
  transform: translateY(-2px);
}

/* Modal Overlay */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(4, 5, 8, 0.85);
  backdrop-filter: blur(8px);
  z-index: 1000;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
}

/* Neon Modal Box */
.neon-modal {
  background: rgba(12, 16, 26, 0.95);
  border-radius: 16px;
  width: 100%;
  max-width: 480px;
  padding: 30px;
  position: relative;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.8);
  box-sizing: border-box;
}

/* Border Glows */
.login-border {
  border: 2px solid rgba(0, 229, 255, 0.5);
  box-shadow: 0 0 25px rgba(0, 229, 255, 0.2), inset 0 0 20px rgba(0, 229, 255, 0.1);
}

.register-border {
  border: 2px solid rgba(0, 255, 102, 0.5);
  box-shadow: 0 0 25px rgba(0, 255, 102, 0.2), inset 0 0 20px rgba(0, 255, 102, 0.1);
}

.forgot-border {
  border: 2px solid rgba(255, 0, 85, 0.5);
  box-shadow: 0 0 25px rgba(255, 0, 85, 0.2), inset 0 0 20px rgba(255, 0, 85, 0.1);
}

.modal-close-btn {
  position: absolute;
  top: 15px;
  right: 15px;
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-size: 1.25rem;
  cursor: pointer;
  transition: color 0.2s ease;
}

.modal-close-btn:hover {
  color: #fff;
}

/* Tab Headers */
.modal-tabs {
  display: flex;
  border-bottom: 2px solid rgba(255, 255, 255, 0.05);
  margin-bottom: 25px;
  gap: 10px;
}

.tab-btn {
  flex: 1;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--text-muted);
  font-size: 1.1rem;
  font-weight: 700;
  padding: 10px 0;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-bottom: -2px;
}

.tab-btn:hover {
  color: var(--text-main);
}

.tab-btn.active {
  color: #fff;
}
.login-border .tab-btn.active {
  border-color: #00e5ff;
  text-shadow: 0 0 8px rgba(0, 229, 255, 0.5);
}
.register-border .tab-btn.active {
  border-color: #00ff66;
  text-shadow: 0 0 8px rgba(0, 255, 102, 0.5);
}

/* Form Styles */
.modal-form-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-title {
  font-size: 1.3rem;
  font-weight: 800;
  margin: 0 0 10px 0;
  letter-spacing: 2px;
  text-align: center;
}

.text-cyan {
  color: #00e5ff;
  text-shadow: 0 0 8px rgba(0, 229, 255, 0.4);
}
.text-green {
  color: #00ff66;
  text-shadow: 0 0 8px rgba(0, 255, 102, 0.4);
}
.text-pink {
  color: #ff0055;
  text-shadow: 0 0 8px rgba(255, 0, 85, 0.4);
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.input-row {
  display: flex;
  gap: 15px;
}

.flex-1 {
  flex: 1;
}

.input-label {
  color: var(--text-muted);
  font-size: 0.85rem;
  font-weight: 600;
}

.modal-text-input,
.modal-select {
  background: rgba(6, 8, 12, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #fff;
  border-radius: 8px;
  padding: 12px 14px;
  font-size: 0.95rem;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  box-sizing: border-box;
  width: 100%;
}

.modal-text-input:focus,
.modal-select:focus {
  border-color: rgba(255, 255, 255, 0.3);
  box-shadow: 0 0 8px rgba(255, 255, 255, 0.08);
}

.font-small {
  font-size: 0.85rem;
}

.form-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
  gap: 15px;
}

.form-actions-column {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 10px;
  align-items: center;
  width: 100%;
}

.btn-submit {
  flex: 1;
  width: 100%;
  border: none;
  border-radius: 8px;
  padding: 12px;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  color: #000;
  letter-spacing: 1px;
}

.btn-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-login-glow {
  background: #00e5ff;
  box-shadow: 0 0 10px rgba(0, 229, 255, 0.2);
}
.btn-login-glow:hover:not(:disabled) {
  box-shadow: 0 0 20px rgba(0, 229, 255, 0.6);
  transform: translateY(-2px);
}

.btn-register-glow {
  background: #00ff66;
  box-shadow: 0 0 10px rgba(0, 255, 102, 0.2);
}
.btn-register-glow:hover:not(:disabled) {
  box-shadow: 0 0 20px rgba(0, 255, 102, 0.6);
  transform: translateY(-2px);
}

.btn-forgot-glow {
  background: #ff0055;
  color: #fff;
  box-shadow: 0 0 10px rgba(255, 0, 85, 0.2);
}
.btn-forgot-glow:hover:not(:disabled) {
  box-shadow: 0 0 20px rgba(255, 0, 85, 0.6);
  transform: translateY(-2px);
}

.btn-forgot-link {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 0.85rem;
  text-decoration: underline;
  transition: color 0.2s ease;
}

.btn-forgot-link:hover {
  color: #ff0055;
}

/* Security Question Display */
.question-display-box {
  background: rgba(255, 0, 85, 0.05);
  border: 1px dashed rgba(255, 0, 85, 0.3);
  border-radius: 8px;
  padding: 15px;
  text-align: center;
}

.question-tag {
  color: #ff0055;
  font-size: 0.8rem;
  font-weight: 700;
  display: block;
  margin-bottom: 5px;
  letter-spacing: 1px;
}

.question-text {
  margin: 0;
  font-size: 1.05rem;
  color: #fff;
  font-weight: 600;
}

.btn-forgot-help-link {
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-size: 0.8rem;
  cursor: pointer;
  text-decoration: underline;
  transition: color 0.2s ease;
}

.btn-forgot-help-link:hover {
  color: #fff;
}

/* Success Code Display */
.success-display-box {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
  padding: 10px 0;
}

.success-icon {
  font-size: 3rem;
  filter: drop-shadow(0 0 10px rgba(0, 255, 102, 0.4));
}

.success-title {
  font-size: 1.15rem;
  font-weight: 700;
  color: #00ff66;
  margin: 0;
}

.code-display-value {
  background: rgba(0, 255, 102, 0.08);
  border: 2px solid #00ff66;
  border-radius: 12px;
  padding: 15px 30px;
  font-size: 2.2rem;
  font-weight: 800;
  color: #00ff66;
  letter-spacing: 4px;
  text-shadow: 0 0 12px rgba(0, 255, 102, 0.5);
  box-shadow: 0 0 20px rgba(0, 255, 102, 0.15);
  margin: 10px 0;
}

.success-note {
  color: var(--text-muted);
  font-size: 0.85rem;
  margin: 0;
  line-height: 1.4;
}

/* Contact Info Display */
.contact-display-box {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
  padding: 15px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
}

.contact-icon {
  font-size: 3rem;
}

.contact-title {
  font-size: 1.2rem;
  font-weight: 800;
  color: #fff;
  margin: 0;
}

.contact-content {
  font-size: 0.9rem;
  color: var(--text-muted);
  line-height: 1.6;
  margin: 0;
}

/* Modal Transition */
.fade-scale-enter-active,
.fade-scale-leave-active {
  transition: opacity 0.3s ease, transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.fade-scale-enter-from,
.fade-scale-leave-to {
  opacity: 0;
}

.fade-scale-enter-from .neon-modal,
.fade-scale-leave-to .neon-modal {
  transform: scale(0.9);
}

/* Mobile responsive */
@media (max-width: 768px) {
  .home-auth-bar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    transform: none;
    width: 100%;
    height: 60px;
    padding: 0 16px;
    background: rgba(10, 15, 25, 0.75);
    backdrop-filter: blur(16px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    display: flex;
    justify-content: space-between;
    align-items: center;
    z-index: 120;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  }
  .desktop-user-badge {
    display: none;
  }
  .mobile-user-badge {
    display: block;
  }
  .mobile-logo-title {
    display: block;
  }
  .btn-home-auth {
    font-size: 0.8rem;
    padding: 6px 14px;
    border-radius: 6px;
  }
  .auth-buttons {
    gap: 8px;
  }
  .cards-container {
    padding-top: 80px !important;
  }
}
</style>
