export const ITEM_DEFINITIONS = {
  travelTicket: {
    id: 'travelTicket',
    name: '✈️ 出國機票',
    desc: '可在地圖免費解鎖一個未開放國家',
    type: 'travel',
    usable: false
  },
  sunnyDoll: {
    id: 'sunnyDoll',
    name: '☀️ 晴天娃娃',
    desc: '強制天氣變晴天 6 小時',
    type: 'weather',
    duration: 6,
    price: 5000,
    reqLevel: 2,
    shop: true
  },
  rain1: {
    id: 'rain1',
    name: '🌧️ 人造雨一階',
    desc: '全域生長速度 2 倍 (1小時)',
    type: 'rain',
    multi: 2,
    duration: 1,
    price: 10000,
    reqLevel: 3,
    shop: true
  },
  rain2: {
    id: 'rain2',
    name: '🌧️ 人造雨二階',
    desc: '全域生長速度 4 倍 (1小時)',
    type: 'rain',
    multi: 4,
    duration: 1,
    price: 50000,
    reqLevel: 5,
    shop: true
  },
  rain3: {
    id: 'rain3',
    name: '🌧️ 人造雨三階',
    desc: '全域生長速度 6 倍 (1小時)',
    type: 'rain',
    multi: 6,
    duration: 1,
    price: 100000,
    reqLevel: 8,
    shop: true
  },
  rain4: {
    id: 'rain4',
    name: '🌧️ 人造雨四階',
    desc: '全域生長速度 8 倍 (1小時)',
    type: 'rain',
    multi: 8,
    duration: 1,
    price: 250000,
    reqLevel: 12,
    shop: true
  },
  rain5: {
    id: 'rain5',
    name: '🌧️ 人造雨五階',
    desc: '全域生長速度 10 倍 (1小時)',
    type: 'rain',
    multi: 10,
    duration: 1,
    price: 500000,
    reqLevel: 15,
    shop: true
  },
  fert1: {
    id: 'fert1',
    name: '💩 肥料一階',
    desc: '採收數量 2 倍 (30分鐘)',
    type: 'fertilizer',
    multi: 2,
    duration: 0.5,
    price: 10000,
    reqLevel: 3,
    shop: true
  },
  fert2: {
    id: 'fert2',
    name: '💩 肥料二階',
    desc: '採收數量 2 倍 (60分鐘)',
    type: 'fertilizer',
    multi: 2,
    duration: 1,
    price: 50000,
    reqLevel: 5,
    shop: true
  },
  fert3: {
    id: 'fert3',
    name: '💩 肥料三階',
    desc: '採收數量 2 倍 (120分鐘)',
    type: 'fertilizer',
    multi: 2,
    duration: 2,
    price: 100000,
    reqLevel: 8,
    shop: true
  },
  fert4: {
    id: 'fert4',
    name: '💩 肥料四階',
    desc: '採收數量 3 倍 (60分鐘)',
    type: 'fertilizer',
    multi: 3,
    duration: 1,
    price: 250000,
    reqLevel: 12,
    shop: true
  },
  fert5: {
    id: 'fert5',
    name: '💩 肥料五階',
    desc: '採收數量 3 倍 (120分鐘)',
    type: 'fertilizer',
    multi: 3,
    duration: 2,
    price: 500000,
    reqLevel: 15,
    shop: true
  },
  star1: {
    id: 'star1',
    name: '🦋 蝴蝶燈一階',
    desc: '五星機率 2 倍 (30分鐘)',
    type: 'star',
    multi: 2,
    duration: 0.5,
    price: 15000,
    reqLevel: 4,
    shop: true
  },
  star2: {
    id: 'star2',
    name: '🦋 蝴蝶燈二階',
    desc: '五星機率 2 倍 (60分鐘)',
    type: 'star',
    multi: 2,
    duration: 1,
    price: 60000,
    reqLevel: 7,
    shop: true
  },
  star3: {
    id: 'star3',
    name: '🦋 蝴蝶燈三階',
    desc: '五星機率 2 倍 (120分鐘)',
    type: 'star',
    multi: 2,
    duration: 2,
    price: 120000,
    reqLevel: 10,
    shop: true
  },
  star4: {
    id: 'star4',
    name: '🦋 蝴蝶燈四階',
    desc: '五星機率 3 倍 (60分鐘)',
    type: 'star',
    multi: 3,
    duration: 1,
    price: 300000,
    reqLevel: 14,
    shop: true
  },
  star5: {
    id: 'star5',
    name: '🦋 蝴蝶燈五階',
    desc: '五星機率 3 倍 (120分鐘)',
    type: 'star',
    multi: 3,
    duration: 2,
    price: 600000,
    reqLevel: 16,
    shop: true
  }
};

export const SHOP_ITEMS = Object.values(ITEM_DEFINITIONS).filter(item => item.shop);
export const INVENTORY_ITEM_DEFINITIONS = Object.values(ITEM_DEFINITIONS);

export const getItemDefinition = (itemId) => ITEM_DEFINITIONS[itemId] || null;
