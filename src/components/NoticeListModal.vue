<template>
  <div v-if="showListModal" class="modal-overlay" @click="closeNoticeList" style="z-index: 9990;">
    <div class="modal-content glass-card notice-list-modal" @click.stop>
      <!-- Header / Title & Close -->
      <div class="notice-modal-header">
        <div class="header-title-wrap">
          <span class="header-icon">📢</span>
          <h3 class="modal-title neon-text-notice">布告欄</h3>
        </div>
        <button class="modal-close-btn" @click="closeNoticeList" title="關閉">✕</button>
      </div>

      <!-- Tab Navigation -->
      <div class="notice-tab-header">
        <button
          class="notice-tab-btn"
          :class="{ 'active-tab': activeTab === '公告消息' }"
          @click="setTab('公告消息')"
        >
          📰 公告消息
        </button>
        <button
          class="notice-tab-btn"
          :class="{ 'active-tab': activeTab === '更新歷程' }"
          @click="setTab('更新歷程')"
        >
          🚀 更新歷程
        </button>
      </div>

      <!-- Notice List Body -->
      <div class="notice-modal-body">
        <div v-if="isLoadingNotices" class="empty-notice">
          ⏳ 公告載入中...
        </div>
        <div v-else-if="paginatedNotices.length === 0" class="empty-notice">
          目前尚無相關公告
        </div>

        <ul v-else class="notice-item-list">
          <li
            v-for="item in paginatedNotices"
            :key="item.id"
            class="notice-item"
            :class="{ 'is-top': item.top }"
            @click="handleNoticeClick(item)"
          >
            <!-- Date YYMMDDHH Badge -->
            <span class="notice-date-badge">
              {{ formatYYMMDDHH(item.createdAt) }}
            </span>

            <!-- Top Badge (if top === true) -->
            <span v-if="item.top" class="notice-top-tag">
              📌 置頂
            </span>

            <!-- Notice Title -->
            <span class="notice-item-title" :title="item.title">
              {{ item.title }}
            </span>

            <!-- Arrow hint -->
            <span class="notice-item-arrow">›</span>
          </li>
        </ul>
      </div>

      <!-- Pagination Footer -->
      <div class="notice-modal-footer">
        <div class="pagination-controls">
          <button
            class="pagination-btn"
            :disabled="currentPage <= 1"
            @click="setPage(currentPage - 1)"
          >
            ‹ 上一頁
          </button>
          <span class="pagination-info">
            第 {{ currentPage }} / {{ totalPages }} 頁
          </span>
          <button
            class="pagination-btn"
            :disabled="currentPage >= totalPages"
            @click="setPage(currentPage + 1)"
          >
            下一頁 ›
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useNotice } from '../composables/useNotice'

const {
  activeTab,
  currentPage,
  totalPages,
  paginatedNotices,
  isLoadingNotices,
  showListModal,
  setTab,
  setPage,
  closeNoticeList,
  openNoticeDetail,
  formatYYMMDDHH
} = useNotice()

function handleNoticeClick(item) {
  openNoticeDetail(item)
}
</script>

<style scoped>
.notice-list-modal {
  width: 720px;
  height: 580px;
  max-width: 95vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  padding: 24px;
  background: rgba(15, 23, 42, 0.95);
  border: 1px solid rgba(56, 189, 248, 0.3);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.7), 0 0 20px rgba(56, 189, 248, 0.15);
  border-radius: 16px;
  position: relative;
}

.notice-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.header-title-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-icon {
  font-size: 1.5rem;
}

.neon-text-notice {
  color: #38bdf8;
  font-size: 1.4rem;
  font-weight: 800;
  text-shadow: 0 0 10px rgba(56, 189, 248, 0.5);
  margin: 0;
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

.notice-tab-header {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 10px;
}

.notice-tab-btn {
  padding: 8px 18px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #94a3b8;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.notice-tab-btn:hover {
  background: rgba(56, 189, 248, 0.1);
  color: #e2e8f0;
}

.notice-tab-btn.active-tab {
  background: linear-gradient(135deg, rgba(56, 189, 248, 0.2), rgba(168, 85, 247, 0.2));
  border-color: #38bdf8;
  color: #38bdf8;
  box-shadow: 0 0 10px rgba(56, 189, 248, 0.3);
}

.notice-modal-body {
  flex: 1;
  overflow-y: auto;
  min-height: 320px;
  margin-bottom: 16px;
  padding-right: 4px;
}

.notice-modal-body::-webkit-scrollbar {
  width: 6px;
}

.notice-modal-body::-webkit-scrollbar-thumb {
  background: rgba(56, 189, 248, 0.3);
  border-radius: 3px;
}

.empty-notice {
  text-align: center;
  color: #64748b;
  padding: 60px 0;
  font-size: 1rem;
}

.notice-item-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.notice-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: rgba(30, 41, 59, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.notice-item:hover {
  background: rgba(56, 189, 248, 0.12);
  border-color: rgba(56, 189, 248, 0.4);
  transform: translateX(4px);
}

.notice-item.is-top {
  background: rgba(168, 85, 247, 0.12);
  border-color: rgba(168, 85, 247, 0.4);
}

.notice-item.is-top:hover {
  background: rgba(168, 85, 247, 0.22);
}

.notice-date-badge {
  font-family: 'Fira Code', monospace;
  font-size: 0.85rem;
  font-weight: 700;
  color: #f59e0b;
  background: rgba(245, 158, 11, 0.15);
  padding: 4px 8px;
  border-radius: 6px;
  letter-spacing: 0.5px;
  white-space: nowrap;
}

.notice-top-tag {
  font-size: 0.78rem;
  font-weight: 800;
  color: #a855f7;
  background: rgba(168, 85, 247, 0.2);
  border: 1px solid rgba(168, 85, 247, 0.4);
  padding: 3px 8px;
  border-radius: 6px;
  white-space: nowrap;
}

.notice-item-title {
  flex: 1;
  color: #e2e8f0;
  font-size: 0.95rem;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.notice-item-arrow {
  color: #64748b;
  font-size: 1.2rem;
  font-weight: bold;
  transition: color 0.2s;
}

.notice-item:hover .notice-item-arrow {
  color: #38bdf8;
}

.notice-modal-footer {
  display: flex;
  justify-content: center;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 16px;
}

.pagination-btn {
  padding: 6px 14px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #e2e8f0;
  font-size: 0.88rem;
  cursor: pointer;
  transition: all 0.2s;
}

.pagination-btn:hover:not(:disabled) {
  background: rgba(56, 189, 248, 0.2);
  border-color: #38bdf8;
  color: #38bdf8;
}

.pagination-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.pagination-info {
  font-size: 0.9rem;
  color: #94a3b8;
  font-weight: 500;
}
</style>
