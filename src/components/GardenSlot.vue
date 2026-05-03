<script setup>
import { computed, ref, onUnmounted, watch } from 'vue';
import { FLOWERS } from '../data/flowers';
import { state, harvestFlower, calculateEffectiveElapsedTime, getWitherMultiplier, globalTicker, playSound } from '../store/gameState';

const props = defineProps(['slotData']);
// 👇 原本只有 'swipe', 'harvest-animate'，現在補上 'play-sound'
const emit = defineEmits(['swipe', 'harvest-animate', 'play-sound']);

const imgRef = ref(null);
const canvasRef = ref(null);
const processedSrc = ref(null);
const isHarvesting = ref(false); 
const isShaking = ref(false);    
const holdTimer = ref(null);     

const flower = computed(() => FLOWERS.find(f => f.id === props.slotData.flowerId));

// 👇 1. 依賴全域時間的進度計算
const progress = computed(() => {
  if (!props.slotData.startTime || !flower.value || props.slotData.status === 'empty') return 0;
  
  const currentNow = globalTicker.now; 
  
  if (props.slotData.status === 'growing') {
    const { growthElapsed } = calculateEffectiveElapsedTime(props.slotData.startTime);
    return Math.min((growthElapsed / flower.value.growthTime) * 100, 100);
  }
  return 100;
});

// 👇 2. 恢復生長縮放比例 (缺少這個花會縮小到 0 看不見)
const growthScale = computed(() => {
  if (props.slotData.status === 'ready' || props.slotData.status === 'withered') return 1;
  if (props.slotData.status === 'growing') return 0.3 + (progress.value / 100) * 0.7;
  return 0;
});

const getGlowClass = (rarity) => {
  if (!rarity) return '';
  if (rarity === 'Legendary') return 'glow-rainbow';
  
  const r = parseInt(rarity);
  if (r === 5) return 'glow-gold';
  if (r === 4) return 'glow-silver'; // 對應 Pale Purple CSS
  if (r === 3) return 'glow-blue';   // 👇 新增 3星藍光
  if (r === 2) return 'glow-green';  // 👇 新增 2星綠光
  return ''; // 1星不發光
};
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
      // 放寬判定：大於 200 的淺灰色、淺黃底色，或是小於 40 的深黑色都會被透明化
if ((r > 200 && g > 200 && b > 200) || (r < 40 && g < 40 && b < 40)) data[i+3] = 0;
    }
    ctx.putImageData(imageData, 0, 0);
    const dataUrl = canvas.toDataURL();
    processedSrc.value = dataUrl;
    globalImageCache.set(cacheKey, dataUrl);
  } catch (e) { processedSrc.value = img.src; }
};

watch(() => props.slotData.flowerId, (newId) => {
  if (newId) {
    const cacheKey = `flower_${newId}`;
    if (globalImageCache.has(cacheKey)) {
      processedSrc.value = globalImageCache.get(cacheKey);
    } else {
      processedSrc.value = null; 
    }
  } else {
    processedSrc.value = null;
  }
});

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

// 👇 4. 監聽進度狀態
watch(progress, (newProgress) => {
  if (props.slotData.status === 'growing' && newProgress >= 100) {
    props.slotData.status = 'ready';
    props.slotData.readyTime = Date.now();
    sendGrowthNotification();
  }
}, { immediate: true }); // 👈 關鍵：加上這個大括號與設定
// 👇 5. 監聽全域時間，檢查花朵是否枯萎
watch(() => globalTicker.now, () => {
  if (props.slotData.status === 'ready') {
    const rTime = props.slotData.readyTime || (Date.now() - 1000); 
    const timeSinceReady = (Date.now() - rTime) / 1000;
    const witherTime = (3 * 60 * 60) * getWitherMultiplier();
    
    if (timeSinceReady >= witherTime) {
      props.slotData.status = 'withered';
      notifiedSlots.delete(props.slotData.id);
    }
  } else if (props.slotData.status !== 'ready') {
    notifiedSlots.delete(props.slotData.id);
  }
});

onUnmounted(() => { 
  if (holdTimer.value) clearTimeout(holdTimer.value); 
});

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
  
  // ✅ 改成這行！呼叫我們設定好的採收音效
  playSound('pop');
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

/* --- 核心基礎：強制加上一層深色勾邊陰影，突顯立體感與光芒對比 --- */
.final-flower-img {
  width: 100%; height: 100%; object-fit: contain;
  /* 👇 基礎陰影：讓花朵與雲朵分離 */
  filter: drop-shadow(0 2px 3px rgba(0,0,0,0.5));
  transition: filter 0.3s ease, opacity 0.3s ease;
}

/* --- 全新稀有度光芒 (Glow) 設計 --- */

/* 2星：淡綠色 (Pale Green) */
.glow-green { 
  animation: shine-green 2.5s infinite alternate !important; 
}
@keyframes shine-green {
  from { filter: drop-shadow(0 0 4px rgba(0,0,0,0.7)) drop-shadow(0 0 6px rgba(122, 255, 122, 0.6)); }
  to { filter: drop-shadow(0 0 4px rgba(0,0,0,0.7)) drop-shadow(0 0 16px rgba(122, 255, 122, 1)); }
}

/* 3星：淡藍色 (Pale Blue) */
.glow-blue { 
  animation: shine-blue 2.2s infinite alternate !important; 
}
@keyframes shine-blue {
  from { filter: drop-shadow(0 0 4px rgba(0,0,0,0.7)) drop-shadow(0 0 6px rgba(100, 210, 255, 0.6)); }
  to { filter: drop-shadow(0 0 4px rgba(0,0,0,0.7)) drop-shadow(0 0 18px rgba(100, 210, 255, 1)); }
}

/* 4星：淡紫色 (Pale Purple) - 原 Silver 調整 */
.glow-silver { 
  animation: shine-purple 2s infinite alternate !important; 
}
@keyframes shine-purple {
  from { filter: drop-shadow(0 0 4px rgba(0,0,0,0.7)) drop-shadow(0 0 8px rgba(200, 150, 255, 0.7)); }
  to { filter: drop-shadow(0 0 4px rgba(0,0,0,0.7)) drop-shadow(0 0 22px rgba(200, 150, 255, 1)); }
}

/* 5星：金色光芒特別耀眼 (Dazzling Gold) - 範圍更大、亮度更高、呼吸更快 */
.glow-gold { 
  animation: shine-gold-intensify 1.2s infinite alternate !important; 
}
@keyframes shine-gold-intensify {
  from { filter: drop-shadow(0 0 4px rgba(0,0,0,0.8)) drop-shadow(0 0 10px rgba(255, 220, 50, 0.8)) brightness(1.1); }
  to { filter: drop-shadow(0 0 4px rgba(0,0,0,0.8)) drop-shadow(0 0 35px rgba(255, 215, 0, 1)) brightness(1.3); }
}

/* 傳說：彩色光芒特別耀眼 (Dazzling Rainbow) - 色相旋轉、能量波動感 */
.glow-rainbow { 
  animation: glow-rainbow-intensify 1s infinite alternate !important; 
}
@keyframes glow-rainbow-intensify {
  from { filter: drop-shadow(0 0 4px rgba(0,0,0,0.9)) drop-shadow(0 0 12px #ff00de) brightness(1.1) hue-rotate(0deg); }
  to { filter: drop-shadow(0 0 4px rgba(0,0,0,0.9)) drop-shadow(0 0 45px #00d4ff) brightness(1.4) hue-rotate(360deg); }
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