// Import each country's data
import taiwanData from './countries/taiwan.json';
import japanData from './countries/japan.json';
import koreaData from './countries/korea.json';
import thailandData from './countries/thailand.json';
import singaporeData from './countries/singapore.json';

const countryDataList = [taiwanData, japanData, koreaData, thailandData, singaporeData];

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
export const FLOWERS = countryDataList.flatMap(country => 
  country.flowers.map(f => ({ 
    ...f, 
    country: country.id,
    growthTime: RARITY_GROWTH_TIME[f.rarity] || f.growthTime
  }))
);

// Aggregate country information
export const COUNTRIES = countryDataList.map(country => ({
  id: country.id,
  name: country.name,
  flag: country.flag,
  scenes: country.scenes
}));

export const RARITY_LABELS = {
  "1": "Common",
  "2": "Uncommon",
  "3": "Rare",
  "4": "Epic",
  "5": "Exotic",
  "Legendary": "Legendary"
};
