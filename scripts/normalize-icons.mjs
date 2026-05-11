/**
 * 將 public/assets/icons 內檔名整理為小寫英文名（供 Linux 與 check:assets）。
 * 執行：node scripts/normalize-icons.mjs
 */
import { readdir, rename, unlink, access } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsRoot = join(__dirname, '..', 'public', 'assets', 'icons');

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

/** @param {string} dir */
async function safeUnlink(dir, name) {
  const p = join(dir, name);
  if (await exists(p)) await unlink(p);
}

/** @param {string} dir */
async function safeRename(dir, from, to) {
  const a = join(dir, from);
  const b = join(dir, to);
  if (!(await exists(a))) return;
  if (await exists(b) && from.toLowerCase() !== to.toLowerCase()) {
    await unlink(a);
    return;
  }
  await rename(a, b);
}

async function main() {
  const ui = join(iconsRoot, 'ui');
  const tools = join(iconsRoot, 'tools');
  const currency = join(iconsRoot, 'currency');

  const uiMap = {
    'ui_task.PNG': 'ui_task.png',
    'ui_task.png': 'ui_task.png',
    'ui_settings.PNG': 'ui_settings.png',
    'ui_activity.PNG': 'ui_activity.png',
    '圖鑑.PNG': 'dock_catalog.png',
    '商店.PNG': 'dock_shop.png',
    '花園布景.PNG': 'dock_garden.png',
    '首頁.PNG': 'ui_home.png',
  };

  for (const [from, to] of Object.entries(uiMap)) {
    if (from === to) continue;
    await safeRename(ui, from, to);
  }

  const uiDelete = ['花幣.PNG', '鑽石.PNG', '澆水壺.PNG', '花肥.PNG', '蝴蝶燈.PNG'];
  for (const f of uiDelete) await safeUnlink(ui, f);

  const toolsCaseFix = [
    ['tool_water.PNG', 'tool_water.png'],
    ['tool_fertilizer.PNG', 'tool_fertilizer.png'],
    ['tool_butterfly.PNG', 'tool_butterfly.png'],
  ];
  for (const [from, to] of toolsCaseFix) {
    await safeRename(tools, from, to);
  }

  const toolsDelete = [
    '圖鑑.PNG',
    '花園布景.PNG',
    '任務.PNG',
    '活動.PNG',
    '花幣.PNG',
    '設定.PNG',
    '首頁.PNG',
    '商店.PNG',
    '鑽石.PNG',
  ];
  for (const f of toolsDelete) await safeUnlink(tools, f);

  const curDir = currency;
  const keepCur = /^cur_[a-z0-9_]+\.png$/;
  if (await exists(curDir)) {
    const files = await readdir(curDir);
    for (const f of files) {
      if (f === '.gitkeep') continue;
      if (keepCur.test(f) && f === f.toLowerCase()) continue;
      if (/^cur_/i.test(f) && f.endsWith('.PNG')) {
        const lower = f.replace(/\.PNG$/i, '.png');
        await safeRename(curDir, f, lower);
        continue;
      }
      if (!keepCur.test(f.toLowerCase())) await safeUnlink(curDir, f);
    }
  }

  console.log('normalize-icons: done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
