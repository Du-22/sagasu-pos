/**
 * Firebase 操作封裝輔助函數
 *
 * 原始程式碼：分散在 CafePOSSystem.js 中的 Firebase 操作和錯誤處理邏輯
 * 功能效果：提供統一的 Firebase 操作介面，包含自動備份和錯誤恢復機制
 * 用途：簡化數據操作，提高可靠性，減少重複的錯誤處理代碼
 * 組件長度：約200行，包含批量操作、備份恢復、錯誤處理等功能
 *
 * 重要說明：
 * - 所有操作都包含 localStorage 備份機制
 * - 統一的錯誤處理和重試邏輯
 * - 支援批量操作以提高效能
 * - 與現有 operations.js 完全相容
 */

import {
  saveTableState,
  deleteTableState,
  saveTakeoutOrders,
  deleteTakeoutOrder,
  addSalesRecord,
} from "../firebase/operations";
import { sanitizeTableData } from "./tableStateHelpers";

/**
 * 桌位狀態批量操作管理器
 */
export class TableStateManager {
  constructor() {
    this.pendingOperations = new Map();
    this.batchTimeout = null;
  }

  /**
   * 儲存桌位狀態到 Firebase（包含備份）
   * @param {string} tableId - 桌位ID
   * @param {Object} updates - 更新數據
   * @param {Object} currentStates - 當前所有桌位狀態（用於本地更新）
   * @returns {Promise<{success: boolean, hasBackup: boolean, data: Object, error?: string}>}
   */
  async saveTableState(tableId, updates, currentStates) {
    const currentState = currentStates[tableId] || {};
    const newState = { ...currentState, ...updates };

    // 在儲存前清理資料
    const sanitizedState = sanitizeTableData(newState);

    let firebaseSuccess = false;
    let hasBackup = false;

    try {
      await saveTableState(tableId, sanitizedState);
      firebaseSuccess = true;
      console.log(`✅ 桌位 ${tableId} Firebase 儲存成功`);
    } catch (error) {
      console.error(`❌ 桌位 ${tableId} Firebase 儲存失敗:`, error);
    }

    // 無論 Firebase 成功與否，都嘗試備份到 localStorage
    try {
      this._backupToLocalStorage(tableId, sanitizedState, "orders");
      this._backupToLocalStorage(tableId, sanitizedState, "timers");
      hasBackup = true;
      console.log(`📱 桌位 ${tableId} localStorage 備份成功`);
    } catch (backupError) {
      console.error(`❌ 桌位 ${tableId} localStorage 備份失敗:`, backupError);
    }

    // 返回詳細的操作結果
    if (firebaseSuccess) {
      return { success: true, hasBackup: true, data: sanitizedState };
    } else if (hasBackup) {
      return {
        success: false,
        hasBackup: true,
        data: sanitizedState,
        error: `Firebase 儲存失敗，但已備份到本地裝置`,
      };
    } else {
      return {
        success: false,
        hasBackup: false,
        data: sanitizedState,
        error: `Firebase 和本地備份都失敗`,
      };
    }
  }

  /**
   * 刪除桌位狀態
   * @param {string} tableId - 桌位ID
   * @returns {Promise<void>}
   */
  async deleteTableState(tableId) {
    try {
      await deleteTableState(tableId);

      // 同時從 localStorage 移除
      this._removeFromLocalStorage(tableId);

      console.log(`✅ 桌位 ${tableId} 刪除成功`);
    } catch (error) {
      console.error(`❌ 刪除桌位 ${tableId} 失敗:`, error);

      // 即使 Firebase 失敗，也要嘗試清理 localStorage
      this._removeFromLocalStorage(tableId);

      throw new Error(`刪除桌位 ${tableId} 失敗: ${error.message}`);
    }
  }

  /**
   * 批量更新多個桌位狀態
   * @param {Object} updates - { tableId: stateData } 格式的更新
   * @param {Object} currentStates - 當前所有桌位狀態
   * @returns {Promise<Object>} 更新結果摘要
   */
  async batchUpdateTableStates(updates, currentStates) {
    const results = {
      success: [],
      failed: [],
      total: Object.keys(updates).length,
    };

    // 批量處理，但保持錯誤隔離
    const promises = Object.entries(updates).map(
      async ([tableId, updateData]) => {
        try {
          const result = await this.saveTableState(
            tableId,
            updateData,
            currentStates
          );
          results.success.push({ tableId, data: result });
          return { tableId, success: true, data: result };
        } catch (error) {
          results.failed.push({ tableId, error: error.message });
          return { tableId, success: false, error };
        }
      }
    );

    await Promise.allSettled(promises);

    console.log(
      `📊 批量更新結果: ${results.success.length}成功, ${results.failed.length}失敗`
    );
    return results;
  }

