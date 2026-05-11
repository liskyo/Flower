/**
 * 靜態資源路徑：國家資料夾與 scene 檔名一律小寫，與 public/assets 內實際路徑一致。
 * 部署在 Linux 時路徑區分大小寫，勿再使用 public/assets/flowers/Singapore 等大寫資料夾名。
 */

/** @typedef {'ui'|'tools'|'currency'|'weather'|'badges'} IconCategory */

/** icon 子目錄名稱（對應 public/assets/icons/<category>/） */
export const ICON_CATEGORY = {
  UI: 'ui',
  TOOLS: 'tools',
  CURRENCY: 'currency',
  WEATHER: 'weather',
  BADGES: 'badges',
};

/**
 * 常用按鈕／道具圖示的「檔名主體」（不含副檔名）。
 * 實際檔案請放在 public/assets/icons/ 對應分類下，例如：
 *   public/assets/icons/ui/ui_task.png
 *
 * | 常數 | 建議分類 | 用途說明 |
 * |------|----------|----------|
 * | UI_TASK | ui | 任務／每日任務入口按鈕 |
 * | UI_SETTINGS | ui | 設定（齒輪）按鈕 |
 * | UI_ACTIVITY | ui | 活動中心／福利聚合入口 |
 * | TOOL_WATER | tools | 澆水壺道具 |
 * | TOOL_FERTILIZER | tools | 花肥道具 |
 * | TOOL_BUTTERFLY | tools | 蝴蝶燈（五星機率 buff）道具 |
 * | CUR_PETAL | currency | 花幣（花瓣貨幣）顯示 |
 * | CUR_DIAMOND | currency | 鑽石顯示 |
 * | CUR_TICKET | currency | 旅遊機票（地圖／背包）顯示 |
 */
export const COMMON_ICON = {
  UI_TASK: 'ui_task',
  UI_SETTINGS: 'ui_settings',
  UI_ACTIVITY: 'ui_activity',
  TOOL_WATER: 'tool_water',
  TOOL_FERTILIZER: 'tool_fertilizer',
  TOOL_BUTTERFLY: 'tool_butterfly',
  CUR_PETAL: 'cur_petal',
  CUR_DIAMOND: 'cur_diamond',
  CUR_TICKET: 'cur_ticket',
};

const ICON_ALLOWED_EXT = new Set(['png', 'webp', 'jpg', 'jpeg', 'svg']);

export const getFlowerImagePath = (countryId, flowerId) => {
  const dir = String(countryId).toLowerCase();
  return `/assets/flowers/${dir}/${flowerId}.png`;
};

export const getSceneBackgroundPath = (countryId, sceneNumber) => {
  const id = String(countryId).toLowerCase();
  return `/assets/scenes/${id}/scene_${id}_${sceneNumber}.png`;
};

/**
 * 組合 public/assets/icons 底下的 URL（Vite 會原樣提供 /assets/...）。
 * @param {string} category - ICON_CATEGORY 的值，例如 'ui'、'tools'
 * @param {string} baseName - 檔名不含副檔名，建議用 COMMON_ICON 常數
 * @param {string} [ext='png'] - png | webp | jpg | jpeg | svg
 */
export function getIconPath(category, baseName, ext = 'png') {
  const c = String(category).toLowerCase();
  let base = String(baseName).toLowerCase();
  if (base.endsWith('.png') || base.endsWith('.webp') || base.endsWith('.svg')) {
    base = base.replace(/\.(png|webp|jpe?g|svg)$/i, '');
  }
  const e = String(ext).toLowerCase().replace(/^\./, '');
  const safeExt = ICON_ALLOWED_EXT.has(e) ? e : 'png';
  return `/assets/icons/${c}/${base}.${safeExt}`;
}
