import os
import json
from PIL import Image

# ===== 設定區 =====
IMAGE_PATH = "japan.png"      # 你的原始圖片
JSON_PATH = "japan.json"       # 你的JSON檔
OUTPUT_DIR = r"Cut\japan"    # 使用 r 避免 \o 轉義錯誤
GRID_COLS = 8                # 橫向數量 (例如 8)
GRID_ROWS = 5                # 縱向數量 (例如 5)

# ==================

# 建立輸出資料夾
os.makedirs(OUTPUT_DIR, exist_ok=True)

# 讀取圖片
img = Image.open(IMAGE_PATH)
img_width, img_height = img.size

# 計算每格大小
cell_width = img_width // GRID_COLS
cell_height = img_height // GRID_ROWS

# 讀取 JSON
with open(JSON_PATH, "r", encoding="utf-8") as f:
    data = json.load(f)

print(f"成功讀取 JSON，共有 {len(data)} 個項目")

# 開始切圖
index = 0

for row in range(GRID_ROWS):
    for col in range(GRID_COLS):
        if index >= len(data):
            break
            
        left = col * cell_width
        upper = row * cell_height
        right = left + cell_width
        lower = upper + cell_height

        # 裁切
        sprite = img.crop((left, upper, right, lower))

        # 對應 JSON id
        sprite_id = data[index]["id"]

        # 輸出檔名
        output_path = os.path.join(OUTPUT_DIR, f"{sprite_id}.png")

        # 儲存
        sprite.save(output_path)
        print(f"[{index+1}/{len(data)}] 已儲存: {output_path}")

        index += 1
    if index >= len(data):
        break

if index < len(data):
    print(f"\n⚠️ 注意：JSON 中還有 {len(data) - index} 個項目未被裁切（目前設定為 {GRID_COLS}x{GRID_ROWS}）")

print("✅ 切圖完成！")