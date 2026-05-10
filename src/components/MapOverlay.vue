<script setup>
import { computed, onUnmounted, ref } from 'vue';
import { consumeInventoryItem, getInventoryItemCount, MAP_HOTSPOT_DEFAULTS, state, trackDailyMissionProgress, updateMapHotspotPosition } from '../store/gameState';

const emit = defineEmits(['back', 'select-country']);

const selectedCountry = ref(null);
const selectedMap = ref('asia');
const mapContainerRef = ref(null);
const editHotspotMode = ref(false);
const draggingCountryId = ref(null);
const dragMoved = ref(false);

const formatNumber = (num) => new Intl.NumberFormat('en-US').format(num);
const isDevMode = computed(() => !!state.isDevMode);

const maps = [
  { id: 'asia', name: 'Asia', image: '/maps/Asia.png', playable: true },
  { id: 'europe', name: 'Europe', image: '/maps/Europe.png', playable: false },
  { id: 'north-america', name: 'North America', image: '/maps/North America.png', playable: false },
  { id: 'south-america', name: 'South America', image: '/maps/South America.png', playable: false },
  { id: 'one-piece', name: 'One Piece', image: '/maps/One Piece.png', playable: false }
];

const countryMeta = [
  { id: 'Flower', name: '花靈之境', flag: '🌸' },
  { id: 'Taiwan', name: '台灣', flag: '🇹🇼' },
  { id: 'Japan', name: '日本', flag: '🇯🇵' },
  { id: 'Korea', name: '韓國', flag: '🇰🇷' },
  { id: 'Thailand', name: '泰國', flag: '🇹🇭' },
  { id: 'Singapore', name: '新加坡', flag: '🇸🇬' }
];
const countries = computed(() => countryMeta.map((country) => {
  const defaultPos = MAP_HOTSPOT_DEFAULTS[country.id] || { x: 50, y: 50 };
  const currentPos = state.mapHotspots?.[country.id] || defaultPos;
  return {
    ...country,
    x: currentPos.x,
    y: currentPos.y
  };
}));

const currentMapMeta = computed(() => maps.find(map => map.id === selectedMap.value) || maps[0]);
const isCurrentMapPlayable = computed(() => currentMapMeta.value.playable);
const visibleCountries = computed(() => (isCurrentMapPlayable.value ? countries.value : []));

const mapBackgroundStyle = computed(() => ({
  backgroundImage: `url('${currentMapMeta.value.image}')`
}));

const switchMap = (mapId) => {
  selectedMap.value = mapId;
  selectedCountry.value = null;
  stopDragging();
};

const handleSelect = (countryId) => {
  if (state.unlockedCountries.includes(countryId)) {
    if (state.currentCountry !== countryId) {
      state.currentCountry = countryId;
      state.currentScene = 1;
      trackDailyMissionProgress('travels');
    }
    emit('select-country', countryId);
  } else {
    const cost = state.visitedCount * 1000000;
    if (getInventoryItemCount('travelTicket') > 0) {
      if (confirm(`使用 1 張出國機票解鎖 ${countries.value.find(c => c.id === countryId)?.name || '此國家'} 嗎？`)) {
        consumeInventoryItem('travelTicket');
        state.unlockedCountries.push(countryId);
        state.visitedCount += 1;
        state.currentCountry = countryId;
        state.currentScene = 1;
        trackDailyMissionProgress('travels');
        alert("機票使用成功！準備降落！🛫");
        emit('select-country', countryId);
      }
      return;
    }

    if (confirm(`解鎖此國家需要 ${formatNumber(cost)} 鑽石作為機票費用。\n您確定要前往嗎？`)) {
      if (state.diamonds >= cost) {
        state.diamonds -= cost;
        state.unlockedCountries.push(countryId);
        state.visitedCount += 1;
        state.currentCountry = countryId;
        state.currentScene = 1;
        trackDailyMissionProgress('travels');
        alert("解鎖成功！準備降落！🛫");
        emit('select-country', countryId);
      } else {
        alert("鑽石不足，無法購買機票！");
      }
    }
  }
};

const getCountryById = (countryId) => countries.value.find(c => c.id === countryId);

const handleHotspotClick = (countryId) => {
  if (dragMoved.value) {
    dragMoved.value = false;
    return;
  }
  selectedCountry.value = selectedCountry.value === countryId ? null : countryId;
};

const updatePositionFromEvent = (event) => {
  if (!draggingCountryId.value || !mapContainerRef.value) return;
  const rect = mapContainerRef.value.getBoundingClientRect();
  if (!rect.width || !rect.height) return;

  const rawX = ((event.clientX - rect.left) / rect.width) * 100;
  const rawY = ((event.clientY - rect.top) / rect.height) * 100;
  const clampedX = Math.min(100, Math.max(0, rawX));
  const clampedY = Math.min(100, Math.max(0, rawY));
  updateMapHotspotPosition(draggingCountryId.value, clampedX, clampedY);
  dragMoved.value = true;
};

