import { reactive, watch } from 'vue';
import { FLOWERS } from '../data/flowers';

const SAVE_KEY = 'global_flower_game_save_v6'; // 升級版本以強制重置結構

const defaultState = {
  diamonds: 1000, // 給予一些初始鑽石方便測試
  currentCountry: 'Taiwan',
  currentScene: 1,
  unlockedScenes: { 'Taiwan': [1, 2, 3, 4], 'Japan': [1, 2, 3, 4], 'Korea': [1, 2, 3, 4], 'Thailand': [1, 2, 3, 4], 'Singapore': [1, 2, 3, 4] },
  unlockedCountries: ['Taiwan'],
  visitedCount: 1,
  inventory: {},
  medals: {},
  gardens: {},
  upgrades: { spawnRate: 0.5, maxSlots: 24 },
  activeBuffs: {
    sunnyDollUntil: null,
    rainUntil: null,
    rainMultiplier: 1,
    fertilizerUntil: null,
    fertilizerMultiplier: 1
  },
  exp: 0,
  level: 1,
  inventoryItems: {}
};

import { supabase } from '../supabase';

export const WEATHER_TYPES = [
  { id: 'storm', name: '暴風雨', speed: 0.5 },
  { id: 'cloudy', name: '陰天', speed: 1.0 },
  { id: 'rainy', name: '小雨', speed: 1.1 },
  { id: 'sunny', name: '晴天', speed: 1.1 }
];
export const WEATHER_CYCLE_MS = 2 * 60 * 60 * 1000;

export const getCurrentWeather = () => {
  if (state.activeBuffs?.sunnyDollUntil && Date.now() < state.activeBuffs.sunnyDollUntil) {
    return WEATHER_TYPES[3]; // sunny
  }
  const cycleIndex = Math.floor(Date.now() / WEATHER_CYCLE_MS) % 4;
  return WEATHER_TYPES[cycleIndex];
};

export const calculateEffectiveElapsedTime = (startTime) => {
  const now = Date.now();
  if (!startTime || now <= startTime) return { growthElapsed: 0, realElapsed: 0 };

  let totalGrowthSeconds = 0;
  let cursor = startTime;

  while (cursor < now) {
    const nextWeatherBoundary = Math.ceil((cursor + 1) / WEATHER_CYCLE_MS) * WEATHER_CYCLE_MS;
    const sunnyEnd = (state.activeBuffs?.sunnyDollUntil > cursor) ? state.activeBuffs.sunnyDollUntil : Infinity;
    const rainEnd = (state.activeBuffs?.rainUntil > cursor) ? state.activeBuffs.rainUntil : Infinity;

    let nextTransition = Math.min(now, nextWeatherBoundary, sunnyEnd, rainEnd);

    let weatherSpeed = 1.0;
    if (cursor < sunnyEnd) {
      weatherSpeed = 1.1; // sunny
    } else {
      const cycleIndex = Math.floor(cursor / WEATHER_CYCLE_MS) % 4;
      weatherSpeed = WEATHER_TYPES[cycleIndex].speed;
    }

    let rainSpeed = 1.0;
    if (cursor < rainEnd) {
      rainSpeed = state.activeBuffs?.rainMultiplier || 1;
    }

    const segmentDuration = (nextTransition - cursor) / 1000;
    totalGrowthSeconds += segmentDuration * weatherSpeed * rainSpeed;

    cursor = nextTransition;
  }

  return {
    growthElapsed: totalGrowthSeconds,
    realElapsed: (now - startTime) / 1000
  };
};

export const getWitherMultiplier = () => {
  const now = Date.now();
  if (state.activeBuffs?.fertilizerUntil && now < state.activeBuffs.fertilizerUntil) {
    return state.activeBuffs?.fertilizerMultiplier || 1;
  }
  return 1;
};

// 初始化各場景花園
['Taiwan', 'Japan', 'Korea', 'Thailand', 'Singapore'].forEach(country => {
  [1, 2, 3, 4].forEach(scene => {
    defaultState.gardens[`${country}_${scene}`] = Array.from({ length: 24 }, (_, i) => ({
      id: i, flowerId: null, startTime: null, status: 'empty'
    }));
  });
});

