<script setup>
import { computed } from 'vue';
import { state } from '../store/gameState';

const emit = defineEmits(['back', 'select-country']);

const formatNumber = (num) => new Intl.NumberFormat('en-US').format(num);

const countries = [
  { id: 'Taiwan', name: '台灣', x: 82, y: 45, flag: '🇹🇼' },
  { id: 'Japan', name: '日本', x: 92, y: 35, flag: '🇯🇵' },
  { id: 'Korea', name: '韓國', x: 83, y: 35, flag: '🇰🇷' },
  { id: 'Thailand', name: '泰國', x: 78, y: 50, flag: '🇹🇭' },
  { id: 'Singapore', name: '新加坡', x: 79, y: 58, flag: '🇸🇬' }
];

const handleSelect = (countryId) => {
  if (state.unlockedCountries.includes(countryId)) {
    if (state.currentCountry !== countryId) {
      state.currentCountry = countryId;
      state.currentScene = 1;
    }
    emit('select-country', countryId);
  } else {
    const cost = state.visitedCount * 1000000;
    if (confirm(`解鎖此國家需要 ${formatNumber(cost)} 鑽石作為機票費用。\n您確定要前往嗎？`)) {
      if (state.diamonds >= cost) {
        state.diamonds -= cost;
        state.unlockedCountries.push(countryId);
        state.visitedCount += 1;
        state.currentCountry = countryId;
        state.currentScene = 1;
        alert("解鎖成功！準備降落！🛫");
        emit('select-country', countryId);
      } else {
        alert("鑽石不足，無法購買機票！");
      }
    }
  }
};
</script>

<template>
  <div class="map-overlay">
    <button @click="emit('back')" class="close-btn">🔙 返回花園</button>
    <div class="top-info">
      <div class="map-title">🌍 選擇你要前往的國家</div>
      <div class="diamond-display">💎 您的鑽石: <span class="diamond-val">{{ formatNumber(state.diamonds) }}</span></div>
    </div>
    
    <div class="map-container">
      <!-- 真實世界地圖背景 -->
      <div class="world-map-bg"></div>
      
      <!-- 國家節點 -->
      <div 
        v-for="country in countries" 
        :key="country.id"
        class="country-node"
        :class="{ 
          active: state.currentCountry === country.id,
          locked: !state.unlockedCountries.includes(country.id)
        }"
        :style="{ top: `${country.y}%`, left: `${country.x}%` }"
        @click="handleSelect(country.id)"
      >
        <div class="hotspot"></div>
        <div class="country-label">
          <div class="name">{{ country.flag }} {{ country.name }}</div>
          <div v-if="state.unlockedCountries.includes(country.id)" class="status unlocked">✅ 已解鎖 (可免費前往)</div>
          <div v-else class="status locked">🔒 需 {{ formatNumber(state.visitedCount * 1000000) }} 鑽石</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.map-overlay {
  position: absolute; inset: 0; background: radial-gradient(circle at center, #2c3e50, #1a252f); z-index: 8000;
  display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px;
}
.close-btn {
  position: absolute; top: 20px; left: 20px; background: #e74c3c; color: white;
  border: 3px solid #c0392b; padding: 10px 20px; border-radius: 20px; font-weight: 900;
  box-shadow: 0 4px 0 #c0392b; cursor: pointer; z-index: 10; font-size: 1.1rem;
}
.close-btn:active { transform: translateY(2px); box-shadow: 0 2px 0 #c0392b; }

.top-info { position: absolute; top: 20px; right: 20px; display: flex; flex-direction: column; align-items: flex-end; z-index: 10; gap: 10px; }
.map-title { font-size: 2rem; font-weight: 900; color: white; text-shadow: 0 4px 0 rgba(0,0,0,0.5); }
.diamond-display { background: rgba(0,0,0,0.6); padding: 8px 15px; border-radius: 15px; border: 2px solid rgba(255,255,255,0.2); font-weight: bold; color: white; }
.diamond-val { color: #feca57; font-size: 1.2rem; }

.map-container {
  width: 95vw; max-width: 1200px; height: 75vh; position: relative; margin-top: 60px;
  background: #0f1c29; border-radius: 30px; overflow: hidden; border: 4px solid rgba(255,255,255,0.1);
  box-shadow: 0 20px 50px rgba(0,0,0,0.8), inset 0 0 100px rgba(0,0,0,0.5);
}

.world-map-bg { 
  position: absolute; inset: 0; pointer-events: none; 
  background-image: url('/worldmap.png');
  background-size: 100% 100%;
  background-position: center;
  background-repeat: no-repeat;
  opacity: 0.85;
}

.country-node {
  position: absolute; transform: translate(-50%, -50%); cursor: pointer; z-index: 5;
  display: flex; flex-direction: column; align-items: center;
}

.hotspot {
  width: 20px; height: 20px; background: #f1c40f; border-radius: 50%;
  border: 3px solid white; box-shadow: 0 0 15px #f1c40f, 0 0 30px #f1c40f;
  animation: pulse 1.5s infinite alternate; transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.country-node.locked .hotspot { background: #7f8c8d; box-shadow: 0 0 10px #7f8c8d; border-color: #bdc3c7; animation: none; }
.country-node:hover .hotspot { transform: scale(1.5); }
.country-node.active .hotspot { background: #e74c3c; box-shadow: 0 0 20px #e74c3c, 0 0 40px #e74c3c; transform: scale(1.2); animation: pulse-active 1s infinite alternate; }

.country-label {
  background: rgba(0,0,0,0.85); border: 2px solid rgba(255,255,255,0.3); border-radius: 12px;
  padding: 10px 20px; color: white; margin-top: 15px; text-align: center;
  transition: all 0.3s; opacity: 0; transform: translateY(10px) scale(0.9); white-space: nowrap; pointer-events: none;
  backdrop-filter: blur(5px);
}
.country-node:hover .country-label { opacity: 1; transform: translateY(0) scale(1); pointer-events: auto; z-index: 100; }
.country-node.active .country-label { border-color: #e74c3c; opacity: 1; transform: translateY(0) scale(1); }

.country-label .name { font-weight: 900; font-size: 1.4rem; color: #fff; text-shadow: 0 2px 4px rgba(0,0,0,0.5); }
.country-label .status { font-size: 0.9rem; margin-top: 8px; font-weight: bold; }
.country-label .status.unlocked { color: #2ecc71; }
.country-label .status.locked { color: #e74c3c; }

@keyframes pulse {
  0% { box-shadow: 0 0 5px currentColor; }
  100% { box-shadow: 0 0 25px currentColor; }
}
@keyframes pulse-active {
  0% { box-shadow: 0 0 10px #e74c3c; }
  100% { box-shadow: 0 0 30px #e74c3c, 0 0 50px #e74c3c; }
}
</style>
