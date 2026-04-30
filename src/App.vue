<script setup>
import { ref, onMounted } from 'vue';
import GardenScene from './components/GardenScene.vue';
import FlowerCatalog from './components/FlowerCatalog.vue';

const isLoading = ref(true);
const currentTab = ref('garden'); 

onMounted(() => {
  setTimeout(() => {
    isLoading.value = false;
  }, 500);
});

const setTab = (tab) => {
  currentTab.value = tab;
};
</script>

<template>
  <div class="game-container">
    <Transition name="fade">
      <div v-if="isLoading" class="loading-screen">
        <div class="loading-content">🌸 加載中...</div>
      </div>
      
      <div v-else class="game-content">
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
.game-content { height: 100%; width: 100%; }
.main-viewport { height: 100%; width: 100%; position: relative; }

.loading-screen {
  position: fixed; inset: 0; background: #fff; display: flex; align-items: center; justify-content: center;
  z-index: 10000; font-weight: 900; font-size: 2rem; color: #ff6b6b;
}

.placeholder-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.8); color: white;
  display: flex; align-items: center; justify-content: center; z-index: 5000;
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
