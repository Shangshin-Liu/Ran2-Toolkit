<template>
  <div class="home-wrapper">
    <!-- Layer 0: Dark textured city background -->
    <img :src="assets.bg" alt="" class="layer-bg" aria-hidden="true" />

    <!-- 首頁登入/註冊入口浮動區塊 -->
    <div class="home-auth-bar">
      <!-- 手機版頂部 Logo -->
      <div class="mobile-logo-title">
        <router-link to="/" class="logo-link">
          <img src="/assets/logo.jpg" alt="Ran2 Logo" class="header-logo">
          <span class="header-title neon-text-snipper">亂2萬事通</span>
        </router-link>
      </div>

      <div v-if="isLoggedIn" class="user-badge-container">
        <!-- 桌機版顯示原來的長文字 + 登出 -->
        <div class="desktop-user-badge">
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
              <button @click="logoutAndClose" class="btn-home-auth btn-logout-home dropdown-logout-btn">
                🚪 登出帳號
              </button>
            </div>
          </transition>
        </div>
      </div>
      
      <div v-else class="auth-buttons">
        <button @click="openAuthModal('login')" class="btn-home-auth btn-login-home">登入</button>
        <button @click="openAuthModal('register')" class="btn-home-auth btn-register-home">註冊</button>
      </div>
    </div>

    <!-- Layer 0.5: Background video (faint overlay) -->
    <div class="video-background-container" v-if="!isMobile">
      <video
        ref="bgVideo"
        muted
        playsinline
        preload="auto"
        class="bg-video"
        :class="{ 'is-visible': hovered }"
      >
        <source :src="'/assets/ran2-bg-video.webm'" type="video/webm" />
      </video>
    </div>

    <!-- Layer 1: Neon Cards Layout -->
    <div class="cards-container" :class="{ 'has-hover': hovered }">
      <div
        v-for="c in displayChars"
        :key="c.id"
        :id="`card-${c.id}`"
        class="neon-card"
        :class="[
          `card-${c.id}`,
          {
            'is-active': hovered === c.id,
            'is-dimmed': hovered && hovered !== c.id
          }
        ]"
        @mouseenter="hovered = c.id"
        @mouseleave="hovered = null"
        @click="navigate(c.path)"
        role="button"
        :aria-label="c.label"
      >
        <h2 class="card-title">{{ c.label }}</h2>
        <img :src="processedImages[c.id]" class="char-img" alt="" />
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
                placeholder="例如: K9N2B8" 
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
                  placeholder="請輸入您遊戲中的正確ID" 
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
                  placeholder="請輸入此安全問題的回答" 
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
                  placeholder="請輸入您遊戲中的正確ID" 
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
                  placeholder="請輸入您設定的回答" 
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
                若您遺失了識別碼且忘記安全問題答案，請密語遊戲內的「Antigravity」開發團隊，或寄件至系統管理信箱，我們將會協助核對角色身分並找回您的識別碼。
              </p>
              <div class="form-actions">
                <button @click="closeForgotModal" class="btn-submit btn-forgot-glow">確認了解</button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth, SECURITY_QUESTIONS } from '@/composables/useAuth.js'

const router = useRouter()
const hovered = ref(null)
const isMobile = ref(true)
const bgVideo = ref(null)

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
})

onUnmounted(() => {
  cancelAnimationFrame(rafId)
  window.removeEventListener('resize', handleResize)
})

const assets = {
  bg: '/assets/bg-city.png',
}

// 原始系統設定
const CHARS = [
  { id: 'box',     label: '禮盒查詢', icon: '🎁', path: '/boxes'   },
  { id: 'qigong',  label: '好物分享', icon: '💎', path: '/share'   },
  { id: 'warrior', label: '練功團',   icon: '⚔️', path: '/parties' },
  { id: 'snipper', label: '任務指南', icon: '🗺️', path: '/tasks'   },
]

