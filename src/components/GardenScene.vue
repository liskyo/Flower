// GardenScene.vue

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { state, autoSpawn, setScene, getCurrentGarden } from '../store/gameState';
import GardenSlot from './GardenSlot.vue';

const emit = defineEmits(['change-tab']);
const slotRefs = ref([]);
const isSwiping = ref(false);

const sceneNames = {
  taiwan: ["台北 101", "日月潭", "九份老街", "阿里山"],
  japan: ["富士山", "京都清水寺", "澀谷路口", "大阪城"]
};

const currentSceneNames = computed(() => {
  return sceneNames[state.currentCountry.toLowerCase()] || ["場景 1", "場景 2", "場景 3", "場景 4"];
});

let spawnTimer = null;

const startSwiping = () => { isSwiping.value = true; };
const stopSwiping = () => { isSwiping.value = false; };

const handleSwipe = (slotId) => {
  if (isSwiping.value) {
    const slotComp = slotRefs.value[slotId];
    if (slotComp) {
      slotComp.triggerHarvest();
    }
  }
};

const bgImageStyle = computed(() => ({
  backgroundImage: `url('/assets/scenes/${state.currentCountry.toLowerCase()}/scene_${state.currentCountry.toLowerCase()}_${state.currentScene}.png')`,
}));

// 計算當前場景對應的花園列表
const currentGarden = computed(() => getCurrentGarden());

onMounted(() => {
  spawnTimer = setInterval(() => {
    autoSpawn();
  }, 1500);
});

onUnmounted(() => {
  clearInterval(spawnTimer);
});
</script>

<template>
  <div 
    class="garden-scene"
    @mousedown="startSwiping"
    @mouseup="stopSwiping"
    @mouseleave="stopSwiping"
    @touchstart="startSwiping"
    @touchend="stopSwiping"
  >
    <div class="scene-bg-wrapper">
      <div class="scene-bg-full" :style="bgImageStyle"></div>
    </div>

    <div class="scene-overlay-ui">
      <div class="internal-hud">
        <div class="hud-item diamond">💎 {{ state.diamonds }}</div>
        <div class="hud-item location">🌍 {{ state.currentCountry }}</div>
      </div>

      <div class="landmark-nav">
        <button 
          v-for="(name, index) in currentSceneNames" 
          :key="index" 
          :class="{ active: state.currentScene === (index + 1) }"
          @click="setScene(index + 1)"
          class="landmark-btn"
        >
          {{ name }}
        </button>
      </div>
      
      <div class="absolute-garden-container">
        <div class="cloud-fixed-base"></div>
        
        <div class="flowers-fixed-grid">
          <GardenSlot 
            v-for="slot in currentGarden" 
            :key="`${state.currentCountry}_${state.currentScene}_${slot.id}`" 
            :ref="el => slotRefs[slot.id] = el"
            :slot-data="slot" 
            @swipe="handleSwipe"
          />
        </div>
      </div>

      <div class="internal-nav">
        <button class="nav-jump garden active">
          <div class="ball pink">🏠</div>
          <span>花園</span>
        </button>
        <button class="nav-jump" @click="emit('change-tab', 'catalog')">
          <div class="ball blue">📖</div>
          <span>圖鑑</span>
        </button>
        <button class="nav-jump" @click="emit('change-tab', 'shop')">
          <div class="ball yellow">🛒</div>
          <span>商店</span>
        </button>
        <button class="nav-jump">
          <div class="ball green">🗺️</div>
          <span>地圖</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.garden-scene { position: absolute; inset: 0; width: 100vw; height: 100vh; overflow: hidden; }

.scene-bg-wrapper { position: absolute; inset: 0; z-index: 0; }
.scene-bg-full { position: absolute; inset: 0; background-size: cover; background-position: center; transition: background-image 0.5s ease; }

.scene-overlay-ui {
  position: relative; z-index: 100; height: 100%; width: 100%;
}

/* Internal HUD */
.internal-hud {
  position: absolute; top: 15px; left: 15px; right: 15px;
  display: flex; justify-content: space-between; z-index: 1000;
}
.hud-item {
  background: white; border: 3px solid #2d3436; padding: 4px 12px;
  border-radius: 50px; font-weight: 900; box-shadow: 0 4px 0 #2d3436;
}

