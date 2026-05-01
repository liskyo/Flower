<script setup>
import { onMounted, ref } from 'vue';
import { resetGame } from '../store/gameState';

const emit = defineEmits(['start']);
const isVisible = ref(false);

onMounted(() => {
  setTimeout(() => {
    isVisible.value = true;
  }, 100);
});

const handleStart = () => {
  emit('start');
};

const handleReset = (e) => {
  e.stopPropagation(); // 避免觸發 handleStart
  resetGame();
};
</script>

<template>
  <div class="start-scene" :class="{ 'visible': isVisible }" @click="handleStart">
    <div class="logo-container">
      <h1 class="main-title">Flower<br>Research<br><span class="sub-title">The World</span></h1>
    </div>
    
    <div class="tap-to-start">
      Tap to Start
    </div>
    
    <div class="version-info">
      Ver. 2.0.0
    </div>
    
    <div class="reset-container">
      <button class="reset-btn" @click="handleReset">重置遊戲</button>
    </div>
  </div>
</template>

<style scoped>
.start-scene {
  position: fixed; /* 👈 關鍵修改在這裡 */
  inset: 0; 
  background: url('/background.png') no-repeat center center; 
  background-size: cover; 
  background-color: #87CEEB;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  z-index: 50; cursor: pointer; opacity: 0; transition: opacity 0.8s ease-in-out;
  overflow: hidden;
}

.start-scene.visible {
  opacity: 1;
}

/* 仿圖2 LOGO 風格 */
.logo-container {
  margin-bottom: 50px; text-align: center;
  transform: rotate(-3deg);
  animation: float 4s ease-in-out infinite;
}

.main-title {
  font-family: 'ZCOOL KuaiLe', cursive; font-size: 4rem; font-weight: 900;
  color: #ff9f43; text-shadow: 4px 4px 0 #ee5253, 8px 8px 0 #222f3e, -2px -2px 0 #fff, 2px -2px 0 #fff, -2px 2px 0 #fff, 2px 2px 0 #fff;
  line-height: 1.1; margin: 0; letter-spacing: 2px;
}

.sub-title {
  display: block; font-size: 2.5rem; color: #feca57;
  text-shadow: 3px 3px 0 #222f3e, -1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff;
  margin-top: 10px; background: #222f3e; padding: 0 15px; border-radius: 15px; border: 4px solid #fff;
}

.tap-to-start {
  font-family: 'Outfit', sans-serif; font-size: 2.5rem; font-weight: 900;
  color: #1dd1a1; text-shadow: 3px 3px 0 #222f3e, -2px -2px 0 #fff, 2px -2px 0 #fff, -2px 2px 0 #fff, 2px 2px 0 #fff;
  animation: pulse 1.5s infinite; margin-top: 30px; letter-spacing: 1px;
}

.version-info {
  position: absolute; bottom: 10px; left: 10px; font-family: monospace;
  font-size: 1rem; color: #10ac84; font-weight: 900; text-shadow: 1px 1px 0 #fff;
}

@keyframes float {
  0% { transform: translateY(0px) rotate(-3deg); }
  50% { transform: translateY(-15px) rotate(-1deg); }
  100% { transform: translateY(0px) rotate(-3deg); }
}

@keyframes pulse {
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.05); opacity: 0.7; }
  100% { transform: scale(1); opacity: 1; }
}

.reset-container {
  position: absolute; bottom: 10px; right: 10px;
}
.reset-btn {
  background: rgba(255, 255, 255, 0.2); border: 1px solid rgba(255, 255, 255, 0.5);
  color: white; padding: 5px 15px; border-radius: 5px; cursor: pointer;
  font-size: 0.8rem; font-weight: 900; backdrop-filter: blur(2px);
  transition: all 0.2s;
}
.reset-btn:hover {
  background: rgba(231, 76, 60, 0.6); border-color: #e74c3c;
}
</style>
