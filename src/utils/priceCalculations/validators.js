/**
 * 價格計算驗證函數
 *
 * 功能效果：驗證價格計算結果的正確性，確保數據一致性
 * 用途：開發階段調試和生產環境的數據驗證
 * 組件長度：約60行，專注於驗證邏輯
 */

/**
 * 驗證價格計算結果
 * @param {Object} item - 商品物件
 * @param {Object} calculationResult - 計算結果
 * @returns {boolean} 驗證是否通過
 */
export const validatePriceCalculation = (item, calculationResult) => {
  // 基本驗證
  if (!calculationResult || typeof calculationResult !== "object") {
    console.error("❌ 價格計算結果無效");
    return false;
  }

  const { unitPrice, subtotal, adjustment } = calculationResult;

  // 價格不能為負數
  if (unitPrice < 0 || subtotal < 0) {
    console.error("❌ 計算出負數價格", { unitPrice, subtotal });
    return false;
  }

  // 小計應等於單價乘以數量
  const expectedSubtotal = unitPrice * (item.quantity || 1);
  if (Math.abs(subtotal - expectedSubtotal) > 0.01) {
    console.error("❌ 小計計算錯誤", {
      expected: expectedSubtotal,
      actual: subtotal,
    });
    return false;
  }

  // 調整金額應等於最終價格減去基礎價格
  const expectedAdjustment = unitPrice - (item.price || 0);
  if (Math.abs(adjustment - expectedAdjustment) > 0.01) {
    console.error("❌ 價格調整計算錯誤", {
      expected: expectedAdjustment,
      actual: adjustment,
    });
    return false;
  }

  return true;
};

/**
 * 驗證商品物件格式
 * @param {Object} item - 商品物件
 * @returns {boolean} 格式是否正確
 */
export const validateItemFormat = (item) => {
  if (!item || typeof item !== "object") {
    console.error("❌ 商品物件無效");
    return false;
  }

  if (!item.id) {
    console.error("❌ 商品缺少 ID");
    return false;
  }

  if (!item.name) {
    console.error("❌ 商品缺少名稱");
    return false;
  }

  if (typeof item.price !== "number" || item.price < 0) {
    console.error("❌ 商品價格無效", item.price);
    return false;
  }

  return true;
};
