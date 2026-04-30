// GardenScene.vue

<script setup>
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue';
import { state, autoSpawn, setScene, getCurrentGarden, harvestFlower, getCurrentWeather } from '../store/gameState';
import { FLOWERS } from '../data/flowers';
import GardenSlot from './GardenSlot.vue';

const emit = defineEmits(['change-tab']);
const slotRefs = ref([]);
const isSwiping = ref(false);

const basketRef = ref(null);
const flyingFlowers = ref([]);
let flyIdCounter = 0;

const sceneNames = {
  taiwan: ["台北 101", "日月潭", "九份老街", "阿里山"],
  japan: ["富士山", "京都清水寺", "澀谷路口", "大阪城"]
};

const currentSceneNames = computed(() => {
  return sceneNames[state.currentCountry.toLowerCase()] || ["場景 1", "場景 2", "場景 3", "場景 4"];
});

let spawnTimer = null;
let weatherTimer = null;

const currentWeather = ref(getCurrentWeather());

const getWeatherIcon = (id) => {
  const map = { storm: '⛈️', cloudy: '☁️', rainy: '🌧️', sunny: '☀️' };
  return map[id] || '☀️';
};

const startSwiping = () => { isSwiping.value = true; };
const stopSwiping = () => { isSwiping.value = false; };

const handleSwipe = (slotId) => {
  if (!isSwiping.value) return;
  const slotComp = slotRefs.value[slotId];
  if (slotComp) {
    slotComp.triggerHarvest();
  }
};

const handleHarvestAnimate = ({ slotId, flowerId, imgUrl }) => {
  const flower = FLOWERS.find(f => f.id === flowerId);
  if (!flower) return;

  const slotComp = slotRefs.value[slotId];
  if (slotComp && slotComp.$el) {
    const rect = slotComp.$el.getBoundingClientRect();
    const startX = rect.left + rect.width / 2;
    const startY = rect.top + rect.height / 2 - 50; 
    
    triggerFlyAnimation(flower, startX, startY, imgUrl);
  }
};

const triggerFlyAnimation = (flower, startX, startY, imgUrl) => {
  if (!basketRef.value) return;
  
  const basketRect = basketRef.value.getBoundingClientRect();
  const endX = basketRect.left + basketRect.width / 2;
  const endY = basketRect.top + basketRect.height * 0.2; 

  const flyId = flyIdCounter++;
  
  flyingFlowers.value.push({
    id: flyId,
    url: imgUrl || `/assets/flowers/${flower.country.toLowerCase()}/${flower.id}.png`,
    startX, startY, endX, endY
  });

  // 動畫結束後移除
  setTimeout(() => {
    flyingFlowers.value = flyingFlowers.value.filter(f => f.id !== flyId);
    // 播放花籃震動
    if (basketRef.value) {
      basketRef.value.classList.remove('shake');
      void basketRef.value.offsetWidth; // trigger reflow
      basketRef.value.classList.add('shake');
    }
  }, 600); // 對應 CSS 動畫時間
};

const bgImageStyle = computed(() => ({
  backgroundImage: `url('/assets/scenes/${state.currentCountry.toLowerCase()}/scene_${state.currentCountry.toLowerCase()}_${state.currentScene}.png')`,
}));

const currentGarden = computed(() => getCurrentGarden());

onMounted(() => {
  spawnTimer = setInterval(() => {
    autoSpawn();
  }, 1500);
  
  weatherTimer = setInterval(() => {
    currentWeather.value = getCurrentWeather();
  }, 5000); // 每 5 秒更新一次天氣
});

