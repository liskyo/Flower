import { reactive, watch } from 'vue';
import { FLOWERS } from '../data/flowers';

// --- 音效管理器 ---
const sounds = {
  // 替換成你放在 public 資料夾裡的路徑
  pop: new Audio('/assets/sounds/harvest.mp3'),
  button: new Audio('/sounds/button.wav'),
  buy: new Audio('/sounds/buy.wav'),
  error: new Audio('/sounds/error.wav'),
};

// 預設音量設定 (0.0 到 1.0)
Object.values(sounds).forEach(audio => {
  audio.volume = 0.5;
});

export const playSound = (soundName) => {
  try {
    const baseAudio = sounds[soundName];
    if (baseAudio) {
      // 👇 關鍵：複製一個全新的音效實體，讓聲音可以無限重疊！
      const clone = baseAudio.cloneNode(true);
      clone.volume = baseAudio.volume; // 繼承我們設定好的 0.5 音量

      clone.play().catch(() => { });

      // 播放完畢後自動清除分身，釋放手機記憶體
      clone.onended = () => {
        clone.remove();
      };
    }
  } catch (e) {
    console.error('音效播放失敗:', e);
  }
};

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
    starUntil: null,     // 👇 新增星星持續時間
    starMultiplier: 1    // 👇 新增星星倍率
  },
  exp: 0,
  level: 1,
  inventoryItems: {},
  lastActiveTime: Date.now(),
  lastSpawnTimes: {} // 紀錄每個花園的獨立生成時間
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

export const getCurrentSpawnMultiplier = () => {
  const weather = getCurrentWeather();
  const weatherSpeed = weather.speed;

  let rainSpeed = 1.0;
  if (state.activeBuffs?.rainUntil && Date.now() < state.activeBuffs.rainUntil) {
    rainSpeed = state.activeBuffs?.rainMultiplier || 1;
  }

  return weatherSpeed * rainSpeed;
};

export const calculateEffectiveElapsedTime = (startTime) => {
  const now = Date.now();
  if (!startTime || now <= startTime) return { growthElapsed: 0, realElapsed: 0 };

  const elapsedSeconds = (now - startTime) / 1000;
  return {
    growthElapsed: elapsedSeconds, // 生長速度現在固定為 1.0 (3秒長大)，加成移至生成間隔
    realElapsed: elapsedSeconds
  };
};

export const getWitherMultiplier = () => {
  return 1;
};

// 👇 新增這段：計算遞增式等級與進度百分比
export const getLevelInfo = (totalExp) => {
  let level = 1;
  let expNeeded = 1000;   // 1 升 2 的基礎經驗值
  let expAccumulated = 0; // 達到該等級所需的「總累計」經驗值

  while (totalExp >= expAccumulated + expNeeded) {
    expAccumulated += expNeeded;
    level++;
    // 每升一級，所需經驗值變成上一級的 1.5 倍 (你可以自由修改 1.5 這個係數)
    expNeeded = Math.floor(expNeeded * 1.5);
  }

  // 計算在當前等級裡，累積了多少經驗值
  const currentLevelExp = totalExp - expAccumulated;
  // 計算當前等級的進度條百分比
  const progressPercent = Math.min((currentLevelExp / expNeeded) * 100, 100);

  return { level, currentLevelExp, expNeeded, progressPercent };
};

// 初始化各場景花園
['Taiwan', 'Japan', 'Korea', 'Thailand', 'Singapore'].forEach(country => {
  [1, 2, 3, 4].forEach(scene => {
    const key = `${country}_${scene}`;
    defaultState.gardens[key] = Array.from({ length: 24 }, (_, i) => ({
      id: i, flowerId: null, startTime: null, status: 'empty'
    }));
    defaultState.lastSpawnTimes[key] = Date.now();
  });
});

const savedData = localStorage.getItem(SAVE_KEY);
export const state = reactive(savedData ? JSON.parse(savedData) : defaultState);


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
// 👇 新增這行：確保 lastSpawnTimes 存在，防止讀取舊存檔時報錯
if (!state.lastSpawnTimes) {
  state.lastSpawnTimes = {};
}

