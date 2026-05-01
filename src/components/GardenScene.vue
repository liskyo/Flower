// GardenScene.vue

<script setup>
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue';
import { state, autoSpawn, setScene, getCurrentGarden, harvestFlower, getCurrentWeather, isSceneUnlocked, getCurrentSpawnMultiplier, catchUpSpawning } from '../store/gameState';
import { FLOWERS } from '../data/flowers';
import GardenSlot from './GardenSlot.vue';

// 啊音效 (base64 短声波)
const popAudio = new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAA' +
  'EAAQAQAAAQABAAACABAAZGF0YU9vT18AAAAAAP//AAD+/wIA/v8CAP3/BAD9/wUA/f8F' +
  'AP3/BAD+/wIA//8AAP//AQAAAP//AAAAAAAAAP8/AP8/AP8/AP8/AP8/AP8/AP8/AP8/');

const playPop = () => {
  try {
    popAudio.currentTime = 0;
    popAudio.volume = 0.5;
    popAudio.play().catch(() => {});
  } catch(e) {}
};

const emit = defineEmits(['change-tab']);
const slotRefs = ref([]);
const isSwiping = ref(false);

const basketRef = ref(null);
const basketImgRef = ref(null);
const basketCanvasRef = ref(null);
const processedBasketSrc = ref(null);
const flyingFlowers = ref([]);
let flyIdCounter = 0;

const processBasketImage = () => {
  if (!basketImgRef.value || processedBasketSrc.value) return;
  const img = basketImgRef.value;
  const canvas = basketCanvasRef.value;
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
      // 去除接近白色或淺灰色的背景 (包括假去背格子)
      if ((r > 220 && g > 220 && b > 220)) data[i+3] = 0;
    }
    ctx.putImageData(imageData, 0, 0);
    processedBasketSrc.value = canvas.toDataURL();
  } catch (e) { processedBasketSrc.value = img.src; }
};

const sceneNames = {
  taiwan: ["台北 101", "阿里山", "民雄鬼屋", "台灣夜市"],
  japan: ["富士山", "晴空塔", "百鬼夜行", "夏日祭典"]
};

const currentSceneNames = computed(() => {
  return sceneNames[state.currentCountry.toLowerCase()] || ["場景 1", "場景 2", "場景 3", "場景 4"];
});

let spawnTimer = null;
let weatherTimer = null;
let stormTimer = null;

const currentWeather = ref(getCurrentWeather());
const spawnMultiplier = ref(getCurrentSpawnMultiplier());

const handleVisibilityChange = () => {
  if (document.visibilityState === 'visible') {
    catchUpSpawning();
  }
};

const startSpawnTimer = () => {
  const baseInterval = 30000;
  const multiplier = getCurrentSpawnMultiplier();
  spawnMultiplier.value = multiplier;
  
  const currentInterval = baseInterval / multiplier;
  
  spawnTimer = setTimeout(() => {
    autoSpawn();
    startSpawnTimer();
  }, currentInterval);
};

const getWeatherIcon = (id) => {
  const map = { storm: '⛈️', cloudy: '☁️', rainy: '🌧️', sunny: '☀️' };
  return map[id] || '☀️';
};

const stormElements = ref([]);
let stormIdCounter = 0;
const spawnStormElement = () => {
  const types = ['🌪️', '🌪️', '⚡', '⚡', '🌪️'];
  const id = stormIdCounter++;
  const fromTop = Math.random() < 0.5;
  const y = fromTop ? `${Math.random() * 30}%` : `${60 + Math.random() * 30}%`;
  stormElements.value.push({
    id, icon: types[Math.floor(Math.random() * types.length)],
    y, size: 1.5 + Math.random() * 2.5, duration: 3 + Math.random() * 4
  });
  setTimeout(() => { stormElements.value = stormElements.value.filter(e => e.id !== id); }, 8000);
};

