import { reactive, watch } from 'vue';
import { FLOWERS, COUNTRIES } from '../data/flowers';
import { DAILY_LOGIN_REWARDS, DAILY_MISSIONS, DAILY_MISSION_MILESTONES } from '../data/rewards';
import { getCatalogAchievementDefinitions } from '../data/achievements';

export { DAILY_LOGIN_REWARDS, DAILY_MISSIONS, DAILY_MISSION_MILESTONES };

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

const SAVE_KEY = 'global_flower_game_save_v6'; // 保留既有 key，透過 saveVersion 做資料 migration
const SAVE_VERSION = 2;

export const MAP_HOTSPOT_DEFAULTS = {
  Flower: { x: 50, y: 55 },
  Taiwan: { x: 56, y: 61 },
  Japan: { x: 90, y: 21 },
  Korea: { x: 64, y: 30 },
  Thailand: { x: 45, y: 68 },
  Singapore: { x: 50, y: 69 }
};

const buildUnlockedScenesDefault = () =>
  Object.fromEntries(
    COUNTRIES.map((c) => {
      const n = Math.max(1, Number(c.scenes) || 4);
      return [c.id, Array.from({ length: n }, (_, i) => i + 1)];
    })
  );

const initDefaultGardens = () => {
  const gardens = {};
  const lastSpawnTimes = {};
  COUNTRIES.forEach((country) => {
    const maxScene = Math.max(1, Number(country.scenes) || 4);
    for (let scene = 1; scene <= maxScene; scene++) {
      const key = `${country.id}_${scene}`;
      gardens[key] = Array.from({ length: 24 }, (_, i) => ({
        id: i,
        flowerId: null,
        startTime: null,
        status: 'empty'
      }));
      lastSpawnTimes[key] = Date.now();
    }
  });
  return { gardens, lastSpawnTimes };
};

const { gardens: initialGardens, lastSpawnTimes: initialLastSpawnTimes } = initDefaultGardens();

const ALL_COUNTRY_IDS = COUNTRIES.map((c) => c.id);

const ensureGardensAndSpawnsForState = (targetState) => {
  if (!targetState.gardens || typeof targetState.gardens !== 'object') {
    targetState.gardens = {};
  }
  if (!targetState.lastSpawnTimes || typeof targetState.lastSpawnTimes !== 'object') {
    targetState.lastSpawnTimes = {};
  }
  COUNTRIES.forEach((country) => {
    const maxScene = Math.max(1, Number(country.scenes) || 4);
    for (let scene = 1; scene <= maxScene; scene++) {
      const key = `${country.id}_${scene}`;
      if (!targetState.gardens[key]) {
        targetState.gardens[key] = Array.from({ length: 24 }, (_, i) => ({
          id: i,
          flowerId: null,
          startTime: null,
          status: 'empty'
        }));
      }
      if (!targetState.lastSpawnTimes[key]) {
        targetState.lastSpawnTimes[key] = Date.now();
      }
    }
  });
};

const defaultState = {
  saveVersion: SAVE_VERSION,
  isDevMode: false,
  diamonds: 1000, // 給予一些初始鑽石方便測試
  currentCountry: 'Flower',
  currentScene: 1,
  unlockedScenes: buildUnlockedScenesDefault(),
  unlockedCountries: ['Flower'],
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
    fertilizerMultiplier: 1,
    starUntil: null,     // 👇 新增星星持續時間
    starMultiplier: 1    // 👇 新增星星倍率
  },
  exp: 0,
  level: 1,
  inventoryItems: {},
  mapHotspots: JSON.parse(JSON.stringify(MAP_HOTSPOT_DEFAULTS)),
  dailyLogin: {
    cycleDay: 1,
    lastClaimPeriodKey: null,
    totalClaims: 0
  },
  dailyMissions: {
    periodKey: null,
    progress: {},
    claimedTaskIds: [],
    claimedMilestones: []
  },
  achievements: {
    claimedIds: []
  },
  lastActiveTime: Date.now(),
  lastSpawnTimes: initialLastSpawnTimes // 紀錄每個花園的獨立生成時間
};

Object.assign(defaultState.gardens, initialGardens);

import { supabase } from '../supabase';

export const WEATHER_TYPES = [
  { id: 'storm', name: '暴風雨', speed: 0.5 },
  { id: 'cloudy', name: '陰天', speed: 1.0 },
  { id: 'rainy', name: '小雨', speed: 1.1 },
  { id: 'sunny', name: '晴天', speed: 1.1 }
];
export const WEATHER_CYCLE_MS = 2 * 60 * 60 * 1000;

