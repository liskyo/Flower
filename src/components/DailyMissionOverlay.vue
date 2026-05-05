<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import {
  claimAllDailyMissionRewards,
  claimDailyMissionMilestone,
  claimDailyMissionReward,
  getDailyMissionStatus
} from '../store/gameState';
import { getItemDefinition } from '../data/items';

const emit = defineEmits(['back']);

const now = ref(Date.now());
let timer = null;

const status = computed(() => {
  now.value;
  return getDailyMissionStatus();
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
  const parts = [];
  if (reward.diamonds) parts.push(`💎 ${formatNumber(reward.diamonds)}`);
  if (reward.itemId) parts.push(`${reward.itemName || getItemDefinition(reward.itemId)?.name || '道具'} x${reward.count || 1}`);
  if (reward.ticket) parts.push(`✈️ 出國機票 x${reward.ticket}`);
  return parts.join(' + ');
};

const claimTask = (task) => {
  const result = claimDailyMissionReward(task.id);
  if (result.ok) alert(`任務完成！獲得 ${rewardText(result.reward)}`);
};

const claimMilestone = (milestone) => {
  const result = claimDailyMissionMilestone(milestone.count);
  if (result.ok) alert(`${milestone.name} 開啟成功！獲得 ${rewardText(result.reward)}`);
};

const claimAll = () => {
  const result = claimAllDailyMissionRewards();
  if (result.ok) {
    alert(`一鍵領取完成！共領取 ${result.claimedTasks.length} 個任務與 ${result.claimedMilestones.length} 個寶箱。`);
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
  <div class="mission-overlay">
    <div class="sparkle sparkle-one"></div>
    <div class="sparkle sparkle-two"></div>

    <section class="mission-panel">
      <button @click="emit('back')" class="close-btn">✕</button>

      <header class="mission-hero">
        <div class="eyebrow">Daily Quest Board</div>
        <h2>每日任務</h2>
        <p>每日 08:00 重置任務。完成越多，任務獎勵與累積寶箱越豪華。</p>
      </header>

      <div class="mission-summary">
        <div class="summary-card">
          <span>已領任務</span>
          <strong>{{ status.claimedCount }} / 10</strong>
        </div>
        <div class="summary-card hot">
          <span>可領獎勵</span>
          <strong>{{ status.claimableTaskCount + status.claimableMilestoneCount }}</strong>
        </div>
        <div class="summary-card">
          <span>重置倒數</span>
          <strong>{{ formatCountdown(status.nextResetAt) }}</strong>
        </div>
      </div>

      <button
        class="claim-all-btn"
        :disabled="status.claimableTaskCount + status.claimableMilestoneCount === 0"
        @click="claimAll"
      >
        一鍵領取全部可領獎勵
      </button>

      <div class="milestone-row">
        <button
          v-for="milestone in status.milestones"
          :key="milestone.count"
          class="milestone-card"
          :class="{ unlocked: milestone.unlocked, claimed: milestone.claimed }"
          :disabled="!milestone.unlocked || milestone.claimed"
          @click="claimMilestone(milestone)"
        >
          <span class="milestone-icon">{{ milestone.icon }}</span>
          <span class="milestone-name">{{ milestone.name }}</span>
          <span class="milestone-goal">完成 {{ milestone.count }} 項</span>
          <span class="milestone-reward">{{ rewardText(milestone.reward) }}</span>
        </button>
      </div>

      <div class="tasks-grid">
        <article
          v-for="(task, index) in status.tasks"
          :key="task.id"
          class="task-card"
          :class="{ complete: task.completed, claimed: task.claimed }"
        >
          <div class="task-rank">#{{ index + 1 }}</div>
          <div class="task-icon">{{ task.icon }}</div>
          <div class="task-content">
            <h3>{{ task.title }}</h3>
            <p>{{ task.desc }}</p>
            <div class="progress-line">
              <div class="progress-fill" :style="{ width: `${task.progressPercent}%` }"></div>
            </div>
            <div class="task-foot">
              <span>{{ formatNumber(task.current) }} / {{ formatNumber(task.target) }}</span>
              <strong>{{ rewardText(task.reward) }}</strong>
            </div>
          </div>
          <button
            class="claim-btn"
            :disabled="!task.completed || task.claimed"
            @click="claimTask(task)"
          >
            {{ task.claimed ? '已領取' : task.completed ? '領取' : '進行中' }}
          </button>
        </article>
      </div>
    </section>
  </div>
</template>

<style scoped>
.mission-overlay {
  position: fixed;
  inset: 0;
  z-index: 8000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  color: white;
  background:
    radial-gradient(circle at 18% 12%, rgba(72, 219, 251, 0.28), transparent 28%),
    radial-gradient(circle at 86% 78%, rgba(255, 107, 107, 0.28), transparent 34%),
    linear-gradient(135deg, rgba(10, 20, 38, 0.94), rgba(44, 30, 71, 0.92));
  backdrop-filter: blur(16px);
  overflow: hidden;
}

.sparkle {
  position: absolute;
  width: 300px;
  height: 300px;
  border-radius: 50%;
  opacity: 0.45;
  filter: blur(18px);
  animation: drift 6s ease-in-out infinite alternate;
}

.sparkle-one { left: -80px; top: -100px; background: rgba(255, 234, 167, 0.35); }
.sparkle-two { right: -70px; bottom: -90px; background: rgba(162, 155, 254, 0.32); animation-delay: 1.2s; }

.mission-panel {
  position: relative;
  width: min(1120px, 100%);
  max-height: 92vh;
  overflow-y: auto;
  padding: 26px;
  border-radius: 30px;
  border: 3px solid rgba(255,255,255,0.22);
  background: linear-gradient(145deg, rgba(255,255,255,0.18), rgba(255,255,255,0.06));
  box-shadow: 0 28px 80px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.26);
}

.mission-panel::-webkit-scrollbar { width: 8px; }
.mission-panel::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.26); border-radius: 8px; }

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

