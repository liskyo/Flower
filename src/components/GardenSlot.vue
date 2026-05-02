<script setup>
import { computed, ref, onMounted, onUnmounted, watch } from 'vue';
import { FLOWERS } from '../data/flowers';
import { state, harvestFlower, calculateEffectiveElapsedTime, getWitherMultiplier, globalTicker } from '../store/gameState';
const props = defineProps(['slotData']);
const emit = defineEmits(['swipe', 'harvest-animate']);

const imgRef = ref(null);
const canvasRef = ref(null);
const processedSrc = ref(null);
const isHarvesting = ref(false); 
const isShaking = ref(false);    
const holdTimer = ref(null);     

const flower = computed(() => FLOWERS.find(f => f.id === props.slotData.flowerId));

// 👇 將進度改為 computed，依賴全域 ticker (不管切到哪個畫面都會更新)
const progress = computed(() => {
  if (!props.slotData.startTime || !flower.value || props.slotData.status === 'empty') return 0;
  
  // 讀取 globalTicker.now 來強制 Vue 定期重新計算
  const currentNow = globalTicker.now; 
  
  if (props.slotData.status === 'growing') {
    const { growthElapsed } = calculateEffectiveElapsedTime(props.slotData.startTime);
    return Math.min((growthElapsed / flower.value.growthTime) * 100, 100);
  }
  return 100;
});

// 👇 監聽進度變化，滿 100% 就轉為 ready 狀態
watch(progress, (newProgress) => {
  if (props.slotData.status === 'growing' && newProgress >= 100) {
    props.slotData.status = 'ready';
    props.slotData.readyTime = Date.now();
    sendGrowthNotification();
  }
});

// 👇 獨立監聽全域時間，檢查花朵是否枯萎 (背景也會執行)
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

// 保留清理長按判斷的計時器，避免切換頁面時報錯
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