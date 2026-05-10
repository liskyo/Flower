// GardenScene.vue

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { state, setScene, getCurrentGarden, getCurrentWeather, isSceneUnlocked, getCurrentSpawnMultiplier, catchUpSpawning, getLevelInfo, getDailyLoginStatus, getDailyMissionSummary, getCatalogAchievementSummary, playSound, consumeInventoryItem, getInventoryItemCount, trackDailyMissionProgress } from '../store/gameState';
import { FLOWERS, SCENE_NAMES_BY_COUNTRY } from '../data/flowers';
import { getFlowerImagePath, getSceneBackgroundPath } from '../data/assetPaths';
import { getItemDefinition } from '../data/items';
import GardenSlot from './GardenSlot.vue';

// 取得當前經驗值進度資訊
const currentLevelInfo = computed(() => getLevelInfo(state.exp || 0));
const dailyRewardStatus = computed(() => getDailyLoginStatus());
const dailyMissionSummary = computed(() => getDailyMissionSummary());
const achievementSummary = computed(() => getCatalogAchievementSummary());
const activityBadgeCount = computed(() => {
  return (dailyRewardStatus.value.claimedToday ? 0 : 1)
    + dailyMissionSummary.value.claimableCount
    + achievementSummary.value.claimableCount;
});

/** 左側「任務」紅點：每日簽到 + 可領任務 */
const taskBadgeCount = computed(() =>
  (dailyRewardStatus.value.claimedToday ? 0 : 1) + dailyMissionSummary.value.claimableCount
);

const emit = defineEmits(['change-tab']);
const slotRefs = ref([]);
const isSwiping = ref(false);

const basketRef = ref(null);
const basketImgRef = ref(null);
const basketCanvasRef = ref(null);
const processedBasketSrc = ref(null);
const flyingFlowers = ref([]);
const harvestFeedbacks = ref([]);
const rareBursts = ref([]);
let flyIdCounter = 0;
let feedbackIdCounter = 0;

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

const currentSceneNames = computed(() => {
  const names = SCENE_NAMES_BY_COUNTRY[state.currentCountry];
  if (Array.isArray(names) && names.length === 4) return names;
  return ["場景 1", "場景 2", "場景 3", "場景 4"];
});

// 計算指定場景的前置任務 (前一個場景) 的銀牌收集進度
const getSceneUnlockProgress = (country, targetScene) => {
  if (targetScene === 1) return 100; // 場景 1 預設解鎖
  
  // 找出前一個場景的所有花朵
  const prevSceneFlowers = FLOWERS.filter(f => 
    String(f.country).toLowerCase() === String(country).toLowerCase() && 
    Number(f.scene) === targetScene - 1 &&
    f.rarity !== 'Legendary'
  );
  
  if (prevSceneFlowers.length === 0) return 100; // 防呆
  
  // 計算有多少朵花已經達到銀牌 (數量 >= 20)
  const silverCount = prevSceneFlowers.filter(f => (state.inventory[f.id] || 0) >= 20).length;
  
  // 回傳百分比 (四捨五入)
  return Math.round((silverCount / prevSceneFlowers.length) * 100);
};

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
  // 該邏輯已移至 gameState.js 的全域 setInterval 中處理
  spawnMultiplier.value = getCurrentSpawnMultiplier();
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
  const now = tickerTime.value; 
  const items = [];
  if (state.activeBuffs?.sunnyDollUntil && now < state.activeBuffs.sunnyDollUntil)
    items.push({ icon: '☀️', name: '晴天娃娃', desc: '強制晴天效果', remain: Math.ceil((state.activeBuffs.sunnyDollUntil - now) / 60000) });
  if (state.activeBuffs?.rainUntil && now < state.activeBuffs.rainUntil)
    items.push({ icon: '🌧️', name: '人造雨', desc: `生長速度 ${state.activeBuffs.rainMultiplier || 2} 倍`, remain: Math.ceil((state.activeBuffs.rainUntil - now) / 60000) });
  
  // 👇 修正肥料描述
  if (state.activeBuffs?.fertilizerUntil && now < state.activeBuffs.fertilizerUntil)
    items.push({ icon: '💩', name: '肥料效果', desc: `採收數量 ${state.activeBuffs.fertilizerMultiplier || 2} 倍`, remain: Math.ceil((state.activeBuffs.fertilizerUntil - now) / 60000) });
  
  // 👇 新增星星描述
  if (state.activeBuffs?.starUntil && now < state.activeBuffs.starUntil)
    items.push({ icon: '⭐', name: '無敵星星', desc: `五星出現率 ${state.activeBuffs.starMultiplier || 2} 倍`, remain: Math.ceil((state.activeBuffs.starUntil - now) / 60000) });
  
  return items;
});
const buffTooltip = ref(null);
const showBuffTooltip = (item) => { buffTooltip.value = buffTooltip.value?.name === item.name ? null : item; };
const tickerTime = ref(Date.now());

