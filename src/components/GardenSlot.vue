<script setup>
import { computed, ref, onMounted, onUnmounted, watch } from 'vue';
import { FLOWERS } from '../data/flowers';
import { state, harvestFlower } from '../store/gameState';

const props = defineProps(['slotData']);
const emit = defineEmits(['swipe']);

const imgRef = ref(null);
const canvasRef = ref(null);
const processedSrc = ref(null);
const isHarvesting = ref(false); 
const isShaking = ref(false);    
const holdTimer = ref(null);     

const flower = computed(() => FLOWERS.find(f => f.id === props.slotData.flowerId));
const progress = ref(0);

const growthScale = computed(() => {
  if (props.slotData.status === 'ready') return 1;
  if (props.slotData.status === 'growing') return 0.3 + (progress.value / 100) * 0.7;
  return 0;
});

const processImage = () => {
  if (!imgRef.value || processedSrc.value) return;
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
    processedSrc.value = canvas.toDataURL();
  } catch (e) { processedSrc.value = img.src; }
};

const updateProgress = () => {
  if (props.slotData.status === 'growing' && props.slotData.startTime && flower.value) {
    const elapsed = (Date.now() - props.slotData.startTime) / 1000;
    const p = Math.min((elapsed / flower.value.growthTime) * 100, 100);
    progress.value = p;
    if (p >= 100) props.slotData.status = 'ready';
  }
};

let timer = null;
onMounted(() => { timer = setInterval(updateProgress, 200); });
onUnmounted(() => { clearInterval(timer); clearTimeout(holdTimer.value); });

// --- 改進的收割邏輯：停留即拔起 ---

const startHold = () => {
  if (props.slotData.status === 'ready' && !isHarvesting.value && !holdTimer.value) {
    isShaking.value = true;
    holdTimer.value = setTimeout(() => {
      pullUp();
    }, 150); // 停留或按住 0.45 秒
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
  isHarvesting.value = true;
  isShaking.value = false;
  holdTimer.value = null;
  setTimeout(() => {
    harvestFlower(props.slotData.id);
    isHarvesting.value = false;
  }, 400);
};

// 處理滑鼠進入 (停留開始)
const handleMouseEnter = () => {
  startHold();
};

defineExpose({ triggerHarvest: pullUp });
</script>

<template>
  <div 
    class="garden-slot" 
    :class="{ 'can-harvest': slotData.status === 'ready', 'is-harvesting': isHarvesting, 'is-shaking': isShaking }"
    @mousedown="startHold"
    @mouseup="endHold"
    @mouseleave="endHold"
    @touchstart.prevent="startHold"
    @touchend="endHold"
    @mouseenter="handleMouseEnter"
  >
    <div class="slot-inner-centered">
      <div v-if="slotData.status !== 'empty'" class="flower-container-v3" :style="{ transform: `scale(${growthScale})` }">
        <div class="flower-render-box">
          <img ref="imgRef" :src="`/assets/flowers/${flower.country.toLowerCase()}/${flower.id}.png`" class="hidden-core" @load="processImage" />
          <canvas ref="canvasRef" class="hidden-core"></canvas>
          <img v-if="processedSrc" :src="processedSrc" class="final-flower-img" />
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
  width: 100%; max-width: 32px; height: 32px;
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