// 根據提示詞設定的顯示順序：warrior, qigong, box, snipper
const displayOrder = ['warrior', 'qigong', 'box', 'snipper']
const displayChars = computed(() => {
  return displayOrder.map(id => CHARS.find(c => c.id === id))
})

const processedImages = {
  qigong: '/assets/char-qigong.png',
  box: '/assets/char-box.png',
  warrior: '/assets/char-warrior.png',
  snipper: '/assets/char-snipper.png',
}

const navigate = (path) => router.push(path)

// MM:SS:FF 轉換為秒數
const parseTime = (timeStr, fps = 30) => {
  if (timeStr === 'end') return Infinity
  const [mm, ss, ff] = timeStr.split(':').map(Number)
  return mm * 60 + ss + ff / fps
}

// 各功能影片播放片段
const SEGMENTS = {
  warrior: [
    { start: parseTime('00:00:00'), end: parseTime('00:02:26') },
    { start: parseTime('00:12:05'), end: parseTime('00:47:27') },
    { start: parseTime('02:31:18'), end: parseTime('end') }
  ],
  box: [
    { start: parseTime('00:02:28'), end: parseTime('00:05:24') },
    { start: parseTime('00:47:28'), end: parseTime('01:18:19') },
    { start: parseTime('02:31:18'), end: parseTime('end') }
  ],
  qigong: [
    { start: parseTime('00:05:25'), end: parseTime('00:08:24') },
    { start: parseTime('01:18:20'), end: parseTime('01:52:09') },
    { start: parseTime('02:31:18'), end: parseTime('end') }
  ],
  snipper: [
    { start: parseTime('00:08:27'), end: parseTime('00:12:03') },
    { start: parseTime('01:52:10'), end: parseTime('02:31:17') },
    { start: parseTime('02:31:18'), end: parseTime('end') }
  ]
}

let currentSegmentIndex = 0
let activeSegments = []
let rafId = null

const checkVideoTime = () => {
  const video = bgVideo.value
  if (!video || video.paused) return

  const currentSec = video.currentTime
  const currentSeg = activeSegments[currentSegmentIndex]

  if (!currentSeg) return

  if (currentSec >= currentSeg.end) {
    currentSegmentIndex++
    if (currentSegmentIndex < activeSegments.length) {
      video.currentTime = activeSegments[currentSegmentIndex].start
    } else {
      video.pause()
      return
    }
  }

  rafId = requestAnimationFrame(checkVideoTime)
}

// 監聽滑鼠焦點切換，控制影片播放與跳轉
watch(hovered, (newVal) => {
  cancelAnimationFrame(rafId)
  const video = bgVideo.value
  if (!video) return

  if (newVal) {
    activeSegments = SEGMENTS[newVal] || []
    currentSegmentIndex = 0
    if (activeSegments.length > 0) {
      video.currentTime = activeSegments[0].start
      video.play().then(() => {
        rafId = requestAnimationFrame(checkVideoTime)
      }).catch(err => {
        console.warn('影片播放被中斷：', err)
      })
    }
  } else {
    video.pause()
  }
})
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
   Neon Cards Layout
   ========================================== */
.cards-container {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px; /* Base gap between cards */
  perspective: 1200px;
}

.neon-card {
  position: relative;
  /* Make all cards identical size */
  height: 68vh;
  width: 22%;
  max-width: 300px;
  min-width: 200px;
  
  background: rgba(10, 15, 25, 0.45); /* Dark textured glass */
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  
  border: 2px solid var(--neon-color);
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow: visible; /* Allow characters to overflow the frame */
  
  cursor: url('/assets/ran2-cursor.cur'), pointer;
  transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
  
  /* Constant subtle glow */
  box-shadow: 0 0 10px var(--neon-color), inset 0 0 20px rgba(0,0,0,0.8);
  
  /* Floor Reflection */
  -webkit-box-reflect: below 8px linear-gradient(transparent 70%, rgba(255,255,255,0.3));
}

