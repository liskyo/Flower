<script setup>
import { computed, ref } from 'vue';
import { state } from '../store/gameState';

const emit = defineEmits(['back', 'select-country']);

const selectedCountry = ref(null);

const formatNumber = (num) => new Intl.NumberFormat('en-US').format(num);

const countries = [
  { id: 'Taiwan', name: '台灣', x: 56, y: 76, flag: '🇹🇼' },
  { id: 'Japan', name: '日本', x: 90, y: 33, flag: '🇯🇵' },
  { id: 'Korea', name: '韓國', x: 64, y: 45, flag: '🇰🇷' },
  { id: 'Thailand', name: '泰國', x: 45, y: 84, flag: '🇹🇭' },
  { id: 'Singapore', name: '新加坡', x: 50, y: 85, flag: '🇸🇬' }
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
      >
        <div class="hotspot" @click.stop="selectedCountry = selectedCountry === country.id ? null : country.id"></div>
        <div class="country-label" :class="{ 'show-label': selectedCountry === country.id }">
          <div class="name">{{ country.flag }} {{ country.name }}</div>
          <div v-if="state.unlockedCountries.includes(country.id)" class="status unlocked">✅ 已解鎖</div>
          <div v-else class="status locked">🔒 需 {{ formatNumber(state.visitedCount * 1000000) }} 鑽石</div>
          
          <button class="action-btn" @click.stop="handleSelect(country.id)">
            {{ state.unlockedCountries.includes(country.id) ? '🛫 立即前往' : '💰 購買機票' }}
          </button>
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
  width: 95vw; max-width: 1200px; aspect-ratio: 2 / 1; position: relative; margin-top: 100px;
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
  position: absolute; top: 100%; left: 50%;
  background: rgba(0,0,0,0.85); border: 2px solid rgba(255,255,255,0.3); border-radius: 10px;
  padding: 8px 12px; color: white; margin-top: 10px; text-align: center;
  transition: all 0.2s; opacity: 0; transform: translate(-50%, 10px) scale(0.9); white-space: nowrap; pointer-events: none;
  backdrop-filter: blur(5px); z-index: 100;
}
.country-label.show-label { opacity: 1; transform: translate(-50%, 0) scale(1); pointer-events: auto; }
.country-node.active .country-label.show-label { border-color: #e74c3c; }

.country-label .name { font-weight: 900; font-size: 1.1rem; color: #fff; text-shadow: 0 2px 4px rgba(0,0,0,0.5); }
.country-label .status { font-size: 0.8rem; margin-top: 5px; font-weight: bold; }
.country-label .status.unlocked { color: #2ecc71; }
.country-label .status.locked { color: #e74c3c; }

.action-btn {
  margin-top: 8px; width: 100%; padding: 6px; border-radius: 6px; font-weight: bold; font-size: 0.85rem;
  background: linear-gradient(to bottom, #3498db, #2980b9); color: white; border: none; cursor: pointer;
  box-shadow: 0 2px 5px rgba(0,0,0,0.5);
}
.action-btn:active { transform: translateY(1px); }

@keyframes pulse {
  0% { box-shadow: 0 0 5px currentColor; }
  100% { box-shadow: 0 0 25px currentColor; }
}
@keyframes pulse-active {
  0% { box-shadow: 0 0 10px #e74c3c; }
  100% { box-shadow: 0 0 30px #e74c3c, 0 0 50px #e74c3c; }
}
</style>