const getDailyLoginPeriodStart = (timestamp = Date.now()) => {
  const date = new Date(timestamp);
  date.setHours(date.getHours() - 8);
  date.setHours(8, 0, 0, 0);
  return date;
};

export const getDailyLoginPeriodKey = (timestamp = Date.now()) => {
  const periodStart = getDailyLoginPeriodStart(timestamp);
  const year = periodStart.getFullYear();
  const month = String(periodStart.getMonth() + 1).padStart(2, '0');
  const day = String(periodStart.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getNextDailyLoginResetTime = (timestamp = Date.now()) => {
  const nextReset = getDailyLoginPeriodStart(timestamp);
  nextReset.setDate(nextReset.getDate() + 1);
  return nextReset.getTime();
};

const createDailyMissionsState = (periodKey = getDailyLoginPeriodKey()) => ({
  periodKey,
  progress: {},
  claimedTaskIds: [],
  claimedMilestones: []
});

export const getDailyLoginStatus = () => {
  ensureDailyLoginState();
  const periodKey = getDailyLoginPeriodKey();
  const claimedToday = state.dailyLogin.lastClaimPeriodKey === periodKey;
  const activeDay = claimedToday
    ? (state.dailyLogin.cycleDay === 1 ? 7 : state.dailyLogin.cycleDay - 1)
    : state.dailyLogin.cycleDay;

  return {
    claimedToday,
    activeDay,
    nextResetAt: getNextDailyLoginResetTime(),
    reward: DAILY_LOGIN_REWARDS[activeDay - 1]
  };
};

const applyReward = (reward) => {
  if (reward.diamonds) state.diamonds += reward.diamonds;
  if (reward.ticket) addInventoryItem('travelTicket', reward.ticket);
  if (reward.itemId) {
    addInventoryItem(reward.itemId, reward.count || 1);
  }
};

export const getInventoryItemCount = (itemId) => {
  ensureInventoryState();
  return state.inventoryItems[itemId] || 0;
};

export const addInventoryItem = (itemId, count = 1) => {
  ensureInventoryState();
  state.inventoryItems[itemId] = (state.inventoryItems[itemId] || 0) + count;
};

export const consumeInventoryItem = (itemId, count = 1) => {
  ensureInventoryState();
  if ((state.inventoryItems[itemId] || 0) < count) return false;
  state.inventoryItems[itemId] -= count;
  if (state.inventoryItems[itemId] <= 0) delete state.inventoryItems[itemId];
  return true;
};

export const claimDailyLoginReward = () => {
  ensureDailyLoginState();
  const status = getDailyLoginStatus();
  if (status.claimedToday) return { ok: false, reason: 'claimed', status };

  applyReward(status.reward);
  state.dailyLogin.lastClaimPeriodKey = getDailyLoginPeriodKey();
  state.dailyLogin.totalClaims = (state.dailyLogin.totalClaims || 0) + 1;
  state.dailyLogin.cycleDay = status.activeDay >= 7 ? 1 : status.activeDay + 1;
  trackDailyMissionProgress('loginClaims');

  return { ok: true, reward: status.reward, status: getDailyLoginStatus() };
};

export const getDailyMissionStatus = () => {
  ensureDailyMissionState();
  const tasks = DAILY_MISSIONS.map(task => {
    const current = Math.min(state.dailyMissions.progress[task.progressKey] || 0, task.target);
    const completed = current >= task.target;
    const claimed = state.dailyMissions.claimedTaskIds.includes(task.id);
    return {
      ...task,
      current,
      completed,
      claimed,
      progressPercent: Math.min((current / task.target) * 100, 100)
    };
  });
  const claimedCount = state.dailyMissions.claimedTaskIds.length;
  const milestones = DAILY_MISSION_MILESTONES.map(milestone => ({
    ...milestone,
    unlocked: claimedCount >= milestone.count,
    claimed: state.dailyMissions.claimedMilestones.includes(milestone.count)
  }));

  return {
    periodKey: state.dailyMissions.periodKey,
    nextResetAt: getNextDailyLoginResetTime(),
    claimedCount,
    tasks,
    milestones,
    claimableTaskCount: tasks.filter(task => task.completed && !task.claimed).length,
    claimableMilestoneCount: milestones.filter(milestone => milestone.unlocked && !milestone.claimed).length
  };
};

export const getDailyMissionSummary = () => {
  const status = getDailyMissionStatus();
  return {
    claimedCount: status.claimedCount,
    claimableCount: status.claimableTaskCount + status.claimableMilestoneCount
  };
};

export const trackDailyMissionProgress = (progressKey, amount = 1) => {
  ensureDailyMissionState();
  state.dailyMissions.progress[progressKey] = (state.dailyMissions.progress[progressKey] || 0) + amount;
};

export const claimDailyMissionReward = (taskId) => {
  ensureDailyMissionState();
  const task = DAILY_MISSIONS.find(item => item.id === taskId);
  if (!task) return { ok: false, reason: 'not-found' };
  const current = state.dailyMissions.progress[task.progressKey] || 0;
  if (current < task.target) return { ok: false, reason: 'incomplete' };
  if (state.dailyMissions.claimedTaskIds.includes(taskId)) return { ok: false, reason: 'claimed' };

  applyReward(task.reward);
  state.dailyMissions.claimedTaskIds.push(taskId);
  return { ok: true, reward: task.reward, task };
};

export const claimDailyMissionMilestone = (count) => {
  ensureDailyMissionState();
  const milestone = DAILY_MISSION_MILESTONES.find(item => item.count === count);
  if (!milestone) return { ok: false, reason: 'not-found' };
  if (state.dailyMissions.claimedTaskIds.length < count) return { ok: false, reason: 'locked' };
  if (state.dailyMissions.claimedMilestones.includes(count)) return { ok: false, reason: 'claimed' };

  applyReward(milestone.reward);
  state.dailyMissions.claimedMilestones.push(count);
  return { ok: true, reward: milestone.reward, milestone };
};

export const claimAllDailyMissionRewards = () => {
  ensureDailyMissionState();
  const claimedTasks = [];
  const claimedMilestones = [];

  DAILY_MISSIONS.forEach(task => {
    const result = claimDailyMissionReward(task.id);
    if (result.ok) claimedTasks.push(result);
  });

  DAILY_MISSION_MILESTONES.forEach(milestone => {
    const result = claimDailyMissionMilestone(milestone.count);
    if (result.ok) claimedMilestones.push(result);
  });

  return {
    ok: claimedTasks.length + claimedMilestones.length > 0,
    claimedTasks,
    claimedMilestones
  };
};

export const getCatalogAchievementStatus = () => {
  ensureAchievementState();
  const definitions = getCatalogAchievementDefinitions();
  const achievements = definitions.map(achievement => {
    const current = Math.min(state.inventory[achievement.flowerId] || 0, achievement.target);
    const completed = current >= achievement.target;
    const claimed = state.achievements.claimedIds.includes(achievement.id);
    return {
      ...achievement,
      current,
      completed,
      claimed,
      progressPercent: Math.min((current / achievement.target) * 100, 100)
    };
  });

  return {
    achievements,
    total: achievements.length,
    completedCount: achievements.filter(item => item.completed).length,
    claimedCount: achievements.filter(item => item.claimed).length,
    claimableCount: achievements.filter(item => item.completed && !item.claimed).length
  };
};

export const getCatalogAchievementSummary = () => {
  const status = getCatalogAchievementStatus();
  return {
    claimableCount: status.claimableCount,
    completedCount: status.completedCount,
    total: status.total
  };
};

export const claimCatalogAchievement = (achievementId) => {
  ensureAchievementState();
  const achievement = getCatalogAchievementDefinitions().find(item => item.id === achievementId);
  if (!achievement) return { ok: false, reason: 'not-found' };
  if ((state.inventory[achievement.flowerId] || 0) < achievement.target) return { ok: false, reason: 'incomplete' };
  if (state.achievements.claimedIds.includes(achievementId)) return { ok: false, reason: 'claimed' };

  applyReward(achievement.reward);
  state.achievements.claimedIds.push(achievementId);
  return { ok: true, achievement, reward: achievement.reward };
};

export const claimAllCatalogAchievements = () => {
  ensureAchievementState();
  const claimed = [];

  getCatalogAchievementDefinitions().forEach(achievement => {
    const result = claimCatalogAchievement(achievement.id);
    if (result.ok) claimed.push(result);
  });

  return {
    ok: claimed.length > 0,
    claimed
  };
};

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

const cloneDefaultState = () => JSON.parse(JSON.stringify(defaultState));
const savedData = localStorage.getItem(SAVE_KEY);
export const state = reactive(migrateState(savedData ? JSON.parse(savedData) : cloneDefaultState()));

function migrateState(rawState) {
  const migrated = rawState || defaultState;
  const fromVersion = Number(migrated.saveVersion || 0);

  if (!migrated.inventoryItems) migrated.inventoryItems = {};

  if (fromVersion < 2 && typeof migrated.travelTickets === 'number' && migrated.travelTickets > 0) {
    migrated.inventoryItems.travelTicket = (migrated.inventoryItems.travelTicket || 0) + migrated.travelTickets;
  }

  if (typeof migrated.isDevMode !== 'boolean') {
    migrated.isDevMode = false;
  }
  if (!migrated.mapHotspots || typeof migrated.mapHotspots !== 'object') {
    migrated.mapHotspots = JSON.parse(JSON.stringify(MAP_HOTSPOT_DEFAULTS));
  }
  Object.entries(MAP_HOTSPOT_DEFAULTS).forEach(([countryId, position]) => {
    if (!migrated.mapHotspots[countryId]) {
      migrated.mapHotspots[countryId] = { ...position };
    }
  });

  delete migrated.travelTickets;
  migrated.saveVersion = SAVE_VERSION;
  return migrated;
}

function ensureInventoryState() {
  if (!state.inventoryItems) state.inventoryItems = {};
  if (typeof state.travelTickets === 'number' && state.travelTickets > 0) {
    state.inventoryItems.travelTicket = (state.inventoryItems.travelTicket || 0) + state.travelTickets;
    delete state.travelTickets;
  }
  state.saveVersion = SAVE_VERSION;
}

function ensureDailyLoginState() {
  ensureInventoryState();
  if (!state.dailyLogin) {
    state.dailyLogin = {
      cycleDay: 1,
      lastClaimPeriodKey: null,
      totalClaims: 0
    };
  }
  if (!state.dailyLogin.cycleDay || state.dailyLogin.cycleDay < 1 || state.dailyLogin.cycleDay > 7) {
    state.dailyLogin.cycleDay = 1;
  }
  if (typeof state.dailyLogin.totalClaims !== 'number') state.dailyLogin.totalClaims = 0;
}

function ensureDailyMissionState() {
  const periodKey = getDailyLoginPeriodKey();
  if (!state.dailyMissions || state.dailyMissions.periodKey !== periodKey) {
    state.dailyMissions = createDailyMissionsState(periodKey);
  }
  if (!state.dailyMissions.progress) state.dailyMissions.progress = {};
  if (!Array.isArray(state.dailyMissions.claimedTaskIds)) state.dailyMissions.claimedTaskIds = [];
  if (!Array.isArray(state.dailyMissions.claimedMilestones)) state.dailyMissions.claimedMilestones = [];
}

function ensureAchievementState() {
  if (!state.achievements) {
    state.achievements = { claimedIds: [] };
  }
  if (!Array.isArray(state.achievements.claimedIds)) state.achievements.claimedIds = [];
}

function ensureMapHotspotState() {
  if (!state.mapHotspots || typeof state.mapHotspots !== 'object') {
    state.mapHotspots = JSON.parse(JSON.stringify(MAP_HOTSPOT_DEFAULTS));
  }
  Object.entries(MAP_HOTSPOT_DEFAULTS).forEach(([countryId, position]) => {
    const current = state.mapHotspots[countryId];
    if (!current || typeof current.x !== 'number' || typeof current.y !== 'number') {
      state.mapHotspots[countryId] = { ...position };
    }
  });
}

export const updateMapHotspotPosition = (countryId, x, y) => {
  ensureMapHotspotState();
  if (!MAP_HOTSPOT_DEFAULTS[countryId]) return;

  const clamp = (value) => Math.min(100, Math.max(0, Number(value) || 0));
  state.mapHotspots[countryId] = {
    x: clamp(x),
    y: clamp(y)
  };
};

ensureDailyLoginState();
ensureDailyMissionState();
ensureAchievementState();
ensureInventoryState();
ensureMapHotspotState();

// 兼容舊存檔：確保舊玩家具備 unlockedCountries
if (!state.unlockedCountries) {
  state.unlockedCountries = ['Flower'];
  state.visitedCount = 1;
  if (state.currentCountry === 'Japan') {
    state.unlockedCountries.push('Japan');
    state.visitedCount = 2;
  }
}
// 👇 新增這行：確保 lastSpawnTimes 存在，防止讀取舊存檔時報錯
if (!state.lastSpawnTimes) {
  state.lastSpawnTimes = {};
}

// 兼容舊存檔：依各國 scenes 補齊 unlockedScenes、gardens、lastSpawnTimes
if (!state.unlockedScenes || typeof state.unlockedScenes !== 'object') {
  state.unlockedScenes = buildUnlockedScenesDefault();
}
COUNTRIES.forEach((c) => {
  const maxScene = Math.max(1, Number(c.scenes) || 4);
  const fullRange = Array.from({ length: maxScene }, (_, i) => i + 1);
  let scenes = state.unlockedScenes[c.id];
  if (!Array.isArray(scenes) || scenes.length === 0) {
    state.unlockedScenes[c.id] = [...fullRange];
  } else {
    const filtered = [...new Set(scenes.map(Number).filter((s) => s >= 1 && s <= maxScene))].sort(
      (a, b) => a - b
    );
    state.unlockedScenes[c.id] = filtered.length ? filtered : [...fullRange];
    if (!state.unlockedScenes[c.id].includes(1)) {
      state.unlockedScenes[c.id] = [1, ...state.unlockedScenes[c.id].filter((s) => s !== 1)].sort(
        (a, b) => a - b
      );
    }
  }
});
ensureGardensAndSpawnsForState(state);

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
      Object.assign(state, migrateState(data.game_state));
      ensureDailyLoginState();
      ensureDailyMissionState();
      ensureAchievementState();
      ensureInventoryState();
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
  Object.assign(state, cloneDefaultState()); // 清空本地狀態
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
    let reward = null;
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
      trackDailyMissionProgress('harvests', harvestMulti);
      trackDailyMissionProgress('diamondsEarned', flower.price * harvestMulti);
      const rarityRank = flower.rarity === 'Legendary' ? 6 : parseInt(flower.rarity) || 1;
      if (rarityRank >= 4) trackDailyMissionProgress('rareHarvests', harvestMulti);
      reward = {
        success: true,
        flowerId,
        diamonds: flower.price * harvestMulti,
        quantity: harvestMulti,
        rarity: flower.rarity,
        rarityRank
      };
    }
    slot.status = 'empty';
    slot.flowerId = null;
    slot.startTime = null;
    return reward || { success: true, flowerId, diamonds: 0, quantity: 0, rarity: null, rarityRank: 1 };
  } else if (slot.status === 'withered') {
    slot.status = 'empty';
    slot.flowerId = null;
    slot.startTime = null;
    return { success: false, withered: true };
  }
  return { success: false };
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
  const nextScene = Number(sceneId);
  if (state.currentScene !== nextScene) {
    trackDailyMissionProgress('switchScenes');
  }
  state.currentScene = nextScene;
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
    // 預先準備開發者模式的圖鑑庫存
    const devInventory = {};
    if (mode === 'dev') {
      FLOWERS.forEach(flower => {
        devInventory[flower.id] = 50;
      });
    }

    const freshState = {
      saveVersion: SAVE_VERSION,
      isDevMode: mode === 'dev',
      diamonds: mode === 'dev' ? 5000000 : 100000,
      currentCountry: 'Flower',
      currentScene: 1,
      unlockedScenes: buildUnlockedScenesDefault(),
      unlockedCountries: mode === 'dev' ? [...ALL_COUNTRY_IDS] : ['Flower'],
      visitedCount: mode === 'dev' ? ALL_COUNTRY_IDS.length : 1,
      inventory: mode === 'dev' ? devInventory : {},
      medals: {},
      gardens: {},
      upgrades: { spawnRate: 0.5, maxSlots: 24 },
      activeBuffs: { sunnyDollUntil: null, rainUntil: null, rainMultiplier: 1, fertilizerUntil: null, fertilizerMultiplier: 1, starUntil: null, starMultiplier: 1 },
      exp: mode === 'dev' ? 200000 : 0,
      level: mode === 'dev' ? 15 : 1,
      inventoryItems: mode === 'player'
        ? { 'sunnyDoll': 3, 'rain1': 3, 'fert1': 3, 'star1': 3 }
        : { travelTicket: 3 },
      mapHotspots: JSON.parse(JSON.stringify(MAP_HOTSPOT_DEFAULTS)),
      dailyLogin: {
        cycleDay: 1,
        lastClaimPeriodKey: null,
        totalClaims: 0
      },
      dailyMissions: createDailyMissionsState(),
      achievements: {
        claimedIds: []
      },
      lastActiveTime: Date.now(),
      lastSpawnTimes: {}
    };

    ensureGardensAndSpawnsForState(freshState);

    Object.assign(state, freshState);
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));

    if (currentUser) {
      supabase.from('profiles').upsert({ id: currentUser.id, game_state: state }).then();
    }

    // 💡 關鍵修正：移除了重新整理，單純回傳 true 告訴介面重置成功
    return true;
  }
  return false;
};


