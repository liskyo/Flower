<script setup>
import { computed } from 'vue';
import { state } from '../store/gameState';

const emit = defineEmits(['back']);

const formatNumber = (num) => {
  return new Intl.NumberFormat('en-US').format(num);
};

const items = [
  { id: 'sunnyDoll', name: '☀️ 晴天娃娃', desc: '強制天氣變晴天 6 小時', price: 5000, type: 'weather', duration: 6, reqLevel: 2 },
  { id: 'rain1', name: '🌧️ 人造雨一階', desc: '全域生長速度 2 倍 (1小時)', price: 10000, type: 'rain', multi: 2, duration: 1, reqLevel: 3 },
  { id: 'rain2', name: '🌧️ 人造雨二階', desc: '全域生長速度 4 倍 (1小時)', price: 50000, type: 'rain', multi: 4, duration: 1, reqLevel: 5 },
  { id: 'rain3', name: '🌧️ 人造雨三階', desc: '全域生長速度 6 倍 (1小時)', price: 100000, type: 'rain', multi: 6, duration: 1, reqLevel: 8 },
  { id: 'rain4', name: '🌧️ 人造雨四階', desc: '全域生長速度 8 倍 (1小時)', price: 250000, type: 'rain', multi: 8, duration: 1, reqLevel: 12 },
  { id: 'rain5', name: '🌧️ 人造雨五階', desc: '全域生長速度 10 倍 (1小時)', price: 500000, type: 'rain', multi: 10, duration: 1, reqLevel: 15 },
  { id: 'fert1', name: '💩 肥料一階', desc: '枯萎時間延長 2 倍 (2小時)', price: 10000, type: 'fertilizer', multi: 2, duration: 2, reqLevel: 3 },
  { id: 'fert2', name: '💩 肥料二階', desc: '枯萎時間延長 4 倍 (2小時)', price: 50000, type: 'fertilizer', multi: 4, duration: 2, reqLevel: 5 },
  { id: 'fert3', name: '💩 肥料三階', desc: '枯萎時間延長 6 倍 (2小時)', price: 100000, type: 'fertilizer', multi: 6, duration: 2, reqLevel: 8 },
  { id: 'fert4', name: '💩 肥料四階', desc: '枯萎時間延長 8 倍 (2小時)', price: 250000, type: 'fertilizer', multi: 8, duration: 2, reqLevel: 12 },
  { id: 'fert5', name: '💩 肥料五階', desc: '枯萎時間延長 10 倍 (2小時)', price: 500000, type: 'fertilizer', multi: 10, duration: 2, reqLevel: 15 }
];

const buyItem = (item) => {
  if (state.diamonds >= item.price) {
    state.diamonds -= item.price;
    if (!state.inventoryItems) state.inventoryItems = {};
    state.inventoryItems[item.id] = (state.inventoryItems[item.id] || 0) + 1;
    alert(`成功購買 ${item.name}！已放入道具箱中。`);
  } else {
    alert("鑽石不足！");
  }
};

const getLevelColorClass = (level) => {
  if (level >= 15) return 'tier-legendary';
  if (level >= 12) return 'tier-epic';
  if (level >= 8) return 'tier-rare';
  if (level >= 5) return 'tier-uncommon';
  return 'tier-common';
};
</script>

<template>
  <div class="shop-overlay">
    <div class="shop-header">
      <h2>🛒 高級道具商店</h2>
      <button @click="emit('back')" class="close-btn">❌</button>
    </div>
    <div class="diamond-display">💎 您的鑽石: <span class="diamond-val">{{ formatNumber(state.diamonds) }}</span></div>
    
    <div class="items-grid">
      <div v-for="item in items" :key="item.id" 
           class="item-card" 
           :class="[{ 'is-locked': (state.level || 1) < (item.reqLevel || 1) }, getLevelColorClass(item.reqLevel)]">
        <h3>{{ item.name }}</h3>
        <p>{{ item.desc }}</p>
        
        <button v-if="(state.level || 1) >= (item.reqLevel || 1)" 
                @click="buyItem(item)" 
                :disabled="state.diamonds < item.price" 
                class="buy-btn">
          💎 {{ formatNumber(item.price) }}
        </button>
        <div v-else class="locked-btn">
          🔒 需達到 Lv. {{ item.reqLevel }} 解鎖
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.shop-overlay {
  position: absolute; inset: 0; background: rgba(10, 15, 25, 0.7); z-index: 8000;
  display: flex; flex-direction: column; padding: 40px; color: white; backdrop-filter: blur(15px);
}
.shop-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.shop-header h2 { 
  font-size: 1.8rem; font-weight: 900; 
  background: linear-gradient(45deg, #48dbfb, #0abde3); -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  filter: drop-shadow(0 2px 5px rgba(10, 189, 227, 0.5));
}
.close-btn { background: none; border: none; font-size: 1.8rem; cursor: pointer; transition: transform 0.2s; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5)); }
.close-btn:hover { transform: scale(1.1) rotate(90deg); }
.diamond-display { font-size: 1.1rem; font-weight: bold; color: white; margin-bottom: 15px; padding: 8px 16px; background: rgba(255,255,255,0.1); border-radius: 12px; display: inline-block; border: 1px solid rgba(255,255,255,0.2); }
.diamond-val { color: #feca57; text-shadow: 0 0 10px rgba(254, 202, 87, 0.5); }
.items-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 15px; overflow-y: auto;
  padding-bottom: 30px; padding-right: 10px; flex: 1; min-height: 0; align-content: start;
  grid-auto-rows: min-content;
}
.items-grid::-webkit-scrollbar { width: 8px; }
.items-grid::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 4px; }