const handleHotspotPointerDown = (countryId, event) => {
  if (!isDevMode.value || !editHotspotMode.value || !isCurrentMapPlayable.value) return;
  event.preventDefault();
  draggingCountryId.value = countryId;
  selectedCountry.value = countryId;
  dragMoved.value = false;
  window.addEventListener('pointermove', updatePositionFromEvent);
  window.addEventListener('pointerup', stopDragging);
  window.addEventListener('pointercancel', stopDragging);
};

function stopDragging() {
  draggingCountryId.value = null;
  window.removeEventListener('pointermove', updatePositionFromEvent);
  window.removeEventListener('pointerup', stopDragging);
  window.removeEventListener('pointercancel', stopDragging);
}

onUnmounted(() => {
  stopDragging();
});
</script>

<template>
  <div class="map-overlay">
    <button @click="emit('back')" class="close-btn">🔙 返回花園</button>
    <div class="top-info">
      <div class="map-title">🌍 選擇地圖與國家</div>
      <div class="resource-row">
        <div class="diamond-display">💎 您的鑽石: <span class="diamond-val">{{ formatNumber(state.diamonds) }}</span></div>
        <div class="ticket-display">✈️ 出國機票: <span class="ticket-val">{{ getInventoryItemCount('travelTicket') }}</span></div>
      </div>
    </div>

    <div class="map-tabs">
      <button
        v-for="map in maps"
        :key="map.id"
        class="map-tab-btn"
        :class="{ active: selectedMap === map.id }"
        @click="switchMap(map.id)"
      >
        {{ map.name }}
        <span v-if="!map.playable" class="tab-soon">國家生成中</span>
      </button>
    </div>

    <div ref="mapContainerRef" class="map-container" :class="{ 'edit-mode': editHotspotMode && isDevMode }">
      <div v-if="isDevMode" class="dev-toolbar">
        <button class="dev-toggle-btn" :class="{ active: editHotspotMode }" @click="editHotspotMode = !editHotspotMode">
          {{ editHotspotMode ? '✅ 亮點調整中' : '🛠️ 調整亮點位置' }}
        </button>
        <div class="dev-hint">
          {{ editHotspotMode ? '拖曳地圖上的亮點即可更新座標（會自動儲存）。' : '開啟後可拖曳已生成國家亮點。' }}
        </div>
        <div v-if="selectedCountry && getCountryById(selectedCountry)" class="dev-coord">
          {{ getCountryById(selectedCountry).name }}：X {{ getCountryById(selectedCountry).x.toFixed(1) }} / Y {{ getCountryById(selectedCountry).y.toFixed(1) }}
        </div>
      </div>

      <!-- 地圖背景 -->
      <div class="world-map-bg" :style="mapBackgroundStyle"></div>
      
      <!-- 國家節點 -->
      <div 
        v-for="country in visibleCountries" 
        :key="country.id"
        class="country-node"
        :class="{ 
          active: state.currentCountry === country.id,
          locked: !state.unlockedCountries.includes(country.id)
        }"
        :style="{ top: `${country.y}%`, left: `${country.x}%` }"
      >
        <div
          class="hotspot"
          @click.stop="handleHotspotClick(country.id)"
          @pointerdown="handleHotspotPointerDown(country.id, $event)"
        ></div>
      </div>

      <!-- 固定在左上角的提示框 -->
      <Transition name="fade-label">
        <div v-if="selectedCountry && isCurrentMapPlayable" class="country-label-fixed">
          <template v-for="country in countries" :key="country.id">
            <template v-if="country.id === selectedCountry">
              <div class="name">{{ country.flag }} {{ country.name }}</div>
              <div v-if="state.unlockedCountries.includes(country.id)" class="status unlocked">✅ 已解鎖</div>
              <div v-else-if="getInventoryItemCount('travelTicket') > 0" class="status ticket">✈️ 可使用出國機票</div>
              <div v-else class="status locked">🔒 需 {{ formatNumber(state.visitedCount * 1000000) }} 鑽石</div>
              <button class="action-btn" @click.stop="handleSelect(country.id)">
                {{ state.unlockedCountries.includes(country.id) ? '🛫 立即前往' : getInventoryItemCount('travelTicket') > 0 ? '✈️ 使用機票' : '💰 購買機票' }}
              </button>
            </template>
          </template>
        </div>
      </Transition>

      <div v-if="!isCurrentMapPlayable" class="map-coming-soon">
        <h3>🛠️ {{ currentMapMeta.name }} 國家生成中</h3>
        <p>此區域地圖已上線，國家與花朵內容將於後續版本陸續開放。</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* --- 找到這段並替換 --- */
