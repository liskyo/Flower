<script setup>
import { ref, onMounted } from 'vue';
import GardenScene from './components/GardenScene.vue';
import FlowerCatalog from './components/FlowerCatalog.vue';
import AuthModal from './components/AuthModal.vue';
import StartScene from './components/StartScene.vue';
import ShopOverlay from './components/ShopOverlay.vue';
import MapOverlay from './components/MapOverlay.vue';
import { supabase } from './supabase';
import { loadStateFromCloud, handleLogout, resetGame } from './store/gameState';

const isLoading = ref(true);
const currentTab = ref('start'); 
const currentUser = ref(null);
const showAuth = ref(false);

onMounted(async () => {
  // 檢查登入狀態
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    currentUser.value = session.user;
    await loadStateFromCloud(session.user);
  }

  // 監聽登入狀態改變
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (session) {
      currentUser.value = session.user;
      await loadStateFromCloud(session.user);
    } else {
      currentUser.value = null;
    }
  });

  setTimeout(() => {
    isLoading.value = false;
  }, 500);
});

const setTab = (tab) => {
  currentTab.value = tab;
};

const handleLoginSuccess = (user) => {
  currentUser.value = user;
  showAuth.value = false;
};

const doLogout = async () => {
  if (confirm('確定要登出嗎？未同步的進度可能會遺失。')) {
    await handleLogout();
  }
};
</script>

<template>
  <div class="game-container">
    <Transition name="fade">
      <div v-if="isLoading" class="loading-screen">
        <div class="loading-content">🌸 加載中...</div>
      </div>
      
      <div v-else class="game-content">
        <!-- 會員控制按鈕 -->
        <div class="auth-control">
          <button v-if="!currentUser" @click="showAuth = true" class="auth-btn login">雲端登入</button>
          <div v-else class="user-badge">
            <span class="user-email" :title="currentUser.email">{{ currentUser.email.split('@')[0] }}</span>
            <button @click="doLogout" class="auth-btn logout">登出</button>
          </div>
          <button @click="resetGame" class="auth-btn reset">🔄 重置</button>
        </div>

        <AuthModal v-if="showAuth" @close="showAuth = false" @login-success="handleLoginSuccess" />

        <!-- 導航邏輯 -->
        <main class="main-viewport">
          <Transition name="pop" mode="out-in">
            <StartScene 
              v-if="currentTab === 'start'" 
              @start="setTab('garden')" 
            />
            <GardenScene 
              v-else-if="currentTab === 'garden'" 
              @change-tab="setTab"
            />
            <FlowerCatalog 
              v-else-if="currentTab === 'catalog'" 
              @back="currentTab = 'garden'" 
            />
            <ShopOverlay 
              v-else-if="currentTab === 'shop'" 
              @back="currentTab = 'garden'" 
            />
            <MapOverlay 
              v-else-if="currentTab === 'map'" 
              @back="currentTab = 'garden'"
              @select-country="currentTab = 'garden'"
            />
            <div v-else @click="currentTab = 'garden'" class="placeholder-overlay">
              暫未開放，點擊返回
            </div>
          </Transition>
        </main>
      </div>
    </Transition>
  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700;900&display=swap');

* { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Outfit', sans-serif; }
body { background: #000; overflow: hidden; height: 100vh; width: 100vw; }

.game-container { height: 100vh; width: 100vw; position: relative; }
.game-content { height: 100%; width: 100%; position: relative; }
.main-viewport { height: 100%; width: 100%; position: relative; }

.loading-screen {
  position: fixed; inset: 0; background: #fff; display: flex; align-items: center; justify-content: center;
  z-index: 10000; font-weight: 900; font-size: 2rem; color: #ff6b6b;
}

.placeholder-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.8); color: white;
  display: flex; align-items: center; justify-content: center; z-index: 5000;
}

/* 登入按鈕區域 */
.auth-control { position: absolute; bottom: 20px; left: 20px; z-index: 6000; display: flex; gap: 8px; }
.auth-btn {
  padding: 6px 12px; border-radius: 20px; font-weight: 900; font-size: 0.85rem;
  border: 3px solid #2d3436; cursor: pointer; box-shadow: 0 4px 0 #2d3436; color: white;
}
.auth-btn:active { transform: translateY(2px); box-shadow: 0 2px 0 #2d3436; }
.auth-btn.login { background: #3498db; }
.auth-btn.logout { background: #e74c3c; }
.auth-btn.reset { background: #e67e22; padding: 6px 10px; }

.user-badge { display: flex; align-items: center; background: rgba(255,255,255,0.8); padding: 3px 5px 3px 12px; border-radius: 20px; border: 2px solid #2d3436; }
.user-email { font-weight: 900; font-size: 0.8rem; color: #2d3436; max-width: 80px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
