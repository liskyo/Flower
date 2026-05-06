/**
 * 靜態資源路徑：國家資料夾與檔名統一為小寫（與 country id 一致）。
 */
export const getFlowerImagePath = (countryId, flowerId) => {
  const dir = String(countryId).toLowerCase();
  return `/assets/flowers/${dir}/${flowerId}.png`;
};

export const getSceneBackgroundPath = (countryId, sceneNumber) => {
  const id = String(countryId).toLowerCase();
  return `/assets/scenes/${id}/scene_${id}_${sceneNumber}.png`;
};
