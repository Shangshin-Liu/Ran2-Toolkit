<template>
  <div class="tasks-page">
    <div class="page-header">
      <h2 class="neon-text-snipper">🗺️ 任務指南</h2>
      <p class="subtitle">追尋冒險的腳步，完成任務獲取豐厚獎勵與神秘禮盒</p>
    </div>

    <div class="tasks-layout">
      <!-- 左側：任務清單卡片 -->
      <div class="tasks-list-panel">
        <div 
          v-for="task in tasks" 
          :key="task.id" 
          class="task-card glass-card"
          :class="{ 'active-task': selectedTask.id === task.id }"
          @click="selectTask(task)"
        >
          <div class="task-card-header">
            <h3 class="task-card-title">{{ task.name }}</h3>
          </div>
          <p class="task-card-giver">接取NPC: {{ getTaskGiver(task) }}</p>
          <div class="task-card-rewards-preview">
            <span v-for="(reward, idx) in getRewardsList(task).slice(0, 3)" :key="idx" class="reward-preview-badge">
              {{ reward.icon }} {{ reward.name }}
            </span>
          </div>
        </div>
      </div>

      <!-- 右側：任務詳細資訊 (Desktop 顯示) -->
      <div class="task-detail-panel glass-card neon-border-snipper" v-if="selectedTask">
        <div class="detail-header">
          <div class="detail-title-row">
            <h2 class="detail-title neon-text-snipper">{{ selectedTask.name }}</h2>
          </div>
          <p class="detail-giver"><strong>接取方式：</strong>{{ selectedTask.startLocation.desc }}</p>
        </div>

        <hr class="divider" />

        <!-- 接取條件區塊 (清單呈現) -->
        <div class="detail-section" v-if="selectedTask.requirements && selectedTask.requirements.length">
          <h3 class="section-title">📋 接取條件</h3>
          <ul class="bullet-list">
            <li v-for="(req, idx) in selectedTask.requirements" :key="idx">
              <template v-if="req.isPrerequisite && req.url">
                完成 
                <a 
                  href="#" 
                  class="req-link" 
                  @click.prevent="openTaskPreview(req.url.split('/').pop())"
                >
                  {{ req.desc.replace('完成 ', '') }}
                </a>
              </template>
              <template v-else>
                {{ req.desc }}
              </template>
            </li>
          </ul>
        </div>

        <!-- 地點與地圖示意 -->
        <div class="detail-section" v-if="selectedTask.startLocation.image">
          <h3 class="section-title">📍 任務地點示意</h3>
          <div class="map-container">
            <img :src="selectedTask.startLocation.image" alt="Map Location" class="map-img" />
            <div class="map-overlay">
              <span class="coords-tag">{{ selectedTask.startLocation.desc }}</span>
            </div>
          </div>
        </div>

        <!-- 流程時間軸 -->
        <div class="detail-section">
          <h3 class="section-title">⚡ 執行流程</h3>
          <div class="timeline">
            <div v-for="(step, idx) in selectedTask.steps" :key="idx" class="timeline-item">
              <div class="timeline-badge">{{ idx + 1 }}</div>
              <div class="timeline-content">
                <p class="step-desc">{{ step.desc }}</p>
                <img v-if="step.image" :src="step.image" alt="Step Screenshot" class="step-img" />
              </div>
            </div>
          </div>
        </div>

        <!-- 獎勵區塊 -->
        <div class="detail-section">
          <h3 class="section-title">🎁 任務獎勵</h3>
          <div class="rewards-grid">
            <div v-for="(reward, idx) in getRewardsList(selectedTask)" :key="idx" class="reward-item">
              <span class="reward-icon">{{ reward.icon }}</span>
              <div class="reward-info">
                <!-- 禮盒超連結預覽 -->
                <a 
                  v-if="reward.isLink" 
                  href="#"
                  class="reward-link-btn"
                  @click.prevent="openBoxPreview(reward.name)"
                >
                  {{ reward.name }} <span class="link-arrow">↗</span>
                </a>
                <span v-else class="reward-name">{{ reward.name }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 小技巧與注意事項 -->
        <div class="detail-tips-warnings">
          <div class="tips-box" v-if="selectedTask.tips && selectedTask.tips.length">
            <h4>💡 小技巧</h4>
            <ul class="bullet-list">
              <li v-for="(tip, idx) in selectedTask.tips" :key="idx">{{ tip }}</li>
            </ul>
          </div>
          <div class="warnings-box" v-if="selectedTask.notes && selectedTask.notes.length">
            <h4>⚠️ 注意事項</h4>
            <ul class="bullet-list">
              <li v-for="(note, idx) in selectedTask.notes" :key="idx">{{ note }}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <!-- 手機版抽屜 (iPhone 17 彈窗顯示詳細資訊) -->
    <div class="mobile-drawer-overlay" v-if="showMobileDetail" @click="closeMobileDetail">
      <div class="mobile-drawer glass-card neon-border-snipper" @click.stop>
        <button class="close-btn" @click="closeMobileDetail">✕</button>
        <div class="drawer-content">
          <div class="detail-title-row">
            <h2 class="detail-title neon-text-snipper">{{ selectedTask.name }}</h2>
          </div>
          <p class="detail-giver"><strong>接取：</strong>{{ selectedTask.startLocation.desc }}</p>
          
          <div class="detail-section" v-if="selectedTask.requirements && selectedTask.requirements.length" style="margin-top: 10px;">
            <h3 class="section-title" style="font-size: 1rem;">📋 接取條件</h3>
            <ul class="bullet-list">
              <li v-for="(req, idx) in selectedTask.requirements" :key="idx">
                <template v-if="req.isPrerequisite && req.url">
                  完成 
                  <a 
                    href="#" 
                    class="req-link" 
                    @click.prevent="openTaskPreview(req.url.split('/').pop())"
                  >
                    {{ req.desc.replace('完成 ', '') }}
                  </a>
                </template>
                <template v-else>
                  {{ req.desc }}
                </template>
              </li>
            </ul>
          </div>

          <div class="map-container" v-if="selectedTask.startLocation.image">
            <img :src="selectedTask.startLocation.image" alt="Map Location" class="map-img" />
          </div>

          <div class="timeline">
            <div v-for="(step, idx) in selectedTask.steps" :key="idx" class="timeline-item">
              <div class="timeline-badge">{{ idx + 1 }}</div>
              <div class="timeline-content">
                <p class="step-desc">{{ step.desc }}</p>
                <img v-if="step.image" :src="step.image" alt="Step Screenshot" class="step-img" />
              </div>
            </div>
          </div>

          <div class="rewards-grid">
            <div v-for="(reward, idx) in getRewardsList(selectedTask)" :key="idx" class="reward-item">
              <span class="reward-icon">{{ reward.icon }}</span>
              <div class="reward-info">
                <a 
                  v-if="reward.isLink" 
                  href="#"
                  class="reward-link-btn"
                  @click.prevent="openBoxPreview(reward.name)"
                >
                  {{ reward.name }} ↗
                </a>
                <span v-else class="reward-name">{{ reward.name }}</span>
              </div>
            </div>
          </div>

          <div class="tips-box" style="margin-top: 15px;" v-if="selectedTask.tips && selectedTask.tips.length">
            <h4>💡 小技巧</h4>
            <ul class="bullet-list">
              <li v-for="(tip, idx) in selectedTask.tips" :key="idx">{{ tip }}</li>
            </ul>
          </div>
          
          <div class="warnings-box" style="margin-top: 15px;" v-if="selectedTask.notes && selectedTask.notes.length">
            <h4>⚠️ 注意事項</h4>
            <ul class="bullet-list">
              <li v-for="(note, idx) in selectedTask.notes" :key="idx">{{ note }}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <!-- 🗺️ 前置任務詳情預覽 Modal -->
    <div class="modal-overlay" v-if="showPreviewModal" @click="showPreviewModal = false">
      <div class="modal-content glass-card neon-border-snipper" @click.stop>
        <button class="modal-close-btn" @click="showPreviewModal = false">✕</button>
        
        <div class="modal-body" v-if="previewTask">
          <div class="detail-header">
            <div class="detail-title-row">
              <h2 class="detail-title neon-text-snipper" style="font-size: 1.5rem; margin-bottom: 0;">{{ previewTask.name }}</h2>
            </div>
            <p class="detail-giver" style="font-size: 0.85rem; margin-top: 8px;"><strong>接取方式：</strong>{{ previewTask.startLocation.desc }}</p>
          </div>

          <hr class="divider" />

          <!-- 滾動內容區 -->
          <div class="modal-scroll-area">
            <!-- 流程時間軸 -->
            <div class="detail-section">
              <h3 class="section-title" style="font-size: 1rem;">⚡ 執行流程</h3>
              <div class="timeline">
                <div v-for="(step, idx) in previewTask.steps" :key="idx" class="timeline-item">
                  <div class="timeline-badge">{{ idx + 1 }}</div>
                  <div class="timeline-content">
                    <p class="step-desc">{{ step.desc }}</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- 獎勵區塊 -->
            <div class="detail-section">
              <h3 class="section-title" style="font-size: 1rem;">🎁 任務獎勵</h3>
              <div class="rewards-grid">
                <div v-for="(reward, idx) in getRewardsList(previewTask)" :key="idx" class="reward-item">
                  <span class="reward-icon">{{ reward.icon }}</span>
                  <div class="reward-info">
                    <a 
                      v-if="reward.isLink" 
                      href="#"
                      class="reward-link-btn"
                      @click.prevent="openBoxPreview(reward.name)"
                    >
                      {{ reward.name }} ↗
                    </a>
                    <span v-else class="reward-name">{{ reward.name }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 小技巧與注意事項 -->
            <div class="detail-tips-warnings" style="margin-top: 15px;">
              <div class="tips-box" v-if="previewTask.tips && previewTask.tips.length">
                <h4>💡 小技巧</h4>
                <ul class="bullet-list">
                  <li v-for="(tip, idx) in previewTask.tips" :key="idx">{{ tip }}</li>
                </ul>
              </div>
              <div class="warnings-box" v-if="previewTask.notes && previewTask.notes.length">
                <h4>⚠️ 注意事項</h4>
                <ul class="bullet-list">
                  <li v-for="(note, idx) in previewTask.notes" :key="idx">{{ note }}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 🎁 禮盒內容物詳情預覽 Modal -->
    <div class="modal-overlay" v-if="showBoxModal" @click="showBoxModal = false">
      <div class="modal-content glass-card" @click.stop style="border-color: rgba(200, 0, 255, 0.25); box-shadow: 0 10px 40px rgba(0, 0, 0, 0.8), 0 0 30px rgba(200, 0, 255, 0.15);">
        <button class="modal-close-btn" @click="showBoxModal = false">✕</button>
        
        <div class="modal-body" v-if="previewBox">
          <div class="detail-header">
            <div class="detail-title-row">
              <h2 class="detail-title neon-text-box" style="font-size: 1.5rem; margin-bottom: 0;">{{ previewBox.name }}</h2>
            </div>
            <p class="detail-giver" style="font-size: 0.85rem; margin-top: 8px;">📂 獲取途徑：<strong>{{ previewBox.obtain }}</strong></p>
          </div>

          <hr class="divider" />

          <div class="modal-scroll-area">
            <!-- 內容物預覽 -->
            <div class="detail-section">
              <h3 class="section-title" style="font-size: 1rem; border-left-color: var(--color-box);">🎒 內容物預覽</h3>
              <ul class="stats-list">
                <li v-for="(item, idx) in previewBox.items" :key="idx" class="stat-li">
                  <span class="stat-bullet">{{ getItemIcon(item.rarity) }}</span>
                  <span class="stat-text" :class="item.rarity + '-text'">
                    {{ item.name }} 
                    <span class="rate-val" v-if="item.rate">({{ item.rate }})</span>
                  </span>
                </li>
              </ul>
            </div>

            <!-- 注意事項 -->
            <div class="detail-section" v-if="previewBox.warning">
              <div class="warnings-box" style="background: rgba(200, 0, 255, 0.03); border-color: rgba(200, 0, 255, 0.1);">
                <h4 style="color: var(--color-box); margin-bottom: 6px;">⚠️ 注意事項</h4>
                <p style="font-size: 0.85rem; color: var(--text-muted); line-height: 1.5;">{{ previewBox.warning }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import boxesData from '@/assets/data/boxes.json'

const tasks = ref([
  {
    id: 'task-1',
    name: '【劇情】『KO』滑輪高手',
    requirements: [
      { desc: '等級達到 Lv. 80', url: '' }
    ],
    startLocation: {
      desc: '商洞 中央廣場周圍的四塊草皮很多 (NPC: 自動接取)',
      image: '/assets/tasks/asset1.jpg'
    },
    steps: [
      { desc: '擊殺滑輪高手 35 個', image: '' }
    ],
    rewards: {
      statsPoints: 0,
      skillPoints: 0,
      customRewards: [
        { desc: '劍道部練功禮盒(7D)【LV.80】', url: '/boxes?search=劍道部練功禮盒(7D)【LV.80】' }
      ]
    },
    tips: [
      '穿著校服全點敏捷就能扛住了'
    ],
    notes: [
      '不要引太多，滑輪高手會麻痺敵人',
      '被麻痺的時候，G奶七仔會主動攻擊',
      '看到拐子手快跑，他會晕人'
    ]
  },
  {
    id: 'task-2',
    name: '【劇情】惹事生非的街道',
    requirements: [
      { desc: '完成 【劇情】『KO』滑輪高手', url: '/tasks/task-1', isPrerequisite: true },
      { desc: '等級達到 Lv. 100', url: '' },
      { desc: '接取限制：不可超過 120 等', url: '' }
    ],
    startLocation: {
      desc: '涉谷 (NPC: 人人有功練100等任務，可從商洞進入)',
      image: '/assets/tasks/asset2.jpg'
    },
    steps: [
      { desc: '收集草莓有奶 19 個，糖本肛 19 個 (涉谷約28/49)', image: '' }
    ],
    rewards: {
      statsPoints: 0,
      skillPoints: 0,
      customRewards: [
        { desc: '劍道部練功禮盒(7D)【LV.100】', url: '/boxes?search=劍道部練功禮盒(7D)【LV.100】' }
      ]
    },
    tips: [
      '先穿上 KO 滑輪高手拿到的 80 等獎勵再去挑戰',
      '怕時間不夠可以先移動到涉谷大約 37/22 的位置後，利用新手送的起點卡飛回學院再接任務後立刻用前點回原本位置',
      '糖本肛所在的位置周圍都是主動怪還會給麻痺狀態很煩，少量打搭配修練念珠熬死對方'
    ],
    notes: [
      '任務有時間限制：30 分鐘',
      '死掉不會導致任務失敗',
      '任務獎勵還不到太重要，可不接',
      '任務獎勵送的 C 停卡有限制 120 等以下才能使用，若不想浪費 C 停卡要盡快使用'
    ]
  },
  {
    id: 'task-3',
    name: '【劇情】變態三男的逆襲',
    requirements: [
      { desc: '完成 【劇情】惹事生非的街道', url: '/tasks/task-2', isPrerequisite: true },
      { desc: '等級達到 Lv. 110', url: '' },
      { desc: '接取限制：不可超過 130 等', url: '' }
    ],
    startLocation: {
      desc: '圍繞商洞周邊 (NPC: 人人有功練110等任務)',
      image: '/assets/tasks/asset3.jpg'
    },
    steps: [
      { desc: '擊殺光頭猛男 13 個 (商洞 84/168 左右，俗稱高爾夫球場)', image: '' },
      { desc: '擊殺漁夫 13 個 (綜合碼頭 68/117)', image: '' },
      { desc: '擊殺腳文字C 13 個 (涉谷 35/38)', image: '' }
    ],
    rewards: {
      statsPoints: 1,
      skillPoints: 1,
      customRewards: [
        { desc: '劍道部練功禮盒(7D)【LV.110】', url: '/boxes?search=劍道部練功禮盒(7D)【LV.110】' }
      ]
    },
    tips: [
      '怕時間不夠可以先調查怪物所在的位置後，搭配起點/前點在接任務',
      '打光頭的時候，附近怪物都會讓人暈眩，太多怪追著你的時候，使用起點/前點快速切圖可以讓怪物不追',
      '打完光頭後直接起點回到學院，再搭乘小轎車到商洞去碼頭會比較快，也可以防止小怪騷擾',
      '打漁夫不要走太深，因為涉谷很遙遠'
    ],
    notes: [
      '任務有時間限制：30 分鐘',
      '死掉不會導致任務失敗',
      '千萬不可錯過'
    ]
  },
  {
    id: 'task-4',
    name: '【劇情】賊頭殺殺殺',
    requirements: [
      { desc: '完成 【劇情】變態三男的逆襲', url: '/tasks/task-3', isPrerequisite: true },
      { desc: '等級達到 Lv. 120', url: '' },
      { desc: '接取限制：不可超過 140 等', url: '' }
    ],
    startLocation: {
      desc: '綜合碼頭 (NPC: 人人有功練120等任務)',
      image: '/assets/tasks/asset3.jpg'
    },
    steps: [
      { desc: '擊殺警棍賊頭 21 個 (85/110)', image: '' },
      { desc: '擊殺賊頭槍手 21 個 (102/81)', image: '' }
    ],
    rewards: {
      statsPoints: 1,
      skillPoints: 1,
      customRewards: [
        { desc: '劍道部練功禮盒(7D)【LV.120】', url: '/boxes?search=劍道部練功禮盒(7D)【LV.120】' }
      ]
    },
    tips: [
      '怕時間不夠可以先調查怪物所在的位置後，搭配起點/前點在接任務',
      '警棍賊頭會麻痺，既然都會行動不便不如多引幾隻打',
      '賊頭槍手會暈眩，中這個狀態會被斷招，建議引 3 隻打就好，太多隻會導致一直被暈'
    ],
    notes: [
      '任務有時間限制：30 分鐘',
      '死掉不會導致任務失敗',
      '千萬不可錯過'
    ]
  }
])

const selectedTask = ref(tasks.value[0])
const showMobileDetail = ref(false)
const previewTask = ref(null)
const showPreviewModal = ref(false)
const previewBox = ref(null)
const showBoxModal = ref(false)

const selectTask = (task) => {
  selectedTask.value = task
  if (window.innerWidth <= 900) {
    showMobileDetail.value = true
  }
}

const selectTaskById = (id) => {
  const found = tasks.value.find(t => t.id === id)
  if (found) {
    selectedTask.value = found
    if (window.innerWidth <= 900) {
      showMobileDetail.value = true
    }
  }
}

const openTaskPreview = (id) => {
  const found = tasks.value.find(t => t.id === id)
  if (found) {
    previewTask.value = found
    showPreviewModal.value = true
  }
}

const openBoxPreview = (name) => {
  // 模糊匹配包含名稱的禮盒
  const found = boxesData.find(b => b.name.includes(name))
  if (found) {
    previewBox.value = found
    showBoxModal.value = true
  }
}

const closeMobileDetail = () => {
  showMobileDetail.value = false
}

// 取得接取 NPC
const getTaskGiver = (task) => {
  const desc = task.startLocation.desc
  const match = desc.match(/\(NPC:\s*([^)]+)\)/)
  return match ? match[1] : desc
}

// 扁平化獎勵清單
const getRewardsList = (task) => {
  const list = []
  if (task.rewards.statsPoints > 0) {
    list.push({ icon: '💪', name: `能力點數 +${task.rewards.statsPoints}`, type: 'point' })
  }
  if (task.rewards.skillPoints > 0) {
    list.push({ icon: '✨', name: `技能點數 +${task.rewards.skillPoints}`, type: 'point' })
  }
  if (task.rewards.customRewards) {
    task.rewards.customRewards.forEach(r => {
      list.push({ icon: '🎁', name: r.desc, isLink: !!r.url, url: r.url, type: 'box' })
    })
  }
  return list
}

const getItemIcon = (rarity) => {
  switch (rarity) {
    case 'legendary': return '👑'
    case 'epic': return '🔮'
    case 'rare': return '🔷'
    case 'uncommon': return '🟢'
    default: return '⚪'
  }
}
</script>

<style scoped>
.tasks-page {
  animation: fadeIn 0.4s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.page-header {
  margin-bottom: 30px;
}

.page-header h2 {
  font-size: 2rem;
  font-weight: 800;
  margin-bottom: 8px;
}

.subtitle {
  color: var(--text-muted);
}

.tasks-layout {
  display: grid;
  grid-template-columns: 350px 1fr;
  gap: 30px;
  align-items: start;
}

.tasks-list-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.task-card {
  cursor: url('/assets/ran2-cursor.cur'), pointer;
  border-left: 4px solid transparent;
}

.task-card:hover {
  border-left: 4px solid rgba(0, 229, 255, 0.4);
}

.task-card.active-task {
  border-color: var(--color-snipper);
  background: var(--bg-card-hover);
  box-shadow: 0 0 15px rgba(0, 229, 255, 0.15);
}

.task-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.task-level {
  font-size: 0.75rem;
  background: rgba(0, 229, 255, 0.15);
  color: var(--color-snipper);
  padding: 2px 8px;
  border-radius: 20px;
  font-weight: 700;
}

.task-card-title {
  font-size: 1.1rem;
  font-weight: 700;
  flex: 1;
}

.task-card-giver {
  font-size: 0.85rem;
  color: var(--text-muted);
  margin-bottom: 12px;
}

.task-card-rewards-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.reward-preview-badge {
  font-size: 0.75rem;
  background: rgba(255,255,255,0.04);
  padding: 2px 6px;
  border-radius: 4px;
  color: var(--text-muted);
}

/* 右側詳細面板 */
.task-detail-panel {
  padding: 30px;
  min-height: 600px;
}

.detail-header {
  margin-bottom: 20px;
}

.detail-title-row {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 12px;
}

.detail-level-badge {
  font-size: 0.85rem;
  background: var(--color-snipper);
  color: #000;
  font-weight: 800;
  padding: 4px 12px;
  border-radius: 4px;
  box-shadow: 0 0 10px rgba(0, 229, 255, 0.3);
}

.detail-title {
  font-size: 1.8rem;
  font-weight: 800;
}

.detail-giver {
  color: var(--text-muted);
  font-size: 0.95rem;
}

.divider {
  border: 0;
  height: 1px;
  background: linear-gradient(90deg, rgba(255,255,255,0.1), transparent);
  margin: 20px 0;
}

.detail-section {
  margin-bottom: 28px;
}

.section-title {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text-main);
  margin-bottom: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  border-left: 3px solid var(--color-snipper);
  padding-left: 10px;
}

/* 地圖示意 */
.map-container {
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,0.1);
  max-height: 240px;
}

.map-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.map-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  background: linear-gradient(to top, rgba(0,0,0,0.85), transparent);
  padding: 15px;
}

