<script setup>
defineProps({
  kind: { type: String, required: true },
  size: { type: [Number, String], default: 22 },
});
</script>

<template>
  <svg
    class="garden-ui-icon"
    xmlns="http://www.w3.org/2000/svg"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <g
      fill="none"
      stroke="currentColor"
      stroke-width="1.65"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <!-- 圖鑑：展開的書（圖二手繪感） -->
      <template v-if="kind === 'book'">
        <path fill="#fff5e6" stroke-width="1.5" d="M5 3.5h7.5a1 1 0 011 1V20a.5.5 0 00-.5-.5H5a1.5 1.5 0 01-1.5-1.5v-13A1.5 1.5 0 015 3.5z" />
        <path fill="#ffe8cc" stroke-width="1.5" d="M19 3.5h-7.5a1 1 0 00-1 1V20a.5.5 0 01.5-.5H19a1.5 1.5 0 001.5-1.5v-13A1.5 1.5 0 0019 3.5z" />
        <path d="M12 4.5v15.5" />
        <path d="M8 8h3M8 11h3M16 8h2.5M16 11h2.5" stroke-width="1.3" />
      </template>

      <!-- 設定齒輪 -->
      <template v-else-if="kind === 'gear'">
        <circle cx="12" cy="12" r="3.2" fill="#fff5e6" stroke-width="1.5" />
        <path d="M12 2v2.2M12 19.8V22M4.2 12H2M22 12h-2.2M5.6 5.6 4.2 4.2M19.8 19.8l-1.4-1.4M18.4 5.6l1.4-1.4M5.6 18.4 4.2 19.8" />
        <circle cx="12" cy="12" r="6.5" stroke-dasharray="2.2 2.8" stroke-width="1.4" opacity="0.85" />
      </template>

      <!-- 任務：剪貼簿 -->
      <template v-else-if="kind === 'clipboard'">
        <rect x="5" y="4" width="14" height="17" rx="2" fill="#fff5e6" stroke-width="1.5" />
        <path d="M9 3h6v3H9z" fill="#ffd4a8" stroke-width="1.5" />
        <path d="M9 9h6M9 12h6M9 15h4" stroke-width="1.35" />
      </template>

      <!-- 澆水壺 -->
      <template v-else-if="kind === 'water'">
        <path fill="#fff5e6" stroke-width="1.5" d="M4 10l3-5h6l2 5v9a2 2 0 01-2 2H6a2 2 0 01-2-2v-9z" />
        <path d="M15 8h3.5a2 2 0 012 2v1a1 1 0 01-1 1H15" />
        <path d="M7 14h6" stroke-width="1.3" />
      </template>

      <!-- 花肥：圓底試管 -->
      <template v-else-if="kind === 'fertilizer'">
        <path fill="#e8f8e8" stroke-width="1.5" d="M9 3h6v2l-2 8v6a2.5 2.5 0 01-2 2.45A2.5 2.5 0 019 19v-6L7 5V3h2z" />
        <path fill="#7bed9f" stroke="none" opacity="0.85" d="M9.5 14.5c.8 2.2 2.2 3.5 2.5 3.5s1.7-1.3 2.5-3.5c.3 1.8-.2 3.5-2.5 3.5s-2.8-1.7-2.5-3.5z" />
      </template>

      <!-- 蝴蝶燈 -->
      <template v-else-if="kind === 'butterfly'">
        <path fill="#fff0f5" stroke-width="1.5" d="M12 6c-2 2-5 1.5-6.5 3.5S4 14 6 15.5s4-.5 6-2.5" />
        <path fill="#fff0f5" stroke-width="1.5" d="M12 6c2 2 5 1.5 6.5 3.5S20 14 18 15.5s-4-.5-6-2.5" />
        <path d="M12 6v12" />
        <circle cx="12" cy="8" r="0.9" fill="currentColor" stroke="none" />
        <path d="M10.5 7.5c-.8-1.2-.8-2.5 0-3.2M13.5 7.5c.8-1.2.8-2.5 0-3.2" stroke-width="1.2" />
      </template>

      <!-- 商店：攤位遮陽棚 -->
      <template v-else-if="kind === 'shop'">
        <path fill="#ff7675" stroke-width="1.5" d="M3 10l9-5 9 5v2H3z" />
        <path fill="#fff5e6" stroke-width="1.5" d="M5 12h14v8a1 1 0 01-1 1H6a1 1 0 01-1-1z" />
        <path d="M8 12v9M16 12v9" stroke-width="1.3" opacity="0.5" />
      </template>

      <!-- 花園佈置：花盆 + 小芽 -->
      <template v-else-if="kind === 'pot'">
        <path fill="#d4a574" stroke-width="1.5" d="M7 10h10l-1 8H8z" />
        <path fill="#c49a6c" d="M8 18h8v2a1 1 0 01-1 1H9a1 1 0 01-1-1z" stroke-width="1.4" />
        <path fill="#55efc4" stroke-width="1.3" d="M12 10c-1-3 0-5 2-6.5-1.5 2-1.5 4-.5 6.5" />
        <path fill="#7bed9f" stroke-width="1.2" d="M12 10c1.2-2.5 3-4 5-4.5-2 1.5-2.8 3-2.5 4.5" />
      </template>

      <!-- 活動禮物 -->
      <template v-else-if="kind === 'gift'">
        <rect x="5" y="9" width="14" height="11" rx="1.5" fill="#ffeaa7" stroke-width="1.5" />
        <path fill="#ff7675" stroke-width="1.5" d="M4 9h16v3H4z" />
        <path d="M12 6v14M8 6c0-2 1.5-3 4-3s4 1 4 3" stroke-width="1.4" />
      </template>

      <!-- 頭像櫻花 -->
      <template v-else-if="kind === 'avatarFlower'">
        <circle cx="12" cy="13" r="5.5" fill="#ffd6e8" stroke-width="1.5" />
        <path fill="#ffb7d5" stroke-width="1.3" d="M12 5.5l1.8 3.5 3.9.6-2.8 2.7.7 3.9-3.6-1.9-3.6 1.9.7-3.9-2.8-2.7 3.9-.6z" />
        <circle cx="12" cy="9.5" r="1.6" fill="#fff5e6" stroke-width="1.2" />
      </template>

      <!-- 花瓣貨幣：五瓣花 -->
      <template v-else-if="kind === 'petal'">
        <path fill="#ffb7c5" stroke="#c44569" stroke-width="1.4" d="M12 4.5l1.6 3.3 3.6.5-2.6 2.5.6 3.6-3.2-1.7-3.2 1.7.6-3.6-2.6-2.5 3.6-.5z" />
        <circle cx="12" cy="10.2" r="2" fill="#ffeaa7" stroke="#c44569" stroke-width="1.2" />
      </template>

      <!-- 鑽石 -->
      <template v-else-if="kind === 'diamond'">
        <path fill="#dfe6e9" stroke-width="1.5" d="M12 3l7 8-7 10-7-10z" />
        <path fill="#a29bfe" stroke-width="1.3" d="M12 3L8 8h8z" opacity="0.9" />
        <path d="M8 8l4 13 4-13M5 11h14" stroke-width="1.2" opacity="0.6" />
      </template>

      <!-- 天氣：晴 -->
      <template v-else-if="kind === 'weatherSunny'">
        <circle cx="12" cy="12" r="4" fill="#ffeaa7" stroke-width="1.5" />
        <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" stroke-width="1.3" />
      </template>

      <template v-else-if="kind === 'weatherCloudy'">
        <path fill="#ecf0f1" stroke-width="1.5" d="M6 16h11a3.5 3.5 0 002.8-5.6A5 5 0 008.5 9.2 4 4 0 006 16z" />
      </template>

      <template v-else-if="kind === 'weatherRainy'">
        <path fill="#dfe6e9" stroke-width="1.5" d="M5 15h12a3 3 0 002.4-4.8 4 4 0 00-6.7-1A3.5 3.5 0 005 15z" />
        <path d="M8 18v3M11 17v3M14 18v3" stroke-width="1.4" />
      </template>

      <template v-else-if="kind === 'weatherStorm'">
        <path fill="#b2bec3" stroke-width="1.5" d="M5 14h12a3 3 0 002.3-4.9 4 4 0 00-6.5-1.2A3.5 3.5 0 005 14z" />
        <path d="M13 16l-2 6M15 15l1.5 5" fill="none" stroke-width="1.5" />
      </template>
    </g>
  </svg>
</template>

<style scoped>
.garden-ui-icon {
  display: block;
  flex-shrink: 0;
  color: #3d2817;
}
</style>
