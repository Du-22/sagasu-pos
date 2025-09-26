/**
 * 桌位狀態管理輔助函數
 *
 * 原始程式碼：分散在 CafePOSSystem.js 中的各種桌位狀態處理邏輯
 * 功能效果：提供統一的桌位狀態判斷、數據清理、格式轉換等純函數
 * 用途：簡化主程式邏輯，提高代碼可維護性和可測試性
 * 組件長度：約150行，包含6個主要函數
 *
 * 重要說明：
 * - 這些都是純函數，不包含任何副作用
 * - 與現有系統完全相容，不會影響 checkout 函數
 * - 支援扁平化數據結構（新）和巢狀結構（舊）的相容性處理
 */

/**
 * 獲取桌位狀態
 * @param {string} tableId - 桌位ID
 * @param {Object} tableStates - 所有桌位狀態數據
 * @param {Object} takeoutOrders - 外帶訂單數據
 * @returns {string} 桌位狀態：available, seated, occupied, ready-to-clean, takeout-new, takeout-unpaid, takeout-paid
 */
export const getTableStatus = (tableId, tableStates, takeoutOrders) => {
  // 外帶訂單處理
  if (tableId.startsWith("T")) {
    const takeoutData = takeoutOrders[tableId];
    if (takeoutData) {
      return takeoutData.paid ? "takeout-paid" : "takeout-unpaid";
    }
    return "takeout-new";
  }

  // 內用桌位處理
  const tableState = tableStates[tableId];

  if (!tableState || !tableState.orders || tableState.orders.length === 0) {
    return "available";
  }

  // 檢查入座狀態
  // 重要：支援扁平化結構的入座標記檢查
  for (let i = 0; i < tableState.orders.length; i++) {
    const item = tableState.orders[i];
    if (item && typeof item === "object" && item.__seated === true) {
      return "seated";
    }
  }

  // 檢查付款狀態
  let hasUnpaidItems = false;
  let hasPaidItems = false;

  for (const item of tableState.orders) {
    if (item && typeof item === "object" && !item.__seated) {
      if (item.paid === false) {
        hasUnpaidItems = true;
      } else if (item.paid === true) {
        hasPaidItems = true;
      }
    }
  }

  if (hasUnpaidItems) {
    return "occupied";
  }
  if (hasPaidItems) {
    return "ready-to-clean";
  }

  return "available";
};

/**
 * 清理桌位數據，確保數據結構的一致性
 * @param {Object} tableData - 桌位數據
 * @returns {Object} 清理後的桌位數據
 *
 * 重要：處理扁平化結構，避免巢狀陣列問題
 */
export const sanitizeTableData = (tableData) => {
  if (!tableData || !tableData.orders) return tableData;

  // 確保 orders 是一維陣列，每個元素可以是物件或物件陣列，但不是巢狀陣列
  const sanitizedOrders = tableData.orders
    .map((batch) => {
      if (Array.isArray(batch)) {
        // 如果是陣列，確保裡面都是有效物件
        return batch.filter((item) => item && typeof item === "object");
      } else if (batch && typeof batch === "object") {
        // 如果是物件，直接返回
        return batch;
      }
      return null;
    })
    .filter(
      (batch) =>
        batch !== null && (Array.isArray(batch) ? batch.length > 0 : true)
    );

  return {
    ...tableData,
    orders: sanitizedOrders,
  };
};

/**
 * 從訂單推斷桌位狀態（向後相容功能）
 * @param {Array} orders - 訂單陣列
 * @returns {string} 推斷的桌位狀態
 */
export const getTableStatusFromOrders = (orders) => {
  if (!orders || orders.length === 0) return "available";

  // 檢查入座標記
  const hasSeatedMarker = orders.some((item) => item && item.__seated);
  if (hasSeatedMarker) return "seated";

  // 檢查付款狀態
  const hasUnpaidItems = orders.some(
    (item) => item && !item.__seated && item.paid === false
  );
  if (hasUnpaidItems) return "occupied";

  const hasPaidItems = orders.some(
    (item) => item && !item.__seated && item.paid === true
  );
  return hasPaidItems ? "ready-to-clean" : "available";
};