.map-overlay {
  position: fixed; /* 從 absolute 改為 fixed */
  inset: 0; 
  background: radial-gradient(circle at center, #2c3e50, #1a252f); 
  z-index: 8000;
  display: flex; flex-direction: column; align-items: center; justify-content: flex-start; padding: 8px 20px 16px;
}
.close-btn {
  position: absolute; top: 10px; left: 20px; background: #e74c3c; color: white;
  border: 3px solid #c0392b; padding: 10px 20px; border-radius: 20px; font-weight: 900;
  box-shadow: 0 4px 0 #c0392b; cursor: pointer; z-index: 10; font-size: 1.1rem;
}
.close-btn:active { transform: translateY(2px); box-shadow: 0 2px 0 #c0392b; }

.top-info {
  width: min(1200px, 95vw);
  margin-top: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  z-index: 20;
}
.resource-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.map-title { font-size: 1.4rem; font-weight: 900; color: white; text-shadow: 0 3px 0 rgba(0,0,0,0.5); }
.diamond-display { background: rgba(0,0,0,0.6); padding: 5px 12px; border-radius: 12px; border: 2px solid rgba(255,255,255,0.2); font-weight: bold; color: white; font-size: 0.9rem; }
.diamond-val { color: #feca57; font-size: 1rem; }
.ticket-display { background: rgba(255,255,255,0.12); padding: 5px 12px; border-radius: 12px; border: 2px solid rgba(254, 202, 87, 0.45); font-weight: bold; color: white; font-size: 0.9rem; }
.ticket-val { color: #ffeaa7; font-size: 1rem; }

.map-tabs {
  width: min(1200px, 95vw);
  display: flex; gap: 8px; z-index: 30; flex-wrap: wrap; justify-content: center;
  margin-top: 4px;
}
.map-tab-btn {
  border: 2px solid rgba(255,255,255,0.35); border-radius: 999px;
  background: rgba(0,0,0,0.55); color: #ecf0f1; padding: 6px 12px;
  font-size: 0.75rem; font-weight: 900; cursor: pointer;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.map-tab-btn.active {
  color: #2d3436; background: linear-gradient(to bottom, #ffeaa7, #fdcb6e);
  border-color: #f1c40f;
}
.tab-soon {
  font-size: 0.64rem;
  color: #ffeaa7;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 999px;
  padding: 1px 6px;
}

.map-container {
  width: 95vw; max-width: 1200px; aspect-ratio: 2 / 1; position: relative; margin-top: 8px;
  background: #0f1c29; border-radius: 30px; overflow: hidden; border: 4px solid rgba(255,255,255,0.1);
  box-shadow: 0 20px 50px rgba(0,0,0,0.8), inset 0 0 100px rgba(0,0,0,0.5);
}
.map-container.edit-mode {
  border-color: rgba(241, 196, 15, 0.9);
  box-shadow: 0 20px 50px rgba(0,0,0,0.8), 0 0 0 3px rgba(241, 196, 15, 0.35), inset 0 0 100px rgba(0,0,0,0.5);
}

.dev-toolbar {
  position: absolute;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  width: min(95%, 900px);
  background: rgba(0, 0, 0, 0.45);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  padding: 8px 10px;
  color: #dfe6e9;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 10px;
  z-index: 60;
}
.dev-toggle-btn {
  border: 2px solid rgba(255, 255, 255, 0.3);
  background: rgba(40, 44, 52, 0.85);
  color: #f1f2f6;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 0.78rem;
  font-weight: 900;
  cursor: pointer;
}
.dev-toggle-btn.active {
  border-color: #f1c40f;
  color: #2d3436;
  background: linear-gradient(to bottom, #ffeaa7, #fdcb6e);
}
.dev-hint {
  font-size: 0.72rem;
  opacity: 0.95;
}
.dev-coord {
  font-size: 0.72rem;
  color: #ffeaa7;
  font-weight: 800;
}

.world-map-bg { 
  position: absolute; inset: 0; pointer-events: none; 
  background-image: url('/maps/Asia.png');
  background-size: 100% 100%;
  background-position: center;
  background-repeat: no-repeat;
  opacity: 0.85;
}

.country-node {
  position: absolute; transform: translate(-50%, -50%); cursor: pointer; z-index: 5;
}
.edit-mode .country-node {
  cursor: grab;
}

.hotspot {
  touch-action: none;
  width: 20px; height: 20px; background: #f1c40f; border-radius: 50%;
  border: 3px solid white; box-shadow: 0 0 15px #f1c40f, 0 0 30px #f1c40f;
  animation: pulse 1.5s infinite alternate; transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.country-node.locked .hotspot { background: #7f8c8d; box-shadow: 0 0 10px #7f8c8d; border-color: #bdc3c7; animation: none; }
.country-node:hover .hotspot { transform: scale(1.5); }
.country-node.active .hotspot { background: #e74c3c; box-shadow: 0 0 20px #e74c3c, 0 0 40px #e74c3c; transform: scale(1.2); animation: pulse-active 1s infinite alternate; }

.country-label-fixed {
  position: absolute; top: 15px; left: 15px;
  background: rgba(0,0,0,0.88); border: 2px solid rgba(255,255,255,0.3); border-radius: 10px;
  padding: 10px 14px; color: white; text-align: center;
  backdrop-filter: blur(8px); z-index: 200; min-width: 150px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.6);
}
.fade-label-enter-active, .fade-label-leave-active { transition: all 0.2s; }
.fade-label-enter-from, .fade-label-leave-to { opacity: 0; transform: scale(0.9); }

.country-label-fixed .name { font-weight: 900; font-size: 0.9rem; color: #fff; text-shadow: 0 2px 4px rgba(0,0,0,0.5); }
.country-label-fixed .status { font-size: 0.7rem; margin-top: 3px; font-weight: bold; }
.country-label-fixed .status.unlocked { color: #2ecc71; }
.country-label-fixed .status.locked { color: #e74c3c; }
.country-label-fixed .status.ticket { color: #ffeaa7; }

.map-coming-soon {
  position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
  z-index: 40; text-align: center; color: white;
  background: rgba(0,0,0,0.68); border: 2px solid rgba(255,255,255,0.25);
  border-radius: 16px; padding: 16px 20px; max-width: 360px;
  backdrop-filter: blur(8px);
}
.map-coming-soon h3 { margin: 0 0 6px; font-size: 1.1rem; }
.map-coming-soon p { margin: 0; font-size: 0.82rem; color: #dfe6e9; line-height: 1.5; }

.action-btn {
  margin-top: 6px; width: 100%; padding: 4px; border-radius: 6px; font-weight: bold; font-size: 0.75rem;
  background: linear-gradient(to bottom, #3498db, #2980b9); color: white; border: none; cursor: pointer;
  box-shadow: 0 2px 5px rgba(0,0,0,0.5);
}
.action-btn:active { transform: translateY(1px); }

@media (max-width: 900px), (max-height: 560px) {
  .map-overlay {
    padding: 4px 10px 10px;
  }
  .close-btn {
    top: 6px;
    left: 10px;
    padding: 7px 12px;
    border-radius: 14px;
    font-size: 0.92rem;
  }
  .top-info {
    width: 100%;
    margin-top: 34px;
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }
  .map-title {
    text-align: center;
    font-size: 1.1rem;
  }
  .resource-row {
    justify-content: center;
    flex-wrap: wrap;
    gap: 6px;
  }
  .diamond-display,
  .ticket-display {
    font-size: 0.78rem;
    padding: 4px 9px;
  }
  .map-tabs {
    width: 100%;
    margin-top: 2px;
    justify-content: flex-start;
    overflow-x: auto;
    overflow-y: hidden;
    flex-wrap: nowrap;
    padding-bottom: 2px;
  }
  .map-tab-btn {
    flex: 0 0 auto;
    white-space: nowrap;
    font-size: 0.7rem;
    padding: 5px 10px;
  }
  .tab-soon {
    font-size: 0.58rem;
    padding: 1px 5px;
  }
  .dev-toolbar {
    width: min(96%, 700px);
    grid-template-columns: 1fr;
    gap: 6px;
    padding: 6px 8px;
    top: 6px;
  }
  .dev-toggle-btn,
  .dev-hint,
  .dev-coord {
    font-size: 0.7rem;
  }
  .map-container {
    width: 100%;
    max-width: none;
    height: 56vh;
    aspect-ratio: auto;
    border-radius: 16px;
    margin-top: 4px;
  }
  .country-label-fixed {
    top: 8px;
    left: 8px;
    padding: 7px 9px;
    min-width: 130px;
  }
  .country-label-fixed .name { font-size: 0.78rem; }
  .country-label-fixed .status { font-size: 0.64rem; }
  .action-btn { font-size: 0.68rem; }
  .map-coming-soon {
    width: min(84vw, 320px);
    padding: 12px 14px;
  }
}

@keyframes pulse {
  0% { box-shadow: 0 0 5px currentColor; }
  100% { box-shadow: 0 0 25px currentColor; }
}
@keyframes pulse-active {
  0% { box-shadow: 0 0 10px #e74c3c; }
  100% { box-shadow: 0 0 30px #e74c3c, 0 0 50px #e74c3c; }
}
</style>
