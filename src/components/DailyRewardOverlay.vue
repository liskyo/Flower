<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import {
  DAILY_LOGIN_REWARDS,
  claimDailyLoginReward,
  getDailyLoginStatus,
  getInventoryItemCount
} from '../store/gameState';
import { getItemDefinition } from '../data/items';

const emit = defineEmits(['back']);

const now = ref(Date.now());
let timer = null;

const status = computed(() => {
  now.value;
  return getDailyLoginStatus();
});

const formatNumber = (num) => new Intl.NumberFormat('en-US').format(num || 0);

const formatCountdown = (targetTime) => {
  const remain = Math.max(0, targetTime - now.value);
  const hours = Math.floor(remain / 3600000);
  const minutes = Math.floor((remain % 3600000) / 60000);
  const seconds = Math.floor((remain % 60000) / 1000);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const rewardText = (reward) => {
  if (reward.diamonds) return `💎 ${formatNumber(reward.diamonds)}`;
  if (reward.ticket) return `✈️ 出國機票 x${reward.ticket}`;
  return `${reward.itemName || getItemDefinition(reward.itemId)?.name || '道具'} x${reward.count || 1}`;
};

const cardState = (day) => {
  const activeDay = status.value.activeDay;
  if (status.value.claimedToday && day === activeDay) return 'claimed-today';
  if (!status.value.claimedToday && day === activeDay) return 'available';
  return day < activeDay ? 'claimed' : 'upcoming';
};

const claimReward = () => {
  const result = claimDailyLoginReward();
  if (result.ok) {
    alert(`領取成功！獲得 ${rewardText(result.reward)}`);
  }
};

onMounted(() => {
  timer = setInterval(() => {
    now.value = Date.now();
  }, 1000);
});

onUnmounted(() => {
  clearInterval(timer);
});
</script>

<template>
  <div class="daily-overlay">
    <div class="glow-orb orb-one"></div>
    <div class="glow-orb orb-two"></div>

    <div class="reward-panel">
      <button @click="emit('back')" class="close-btn">✕</button>

      <header class="hero">
        <div class="eyebrow">Daily Bonus</div>
        <h2>每日登入獎勵</h2>
        <p>每天 08:00 重新計算，連續七天獎品越來越豪華，第七天送出國機票一張。</p>
      </header>

      <div class="summary-strip">
        <div class="summary-card">
          <span class="summary-label">今日狀態</span>
          <strong>{{ status.claimedToday ? '已領取' : `第 ${status.activeDay} 天可領` }}</strong>
        </div>
        <div class="summary-card">
          <span class="summary-label">下次重置</span>
          <strong>{{ formatCountdown(status.nextResetAt) }}</strong>
        </div>
        <div class="summary-card">
          <span class="summary-label">持有機票</span>
          <strong>✈️ {{ getInventoryItemCount('travelTicket') }}</strong>
        </div>
      </div>

      <div class="rewards-grid">
        <div
          v-for="reward in DAILY_LOGIN_REWARDS"
          :key="reward.day"
          class="reward-card"
          :class="[cardState(reward.day), { finale: reward.day === 7 }]"
        >
          <div class="day-badge">DAY {{ reward.day }}</div>
          <div class="reward-icon">{{ reward.icon }}</div>
          <h3>{{ reward.name }}</h3>
          <p>{{ reward.desc }}</p>
          <div class="reward-value">{{ rewardText(reward) }}</div>
          <div class="card-status">
            <span v-if="cardState(reward.day) === 'available'">今日可領</span>
            <span v-else-if="cardState(reward.day) === 'claimed-today'">今日已領</span>
            <span v-else-if="cardState(reward.day) === 'claimed'">本輪已領</span>
            <span v-else>即將解鎖</span>
          </div>
        </div>
      </div>

      <button
        class="claim-btn"
        :class="{ disabled: status.claimedToday }"
        :disabled="status.claimedToday"
        @click="claimReward"
      >
        {{ status.claimedToday ? `明日 08:00 後再來領取` : `領取第 ${status.activeDay} 天獎勵` }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.daily-overlay {
  position: fixed;
  inset: 0;
  z-index: 8000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 28px;
  color: white;
  background:
    radial-gradient(circle at 20% 10%, rgba(255, 209, 102, 0.32), transparent 30%),
    radial-gradient(circle at 80% 80%, rgba(116, 185, 255, 0.32), transparent 32%),
    linear-gradient(135deg, rgba(17, 24, 39, 0.92), rgba(44, 27, 74, 0.9));
  backdrop-filter: blur(16px);
  overflow: hidden;
}

.glow-orb {
  position: absolute;
  width: 260px;
  height: 260px;
  border-radius: 999px;
  filter: blur(12px);
  opacity: 0.55;
  animation: floatGlow 5s ease-in-out infinite alternate;
}

.orb-one { top: -80px; left: 8%; background: rgba(255, 211, 42, 0.28); }
.orb-two { right: 5%; bottom: -90px; background: rgba(253, 121, 168, 0.24); animation-delay: 1s; }

.reward-panel {
  position: relative;
  width: min(1080px, 100%);
  max-height: 92vh;
  overflow-y: auto;
  border: 3px solid rgba(255, 255, 255, 0.28);
  border-radius: 32px;
  padding: 28px;
  background: linear-gradient(145deg, rgba(255,255,255,0.18), rgba(255,255,255,0.06));
  box-shadow: 0 28px 80px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.25);
}

.reward-panel::-webkit-scrollbar { width: 8px; }
.reward-panel::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.25); border-radius: 8px; }

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
  background: rgba(231, 76, 60, 0.95);
  box-shadow: 0 5px 0 #922b21;
}

