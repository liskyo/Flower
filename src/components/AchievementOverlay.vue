<script setup>
import { computed, ref } from 'vue';
import {
  claimCatalogAchievement,
  getCatalogAchievementStatus
} from '../store/gameState';

const emit = defineEmits(['back']);

const selectedCategory = ref('all');

const status = computed(() => getCatalogAchievementStatus());

const categories = computed(() => {
  const base = [
    { id: 'all', name: '全部' },
    { id: 'claimable', name: '可領取' },
    { id: 'Legendary', name: '傳說' }
  ];
  const countryIds = [...new Set(status.value.achievements.map(item => item.country))];
  const names = { Taiwan: '台灣', Japan: '日本', Korea: '韓國', Thailand: '泰國', Singapore: '新加坡' };
  return [...base, ...countryIds.map(id => ({ id, name: names[id] || id }))];
});

const filteredAchievements = computed(() => {
  if (selectedCategory.value === 'all') return status.value.achievements;
  if (selectedCategory.value === 'claimable') {
    return status.value.achievements.filter(item => item.completed && !item.claimed);
  }
  if (selectedCategory.value === 'Legendary') {
    return status.value.achievements.filter(item => item.category === 'Legendary');
  }
  return status.value.achievements.filter(item => item.country === selectedCategory.value && item.category !== 'Legendary');
});

const formatNumber = (num) => new Intl.NumberFormat('en-US').format(num || 0);

const rewardText = (reward) => {
  const parts = [];
  if (reward.diamonds) parts.push(`💎 ${formatNumber(reward.diamonds)}`);
  if (reward.itemId) parts.push(`${reward.itemName} x${reward.count || 1}`);
  if (reward.ticket) parts.push(`✈️ 出國機票 x${reward.ticket}`);
  return parts.join(' + ');
};

const claim = (achievement) => {
  const result = claimCatalogAchievement(achievement.id);
  if (result.ok) {
    alert(`成就達成！獲得 ${rewardText(result.reward)}`);
  }
};
</script>

<template>
  <div class="achievement-overlay">
    <div class="shine shine-one"></div>
    <div class="shine shine-two"></div>

    <section class="achievement-panel">
      <button @click="emit('back')" class="close-btn">✕</button>

      <header class="hero">
        <div class="eyebrow">Collection Achievements</div>
        <h2>圖鑑成就</h2>
        <p>以圖鑑收集為核心。一般花朵達成金牌可領鑽石，傳說花朵從初次收集到金牌都有更高獎勵。</p>
      </header>

      <div class="summary-row">
        <div class="summary-card">
          <span>可領取</span>
          <strong>{{ status.claimableCount }}</strong>
        </div>
        <div class="summary-card">
          <span>已完成</span>
          <strong>{{ status.completedCount }} / {{ status.total }}</strong>
        </div>
        <div class="summary-card">
          <span>已領取</span>
          <strong>{{ status.claimedCount }}</strong>
        </div>
      </div>

      <div class="category-tabs">
        <button
          v-for="category in categories"
          :key="category.id"
          class="category-btn"
          :class="{ active: selectedCategory === category.id }"
          @click="selectedCategory = category.id"
        >
          {{ category.name }}
        </button>
      </div>

      <div class="achievement-list">
        <article
          v-for="achievement in filteredAchievements"
          :key="achievement.id"
          class="achievement-card"
          :class="[achievement.tier, { complete: achievement.completed, claimed: achievement.claimed }]"
        >
          <div class="medal-icon">{{ achievement.icon }}</div>
          <div class="achievement-main">
            <div class="achievement-title-row">
              <h3>{{ achievement.title }}</h3>
              <span class="tier-pill">{{ achievement.tier === 'collect' ? '收集' : achievement.tier }}</span>
            </div>
            <p>{{ achievement.desc }}</p>
            <div class="progress-line">
              <div class="progress-fill" :style="{ width: `${achievement.progressPercent}%` }"></div>
            </div>
            <div class="achievement-foot">
              <span>{{ formatNumber(achievement.current) }} / {{ formatNumber(achievement.target) }}</span>
              <strong>{{ rewardText(achievement.reward) }}</strong>
            </div>
          </div>
          <button
            class="claim-btn"
            :disabled="!achievement.completed || achievement.claimed"
            @click="claim(achievement)"
          >
            {{ achievement.claimed ? '已領取' : achievement.completed ? '領取' : '未達成' }}
          </button>
        </article>
      </div>
    </section>
  </div>