const savedData = localStorage.getItem(SAVE_KEY);
export const state = reactive(savedData ? JSON.parse(savedData) : defaultState);

// 開發者測試用：首次載入直接給予 500 萬鑽石
if (!localStorage.getItem('dev_bonus_received_v2')) {
  state.diamonds = 5000000;
  localStorage.setItem('dev_bonus_received_v2', 'true');
}

// 兼容舊存檔：確保舊玩家具備 unlockedCountries
if (!state.unlockedCountries) {
  state.unlockedCountries = ['Taiwan'];
  state.visitedCount = 1;
  // 如果玩家的存檔正在日本，就補上解鎖狀態
  if (state.currentCountry === 'Japan') {
    state.unlockedCountries.push('Japan');
    state.visitedCount = 2;
  }
}
// 兼容舊存檔：確保新國家的 unlockedScenes 存在
['Japan', 'Korea', 'Thailand', 'Singapore'].forEach(c => {
  if (!state.unlockedScenes[c]) state.unlockedScenes[c] = [1, 2, 3, 4];
});

let currentUser = null;
let saveTimeout = null;

// 從雲端讀取存檔
export const loadStateFromCloud = async (user) => {
  currentUser = user;
  if (!user) return;

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('game_state')
      .eq('id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows returned"

    if (data && data.game_state && Object.keys(data.game_state).length > 0) {
      // 覆蓋當前狀態
      Object.assign(state, data.game_state);
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    } else {
      // 若雲端無存檔，建立一筆新資料
      await supabase.from('profiles').upsert({ id: user.id, game_state: state });
    }
  } catch (err) {
    console.error('讀取雲端存檔失敗:', err);
  }
};

// 處理登出
export const handleLogout = async () => {
  await supabase.auth.signOut();
  currentUser = null;
  Object.assign(state, defaultState); // 清空本地狀態
  localStorage.removeItem(SAVE_KEY);
};

// 精確獲取當前花園資料
export const getCurrentGarden = () => {
  const key = `${state.currentCountry}_${state.currentScene}`;
  if (!state.gardens[key]) {
    state.gardens[key] = Array.from({ length: 24 }, (_, i) => ({ id: i, flowerId: null, startTime: null, status: 'empty' }));
  }

  // 自動清理舊存檔中已不存在的花朵 (例如改過場景ID導致變更)
  state.gardens[key].forEach(slot => {
    if (slot.flowerId && !FLOWERS.some(f => f.id === slot.flowerId)) {
      slot.status = 'empty';
      slot.flowerId = null;
      slot.startTime = null;
    }
  });

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
  const garden = getCurrentGarden().slice(0, 16);
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
if (getCurrentGarden().slice(0, 16).filter(s => s.status !== 'empty').length < 3) {
  seedVariety();
}

// 監聽狀態變更並防抖存檔
watch(state, (newState) => {
  // 本地即時儲存
  localStorage.setItem(SAVE_KEY, JSON.stringify(newState));

  // 雲端防抖儲存 (延遲 3 秒)
  if (currentUser) {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(async () => {
      try {
        await supabase
          .from('profiles')
          .upsert({ id: currentUser.id, game_state: newState });
      } catch (err) {
        console.error('雲端存檔失敗:', err);
      }
    }, 3000);
  }
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
      // 增加經驗值並計算新等級 (每 1000 經驗 1 級)
      state.exp = (state.exp || 0) + Math.round(flower.price / 10);
      state.level = Math.floor(state.exp / 1000) + 1;
    }
    slot.status = 'empty';
    slot.flowerId = null;
    slot.startTime = null;
    return true;
  } else if (slot.status === 'withered') {
    // 枯萎花朵清除，無獎勵
    slot.status = 'empty';
    slot.flowerId = null;
    slot.startTime = null;
    return false;
  }
  return false;
};

// 檢查是否已解鎖某國家所有的非傳說花朵
// 檢查是否已達到該國家所有非傳說花朵銀牌 (數量 >= 20)
export const hasSilverMedalForAllCountryFlowers = (countryId) => {
  const countryFlowers = FLOWERS.filter(f => String(f.country).toLowerCase() === String(countryId).toLowerCase() && f.rarity !== 'Legendary');
  if (countryFlowers.length === 0) return false;
  return countryFlowers.every(f => (state.inventory[f.id] || 0) >= 20);
};

