<template>
  <div v-if="showTopNoticePopup && currentTopNotice" class="modal-overlay" @click="closeTopNoticePopup" style="z-index: 9998;">
    <div class="modal-content glass-card top-notice-modal" @click.stop>
      <!-- Header -->
      <div class="top-notice-header">
        <div class="header-badge-title">
          <span class="top-badge-pulse">📌 置頂公告</span>
          <span v-if="topNotices.length > 1" class="top-counter-badge">
            {{ currentIndex + 1 }} / {{ topNotices.length }}
          </span>
        </div>
        <button class="modal-close-btn" @click="closeTopNoticePopup" title="關閉">✕</button>
      </div>

      <!-- Multiple Top Notices Switcher Tabs (If topNotices > 1) -->
      <div v-if="topNotices.length > 1" class="top-switcher-bar">
        <button
          v-for="(item, idx) in topNotices"
          :key="item.id"
          class="top-tab-pill"
          :class="{ 'active-pill': idx === currentIndex }"
          @click="currentIndex = idx"
        >
          {{ idx + 1 }}. {{ item.title }}
        </button>
      </div>

      <!-- Notice Title -->
      <h2 class="top-title">{{ currentTopNotice.title }}</h2>

      <!-- Date Meta -->
      <div class="top-meta">
        <span>🕒 發布時間：{{ formatYYMMDDHH(currentTopNotice.createdAt) }}</span>
        <span>標籤：{{ currentTopNotice.type }}</span>
      </div>

      <hr class="top-divider" />

      <!-- Notice Content (Markdown) -->
      <div class="top-notice-body">
        <MarkdownViewer :content="currentTopNotice.content" />
      </div>

      <!-- Footer with Carousel Arrows & "Do Not Show Again" -->
      <div class="top-notice-footer">
        <button class="btn-dismiss-forever" @click="dismissTopNoticePermanently">
          🚫 不再顯示
        </button>

        <div class="footer-actions">
          <div v-if="topNotices.length > 1" class="top-nav-arrows">
            <button class="arrow-btn" @click="prevTopNotice" title="上一筆置頂">‹ 上一筆</button>
            <button class="arrow-btn" @click="nextTopNotice" title="下一筆置頂">下一筆 ›</button>
          </div>
          <button class="btn-top-close" @click="closeTopNoticePopup">
            關閉視窗
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useNotice } from '../composables/useNotice'
import MarkdownViewer from './MarkdownViewer.vue'

const {
  topNotices,
  showTopNoticePopup,
  closeTopNoticePopup,
  dismissTopNoticePermanently,
  formatYYMMDDHH
} = useNotice()

const currentIndex = ref(0)

// 當置頂列表或視窗打開時重置 index
watch([showTopNoticePopup, topNotices], () => {
  if (showTopNoticePopup.value) {
    currentIndex.value = 0
  }
})

const currentTopNotice = computed(() => {
  if (topNotices.value.length === 0) return null
  return topNotices.value[currentIndex.value] || topNotices.value[0]
})

function nextTopNotice() {
  if (topNotices.value.length === 0) return
  currentIndex.value = (currentIndex.value + 1) % topNotices.value.length
}

function prevTopNotice() {
  if (topNotices.value.length === 0) return
  currentIndex.value = (currentIndex.value - 1 + topNotices.value.length) % topNotices.value.length
}
</script>

<style scoped>
.top-notice-modal {
  width: 720px;
  height: 580px;
  max-width: 95vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  padding: 26px;
  background: rgba(15, 23, 42, 0.97);
  border: 1px solid rgba(245, 158, 11, 0.5);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.85), 0 0 25px rgba(245, 158, 11, 0.25);
  border-radius: 16px;
}

.top-notice-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.header-badge-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.top-badge-pulse {
  background: linear-gradient(135deg, #f59e0b, #ef4444);
  color: #ffffff;
  font-weight: 800;
  font-size: 0.88rem;
  padding: 4px 12px;
  border-radius: 20px;
  box-shadow: 0 0 12px rgba(245, 158, 11, 0.5);
}

.top-counter-badge {
  background: rgba(255, 255, 255, 0.1);
  color: #e2e8f0;
  font-size: 0.8rem;
  padding: 3px 8px;
  border-radius: 10px;
}

.modal-close-btn {
  background: transparent;
  border: none;
  color: #94a3b8;
  font-size: 1.4rem;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: all 0.2s;
}

.modal-close-btn:hover {
  color: #f43f5e;
  background: rgba(244, 63, 94, 0.1);
}

.top-switcher-bar {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 8px;
  margin-bottom: 12px;
}

.top-switcher-bar::-webkit-scrollbar {
  height: 4px;
}

.top-switcher-bar::-webkit-scrollbar-thumb {
  background: rgba(245, 158, 11, 0.4);
  border-radius: 2px;
}

.top-tab-pill {
  padding: 5px 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  color: #94a3b8;
  font-size: 0.82rem;
  white-space: nowrap;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
  transition: all 0.2s;
}

.top-tab-pill.active-pill {
  background: rgba(245, 158, 11, 0.2);
  border-color: #f59e0b;
  color: #f59e0b;
  font-weight: 700;
}

.top-title {
  font-size: 1.35rem;
  font-weight: 800;
  color: #f8fafc;
  margin: 0 0 8px 0;
  line-height: 1.4;
}

.top-meta {
  display: flex;
  gap: 16px;
  font-size: 0.82rem;
  color: #94a3b8;
  margin-bottom: 12px;
}

.top-divider {
  border: 0;
  height: 1px;
  background: linear-gradient(90deg, rgba(245, 158, 11, 0.5), transparent);
  margin: 0 0 16px 0;
}

.top-notice-body {
  flex: 1;
  overflow-y: auto;
  min-height: 220px;
  margin-bottom: 18px;
  padding-right: 4px;
}

.top-notice-body::-webkit-scrollbar {
  width: 6px;
}

.top-notice-body::-webkit-scrollbar-thumb {
  background: rgba(245, 158, 11, 0.3);
  border-radius: 3px;
}

.top-notice-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding-top: 14px;
}

.btn-dismiss-forever {
  padding: 8px 16px;
  border-radius: 8px;
  background: rgba(244, 63, 94, 0.1);
  border: 1px solid rgba(244, 63, 94, 0.3);
  color: #fb7185;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-dismiss-forever:hover {
  background: rgba(244, 63, 94, 0.25);
  border-color: #f43f5e;
  color: #ffffff;
}

.footer-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.top-nav-arrows {
  display: flex;
  gap: 6px;
}

.arrow-btn {
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #e2e8f0;
  border-radius: 6px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
}

.arrow-btn:hover {
  background: rgba(245, 158, 11, 0.2);
  border-color: #f59e0b;
  color: #f59e0b;
}

.btn-top-close {
  padding: 8px 20px;
  border-radius: 8px;
  background: linear-gradient(135deg, #f59e0b, #d97706);
  border: none;
  color: #0f172a;
  font-weight: 800;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 0 12px rgba(245, 158, 11, 0.4);
}

.btn-top-close:hover {
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
  transform: translateY(-1px);
}
</style>
