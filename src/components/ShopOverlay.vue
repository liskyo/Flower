<script setup>
import { computed } from 'vue';
import { state } from '../store/gameState';

const emit = defineEmits(['back']);

const items = [
  { id: 'sunnyDoll', name: '晴天娃娃', desc: '強制天氣變晴天 6 小時', price: 50, type: 'weather', duration: 6 },
  { id: 'rain1', name: '人造雨一階', desc: '全域生長速度 2 倍 (1小時)', price: 100, type: 'rain', multi: 2, duration: 1 },
  { id: 'rain2', name: '人造雨二階', desc: '全域生長速度 4 倍 (1小時)', price: 200, type: 'rain', multi: 4, duration: 1 },
  { id: 'rain3', name: '人造雨三階', desc: '全域生長速度 6 倍 (1小時)', price: 400, type: 'rain', multi: 6, duration: 1 },
  { id: 'rain4', name: '人造雨四階', desc: '全域生長速度 8 倍 (1小時)', price: 800, type: 'rain', multi: 8, duration: 1 },
  { id: 'rain5', name: '人造雨五階', desc: '全域生長速度 10 倍 (1小時)', price: 1500, type: 'rain', multi: 10, duration: 1 },
  { id: 'fert1', name: '肥料一階', desc: '全域枯萎時間延長 2 倍 (2小時)', price: 100, type: 'fertilizer', multi: 2, duration: 2 },
  { id: 'fert2', name: '肥料二階', desc: '全域枯萎時間延長 4 倍 (2小時)', price: 200, type: 'fertilizer', multi: 4, duration: 2 },
  { id: 'fert3', name: '肥料三階', desc: '全域枯萎時間延長 6 倍 (2小時)', price: 400, type: 'fertilizer', multi: 6, duration: 2 },
  { id: 'fert4', name: '肥料四階', desc: '全域枯萎時間延長 8 倍 (2小時)', price: 800, type: 'fertilizer', multi: 8, duration: 2 },
  { id: 'fert5', name: '肥料五階', desc: '全域枯萎時間延長 10 倍 (2小時)', price: 1500, type: 'fertilizer', multi: 10, duration: 2 }
];

const buyItem = (item) => {
  if (state.diamonds >= item.price) {
    state.diamonds -= item.price;
    const now = Date.now();
    
    if (item.type === 'weather') {
      state.activeBuffs.sunnyDollUntil = now + item.duration * 60 * 60 * 1000;
    } else if (item.type === 'rain') {
      state.activeBuffs.rainUntil = now + item.duration * 60 * 60 * 1000;
      state.activeBuffs.rainMultiplier = item.multi;
    } else if (item.type === 'fertilizer') {
      state.activeBuffs.fertilizerUntil = now + item.duration * 60 * 60 * 1000;
      state.activeBuffs.fertilizerMultiplier = item.multi;
    }
    alert(`成功購買並使用 ${item.name}！效果已立即套用。`);
  } else {
    alert("鑽石不足！");
  }
};
</script>

<template>
  <div class="shop-overlay">
    <div class="shop-header">
      <h2>🛒 道具商店</h2>
      <button @click="emit('back')" class="close-btn">❌</button>
    </div>
    <div class="diamond-display">💎 您的鑽石: {{ state.diamonds }}</div>
    
    <div class="items-grid">
      <div v-for="item in items" :key="item.id" class="item-card">
        <h3>{{ item.name }}</h3>
        <p>{{ item.desc }}</p>
        <button @click="buyItem(item)" :disabled="state.diamonds < item.price" class="buy-btn">
          💎 {{ item.price }} 購買並使用
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.shop-overlay {
  position: absolute; inset: 0; background: rgba(0,0,0,0.85); z-index: 8000;
  display: flex; flex-direction: column; padding: 30px; color: white; backdrop-filter: blur(5px);
}
.shop-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.shop-header h2 { font-size: 2.5rem; font-weight: 900; color: #48dbfb; text-shadow: 0 4px 0 rgba(0,0,0,0.5); }
.close-btn { background: none; border: none; font-size: 2.5rem; cursor: pointer; transition: transform 0.2s; }
.close-btn:hover { transform: scale(1.1); }
.diamond-display { font-size: 1.5rem; font-weight: bold; color: #ffeaa7; margin-bottom: 20px; }
.items-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 20px; overflow-y: auto;
  padding-bottom: 40px;
}
.item-card {
  background: rgba(255,255,255,0.1); border: 2px solid rgba(255,255,255,0.3);
  padding: 20px; border-radius: 15px; display: flex; flex-direction: column; gap: 10px;
}
.item-card h3 { color: #feca57; font-size: 1.4rem; font-weight: 900; }
.item-card p { font-size: 1rem; flex-grow: 1; line-height: 1.5; color: #dfe6e9; }
.buy-btn {
  background: #f1c40f; border: none; padding: 12px; border-radius: 8px;
  font-weight: 900; font-size: 1rem; cursor: pointer; color: #2d3436; box-shadow: 0 4px 0 #d35400;
  transition: transform 0.1s;
}
.buy-btn:active { transform: translateY(2px); box-shadow: 0 2px 0 #d35400; }
.buy-btn:disabled { background: #95a5a6; box-shadow: 0 4px 0 #7f8c8d; cursor: not-allowed; opacity: 0.7; }
</style>