const activeBuffsDisplay = computed(() => {
  const now = tickerTime.value; // 使用 tickerTime 驅動響應
  const items = [];
  if (state.activeBuffs?.sunnyDollUntil && now < state.activeBuffs.sunnyDollUntil)
    items.push({ icon: '☀️', name: '晴天娃娃', desc: '強制晴天效果', remain: Math.ceil((state.activeBuffs.sunnyDollUntil - now) / 60000) });
  if (state.activeBuffs?.rainUntil && now < state.activeBuffs.rainUntil)
    items.push({ icon: '🌧️', name: '人造雨', desc: `生長速度 ${state.activeBuffs.rainMultiplier || 2} 倍`, remain: Math.ceil((state.activeBuffs.rainUntil - now) / 60000) });
  if (state.activeBuffs?.fertilizerUntil && now < state.activeBuffs.fertilizerUntil)
    items.push({ icon: '💩', name: '肥料效果', desc: `枯萎時間 ${state.activeBuffs.fertilizerMultiplier || 2} 倍`, remain: Math.ceil((state.activeBuffs.fertilizerUntil - now) / 60000) });
  return items;
});
const buffTooltip = ref(null);
const showBuffTooltip = (item) => { buffTooltip.value = buffTooltip.value?.name === item.name ? null : item; };
const tickerTime = ref(Date.now());

const startSwiping = () => { isSwiping.value = true; };
const stopSwiping = () => { isSwiping.value = false; };

const handleSwipe = (slotId) => {
  if (!isSwiping.value) return;
  const slotComp = slotRefs.value[slotId];
  if (slotComp) {
    // 檢查花朵狀態，如果是 ready 或 withered 才收成並發出音效
    const status = slotComp.getSlotStatus?.();
    if (status === 'ready' || status === 'withered') {
      slotComp.triggerHarvest();
      playPop(); // 加入這行補上音效
    }
  }
};

// Touch 滑動連續收成
const handleTouchMove = (e) => {
  const touch = e.touches[0];
  if (!touch) return;
  const el = document.elementFromPoint(touch.clientX, touch.clientY);
  if (!el) return;
  // 找到對應的 slot ref
  Object.values(slotRefs.value).forEach(slotComp => {
    if (!slotComp || !slotComp.$el) return;
    if (slotComp.$el.contains(el) || slotComp.$el === el) {
      const status = slotComp.getSlotStatus?.();
      if (status === 'ready' || status === 'withered') {
        slotComp.triggerHarvest();
        playPop();
      }
    }
  });
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
  catchUpSpawning();
  document.addEventListener('visibilitychange', handleVisibilityChange);
  
  startSpawnTimer();
  weatherTimer = setInterval(() => {
    currentWeather.value = getCurrentWeather();
    spawnMultiplier.value = getCurrentSpawnMultiplier();
    tickerTime.value = Date.now();
  }, 5000);
  
  // 👇 補上：暴風雨專用的龍捲風生成計時器
  stormTimer = setInterval(() => {
    if (currentWeather.value?.id === 'storm') spawnStormElement();
  }, 1200);
});

onUnmounted(() => {
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  clearTimeout(spawnTimer);
  clearInterval(weatherTimer);
  clearInterval(stormTimer); // 👇 補上：記得清除計時器
});
</script>

