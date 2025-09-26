/**
 * 統一數據管理 Hook
 *
 * 原始程式碼：CafePOSSystem.js 中分散的數據操作邏輯
 * 功能效果：提供統一的數據操作介面，包含智慧重試、錯誤處理和狀態管理
 * 用途：簡化主程式邏輯，集中管理所有數據操作，提供一致的錯誤處理體驗
 * 組件長度：約300行，包含所有數據操作的統一介面
 *
 * 重要說明：
 * - 實現智慧重試機制，可根據應用狀態決策
 * - 與現有 checkout 函數完全相容
 * - 提供詳細的操作結果回饋
 * - 自動處理 localStorage 備份
 */

import { useState, useCallback } from "react";
import {
  createDataManagers,
  OperationResultHandler,
} from "../../utils/firebaseHelpers";
import {
  getTableStatus,
  getTimersForDisplay,
  getOrdersForDisplay,
  validateTableStates,
} from "../../utils/tableStateHelpers";

/**
 * 統一數據管理 Hook
 * @returns {Object} 數據管理介面
 */
const useDataManager = () => {
  // 創建管理器實例（只創建一次）
  const [managers] = useState(() => createDataManagers());

  // 操作狀態追蹤
  const [operationStates, setOperationStates] = useState({
    isSaving: false,
    lastOperation: null,
    retryCount: 0,
  });

  /**
   * 智慧重試機制 - Hook 層實現
   * @param {Function} operation - 要執行的操作
   * @param {Object} options - 重試選項
   * @returns {Promise} 操作結果
   */
  const withSmartRetry = useCallback(async (operation, options = {}) => {
    const {
      maxRetries = 3,
      baseDelay = 1000,
      shouldRetry = (error) => error.code !== "permission-denied", // 預設重試條件
      onRetry = () => {}, // 重試回調
    } = options;

    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        setOperationStates((prev) => ({
          ...prev,
          isSaving: true,
          retryCount: attempt - 1,
        }));

        const result = await operation();

        setOperationStates((prev) => ({
          ...prev,
          isSaving: false,
          lastOperation: "success",
          retryCount: 0,
        }));

        return result;
      } catch (error) {
        lastError = error;
        console.warn(`操作失敗，嘗試 ${attempt}/${maxRetries}:`, error.message);

        // 檢查是否應該重試
        if (attempt === maxRetries || !shouldRetry(error)) {
          setOperationStates((prev) => ({
            ...prev,
            isSaving: false,
            lastOperation: "error",
            retryCount: 0,
          }));
          throw error;
        }

        // 執行重試回調
        onRetry(attempt, error);

        // 指數退避延遲
        const delay = baseDelay * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }, []);

  /**
   * 儲存桌位狀態（包含智慧重試）
   * @param {string} tableId - 桌位ID
   * @param {Object} updates - 更新數據
   * @param {Object} currentStates - 當前桌位狀態
   * @param {Object} options - 操作選項
   * @returns {Promise<Object>} 操作結果
   */
  const saveTableState = useCallback(
    async (tableId, updates, currentStates, options = {}) => {
      const {
        skipRetry = false,
        onPartialSuccess = () => {}, // 部分成功回調
        onFullFailure = () => {}, // 完全失敗回調
      } = options;

      const operation = async () => {
        return await managers.tableStateManager.saveTableState(
          tableId,
          updates,
          currentStates
        );
      };

      try {
        const result = skipRetry
          ? await operation()
          : await withSmartRetry(operation, {
              onRetry: (attempt, error) => {
                console.log(`重試儲存桌位 ${tableId}，第 ${attempt} 次嘗試`);
              },
            });

        // 處理操作結果
        const uiGuidance = OperationResultHandler.handleResult(
          result,
          "桌位儲存"
        );

        if (!result.success && result.hasBackup) {
          onPartialSuccess(uiGuidance);
        }

        return {
          ...result,
          uiGuidance,
        };
      } catch (error) {
        console.error(`桌位 ${tableId} 儲存完全失敗:`, error);
        onFullFailure(error);

        return {
          success: false,
          hasBackup: false,
          data: null,
          error: error.message,
          uiGuidance: {
            shouldShowError: true,
            message: "儲存失敗，請檢查網路連線",
            severity: "error",
          },
        };
      }
    },
    [managers.tableStateManager, withSmartRetry]
  );

  /**
   * 刪除桌位狀態
   * @param {string} tableId - 桌位ID
   * @param {Object} options - 操作選項
   * @returns {Promise<Object>} 操作結果
   */
  const deleteTableState = useCallback(
    async (tableId, options = {}) => {
      const { skipRetry = false } = options;

      const operation = async () => {
        await managers.tableStateManager.deleteTableState(tableId);
        return { success: true, hasBackup: true };
      };

      try {
        const result = skipRetry
          ? await operation()
          : await withSmartRetry(operation);

        return {
          ...result,
          uiGuidance: OperationResultHandler.handleResult(result, "桌位清理"),
        };
      } catch (error) {
        console.error(`刪除桌位 ${tableId} 失敗:`, error);

        return {
          success: false,
          hasBackup: false,
          error: error.message,
          uiGuidance: {
            shouldShowError: true,
            message: "清理桌位失敗",
            severity: "error",
          },
        };
      }
    },
    [managers.tableStateManager, withSmartRetry]
  );

  /**
   * 儲存外帶訂單
   * @param {Object} takeoutOrders - 外帶訂單數據
   * @param {Object} options - 操作選項
   * @returns {Promise<Object>} 操作結果
   */
  const saveTakeoutOrders = useCallback(
    async (takeoutOrders, options = {}) => {
      const { skipRetry = false } = options;

      const operation = async () => {
        return await managers.takeoutOrderManager.saveTakeoutOrders(
          takeoutOrders
        );
      };

      try {
        const result = skipRetry
          ? await operation()
          : await withSmartRetry(operation);

        return {
          ...result,
          uiGuidance: OperationResultHandler.handleResult(
            result,
            "外帶訂單儲存"
          ),
        };
      } catch (error) {
        console.error("外帶訂單儲存完全失敗:", error);

        return {
          success: false,
          hasBackup: false,
          error: error.message,
          uiGuidance: {
            shouldShowError: true,
            message: "外帶訂單儲存失敗",
            severity: "error",
          },
        };
      }
    },
    [managers.takeoutOrderManager, withSmartRetry]
  );

  /**
   * 刪除外帶訂單
   * @param {string} takeoutId - 外帶訂單ID
   * @param {Object} currentOrders - 當前外帶訂單
   * @param {Object} options - 操作選項
   * @returns {Promise<Object>} 操作結果
   */
  const deleteTakeoutOrder = useCallback(
    async (takeoutId, currentOrders, options = {}) => {
      const { skipRetry = false } = options;

      const operation = async () => {
        const updatedOrders =
          await managers.takeoutOrderManager.deleteTakeoutOrder(
            takeoutId,
            currentOrders
          );
        return {
          success: true,
          hasBackup: true,
          data: updatedOrders,
        };
      };

      try {
        const result = skipRetry
          ? await operation()
          : await withSmartRetry(operation);

        return {
          ...result,
          uiGuidance: OperationResultHandler.handleResult(
            result,
            "外帶訂單刪除"
          ),
        };
      } catch (error) {
        console.error(`刪除外帶訂單 ${takeoutId} 失敗:`, error);

        return {
          success: false,
          hasBackup: false,
          data: currentOrders, // 保持原狀
          error: error.message,
          uiGuidance: {
            shouldShowError: true,
            message: "刪除外帶訂單失敗",
            severity: "error",
          },
        };
      }
    },
    [managers.takeoutOrderManager, withSmartRetry]
  );

  /**
   * 新增銷售記錄
   * @param {Object} record - 銷售記錄
   * @param {Array} currentHistory - 當前銷售歷史
   * @param {Object} options - 操作選項
   * @returns {Promise<Object>} 操作結果
   */
  const addSalesRecord = useCallback(
    async (record, currentHistory, options = {}) => {
      const { skipRetry = false } = options;

      const operation = async () => {
        return await managers.salesHistoryManager.addSalesRecord(
          record,
          currentHistory
        );
      };

      try {
        const result = skipRetry
          ? await operation()
          : await withSmartRetry(operation);

        return {
          ...result,
          uiGuidance: OperationResultHandler.handleResult(
            result,
            "銷售記錄新增"
          ),
        };
      } catch (error) {
        console.error("新增銷售記錄完全失敗:", error);

        return {
          success: false,
          hasBackup: false,
          data: currentHistory, // 保持原狀
          error: error.message,
          uiGuidance: {
            shouldShowError: true,
            message: "銷售記錄儲存失敗",
            severity: "error",
          },
        };
      }
    },
    [managers.salesHistoryManager, withSmartRetry]
  );

  /**
   * 獲取桌位狀態（使用 tableStateHelpers）
   */
  const getTableStatusForId = useCallback(
    (tableId, tableStates, takeoutOrders) => {
      return getTableStatus(tableId, tableStates, takeoutOrders);
    },
    []
  );

  /**
   * 獲取用於顯示的計時器數據
   */
  const getDisplayTimers = useCallback((tableStates) => {
    return getTimersForDisplay(tableStates);
  }, []);

  /**
   * 獲取用於顯示的訂單數據
   */
  const getDisplayOrders = useCallback((tableStates) => {
    return getOrdersForDisplay(tableStates);
  }, []);

  /**
   * 驗證桌位數據完整性
   */
  const validateTableData = useCallback((tableStates) => {
    return validateTableStates(tableStates);
  }, []);

  /**
   * 批量操作 - 多個桌位狀態更新
   * @param {Object} updates - { tableId: updateData } 格式
   * @param {Object} currentStates - 當前桌位狀態
   * @returns {Promise<Object>} 批量操作結果
   */
  const batchUpdateTableStates = useCallback(
    async (updates, currentStates) => {
      try {
        const result = await managers.tableStateManager.batchUpdateTableStates(
          updates,
          currentStates
        );
        const summary = OperationResultHandler.summarizeBatchResults(
          Object.values(result.success).concat(Object.values(result.failed)),
          "批量桌位更新"
        );

        return {
          ...result,
          summary,
        };
      } catch (error) {
        console.error("批量更新桌位狀態失敗:", error);

        return {
          success: [],
          failed: Object.keys(updates).map((tableId) => ({
            tableId,
            error: error.message,
          })),
          total: Object.keys(updates).length,
          summary: {
            message: "批量更新完全失敗",
            severity: "error",
          },
        };
      }
    },
    [managers.tableStateManager]
  );

  // 返回統一的數據管理介面
  return {
    // 核心數據操作
    saveTableState,
    deleteTableState,
    saveTakeoutOrders,
    deleteTakeoutOrder,
    addSalesRecord,

    // 批量操作
    batchUpdateTableStates,

    // 狀態查詢工具
    getTableStatusForId,
    getDisplayTimers,
    getDisplayOrders,
    validateTableData,

    // 操作狀態
    operationStates,

    // 重試控制（進階使用）
    withSmartRetry,
  };
};

export default useDataManager;
