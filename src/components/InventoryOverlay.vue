<script setup>
import { computed } from 'vue';
import { state } from '../store/gameState';

const emit = defineEmits(['back']);

const allItems = [
  { id: 'sunnyDoll', name: '☀️ 晴天娃娃', desc: '強制天氣變晴天 6 小時', type: 'weather', duration: 6 },
  { id: 'rain1', name: '🌧️ 人造雨一階', desc: '全域生長速度 2 倍 (1小時)', type: 'rain', multi: 2, duration: 1 },
  { id: 'rain2', name: '🌧️ 人造雨二階', desc: '全域生長速度 4 倍 (1小時)', type: 'rain', multi: 4, duration: 1 },
  { id: 'rain3', name: '🌧️ 人造雨三階', desc: '全域生長速度 6 倍 (1小時)', type: 'rain', multi: 6, duration: 1 },
  { id: 'rain4', name: '🌧️ 人造雨四階', desc: '全域生長速度 8 倍 (1小時)', type: 'rain', multi: 8, duration: 1 },
  { id: 'rain5', name: '🌧️ 人造雨五階', desc: '全域生長速度 10 倍 (1小時)', type: 'rain', multi: 10, duration: 1 },
  { id: 'fert1', name: '💩 肥料一階', desc: '枯萎時間延長 2 倍 (2小時)', type: 'fertilizer', multi: 2, duration: 2 },
  { id: 'fert2', name: '💩 肥料二階', desc: '枯萎時間延長 4 倍 (2小時)', type: 'fertilizer', multi: 4, duration: 2 },
  { id: 'fert3', name: '💩 肥料三階', desc: '枯萎時間延長 6 倍 (2小時)', type: 'fertilizer', multi: 6, duration: 2 },
  { id: 'fert4', name: '💩 肥料四階', desc: '枯萎時間延長 8 倍 (2小時)', type: 'fertilizer', multi: 8, duration: 2 },
  { id: 'fert5', name: '💩 肥料五階', desc: '枯萎時間延長 10 倍 (2小時)', type: 'fertilizer', multi: 10, duration: 2 }
];

const inventoryItems = computed(() => {
  if (!state.inventoryItems) return [];
  return Object.entries(state.inventoryItems)
    .filter(([_, count]) => count > 0)
    .map(([id, count]) => {
      const itemDef = allItems.find(i => i.id === id);
      return { ...itemDef, count };
    })
    .filter(item => item.name); // only valid items
});

const useItem = (item) => {
  if (state.inventoryItems[item.id] > 0) {
    state.inventoryItems[item.id]--;
    const now = Date.now();
    
    // 【新增】防呆機制：如果舊存檔沒有 activeBuffs，先初始化它以確保響應式生效
    if (!state.activeBuffs) {
      state.activeBuffs = { 
        sunnyDollUntil: null, 
        rainUntil: null, rainMultiplier: 1, 
        fertilizerUntil: null, fertilizerMultiplier: 1 
      };
    }
    
    if (item.type === 'weather') {
      state.activeBuffs.sunnyDollUntil = now + item.duration * 60 * 60 * 1000;
    } else if (item.type === 'rain') {
      state.activeBuffs.rainUntil = now + item.duration * 60 * 60 * 1000;
      state.activeBuffs.rainMultiplier = item.multi;
    } else if (item.type === 'fertilizer') {
      state.activeBuffs.fertilizerUntil = now + item.duration * 60 * 60 * 1000;
      state.activeBuffs.fertilizerMultiplier = item.multi;
    }
    alert(`成功使用 ${item.name}！`);
  }
};
</script>