.close-btn:active { transform: translateY(3px); box-shadow: 0 2px 0 #922b21; }

.mission-hero { text-align: center; max-width: 680px; margin: 0 auto 16px; }
.eyebrow { color: #74b9ff; font-weight: 900; letter-spacing: 0.22em; text-transform: uppercase; font-size: 0.75rem; }
.mission-hero h2 { margin: 6px 0; font-size: clamp(2rem, 5vw, 3.7rem); color: #fff; text-shadow: 0 5px 0 rgba(0,0,0,0.24), 0 0 26px rgba(116, 185, 255, 0.42); }
.mission-hero p { margin: 0; color: rgba(255,255,255,0.82); font-weight: 700; line-height: 1.6; }

.mission-summary {
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
.summary-card.hot { border-color: rgba(255, 234, 167, 0.55); box-shadow: 0 0 18px rgba(255, 234, 167, 0.18); }
.claim-all-btn {
  display: block; width: min(420px, 100%); margin: -4px auto 16px;
  padding: 12px 18px; border: 0; border-radius: 999px;
  color: #2d3436; font-weight: 900; cursor: pointer;
  background: linear-gradient(180deg, #ffeaa7, #fdcb6e);
  box-shadow: 0 5px 0 #b7791f;
}
.claim-all-btn:disabled {
  cursor: not-allowed; color: #dfe6e9;
  background: linear-gradient(180deg, #636e72, #2d3436);
  box-shadow: 0 3px 0 #111;
}

.milestone-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 18px;
}

.milestone-card {
  min-height: 118px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
  justify-content: center;
  border: 2px solid rgba(255,255,255,0.14);
  border-radius: 20px;
  color: white;
  background: linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.04));
  cursor: pointer;
  transition: 0.18s;
}

.milestone-card.unlocked {
  border-color: #ffeaa7;
  box-shadow: 0 0 22px rgba(255, 234, 167, 0.28);
  background: linear-gradient(180deg, rgba(255, 234, 167, 0.22), rgba(253, 121, 168, 0.12));
}

.milestone-card.claimed { opacity: 0.62; filter: grayscale(0.7); cursor: default; }
.milestone-card:disabled:not(.claimed) { opacity: 0.56; cursor: not-allowed; }
.milestone-icon { font-size: 2rem; }
.milestone-name { font-weight: 900; }
.milestone-goal { color: #dfe6e9; font-size: 0.75rem; font-weight: 800; }
.milestone-reward { color: #ffeaa7; font-size: 0.72rem; font-weight: 900; text-align: center; line-height: 1.35; }

.tasks-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.task-card {
  position: relative;
  display: grid;
  grid-template-columns: 44px 1fr auto;
  gap: 12px;
  align-items: center;
  min-height: 128px;
  padding: 14px;
  border-radius: 20px;
  border: 2px solid rgba(255,255,255,0.12);
  background: rgba(0,0,0,0.24);
  overflow: hidden;
}

.task-card.complete {
  border-color: rgba(85, 239, 196, 0.6);
  box-shadow: inset 0 0 24px rgba(85, 239, 196, 0.08);
}

.task-card.claimed { opacity: 0.74; }
.task-rank { position: absolute; top: 10px; right: 12px; color: rgba(255,255,255,0.3); font-weight: 900; }
.task-icon { font-size: 2.3rem; filter: drop-shadow(0 5px 8px rgba(0,0,0,0.35)); }
.task-content h3 { margin: 0 0 3px; font-size: 1rem; color: white; }
.task-content p { margin: 0 0 8px; color: rgba(255,255,255,0.72); font-size: 0.78rem; font-weight: 700; }
.progress-line { height: 10px; border-radius: 999px; background: rgba(255,255,255,0.12); overflow: hidden; border: 1px solid rgba(255,255,255,0.16); }
.progress-fill { height: 100%; border-radius: inherit; background: linear-gradient(90deg, #55efc4, #74b9ff, #ffeaa7); transition: width 0.25s; }
.task-foot { display: flex; justify-content: space-between; gap: 8px; margin-top: 7px; font-size: 0.75rem; }
.task-foot span { color: #dfe6e9; font-weight: 900; }
.task-foot strong { color: #ffeaa7; text-align: right; }

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

@keyframes drift {
  from { transform: translateY(0) scale(1); }
  to { transform: translateY(24px) scale(1.08); }
}

@media (max-width: 1024px) {
  .mission-overlay { padding: 12px; align-items: stretch; }
  .mission-panel { max-height: 100%; padding: 18px; border-radius: 24px; }
  .mission-hero h2 { font-size: 2rem; }
  .mission-hero p { font-size: 0.82rem; padding: 0 40px; }
  .mission-summary { gap: 8px; }
  .summary-card { padding: 8px 10px; }
  .summary-card span { font-size: 0.66rem; }
  .summary-card strong { font-size: 0.9rem; }
  .milestone-row { grid-template-columns: repeat(4, 1fr); gap: 8px; }
  .milestone-card { min-height: 96px; border-radius: 16px; padding: 8px; }
  .milestone-icon { font-size: 1.55rem; }
  .milestone-name { font-size: 0.78rem; }
  .milestone-goal, .milestone-reward { font-size: 0.62rem; }
  .tasks-grid { gap: 8px; }
  .task-card { grid-template-columns: 34px 1fr auto; min-height: 112px; gap: 8px; padding: 10px; border-radius: 16px; }
  .task-icon { font-size: 1.8rem; }
  .task-content h3 { font-size: 0.82rem; }
  .task-content p { font-size: 0.66rem; margin-bottom: 6px; }
  .task-foot { font-size: 0.62rem; }
  .claim-btn { min-width: 62px; padding: 7px 8px; font-size: 0.72rem; }
}

@media (max-width: 760px) {
  .mission-summary,
  .milestone-row,
  .tasks-grid { grid-template-columns: 1fr; }
}
</style>
