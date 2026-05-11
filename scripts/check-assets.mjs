/**
 * 此外檢查 public/assets/icons 下檔名是否符小寫命名（與 README 約定一致）。
 *
 * 用法：
 *   npm run check:assets
 *   npm run check:assets -- --warn-only   （僅列出問題，結束碼仍為 0）
 */
import { access, readdir, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const warnOnly = process.argv.includes('--warn-only');
const errors = [];

async function pathExists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const countriesDir = join(root, 'src', 'data', 'countries');
  let files;
  try {
    files = await readdir(countriesDir);
  } catch (e) {
    console.error('無法讀取 countries 目錄:', e.message);
    process.exit(1);
  }

  for (const file of files.filter((f) => f.endsWith('.json'))) {
    let raw;
    try {
      raw = JSON.parse(await readFile(join(countriesDir, file), 'utf8'));
    } catch {
      errors.push(`無法解析 JSON：${file}`);
      continue;
    }

    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue;
    if (!raw.id || typeof raw.id !== 'string') continue;
    if (!Array.isArray(raw.flowers)) continue;

    const slug = raw.id.toLowerCase();
    const flowersDir = join(root, 'public', 'assets', 'flowers', slug);
    const scenesDir = join(root, 'public', 'assets', 'scenes', slug);

    const hasFlowersDir = await pathExists(flowersDir);
    const hasScenesDir = await pathExists(scenesDir);

    if (!hasFlowersDir) {
      errors.push(`缺少花朵資料夾：public/assets/flowers/${slug}/ （國家 ${raw.id}）`);
    }

    if (!hasScenesDir) {
      errors.push(`缺少場景資料夾：public/assets/scenes/${slug}/ （國家 ${raw.id}）`);
    }

    const scenes = Number(raw.scenes) || 0;

    if (hasFlowersDir) {
      for (const flower of raw.flowers) {
        if (!flower?.id) continue;
        const png = join(flowersDir, `${flower.id}.png`);
        if (!(await pathExists(png))) {
          errors.push(`缺少花朵圖：public/assets/flowers/${slug}/${flower.id}.png`);
        }
      }
    }

    if (hasScenesDir) {
      for (let s = 1; s <= scenes; s++) {
        const name = `scene_${slug}_${s}.png`;
        const png = join(scenesDir, name);
        if (!(await pathExists(png))) {
          errors.push(`缺少場景圖：public/assets/scenes/${slug}/${name}`);
        }
      }
    }
  }

  const iconsRoot = join(root, 'public', 'assets', 'icons');
  if (await pathExists(iconsRoot)) {
    const iconDirOk = /^[a-z0-9_]+$/;
    const iconFileOk = /^[a-z0-9_]+\.(png|webp|jpg|jpeg|svg)$/;
    const allowedIconFolders = new Set(['ui', 'tools', 'currency', 'weather', 'badges']);
    let entries;
    try {
      entries = await readdir(iconsRoot, { withFileTypes: true });
    } catch (e) {
      errors.push(`無法讀取 public/assets/icons：${e.message}`);
    }
    if (entries) {
      for (const ent of entries) {
        const name = ent.name;
        if (name === 'README.md') continue;
        if (ent.isFile()) {
          errors.push(`public/assets/icons 根目錄只應含 README 與分類子資料夾：請移走或改名 ${name}`);
          continue;
        }
        if (!ent.isDirectory()) continue;
        if (!iconDirOk.test(name)) {
          errors.push(`icons 子資料夾名稱須小寫 [a-z0-9_]：public/assets/icons/${name}/`);
          continue;
        }
        if (!allowedIconFolders.has(name)) {
          errors.push(
            `icons 未知子資料夾 public/assets/icons/${name}/（允許：${[...allowedIconFolders].join(', ')}）`,
          );
        }
        const sub = join(iconsRoot, name);
        let subEntries;
        try {
          subEntries = await readdir(sub, { withFileTypes: true });
        } catch (e) {
          errors.push(`無法讀取 public/assets/icons/${name}/：${e.message}`);
          continue;
        }
        for (const f of subEntries) {
          if (f.name === '.gitkeep') continue;
          if (f.isDirectory()) {
            errors.push(`icons 內不應有巢狀目錄：public/assets/icons/${name}/${f.name}/`);
            continue;
          }
          if (!f.isFile()) continue;
          if (!iconFileOk.test(f.name)) {
            errors.push(
              `icon 檔名須為小寫 [a-z0-9_].(png|webp|jpg|jpeg|svg)：public/assets/icons/${name}/${f.name}`,
            );
          }
        }
      }
    }
  }

  if (errors.length) {
    const log = warnOnly ? console.warn : console.error;
    log(`\n${warnOnly ? '⚠️' : '❌'} check:assets 發現 ${errors.length} 個問題：\n`);
    errors.forEach((msg) => log(`  • ${msg}`));
    log('');
    if (!warnOnly) process.exit(1);
    process.exit(0);
  }

  console.log('✅ check:assets：國家資產與 icons 命名檢查通過（小寫路徑約定）。');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
