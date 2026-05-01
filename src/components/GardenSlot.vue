<script setup>
import { computed, ref, onMounted, onUnmounted, watch } from 'vue';
import { FLOWERS } from '../data/flowers';
import { state, harvestFlower, calculateEffectiveElapsedTime, getWitherMultiplier } from '../store/gameState';

const props = defineProps(['slotData']);
const emit = defineEmits(['swipe', 'harvest-animate']);

const imgRef = ref(null);
const canvasRef = ref(null);
const processedSrc = ref(null);
const isHarvesting = ref(false); 
const isShaking = ref(false);    
const holdTimer = ref(null);     

const flower = computed(() => FLOWERS.find(f => f.id === props.slotData.flowerId));
const progress = ref(0);

const growthScale = computed(() => {
  if (props.slotData.status === 'ready' || props.slotData.status === 'withered') return 1;
  if (props.slotData.status === 'growing') return 0.3 + (progress.value / 100) * 0.7;
  return 0;
});

const getGlowClass = (rarity) => {
  if (!rarity) return '';
  if (rarity === 'Legendary') return 'glow-rainbow';
  if (parseInt(rarity) === 5) return 'glow-gold';
  if (parseInt(rarity) === 4) return 'glow-silver';
  return '';
};

// 全域快取，避免切換場景時重複消耗 CPU 運算去背
const globalImageCache = window.__FLOWER_IMG_CACHE__ || (window.__FLOWER_IMG_CACHE__ = new Map());

const processImage = () => {
  if (!imgRef.value || processedSrc.value) return;
  
  if (!flower.value) return;
  const cacheKey = `flower_${flower.value.id}`;
  if (globalImageCache.has(cacheKey)) {
    processedSrc.value = globalImageCache.get(cacheKey);
    return;
  }

  const img = imgRef.value;
  const canvas = canvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  ctx.drawImage(img, 0, 0);
  try {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i+1], b = data[i+2];
      if ((r > 230 && g > 230 && b > 230) || (r < 30 && g < 30 && b < 30)) data[i+3] = 0;
    }
    ctx.putImageData(imageData, 0, 0);
    const dataUrl = canvas.toDataURL();
    processedSrc.value = dataUrl;
    globalImageCache.set(cacheKey, dataUrl); // 存入快取
  } catch (e) { processedSrc.value = img.src; }
};

// 監聽花朵變化，若變化則重置去背狀態
watch(() => props.slotData.flowerId, (newId) => {
  if (newId) {
    const cacheKey = `flower_${newId}`;
    if (globalImageCache.has(cacheKey)) {
      processedSrc.value = globalImageCache.get(cacheKey);
    } else {
      processedSrc.value = null; // 讓 @load 重新觸發 processImage
    }
  } else {
    processedSrc.value = null;
  }
});

// 通知：花朵長成
let notifiedSlots = new Set();
const sendGrowthNotification = () => {
  if (notifiedSlots.has(props.slotData.id)) return;
  notifiedSlots.add(props.slotData.id);
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('🌸 花朵長成囉！', {
      body: `${flower.value?.name || '你的花朵'} 已準備好採收！`,
      icon: '/favicon.ico'
    });
  }
};

const updateProgress = () => {
  if (props.slotData.startTime && flower.value) {
    const { growthElapsed } = calculateEffectiveElapsedTime(props.slotData.startTime);
    
    if (props.slotData.status === 'growing') {
      const p = Math.min((growthElapsed / flower.value.growthTime) * 100, 100);
      progress.value = p;
      if (p >= 100) {
        props.slotData.status = 'ready';
        props.slotData.readyTime = Date.now();
        sendGrowthNotification();
      }
    } else {
      notifiedSlots.delete(props.slotData.id); // 收成後清除記錄
    }
    
    // 獨立檢查枯萎 (真實時間 3 小時 * 肥料倍率)
    if (props.slotData.status === 'ready') {
      const rTime = props.slotData.readyTime || (Date.now() - 1000); 
      const timeSinceReady = (Date.now() - rTime) / 1000;
      const witherTime = (3 * 60 * 60) * getWitherMultiplier();
      if (timeSinceReady >= witherTime) {
        props.slotData.status = 'withered';
      }
    }
  }
};

let timer = null;
onMounted(() => { timer = setInterval(updateProgress, 200); });
onUnmounted(() => { clearInterval(timer); clearTimeout(holdTimer.value); });

// --- 收割邏輯 ---

const startHold = () => {
  const status = props.slotData.status;
  if ((status === 'ready' || status === 'withered') && !isHarvesting.value && !holdTimer.value) {
    isShaking.value = true;
    holdTimer.value = setTimeout(() => {
      pullUp();
    }, 50);
  }
};

const endHold = () => {
  if (holdTimer.value) {
    clearTimeout(holdTimer.value);
    holdTimer.value = null;
  }
  if (!isHarvesting.value) isShaking.value = false;
};

const pullUp = () => {
  if (isHarvesting.value) return;
  isHarvesting.value = true;
  isShaking.value = false;
  holdTimer.value = null;

  const currentStatus = props.slotData.status;
  const currentFlowerId = props.slotData.flowerId;
  const currentSlotId = props.slotData.id;

  setTimeout(() => {
    if (currentStatus === 'ready' && imgRef.value) {
      const rect = imgRef.value.getBoundingClientRect();
      const startX = rect.left + rect.width / 2;
      const startY = rect.top + rect.height / 2;
      emit('harvest-animate', { 
        slotId: currentSlotId, 
        flowerId: currentFlowerId, 
        startX, 
        startY,
        imgUrl: processedSrc.value || imgRef.value.src
      });
    }

    harvestFlower(currentSlotId);
    isHarvesting.value = false;
  }, 400);
};

