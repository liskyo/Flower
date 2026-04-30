import { reactive, watch } from 'vue';
import { FLOWERS } from '../data/flowers';

const SAVE_KEY = 'global_flower_game_save_v6'; // 升級版本以強制重置結構

const defaultState = {
  diamonds: 100,
  currentCountry: 'Taiwan',
  currentScene: 1,
  unlockedScenes: { 'Taiwan': [1, 2, 3, 4] },
  inventory: {}, 
  medals: {},
  gardens: {
    'Taiwan_1': [], 'Taiwan_2': [], 'Taiwan_3': [], 'Taiwan_4': [],
    'Japan_1': [], 'Japan_2': [], 'Japan_3': [], 'Japan_4': []
  },
  upgrades: { spawnRate: 0.5, maxSlots: 24 }
};

// 初始化各場景花園
Object.keys(defaultState.gardens).forEach(key => {
  defaultState.gardens[key] = Array.from({ length: 24 }, (_, i) => ({
    id: i, flowerId: null, startTime: null, status: 'empty'
  }));
});

const savedData = localStorage.getItem(SAVE_KEY);
export const state = reactive(savedData ? JSON.parse(savedData) : defaultState);

// 精確獲取當前花園資料
export const getCurrentGarden = () => {
  const key = `${state.currentCountry}_${state.currentScene}`;
  if (!state.gardens[key]) {
    state.gardens[key] = Array.from({ length: 24 }, (_, i) => ({ id: i, flowerId: null, startTime: null, status: 'empty' }));
  }
  return state.gardens[key];
};

// 嚴格過濾當前場景花卉
const getFlowersForCurrentScene = () => {
  return FLOWERS.filter(f => {
    const isSameCountry = String(f.country).toLowerCase() === String(state.currentCountry).toLowerCase();
    const isSameScene = Number(f.scene) === Number(state.currentScene);
    return isSameCountry && isSameScene;
  });
};

const seedVariety = () => {
  const garden = getCurrentGarden();
  const pool = getFlowersForCurrentScene();
  if (pool.length === 0) return;

  garden.forEach((slot, i) => {
    if (slot.status === 'empty' && i < 6) {
      const randomFlower = pool[Math.floor(Math.random() * pool.length)];
      slot.flowerId = randomFlower.id;
      slot.startTime = Date.now() - 10000;
      slot.status = 'ready';
    }
  });
};

// 初始檢查
if (getCurrentGarden().filter(s => s.status !== 'empty').length < 3) {
  seedVariety();
}

watch(state, (newState) => {
  localStorage.setItem(SAVE_KEY, JSON.stringify(newState));
}, { deep: true });

export const harvestFlower = (slotId) => {
  const garden = getCurrentGarden();
  const slot = garden[slotId];
  if (slot.status === 'ready') {
    const flowerId = slot.flowerId;
    const flower = FLOWERS.find(f => f.id === flowerId);
    if (flower) {
      state.diamonds += flower.price;
      state.inventory[flowerId] = (state.inventory[flowerId] || 0) + 1;
    }
    slot.status = 'empty';
    slot.flowerId = null;
    slot.startTime = null;
    return true;
  }
  return false;
};

export const autoSpawn = () => {
  const garden = getCurrentGarden();
  const emptySlots = garden.filter(s => s.status === 'empty');
  if (emptySlots.length === 0) return;
  
  const slot = emptySlots[Math.floor(Math.random() * emptySlots.length)];
  
  // 嚴格過濾場景花卉
  const pool = getFlowersForCurrentScene();
  // 傳說花卉只有極低機率出現
  const legendaries = FLOWERS.filter(f => f.rarity === 'Legendary');
  
  let finalPool = [...pool];
  if (Math.random() < 0.01) finalPool = [...legendaries]; // 1% 機率出現傳說

  if (finalPool.length > 0) {
    const randomFlower = finalPool[Math.floor(Math.random() * finalPool.length)];
    slot.flowerId = randomFlower.id;
    slot.startTime = Date.now();
    slot.status = 'growing';
  }
};

export const setScene = (sceneId) => {
  state.currentScene = Number(sceneId);
  if (getCurrentGarden().filter(s => s.status !== 'empty').length < 2) {
    seedVariety();
  }
};