<template>
  <div class="scene-bg-full" :style="bgImageStyle"></div>
  <div 
    class="garden-scene"
    @mousedown="startSwiping"
    @mouseup="stopSwiping"
    @mouseleave="stopSwiping"
    @touchstart="startSwiping"
    @touchend="stopSwiping"
    @touchmove.prevent="handleTouchMove"
  >
    <div class="scene-bg-wrapper">
      <div class="scene-bg-full" :style="bgImageStyle"></div>
    </div>


    <!-- 左上角：仿圖3的等級/資訊列 -->
    <div class="top-hud">
      <div class="level-box">
        <div class="hud-title">{{ state.currentCountry === 'Taiwan' ? '台灣花園' : state.currentCountry === 'Japan' ? '日本花園' : state.currentCountry + '花園' }}</div>
        <div class="hud-level">Lv. {{ state.level || 1 }}</div>
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: `${((state.exp || 0) % 1000) / 10}%` }"></div>
        </div>
      </div>
      <div class="diamond-display">💎 {{ state.diamonds }}</div>
    </div>

    <!-- 右上角：天氣指示器 -->
    <div class="weather-hud">
      <div class="weather-icon-large">{{ getWeatherIcon(currentWeather.id) }}</div>
      <div class="weather-info">
        <div class="weather-name">{{ currentWeather.name }}</div>
        <div class="weather-speed">生成效率 {{ Math.round(spawnMultiplier * 100) }}%</div>
      </div>
    </div>

    <!-- 作用中 Buff Icons -->
    <div class="buff-bar" v-if="activeBuffsDisplay.length > 0">
      <div
        v-for="buff in activeBuffsDisplay" :key="buff.name"
        class="buff-icon" @click.stop="showBuffTooltip(buff)"
      >
        <span class="buff-emoji">{{ buff.icon }}</span>
        <span class="buff-remain">{{ buff.remain }}m</span>
      </div>
      <Transition name="fade">
        <div v-if="buffTooltip" class="buff-tooltip" @click="buffTooltip = null">
          <strong>{{ buffTooltip.icon }} {{ buffTooltip.name }}</strong>
          <span>{{ buffTooltip.desc }}</span>
          <span>剩餘 {{ buffTooltip.remain }} 分鐘</span>
        </div>
      </Transition>
    </div>

    <div class="scene-overlay-ui">
      <!-- 天氣視覺特效層 -->
      <div class="weather-overlay" :class="currentWeather.id">
        <div class="rain-layer"></div>
        <!-- 👇 修改條件：暴風雨、小雨、陰天 都會有這個濾鏡層 -->
        <div v-if="['storm', 'rainy', 'cloudy'].includes(currentWeather.id)" class="water-drop-filter"></div>
      </div>
      <div class="landmark-nav">
        <template v-for="(name, index) in currentSceneNames" :key="index">
          <button 
            v-if="isSceneUnlocked(state.currentCountry, index + 1)"
            :class="{ active: state.currentScene === (index + 1) }"
            @click="setScene(index + 1)"
            class="landmark-btn"
          >
            {{ name }}
          </button>
          <button v-else class="landmark-btn locked-scene" disabled>
            🔒 {{ name }}
          </button>
        </template>
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

      <!-- 左下角：花籃 -->
      <div class="basket-container" ref="basketRef">
        <img ref="basketImgRef" src="/flowerbasket.png" @load="processBasketImage" style="display:none" />
        <canvas ref="basketCanvasRef" style="display:none"></canvas>
        <img v-if="processedBasketSrc" :src="processedBasketSrc" class="basket-img-real" />
        <div v-else class="basket-img">🧺</div>
        <div class="basket-label">花籃</div>
      </div>

      <!-- 右下角：功能按鍵群組 -->
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
        <button class="action-btn inventory" @click="emit('change-tab', 'inventory')">
          <span class="icon">🎒</span>
          <span class="label">道具</span>
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
/* GardenScene.vue */
.garden-scene { 
  position: fixed; /* 👈 同樣改成 fixed */
  inset: 0; 
  width: 100vw; height: 100vh; overflow: hidden; 
}
/* --- 找到這三段並替換 --- */
.scene-bg-wrapper { 
  position: absolute; inset: 0; z-index: 0; overflow: hidden; 
  background-color: #87CEEB; /* 加上天空底色，以防圖片載入前閃爍 */
}

.scene-bg-full {
  position: absolute; top: 0; left: 0;
  /* 👇 終極解法：把畫布做成螢幕的兩倍寬 (200%) */
  width: 200%;   
  height: 100%;
  
  /* 修改：改用 50% cover 並對齊底部，防止拉伸變形 */
  background-size: 50% cover; 
  background-position: center bottom;
  background-repeat: repeat-x; 
  
  /* 改用 transform 進行動畫，手機瀏覽器 100% 完美支援且不破圖 */
  animation: scrollBg 80s linear infinite;
  transition: background-image 0.5s ease;
}

/* 預設水滴濾鏡效果 (暴風雨：高模糊、快水滴) */
.water-drop-filter {
  position: absolute; inset: 0; pointer-events: none; z-index: 10;
  
  background-image:
    radial-gradient(4px 5px at 15% 25%, rgba(255,255,255,0.7) 0%, transparent 80%),
    radial-gradient(5px 6px at 85% 15%, rgba(255,255,255,0.5) 0%, transparent 80%),
    radial-gradient(3px 4px at 45% 65%, rgba(255,255,255,0.6) 0%, transparent 80%),
    radial-gradient(6px 8px at 75% 75%, rgba(255,255,255,0.4) 0%, transparent 80%),
    radial-gradient(2px 3px at 20% 80%, rgba(255,255,255,0.5) 0%, transparent 80%);
  background-size: 150px 150px; 
  
  backdrop-filter: blur(1.5px) contrast(1.1); 
  animation: dropSlide 5s linear infinite;
}