/**
 * 為了相容性，提供 timers 格式給 UI 組件
 * @param {Object} tableStates - 所有桌位狀態
 * @returns {Object} timers 格式的時間數據
 */
export const getTimersForDisplay = (tableStates) => {
  const timersForDisplay = {};

  Object.entries(tableStates).forEach(([tableId, tableState]) => {
    if (tableState.startTime) {
      const currentStatus = getTableStatus(
        tableId,
        { [tableId]: tableState },
        {}
      );

      // 讓計時器在用餐中、入座和待清理狀態都顯示
      if (
        currentStatus === "occupied" ||
        currentStatus === "seated" ||
        currentStatus === "ready-to-clean"
      ) {
        timersForDisplay[tableId] = tableState.startTime;
      }
    }
  });

  return timersForDisplay;
};

/**
 * 為了相容性，提供 orders 格式給 UI 組件
 * @param {Object} tableStates - 所有桌位狀態
 * @returns {Object} orders 格式的訂單數據
 *
 * 重要：處理扁平化數據結構，轉換為 UI 期望的批次格式
 */
export const getOrdersForDisplay = (tableStates) => {
  const ordersForDisplay = {};

  Object.entries(tableStates).forEach(([tableId, tableState]) => {
    if (tableState.orders && Array.isArray(tableState.orders)) {
      // 檢查是否只有入座標記
      const onlySeatedMarker =
        tableState.orders.length === 1 &&
        tableState.orders[0] &&
        tableState.orders[0].__seated;

      if (onlySeatedMarker) {
        ordersForDisplay[tableId] = [{ __seated_only: true }];
        return;
      }

      // 過濾掉入座標記，只顯示真正的訂單
      const realOrders = tableState.orders.filter((item) => {
        return item && typeof item === "object" && !item.__seated;
      });

      if (realOrders.length > 0) {
        // 重要：將扁平化的訂單重新包裝為批次格式，保持與現有 UI 的相容性
        ordersForDisplay[tableId] = [realOrders];
      }
    }
  });

  return ordersForDisplay;
};

/**
 * 驗證桌位數據結構的完整性
 * @param {Object} tableStates - 桌位狀態數據
 * @returns {Object} 驗證結果和警告信息
 */
export const validateTableStates = (tableStates) => {
  const warnings = [];
  const errors = [];

  Object.entries(tableStates).forEach(([tableId, state]) => {
    // 檢查基本結構
    if (!state || typeof state !== "object") {
      errors.push(`桌位 ${tableId}: 狀態數據格式錯誤`);
      return;
    }

    // 檢查 orders 結構
    if (state.orders && !Array.isArray(state.orders)) {
      errors.push(`桌位 ${tableId}: orders 必須是陣列`);
    }

    // 檢查巢狀陣列問題
    if (state.orders) {
      const hasNestedArrays = state.orders.some((item) => Array.isArray(item));
      if (hasNestedArrays) {
        const flatItems = state.orders.some(
          (item) => !Array.isArray(item) && item && typeof item === "object"
        );
        if (flatItems) {
          warnings.push(`桌位 ${tableId}: 檢測到混合的扁平化和批次結構`);
        }
      }
    }

    // 檢查時間戳
    if (state.startTime && typeof state.startTime !== "number") {
      warnings.push(`桌位 ${tableId}: startTime 應該是數字類型`);
    }
  });

  return {
    isValid: errors.length === 0,
    warnings,
    errors,
    summary: `檢查完成: ${Object.keys(tableStates).length} 個桌位, ${
      warnings.length
    } 個警告, ${errors.length} 個錯誤`,
  };
};