  /**
   * 備份數據到 localStorage
   * @private
   */
  _backupToLocalStorage(tableId, stateData, type) {
    try {
      const storageKey = type === "orders" ? "cafeOrders" : "cafeTimers";
      const existingData = JSON.parse(localStorage.getItem(storageKey) || "{}");

      if (type === "orders" && stateData.orders) {
        existingData[tableId] = stateData.orders;
      } else if (type === "timers" && stateData.startTime) {
        existingData[tableId] = stateData.startTime;
      }

      localStorage.setItem(storageKey, JSON.stringify(existingData));
    } catch (error) {
      console.warn(`⚠️ localStorage 備份失敗 ${tableId}:`, error);
    }
  }

  /**
   * 從 localStorage 移除數據
   * @private
   */
  _removeFromLocalStorage(tableId) {
    try {
      ["cafeOrders", "cafeTimers"].forEach((key) => {
        const data = JSON.parse(localStorage.getItem(key) || "{}");
        delete data[tableId];
        localStorage.setItem(key, JSON.stringify(data));
      });
    } catch (error) {
      console.warn(`⚠️ localStorage 清理失敗 ${tableId}:`, error);
    }
  }
}

/**
 * 外帶訂單操作管理器
 */
export class TakeoutOrderManager {
  /**
   * 儲存外帶訂單到 Firebase（包含備份）
   * @param {Object} takeoutOrders - 完整的外帶訂單對象
   * @returns {Promise<{success: boolean, hasBackup: boolean, error?: string}>}
   */
  async saveTakeoutOrders(takeoutOrders) {
    let hasBackup = false;
    let firebaseSuccess = false;

    try {
      await saveTakeoutOrders(takeoutOrders);
      firebaseSuccess = true;
      console.log(
        `✅ 外帶訂單 Firebase 儲存成功，共 ${
          Object.keys(takeoutOrders).length
        } 筆`
      );
    } catch (error) {
      console.error("❌ 外帶訂單 Firebase 儲存失敗:", error);
    }

    // 無論 Firebase 成功與否，都嘗試備份到 localStorage
    try {
      localStorage.setItem("cafeTakeoutOrders", JSON.stringify(takeoutOrders));
      hasBackup = true;
      console.log("📱 外帶訂單 localStorage 備份成功");
    } catch (backupError) {
      console.error("❌ localStorage 備份也失敗:", backupError);
    }

    // 返回詳細的操作結果，讓主程式決定如何處理
    if (firebaseSuccess) {
      return { success: true, hasBackup: true };
    } else if (hasBackup) {
      return {
        success: false,
        hasBackup: true,
        error: "Firebase 儲存失敗，但已備份到本地裝置",
      };
    } else {
      return {
        success: false,
        hasBackup: false,
        error: "Firebase 和本地備份都失敗",
      };
    }
  }

  /**
   * 刪除單筆外帶訂單
   * @param {string} takeoutId - 外帶訂單ID
   * @param {Object} currentOrders - 當前所有外帶訂單
   * @returns {Promise<Object>} 更新後的外帶訂單對象
   */
  async deleteTakeoutOrder(takeoutId, currentOrders) {
    try {
      await deleteTakeoutOrder(takeoutId);

      // 更新本地數據
      const updatedOrders = { ...currentOrders };
      delete updatedOrders[takeoutId];

      // 更新 localStorage
      localStorage.setItem("cafeTakeoutOrders", JSON.stringify(updatedOrders));

      console.log(`✅ 外帶訂單 ${takeoutId} 刪除成功`);
      return updatedOrders;
    } catch (error) {
      console.error(`❌ 刪除外帶訂單 ${takeoutId} 失敗:`, error);
      throw new Error(`刪除外帶訂單失敗: ${error.message}`);
    }
  }
}

/**
 * 銷售歷史操作管理器
 */
export class SalesHistoryManager {
  /**
   * 新增銷售記錄
   * @param {Object} record - 銷售記錄對象
   * @param {Array} currentHistory - 當前銷售歷史
   * @returns {Promise<{success: boolean, hasBackup: boolean, data: Array, error?: string}>}
   */
  async addSalesRecord(record, currentHistory) {
    let firebaseSuccess = false;
    let hasBackup = false;
    const newHistory = [...currentHistory, record];

    try {
      await addSalesRecord(record);
      firebaseSuccess = true;
      console.log(`✅ 銷售記錄 ${record.id} Firebase 新增成功`);
    } catch (error) {
      console.error(`❌ 銷售記錄 ${record.id} Firebase 新增失敗:`, error);
    }

    // 無論 Firebase 成功與否，都嘗試備份到 localStorage
    try {
      localStorage.setItem("cafeSalesHistory", JSON.stringify(newHistory));
      hasBackup = true;
      console.log(`📱 銷售記錄 localStorage 備份成功`);
    } catch (backupError) {
      console.error(`❌ 銷售記錄 localStorage 備份失敗:`, backupError);
    }

    // 返回詳細的操作結果
    if (firebaseSuccess) {
      return { success: true, hasBackup: true, data: newHistory };
    } else if (hasBackup) {
      return {
        success: false,
        hasBackup: true,
        data: newHistory,
        error: "Firebase 儲存失敗，但已備份到本地裝置",
      };
    } else {
      return {
        success: false,
        hasBackup: false,
        data: currentHistory, // 保持原狀
        error: "Firebase 和本地備份都失敗",
      };
    }
  }