const startSwiping = () => { 
  isSwiping.value = true; 
};
const stopSwiping = () => { isSwiping.value = false; };

const handleSwipe = (slotId) => {
  if (!isSwiping.value) return;
  const slotComp = slotRefs.value[slotId];
  if (slotComp) {
    // 檢查花朵狀態，如果是 ready 或 withered 才收成並發出音效
    const status = slotComp.getSlotStatus?.();
    if (status === 'ready' || status === 'withered') {
      slotComp.triggerHarvest();
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
      }
    }
  });
};

const formatNumber = (num) => new Intl.NumberFormat('en-US').format(num || 0);

const triggerHarvestFeedback = ({ flower, x, y, reward }) => {
  if (!reward?.success) return;

  const id = feedbackIdCounter++;
  harvestFeedbacks.value.push({
    id,
    x,
    y,
    text: `+${formatNumber(reward.diamonds)} 💎`,
    subText: reward.quantity > 1 ? `x${reward.quantity}` : '',
    rare: reward.rarityRank >= 4 || reward.rarity === 'Legendary'
  });
  setTimeout(() => {
    harvestFeedbacks.value = harvestFeedbacks.value.filter(item => item.id !== id);
  }, 950);

  if (reward.rarityRank >= 4 || reward.rarity === 'Legendary') {
    const burstId = feedbackIdCounter++;
    rareBursts.value.push({
      id: burstId,
      x,
      y,
      label: reward.rarity === 'Legendary' ? 'LEGEND!' : `${reward.rarity}★`,
      legendary: reward.rarity === 'Legendary'
    });
    setTimeout(() => {
      rareBursts.value = rareBursts.value.filter(item => item.id !== burstId);
    }, 900);
  }

  if (navigator.vibrate) {
    navigator.vibrate(reward.rarityRank >= 4 ? [18, 25, 18] : 18);
  }
};

const handleHarvestAnimate = ({ slotId, flowerId, imgUrl, startX, startY, reward }) => {
  const flower = FLOWERS.find(f => f.id === flowerId);
  if (!flower) return;

  if (startX && startY) {
    triggerFlyAnimation(flower, startX, startY, imgUrl);
    triggerHarvestFeedback({ flower, x: startX, y: startY, reward });
    return;
  }

  const slotComp = slotRefs.value[slotId];
  if (slotComp && slotComp.$el) {
    const rect = slotComp.$el.getBoundingClientRect();
    const startX = rect.left + rect.width / 2;
    const startY = rect.top + rect.height / 2 - 50; 
    
    triggerFlyAnimation(flower, startX, startY, imgUrl);
    triggerHarvestFeedback({ flower, x: startX, y: startY, reward });
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
    url: imgUrl || getFlowerImagePath(flower.country, flower.id),
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
  backgroundImage: `url('${getSceneBackgroundPath(state.currentCountry, state.currentScene)}')`,
}));

const currentGarden = computed(() => getCurrentGarden());

const petalTotal = computed(() => {
  let s = 0;
  for (const v of Object.values(state.inventory || {})) s += Number(v) || 0;
  return s;
});

const harvestableCount = computed(() =>
  currentGarden.value.filter(s => s.status === 'ready' || s.status === 'withered').length
);

const rainOwned = computed(() =>
  ['rain1', 'rain2', 'rain3', 'rain4', 'rain5'].reduce((n, id) => n + getInventoryItemCount(id), 0)
);
const fertOwned = computed(() =>
  ['fert1', 'fert2', 'fert3', 'fert4', 'fert5'].reduce((n, id) => n + getInventoryItemCount(id), 0)
);

const butterflyOn = computed(() => {
  void tickerTime.value;
  const t = state.activeBuffs?.starUntil;
  return !!(t && Date.now() < t);
});

