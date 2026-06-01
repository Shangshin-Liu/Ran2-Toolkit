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
            <span class="task-level">{{ task.level }}</span>
            <h3 class="task-card-title">{{ task.name }}</h3>
          </div>
          <p class="task-card-giver">接取NPC: {{ task.giver }}</p>
          <div class="task-card-rewards-preview">
            <span v-for="(reward, idx) in task.rewards.slice(0, 3)" :key="idx" class="reward-preview-badge">
              {{ reward.icon }} {{ reward.name }}
            </span>
          </div>
        </div>
      </div>

      <!-- 右側：任務詳細資訊 (Desktop 顯示) -->
      <div class="task-detail-panel glass-card neon-border-snipper" v-if="selectedTask">
        <div class="detail-header">
          <div class="detail-title-row">
            <span class="detail-level-badge">{{ selectedTask.level }}</span>
            <h2 class="detail-title neon-text-snipper">{{ selectedTask.name }}</h2>
          </div>
          <p class="detail-giver"><strong>接取方式：</strong>向位於 <strong>{{ selectedTask.location }}</strong> 的 <strong>{{ selectedTask.giver }}</strong> 談話接取。</p>
        </div>

        <hr class="divider" />

        <!-- 地點與地圖示意 -->
        <div class="detail-section">
          <h3 class="section-title">📍 任務地點示意</h3>
          <div class="map-container">
            <img :src="selectedTask.mapImage" alt="Map Location" class="map-img" />
            <div class="map-overlay">
              <span class="coords-tag">{{ selectedTask.location }}</span>
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
                <h4 class="step-title">{{ step.title }}</h4>
                <p class="step-desc">{{ step.desc }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- 獎勵區塊 -->
        <div class="detail-section">
          <h3 class="section-title">🎁 任務獎勵</h3>
          <div class="rewards-grid">
            <div v-for="(reward, idx) in selectedTask.rewards" :key="idx" class="reward-item">
              <span class="reward-icon">{{ reward.icon }}</span>
              <div class="reward-info">
                <span class="reward-val" v-if="reward.type !== 'box'">+{{ reward.value }}</span>
                <!-- 禮盒超連結跳轉 -->
                <router-link 
                  v-if="reward.isLink" 
                  :to="{ path: '/boxes', query: { search: reward.name } }"
                  class="reward-link-btn"
                >
                  {{ reward.name }} <span class="link-arrow">↗</span>
                </router-link>
                <span v-else class="reward-name">{{ reward.name }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 小技巧與注意事項 -->
        <div class="detail-tips-warnings">
          <div class="tips-box">
            <h4>💡 小技巧</h4>
            <p>{{ selectedTask.tip }}</p>
          </div>
          <div class="warnings-box">
            <h4>⚠️ 注意事項</h4>
            <p>{{ selectedTask.warning }}</p>
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
            <span class="detail-level-badge">{{ selectedTask.level }}</span>
            <h2 class="detail-title neon-text-snipper">{{ selectedTask.name }}</h2>
          </div>
          <p class="detail-giver"><strong>接取：</strong>{{ selectedTask.giver }} ({{ selectedTask.location }})</p>
          
          <div class="map-container">
            <img :src="selectedTask.mapImage" alt="Map Location" class="map-img" />
          </div>

          <div class="timeline">
            <div v-for="(step, idx) in selectedTask.steps" :key="idx" class="timeline-item">
              <div class="timeline-badge">{{ idx + 1 }}</div>
              <div class="timeline-content">
                <h4 class="step-title">{{ step.title }}</h4>
                <p class="step-desc">{{ step.desc }}</p>
              </div>
            </div>
          </div>

          <div class="rewards-grid">
            <div v-for="(reward, idx) in selectedTask.rewards" :key="idx" class="reward-item">
              <span class="reward-icon">{{ reward.icon }}</span>
              <div class="reward-info">
                <router-link 
                  v-if="reward.isLink" 
                  :to="{ path: '/boxes', query: { search: reward.name } }"
                  class="reward-link-btn"
                >
                  {{ reward.name }} ↗
                </router-link>
                <span v-else class="reward-name">{{ reward.name }} ({{ reward.value }})</span>
              </div>
            </div>
          </div>

          <div class="tips-box" style="margin-top: 15px;">
            <h4>💡 小技巧</h4>
            <p>{{ selectedTask.tip }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const tasks = ref([
  {
    id: 'task-1',
    name: '【劇情】『KO』滑輪高手',
    level: 'Lv. 80',
    giver: '自動接取',
    location: '商洞 中央廣場周圍的四塊草皮很多',
    mapImage: '/assets/tasks/asset1.jpg',
    steps: [
      { title: '擊殺怪物', desc: '擊殺滑輪高手35個' }
    ],
    rewards: [
      { type: 'box', name: '劍道部練功禮盒(7D)【LV.80】', value: 1, icon: '🎁', isLink: true }
    ],
    tip: '穿著校服全點敏捷就能扛住了',
    warning: '不要引太多，滑輪高手會麻痺敵人。被麻痺的時候，G奶七仔會主動攻擊。看到拐子手快跑，他會暈人。'
  },
  {
    id: 'task-2',
    name: '【劇情】惹事生非的街道',
    level: 'Lv. 100',
    giver: '人人有功練100等任務',
    location: '涉谷(可從商洞進入)',
    mapImage: '/assets/tasks/asset2.jpg',
    steps: [
      { title: '收集道具', desc: '草莓有奶19個，糖本肛19個(涉谷約28/49)' }
    ],
    rewards: [
      { type: 'box', name: '劍道部練功禮盒(7D)【LV.100】', value: 1, icon: '🎁', isLink: true }
    ],
    tip: '先穿上KO滑輪高手拿到的80等獎勵再去挑戰。怕時間不夠可以先移動到涉谷大約37/22的位置後，利用新手送的起點卡飛回學院再接任務後立刻用前點回原本位置。糖本肛所在的位置都為都是主動怪還會給麻痺狀態很煩，少量打搭配修練念珠熬死對方。',
    warning: '任務有時間限制: 30分。死掉不會導致任務失敗。任務獎勵還不到太重要，可不接；若要接取不可超過120等。任務獎勵送的C停卡有限制120等以下才能使用，若不想浪費C停卡要盡快使用。'
  },
  {
    id: 'task-3',
    name: '【劇情】變態三男的逆襲',
    level: 'Lv. 110',
    giver: '人人有功練110等任務',
    location: '圍繞商洞周邊',
    mapImage: '/assets/tasks/asset3.jpg',
    steps: [
      { title: '擊殺光頭猛男', desc: '光頭猛男13個(商洞84/168左右，俗稱高爾夫球場)' },
      { title: '擊殺漁夫', desc: '漁夫13個(綜合碼頭68/117)' },
      { title: '擊殺腳文字C', desc: '腳文字C 13個(涉谷35/38)' }
    ],
    rewards: [
      { type: 'point', name: '技能點數', value: 1, icon: '✨' },
      { type: 'point', name: '能力點數', value: 1, icon: '💪' },
      { type: 'box', name: '劍道部練功禮盒(7D)【LV.110】', value: 1, icon: '🎁', isLink: true }
    ],
    tip: '怕時間不夠可以先調查怪物所在的位置後，搭配起點/前點在接任務。打光頭的時候，附近怪物都會讓人暈眩，太多怪追著你的時候，使用起點/前點快速切圖可以讓怪物不追。打完光頭後直接起點回到學院，再搭乘小轎車到商洞去碼頭會比較快，也可以防止小怪騷擾。打漁夫不要走太深，因為涉谷很遙遠。',
    warning: '任務有時間限制: 30分。死掉不會導致任務失敗。千萬不可錯過，最高不能超過130等接取。任務獎勵送的C停卡有限制120等以下才能使用，若不想浪費C停卡要盡快使用。'
  },
  {
    id: 'task-4',
    name: '【劇情】賊頭殺殺殺',
    level: 'Lv. 120',
    giver: '人人有功練120等任務',
    location: '綜合碼頭',
    mapImage: '/assets/tasks/asset3.jpg',
    steps: [
      { title: '擊殺警棍賊頭', desc: '警棍賊頭21個(85/110)' },
      { title: '擊殺賊頭槍手', desc: '賊頭槍手21個(102/81)' }
    ],
    rewards: [
      { type: 'point', name: '技能點數', value: 1, icon: '✨' },
      { type: 'point', name: '能力點數', value: 1, icon: '💪' },
      { type: 'box', name: '劍道部練功禮盒(7D)【LV.120】', value: 1, icon: '🎁', isLink: true }
    ],
    tip: '怕時間不夠可以先調查怪物所在的位置後，搭配起點/前點在接任務。警棍賊頭會麻痺，既然都會行動不便不如多打幾隻。賊頭槍手會暈眩，中這個狀態會被斷招，建議引3隻打就好，太多隻會導致一直被暈QQ。',
    warning: '任務有時間限制: 30分。死掉不會導致任務失敗。千萬不可錯過，最高不能超過140等接取。'
  }
])

const selectedTask = ref(tasks.value[0])
const showMobileDetail = ref(false)

const selectTask = (task) => {
  selectedTask.value = task
  if (window.innerWidth <= 900) {
    showMobileDetail.value = true
  }
}

const closeMobileDetail = () => {
  showMobileDetail.value = false
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
  margin-left: 10px;
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
  display: grid;
  grid-template-columns: 1fr 1fr;
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
</style>