.coords-tag {
  color: var(--color-snipper);
  font-weight: 700;
  font-size: 0.9rem;
}

/* 流程時間軸 */
.timeline {
  display: flex;
  flex-direction: column;
  gap: 16px;
  position: relative;
  padding-left: 20px;
}

.timeline::before {
  content: '';
  position: absolute;
  left: 30px;
  top: 10px;
  bottom: 10px;
  width: 2px;
  background: rgba(255, 255, 255, 0.05);
}

.timeline-item {
  display: flex;
  gap: 20px;
  position: relative;
}

.timeline-badge {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #121622;
  border: 2px solid var(--color-snipper);
  color: var(--color-snipper);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 0.8rem;
  z-index: 2;
  box-shadow: 0 0 8px rgba(0, 229, 255, 0.4);
}

.timeline-content {
  flex: 1;
  background: rgba(255, 255, 255, 0.02);
  padding: 12px 16px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.03);
}

.step-title {
  font-size: 0.95rem;
  font-weight: 700;
  margin-bottom: 4px;
}

.step-desc {
  font-size: 0.85rem;
  color: var(--text-muted);
  line-height: 1.4;
}

/* 獎勵區塊 */
.rewards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

.reward-item {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(255, 255, 255, 0.03);
  padding: 12px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.reward-icon {
  font-size: 1.8rem;
}

.reward-info {
  display: flex;
  flex-direction: column;
}

.reward-val {
  font-weight: 700;
  font-size: 1.1rem;
}

.reward-name {
  font-size: 0.85rem;
  color: var(--text-muted);
}

.reward-link-btn {
  color: var(--color-box);
  text-decoration: none;
  font-weight: 700;
  font-size: 0.95rem;
  transition: all 0.25s ease;
  text-shadow: 0 0 8px rgba(200, 0, 255, 0.2);
}

.reward-link-btn:hover {
  text-shadow: 0 0 12px rgba(200, 0, 255, 0.6);
  color: #fff;
}

.link-arrow {
  display: inline-block;
  transition: transform 0.25s ease;
}

.reward-link-btn:hover .link-arrow {
  transform: translate(2px, -2px);
}

/* 小技巧與注意事項 */
.detail-tips-warnings {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-top: 30px;
}

.tips-box {
  background: rgba(0, 229, 255, 0.03);
  border: 1px solid rgba(0, 229, 255, 0.1);
  padding: 16px;
  border-radius: 8px;
}

.tips-box h4 {
  color: var(--color-snipper);
  margin-bottom: 8px;
}

.tips-box p, .warnings-box p {
  font-size: 0.85rem;
  color: var(--text-muted);
  line-height: 1.5;
}

.warnings-box {
  background: rgba(255, 0, 85, 0.03);
  border: 1px solid rgba(255, 0, 85, 0.1);
  padding: 16px;
  border-radius: 8px;
}

.warnings-box h4 {
  color: var(--color-warrior);
  margin-bottom: 8px;
}

/* 響應式：手機版 (iPhone 17) */
@media (max-width: 900px) {
  .tasks-layout {
    grid-template-columns: 1fr;
  }

  .task-detail-panel {
    display: none; /* 在手機版隱藏右側面板，改用 drawer */
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
    max-height: 80vh;
    border-radius: 20px 20px 0 0;
    background: #0d0f17;
    border-top: 2px solid var(--color-snipper);
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

/* 接取條件、清單與步驟截圖樣式 */
.detail-requirements {
  margin-top: 10px;
  font-size: 0.95rem;
  color: var(--text-muted);
}

.req-link {
  color: var(--color-snipper);
  text-decoration: none;
  font-weight: 700;
  border-bottom: 1px dashed var(--color-snipper);
  transition: all 0.2s ease;
  cursor: url('/assets/ran2-cursor.cur'), pointer;
}

.req-link:hover {
  color: #fff;
  border-bottom-color: #fff;
  text-shadow: 0 0 8px var(--color-snipper);
}

.step-img {
  margin-top: 12px;
  border-radius: 8px;
  max-width: 100%;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.bullet-list {
  list-style: disc;
  padding-left: 20px;
  margin: 0;
}

.bullet-list li {
  font-size: 0.85rem;
  color: var(--text-muted);
  line-height: 1.6;
  margin-bottom: 6px;
}

.bullet-list li:last-child {
  margin-bottom: 0;
}

/* Modal 彈窗樣式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(6px);
  z-index: 2000;
  display: flex;
  justify-content: center;
  align-items: center;
}

.modal-content {
  width: 650px;
  max-width: 90%;
  max-height: 85vh;
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
  overflow: hidden;
}

.modal-scroll-area {
  overflow-y: auto;
  flex: 1;
  padding-right: 8px;
  margin-top: 15px;
}

.modal-scroll-area::-webkit-scrollbar {
  width: 6px;
}

.modal-scroll-area::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.02);
}

.modal-scroll-area::-webkit-scrollbar-thumb {
  background: rgba(0, 229, 255, 0.25);
  border-radius: 3px;
}

.modal-scroll-area::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 229, 255, 0.45);
}

/* 禮盒預覽 Modal 內容物清單樣式 */
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
  background: rgba(255, 255, 255, 0.02);
  padding: 8px 14px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.03);
}

.stat-bullet {
  font-size: 1.2rem;
}

.stat-text {
  font-size: 0.95rem;
  font-weight: 600;
}

.rate-val {
  font-weight: 700;
  margin-left: 4px;
  opacity: 0.8;
}

/* 品質文字顏色 */
.common-text { color: #f0f3f8; }
.uncommon-text { color: #00ff66; }
.rare-text { color: #00e5ff; }
.epic-text { color: #bd00ff; }
.legendary-text { color: #ff9900; }
</style>