const gameClock = ref('');
let clockTimer = null;
const tickClock = () => {
  const d = new Date();
  gameClock.value = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const showSettings = ref(false);

const ensureBuffs = () => {
  if (!state.activeBuffs) {
    state.activeBuffs = {
      sunnyDollUntil: null,
      rainUntil: null,
      rainMultiplier: 1,
      fertilizerUntil: null,
      fertilizerMultiplier: 1,
      starUntil: null,
      starMultiplier: 1
    };
  }
};

const applyConsumedItem = (item) => {
  if (!item || item.type === 'travel') return;
  ensureBuffs();
  const now = Date.now();
  if (item.type === 'weather') {
    state.activeBuffs.sunnyDollUntil = now + item.duration * 60 * 60 * 1000;
  } else if (item.type === 'rain') {
    state.activeBuffs.rainUntil = now + item.duration * 60 * 60 * 1000;
    state.activeBuffs.rainMultiplier = item.multi;
  } else if (item.type === 'fertilizer') {
    state.activeBuffs.fertilizerUntil = now + item.duration * 60 * 60 * 1000;
    state.activeBuffs.fertilizerMultiplier = item.multi;
  } else if (item.type === 'star') {
    state.activeBuffs.starUntil = now + item.duration * 60 * 60 * 1000;
    state.activeBuffs.starMultiplier = item.multi;
  }
  trackDailyMissionProgress('usedItems');
};

const tryQuickUse = (itemId, failTab) => {
  const item = getItemDefinition(itemId);
  if (!item || item.type === 'travel') return;
  if (!consumeInventoryItem(itemId, 1)) {
    playSound('error');
    emit('change-tab', failTab);
    return;
  }
  playSound('buy');
  applyConsumedItem(item);
};

const quickUseRain = () => {
  for (const id of ['rain1', 'rain2', 'rain3', 'rain4', 'rain5']) {
    if (getInventoryItemCount(id) > 0) {
      tryQuickUse(id, 'shop');
      return;
    }
  }
  playSound('error');
  emit('change-tab', 'shop');
};

const quickUseFert = () => {
  for (const id of ['fert1', 'fert2', 'fert3', 'fert4', 'fert5']) {
    if (getInventoryItemCount(id) > 0) {
      tryQuickUse(id, 'shop');
      return;
    }
  }
  playSound('error');
  emit('change-tab', 'shop');
};

const quickUseStar = () => {
  for (const id of ['star1', 'star2', 'star3', 'star4', 'star5']) {
    if (getInventoryItemCount(id) > 0) {
      tryQuickUse(id, 'inventory');
      return;
    }
  }
  playSound('button');
  emit('change-tab', 'inventory');
};

const harvestAllReady = () => {
  playSound('button');
  let n = 0;
  currentGarden.value.forEach(slot => {
    if (slot.status === 'ready' || slot.status === 'withered') {
      const comp = slotRefs.value[slot.id];
      comp?.triggerHarvest?.();
      n++;
    }
  });
  if (n === 0) playSound('error');
};

onMounted(() => {
  catchUpSpawning();
  document.addEventListener('visibilitychange', handleVisibilityChange);

  startSpawnTimer();
  tickClock();
  clockTimer = setInterval(tickClock, 1000);
  weatherTimer = setInterval(() => {
    currentWeather.value = getCurrentWeather();
    spawnMultiplier.value = getCurrentSpawnMultiplier();
    tickerTime.value = Date.now();
  }, 5000);

  stormTimer = setInterval(() => {
    if (currentWeather.value?.id === 'storm') spawnStormElement();
  }, 1200);
});

onUnmounted(() => {
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  clearInterval(weatherTimer);
  clearInterval(stormTimer);
  if (clockTimer) clearInterval(clockTimer);
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
    @touchmove.prevent="handleTouchMove"
  >
    <div class="portrait-shell">
      <div class="scene-bg-wrapper">
        <div class="scene-bg-full portrait-bg" :style="bgImageStyle"></div>
      </div>

      <div class="weather-overlay-root" :class="currentWeather.id">
        <div class="rain-layer"></div>
        <div v-if="['storm', 'rainy', 'cloudy'].includes(currentWeather.id)" class="water-drop-filter"></div>
      </div>

      <div class="portrait-ui">
        <header class="portrait-topbar">
          <div class="player-block" :title="`經驗 ${currentLevelInfo.currentLevelExp} / ${currentLevelInfo.expNeeded}`">
            <div class="avatar-circle">🌸</div>
            <div class="lvl-banner">Lv. {{ state.level || 1 }}</div>
          </div>

          <div class="currency-block">
            <div class="currency-row petals-row">
              <span class="cur-icon" aria-hidden="true">🌺</span>
              <span class="cur-val">{{ formatNumber(petalTotal) }}</span>
              <button type="button" class="cur-plus" @click="playSound('button'); emit('change-tab', 'shop')">+</button>
            </div>
            <div class="currency-row gems-row">
              <span class="cur-icon" aria-hidden="true">💎</span>
              <span class="cur-val">{{ formatNumber(state.diamonds) }}</span>
              <button type="button" class="cur-plus" @click="playSound('button'); emit('change-tab', 'shop')">+</button>
            </div>
          </div>

          <div class="gear-wrap">
            <button type="button" class="gear-btn" @click="showSettings = !showSettings">⚙️</button>
            <div v-if="showSettings" class="settings-dropdown">
              <button type="button" @click="showSettings = false; emit('change-tab', 'inventory')">🎒 道具箱</button>
              <button type="button" @click="showSettings = false; emit('change-tab', 'map')">🗺️ 世界地圖</button>
              <button type="button" class="muted" @click="showSettings = false">關閉</button>
            </div>
          </div>
        </header>

        <div class="sign-and-ency">
          <div class="wood-sign">
            <span class="weather-emoji">{{ getWeatherIcon(currentWeather.id) }}</span>
            <span class="sign-weather">{{ currentWeather.name }}</span>
            <span class="sign-time">{{ gameClock }}</span>
            <span class="sign-eff">{{ Math.round(spawnMultiplier * 100) }}%</span>
          </div>
          <button
            type="button"
            class="ency-fab"
            @touchmove.stop.prevent
            @mousedown.stop
            @click="playSound('button'); emit('change-tab', 'catalog')"
          >
            <span class="fab-ico">📖</span>
            <span class="fab-lbl">圖鑑</span>
          </button>
        </div>

        <div v-if="activeBuffsDisplay.length" class="buff-strip">
          <div
            v-for="buff in activeBuffsDisplay"
            :key="buff.name"
            class="buff-chip"
            @click.stop="showBuffTooltip(buff)"
          >
            <span>{{ buff.icon }}</span>
            <small>{{ buff.remain }}m</small>
          </div>
          <Transition name="fade">
            <div v-if="buffTooltip" class="buff-tooltip-portrait" @click="buffTooltip = null">
              <strong>{{ buffTooltip.icon }} {{ buffTooltip.name }}</strong>
              <span>{{ buffTooltip.desc }}</span>
              <span>剩餘 {{ buffTooltip.remain }} 分鐘</span>
            </div>
          </Transition>
        </div>

        <aside class="left-rail" @touchmove.stop.prevent @mousedown.stop>
          <button type="button" class="rail-item" @click="playSound('button'); emit('change-tab', 'dailyMission')">
            <span v-if="taskBadgeCount > 0" class="rail-badge">{{ taskBadgeCount }}</span>
            <span class="rail-ico">📋</span>
            <span class="rail-txt">任務</span>
          </button>
          <button type="button" class="rail-item rail-tool" @click="quickUseRain">
            <span class="rail-ico">🚿</span>
            <span class="rail-txt">澆水壺</span>
            <span class="rail-sub">×{{ rainOwned }}</span>
          </button>
          <button type="button" class="rail-item rail-tool" @click="quickUseFert">
            <span class="rail-ico">🧪</span>
            <span class="rail-txt">花肥</span>
            <span class="rail-sub">×{{ fertOwned }}</span>
          </button>
          <button type="button" class="rail-item rail-tool" @click="quickUseStar">
            <span class="rail-ico">🦋</span>
            <span class="rail-txt">蝴蝶燈</span>
            <span class="rail-sub" :class="{ on: butterflyOn }">{{ butterflyOn ? 'ON' : '—' }}</span>
          </button>
        </aside>

        <div class="scene-overlay-ui">
          <nav class="landmark-strip" @touchmove.stop.prevent @mousedown.stop>
            <template v-for="(name, index) in currentSceneNames" :key="index">
              <button
                v-if="isSceneUnlocked(state.currentCountry, index + 1)"
                type="button"
                :class="{ active: state.currentScene === (index + 1) }"
                class="landmark-chip"
                @click="playSound('button'); setScene(index + 1)"
              >
                {{ name }}
              </button>
              <button v-else type="button" class="landmark-chip locked" disabled>
                🔒 {{ name }}
                <span class="unlock-p">({{ getSceneUnlockProgress(state.currentCountry, index + 1) }}%)</span>
              </button>
            </template>
          </nav>

          <div class="garden-stage">
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
        </div>

        <button
          type="button"
          class="harvest-cta"
          ref="basketRef"
          @touchmove.stop.prevent
          @mousedown.stop
          @click="harvestAllReady"
        >
          <img ref="basketImgRef" src="/flowerbasket.png" alt="" class="basket-preload" @load="processBasketImage" />
          <canvas ref="basketCanvasRef" class="basket-preload"></canvas>
          <span class="harvest-basket-visual">
            <img v-if="processedBasketSrc" :src="processedBasketSrc" class="harvest-basket-img" alt="" />
            <span v-else class="harvest-basket-emoji">🧺</span>
          </span>
          <span class="harvest-label">採收</span>
          <span v-if="harvestableCount > 0" class="harvest-count-badge">{{ harvestableCount }}</span>
        </button>

        <nav class="bottom-dock" @touchmove.stop.prevent @mousedown.stop>
          <button type="button" class="dock-btn" @click="playSound('button'); emit('change-tab', 'catalog')">
            <span class="dock-ico">📖</span>
            <span class="dock-lbl">圖鑑</span>
          </button>
          <button type="button" class="dock-btn" @click="playSound('button'); emit('change-tab', 'shop')">
            <span class="dock-ico">🏪</span>
            <span class="dock-lbl">商店</span>
          </button>
          <button type="button" class="dock-btn" @click="playSound('button'); emit('change-tab', 'map')">
            <span class="dock-ico">🪴</span>
            <span class="dock-lbl">花園佈置</span>
          </button>
          <button type="button" class="dock-btn" @click="playSound('button'); emit('change-tab', 'activityHub')">
            <span v-if="activityBadgeCount > 0" class="dock-badge">{{ activityBadgeCount }}</span>
            <span class="dock-ico">🎁</span>
            <span class="dock-lbl">活動</span>
          </button>
        </nav>
      </div>
    </div>

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
        <img :src="flower.url" class="flying-flower-y" alt="" />
      </div>
    </div>

    <div class="feedback-layer">
      <div
        v-for="feedback in harvestFeedbacks"
        :key="feedback.id"
        class="harvest-feedback"
        :class="{ rare: feedback.rare }"
        :style="{ left: `${feedback.x}px`, top: `${feedback.y}px` }"
      >
        <span>{{ feedback.text }}</span>
        <small v-if="feedback.subText">{{ feedback.subText }}</small>
      </div>
      <div
        v-for="burst in rareBursts"
        :key="burst.id"
        class="rare-burst"
        :class="{ legendary: burst.legendary }"
        :style="{ left: `${burst.x}px`, top: `${burst.y}px` }"
      >
        <span>{{ burst.label }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.garden-scene {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: stretch;
  background: #1e272e;
}

.portrait-shell {
  position: relative;
  width: 100%;
  max-width: 440px;
  height: 100%;
  max-height: 100dvh;
  overflow: hidden;
  box-shadow: 0 0 0 1px rgba(255,255,255,0.06), 0 0 48px rgba(0,0,0,0.45);
}

.scene-bg-wrapper {
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  background: linear-gradient(180deg, #87ceeb 0%, #b8e994 55%, #78e08f 100%);
}

.scene-bg-full {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.portrait-bg {
  background-size: cover;
  background-position: center bottom;
  background-repeat: no-repeat;
  animation: none;
}

.weather-overlay-root {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
  transition: background 2s ease;
  overflow: hidden;
}
.weather-overlay-root.storm {
  background: rgba(10, 15, 30, 0.55);
  animation: lightning 5s infinite;
}
.weather-overlay-root.cloudy { background: rgba(50, 55, 65, 0.3); }
.weather-overlay-root.rainy { background: rgba(30, 45, 60, 0.22); }
.weather-overlay-root.sunny { background: rgba(255, 230, 150, 0.08); }

.rain-layer {
  position: absolute;
  inset: -20% -10%;
  background-image: linear-gradient(165deg, transparent 45%, rgba(255,255,255,0.35) 46%, transparent 47%);
  background-size: 20px 80px;
  animation: rainFall 0.4s linear infinite;
  opacity: 0;
}
.storm .rain-layer { display: none; }
.rainy .rain-layer { display: none; }

@keyframes rainFall {
  0% { background-position: 0 0; }
  100% { background-position: -40px 100vh; }
}
@keyframes lightning {
  0%, 90% { background-color: rgba(10, 15, 30, 0.55); }
  92% { background-color: rgba(255, 255, 255, 0.15); }
  94% { background-color: rgba(10, 15, 30, 0.55); }
  96% { background-color: rgba(255, 255, 255, 0.3); }
  100% { background-color: rgba(10, 15, 30, 0.55); }
}

.water-drop-filter {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 10;
  background-image:
    radial-gradient(4px 5px at 15% 25%, rgba(255,255,255,0.65) 0%, transparent 80%),
    radial-gradient(5px 6px at 85% 15%, rgba(255,255,255,0.45) 0%, transparent 80%),
    radial-gradient(3px 4px at 45% 65%, rgba(255,255,255,0.55) 0%, transparent 80%);
  background-size: 150px 150px;
  backdrop-filter: blur(1.2px) contrast(1.08);
  animation: dropSlide 5s linear infinite;
}
.rainy .water-drop-filter {
  opacity: 0.5;
  backdrop-filter: blur(0.45px) contrast(1.04);
  animation-duration: 10s;
}
.cloudy .water-drop-filter {
  background-image: none;
  backdrop-filter: blur(1px) contrast(1);
  background-color: rgba(255, 255, 255, 0.05);
}
@keyframes dropSlide {
  0% { background-position: 0 0; }
  100% { background-position: 0 150px; }
}

.portrait-ui {
  position: relative;
  z-index: 10;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: max(8px, env(safe-area-inset-top)) max(10px, env(safe-area-inset-right)) max(10px, env(safe-area-inset-bottom)) max(10px, env(safe-area-inset-left));
  pointer-events: none;
}
.portrait-ui > * {
  pointer-events: auto;
}

.portrait-topbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  z-index: 50;
}

.player-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.avatar-circle {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: linear-gradient(145deg, #ffeaa7, #fab1a0);
  border: 3px solid #4a3728;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.35rem;
  box-shadow: 0 3px 0 #4a3728, inset 0 2px 0 rgba(255,255,255,0.5);
}
.lvl-banner {
  font-size: 0.65rem;
  font-weight: 900;
  color: #fff;
  background: #4a3728;
  padding: 2px 10px;
  border-radius: 8px;
  border: 2px solid #2d1f14;
  box-shadow: 0 2px 0 #2d1f14;
}

.currency-block {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 5px;
  max-width: 200px;
}
.currency-row {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(74, 55, 40, 0.92);
  border: 2px solid #2d1f14;
  border-radius: 999px;
  padding: 4px 8px 4px 10px;
  box-shadow: 0 3px 0 #2d1f14;
}
.petals-row {
  background: linear-gradient(90deg, rgba(253, 121, 168, 0.35), rgba(74, 55, 40, 0.92));
}
.gems-row {
  background: linear-gradient(90deg, rgba(162, 155, 254, 0.35), rgba(74, 55, 40, 0.92));
}
.cur-icon { font-size: 1rem; }
.cur-val {
  flex: 1;
  font-size: 0.78rem;
  font-weight: 900;
  color: #fff;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cur-plus {
  width: 22px;
  height: 22px;
  border-radius: 8px;
  border: 2px solid #2d1f14;
  background: linear-gradient(180deg, #ffeaa7, #fdcb6e);
  font-weight: 900;
  font-size: 0.85rem;
  line-height: 1;
  color: #2d1f14;
  cursor: pointer;
  flex-shrink: 0;
  touch-action: manipulation;
}
.cur-plus:active { transform: translateY(1px); }

.gear-wrap {
  position: relative;
}
.gear-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 3px solid #4a3728;
  background: linear-gradient(180deg, #dfe6e9, #b2bec3);
  font-size: 1.1rem;
  cursor: pointer;
  box-shadow: 0 3px 0 #2d1f14;
  touch-action: manipulation;
}
.gear-btn:active { transform: translateY(2px); box-shadow: 0 1px 0 #2d1f14; }

.settings-dropdown {
  position: absolute;
  top: 46px;
  right: 0;
  min-width: 160px;
  background: rgba(45, 52, 54, 0.98);
  border: 2px solid #ffeaa7;
  border-radius: 12px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  z-index: 200;
  box-shadow: 0 8px 24px rgba(0,0,0,0.4);
}
.settings-dropdown button {
  border: none;
  border-radius: 8px;
  padding: 8px 10px;
  font-weight: 800;
  font-size: 0.8rem;
  cursor: pointer;
  background: #636e72;
  color: #fff;
  touch-action: manipulation;
}
.settings-dropdown button.muted {
  background: #2d3436;
  color: #b2bec3;
}

.sign-and-ency {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-top: 4px;
  position: relative;
  z-index: 40;
}

.wood-sign {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 6px 10px;
  padding: 8px 14px;
  background: linear-gradient(180deg, #d4a574, #a67c52);
  border: 3px solid #4a3728;
  border-radius: 10px;
  box-shadow: 0 4px 0 #3d2b1f, inset 0 1px 0 rgba(255,255,255,0.35);
  max-width: 62%;
}
.weather-emoji { font-size: 1.1rem; }
.sign-weather {
  font-weight: 900;
  font-size: 0.82rem;
  color: #2d1f14;
}
.sign-time {
  font-weight: 900;
  font-size: 0.85rem;
  color: #fff;
  text-shadow: 0 1px 2px rgba(0,0,0,0.4);
  background: rgba(45, 31, 20, 0.35);
  padding: 2px 8px;
  border-radius: 6px;
}
.sign-eff {
  font-size: 0.65rem;
  font-weight: 800;
  color: #2d1f14;
  opacity: 0.85;
}

.ency-fab {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: 3px solid #4a3728;
  background: linear-gradient(180deg, #ffeaa7, #fdcb6e);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0;
  cursor: pointer;
  box-shadow: 0 4px 0 #3d2b1f;
  touch-action: manipulation;
}
.ency-fab:active { transform: translateY(calc(-50% + 2px)); }
.fab-ico { font-size: 1.2rem; line-height: 1; }
.fab-lbl {
  font-size: 0.55rem;
  font-weight: 900;
  color: #2d1f14;
  line-height: 1;
}

.buff-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
  padding-left: 72px;
  padding-right: 58px;
  position: relative;
  z-index: 35;
  min-height: 0;
}
.buff-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: rgba(0,0,0,0.65);
  border: 2px solid rgba(255,234,167,0.4);
  border-radius: 999px;
  padding: 3px 8px;
  font-size: 0.75rem;
  cursor: pointer;
  color: #fff;
  touch-action: manipulation;
}
.buff-chip small { color: #ffeaa7; font-weight: 800; font-size: 0.6rem; }
.buff-tooltip-portrait {
  position: absolute;
  left: 72px;
  top: 100%;
  margin-top: 4px;
  background: rgba(0,0,0,0.92);
  border: 2px solid #ffeaa7;
  border-radius: 10px;
  padding: 8px 12px;
  color: #fff;
  font-size: 0.78rem;
  display: flex;
  flex-direction: column;
  gap: 4px;
  z-index: 100;
  max-width: 220px;
}
.buff-tooltip-portrait strong { color: #ffeaa7; }

.left-rail {
  position: absolute;
  left: max(4px, env(safe-area-inset-left));
  top: 22%;
  bottom: 28%;
  width: 64px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 45;
  pointer-events: auto;
}
.rail-item {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 4px;
  border-radius: 14px;
  border: 3px solid #4a3728;
  background: linear-gradient(180deg, #fff8e7, #f0d9b5);
  box-shadow: 0 4px 0 #3d2b1f;
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}
.rail-item:active { transform: translateY(2px); box-shadow: 0 2px 0 #3d2b1f; }
.rail-ico { font-size: 1.25rem; line-height: 1; }
.rail-txt {
  font-size: 0.58rem;
  font-weight: 900;
  color: #2d1f14;
  line-height: 1.1;
  text-align: center;
}
.rail-sub {
  font-size: 0.55rem;
  font-weight: 800;
  color: #636e72;
}
.rail-sub.on {
  color: #00b894;
  font-weight: 900;
}
.rail-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  border-radius: 50%;
  background: #ff4757;
  color: #fff;
  font-size: 0.6rem;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #fff;
  box-shadow: 0 2px 8px rgba(255,71,87,0.6);
}

.scene-overlay-ui {
  flex: 1;
  position: relative;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 68px 0 72px;
  z-index: 20;
}

.landmark-strip {
  display: flex;
  flex-wrap: nowrap;
  gap: 6px;
  overflow-x: auto;
  overflow-y: hidden;
  max-width: 100%;
  padding: 6px 2px 8px;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  touch-action: manipulation;
}
.landmark-strip::-webkit-scrollbar { display: none; }

.landmark-chip {
  flex: 0 0 auto;
  padding: 6px 12px;
  border-radius: 999px;
  border: 2px solid #4a3728;
  background: rgba(255,255,255,0.95);
  font-size: 0.62rem;
  font-weight: 900;
  color: #2d1f14;
  box-shadow: 0 3px 0 #3d2b1f;
  cursor: pointer;
  white-space: nowrap;
  touch-action: manipulation;
}
.landmark-chip.active {
  background: linear-gradient(180deg, #ffeaa7, #fdcb6e);
}
.landmark-chip.locked {
  background: #636e72;
  color: #dfe6e9;
  cursor: not-allowed;
  opacity: 0.85;
}
.unlock-p { font-size: 0.55rem; color: #ffeaa7; margin-left: 2px; }

.garden-stage {
  position: relative;
  flex: 1;
  width: 100%;
  min-height: 140px;
  max-height: 42vh;
  margin-top: 4px;
}
.cloud-fixed-base {
  position: absolute;
  inset: 8% 4%;
  background-image: url('/cloud.png');
  background-size: auto 100%;
  background-position: center;
  background-repeat: repeat-x;
  border-radius: 120px;
  overflow: hidden;
  opacity: 0.72;
  filter: drop-shadow(0 0 12px rgba(255,255,255,0.45)) blur(0.5px);
  z-index: 1;
}
.flowers-fixed-grid {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 92%;
  height: 88%;
  z-index: 10;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: repeat(4, 1fr);
  gap: 4px 3px;
  align-items: center;
  justify-items: center;
}

.harvest-cta {
  position: relative;
  align-self: center;
  margin-top: 6px;
  margin-bottom: 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 6px 28px 10px;
  border: none;
  background: transparent;
  cursor: pointer;
  z-index: 50;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}
.basket-preload {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
  overflow: hidden;
}
.harvest-basket-visual {
  width: 72px;
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  filter: drop-shadow(0 4px 6px rgba(0,0,0,0.35));
}
.harvest-basket-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.harvest-basket-emoji { font-size: 3.2rem; line-height: 1; }
.harvest-label {
  margin-top: -6px;
  padding: 4px 22px;
  background: #4a3728;
  color: #fff;
  font-size: 0.9rem;
  font-weight: 900;
  border-radius: 999px;
  border: 3px solid #fff1d6;
  box-shadow: 0 4px 0 #2d1f14;
}
.harvest-count-badge {
  position: absolute;
  top: 4px;
  right: 12px;
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  border-radius: 50%;
  background: #ff4757;
  color: #fff;
  font-size: 0.72rem;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #fff;
  box-shadow: 0 2px 8px rgba(255,71,87,0.55);
}

.harvest-cta.shake .harvest-basket-visual {
  animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
}
@keyframes shake {
  10%, 90% { transform: translate3d(-1px, 0, 0); }
  20%, 80% { transform: translate3d(2px, 0, 0); }
  30%, 50%, 70% { transform: translate3d(-3px, 0, 0); }
  40%, 60% { transform: translate3d(3px, 0, 0); }
}

.bottom-dock {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 8px;
  padding: 8px 4px 4px;
  z-index: 60;
}
.dock-btn {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 4px 8px;
  border-radius: 50%;
  aspect-ratio: 1;
  max-width: 76px;
  margin: 0 auto;
  border: 3px solid #4a3728;
  background: linear-gradient(180deg, #e8c9a0, #c49a6c);
  box-shadow: 0 5px 0 #3d2b1f, inset 0 2px 0 rgba(255,255,255,0.35);
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}
.dock-btn:active {
  transform: translateY(3px);
  box-shadow: 0 2px 0 #3d2b1f, inset 0 2px 0 rgba(255,255,255,0.25);
}
.dock-ico { font-size: 1.35rem; line-height: 1; }
.dock-lbl {
  font-size: 0.58rem;
  font-weight: 900;
  color: #2d1f14;
  line-height: 1.1;
  text-align: center;
}
.dock-badge {
  position: absolute;
  top: 2px;
  right: 6px;
  min-width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #ff4757;
  color: #fff;
  font-size: 0.55rem;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #fff;
  z-index: 2;
}

.flying-layer {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 5000;
  overflow: hidden;
}
.feedback-layer {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 6500;
  overflow: hidden;
}

.flying-flower-x {
  position: absolute;
  top: 0;
  left: 0;
  animation: flyX 0.6s linear forwards;
}
.flying-flower-y {
  width: 40px;
  height: 40px;
  object-fit: contain;
  animation: flyY 0.6s ease-in forwards;
}
@keyframes flyX {
  0% { transform: translateX(var(--startX)); }
  100% { transform: translateX(var(--endX)); }
}
@keyframes flyY {
  0% { transform: translateY(var(--startY)) scale(1); opacity: 1; }
  35% { transform: translateY(calc(var(--startY) - 80px)) scale(1.25); opacity: 1; }
  80% { transform: translateY(calc(var(--endY) - 16px)) scale(0.55); opacity: 1; }
  100% { transform: translateY(var(--endY)) scale(0); opacity: 0; }
}

.harvest-feedback {
  position: absolute;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  border-radius: 999px;
  border: 2px solid rgba(45, 52, 54, 0.9);
  background: linear-gradient(180deg, rgba(255,255,255,0.96), rgba(255,234,167,0.92));
  color: #2d3436;
  font-size: 0.85rem;
  font-weight: 900;
  white-space: nowrap;
  box-shadow: 0 4px 0 rgba(45,52,54,0.85), 0 0 16px rgba(255,234,167,0.55);
  animation: harvestFloat 0.95s ease-out forwards;
}
.harvest-feedback small {
  color: #e67e22;
  font-size: 0.68rem;
}
.harvest-feedback.rare {
  background: linear-gradient(180deg, #fff8c9, #fd79a8);
  box-shadow: 0 4px 0 rgba(45,52,54,0.85), 0 0 24px rgba(253,121,168,0.75);
}
@keyframes harvestFloat {
  0% { opacity: 0; transform: translate(-50%, -20%) scale(0.75); }
  18% { opacity: 1; transform: translate(-50%, -70%) scale(1.1); }
  100% { opacity: 0; transform: translate(-50%, -140%) scale(0.9); }
}

.rare-burst {
  position: absolute;
  width: 72px;
  height: 72px;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 0.75rem;
  font-weight: 900;
  text-shadow: 0 2px 4px rgba(0,0,0,0.55);
  background:
    radial-gradient(circle, rgba(255,255,255,0.95) 0 10%, rgba(255,234,167,0.55) 11% 34%, transparent 35%),
    conic-gradient(from 0deg, transparent, rgba(255,234,167,0.85), transparent, rgba(253,121,168,0.75), transparent);
  animation: rareBurst 0.9s ease-out forwards;
}
.rare-burst.legendary {
  background:
    radial-gradient(circle, rgba(255,255,255,0.95) 0 10%, rgba(255,255,255,0.6) 11% 30%, transparent 31%),
    conic-gradient(from 0deg, #ff00de, #00d4ff, #55efc4, #ffeaa7, #ff00de);
}
@keyframes rareBurst {
  0% { opacity: 0; transform: translate(-50%, -50%) scale(0.2) rotate(0deg); filter: blur(2px); }
  25% { opacity: 1; transform: translate(-50%, -50%) scale(1.05) rotate(80deg); filter: blur(0); }
  100% { opacity: 0; transform: translate(-50%, -50%) scale(1.5) rotate(220deg); filter: blur(2px); }
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

@media (min-width: 520px) {
  .portrait-shell {
    margin-top: env(safe-area-inset-top);
    margin-bottom: env(safe-area-inset-bottom);
    border-radius: 16px;
    max-height: calc(100dvh - 24px);
  }
}

</style>