// 處理滑鼠進入 (停留開始)
const handleMouseEnter = () => {
  emit('swipe', props.slotData.id);
  startHold();
};

// 供外部直接呼叫 (touchmove 滑動收成用)
const triggerHarvest = () => {
  if (props.slotData.status === 'ready' || props.slotData.status === 'withered') {
    pullUp();
  }
};

const getSlotStatus = () => props.slotData.status;

defineExpose({ triggerHarvest, getSlotStatus });
</script>

<template>
  <div 
    class="garden-slot" 
    :class="{ 
      'can-harvest': slotData.status === 'ready' || slotData.status === 'withered', 
      'is-harvesting': isHarvesting, 
      'is-shaking': isShaking,
      'is-withered': slotData.status === 'withered'
    }"
    @mousedown="startHold"
    @mouseup="endHold"
    @mouseleave="endHold"
    @touchstart.prevent="startHold"
    @touchend="endHold"
    @mouseenter="handleMouseEnter"
  >
    <div class="slot-inner-centered">
      <div v-if="slotData.status !== 'empty' && flower" class="flower-container-v3" :style="{ transform: `scale(${growthScale})` }">
        <div class="flower-render-box">
          <img ref="imgRef" :src="`/assets/flowers/${flower.country.toLowerCase()}/${flower.id}.png`" class="hidden-core" @load="processImage" />
          <canvas ref="canvasRef" class="hidden-core"></canvas>
          <img v-if="processedSrc" :src="processedSrc" class="final-flower-img" :class="getGlowClass(flower?.rarity)" />
        </div>
      </div>
      
      <div v-if="slotData.status === 'growing'" class="growth-bar-v3">
        <div class="bar-fill" :style="{ width: progress + '%' }"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.garden-slot {
  width: 100%; height: 100%;
  display: flex; align-items: center; justify-content: center;
  position: relative; overflow: visible;
}

.slot-inner-centered {
  position: relative; width: 100%; height: 100%;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
}

/* --- 找到這段並替換 --- */
.flower-container-v3 {
  width: 100%; 
  max-width: 75px; 
  /* 👇 關鍵修改：拔掉固定的 height，改用 aspect-ratio 讓高度自動跟隨寬度 */
  aspect-ratio: 1 / 1; 
  height: auto;        
  display: flex; align-items: center; justify-content: center;
  position: relative; transition: transform 0.3s ease;
  overflow: visible; z-index: 50;
}

.flower-render-box {
  width: 100%; height: 100%;
  display: flex; align-items: center; justify-content: center;
}

.hidden-core { display: none; }

.final-flower-img {
  width: 100%; height: 100%; object-fit: contain;
  filter: drop-shadow(0 4px 0 rgba(0,0,0,0.1));
  transition: filter 0.3s ease, opacity 0.3s ease;
}

.glow-silver { animation: shine-silver 2s infinite alternate !important; }
.glow-gold { animation: shine-gold 2s infinite alternate !important; }
.glow-rainbow { animation: glow-pulse 2s infinite alternate !important; }

@keyframes shine-silver {
  from { filter: drop-shadow(0 0 5px rgba(192, 192, 192, 0.5)); }
  to { filter: drop-shadow(0 0 15px rgba(192, 192, 192, 1)); }
}
@keyframes shine-gold {
  from { filter: drop-shadow(0 0 8px rgba(255, 215, 0, 0.5)); }
  to { filter: drop-shadow(0 0 25px rgba(255, 215, 0, 1)); }
}
@keyframes glow-pulse {
  from { filter: drop-shadow(0 0 10px #ff00de) hue-rotate(0deg); }
  to { filter: drop-shadow(0 0 30px #00d4ff) hue-rotate(360deg); }
}

/* 枯萎狀態視覺效果 */
.is-withered .final-flower-img {
  filter: grayscale(100%) sepia(80%) brightness(60%) contrast(1.2) hue-rotate(-50deg);
  opacity: 0.85;
}

.is-shaking .flower-render-box { animation: nudge 0.3s ease-in-out infinite; }
@keyframes nudge {
  0%, 100% { transform: translateY(0) scaleY(1); }
  50% { transform: translateY(-5px) scaleY(1.1) scaleX(0.95); }
}

.is-harvesting .flower-render-box { animation: pull-up 0.4s cubic-bezier(0.36, 0, 0.66, -0.56) forwards; }
@keyframes pull-up {
  0% { transform: translateY(-5px) scaleY(1.2); }
  30% { transform: translateY(-15px) scaleY(1.7) scaleX(0.7); }
  100% { transform: translateY(-100px) scaleY(1.1) opacity(0); }
}

.growth-bar-v3 {
  position: absolute; bottom: 0px; 
  width: 20px; height: 3px; background: rgba(0,0,0,0.2);
  border-radius: 10px; overflow: hidden;
}
.bar-fill { height: 100%; background: #2ecc71; transition: width 0.2s linear; }

.can-harvest { cursor: pointer; }
</style>