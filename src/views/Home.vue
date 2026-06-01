<template>
  <div class="home-wrapper">
    <!-- Layer 0: Dark textured city background -->
    <img :src="assets.bg" alt="" class="layer-bg" aria-hidden="true" />

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
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const hovered = ref(null)

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

// 根據提示詞設定的顯示順序：warrior, box, qigong, snipper
const displayOrder = ['warrior', 'box', 'qigong', 'snipper']
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
  z-index: 1;
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
  /* 標楷體字型設定 */
  font-family: 'BiauKai', 'DFKai-SB', serif;
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
</style>
