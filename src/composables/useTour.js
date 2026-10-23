import { ref, computed } from 'vue'

// localStorage key 前綴：存放「已勾選不再主動顯示」時的導引版本號
export const TOUR_DISMISS_KEY_PREFIX = 'ran2-tour-dismiss-'
// 導引內容設定檔（public/data/tooltips.json）
export const TOOLTIPS_DATA_URL = '/data/tooltips.json'

// 全域共享狀態：各頁面與 App.vue 內的 <TourGuide /> 共用同一份
const isOpen = ref(false)
const currentFeatureKey = ref('')
const currentSlideIndex = ref(0)
const allTooltipsData = ref({})
const isLoading = ref(false)
const dontShowAgain = ref(false)

let loadPromise = null
// 每次 startTour / cancelTour 都會遞增，用來作廢「設定檔還在載入中」的過期請求（例如載入期間已切換頁面）
let startRequestId = 0

// 無痕模式或瀏覽器停用網站資料時 localStorage 可能直接拋錯，一律安全包裝
const storage = {
  get(key) {
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, value)
    } catch {
      // 無法寫入時略過，僅影響「不再顯示」的記憶
    }
  },
  remove(key) {
    try {
      localStorage.removeItem(key)
    } catch {
      // 同上
    }
  }
}

/**
 * 取得導引版本號（tooltips.json 未設定 version 時視為 '1'）
 * 調整導引內容後只要更改 version，之前勾選「不再顯示」的玩家就會再看到一次新版導引
 */
export const getGuideVersion = (guide) => String(guide?.version ?? '1')

/**
 * 是否已對「目前版本」的導引勾選不再主動顯示
 */
export const isGuideDismissed = (featureKey, guide) => {
  if (!featureKey) return false
  return storage.get(`${TOUR_DISMISS_KEY_PREFIX}${featureKey}`) === getGuideVersion(guide)
}

/**
 * 取得投影片的示意圖片清單（string array，陣列順序即輪播順序）
 * - 新格式：images: ['/assets/tooltip/a.png', '/assets/tooltip/b.png']
 * - 相容舊格式：image: '/assets/tooltip/a.png'
 */
export const getSlideImages = (slide) => {
  if (!slide) return []
  const list = Array.isArray(slide.images) ? slide.images : [slide.image]
  return list.filter((src) => typeof src === 'string' && src.trim() !== '').map((src) => src.trim())
}

// 導覽圖片框的預設寬高比（整頁截圖約 1920×912 ≈ 2.1:1），實際會依每一步第一張圖片的比例調整
export const DEFAULT_MEDIA_RATIO = 2.1
const MIN_MEDIA_RATIO = 1.2
const MAX_MEDIA_RATIO = 3.2

/**
 * 依圖片原始尺寸計算圖片框的寬高比，限制在合理範圍內（避免直式或超長圖片讓視窗變形）
 * @returns {number|null} 尺寸無效時回傳 null
 */
export const clampMediaRatio = (width, height) => {
  if (!(width > 0) || !(height > 0)) return null
  const ratio = Math.min(MAX_MEDIA_RATIO, Math.max(MIN_MEDIA_RATIO, width / height))
  return Math.round(ratio * 1000) / 1000
}

// 圖片框自動縮小的下限（px）：再小就看不清楚，改讓內容區捲動
export const MIN_FIT_MEDIA_HEIGHT = 160

/**
 * 說明文字較長或螢幕較矮、導引視窗放不下時，計算圖片框最多能多高才不用捲動
 * 導引視窗的寬度不受圖片框高度影響（文字換行不會跟著變），所以量一次就能算出結果：
 * 目前圖片框高度 + 視窗還能長高的空間 - 內容區超出（需要捲動）的高度
 * @param {object} m 量測值（px）
 * @param {number} m.frameHeight 目前圖片框高度
 * @param {number} m.panelHeight 目前導引視窗高度
 * @param {number} m.panelMaxHeight 導引視窗的最大高度
 * @param {number} [m.overflow] 內容區超出可視範圍的高度
 * @returns {number|null} 圖片框的高度上限；量測值無效時回傳 null（維持 CSS 預設大小）
 */
export const computeFitMediaHeight = ({ frameHeight, panelHeight, panelMaxHeight, overflow = 0 }) => {
  if (![frameHeight, panelHeight, panelMaxHeight].every((v) => Number.isFinite(v) && v > 0)) return null
  const target = Math.floor(frameHeight + (panelMaxHeight - panelHeight) - Math.max(0, overflow || 0))
  return Math.max(MIN_FIT_MEDIA_HEIGHT, target)
}

/**
 * 放大檢視時「點圖片放大」的目標寬度：原始寬度，但最多放大到全圖寬度的 3 倍（手機上避免放得太誇張）
 * @param {number} naturalWidth 圖片原始寬度
 * @param {number} fitWidth 目前「符合螢幕」時顯示的寬度
 * @returns {number} 0 代表無法計算
 */
