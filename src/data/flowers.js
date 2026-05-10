const countryModules = import.meta.glob('./countries/*.json', { eager: true });
const preferredOrder = ['Flower', 'Taiwan', 'Japan', 'Korea', 'Thailand', 'Singapore'];

const isCountryConfig = (data) => {
  return !!data
    && !Array.isArray(data)
    && typeof data.id === 'string'
    && Array.isArray(data.flowers);
};

export const COUNTRY_DATA_LIST = Object.values(countryModules)
  .map((mod) => mod.default || mod)
  .filter(isCountryConfig)
  .sort((a, b) => {
    const ai = preferredOrder.indexOf(a.id);
    const bi = preferredOrder.indexOf(b.id);
    if (ai !== -1 || bi !== -1) {
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    }
    return a.id.localeCompare(b.id);
  });

// 定義不同稀有度對應的生長時間 (單位：秒)
const RARITY_GROWTH_TIME = {
  1: 3,
  2: 3,
  3: 3,
  4: 3,
  5: 3,
  "Legendary": 3
};

// Flatten all flowers and add the 'country' property automatically, overriding growthTime
export const FLOWERS = COUNTRY_DATA_LIST.flatMap(country => 
  country.flowers.map(f => ({ 
    ...f, 
    country: country.id,
    growthTime: RARITY_GROWTH_TIME[f.rarity] || f.growthTime
  }))
);

// Aggregate country information
export const COUNTRIES = COUNTRY_DATA_LIST.map(country => ({
  id: country.id,
  name: country.name,
  flag: country.flag,
  scenes: country.scenes
}));

export const SCENE_NAMES_BY_COUNTRY = Object.fromEntries(
  COUNTRY_DATA_LIST.map(country => [country.id, country.sceneNames || []])
);

export const RARITY_LABELS = {
  "1": "Common",
  "2": "Uncommon",
  "3": "Rare",
  "4": "Epic",
  "5": "Exotic",
  "Legendary": "Legendary"
};
