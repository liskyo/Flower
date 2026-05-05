export const DAILY_LOGIN_REWARDS = [
  { day: 1, icon: '💎', name: '鑽石雨露', desc: '補充旅行基金', diamonds: 2000 },
  { day: 2, icon: '☀️', name: '晴天娃娃', desc: '強制晴天 6 小時', itemId: 'sunnyDoll', count: 1 },
  { day: 3, icon: '💎', name: '閃耀鑽石袋', desc: '更豐厚的鑽石', diamonds: 6000 },
  { day: 4, icon: '🌧️', name: '人造雨一階', desc: '生成效率加速道具', itemId: 'rain1', count: 1 },
  { day: 5, icon: '💎', name: '皇家鑽石箱', desc: '大量鑽石獎勵', diamonds: 12000 },
  { day: 6, icon: '⭐', name: '無敵星星一階', desc: '提高五星花出現率', itemId: 'star1', count: 1 },
  { day: 7, icon: '✈️', name: '出國機票', desc: '免費解鎖下一個國家一次', itemId: 'travelTicket', count: 1 }
];

export const DAILY_MISSIONS = [
  { id: 'loginReward', icon: '🎁', title: '晨光簽到', desc: '領取每日登入獎勵 1 次', progressKey: 'loginClaims', target: 1, reward: { diamonds: 1500 } },
  { id: 'harvest5', icon: '🌷', title: '採花暖身', desc: '採收 5 朵花', progressKey: 'harvests', target: 5, reward: { diamonds: 2500 } },
  { id: 'switchScene3', icon: '🧭', title: '花園巡禮', desc: '切換場景 3 次', progressKey: 'switchScenes', target: 3, reward: { itemId: 'sunnyDoll', count: 1 } },
  { id: 'buyItem1', icon: '🛒', title: '補給採買', desc: '在商店購買 1 個道具', progressKey: 'purchases', target: 1, reward: { diamonds: 4500 } },
  { id: 'useItem1', icon: '✨', title: '道具實戰', desc: '使用 1 個道具', progressKey: 'usedItems', target: 1, reward: { itemId: 'rain1', count: 1 } },
  { id: 'earn10000', icon: '💎', title: '閃耀收成', desc: '透過採收獲得 10,000 鑽石', progressKey: 'diamondsEarned', target: 10000, reward: { diamonds: 7000 } },
  { id: 'harvest25', icon: '🌺', title: '熟練花匠', desc: '採收 25 朵花', progressKey: 'harvests', target: 25, reward: { itemId: 'fert1', count: 2 } },
  { id: 'rare3', icon: '💐', title: '珍稀尋花', desc: '採收 3 朵四星以上花朵', progressKey: 'rareHarvests', target: 3, reward: { diamonds: 12000 } },
  { id: 'travel1', icon: '🛫', title: '旅行足跡', desc: '前往或解鎖其他國家 1 次', progressKey: 'travels', target: 1, reward: { itemId: 'star1', count: 1 } },
  { id: 'harvest50', icon: '👑', title: '今日花王', desc: '採收 50 朵花', progressKey: 'harvests', target: 50, reward: { diamonds: 18000, itemId: 'star1', count: 1 } }
];

export const DAILY_MISSION_MILESTONES = [
  { count: 1, icon: '🥉', name: '青銅寶箱', reward: { diamonds: 3000 } },
  { count: 4, icon: '🥈', name: '白銀寶箱', reward: { itemId: 'rain2', count: 1 } },
  { count: 7, icon: '🥇', name: '黃金寶箱', reward: { diamonds: 20000, itemId: 'fert2', count: 1 } },
  { count: 10, icon: '🏆', name: '傳說寶箱', reward: { diamonds: 50000, itemId: 'star2', count: 1 } }
];