export const getZoomWidth = (naturalWidth, fitWidth) => {
  if (!(naturalWidth > 0) || !(fitWidth > 0)) return 0
  return Math.round(Math.min(naturalWidth, fitWidth * 3))
}

/**
 * 放大後至少要比全圖大 15% 才提供「點圖片放大」（大螢幕上已接近原始大小時就不需要）
 */
export const canZoomFurther = (naturalWidth, fitWidth) => {
  const zoomWidth = getZoomWidth(naturalWidth, fitWidth)
  return zoomWidth > 0 && zoomWidth > fitWidth * 1.15
}

const persistDismissState = (featureKey, dismissed) => {
  if (!featureKey) return
  const key = `${TOUR_DISMISS_KEY_PREFIX}${featureKey}`
  if (dismissed) {
    storage.set(key, getGuideVersion(allTooltipsData.value[featureKey]))
  } else {
    storage.remove(key)
  }
}

export function useTour() {
  const loadTooltipsData = async () => {
    if (Object.keys(allTooltipsData.value).length > 0) return allTooltipsData.value
    // 同時有多個呼叫時共用同一個請求，避免重複下載
    if (loadPromise) return loadPromise
    // Node / 測試環境沒有可用的相對路徑 fetch 時安全略過
    if (typeof window === 'undefined' || !window.location?.origin || typeof fetch !== 'function') {
      return allTooltipsData.value
    }

    isLoading.value = true
    loadPromise = (async () => {
      try {
        // no-cache：每次都向伺服器確認是否有新版（未變更時只回 304），導引內容更新後可立即生效
        const res = await fetch(TOOLTIPS_DATA_URL, { cache: 'no-cache' })
        if (res.ok) {
          const json = await res.json()
          allTooltipsData.value = json?.guides || {}
        }
      } catch {
        // 靜默處理非重大之導引載入異常
      } finally {
        isLoading.value = false
        loadPromise = null
      }
      return allTooltipsData.value
    })()
    return loadPromise
  }

  const currentGuide = computed(() => {
    return allTooltipsData.value[currentFeatureKey.value] || null
  })

  const currentSlides = computed(() => {
    const slides = currentGuide.value?.slides
    return Array.isArray(slides) ? slides : []
  })

  const currentSlide = computed(() => {
    return currentSlides.value[currentSlideIndex.value] || null
  })

  /**
   * 開啟指定功能的操作導引
   * @param {string} featureKey 對應 tooltips.json 的 guides key（parties / tasks / simulator）
   * @param {null} _steps 保留參數（相容舊呼叫方式，目前未使用）
   * @param {boolean} force true = 使用者手動點「操作導引」按鈕，即使已勾選不再顯示也會開啟
   * @returns {Promise<boolean>} 是否真的開啟了導引
   */
  const startTour = async (featureKey, _steps = null, force = false) => {
    if (!featureKey) return false
    const requestId = ++startRequestId

    await loadTooltipsData()

    // 載入期間若又開啟了別的導引、或已離開頁面（cancelTour），這個請求作廢
    if (requestId !== startRequestId) return false

    const guide = allTooltipsData.value[featureKey]
    if (!guide || !Array.isArray(guide.slides) || guide.slides.length === 0) return false

    const dismissed = isGuideDismissed(featureKey, guide)
    if (dismissed && !force) return false

    // 確定要開啟後才切換狀態，避免影響目前正在顯示的導引
    currentFeatureKey.value = featureKey
    currentSlideIndex.value = 0
    dontShowAgain.value = dismissed
    isOpen.value = true
    return true
  }

  const toggleDontShowAgain = (val) => {
    dontShowAgain.value = Boolean(val)
    if (isOpen.value) {
      persistDismissState(currentFeatureKey.value, dontShowAgain.value)
    }
  }

  const closeTour = () => {
    if (!isOpen.value) return
    persistDismissState(currentFeatureKey.value, dontShowAgain.value)
    isOpen.value = false
  }

  /**
   * 離開頁面時呼叫：關閉目前的導引，並作廢尚在載入中的自動開啟請求
   */
  const cancelTour = () => {
    startRequestId++
    closeTour()
  }

  const nextSlide = () => {
    if (currentSlideIndex.value < currentSlides.value.length - 1) {
      currentSlideIndex.value++
    } else {
      closeTour()
    }
  }

  const prevSlide = () => {
    if (currentSlideIndex.value > 0) {
      currentSlideIndex.value--
    }
  }

  const goToSlide = (idx) => {
    if (idx >= 0 && idx < currentSlides.value.length) {
      currentSlideIndex.value = idx
    }
  }

  return {
    isOpen,
    currentFeatureKey,
    currentSlideIndex,
    currentGuide,
    currentSlides,
    currentSlide,
    dontShowAgain,
    isLoading,
    loadTooltipsData,
    startTour,
    toggleDontShowAgain,
    nextSlide,
    prevSlide,
    goToSlide,
    closeTour,
    cancelTour
  }
}
