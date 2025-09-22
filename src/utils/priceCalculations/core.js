/**
 * 核心價格計算邏輯
 *
 * 原始程式碼來源：CafePOSSystem.js checkout 函數
 * 功能效果：處理商品基礎價格和客製選項調整
 * 用途：提供最基本的價格計算函數
 * 組件長度：約80行，專注於核心計算邏輯
 */

/**
 * 計算單一商品的最終價格（含客製選項調整）
 * @param {Object} item - 商品物件
 * @param {number} quantity - 數量（可選）
 * @returns {Object} { unitPrice, subtotal, adjustment, details }
 */
export const calculateItemPrice = (item, quantity = null) => {
  // 參數驗證
  if (!item || typeof item !== "object") {
    console.warn("⚠️ calculateItemPrice: 無效的商品物件", item);
    return {
      unitPrice: 0,
      subtotal: 0,
      adjustment: 0,
      details: [],
    };
  }

  const qty = quantity !== null ? quantity : item.quantity || 1;
  const basePrice = item.price || 0;
  let totalAdjustment = 0;
  const adjustmentDetails = [];

  // 處理新格式的客製選項價格調整
  if (
    item.selectedCustom &&
    item.customOptions &&
    Array.isArray(item.customOptions)
  ) {
    Object.entries(item.selectedCustom).forEach(
      ([optionType, selectedValue]) => {
        if (!selectedValue) return;

        const customOption = item.customOptions.find(
          (opt) => opt.type === optionType
        );

        if (customOption?.priceAdjustments?.[selectedValue]) {
          const adjustment = customOption.priceAdjustments[selectedValue];
          totalAdjustment += adjustment;

          adjustmentDetails.push({
            type: optionType,
            value: selectedValue,
            adjustment: adjustment,
            source: "customOptions",
          });
        }
      }
    );
  }

  // 向下相容：處理舊系統的續杯邏輯
  if (totalAdjustment === 0 && item.selectedCustom?.["續杯"] === "是") {
    const renewalOption = item.customOptions?.find(
      (opt) => opt.type === "續杯"
    );

    if (!renewalOption?.priceAdjustments?.["是"]) {
      totalAdjustment = -20;
      adjustmentDetails.push({
        type: "續杯",
        value: "是",
        adjustment: -20,
        source: "legacy",
      });
    }
  }

  // 計算最終價格（確保不為負數）
  const finalUnitPrice = Math.max(basePrice + totalAdjustment, 0);
  const subtotal = finalUnitPrice * qty;

  return {
    unitPrice: finalUnitPrice,
    subtotal: subtotal,
    adjustment: totalAdjustment,
    details: adjustmentDetails,
  };
};

/**
 * 計算商品數組的總價
 * @param {Array} items - 商品數組
 * @returns {Object} { total, itemCount, details }
 */
export const calculateItemsTotal = (items) => {
  if (!Array.isArray(items)) {
    console.warn("⚠️ calculateItemsTotal: items 不是數組", items);
    return { total: 0, itemCount: 0, details: [] };
  }

  let total = 0;
  let itemCount = 0;
  const details = [];

  items.forEach((item, index) => {
    const priceInfo = calculateItemPrice(item);
    total += priceInfo.subtotal;
    itemCount += item.quantity || 1;

    details.push({
      index,
      item: item.name || "未知商品",
      quantity: item.quantity || 1,
      ...priceInfo,
    });
  });

  return { total, itemCount, details };
};
