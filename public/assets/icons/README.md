# UI / 按鈕圖示資產

此目錄放 **AI 生成或美術匯出的點陣／向量圖**（PNG、WebP、SVG 等），給按鈕、道具列、貨幣小圖等使用。

## 子目錄約定

主場景已使用的檔名（小寫、`.png`）：

- **ui/**：`ui_task.png`、`ui_settings.png`、`ui_activity.png`、`dock_catalog.png`、`dock_shop.png`、`dock_garden.png`、`ui_home.png`（可選）
- **tools/**：`tool_water.png`、`tool_fertilizer.png`、`tool_butterfly.png`
- **currency/**：`cur_petal.png`、`cur_diamond.png`

新增一批中文檔名後，可執行 `npm run icons:normalize` 重新整理（會刪除重複／不合規檔名，請先備份）。

| 目錄 | 用途 |
|------|------|
| `ui/` | 介面通用按鈕：任務、設定、活動中心等 |
| `tools/` | 左側道具：澆水壺、花肥、蝴蝶燈等 |
| `currency/` | 花幣、鑽石、機票等數值相關小圖 |
| `weather/` | 天氣狀態圖示（可選，與程式內 SVG 並存） |
| `badges/` | 勳章、成就、圖鑑徽章（可選） |

## 命名規範

- 檔名**全部小寫**，僅 `[a-z0-9_]`，副檔名 `.png` / `.webp` / `.jpg` / `.jpeg` / `.svg`
- 範例：`ui_task.png`、`tool_water.png`、`cur_diamond.webp`
- **勿使用空白、中文、大寫**，以利 Linux 部署與 `npm run check:assets` 檢查

## 建議尺寸（直立手機 UI）

- 道具／任務小按鈕：約 **256×256**（畫面上約 24–32px）
- 底部 Dock 大按鈕：約 **384×384**
- 貨幣小圖：**128×128**

## 程式引用

在 `src/data/assetPaths.js` 內有 `getIconPath()` 與 `COMMON_ICON` 常數，建議用函式組路徑，避免手寫錯誤：

```js
import { getIconPath, COMMON_ICON } from '@/data/assetPaths.js';

getIconPath('ui', COMMON_ICON.UI_TASK);           // → /assets/icons/ui/ui_task.png
getIconPath('tools', COMMON_ICON.TOOL_WATER, 'png');
```

線稿單色向量可繼續放在 `src/components/GardenUiIcons.vue`，與此目錄並存。