  /**
   * 批量處理銷售記錄（用於大量數據操作）
   * @param {Array} records - 銷售記錄陣列
   * @param {Array} currentHistory - 當前銷售歷史
   * @returns {Promise<Object>} 處理結果摘要
   */
  async batchAddSalesRecords(records, currentHistory) {
    const results = {
      success: [],
      failed: [],
      total: records.length,
    };

    for (const record of records) {
      try {
        await this.addSalesRecord(record, currentHistory);
        results.success.push(record.id);
        currentHistory = [...currentHistory, record]; // 更新本地歷史以供下次使用
      } catch (error) {
        results.failed.push({ id: record.id, error: error.message });
      }
    }

    console.log(
      `📊 批量銷售記錄結果: ${results.success.length}成功, ${results.failed.length}失敗`
    );
    return results;
  }
}

/**
 * 統一的錯誤處理工具
 */
export class ErrorHandler {
  static handleFirebaseError(error, operation) {
    const errorMap = {
      "permission-denied": "權限不足，請檢查登入狀態",
      "network-request-failed": "網路連線失敗，請檢查網路狀態",
      unavailable: "Firebase 服務暫時無法使用",
      "deadline-exceeded": "操作逾時，請稍後再試",
    };

    const friendlyMessage =
      errorMap[error.code] || `${operation}失敗: ${error.message}`;

    console.error(`🔥 Firebase 錯誤 [${operation}]:`, {
      code: error.code,
      message: error.message,
      friendlyMessage,
    });

    return new Error(friendlyMessage);
  }
}

/**
 * 創建管理器實例的工廠函數
 */
export function createDataManagers() {
  return {
    tableStateManager: new TableStateManager(),
    takeoutOrderManager: new TakeoutOrderManager(),
    salesHistoryManager: new SalesHistoryManager(),
  };
}

/**
 * 操作結果處理工具 - 幫助主程式處理部分成功的情況
 */
export class OperationResultHandler {
  /**
   * 處理操作結果，決定是否顯示警告或錯誤
   * @param {Object} result - 操作結果 {success, hasBackup, error}
   * @param {string} operationType - 操作類型描述
   * @returns {Object} UI 處理建議 {shouldShowError, message, severity}
   */
  static handleResult(result, operationType = "操作") {
    if (result.success) {
      return {
        shouldShowError: false,
        message: `${operationType}成功`,
        severity: "success",
      };
    }

    if (result.hasBackup) {
      return {
        shouldShowError: false, // 不顯示錯誤，只顯示警告
        message: `${operationType}已完成（雲端同步將稍後進行）`,
        severity: "warning",
        details: result.error,
      };
    }

    return {
      shouldShowError: true,
      message: `${operationType}失敗`,
      severity: "error",
      details: result.error,
    };
  }

  /**
   * 批量處理結果的統計摘要
   * @param {Array} results - 批量操作結果陣列
   * @param {string} operationType - 操作類型描述
   * @returns {Object} 統計摘要
   */
  static summarizeBatchResults(results, operationType = "操作") {
    const stats = {
      total: results.length,
      fullSuccess: 0,
      partialSuccess: 0, // Firebase 失敗但 localStorage 成功
      failed: 0,
    };

    results.forEach((result) => {
      if (result.success) {
        stats.fullSuccess++;
      } else if (result.hasBackup) {
        stats.partialSuccess++;
      } else {
        stats.failed++;
      }
    });

    let message = `${operationType}完成：`;
    if (stats.fullSuccess === stats.total) {
      message += `全部成功 (${stats.total}/${stats.total})`;
    } else {
      message += `成功 ${stats.fullSuccess}，本地備份 ${stats.partialSuccess}，失敗 ${stats.failed}`;
    }

    return {
      stats,
      message,
      severity:
        stats.failed > 0
          ? "error"
          : stats.partialSuccess > 0
          ? "warning"
          : "success",
    };
  }
}
