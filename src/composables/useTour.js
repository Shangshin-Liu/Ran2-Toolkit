import { ref, computed } from 'vue';

const isOpen = ref(false);
const currentFeatureKey = ref('');
const currentSlideIndex = ref(0);
const allTooltipsData = ref({});
const isLoading = ref(false);
const dontShowAgain = ref(false);

export function useTour() {
  const loadTooltipsData = async () => {
    if (Object.keys(allTooltipsData.value).length > 0) return;
    try {
      isLoading.value = true;
      // 在 Node/測試環境中如果 window.location 不存在或 fetch 相對路徑，安全略過或補齊
      if (typeof window === 'undefined' || !window.location?.origin) return;
      const res = await fetch('/data/tooltips.json');
      if (res.ok) {
        const json = await res.json();
        allTooltipsData.value = json.guides || {};
      }
    } catch (err) {
      // 靜默處理非重大之導引載入異常
    } finally {
      isLoading.value = false;
    }
  };

  const currentGuide = computed(() => {
    return allTooltipsData.value[currentFeatureKey.value] || null;
  });

  const currentSlides = computed(() => {
    return currentGuide.value?.slides || [];
  });

  const currentSlide = computed(() => {
    return currentSlides.value[currentSlideIndex.value] || null;
  });

  const startTour = async (featureKey, steps = null, force = false) => {
    currentFeatureKey.value = featureKey;
    const isDismissed = localStorage.getItem(`ran2-tour-dismiss-${featureKey}`) === 'true';
    if (isDismissed && !force) return;

    await loadTooltipsData();
    if (!allTooltipsData.value[featureKey]) return;

    currentSlideIndex.value = 0;
    dontShowAgain.value = isDismissed;
    isOpen.value = true;
  };

  const toggleDontShowAgain = (val) => {
    dontShowAgain.value = val;
    if (currentFeatureKey.value) {
      if (val) {
        localStorage.setItem(`ran2-tour-dismiss-${currentFeatureKey.value}`, 'true');
      } else {
        localStorage.removeItem(`ran2-tour-dismiss-${currentFeatureKey.value}`);
      }
    }
  };

  const nextSlide = () => {
    if (currentSlideIndex.value < currentSlides.value.length - 1) {
      currentSlideIndex.value++;
    } else {
      closeTour();
    }
  };

  const prevSlide = () => {
    if (currentSlideIndex.value > 0) {
      currentSlideIndex.value--;
    }
  };

  const goToSlide = (idx) => {
    if (idx >= 0 && idx < currentSlides.value.length) {
      currentSlideIndex.value = idx;
    }
  };

  const closeTour = () => {
    if (currentFeatureKey.value) {
      if (dontShowAgain.value) {
        localStorage.setItem(`ran2-tour-dismiss-${currentFeatureKey.value}`, 'true');
      } else {
        localStorage.removeItem(`ran2-tour-dismiss-${currentFeatureKey.value}`);
      }
    }
    isOpen.value = false;
  };

  return {
    isOpen,
    currentFeatureKey,
    currentSlideIndex,
    currentGuide,
    currentSlides,
    currentSlide,
    dontShowAgain,
    isLoading,
    startTour,
    toggleDontShowAgain,
    nextSlide,
    prevSlide,
    goToSlide,
    closeTour
  };
}
