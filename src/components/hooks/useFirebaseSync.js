import { useState } from "react";
import { saveMenuData } from "../../firebase/operations";

/**
 * useFirebaseSync Hook
 *
 * 原始程式碼：定義在 CafePOSSystem.js 的 Firebase 包裝函數群
 * 功能效果：統一處理所有資料的 Firebase 儲存操作，並管理操作回饋通知
 * 用途：封裝 dataManager 的呼叫與結果處理，讓主元件不需要處理成功/失敗邏輯
 * 組件長度：約 140 行
 *
 * 重要說明：
 * - 所有函數都處理三種結果：完全成功、部分成功（有本地備份）、完全失敗
 * - 部分成功時仍更新 UI，但顯示警告提示
 * - operationFeedback 是 toast 通知狀態，5 秒後自動消失
 */
const useFirebaseSync = ({
  dataManager,
  tableStates,
  salesHistory,
  setTableStates,
  setTakeoutOrders,
  setSalesHistory,
  setMenuData,
}) => {
  // Toast 通知狀態
  const [operationFeedback, setOperationFeedback] = useState({
    show: false,
    message: "",
    severity: "info",
  });

  // 顯示操作回饋通知，5 秒後自動消失
  const showOperationFeedback = (message, severity = "info") => {
    setOperationFeedback({ show: true, message, severity });
    setTimeout(() => {
      setOperationFeedback({ show: false, message: "", severity: "info" });
    }, 5000);
  };

  // 儲存桌位狀態到 Firebase
  const saveTableStateToFirebase = async (tableId, updates) => {
    try {
      const result = await dataManager.saveTableState(
        tableId,
        updates,
        tableStates,
      );

      if (result.success) {
        // 完全成功
        setTableStates((prev) => ({ ...prev, [tableId]: result.data }));
      } else if (result.hasBackup) {
        // 部分成功 - 更新 UI 但顯示警告
        setTableStates((prev) => ({ ...prev, [tableId]: result.data }));
        showOperationFeedback(
          result.uiGuidance.message,
          result.uiGuidance.severity,
        );
      } else {
        // 完全失敗
        showOperationFeedback(
          result.uiGuidance.message,
          result.uiGuidance.severity,
        );
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("❌ 儲存桌位狀態失敗:", error);
      throw error;
    }
  };

  // 刪除桌位狀態
  const deleteTableStateFromFirebase = async (tableId) => {
    try {
      const result = await dataManager.deleteTableState(tableId);

      if (result.success || result.hasBackup) {
        // 成功或部分成功都更新本地狀態
        const newTableStates = { ...tableStates };
        delete newTableStates[tableId];
        setTableStates(newTableStates);

        if (!result.success && result.hasBackup) {
          showOperationFeedback(
            result.uiGuidance.message,
            result.uiGuidance.severity,
          );
        }
      } else {
        // 完全失敗
        showOperationFeedback(
          result.uiGuidance.message,
          result.uiGuidance.severity,
        );
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("❌ 刪除桌位狀態失敗:", error);
      throw error;
    }
  };

  // 儲存外帶訂單到 Firebase
  const saveTakeoutOrdersToFirebase = async (newTakeoutOrders) => {
    try {
      const result = await dataManager.saveTakeoutOrders(newTakeoutOrders);

      if (result.success || result.hasBackup) {
        setTakeoutOrders(newTakeoutOrders);

        if (!result.success && result.hasBackup) {
          showOperationFeedback(
            result.uiGuidance.message,
            result.uiGuidance.severity,
          );
        }
      } else {
        showOperationFeedback(
          result.uiGuidance.message,
          result.uiGuidance.severity,
        );
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("❌ 儲存外帶訂單失敗:", error);
      throw error;
    }
  };

  // 儲存銷售歷史到 Firebase
  const saveSalesHistoryToFirebase = async (newHistory) => {
    try {
      const newRecord = newHistory[newHistory.length - 1]; // 假設新記錄在最後
      const result = await dataManager.addSalesRecord(newRecord, salesHistory);

      if (result.success || result.hasBackup) {
        setSalesHistory(result.data);

        if (!result.success && result.hasBackup) {
          showOperationFeedback(
            result.uiGuidance.message,
            result.uiGuidance.severity,
          );
        }
      } else {
        showOperationFeedback(
          result.uiGuidance.message,
          result.uiGuidance.severity,
        );
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("❌ 儲存銷售歷史失敗:", error);
      throw error;
    }
  };

  // 儲存菜單到 Firebase
  const saveMenuDataToFirebase = async (newMenuData) => {
    // 先更新本地 state（立即反應）
    setMenuData(newMenuData);

    try {
      await saveMenuData(newMenuData);
      showOperationFeedback("✅ 菜單儲存成功", "success");
    } catch (error) {
      console.error("❌ 儲存菜單到 Firebase 失敗:", error);
      showOperationFeedback(
        "⚠️ 雲端同步失敗，已保存到本地裝置。請檢查網路後會自動同步。",
        "warning",
      );
    }
  };

  return {
    operationFeedback,
    showOperationFeedback,
    saveTableStateToFirebase,
    deleteTableStateFromFirebase,
    saveTakeoutOrdersToFirebase,
    saveSalesHistoryToFirebase,
    saveMenuDataToFirebase,
  };
};

export default useFirebaseSync;