onUnmounted(() => {
  clearInterval(spawnTimer);
  clearInterval(weatherTimer);
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

    <!-- 左上角：仿圖3的等級/資訊列 -->
    <div class="top-hud">
      <div class="level-box">
        <div class="hud-title">{{ state.currentCountry === 'Taiwan' ? '台灣花園' : '日本花園' }}</div>
        <div class="hud-level">Lv. 1</div>
        <div class="progress-bar"><div class="progress-fill"></div></div>
      </div>
      <div class="diamond-display">💎 {{ state.diamonds }}</div>
    </div>

    <!-- 右上角：天氣指示器 -->
    <div class="weather-hud">
      <div class="weather-icon-large">{{ getWeatherIcon(currentWeather.id) }}</div>
      <div class="weather-info">
        <div class="weather-name">{{ currentWeather.name }}</div>
        <div class="weather-speed">生長 {{ Math.round(currentWeather.speed * 100) }}%</div>
      </div>
    </div>

    <div class="scene-overlay-ui">
      <!-- 天氣視覺特效層 -->
      <div class="weather-overlay" :class="currentWeather.id">
        <div class="rain-layer"></div>
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
            v-for="slot in currentGarden.slice(0, 16)" 
            :key="`${state.currentCountry}_${state.currentScene}_${slot.id}`" 
            :ref="el => slotRefs[slot.id] = el"
            :slot-data="slot" 
            @swipe="handleSwipe"
            @harvest-animate="handleHarvestAnimate"
          />
        </div>
      </div>

      <!-- 左下角：收集花籃 -->
      <div class="basket-container" ref="basketRef">
        <div class="basket-img">🧺</div>
        <div class="basket-label">收集箱</div>
      </div>

      <!-- 右下角：功能按鍵群組 (仿圖3) -->
      <div class="action-cluster">
        <button class="action-btn map" @click="emit('change-tab', 'map')">
          <span class="icon">🗺️</span>
          <span class="label">地圖</span>
        </button>
        <button class="action-btn catalog" @click="emit('change-tab', 'catalog')">
          <span class="icon">📖</span>
          <span class="label">圖鑑</span>
        </button>
        <button class="action-btn shop" @click="emit('change-tab', 'shop')">
          <span class="icon">🛒</span>
          <span class="label">商店</span>
        </button>
      </div>
    </div>

    <!-- 飛行動畫層 -->
    <div class="flying-layer">
      <div 
        v-for="flower in flyingFlowers" 
        :key="flower.id" 
        class="flying-flower-x"
        :style="{
          '--startX': `${flower.startX}px`,
          '--endX': `${flower.endX}px`,
          '--startY': `${flower.startY}px`,
          '--endY': `${flower.endY}px`
        }"
      >
        <img :src="flower.url" class="flying-flower-y" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.garden-scene { position: absolute; inset: 0; width: 100vw; height: 100vh; overflow: hidden; }

.scene-bg-wrapper { position: absolute; inset: 0; z-index: 0; }
.scene-bg-full { position: absolute; inset: 0; background-size: cover; background-position: center; transition: background-image 0.5s ease; }

.scene-overlay-ui { position: relative; z-index: 100; height: 100%; width: 100%; }

/* 左上角 HUD */
.top-hud {
  position: absolute; top: 15px; left: 15px; z-index: 2000; display: flex; align-items: center; gap: 10px;
}
.level-box {
  background: rgba(255, 255, 255, 0.9); border: 3px solid #2d3436; border-radius: 10px;
  padding: 5px 15px; box-shadow: 0 4px 0 #2d3436; position: relative;
}
.hud-title { font-size: 0.8rem; font-weight: 900; color: #2d3436; }
.hud-level { font-size: 1.1rem; font-weight: 900; color: #2d3436; margin-bottom: 2px; }
.progress-bar { width: 100px; height: 10px; background: #dfe6e9; border: 2px solid #2d3436; border-radius: 5px; overflow: hidden; }
.progress-fill { width: 40%; height: 100%; background: #00b894; }

.weather-icon {
  background: white; border: 3px solid #2d3436; width: 40px; height: 40px;
  border-radius: 50%; display: flex; align-items: center; justify-content: center;
  font-size: 1.5rem; box-shadow: 0 4px 0 #2d3436;
}
.diamond-display {
  background: white; border: 3px solid #2d3436; padding: 5px 12px;
  border-radius: 20px; font-weight: 900; box-shadow: 0 4px 0 #2d3436; color: #2d3436;
}

/* 右上角天氣面板 */
.weather-hud {
  position: absolute; top: 15px; right: 15px; z-index: 2000;
  display: flex; align-items: center; gap: 8px;
  background: rgba(45, 52, 54, 0.85); border: 2px solid rgba(255,255,255,0.3);
  padding: 6px 12px; border-radius: 20px; color: white; box-shadow: 0 4px 0 rgba(0,0,0,0.5);
}
.weather-icon-large { font-size: 1.8rem; filter: drop-shadow(0 2px 2px rgba(0,0,0,0.5)); }
.weather-info { display: flex; flex-direction: column; }
.weather-name { font-weight: 900; font-size: 0.9rem; }
.weather-speed { font-size: 0.75rem; color: #ffeaa7; font-weight: bold; }

/* 天氣濾鏡與特效 */
.weather-overlay {
  position: absolute; inset: 0; z-index: 5; pointer-events: none;
  transition: background 2s ease; overflow: hidden;
}
.weather-overlay.storm { background: rgba(10, 15, 30, 0.5); }
.weather-overlay.cloudy { background: rgba(50, 55, 65, 0.35); }
.weather-overlay.rainy { background: rgba(30, 45, 60, 0.25); }
.weather-overlay.sunny { background: rgba(255, 230, 150, 0.1); }

.rain-layer {
  position: absolute; inset: -20% -10%; 
  background-image: radial-gradient(circle at 50% 50%, rgba(255,255,255,0.4) 1px, transparent 1px);
  background-size: 20px 40px; background-position: 0 0;
  animation: rainFall 0.4s linear infinite; opacity: 0;
  transform: rotate(15deg);
}
.storm .rain-layer { opacity: 1; animation-duration: 0.2s; background-size: 10px 20px; }
.rainy .rain-layer { opacity: 0.5; animation-duration: 0.5s; background-size: 15px 30px; }

@keyframes rainFall {
  0% { background-position: 0 0; }
  100% { background-position: -20px 100vh; }
}

/* Landmark Nav */
.landmark-nav {
  position: absolute; top: 80px; left: 0; right: 0; display: flex; justify-content: center; gap: 8px; z-index: 1000;
}
.landmark-btn {
  background: white; border: 3px solid #2d3436; padding: 5px 12px; border-radius: 50px;
  font-weight: 900; font-size: 0.8rem; box-shadow: 0 3px 0 #2d3436; cursor: pointer; transition: all 0.2s;
}
.landmark-btn.active { background: #ffd100; transform: translateY(2px); box-shadow: 0 1px 0 #2d3436; }

/* 核心種植區 */
.absolute-garden-container {
  position: absolute; top: 60%; left: 50%; transform: translate(-50%, -50%);
  width: 90vw; max-width: 600px; aspect-ratio: 3 / 1; z-index: 10;
}
.cloud-fixed-base {
  position: absolute; inset: 5%; background-image: url('/cloud.png');
  background-size: auto 100%; background-position: center; background-repeat: repeat-x;
  border-radius: 200px; overflow: hidden; opacity: 0.7; filter: drop-shadow(0 0 15px rgba(255,255,255,0.5)) blur(1px); z-index: 1;
}
.flowers-fixed-grid {
  position: absolute; top: 48%; left: 50%; transform: translate(-50%, -50%);
  width: 85%; height: 60%; z-index: 10; display: grid;
  grid-template-columns: repeat(8, 1fr); grid-template-rows: repeat(2, 1fr); gap: 10px 5px;
  align-items: center; justify-items: center;
}

/* 左下角花籃 */
.basket-container {
  position: absolute; bottom: 15%; left: 15%; z-index: 1500;
  display: flex; flex-direction: column; align-items: center;
  transform: scale(1.2); /* 讓花籃大一點 */
}
.basket-img {
  font-size: 5rem; text-shadow: 2px 2px 0 rgba(0,0,0,0.3);
}
.basket-label {
  background: #2d3436; color: white; padding: 3px 10px; border-radius: 12px;
  font-size: 0.85rem; font-weight: 900; border: 2px solid white; box-shadow: 0 3px 0 rgba(0,0,0,0.5);
  margin-top: -15px; z-index: 2;
}
.shake { animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both; }
@keyframes shake {
  10%, 90% { transform: translate3d(-1px, 0, 0); }
  20%, 80% { transform: translate3d(2px, 0, 0); }
  30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
  40%, 60% { transform: translate3d(4px, 0, 0); }
}

/* 右下角群組按鈕 */
.action-cluster {
  position: absolute; bottom: 30px; right: 30px; z-index: 1500;
  display: flex; flex-direction: column; gap: 15px; align-items: flex-end;
}
.action-btn {
  background: #fff; border: 4px solid #2d3436; border-radius: 50%;
  width: 70px; height: 70px; display: flex; flex-direction: column; align-items: center; justify-content: center;
  cursor: pointer; box-shadow: 0 6px 0 #2d3436; transition: all 0.1s; position: relative;
}
.action-btn:active { transform: translateY(4px); box-shadow: 0 2px 0 #2d3436; }
.action-btn .icon { font-size: 1.8rem; }
.action-btn .label {
  position: absolute; bottom: -12px; background: #2d3436; color: white;
  font-size: 0.7rem; font-weight: 900; padding: 2px 8px; border-radius: 10px;
  border: 2px solid white; white-space: nowrap;
}

/* 個別按鈕顏色 */
.action-btn.map { background: #feca57; width: 60px; height: 60px; margin-right: 15px; }
.action-btn.map .icon { font-size: 1.4rem; }
.action-btn.catalog { background: #ff6b6b; width: 85px; height: 85px; }
.action-btn.catalog .icon { font-size: 2.2rem; }
.action-btn.shop { background: #48dbfb; width: 65px; height: 65px; margin-right: 50px; margin-top: -20px; }

/* 飛行動畫層 */
.flying-layer { position: absolute; inset: 0; pointer-events: none; z-index: 5000; overflow: hidden; }

/* 負責 X 軸水平等速移動 */
.flying-flower-x {
  position: absolute; top: 0; left: 0;
  animation: flyX 0.6s linear forwards;
}

/* 負責 Y 軸垂直拋物線移動與縮放 */
.flying-flower-y {
  width: 45px; height: 45px; object-fit: contain;
  animation: flyY 0.6s ease-in forwards;
}

@keyframes flyX {
  0% { transform: translateX(var(--startX)); }
  100% { transform: translateX(var(--endX)); }
}
@keyframes flyY {
  0% { transform: translateY(var(--startY)) scale(1); opacity: 1; }
  35% { transform: translateY(calc(var(--startY) - 100px)) scale(1.3); opacity: 1; } /* 拋高且變大 */
  80% { transform: translateY(calc(var(--endY) - 20px)) scale(0.6); opacity: 1; } /* 掉落到開口時縮小 */
  100% { transform: translateY(var(--endY)) scale(0); opacity: 0; } /* 瞬間消失模擬掉進去 */
}

@media (max-width: 1024px) {
  .absolute-garden-container { max-width: 450px; top: 55%; }
  .flowers-fixed-grid { width: 65%; }
  .action-cluster { bottom: 20px; right: 20px; transform: scale(0.85); transform-origin: bottom right; }
  .basket-container { bottom: 10%; left: 10%; transform: scale(1); transform-origin: bottom left; }
}
</style>