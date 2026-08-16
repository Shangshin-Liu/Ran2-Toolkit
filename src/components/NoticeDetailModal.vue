<template>
  <div v-if="showDetailModal && selectedNotice" class="modal-overlay" @click="closeNoticeDetail" style="z-index: 9995;">
    <div class="modal-content glass-card notice-detail-modal" @click.stop>
      <!-- Header -->
      <div class="detail-header">
        <div class="detail-badges">
          <span class="detail-type-badge" :class="selectedNotice.type === '公告消息' ? 'type-news' : 'type-update'">
            {{ selectedNotice.type }}
          </span>
          <span v-if="selectedNotice.top" class="detail-top-badge">
            📌 置頂文章
          </span>
        </div>
        <button class="modal-close-btn" @click="closeNoticeDetail" title="關閉">✕</button>
      </div>

      <!-- Title -->
      <h2 class="detail-title">{{ selectedNotice.title }}</h2>

      <!-- Date Info -->
      <div class="detail-meta">
        <span class="meta-item">
          🕒 發布時間：{{ formatFullDate(selectedNotice.createdAt) }} ({{ formatYYMMDDHH(selectedNotice.createdAt) }})
        </span>
        <span v-if="selectedNotice.updatedAt !== selectedNotice.createdAt" class="meta-item">
          ✏️ 更新時間：{{ formatFullDate(selectedNotice.updatedAt) }}
        </span>
      </div>

      <hr class="detail-divider" />

      <!-- Content (Markdown) -->
      <div class="detail-body">
        <MarkdownViewer :content="selectedNotice.content" />
      </div>

      <!-- Footer Close Button -->
      <div class="detail-footer">
        <button class="btn-detail-close" @click="closeNoticeDetail">
          關閉文章
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useNotice } from '../composables/useNotice'
import MarkdownViewer from './MarkdownViewer.vue'

const {
  showDetailModal,
  selectedNotice,
  closeNoticeDetail,
  formatYYMMDDHH
} = useNotice()

function formatFullDate(dateVal) {
  if (!dateVal) return ''
  const d = new Date(dateVal)
  if (isNaN(d.getTime())) return dateVal
  return d.toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
}
</script>

<style scoped>
.notice-detail-modal {
  width: 720px;
  height: 580px;
  max-width: 95vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  padding: 28px;
  background: rgba(15, 23, 42, 0.96);
  border: 1px solid rgba(168, 85, 247, 0.4);
  box-shadow: 0 10px 35px rgba(0, 0, 0, 0.8), 0 0 25px rgba(168, 85, 247, 0.2);
  border-radius: 16px;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.detail-badges {
  display: flex;
  gap: 8px;
  align-items: center;
}

.detail-type-badge {
  font-size: 0.82rem;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 6px;
}

.type-news {
  background: rgba(56, 189, 248, 0.2);
  color: #38bdf8;
  border: 1px solid rgba(56, 189, 248, 0.4);
}

.type-update {
  background: rgba(16, 185, 129, 0.2);
  color: #10b981;
  border: 1px solid rgba(16, 185, 129, 0.4);
}

.detail-top-badge {
  font-size: 0.82rem;
  font-weight: 800;
  background: rgba(168, 85, 247, 0.25);
  color: #a855f7;
  border: 1px solid rgba(168, 85, 247, 0.5);
  padding: 4px 10px;
  border-radius: 6px;
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

.detail-title {
  font-size: 1.4rem;
  font-weight: 800;
  color: #f8fafc;
  margin: 0 0 10px 0;
  line-height: 1.4;
}

.detail-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  font-size: 0.85rem;
  color: #94a3b8;
  margin-bottom: 12px;
}

.detail-divider {
  border: 0;
  height: 1px;
  background: linear-gradient(90deg, rgba(168, 85, 247, 0.5), rgba(56, 189, 248, 0.5), transparent);
  margin: 0 0 16px 0;
}

.detail-body {
  flex: 1;
  overflow-y: auto;
  min-height: 250px;
  margin-bottom: 20px;
  padding-right: 6px;
}

.detail-body::-webkit-scrollbar {
  width: 6px;
}

.detail-body::-webkit-scrollbar-thumb {
  background: rgba(168, 85, 247, 0.4);
  border-radius: 3px;
}

.detail-footer {
  display: flex;
  justify-content: flex-end;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding-top: 14px;
}

.btn-detail-close {
  padding: 8px 22px;
  border-radius: 8px;
  background: linear-gradient(135deg, #334155, #1e293b);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #f8fafc;
  font-weight: 600;
  font-size: 0.92rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-detail-close:hover {
  background: linear-gradient(135deg, #475569, #334155);
  border-color: rgba(255, 255, 255, 0.4);
  box-shadow: 0 0 12px rgba(255, 255, 255, 0.1);
}
</style>
