/**
 * 批量價格計算處理器
 *
 * 功能效果：處理結帳時的批量商品價格計算，支援部分選擇邏輯
 * 用途：供結帳系統使用，確保大量商品處理的效率和正確性
 * 組件長度：約90行，專注於批量處理邏輯
 */

import { calculateItemPrice } from "./core";
import { validatePriceCalculation } from "./validators";

/**
 * 批量計算商品價格（用於結帳時的批量處理）
 * @param {Array} items - 商品數組
 * @param {Object} partialSelection - 部分選擇資訊（可選）
 * @returns {Object} { items: 處理後的商品, total: 總價, isValid: 驗證結果 }
 */
export const batchCalculateItemPrices = (items, partialSelection = null) => {
  if (!Array.isArray(items)) {
    return { items: [], total: 0, isValid: false };
  }

  const processedItems = [];
  let total = 0;
  let isValid = true;

  if (partialSelection) {
    // 部分選擇邏輯
    const { items: selectedItems, quantities: selectedQuantities } =
      partialSelection;

    Object.entries(selectedItems).forEach(([key, isSelected]) => {
      if (!isSelected) return;

      const selectedQty = selectedQuantities[key] || 1;
      if (selectedQty <= 0) return;

      // 解析 key: "batchIndex-itemIndex" 格式
      const [batchIndex, itemIndexStr] = key.split("-");
      const itemIndex = parseInt(itemIndexStr);

      const originalItem = items[itemIndex];
      if (!originalItem) {
        console.error(`❌ 找不到索引 ${itemIndex} 的商品`);
        isValid = false;
        return;
      }

      if (selectedQty > originalItem.quantity) {
        console.error(
          `❌ 選擇數量 ${selectedQty} 超過可用數量 ${originalItem.quantity}`
        );
        isValid = false;
        return;
      }

      // 計算價格
      const priceInfo = calculateItemPrice(originalItem, selectedQty);

      if (
        !validatePriceCalculation(
          { ...originalItem, quantity: selectedQty },
          priceInfo
        )
      ) {
        isValid = false;
        return;
      }

      processedItems.push({
        id: originalItem.id,
        name: originalItem.name,
        price: originalItem.price,
        quantity: selectedQty,
        subtotal: priceInfo.subtotal,
        selectedCustom: originalItem.selectedCustom || null,
        customOptions: originalItem.customOptions || null,
        priceInfo: priceInfo,
      });

      total += priceInfo.subtotal;
    });
  } else {
    // 全部選擇邏輯
    items.forEach((item) => {
      const priceInfo = calculateItemPrice(item);

      if (!validatePriceCalculation(item, priceInfo)) {
        isValid = false;
        return;
      }

      processedItems.push({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        subtotal: priceInfo.subtotal,
        selectedCustom: item.selectedCustom || null,
        customOptions: item.customOptions || null,
        priceInfo: priceInfo,
      });

      total += priceInfo.subtotal;
    });
  }

  return {
    items: processedItems,
    total: total,
    isValid: isValid,
  };
};
