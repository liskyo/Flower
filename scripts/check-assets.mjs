/**
 * 檢查 public/assets 與各國 JSON 是否一致（小寫路徑約定）。
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

  if (errors.length) {
    const log = warnOnly ? console.warn : console.error;
    log(`\n${warnOnly ? '⚠️' : '❌'} check:assets 發現 ${errors.length} 個問題：\n`);
    errors.forEach((msg) => log(`  • ${msg}`));
    log('');
    if (!warnOnly) process.exit(1);
    process.exit(0);
  }

  console.log('✅ check:assets：public/assets 與國家 JSON 對應正常（小寫路徑）。');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
