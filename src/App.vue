<script setup>
import { ref, onMounted } from 'vue';
import GardenScene from './components/GardenScene.vue';
import FlowerCatalog from './components/FlowerCatalog.vue';
import AuthModal from './components/AuthModal.vue';
import { supabase } from './supabase';
import { loadStateFromCloud, handleLogout } from './store/gameState';

const isLoading = ref(true);
const currentTab = ref('garden'); 
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
          <button v-if="!currentUser" @click="showAuth = true" class="auth-btn login-btn">雲端登入</button>
          <div v-else class="user-badge">
            <span class="user-email" :title="currentUser.email">{{ currentUser.email.split('@')[0] }}</span>
            <button @click="doLogout" class="auth-btn logout-btn">登出</button>
          </div>
        </div>

        <AuthModal v-if="showAuth" @close="showAuth = false" @login-success="handleLoginSuccess" />

        <!-- 導航邏輯：將 Tab 傳遞給 Scene 內部渲染，確保 UI 不消失 -->
        <main class="main-viewport">
          <Transition name="pop" mode="out-in">
            <GardenScene 
              v-if="currentTab === 'garden'" 
              @change-tab="setTab"
            />
            <FlowerCatalog 
              v-else-if="currentTab === 'catalog'" 
              @back="currentTab = 'garden'" 
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
.auth-control { position: absolute; top: 10px; left: 10px; z-index: 6000; }
.auth-btn { background: #3498db; color: #fff; border: 2px solid #2980b9; padding: 5px 12px; border-radius: 20px; font-weight: 900; font-size: 0.8rem; cursor: pointer; box-shadow: 0 3px 0 #2980b9; transition: transform 0.1s; }
.auth-btn:active { transform: translateY(2px); box-shadow: 0 1px 0 #2980b9; }
.auth-btn.logout-btn { background: #e74c3c; border-color: #c0392b; box-shadow: 0 3px 0 #c0392b; margin-left: 5px; }
.auth-btn.logout-btn:active { box-shadow: 0 1px 0 #c0392b; }
.user-badge { display: flex; align-items: center; background: rgba(255,255,255,0.8); padding: 3px 5px 3px 12px; border-radius: 20px; border: 2px solid #2d3436; }
.user-email { font-weight: 900; font-size: 0.8rem; color: #2d3436; max-width: 80px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
