import { FLOWERS } from './flowers';

export const ACHIEVEMENT_COUNTRY_NAMES = {
  Taiwan: '台灣',
  Japan: '日本',
  Korea: '韓國',
  Thailand: '泰國',
  Singapore: '新加坡'
};

const getRarityRank = (rarity) => rarity === 'Legendary' ? 6 : parseInt(rarity) || 1;

const getNormalGoldReward = (flower) => ({
  diamonds: 8000 + (getRarityRank(flower.rarity) * 6000)
});

export const getCatalogAchievementDefinitions = () => {
  return FLOWERS.flatMap(flower => {
    const countryName = ACHIEVEMENT_COUNTRY_NAMES[flower.country] || flower.country;

    if (flower.rarity === 'Legendary') {
      return [
        {
          id: `${flower.id}_legend_collect`,
          flowerId: flower.id,
          country: flower.country,
          category: 'Legendary',
          tier: 'collect',
          icon: '🌟',
          title: `${flower.name} 初次邂逅`,
          desc: `收集 1 朵 ${countryName} 傳說花朵`,
          target: 1,
          reward: { diamonds: 50000 }
        },
        {
          id: `${flower.id}_legend_bronze`,
          flowerId: flower.id,
          country: flower.country,
          category: 'Legendary',
          tier: 'bronze',
          icon: '🥉',
          title: `${flower.name} 銅牌典藏`,
          desc: '傳說花朵達成銅牌採收數',
          target: 10,
          reward: { diamonds: 120000 }
        },
        {
          id: `${flower.id}_legend_silver`,
          flowerId: flower.id,
          country: flower.country,
          category: 'Legendary',
          tier: 'silver',
          icon: '🥈',
          title: `${flower.name} 銀牌珍藏`,
          desc: '傳說花朵達成銀牌採收數',
          target: 20,
          reward: { diamonds: 250000 }
        },
        {
          id: `${flower.id}_legend_gold`,
          flowerId: flower.id,
          country: flower.country,
          category: 'Legendary',
          tier: 'gold',
          icon: '🥇',
          title: `${flower.name} 金牌傳說`,
          desc: '傳說花朵達成金牌採收數',
          target: 50,
          reward: { diamonds: 500000, itemId: 'travelTicket', count: 1 }
        }
      ];
    }

    return [{
      id: `${flower.id}_gold`,
      flowerId: flower.id,
      country: flower.country,
      category: flower.country,
      tier: 'gold',
      icon: '🥇',
      title: `${flower.name} 金牌圖鑑`,
      desc: `${countryName}圖鑑金牌成就`,
      target: 50,
      reward: getNormalGoldReward(flower)
    }];
  });
};