export const autoSpawn = () => {
  const garden = getCurrentGarden().slice(0, 16);
  const emptySlots = garden.filter(s => s.status === 'empty');
  if (emptySlots.length === 0) return;

  // 隨機抽一格
  const slot = emptySlots[Math.floor(Math.random() * emptySlots.length)];
  const pool = getFlowersForCurrentScene();
  const canSpawnLegendary = hasSilverMedalForAllCountryFlowers(state.currentCountry);
  const legendaries = FLOWERS.filter(f => f.rarity === 'Legendary' && String(f.country).toLowerCase() === String(state.currentCountry).toLowerCase());

  let finalPool = [...pool];
  
  // 隨機決定是否嘗試生成傳說 (1% 機率嘗試)
  if (canSpawnLegendary && legendaries.length > 0 && Math.random() < 0.01) {
    finalPool = [...legendaries];
  }

  if (finalPool.length > 0) {
    const getWeight = (rarity) => {
      if (rarity === 'Legendary') return 1;
      const r = parseInt(rarity) || 1;
      if (r === 1) return 100;
      if (r === 2) return 50;
      if (r === 3) return 20;
      if (r === 4) return 5;
      if (r === 5) return 1;
      return 100;
    };

    const totalWeight = finalPool.reduce((sum, flower) => sum + getWeight(flower.rarity), 0);
    let randomVal = Math.random() * totalWeight;
    let selectedFlower = finalPool[0];

    for (const flower of finalPool) {
      randomVal -= getWeight(flower.rarity);
      if (randomVal <= 0) {
        selectedFlower = flower;
        break;
      }
    }

    slot.flowerId = selectedFlower.id;
    slot.startTime = Date.now();
    slot.status = 'growing';
  }
};

export const setScene = (sceneId) => {
  state.currentScene = Number(sceneId);
  if (getCurrentGarden().slice(0, 16).filter(s => s.status !== 'empty').length < 2) {
    seedVariety();
  }
};

export const isSceneUnlocked = (country, scene) => {
  if (scene === 1) return true; // Scene 1 is always unlocked
  // To unlock scene N, we need all flowers from scene N-1 to have silver medal (qty >= 20)
  const prevSceneFlowers = FLOWERS.filter(f => String(f.country).toLowerCase() === String(country).toLowerCase() && Number(f.scene) === scene - 1);
  if (prevSceneFlowers.length === 0) return true; // fallback
  return prevSceneFlowers.every(f => (state.inventory[f.id] || 0) >= 20);
};

export const resetGame = () => {
  if (confirm("確定要重置遊戲嗎？所有花園與鑽石將歸零，此動作無法復原！")) {
    const freshState = {
      diamonds: 0,
      currentCountry: 'Taiwan',
      currentScene: 1,
      unlockedScenes: { 'Taiwan': [1, 2, 3, 4], 'Japan': [1, 2, 3, 4], 'Korea': [1, 2, 3, 4], 'Thailand': [1, 2, 3, 4], 'Singapore': [1, 2, 3, 4] },
      unlockedCountries: ['Taiwan'],
      visitedCount: 1,
      inventory: {},
      medals: {},
      gardens: {},
      upgrades: { spawnRate: 0.5, maxSlots: 24 },
      activeBuffs: { sunnyDollUntil: null, rainUntil: null, rainMultiplier: 1, fertilizerUntil: null, fertilizerMultiplier: 1 },
      exp: 0,
      level: 1,
      inventoryItems: {}
    };

    // 初始化各場景花園
    ['Taiwan', 'Japan', 'Korea', 'Thailand', 'Singapore'].forEach(country => {
      [1, 2, 3, 4].forEach(scene => {
        freshState.gardens[`${country}_${scene}`] = Array.from({ length: 24 }, (_, i) => ({
          id: i, flowerId: null, startTime: null, status: 'empty'
        }));
      });
    });

    Object.assign(state, freshState);
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));

    if (currentUser) {
      supabase.from('profiles').upsert({ id: currentUser.id, game_state: state }).then();
    }

    seedVariety();
  }
};