<template>
  <div class="inventory-overlay">
    <div class="shop-header">
      <h2>🎒 道具箱</h2>
      <button @click="emit('back')" class="close-btn">❌</button>
    </div>
    
    <div v-if="inventoryItems.length === 0" class="empty-state">
      您還沒有任何道具，去商店看看吧！
    </div>

    <div v-else class="items-grid">
      <div v-for="item in inventoryItems" :key="item.id" class="item-card tier-epic">
        <h3>{{ item.name }}</h3>
        <p>{{ item.desc }}</p>
        <div class="item-count">持有數量: {{ item.count }}</div>
        
        <button @click="useItem(item)" class="buy-btn">
          ✨ 立即使用
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* --- 找到這段並替換 --- */
.inventory-overlay {
  position: fixed; /* 從 absolute 改為 fixed */
  inset: 0; 
  background: rgba(10, 15, 25, 0.7); 
  z-index: 8000;
  display: flex; flex-direction: column; padding: 40px; color: white; backdrop-filter: blur(15px);
}
.shop-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.shop-header h2 { 
  font-size: 1.8rem; font-weight: 900; 
  background: linear-gradient(45deg, #f1c40f, #e67e22); -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  filter: drop-shadow(0 2px 5px rgba(243, 156, 18, 0.5));
}
.close-btn { background: none; border: none; font-size: 1.8rem; cursor: pointer; transition: transform 0.2s; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5)); }
.close-btn:hover { transform: scale(1.1) rotate(90deg); }

.empty-state { text-align: center; font-size: 1.1rem; color: #b2bec3; margin-top: 30px; font-weight: bold; }

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
  padding: 15px; border-radius: 15px; display: flex; flex-direction: column; gap: 8px;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1); position: relative; overflow: hidden;
  min-height: 180px; justify-content: space-between;
}

.tier-epic { border-left: 5px solid #9b59b6; background: linear-gradient(135deg, rgba(155, 89, 182, 0.15), rgba(0,0,0,0)); }

.item-card::before {
  content: ''; position: absolute; top: 0; left: -100%; width: 50%; height: 100%;
  background: linear-gradient(to right, transparent, rgba(255,255,255,0.1), transparent);
  transform: skewX(-20deg); transition: 0.5s;
}
.item-card:hover { transform: translateY(-5px); border-color: rgba(255,255,255,0.5); box-shadow: 0 15px 40px rgba(0, 0, 0, 0.5); }
.item-card:hover::before { left: 150%; }

.item-card h3 { color: #fff; font-size: 1.1rem; font-weight: 900; letter-spacing: 0.5px; text-shadow: 0 2px 4px rgba(0,0,0,0.5); }
.item-card p { font-size: 0.8rem; flex-grow: 1; line-height: 1.4; color: #b2bec3; }
.item-count { font-size: 0.9rem; font-weight: bold; color: #f1c40f; text-shadow: 0 2px 4px rgba(0,0,0,0.5); margin-bottom: 5px; }

.buy-btn {
  background: linear-gradient(to bottom, #9b59b6, #8e44ad); border: none; padding: 8px; border-radius: 8px;
  font-weight: 900; font-size: 0.9rem; cursor: pointer; color: #fff; 
  box-shadow: 0 3px 10px rgba(155, 89, 182, 0.4), inset 0 1px 0 rgba(255,255,255,0.3);
  transition: all 0.1s; text-align: center; margin-top: auto;
}
.buy-btn:active { transform: translateY(2px); box-shadow: 0 2px 5px rgba(155, 89, 182, 0.4), inset 0 0 0 rgba(255,255,255,0); }

@media (max-width: 600px) {
  .inventory-overlay { padding: 20px; }
  .shop-header h2 { font-size: 1.8rem; }
  .items-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; padding-right: 5px; }
  .item-card { min-height: 240px; padding: 10px; gap: 4px; border-radius: 12px; }
  .item-card h3 { font-size: 0.9rem; }
  .item-card p { font-size: 0.7rem; }
  .item-count { font-size: 0.8rem; }
  .buy-btn { font-size: 0.8rem; padding: 6px; border-radius: 6px; }
}
</style>