.close-btn:active { transform: translateY(3px); box-shadow: 0 2px 0 #922b21; }

.hero { text-align: center; margin: 4px auto 18px; max-width: 680px; }
.eyebrow { color: #ffeaa7; font-weight: 900; letter-spacing: 0.25em; text-transform: uppercase; font-size: 0.75rem; }
.hero h2 { margin: 6px 0; font-size: clamp(2rem, 5vw, 3.8rem); color: #fff; text-shadow: 0 5px 0 rgba(0,0,0,0.25), 0 0 28px rgba(255, 234, 167, 0.4); }
.hero p { margin: 0; color: rgba(255,255,255,0.82); font-weight: 700; line-height: 1.6; }

.summary-strip {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin: 18px 0 20px;
}

.summary-card {
  border: 2px solid rgba(255,255,255,0.18);
  border-radius: 18px;
  padding: 12px 14px;
  background: rgba(0,0,0,0.22);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.16);
}

.summary-label { display: block; color: #dfe6e9; font-size: 0.78rem; font-weight: 900; margin-bottom: 4px; }
.summary-card strong { color: #ffeaa7; font-size: 1.1rem; }

.rewards-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(120px, 1fr));
  gap: 12px;
}

.reward-card {
  position: relative;
  min-height: 218px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 7px;
  padding: 16px 10px;
  border: 2px solid rgba(255,255,255,0.14);
  border-radius: 22px;
  background: linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.04));
  overflow: hidden;
}

.reward-card::before {
  content: '';
  position: absolute;
  inset: -60% auto auto -60%;
  width: 120%;
  height: 120%;
  background: linear-gradient(120deg, transparent, rgba(255,255,255,0.18), transparent);
  transform: rotate(25deg);
  transition: 0.5s;
}

.reward-card.available {
  border-color: #ffeaa7;
  box-shadow: 0 0 24px rgba(255, 234, 167, 0.36), inset 0 0 22px rgba(255, 234, 167, 0.12);
  transform: translateY(-4px);
}

.reward-card.available::before { animation: shineSweep 2.2s infinite; }
.reward-card.claimed,
.reward-card.claimed-today { opacity: 0.76; filter: saturate(0.75); }
.reward-card.upcoming { opacity: 0.62; }
.reward-card.finale {
  background: linear-gradient(180deg, rgba(255, 211, 42, 0.26), rgba(253, 121, 168, 0.12));
  border-color: rgba(255, 234, 167, 0.55);
}

.day-badge {
  align-self: flex-start;
  border-radius: 999px;
  padding: 3px 9px;
  background: rgba(0,0,0,0.34);
  color: #ffeaa7;
  font-weight: 900;
  font-size: 0.7rem;
}

.reward-icon { font-size: 3rem; filter: drop-shadow(0 6px 8px rgba(0,0,0,0.35)); }
.reward-card h3 { margin: 0; font-size: 1rem; color: white; text-shadow: 0 2px 4px rgba(0,0,0,0.5); }
.reward-card p { margin: 0; min-height: 34px; color: rgba(255,255,255,0.72); font-size: 0.75rem; line-height: 1.45; font-weight: 700; }
.reward-value { margin-top: auto; color: #ffeaa7; font-weight: 900; font-size: 0.9rem; }

.card-status {
  width: 100%;
  padding: 6px;
  border-radius: 10px;
  background: rgba(0,0,0,0.28);
  color: white;
  font-size: 0.72rem;
  font-weight: 900;
}

.available .card-status { background: linear-gradient(90deg, #f39c12, #e84393); }

.claim-btn {
  display: block;
  width: min(520px, 100%);
  margin: 22px auto 0;
  padding: 15px 24px;
  border: 0;
  border-radius: 999px;
  color: #2d3436;
  font-size: 1.12rem;
  font-weight: 900;
  cursor: pointer;
  background: linear-gradient(180deg, #ffeaa7, #fdcb6e);
  box-shadow: 0 7px 0 #b7791f, 0 0 28px rgba(255, 234, 167, 0.35);
}

.claim-btn:active:not(.disabled) { transform: translateY(4px); box-shadow: 0 3px 0 #b7791f; }
.claim-btn.disabled {
  cursor: not-allowed;
  color: #dfe6e9;
  background: linear-gradient(180deg, #636e72, #2d3436);
  box-shadow: 0 5px 0 #111;
}

@keyframes shineSweep {
  0% { transform: translateX(-60%) rotate(25deg); }
  100% { transform: translateX(190%) rotate(25deg); }
}

@keyframes floatGlow {
  from { transform: translateY(0) scale(1); }
  to { transform: translateY(26px) scale(1.08); }
}

@media (max-width: 1024px) {
  .daily-overlay { padding: 12px; align-items: stretch; }
  .reward-panel { max-height: 100%; padding: 18px; border-radius: 24px; }
  .hero h2 { font-size: 2rem; }
  .hero p { font-size: 0.82rem; padding: 0 40px; }
  .summary-strip { grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .summary-card { padding: 8px 10px; }
  .summary-label { font-size: 0.68rem; }
  .summary-card strong { font-size: 0.9rem; }
  .rewards-grid { grid-template-columns: repeat(4, 1fr); gap: 8px; }
  .reward-card { min-height: 168px; border-radius: 16px; padding: 10px 7px; gap: 4px; }
  .reward-icon { font-size: 2.15rem; }
  .reward-card h3 { font-size: 0.82rem; }
  .reward-card p { font-size: 0.66rem; min-height: 28px; }
  .reward-value { font-size: 0.72rem; }
  .card-status { padding: 4px; font-size: 0.62rem; }
  .claim-btn { margin-top: 14px; padding: 11px 16px; font-size: 0.95rem; }
}

@media (max-width: 700px) {
  .summary-strip { grid-template-columns: 1fr; }
  .rewards-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>
