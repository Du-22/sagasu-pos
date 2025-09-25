/**
 * 訂單資料處理器
 *
 * 原始程式碼：從 OrderSummary.js 抽取的純邏輯函數
 * 功能效果：處理訂單資料轉換、分組、格式化等純邏輯操作
 * 用途：供 NewOrderSummary 使用，避免組件過於龐大
 * 組件長度：約100行，純邏輯無狀態操作
 */

/**
 * 將扁平化的訂單按時間分組，模擬批次顯示
 * @param {Array} flatOrders - 扁平化訂單陣列
 * @returns {Array} 按時間分組的批次陣列
 */
export const groupOrdersByTime = (flatOrders) => {
  if (!Array.isArray(flatOrders) || flatOrders.length === 0) {
    return [];
  }

  // 依據timestamp分組
  const groups = [];
  const timeGroups = {};

  flatOrders.forEach((item, index) => {
    if (item && !item.__seated) {
      const timestamp = item.timestamp;
      if (!timeGroups[timestamp]) {
        timeGroups[timestamp] = [];
      }
      timeGroups[timestamp].push({ ...item, originalIndex: index });
    }
  });

  // 按時間排序並轉為陣列
  const sortedTimestamps = Object.keys(timeGroups).sort();
  return sortedTimestamps.map((timestamp) => timeGroups[timestamp]);
};

/**
 * 處理確認訂單的顯示格式
 * @param {Array} confirmedOrdersBatches - 確認訂單批次
 * @returns {Array} 處理後的訂單批次
 */
export const processConfirmedOrders = (confirmedOrdersBatches) => {
  if (confirmedOrdersBatches.length === 0) return [];

  // 統一處理為時間分組的批次結構（僅用於顯示）
  if (Array.isArray(confirmedOrdersBatches[0])) {
    const flatOrders = confirmedOrdersBatches[0];

    // 如果是扁平化結構，按時間分組來模擬批次顯示
    if (flatOrders.length > 0 && !Array.isArray(flatOrders[0])) {
      return groupOrdersByTime(flatOrders);
    }

    // 如果已經是批次結構，直接返回
    return confirmedOrdersBatches[0];
  }

  return [];
};

/**
 * 取得所有可結帳的商品，按數量拆分
 * @param {Array} processedBatches - 處理後的訂單批次
 * @param {Array} currentOrder - 當前正在編輯的訂單
 * @param {boolean} selectedTable - 是否為外帶桌
 * @returns {Array} 可結帳商品陣列
 */
export const getCheckoutableItems = (
  processedBatches,
  currentOrder,
  selectedTable
) => {
  // 計算正在編輯的項目位置
  const editingPositions = new Set(
    currentOrder
      .filter((item) => item.isEditing && !item.isTakeout)
      .map((item) => `0-${item.originalItemIndex}`)
  );

  const items = [];

  if (processedBatches.length === 0) {
    return items;
  }

  // 判斷是否為扁平結構
  const isFlat =
    processedBatches.length === 1 &&
    Array.isArray(processedBatches[0]) &&
    processedBatches[0].length > 0 &&
    !Array.isArray(processedBatches[0][0]);

  if (isFlat) {
    const flatItems = processedBatches[0];
    flatItems.forEach((item, itemIndex) => {
      const positionKey = `0-${itemIndex}`;

      if (item.paid === true) {
        return;
      }

      if (!editingPositions.has(positionKey)) {
        items.push({
          ...item,
          batchIndex: 0,
          itemIndex: itemIndex,
          key: positionKey,
          itemId: `${item.id}-${JSON.stringify(
            item.selectedCustom
          )}-${itemIndex}`,
        });
      }
    });
  } else {
    let globalIndex = 0;
    processedBatches.forEach((batch, batchIndex) => {
      if (Array.isArray(batch)) {
        batch.forEach((item, itemIndex) => {
          const positionKey = `0-${globalIndex}`;

          if (item.paid === true) {
            globalIndex++;
            return;
          }

          if (!editingPositions.has(positionKey)) {
            items.push({
              ...item,
              batchIndex: 0,
              itemIndex: globalIndex,
              key: positionKey,
              itemId: `${item.id}-${JSON.stringify(
                item.selectedCustom
              )}-${globalIndex}`,
              originalBatchIndex: batchIndex,
              originalItemIndex: itemIndex,
            });
          }
          globalIndex++;
        });
      }
    });
  }

  return items;
};

/**
 * 格式化時間戳顯示
 * @param {string} timestamp - ISO時間戳
 * @returns {string} 格式化的時間字串
 */
export const formatTimestamp = (timestamp) => {
  if (!timestamp) return "未知時間";
  try {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("zh-TW", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return "未知時間";
  }
};
