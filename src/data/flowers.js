// Import each country's data
import taiwanData from './countries/taiwan.json';
import japanData from './countries/japan.json';

const countryDataList = [taiwanData, japanData];

// Flatten all flowers and add the 'country' property automatically
export const FLOWERS = countryDataList.flatMap(country => 
  country.flowers.map(f => ({ ...f, country: country.id }))
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