/* ── Neon Colors ── */
.card-warrior { --neon-color: rgba(255, 30, 80, 0.5);  --glow-color: rgba(255, 30, 80, 1); }
.card-box     { --neon-color: rgba(204, 0, 255, 0.5);  --glow-color: rgba(204, 0, 255, 1); }
.card-qigong  { --neon-color: rgba(0, 255, 102, 0.5);  --glow-color: rgba(0, 255, 102, 1); }
.card-snipper { --neon-color: rgba(0, 220, 255, 0.5);  --glow-color: rgba(0, 220, 255, 1); }

/* ── Hover Interactions ── */
.cards-container.has-hover .neon-card.is-dimmed {
  opacity: 0.35;
  filter: grayscale(0.6) blur(3px);
  transform: scale(0.95);
  box-shadow: none;
  border-color: rgba(255,255,255,0.1);
}

.neon-card.is-active {
  transform: scale(1.05) translateY(-15px);
  z-index: 10;
  /* Intense Glow */
  border-color: var(--glow-color);
  box-shadow: 0 0 35px var(--glow-color), 
              0 0 70px var(--glow-color), 
              inset 0 0 25px var(--glow-color);
}

/* ── Card Content ── */
.card-title {
  /* 微軟正黑體設定 */
  font-family: 'Microsoft JhengHei', '微軟正黑體', sans-serif;
  font-size: clamp(1.8rem, 2.5vw, 2.8rem);
  font-weight: bold;
  color: #fff;
  margin-top: 25px;
  letter-spacing: 5px;
  text-shadow: 0 0 8px var(--glow-color), 0 0 20px var(--glow-color);
  z-index: 2;
  transition: all 0.3s ease;
  white-space: nowrap; /* 確保文字不換行 */
}

.neon-card.is-active .card-title {
  text-shadow: 0 0 15px #fff, 0 0 30px var(--glow-color), 0 0 50px var(--glow-color);
  transform: scale(1.1);
}

.char-img {
  position: absolute;
  bottom: 0; /* Let it sit on the bottom border */
  width: 130%;
  height: 105%; /* Taller than card to allow overflow */
  object-fit: contain;
  object-position: bottom center;
  z-index: 1;
  pointer-events: none;
  transition: transform 0.4s ease;
}

.neon-card.is-active .char-img {
  /* Slight pop out effect inside the card */
  transform: scale(1.08) translateY(-4%);
}

@media (max-width: 768px) {
  /* 手機版隱藏背景影片以節省效能與流量 */
  .video-background-container {
    display: none;
  }

  .cards-container {
    flex-direction: column;
    overflow-y: auto;
    gap: 30px;
    padding: 30px 0;
  }
  .neon-card {
    width: 80%;
    height: 50vh;
    margin: 0 !important;
  }
  
  /* 手機版：文字改為全置中 (水平+垂直) */
  .card-title {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    margin-top: 0;
    font-size: 2.8rem;
  }
  
  .neon-card.is-active .card-title {
    transform: translate(-50%, -50%) scale(1.1);
  }
}

/* ==========================================
   Background Video Styles
   ========================================== */
.video-background-container {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
  pointer-events: none;
}

.bg-video {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 90%;
  height: 90%;
  object-fit: cover;
  opacity: 0;
  filter: blur(10px);
  transform: translate(-50%, -50%) scale(1.05);
  transition: opacity 0.8s ease, filter 0.8s ease, transform 1.2s cubic-bezier(0.25, 0.8, 0.25, 1);
  pointer-events: none;
  border-radius: 20px;

  /* 漸層羽化遮罩，消除上下裁切硬邊 */
  mask-image: linear-gradient(to bottom, transparent 0%, #000 15%, #000 85%, transparent 100%);
  -webkit-mask-image: linear-gradient(to bottom, transparent 0%, #000 15%, #000 85%, transparent 100%);
}

.bg-video.is-visible {
  opacity: 0.35;
  filter: blur(0);
  transform: translate(-50%, -50%) scale(1);
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
.dropdown-logout-btn {
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
