<script setup>
import { computed, ref, onMounted } from 'vue';
import { state, hasSilverMedalForAllCountryFlowers } from '../store/gameState';
import { FLOWERS, COUNTRIES } from '../data/flowers';

const emit = defineEmits(['back']);

// 分籤邏輯
const selectedCountry = ref('Taiwan');
const categories = computed(() => [
  ...COUNTRIES.map(c => ({ id: c.id, name: c.name })),
  { id: 'Legendary', name: '傳說' }
]);

// 分頁邏輯
const currentPage = ref(0);
const itemsPerPage = 6;

const visibleFlowers = computed(() => {
  return FLOWERS.filter(f => {
    if (selectedCountry.value === 'Legendary') {
      return f.rarity === 'Legendary' && ((state.inventory[f.id] || 0) > 0 || hasSilverMedalForAllCountryFlowers(f.country));
    }
    return String(f.country).toLowerCase() === selectedCountry.value.toLowerCase() && f.rarity !== 'Legendary';
  });
});

const totalPages = computed(() => Math.max(1, Math.ceil(visibleFlowers.value.length / itemsPerPage)));

const paginatedFlowers = computed(() => {
  const start = currentPage.value * itemsPerPage;
  return visibleFlowers.value.slice(start, start + itemsPerPage);
});

const selectCountry = (id) => {
  selectedCountry.value = id;
  currentPage.value = 0;
};

// 詳情彈窗
const selectedFlower = ref(null);
const isCollected = (flowerId) => (state.inventory[flowerId] || 0) > 0;

const openDetail = (flower) => {
  if (isCollected(flower.id)) selectedFlower.value = flower;
};
const closeDetail = () => { selectedFlower.value = null; };

const getStars = (rarity) => (rarity === 'Legendary' ? 5 : parseInt(rarity) || 1);
const nextPage = () => { if (currentPage.value < totalPages.value - 1) currentPage.value++; };
const prevPage = () => { if (currentPage.value > 0) currentPage.value--; };

const getGlowClass = (rarity) => {
  if (rarity === 'Legendary') return 'glow-rainbow';
  if (parseInt(rarity) === 5) return 'glow-gold';
  if (parseInt(rarity) === 4) return 'glow-silver';
  return '';
};

// --- 圖片去背組件邏輯 ---
const processedImages = ref({});
const processCatalogImage = (flower, e) => {
  const img = e.target;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  ctx.drawImage(img, 0, 0);
  try {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i+1], b = data[i+2];
      if ((r > 230 && g > 230 && b > 230) || (r < 30 && g < 30 && b < 30)) data[i+3] = 0;
    }
    ctx.putImageData(imageData, 0, 0);
    processedImages.value[flower.id] = canvas.toDataURL();
  } catch (err) {
    processedImages.value[flower.id] = img.src;
  }
};
</script>