</template>

<style scoped>
.achievement-overlay {
  position: fixed;
  inset: 0;
  z-index: 8000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  color: white;
  background:
    radial-gradient(circle at 20% 18%, rgba(255, 234, 167, 0.3), transparent 32%),
    radial-gradient(circle at 86% 78%, rgba(253, 121, 168, 0.24), transparent 34%),
    linear-gradient(135deg, rgba(15, 23, 42, 0.94), rgba(70, 36, 86, 0.92));
  backdrop-filter: blur(16px);
  overflow: hidden;
}

.shine {
  position: absolute;
  width: 320px;
  height: 320px;
  border-radius: 50%;
  filter: blur(18px);
  opacity: 0.45;
  animation: floatShine 6s ease-in-out infinite alternate;
}

.shine-one { top: -100px; left: -60px; background: rgba(255, 211, 42, 0.35); }
.shine-two { right: -80px; bottom: -110px; background: rgba(116, 185, 255, 0.3); animation-delay: 1s; }

.achievement-panel {
  position: relative;
  width: min(1080px, 100%);
  max-height: 92vh;
  overflow-y: auto;
  padding: 26px;
  border-radius: 30px;
  border: 3px solid rgba(255,255,255,0.22);
  background: linear-gradient(145deg, rgba(255,255,255,0.18), rgba(255,255,255,0.06));
  box-shadow: 0 28px 80px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.26);
}

.achievement-panel::-webkit-scrollbar { width: 8px; }
.achievement-panel::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.26); border-radius: 8px; }

.close-btn {
  position: absolute;
  top: 18px;
  right: 18px;
  width: 44px;
  height: 44px;
  border: 0;
  border-radius: 50%;
  color: white;
  font-size: 1.3rem;
  font-weight: 900;
  cursor: pointer;
  background: #e74c3c;
  box-shadow: 0 5px 0 #922b21;
}

.hero { text-align: center; max-width: 720px; margin: 0 auto 16px; }
.eyebrow { color: #ffeaa7; font-weight: 900; letter-spacing: 0.22em; text-transform: uppercase; font-size: 0.75rem; }
.hero h2 { margin: 6px 0; font-size: clamp(2rem, 5vw, 3.7rem); text-shadow: 0 5px 0 rgba(0,0,0,0.24), 0 0 26px rgba(255, 234, 167, 0.42); }
.hero p { margin: 0; color: rgba(255,255,255,0.82); font-weight: 700; line-height: 1.6; }

.summary-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin: 18px 0;
}

