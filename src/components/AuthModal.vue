<script setup>
import { ref } from 'vue';
import { supabase } from '../supabase';

const emit = defineEmits(['close', 'login-success']);

const isLoginMode = ref(true);
const email = ref('');
const password = ref('');
const errorMessage = ref('');
const isLoading = ref(false);

const toggleMode = () => {
  isLoginMode.value = !isLoginMode.value;
  errorMessage.value = '';
};

const handleAuth = async () => {
  if (!email.value || !password.value) {
    errorMessage.value = '請輸入信箱與密碼';
    return;
  }

  isLoading.value = true;
  errorMessage.value = '';

  try {
    if (isLoginMode.value) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.value,
        password: password.value,
      });
      if (error) throw error;
      emit('login-success', data.user);
    } else {
      const { data, error } = await supabase.auth.signUp({
        email: email.value,
        password: password.value,
      });
      if (error) throw error;
      
      // 若需要驗證信箱，會回傳 user 但可能尚未完全登入
      if (data.user && data.user.identities && data.user.identities.length === 0) {
          errorMessage.value = '此信箱已被註冊。';
          return;
      }

      // 如果註冊成功且不需驗證，或者需驗證提示
      alert('註冊成功！如果需要驗證，請至信箱收取確認信，或直接登入。');
      isLoginMode.value = true;
    }
  } catch (err) {
    errorMessage.value = err.message || '發生錯誤，請重試。';
    if (errorMessage.value === 'Invalid login credentials') {
        errorMessage.value = '帳號或密碼錯誤。';
    }
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <div class="auth-overlay" @click.self="emit('close')">
    <div class="auth-modal">
      <h2>{{ isLoginMode ? '研究員登入' : '註冊新研究員' }}</h2>
      
      <form @submit.prevent="handleAuth" class="auth-form">
        <div class="input-group">
          <label>電子信箱</label>
          <input type="email" v-model="email" required placeholder="name@example.com" />
        </div>
        
        <div class="input-group">
          <label>密碼</label>
          <input type="password" v-model="password" required placeholder="至少 6 個字元" minlength="6" />
        </div>

        <div v-if="errorMessage" class="error-message">{{ errorMessage }}</div>

        <button type="submit" class="submit-btn" :disabled="isLoading">
          {{ isLoading ? '處理中...' : (isLoginMode ? '登入' : '註冊') }}
        </button>
      </form>

      <div class="toggle-mode">
        <button type="button" class="text-btn" @click="toggleMode">
          {{ isLoginMode ? '還沒有帳號？點此註冊' : '已有帳號？點此登入' }}
        </button>
      </div>
      
      <button class="close-btn" @click="emit('close')">✕</button>
    </div>
  </div>
</template>

<style scoped>
.auth-overlay {
  position: fixed; inset: 0; z-index: 7000; background: rgba(0,0,0,0.8);
  display: flex; align-items: center; justify-content: center;
}
.auth-modal {
  width: 90vw; max-width: 360px; background: #fdf5e6;
  border: 4px solid #2d3436; border-radius: 12px; padding: 25px 20px;
  position: relative; box-shadow: 0 10px 0 #2d3436;
}

h2 {
  text-align: center; color: #580f75; margin-top: 0; margin-bottom: 20px;
  font-family: 'ZCOOL KuaiLe', cursive; font-size: 1.5rem;
  letter-spacing: 2px;
}

.auth-form { display: flex; flex-direction: column; gap: 15px; }

.input-group { display: flex; flex-direction: column; gap: 5px; }
.input-group label { font-size: 0.85rem; font-weight: 900; color: #2d3436; }
.input-group input {
  padding: 10px; border: 2px solid #2d3436; border-radius: 6px;
  font-size: 1rem; outline: none; background: #fff;
}
.input-group input:focus { border-color: #c87a27; }

.error-message { color: #e74c3c; font-size: 0.8rem; font-weight: 900; text-align: center; }

.submit-btn {
  background: #c87a27; color: white; border: 3px solid #3c1a1a;
  padding: 10px; border-radius: 8px; font-size: 1.1rem; font-weight: 900;
  cursor: pointer; transition: transform 0.1s; box-shadow: 0 4px 0 #3c1a1a;
  margin-top: 10px;
}
.submit-btn:active:not(:disabled) { transform: translateY(2px); box-shadow: 0 2px 0 #3c1a1a; }
.submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }

.toggle-mode { text-align: center; margin-top: 15px; }
.text-btn { background: none; border: none; color: #2980b9; font-size: 0.85rem; font-weight: 900; cursor: pointer; text-decoration: underline; }

.close-btn {
  position: absolute; top: -15px; right: -15px; width: 40px; height: 40px;
  background: #e74c3c; border: 3px solid #2d3436; border-radius: 50%;
  color: white; font-weight: 900; font-size: 1.2rem; cursor: pointer;
  box-shadow: 0 4px 0 #2d3436;
}
.close-btn:active { transform: translateY(2px); box-shadow: 0 2px 0 #2d3436; }
</style>