@keyframes dropSlide {
  0% { background-position: 0 0; }
  100% { background-position: 0 150px; } 
}

/* 👇 新增：小雨狀態下的濾鏡 (微弱水滴、低模糊) */
.rainy .water-drop-filter {
  opacity: 0.5;
  backdrop-filter: blur(0.5px) contrast(1.05); /* 降低模糊，讓花朵維持清晰 */
  animation-duration: 10s; /* 水滴滑落速度變慢 */
}

/* 👇 新增：陰天狀態下的濾鏡 (純起霧，沒有水滴) */
.cloudy .water-drop-filter {
  background-image: none; /* 隱藏水滴 */
  backdrop-filter: blur(1.2px) contrast(1.0); /* 單純玻璃起霧感 */
  background-color: rgba(255, 255, 255, 0.05); /* 加上極淡的白霧 */
}

@keyframes scrollBg {
  0% { transform: translateX(0); }
  /* 向左移動一個螢幕的寬度，完美達成無縫接軌循環 */
  100% { transform: translateX(-50%); } 
}


@keyframes stormFly {
  0% { left: -15%; opacity: 0; }
  10% { opacity: 1; }
  90% { opacity: 1; }
  100% { left: 110%; opacity: 0; }
}

/* 作用中 Buff 欄 */
.buff-bar {
  position: absolute; bottom: 160px; left: 15px; z-index: 3000;
  display: flex; flex-direction: column; gap: 6px;
}
.buff-icon {
  display: flex; flex-direction: column; align-items: center;
  background: rgba(0,0,0,0.7); border: 2px solid rgba(255,255,255,0.3);
  border-radius: 12px; padding: 4px 8px; cursor: pointer;
  transition: all 0.2s;
}
.buff-icon:hover { transform: scale(1.1); }
.buff-emoji { font-size: 1.6rem; }
.buff-remain { font-size: 0.6rem; color: #ffeaa7; font-weight: 900; }
.buff-tooltip {
  position: absolute; bottom: 0; left: 70px;
  background: rgba(0,0,0,0.9); border: 2px solid #ffeaa7; border-radius: 10px;
  padding: 8px 12px; color: white; min-width: 180px;
  display: flex; flex-direction: column; gap: 3px; font-size: 0.85rem;
}
.buff-tooltip strong { font-size: 1rem; color: #ffeaa7; }

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
.weather-overlay.storm { 
  background: rgba(10, 15, 30, 0.6); 
  animation: lightning 5s infinite;
}
.weather-overlay.cloudy { background: rgba(50, 55, 65, 0.35); }
.weather-overlay.rainy { background: rgba(30, 45, 60, 0.25); }
.weather-overlay.sunny { background: rgba(255, 230, 150, 0.1); }

.rain-layer {
  position: absolute; inset: -20% -10%; 
  background-image: linear-gradient(165deg, transparent 45%, rgba(255,255,255,0.4) 46%, transparent 47%);
  background-size: 20px 80px; background-position: 0 0;
  animation: rainFall 0.4s linear infinite; opacity: 0;
}
.storm .rain-layer { opacity: 0; display: none; } /* 👈 徹底隱藏暴風雨的滿天白線 */
/* --- 找到這行並替換 --- */
.rainy .rain-layer { 
  opacity: 0; 
  display: none; /* 徹底隱藏小雨的線條，只保留水滴濾鏡 */
}@keyframes rainFall {
  0% { background-position: 0 0; }
  100% { background-position: -40px 100vh; }
}
@keyframes lightning {
  0%, 90% { background-color: rgba(10, 15, 30, 0.6); }
  92% { background-color: rgba(255, 255, 255, 0.2); }
  94% { background-color: rgba(10, 15, 30, 0.6); }
  96% { background-color: rgba(255, 255, 255, 0.4); }
  100% { background-color: rgba(10, 15, 30, 0.6); }
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
.landmark-btn.locked-scene { background: #636e72; color: #b2bec3; cursor: not-allowed; opacity: 0.7; }

/* --- 找到 核心種植區 這段並替換 --- */
.absolute-garden-container {
  position: absolute; top: 60%; left: 50%; transform: translate(-50%, -50%);
  width: 95vw; 
  max-width: 800px;      /* 原本是 600px，拉大電腦版雲朵極限 */
  aspect-ratio: 2.5 / 1; /* 原本是 3 / 1，讓雲朵變高一點以容納大花朵 */
  z-index: 10;
}
.cloud-fixed-base {
  position: absolute; inset: 5%; background-image: url('/cloud.png');
  background-size: auto 100%; background-position: center; background-repeat: repeat-x;
  border-radius: 200px; overflow: hidden; opacity: 0.7; filter: drop-shadow(0 0 15px rgba(255,255,255,0.5)) blur(1px); z-index: 1;
}
.flowers-fixed-grid {
  position: absolute; top: 40%; left: 50%; transform: translate(-50%, -50%);
  width: 90%;            /* 原本 85%，讓網格更貼近雲朵邊緣 */
  height: 75%;           /* 原本 60%，讓上下兩排花距拉開 */
  z-index: 10; display: grid;
  grid-template-columns: repeat(8, 1fr); grid-template-rows: repeat(2, 1fr); gap: 15px 5px;
  align-items: center; justify-items: center;
}

/* 左下角花籃 */
.basket-container {
  position: absolute; bottom: 15%; left: 15%; z-index: 1500;
  display: flex; flex-direction: column; align-items: center;
  transform: scale(1.2);
}
.basket-img-real {
  width: 80px; height: 80px; object-fit: contain;
  filter: drop-shadow(2px 4px 6px rgba(0,0,0,0.4));
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

.action-btn.map { background: #feca57; width: 60px; height: 60px; }
.action-btn.map .icon { font-size: 1.4rem; }
.action-btn.catalog { background: #ff6b6b; width: 85px; height: 85px; }
.action-btn.catalog .icon { font-size: 2.2rem; }
.action-btn.shop { background: #48dbfb; width: 65px; height: 65px; }
.action-btn.inventory { background: #a29bfe; width: 60px; height: 60px; }

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

/* --- 找到 @media 裡面的這兩段並替換 --- */
@media (max-width: 1024px) {
  .absolute-garden-container { 
    max-width: 100vw;
    width: 88vw;           /* 讓雲朵夠寬 */
    top: 56%;              /* 避開上方選單 */
    left: 45%;             /* 稍微偏左，完美閃避右側的圖鑑按鈕 */
    transform: translate(-50%, -50%);
    aspect-ratio: 2.3 / 1; 
  }
  
  /* 控制網格大小，確保絕對不會超出雲朵邊界 */
  .flowers-fixed-grid { 
    width: 82%;            /* 網格寬度小於雲朵範圍 */
    height: 65%;           /* 網格高度小於雲朵範圍 */
    top: 50%; 
    left: 50%; 
    transform: translate(-50%, -50%);
    gap: 2px 4px;          /* 保留微小間距，茂密又整齊 */
  }
  
  /* 功能按鈕確保貼緊右側安全區 */
  .action-cluster { 
    bottom: 20px; 
    right: max(15px, env(safe-area-inset-right)); 
    gap: 10px; 
  }
  
  .action-btn { width: 55px; height: 55px; border-width: 3px; }
  .action-btn .icon { font-size: 1.5rem; }
  .action-btn .label { font-size: 0.65rem; bottom: -10px; }
  
  .action-btn.map { width: 48px; height: 48px; }
  .action-btn.map .icon { font-size: 1.2rem; }
  .action-btn.catalog { width: 75px; height: 75px; } 
  .action-btn.shop { width: 52px; height: 52px; }
  .action-btn.inventory { width: 48px; height: 48px; }
  
/* 👇 2. 將花籃容器盡可能往左下角推 */
  .basket-container { 
    bottom: 15px; /* 原本是 10%，改用絕對像素壓到最底部 */
    left: max(15px, env(safe-area-inset-left)); /* 緊貼左側安全區 */
  }}
  .basket-img-real {
    width: 65px !important;  /* 強制覆寫原本的 80px，縮小花籃圖片 */
    height: 65px !important; 
  }
</style>