/**
 * 靜態資源路徑：國家資料夾與 scene 檔名一律小寫，與 public/assets 內實際路徑一致。
 * 部署在 Linux 時路徑區分大小寫，勿再使用 public/assets/flowers/Singapore 等大寫資料夾名。
 */
export const getFlowerImagePath = (countryId, flowerId) => {
  const dir = String(countryId).toLowerCase();
  return `/assets/flowers/${dir}/${flowerId}.png`;
};

export const getSceneBackgroundPath = (countryId, sceneNumber) => {
  const id = String(countryId).toLowerCase();
  return `/assets/scenes/${id}/scene_${id}_${sceneNumber}.png`;
};