.summary-card {
  padding: 12px 14px;
  border-radius: 18px;
  border: 2px solid rgba(255,255,255,0.16);
  background: rgba(0,0,0,0.24);
}
.summary-card span { display: block; font-size: 0.76rem; font-weight: 900; color: #dfe6e9; margin-bottom: 4px; }
.summary-card strong { color: #ffeaa7; font-size: 1.15rem; }

.category-tabs {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 10px;
  margin-bottom: 8px;
}
.category-btn {
  flex: 0 0 auto;
  border: 2px solid rgba(255,255,255,0.18);
  border-radius: 999px;
  padding: 7px 14px;
  color: white;
  font-weight: 900;
  cursor: pointer;
  background: rgba(0,0,0,0.22);
}
.category-btn.active { color: #2d3436; background: linear-gradient(180deg, #ffeaa7, #fdcb6e); border-color: #ffeaa7; }

.achievement-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.achievement-card {
  display: grid;
  grid-template-columns: 54px 1fr auto;
  align-items: center;
  gap: 12px;
  min-height: 126px;
  padding: 14px;
  border-radius: 20px;
  border: 2px solid rgba(255,255,255,0.14);
  background: rgba(0,0,0,0.24);
}
.achievement-card.complete { border-color: rgba(255, 234, 167, 0.65); box-shadow: inset 0 0 24px rgba(255, 234, 167, 0.1); }
.achievement-card.claimed { opacity: 0.7; }
.achievement-card.gold { background: linear-gradient(135deg, rgba(255, 234, 167, 0.18), rgba(0,0,0,0.22)); }
.achievement-card.silver { background: linear-gradient(135deg, rgba(223, 230, 233, 0.15), rgba(0,0,0,0.22)); }
.achievement-card.bronze { background: linear-gradient(135deg, rgba(205, 127, 50, 0.16), rgba(0,0,0,0.22)); }
.achievement-card.collect { background: linear-gradient(135deg, rgba(162, 155, 254, 0.18), rgba(0,0,0,0.22)); }

.medal-icon { font-size: 2.45rem; filter: drop-shadow(0 6px 8px rgba(0,0,0,0.35)); }
.achievement-title-row { display: flex; align-items: center; gap: 8px; }
.achievement-main h3 { margin: 0; font-size: 1rem; }
.achievement-main p { margin: 3px 0 8px; color: rgba(255,255,255,0.72); font-size: 0.78rem; font-weight: 700; }
.tier-pill {
  padding: 2px 7px;
  border-radius: 999px;
  color: #2d3436;
  background: #ffeaa7;
  font-size: 0.65rem;
  font-weight: 900;
  text-transform: uppercase;
}
.progress-line { height: 10px; border-radius: 999px; background: rgba(255,255,255,0.12); overflow: hidden; border: 1px solid rgba(255,255,255,0.16); }
.progress-fill { height: 100%; border-radius: inherit; background: linear-gradient(90deg, #fdcb6e, #ffeaa7, #55efc4); transition: width 0.25s; }
.achievement-foot { display: flex; justify-content: space-between; gap: 8px; margin-top: 7px; font-size: 0.75rem; }
.achievement-foot span { color: #dfe6e9; font-weight: 900; }
.achievement-foot strong { color: #ffeaa7; text-align: right; }

.claim-btn {
  min-width: 74px;
  padding: 9px 12px;
  border: 0;
  border-radius: 12px;
  color: #2d3436;
  font-weight: 900;
  cursor: pointer;
  background: linear-gradient(180deg, #ffeaa7, #fdcb6e);
  box-shadow: 0 4px 0 #b7791f;
}
.claim-btn:disabled {
  cursor: not-allowed;
  color: #dfe6e9;
  background: linear-gradient(180deg, #636e72, #2d3436);
  box-shadow: 0 3px 0 #111;
}

@keyframes floatShine {
  from { transform: translateY(0) scale(1); }
  to { transform: translateY(24px) scale(1.08); }
}

@media (max-width: 1024px) {
  .achievement-overlay { padding: 12px; align-items: stretch; }
  .achievement-panel { max-height: 100%; padding: 18px; border-radius: 24px; }
  .hero h2 { font-size: 2rem; }
  .hero p { font-size: 0.82rem; padding: 0 36px; }
  .summary-row { gap: 8px; }
  .summary-card { padding: 8px 10px; }
  .summary-card span { font-size: 0.66rem; }
  .summary-card strong { font-size: 0.9rem; }
  .achievement-list { gap: 8px; }
  .achievement-card { grid-template-columns: 40px 1fr auto; min-height: 108px; gap: 8px; padding: 10px; border-radius: 16px; }
  .medal-icon { font-size: 1.85rem; }
  .achievement-main h3 { font-size: 0.82rem; }
  .achievement-main p { font-size: 0.66rem; }
  .achievement-foot { font-size: 0.62rem; }
  .claim-btn { min-width: 62px; padding: 7px 8px; font-size: 0.72rem; }
}

@media (max-width: 760px) {
  .summary-row,
  .achievement-list { grid-template-columns: 1fr; }
}
</style>