/* Landmark Nav */
.landmark-nav {
  position: absolute; top: 70px; left: 0; right: 0;
  display: flex; justify-content: center; gap: 8px; z-index: 1000;
}
.landmark-btn {
  background: white; border: 3px solid #2d3436; padding: 5px 12px;
  border-radius: 50px; font-weight: 900; font-size: 0.8rem;
  box-shadow: 0 3px 0 #2d3436; cursor: pointer; transition: all 0.2s;
}
.landmark-btn.active { background: #ffd100; transform: translateY(2px); box-shadow: 0 1px 0 #2d3436; }

/* 核心種植區：絕對定位 */
.absolute-garden-container {
  position: absolute;
  /* 改用 top 定位：將容器中心點精準定位在螢幕高度 65% 的位置（也就是大約底部 1/3 處） */
  top: 65%;
  left: 50%;
  transform: translate(-50%, -50%); /* 水平與垂直絕對置中 */
  width: 90vw;
  max-width: 600px; /* 雲朵寬度 */
  /* 移除固定的 height: 400px，改用比例限制，確保容器縮放時不變形 */
  aspect-ratio: 3 / 1; 
  z-index: 10;
}

.cloud-fixed-base {
  position: absolute;
  inset: 5%; /* 留出一點邊距讓圓角更明顯 */
  background-image: url('/cloud.png');
  background-size: auto 100%;
  background-position: center;
  background-repeat: repeat-x;
  
  /* 圓潤裁切 */
  border-radius: 200px;
  overflow: hidden;
  
  /* 半透明與柔化 */
  opacity: 0.7;
  filter: drop-shadow(0 0 15px rgba(255,255,255,0.5)) blur(1px);
  
  z-index: 1;
}

.flowers-fixed-grid {
  position: absolute;
  /* 微調中心點：通常雲的重心偏下方，所以網格可以稍微往下挪一點點 (55%) */
  top: 48%;
  left: 50%;
  transform: translate(-50%, -50%);
  /* 關鍵修改：大幅縮小網格佔比，用來抵銷原圖的透明空白區域 */
  width: 80%; /* 從 55% 增加到 80%，讓花朵分布更均勻 */
  height: 60%; 
  z-index: 10;
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  grid-template-rows: repeat(3, 1fr);
  gap: 2px; /* 縮小間距 */
  align-items: center;
  justify-items: center;
}

@media (max-width: 1024px) {
  .absolute-garden-container { 
    max-width: 450px; 
    top: 65%; /* 確保手機版也在相同比例位置 */
  }
  .flowers-fixed-grid { 
    width: 65%; /* 手機上雲比較小，網格可以稍微佔滿一點 */
  }
}

/* Internal Nav */
.internal-nav {
  position: absolute; bottom: 0; left: 0; right: 0;
  height: 110px; display: flex; justify-content: center; gap: 20px; align-items: center;
  padding-bottom: 15px;
}

.nav-jump {
  background: transparent; border: none; display: flex; flex-direction: column; align-items: center; gap: 5px;
  cursor: pointer;
}

.ball {
  width: 50px; height: 50px; border: 3px solid #2d3436; border-radius: 50%;
  background: white; display: flex; align-items: center; justify-content: center;
  font-size: 1.6rem; box-shadow: 0 5px 0 #2d3436;
  animation: jump 2s infinite ease-in-out;
}

@keyframes jump { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }

.nav-jump.active .ball { transform: translateY(-12px) scale(1.1); box-shadow: 0 8px 0 #2d3436; }
.nav-jump.active.garden .ball { background: #ff7675; }

.nav-jump span { font-weight: 900; font-size: 0.75rem; color: white; text-shadow: 2px 2px 0 #2d3436; }

@media (max-width: 1024px) {
  .absolute-garden-container {
    max-width: 500px; /* 縮小 max-width (代替 600px) */
    height: 300px;
    bottom: 33vh; /* 將雲朵定位在畫面底部 1/3 (代替 120px) */
  }
  .flowers-fixed-grid {
    grid-template-columns: repeat(8, 1fr);
    grid-template-rows: repeat(3, 1fr);
    width: 85%;
  }
}
</style>