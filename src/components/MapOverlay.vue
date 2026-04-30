<script setup>
import { state } from '../store/gameState';

const emit = defineEmits(['back', 'select-country']);

const countries = [
  { id: 'Taiwan', name: '台灣', x: 75, y: 55, scenes: 4 },
  { id: 'Japan', name: '日本', x: 82, y: 40, scenes: 4 }
];

const selectCountry = (id) => {
  if (state.currentCountry !== id) {
    state.currentCountry = id;
    state.currentScene = 1;
  }
  emit('select-country', id);
};
</script>

<template>
  <div class="map-overlay">
    <button @click="emit('back')" class="close-btn">返回花園</button>
    <div class="map-title">🌍 選擇你要前往的國家</div>
    
    <div class="map-container">
      <div class="world-map-bg"></div>
      
      <div 
        v-for="country in countries" 
        :key="country.id"
        class="country-node"
        :class="{ active: state.currentCountry === country.id }"
        :style="{ top: `${country.y}%`, left: `${country.x}%` }"
        @click="selectCountry(country.id)"
      >
        <div class="hotspot"></div>
        <div class="country-label">
          <div class="name">{{ country.name }}</div>
          <div class="info">已解鎖 {{ country.scenes }} 個場景</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.map-overlay {
  position: absolute; inset: 0; background: #2c3e50; z-index: 8000;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
}
.close-btn {
  position: absolute; top: 20px; left: 20px; background: #e74c3c; color: white;
  border: 3px solid #c0392b; padding: 10px 20px; border-radius: 20px; font-weight: 900;
  box-shadow: 0 4px 0 #c0392b; cursor: pointer; z-index: 10;
}
.close-btn:active { transform: translateY(2px); box-shadow: 0 2px 0 #c0392b; }

.map-title {
  position: absolute; top: 30px; font-size: 2.5rem; font-weight: 900; color: white; text-shadow: 0 4px 0 rgba(0,0,0,0.5); z-index: 10;
}

.map-container {
  width: 90vw; max-width: 1000px; aspect-ratio: 16 / 9; position: relative;
  background: #34495e; border-radius: 20px; overflow: hidden; border: 5px solid #bdc3c7;
  box-shadow: 0 10px 30px rgba(0,0,0,0.5);
}

.world-map-bg {
  position: absolute; inset: 0;
  /* 簡單的世界地圖輪廓作為示意底圖 */
  background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 500"><path fill="%2327ae60" d="M100 100 Q150 50 200 100 T300 100 T400 150 T500 100 T600 200 T700 150 T800 250 T900 150 L900 400 L100 400 Z" opacity="0.1"/></svg>'); 
  background-size: cover; background-position: center;
}

.country-node {
  position: absolute; transform: translate(-50%, -50%); cursor: pointer; z-index: 5;
  display: flex; flex-direction: column; align-items: center;
}

.hotspot {
  width: 25px; height: 25px; background: #f1c40f; border-radius: 50%;
  border: 3px solid white; box-shadow: 0 0 15px #f1c40f, 0 0 30px #f1c40f;
  animation: pulse 1.5s infinite alternate; transition: transform 0.2s;
}
.country-node:hover .hotspot { transform: scale(1.3); }
.country-node.active .hotspot { background: #e74c3c; box-shadow: 0 0 20px #e74c3c, 0 0 40px #e74c3c; }

.country-label {
  background: rgba(0,0,0,0.8); border: 2px solid white; border-radius: 10px;
  padding: 8px 15px; color: white; margin-top: 10px; text-align: center;
  transition: opacity 0.2s; opacity: 0.8; white-space: nowrap;
}
.country-node:hover .country-label { opacity: 1; transform: scale(1.1); }
.country-node.active .country-label { border-color: #e74c3c; opacity: 1; }

.country-label .name { font-weight: 900; font-size: 1.2rem; color: #f1c40f; }
.country-label .info { font-size: 0.8rem; margin-top: 5px; color: #bdc3c7; }

@keyframes pulse {
  0% { box-shadow: 0 0 5px currentColor; }
  100% { box-shadow: 0 0 25px currentColor; }
}
</style>
