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
          <span v-if="isLoggedIn" class="user-info">
            <span class="user-name">[{{ currentUser.server }}][{{ currentUser.dept }}]{{ currentUser.charId }}</span>
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
      <p>© 2026 亂2萬事通 - Design By 幻海奇緣</p>
    </footer>
  </div>
</template>

<script setup>
import { ref } from 'vue'
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
</style>

