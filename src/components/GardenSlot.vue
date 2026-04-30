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

const updateProgress = () => {
  if (props.slotData.startTime && flower.value) {
    const { growthElapsed } = calculateEffectiveElapsedTime(props.slotData.startTime);
    
    if (props.slotData.status === 'growing') {
      const p = Math.min((growthElapsed / flower.value.growthTime) * 100, 100);
      progress.value = p;
      if (p >= 100) {
        props.slotData.status = 'ready';
        props.slotData.readyTime = Date.now();
      }
    }
    
    // 獨立檢查枯萎 (真實時間 30 分鐘 * 肥料倍率)
    if (props.slotData.status === 'ready') {
      // 若舊存檔無 readyTime，則以現在時間扣掉 30 分鐘作為預估，避免剛讀取就枯萎的落差
      const rTime = props.slotData.readyTime || (Date.now() - 1000); 
      const timeSinceReady = (Date.now() - rTime) / 1000;
      const witherTime = (30 * 60) * getWitherMultiplier(); // 30 分鐘 = 1800 秒
      if (timeSinceReady >= witherTime) {
        props.slotData.status = 'withered';
      }
    }
  }
};

let timer = null;
onMounted(() => { timer = setInterval(updateProgress, 200); });
onUnmounted(() => { clearInterval(timer); clearTimeout(holdTimer.value); });

// --- 改進的收割邏輯：停留即拔起 ---

const startHold = () => {
  const status = props.slotData.status;
  if ((status === 'ready' || status === 'withered') && !isHarvesting.value && !holdTimer.value) {
    isShaking.value = true;
    holdTimer.value = setTimeout(() => {
      pullUp();
    }, 50); // 停留或按住 0.05 秒
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

  // 紀錄拔起前的資訊，給動畫使用
  const currentStatus = props.slotData.status;
  const currentFlowerId = props.slotData.flowerId;
  const currentSlotId = props.slotData.id;

  setTimeout(() => {
    // 只有 ready 狀態才會觸發飛入收集箱的動畫，withered 則只會消失
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
  emit('swipe', props.slotData.id); // 通知上層滑動事件 (保留舊邏輯)
  startHold();
};

defineExpose({ triggerHarvest: pullUp });
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

.flower-container-v3 {
  width: 100%; max-width: 55px; height: 55px;
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

.glow-silver { filter: drop-shadow(0 0 10px silver) !important; }
.glow-gold { animation: pulseGold 2s infinite alternate !important; }
.glow-rainbow { animation: rainbowGlow 2s infinite alternate !important; }
@keyframes pulseGold {
  from { filter: drop-shadow(0 0 10px #f1c40f); transform: scale(1); }
  to { filter: drop-shadow(0 0 20px #f39c12); transform: scale(1.05); }
}
@keyframes rainbowGlow {
  0% { filter: drop-shadow(0 0 15px #ff0000); }
  20% { filter: drop-shadow(0 0 15px #ff7f00); }
  40% { filter: drop-shadow(0 0 15px #ffff00); }
  60% { filter: drop-shadow(0 0 15px #00ff00); }
  80% { filter: drop-shadow(0 0 15px #0000ff); }
  100% { filter: drop-shadow(0 0 15px #8b00ff); }
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