// 兼容舊存檔：確保新國家的 unlockedScenes 存在 (加上台灣)
['Taiwan', 'Japan', 'Korea', 'Thailand', 'Singapore'].forEach(c => {
  if (!state.unlockedScenes[c]) state.unlockedScenes[c] = [1, 2, 3, 4];
  // 確保補上計時器結構
  [1, 2, 3, 4].forEach(s => {
    const key = `${c}_${s}`;
    if (!state.lastSpawnTimes[key]) state.lastSpawnTimes[key] = Date.now();
  });
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

const getWeight = (rarity) => {
  if (rarity === 'Legendary') return 3;
  const r = parseInt(rarity) || 1;
  if (r === 1) return 100;
  if (r === 2) return 50;
  if (r === 3) return 30;
  if (r === 4) return 20;
  if (r === 5) {
    // 👇 檢查是否有無敵星星效果
    let starMulti = 1;
    if (state.activeBuffs?.starUntil && Date.now() < state.activeBuffs.starUntil) {
      starMulti = state.activeBuffs.starMultiplier || 1;
    }
    return 10 * starMulti; // 五星預設權重為 10，乘上星星倍率
  }
  return 100;
};

const seedVariety = () => {
  const garden = getCurrentGarden().slice(0, 16);
  const pool = getFlowersForCurrentScene();
  if (pool.length === 0) return;

  garden.forEach((slot, i) => {
    if (slot.status === 'empty' && i < 6) {
      // 👇 替換成權重抽取系統，修復無視機率的 Bug
      const totalWeight = pool.reduce((sum, flower) => sum + getWeight(flower.rarity), 0);
      let randomVal = Math.random() * totalWeight;
      let selectedFlower = pool[0];

      for (const flower of pool) {
        randomVal -= getWeight(flower.rarity);
        if (randomVal <= 0) {
          selectedFlower = flower;
          break;
        }
      }

      slot.flowerId = selectedFlower.id;
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
      // 👇 檢查是否有肥料效果
      let harvestMulti = 1;
      if (state.activeBuffs?.fertilizerUntil && Date.now() < state.activeBuffs.fertilizerUntil) {
        harvestMulti = state.activeBuffs.fertilizerMultiplier || 1;
      }

      // 👇 採收數量、鑽石、經驗值全部根據肥料倍率翻倍！
      state.diamonds += (flower.price * harvestMulti);
      state.inventory[flowerId] = (state.inventory[flowerId] || 0) + (1 * harvestMulti);
      state.exp = (state.exp || 0) + Math.round((flower.price * harvestMulti) / 10);
      state.level = getLevelInfo(state.exp).level;
    }
    slot.status = 'empty';
    slot.flowerId = null;
    slot.startTime = null;
    return true;
  } else if (slot.status === 'withered') {
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



export const autoSpawn = (targetCountry = null, targetScene = null) => {
  const country = targetCountry || state.currentCountry;
  const scene = targetScene || state.currentScene;
  const gardenKey = `${country}_${scene}`;

  if (!state.gardens[gardenKey]) return;
  const garden = state.gardens[gardenKey].slice(0, 16);
  const emptySlots = garden.filter(s => s.status === 'empty');
  if (emptySlots.length === 0) return;

  const slot = emptySlots[Math.floor(Math.random() * emptySlots.length)];

  // 更新該花園的最後生成時間，避免重複計算
  state.lastSpawnTimes[gardenKey] = Date.now();

  // 獲取該場景的花池
  const pool = FLOWERS.filter(f => f.country === country && (f.scene === scene || f.scene === 0) && f.rarity !== 'Legendary');

  const canSpawnLegendary = hasSilverMedalForAllCountryFlowers(country);
  const legendaries = FLOWERS.filter(f => f.rarity === 'Legendary' && String(f.country).toLowerCase() === String(country).toLowerCase());

  let finalPool = [...pool];

  if (canSpawnLegendary && legendaries.length > 0 && Math.random() < 0.01) {
    finalPool = [...legendaries];
  }

  if (finalPool.length > 0) {


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

export const catchUpSpawning = () => {
  const now = Date.now();
  const multiplier = getCurrentSpawnMultiplier();
  const intervalMs = 30000 / multiplier;

  Object.keys(state.gardens).forEach(gardenKey => {
    const [country, sceneStr] = gardenKey.split('_');
    const scene = parseInt(sceneStr);

    // 檢查國家與場景是否已解鎖
    const isCountryUnlocked = state.unlockedCountries.includes(country);
    const isSceneUnlockedNow = isSceneUnlocked(country, scene);

    if (isCountryUnlocked && isSceneUnlockedNow) {
      const lastTime = state.lastSpawnTimes[gardenKey] || state.lastActiveTime || now;
      const elapsedMs = now - lastTime;
      const numCycles = Math.floor(elapsedMs / intervalMs);

      if (numCycles > 0) {
        // 限制單次補償上限避免卡頓
        for (let i = 0; i < Math.min(numCycles, 16); i++) {
          autoSpawn(country, scene);
        }
        // 👇 修正重點：完美繼承剩餘的小數點秒數，而不是粗暴地設定為 now
        state.lastSpawnTimes[gardenKey] = lastTime + (numCycles * intervalMs);
      } else if (!state.lastSpawnTimes[gardenKey]) {
        // 確保初始值存在
        state.lastSpawnTimes[gardenKey] = now;
      }
    }
  });

  state.lastActiveTime = now;
};

export const globalTicker = reactive({ now: Date.now() });

let tickCount = 0;
// 全域背景計時器：每 0.5 秒滴答一次，驅動全域生長與補償
setInterval(() => {
  globalTicker.now = Date.now();
  tickCount++;
  // 為了效能與精準度，強制每 20 次 (約 10 秒) 執行一次計算，解決時間漂移 Bug
  if (tickCount >= 20) {
    catchUpSpawning();
    tickCount = 0;
  }
}, 500);

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

// 支援模式選擇的重置與初始化函式
export const resetGame = (mode = 'player') => {
  const confirmMsg = mode === 'dev'
    ? "即將啟用【開發者模式】。這將會覆蓋當前進度，確定要繼續嗎？"
    : "確定要重置遊戲並以【玩家模式】重新開始嗎？所有進度將歸零！";

  if (confirm(confirmMsg)) {
    const freshState = {
      // 根據模式給予初始鑽石
      diamonds: mode === 'dev' ? 5000000 : 100000,
      currentCountry: 'Taiwan',
      currentScene: 1,
      unlockedScenes: { 'Taiwan': [1, 2, 3, 4], 'Japan': [1, 2, 3, 4], 'Korea': [1, 2, 3, 4], 'Thailand': [1, 2, 3, 4], 'Singapore': [1, 2, 3, 4] },

      // 開發者模式：一次性解鎖所有國家機票
      unlockedCountries: mode === 'dev' ? ['Taiwan', 'Japan', 'Korea', 'Thailand', 'Singapore'] : ['Taiwan'],
      visitedCount: mode === 'dev' ? 5 : 1,

      inventory: {},
      medals: {},
      gardens: {},
      upgrades: { spawnRate: 0.5, maxSlots: 24 },
      activeBuffs: { sunnyDollUntil: null, rainUntil: null, rainMultiplier: 1, fertilizerUntil: null, fertilizerMultiplier: 1, starUntil: null, starMultiplier: 1 },
      exp: 0,
      level: 1,

      // 玩家模式：給予初始道具
      inventoryItems: mode === 'player' ? { 'sunnyDoll': 3, 'rain1': 3, 'fert1': 3 } : {},

      lastActiveTime: Date.now(),
      lastSpawnTimes: {}
    };

    // 初始化各場景花園
    ['Taiwan', 'Japan', 'Korea', 'Thailand', 'Singapore'].forEach(country => {
      [1, 2, 3, 4].forEach(scene => {
        const key = `${country}_${scene}`;
        freshState.gardens[key] = Array.from({ length: 24 }, (_, i) => ({
          id: i, flowerId: null, startTime: null, status: 'empty'
        }));
        freshState.lastSpawnTimes[key] = Date.now();
      });
    });

    Object.assign(state, freshState);
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));

    if (currentUser) {
      supabase.from('profiles').upsert({ id: currentUser.id, game_state: state }).then();
    }

    // ❌ 刪除這行：window.location.reload();
    // 👇 新增這行：回傳 true 代表重置成功
    return true;
  }
  // 👇 新增這行：如果玩家在 confirm 彈窗按了取消，回傳 false
  return false;
};