<template>
  <div class="catalog-overlay">
    <!-- 側邊標籤欄 -->
    <div class="catalog-tabs">
      <button 
        v-for="cat in categories" 
        :key="cat.id"
        class="tab-btn"
        :class="{ active: selectedCountry === cat.id, 'legendary-tab': cat.id === 'Legendary' }"
        @click="selectCountry(cat.id)"
      >
        {{ cat.name }}
      </button>
    </div>

    <div class="notebook-shell">
      <div class="spiral-binding">
        <div v-for="i in 15" :key="i" class="ring"></div>
      </div>

      <div class="notebook-inner">
        <div class="notebook-header">
          <div class="title-area">
            <span class="book-icon">📖</span>
            <h1>{{ categories.find(c => c.id === selectedCountry)?.name }}圖鑑</h1>
          </div>
          <div class="page-indicator">{{ currentPage + 1 }} / {{ totalPages }}</div>
        </div>
        <div class="items-grid-container">
          <div class="items-grid">
            <div 
              v-for="flower in paginatedFlowers" 
              :key="flower.id" 
              class="m-slot"
              :class="{ locked: !isCollected(flower.id) }"
              @click="openDetail(flower)"
            >
              <div class="m-slot-header" :class="getGlowClass(flower.rarity)">{{ flower.name }}</div>
              
              <div class="m-slot-body">
                <div class="m-slot-id-badge">NMI-{{ flower.id.split('_').pop() }}</div>
                
                <template v-if="isCollected(flower.id)">
                  <div class="m-thumb">
                    <img 
                      :src="`/assets/flowers/${flower.country.toLowerCase()}/${flower.id}.png`" 
                      class="hidden-source" 
                      @load="processCatalogImage(flower, $event)"
                    />
                    <img :src="processedImages[flower.id] || ''" class="m-img" :class="getGlowClass(flower.rarity)" v-if="processedImages[flower.id]" />
                    <span v-else>🌱</span>
                  </div>
                  <div class="m-medals">
                    <div class="m-medal" :class="{ 'gold': (state.inventory[flower.id] || 0) >= 50 }"></div>
                    <div class="m-medal" :class="{ 'silver': (state.inventory[flower.id] || 0) >= 20 }"></div>
                    <div class="m-medal" :class="{ 'bronze': (state.inventory[flower.id] || 0) >= 10 }"></div>
                  </div>
                </template>
                <div v-else class="m-placeholder">
                  <span class="q-mark">?</span>
                </div>
              </div>
              
              <div class="m-slot-footer">
                <span class="m-f-label">採收數</span>
                <span class="m-f-val">{{ state.inventory[flower.id] || 0 }} 隻</span>
              </div>
            </div>
          </div>
        </div>

        <div class="footer-hint">
          <button @click="prevPage" :disabled="currentPage === 0" class="arrow-btn prev">◀</button>
          <div class="swipe-text">左右翻頁 ({{ currentPage + 1 }}/{{ totalPages }})</div>
          <button @click="nextPage" :disabled="currentPage === totalPages - 1" class="arrow-btn next">▶</button>
        </div>
      </div>

      <button class="notebook-close-btn" @click="emit('back')">
        <span class="x-icon">✕</span>
        <span class="btn-text">關閉</span>
      </button>
    </div>

    <!-- 詳情彈窗 -->
    <Transition name="zoom">
      <div v-if="selectedFlower" class="m-modal-overlay" @click.self="closeDetail">
        <div class="m-modal-card">
          <div class="m-modal-header">
            <span class="m-modal-id">NMI-{{ selectedFlower.id.split('_').pop() }}</span>
            <span class="m-modal-title">{{ selectedFlower.name }}</span>
          </div>
          
          <div class="m-modal-body">
            <div class="m-top-section">
              <div class="m-image-frame">
                <img :src="processedImages[selectedFlower.id]" :class="['m-detail-img', getGlowClass(selectedFlower.rarity)]" />
              </div>
              
              <div class="m-stats-column">
                <div class="m-stat-box">
                  <div class="m-stat-head">稀有度</div>
                  <div class="m-stat-body rarity">
                    <template v-if="selectedFlower.rarity === 'Legendary'">
                      <span class="legendary-label">金色 Legend</span>
                    </template>
                    <template v-else>
                      <span v-for="s in 5" :key="s" :class="{ active: s <= getStars(selectedFlower.rarity) }">★</span>
                    </template>
                  </div>
                </div>
                <div class="m-stat-box">
                  <div class="m-stat-head">採收數</div>
                  <div class="m-stat-body">{{ state.inventory[selectedFlower.id] }} 隻</div>
                </div>
                <div class="m-stat-box">
                  <div class="m-stat-head">售價</div>
                  <div class="m-stat-body">{{ selectedFlower.price }} NP</div>
                </div>
              </div>
            </div>

            <div class="m-desc-box">
              <p v-if="selectedFlower.description">{{ selectedFlower.description }}</p>
              <template v-else>
                <p>這是一株來自 {{ selectedFlower.country }} 的珍貴花卉。</p>
                <p v-if="getStars(selectedFlower.rarity) >= 3">其獨特的能量場在深夜會發出微光。</p>
                <p v-else>在陽光下會展現出迷人的色澤。</p>
              </template>
            </div>
          </div>

          <button class="m-back-btn" @click="closeDetail">
            <span class="m-back-arrow">⬅</span>
            <span class="m-back-text">返回</span>
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.catalog-overlay {
  position: fixed; inset: 0; z-index: 5000; background: rgba(0,0,0,0.85);
  display: flex; align-items: center; justify-content: center;
}

/* 標籤欄樣式 */
.catalog-tabs {
  display: flex; flex-direction: column; gap: 8px; margin-right: -10px; z-index: 5;
}
.tab-btn {
  background: #d1ccc0; border: 3px solid #2d3436; border-right: none;
  border-radius: 12px 0 0 12px; padding: 12px 15px; font-weight: 900;
  cursor: pointer; transition: all 0.2s; color: #2d3436; font-size: 0.9rem;
  box-shadow: -4px 4px 0 rgba(0,0,0,0.3);
}
.tab-btn.active {
  background: #fdf6e3; transform: translateX(5px); padding-right: 20px;
}
.tab-btn.legendary-tab {
  background: #6b2122; color: #ffeaa7;
}
.tab-btn.legendary-tab.active {
  background: #6b2122; color: #fff; border-color: #ffeaa7;
}

