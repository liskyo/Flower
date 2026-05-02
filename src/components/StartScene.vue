<script setup>
import { onMounted, ref, computed } from 'vue';
import { resetGame, state } from '../store/gameState';

const emit = defineEmits(['start']);
const isVisible = ref(false);

onMounted(() => {
  setTimeout(() => {
    isVisible.value = true;
  }, 100);
});

// 判斷玩家是否已經有遊戲進度 (依據經驗值是否大於0)
const hasSaveData = computed(() => (state.exp || 0) > 0);

// 繼續遊戲
const handleContinue = () => {
  emit('start');
};

// 選擇模式並開始新遊戲
const handleModeSelect = (mode) => {
  if (mode === 'dev') {
    const pwd = prompt("請輸入開發者密碼：");
    if (pwd !== '1234') {
      alert("密碼錯誤，無法啟用開發者模式！");
      return;
    }
  }
  // 呼叫我們在 gameState 中寫好的新版 resetGame
  resetGame(mode);
};
</script>

<template>
  <div class="start-scene" :class="{ 'visible': isVisible }">
    
    <!-- 橫向捲動背景層 (借用台灣第一關的天際線) -->
    <div class="start-bg-scroller"></div>
    
    <div class="content-wrapper">
      <div class="logo-container">
        <h1 class="main-title">Flower<br>Research<br><span class="sub-title">The World</span></h1>
      </div>
      
      <!-- 動作選單區塊 -->
      <div class="action-menu">
        <button v-if="hasSaveData" class="menu-btn continue" @click="handleContinue">
          ▶ 繼續遊戲
        </button>
        
        <button class="menu-btn player-mode" @click="handleModeSelect('player')">
          🎮 玩家模式 (新遊戲)
        </button>
        
        <button class="menu-btn dev-mode" @click="handleModeSelect('dev')">
          🛠️ 開發者模式 (新遊戲)
        </button>
      </div>
      
      <div class="version-info">
        Ver. 2.1.0
      </div>
    </div>
  </div>
</template>

<style scoped>
.start-scene {
  position: fixed; inset: 0; background-color: #87CEEB; z-index: 50; 
  opacity: 0; transition: opacity 0.8s ease-in-out; overflow: hidden; 
  display: flex; flex-direction: column; align-items: center; justify-content: center;
}
.start-scene.visible { opacity: 1; }

/* 橫向移動背景特效 */
.start-bg-scroller {
  position: absolute; top: 0; left: 0;
  width: 200%; height: 100%;
  background-image: url('/background.png'); /* 可自行更換想要的背景圖 */
  background-size: 50% 100%;
  background-repeat: repeat-x;
  animation: scrollBg 60s linear infinite;
  z-index: 0;
  opacity: 0.6; /* 稍微變淡以突顯前方 UI */
}
@keyframes scrollBg {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}

/* 前景內容層 */
.content-wrapper {
  position: relative; z-index: 10;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  width: 100%; height: 100%;
}

/* LOGO 風格 */
.logo-container {
  margin-bottom: 40px; text-align: center;
  transform: rotate(-3deg);
  animation: float 4s ease-in-out infinite;
}
.main-title {
  font-family: 'ZCOOL KuaiLe', cursive; font-size: 4rem; font-weight: 900;
  color: #ff9f43; text-shadow: 4px 4px 0 #ee5253, 8px 8px 0 #222f3e, -2px -2px 0 #fff, 2px -2px 0 #fff, -2px 2px 0 #fff, 2px 2px 0 #fff;
  line-height: 1.1; margin: 0; letter-spacing: 2px;
}
.sub-title {
  display: block; font-size: 2.5rem; color: #feca57;
  text-shadow: 3px 3px 0 #222f3e, -1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff;
  margin-top: 10px; background: #222f3e; padding: 0 15px; border-radius: 15px; border: 4px solid #fff;
}

/* 動作按鈕選單 */
.action-menu {
  display: flex; flex-direction: column; gap: 15px; align-items: center;
}
.menu-btn {
  font-family: 'Outfit', sans-serif; font-size: 1.1rem; font-weight: 900;
  padding: 12px 30px; border-radius: 50px; border: 4px solid #2d3436;
  cursor: pointer; box-shadow: 0 6px 0 #2d3436; transition: all 0.2s;
  width: 280px; text-align: center; letter-spacing: 1px;
}
.menu-btn:active {
  transform: translateY(4px); box-shadow: 0 2px 0 #2d3436;
}
.menu-btn.continue {
  background: #1dd1a1; color: #fff; text-shadow: 1px 1px 0 #2d3436;
  font-size: 1.3rem; padding: 15px 30px; margin-bottom: 10px;
  animation: pulse-btn 2s infinite;
}
.menu-btn.player-mode { background: #feca57; color: #2d3436; }
.menu-btn.dev-mode { background: #ff6b6b; color: #fff; text-shadow: 1px 1px 0 #2d3436; }

.version-info {
  position: absolute; bottom: 15px; right: 15px; font-family: monospace;
  font-size: 1.2rem; color: #2d3436; font-weight: 900; 
  background: rgba(255,255,255,0.8); padding: 4px 10px; border-radius: 10px; border: 2px solid #2d3436;
}

@keyframes float {
  0% { transform: translateY(0px) rotate(-3deg); }
  50% { transform: translateY(-15px) rotate(-1deg); }
  100% { transform: translateY(0px) rotate(-3deg); }
}
@keyframes pulse-btn {
  0% { box-shadow: 0 6px 0 #2d3436, 0 0 0 0 rgba(29, 209, 161, 0.7); }
  70% { box-shadow: 0 6px 0 #2d3436, 0 0 0 15px rgba(29, 209, 161, 0); }
  100% { box-shadow: 0 6px 0 #2d3436, 0 0 0 0 rgba(29, 209, 161, 0); }
}

@media (max-width: 600px) {
  .main-title { font-size: 3rem; }
  .sub-title { font-size: 1.8rem; }
  .menu-btn { width: 240px; font-size: 1rem; padding: 10px 20px; }
  .menu-btn.continue { font-size: 1.1rem; }
}
/* 👇 加入這段：當螢幕高度小於 500px (例如手機橫向) 時，自動縮小所有元素 */
@media (max-height: 500px) {
  .logo-container { 
    margin-bottom: 15px; 
  }
  .main-title { 
    font-size: 2.2rem; 
  }
  .sub-title { 
    font-size: 1.2rem; 
    margin-top: 5px; 
    padding: 2px 10px;
  }
  
  .action-menu { 
    gap: 8px; 
  }
  .menu-btn { 
    width: 220px; 
    font-size: 0.85rem; 
    padding: 8px 15px; 
    border-width: 3px; 
  }
  .menu-btn.continue { 
    font-size: 1rem; 
    padding: 10px 20px; 
    margin-bottom: 5px; 
  }
  .version-info {
    font-size: 0.9rem;
    padding: 2px 8px;
  }
}
</style>