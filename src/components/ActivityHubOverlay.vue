<script setup>
import { computed } from 'vue';
import {
  getCatalogAchievementSummary,
  getDailyLoginStatus,
  getDailyMissionSummary
} from '../store/gameState';

const emit = defineEmits(['back', 'navigate']);

const dailyLoginStatus = computed(() => getDailyLoginStatus());
const dailyMissionSummary = computed(() => getDailyMissionSummary());
const achievementSummary = computed(() => getCatalogAchievementSummary());

const cards = computed(() => [
  {
    tab: 'dailyReward',
    icon: '🎁',
    title: '每日登入獎勵',
    desc: dailyLoginStatus.value.claimedToday ? '今日已領取，明日 08:00 後再來。' : `第 ${dailyLoginStatus.value.activeDay} 天獎勵可領取。`,
    badge: dailyLoginStatus.value.claimedToday ? 0 : 1,
    theme: 'reward'
  },
  {
    tab: 'dailyMission',
    icon: '📋',
    title: '每日任務',
    desc: `已領 ${dailyMissionSummary.value.claimedCount} / 10 項，完成任務可開寶箱。`,
    badge: dailyMissionSummary.value.claimableCount,
    theme: 'mission'
  },
  {
    tab: 'achievement',
    icon: '🏆',
    title: '圖鑑成就',
    desc: `已完成 ${achievementSummary.value.completedCount} / ${achievementSummary.value.total} 個圖鑑成就。`,
    badge: achievementSummary.value.claimableCount,
    theme: 'achievement'
  }
]);
</script>

<template>
  <div class="activity-overlay">
    <section class="activity-panel">
      <button @click="emit('back')" class="close-btn">✕</button>

      <header class="hero">
        <div class="eyebrow">Activity Center</div>
        <h2>活動中心</h2>
        <p>每日登入、每日任務與圖鑑成就集中管理，主畫面只保留一個活動入口。</p>
      </header>

      <div class="activity-grid">
        <button
          v-for="card in cards"
          :key="card.tab"
          class="activity-card"
          :class="card.theme"
          @click="emit('navigate', card.tab)"
        >
          <span v-if="card.badge > 0" class="badge">{{ card.badge }}</span>
          <span class="card-icon">{{ card.icon }}</span>
          <span class="card-title">{{ card.title }}</span>
          <span class="card-desc">{{ card.desc }}</span>
          <span class="card-action">前往查看</span>
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.activity-overlay {
  position: fixed; inset: 0; z-index: 8000;
  display: flex; align-items: center; justify-content: center;
  padding: 24px; color: white;
  background:
    radial-gradient(circle at 20% 20%, rgba(255, 234, 167, 0.28), transparent 30%),
    radial-gradient(circle at 82% 78%, rgba(85, 239, 196, 0.22), transparent 34%),
    linear-gradient(135deg, rgba(13, 24, 42, 0.94), rgba(48, 36, 86, 0.92));
  backdrop-filter: blur(16px);
}

.activity-panel {
  position: relative; width: min(900px, 100%);
  border: 3px solid rgba(255,255,255,0.24); border-radius: 30px;
  padding: 28px; background: linear-gradient(145deg, rgba(255,255,255,0.18), rgba(255,255,255,0.06));
  box-shadow: 0 28px 80px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.26);
}

.close-btn {
  position: absolute; top: 18px; right: 18px;
  width: 44px; height: 44px; border: 0; border-radius: 50%;
  color: white; font-size: 1.3rem; font-weight: 900; cursor: pointer;
  background: #e74c3c; box-shadow: 0 5px 0 #922b21;
}

.hero { text-align: center; margin: 0 auto 22px; max-width: 620px; }
.eyebrow { color: #ffeaa7; font-weight: 900; letter-spacing: 0.22em; text-transform: uppercase; font-size: 0.75rem; }
.hero h2 { margin: 6px 0; font-size: clamp(2rem, 5vw, 3.5rem); text-shadow: 0 5px 0 rgba(0,0,0,0.24), 0 0 26px rgba(255, 234, 167, 0.42); }
.hero p { margin: 0; color: rgba(255,255,255,0.82); font-weight: 700; line-height: 1.6; }

.activity-grid {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px;
}

.activity-card {
  position: relative; min-height: 220px; border: 2px solid rgba(255,255,255,0.18);
  border-radius: 24px; padding: 18px; color: white; cursor: pointer;
  display: flex; flex-direction: column; align-items: center; text-align: center; gap: 10px;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.22), 0 14px 30px rgba(0,0,0,0.28);
}
.activity-card.reward { background: linear-gradient(180deg, rgba(253,121,168,0.38), rgba(0,0,0,0.16)); }
.activity-card.mission { background: linear-gradient(180deg, rgba(85,239,196,0.32), rgba(0,0,0,0.16)); }
.activity-card.achievement { background: linear-gradient(180deg, rgba(255,234,167,0.36), rgba(0,0,0,0.16)); }
.activity-card:active { transform: translateY(3px); }
.badge {
  position: absolute; top: 12px; right: 12px; min-width: 24px; height: 24px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 999px; background: #ff4757; border: 3px solid white;
  color: white; font-weight: 900; font-size: 0.75rem;
}
.card-icon { font-size: 3rem; filter: drop-shadow(0 7px 10px rgba(0,0,0,0.35)); }
.card-title { font-size: 1.15rem; font-weight: 900; }
.card-desc { color: rgba(255,255,255,0.78); font-size: 0.85rem; line-height: 1.5; font-weight: 700; flex: 1; }
.card-action {
  padding: 8px 16px; border-radius: 999px; color: #2d3436;
  background: linear-gradient(180deg, #ffeaa7, #fdcb6e);
  font-weight: 900; box-shadow: 0 4px 0 #b7791f;
}

@media (max-width: 800px) {
  .activity-overlay { padding: 12px; align-items: stretch; }
  .activity-panel { padding: 18px; border-radius: 24px; overflow-y: auto; }
  .activity-grid { grid-template-columns: 1fr; }
  .activity-card { min-height: 150px; }
}
</style>