.notebook-shell {
  position: relative; width: 95vw; max-width: 440px; height: 85vh;
  background: #fdf6e3; border-radius: 15px; box-shadow: 12px 12px 0 rgba(0,0,0,0.3); display: flex;
  border: 4px solid #2d3436;
}
.spiral-binding { position: absolute; left: -15px; top: 20px; bottom: 20px; display: flex; flex-direction: column; justify-content: space-around; z-index: 100; }
.ring { width: 32px; height: 10px; background: linear-gradient(to bottom, #bdc3c7, #2c3e50); border-radius: 10px; border: 1.5px solid #2d3436; }

.notebook-inner { flex: 1; padding: 15px 15px 15px 30px; display: flex; flex-direction: column; overflow: hidden; }
.notebook-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px dashed #d1ccc0; padding-bottom: 5px; margin-bottom: 10px; }
.title-area { display: flex; align-items: center; gap: 8px; }
.title-area h1 { font-size: 1.1rem; margin: 0; font-family: 'ZCOOL KuaiLe', cursive; color: #57606f; white-space: nowrap; }
.page-indicator { font-weight: 900; color: #d1ccc0; font-size: 0.8rem; white-space: nowrap; }

.items-grid-container { flex: 1; overflow: hidden; display: flex; flex-direction: column; }
.items-grid { display: grid; grid-template-columns: repeat(3, 1fr); grid-template-rows: repeat(2, 1fr); gap: 8px; height: 100%; }

.m-slot { background: #fdf5e6; border: 2px solid #3c1a1a; border-radius: 6px; display: flex; flex-direction: column; overflow: hidden; cursor: pointer; transition: transform 0.1s; }
.m-slot:active { transform: scale(0.97); }
.m-slot.locked { filter: grayscale(100%); opacity: 0.7; }

.m-slot-header { background: #580f75; color: #fff; text-align: center; font-size: 0.75rem; font-weight: 900; padding: 2px 0; border-bottom: 2px solid #3c1a1a; letter-spacing: 1px; }

.m-slot-body { flex: 1; position: relative; display: flex; align-items: center; justify-content: center; }
.m-slot-id-badge { position: absolute; top: 2px; left: 2px; background: #000; color: #fff; font-size: 0.5rem; padding: 1px 3px; border-radius: 4px; font-weight: 900; border: 1px solid #fff; }

.m-thumb { width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; }
.hidden-source { display: none; }
.m-img { width: 100%; height: 100%; object-fit: contain; }

.m-medals { position: absolute; right: 4px; top: 50%; transform: translateY(-50%); display: flex; flex-direction: column; gap: 3px; }
.m-medal { width: 10px; height: 10px; border-radius: 50%; border: 1px solid #3c1a1a; background: #e0e0e0; box-shadow: inset -1px -1px 2px rgba(0,0,0,0.3); }
.m-medal.gold { background: #f1c40f; }
.m-medal.silver { background: #bdc3c7; }
.m-medal.bronze { background: #cd7f32; }

.m-placeholder .q-mark { font-size: 2rem; color: #bcaea0; font-weight: 900; }

.m-slot-footer { background: #c87a27; color: #fff; display: flex; justify-content: space-between; align-items: center; padding: 1px 4px; font-size: 0.55rem; font-weight: 900; border-top: 2px solid #3c1a1a; }
.m-f-label { text-shadow: 1px 1px 0 #000; }
.m-f-val { text-shadow: 1px 1px 0 #000; }

.footer-hint { display: flex; justify-content: space-between; align-items: center; padding: 8px 10px 0; border-top: 2px dashed #d1ccc0; position: relative; }
.arrow-btn { background: #fff; border: 2px solid #2d3436; border-radius: 50%; width: 38px; height: 38px; cursor: pointer; font-weight: 900; display: flex; align-items: center; justify-content: center; font-size: 1rem; transition: all 0.2s; box-shadow: 0 4px 0 #2d3436; }
.arrow-btn:active:not(:disabled) { transform: translateY(2px); box-shadow: 0 2px 0 #2d3436; }
.arrow-btn:disabled { opacity: 0.2; cursor: not-allowed; }

.swipe-text { font-weight: 900; color: #747d8c; font-size: 0.75rem; }

.notebook-close-btn { position: absolute; bottom: -10px; right: -5px; width: 65px; height: 65px; background: #e74c3c; border: 4px solid #2d3436; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; z-index: 1000; box-shadow: 0 5px 0 #c0392b; transition: all 0.2s; }
.notebook-close-btn:active { transform: translateY(3px); box-shadow: 0 2px 0 #c0392b; }

.x-icon { font-size: 1.3rem; color: white; font-weight: 900; }
.btn-text { font-size: 0.6rem; color: white; font-weight: 900; }

.m-modal-overlay { position: fixed; inset: 0; z-index: 6000; background: rgba(0,0,0,0.85); display: flex; align-items: center; justify-content: center; }
.m-modal-card { width: 320px; background: #fffdf5; border: 3px solid #2d3436; border-radius: 12px; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 10px 20px rgba(0,0,0,0.5); position: relative; }

.m-modal-header { background: #6b2122; color: #fff; padding: 10px 15px; display: flex; align-items: center; justify-content: center; position: relative; border-bottom: 3px solid #2d3436; }
.m-modal-id { position: absolute; left: 15px; font-size: 0.75rem; opacity: 0.8; font-weight: 900; }
.m-modal-title { font-size: 1.1rem; font-weight: 900; letter-spacing: 1px; }

.m-modal-body { padding: 15px; display: flex; flex-direction: column; gap: 15px; background: #fdf5e6; }

.m-top-section { display: flex; gap: 15px; }

.m-image-frame { width: 120px; height: 120px; background: linear-gradient(to bottom, #118196, #0b5563); border: 3px solid #2d3436; border-radius: 8px; display: flex; align-items: center; justify-content: center; box-shadow: inset 0 0 10px rgba(0,0,0,0.5); }
.m-detail-img { width: 85%; height: 85%; object-fit: contain; filter: drop-shadow(2px 2px 2px rgba(0,0,0,0.3)); }

.m-stats-column { flex: 1; display: flex; flex-direction: column; gap: 8px; }

.m-stat-box { border: 2px solid #2d3436; border-radius: 6px; overflow: hidden; background: #fff; }
.m-stat-head { background: #b94b59; color: #fff; font-size: 0.65rem; font-weight: 900; padding: 2px 6px; border-bottom: 2px solid #2d3436; }
.m-stat-body { padding: 4px 6px; font-size: 0.9rem; font-weight: 900; color: #2d3436; text-align: center; }
.m-stat-body.rarity { color: #f1c40f; text-shadow: 1px 1px 0 #d35400; font-size: 0.8rem; }

.legendary-label {
  color: #f1c40f; font-weight: 900; font-size: 0.9rem; text-transform: uppercase;
  animation: shineText 2s infinite;
}
@keyframes shineText {
  0% { text-shadow: 0 0 5px #f1c40f; }
  50% { text-shadow: 0 0 20px #fff, 0 0 30px #f1c40f; }
  100% { text-shadow: 0 0 5px #f1c40f; }
}

.m-desc-box { background: #bc4b5b; border-radius: 8px; padding: 12px; color: #fff; font-size: 0.85rem; font-weight: 900; line-height: 1.5; position: relative; border: 2px solid #2d3436; }
.m-desc-box::before { content: ''; position: absolute; inset: 4px; border: 1px dashed rgba(255,255,255,0.5); pointer-events: none; border-radius: 4px; }

.m-back-btn { position: absolute; top: -15px; left: -15px; width: 60px; height: 60px; background: #5ea4d1; border: 3px solid #2d3436; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 4px 0 #2d3436; z-index: 6100; transition: transform 0.1s; }
.m-back-btn:active { transform: translateY(2px); box-shadow: 0 2px 0 #2d3436; }
.m-back-arrow { font-size: 1.2rem; color: #fff; font-weight: 900; margin-bottom: -4px; }
.m-back-text { font-size: 0.6rem; color: #fff; font-weight: 900; }

.zoom-enter-active { animation: zoom 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
@keyframes zoom { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }

.glow-silver { filter: drop-shadow(0 0 10px silver); }
.glow-gold { animation: pulseGold 2s infinite alternate; }
.glow-rainbow { animation: rainbowGlow 2s infinite alternate; }
@keyframes pulseGold {
  from { filter: drop-shadow(0 0 10px #f1c40f); transform: scale(1); }
  to { filter: drop-shadow(0 0 20px #f39c12); transform: scale(1.05); }
}
@keyframes rainbowGlow {
  0% { filter: drop-shadow(0 0 15px #ff0000); }
  20% { filter: drop-shadow(0 0 15px #ff7f00); }
  40% { filter: drop-shadow(0 0 15px #ffff00); }
  60% { filter: drop-shadow(0 0 15px #00ff00); }
  80% { filter: drop-shadow(0 0 15px #0000ff); }
  100% { filter: drop-shadow(0 0 15px #8b00ff); }
}

@media (max-width: 600px) {
  .catalog-tabs {
    margin-right: -5px;
  }
  .tab-btn {
    padding: 8px 10px; font-size: 0.75rem;
  }
  .items-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