.item-card {
  background: linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.02));
  border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 6px 20px 0 rgba(0, 0, 0, 0.3);
  padding: 15px; border-radius: 15px; display: flex; flex-direction: column; gap: 10px;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1); position: relative; overflow: hidden;
  min-height: 180px; justify-content: space-between;
}

/* Tier Colors */
.tier-common { border-left: 5px solid #a4b0be; }
.tier-uncommon { border-left: 5px solid #2ed573; background: linear-gradient(135deg, rgba(46, 213, 115, 0.1), rgba(0,0,0,0)); }
.tier-rare { border-left: 5px solid #1e90ff; background: linear-gradient(135deg, rgba(30, 144, 255, 0.1), rgba(0,0,0,0)); }
.tier-epic { border-left: 5px solid #9b59b6; background: linear-gradient(135deg, rgba(155, 89, 182, 0.15), rgba(0,0,0,0)); }
.tier-legendary { border-left: 5px solid #f1c40f; background: linear-gradient(135deg, rgba(241, 196, 15, 0.2), rgba(0,0,0,0)); box-shadow: 0 0 15px rgba(241, 196, 15, 0.3); }

.item-card::before {
  content: ''; position: absolute; top: 0; left: -100%; width: 50%; height: 100%;
  background: linear-gradient(to right, transparent, rgba(255,255,255,0.1), transparent);
  transform: skewX(-20deg); transition: 0.5s;
}
.item-card:hover { transform: translateY(-5px); border-color: rgba(255,255,255,0.5); box-shadow: 0 15px 40px rgba(0, 0, 0, 0.5); }
.item-card:hover::before { left: 150%; }

.item-card h3 { color: #fff; font-size: 1.1rem; font-weight: 900; letter-spacing: 0.5px; text-shadow: 0 2px 4px rgba(0,0,0,0.5); }
.item-card p { font-size: 0.8rem; flex-grow: 1; line-height: 1.4; color: #b2bec3; }
.buy-btn {
  background: linear-gradient(to bottom, #f1c40f, #f39c12); border: none; padding: 8px; border-radius: 8px;
  font-weight: 900; font-size: 0.9rem; cursor: pointer; color: #2d3436; 
  box-shadow: 0 3px 10px rgba(243, 156, 18, 0.4), inset 0 1px 0 rgba(255,255,255,0.3);
  transition: all 0.1s; text-align: center; margin-top: auto;
}
.buy-btn:active { transform: translateY(2px); box-shadow: 0 2px 5px rgba(243, 156, 18, 0.4), inset 0 0 0 rgba(255,255,255,0); }
.buy-btn:disabled { 
  background: linear-gradient(to bottom, #7f8c8d, #636e72); color: #bdc3c7;
  box-shadow: none; cursor: not-allowed; opacity: 0.6; 
}

.item-card.is-locked { filter: grayscale(80%); opacity: 0.8; }
.locked-btn {
  background: rgba(0,0,0,0.5); padding: 8px; border-radius: 8px;
  font-weight: 900; font-size: 0.75rem; color: #ff7675; text-align: center;
  border: 1.5px dashed #ff7675; cursor: not-allowed; margin-top: auto;
}

@media (max-width: 600px) {
  .shop-overlay { padding: 20px; }
  .shop-header h2 { font-size: 1.8rem; }
  .diamond-display { font-size: 1.2rem; padding: 8px 15px; margin-bottom: 15px; }
  .items-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; padding-right: 5px; }
  .item-card { min-height: 240px; padding: 10px; gap: 4px; border-radius: 12px; }
  .item-card h3 { font-size: 0.9rem; }
  .item-card p { font-size: 0.7rem; }
  .buy-btn { font-size: 0.8rem; padding: 6px; border-radius: 6px; }
  .locked-btn { font-size: 0.7rem; padding: 6px; border-radius: 6px; }
}
</style>
