/**
 * 價格顯示格式化函數
 *
 * 功能效果：處理價格在UI中的顯示格式，包含調整說明和視覺提示
 * 用途：供UI組件使用，統一價格顯示格式
 * 組件長度：約70行，專注於格式化邏輯
 */

/**
 * 格式化價格調整顯示文字
 * @param {number} basePrice - 基礎價格
 * @param {number} finalPrice - 最終價格
 * @param {Array} adjustmentDetails - 調整詳情
 * @returns {Object} { displayText, hasAdjustment, adjustmentText }
 */
export const formatPriceAdjustment = (
  basePrice,
  finalPrice,
  adjustmentDetails = []
) => {
  const hasAdjustment = finalPrice !== basePrice;
  const adjustmentAmount = finalPrice - basePrice;

  if (!hasAdjustment) {
    return {
      displayText: `$${basePrice}`,
      hasAdjustment: false,
      adjustmentText: null,
    };
  }

  // 生成調整說明文字
  const adjustmentTexts = adjustmentDetails.map((detail) => {
    const sign = detail.adjustment > 0 ? "+" : "";
    return `${detail.type}${sign}$${detail.adjustment}`;
  });

  const adjustmentText = adjustmentTexts.join(", ");
  const sign = adjustmentAmount > 0 ? "+" : "";

  return {
    displayText: `$${basePrice} → $${finalPrice}`,
    hasAdjustment: true,
    adjustmentText: `(${sign}$${adjustmentAmount}: ${adjustmentText})`,
  };
};

/**
 * 取得價格調整選項的顯示文字（用於下拉選單）
 * @param {Object} customOption - 客製選項定義
 * @param {string} optionValue - 選項值
 * @returns {string} 顯示文字，如 " (+$20)" 或 " (-$10)" 或 ""
 */
export const getPriceAdjustmentDisplay = (customOption, optionValue) => {
  if (!customOption?.priceAdjustments?.[optionValue]) {
    return "";
  }

  const adjustment = customOption.priceAdjustments[optionValue];
  if (adjustment > 0) {
    return ` (+$${adjustment})`;
  } else if (adjustment < 0) {
    return ` (-$${Math.abs(adjustment)})`;
  }

  return "";
};

/**
 * 格式化小計顯示
 * @param {number} unitPrice - 單價
 * @param {number} quantity - 數量
 * @returns {string} 格式化的小計文字
 */
export const formatSubtotalDisplay = (unitPrice, quantity) => {
  if (quantity === 1) {
    return `$${unitPrice}`;
  }

  const subtotal = unitPrice * quantity;
  return `$${unitPrice} × ${quantity} = $${subtotal}`;
};
