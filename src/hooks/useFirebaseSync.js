import { saveMenuData } from "../firebase/operations";

/**
 * useFirebaseSync Hook
 *
 * 原始程式碼：定義在 CafePOSSystem.js 的 Firebase 包裝函數群
 * 功能效果：統一處理所有資料的 Firebase 儲存操作
 * 用途：封裝 dataManager 的呼叫與結果處理，讓主元件不需要處理成功/失敗邏輯
 * 組件長度：約 120 行
 *
 * 重要說明：
 * - 所有函數都處理三種結果：完全成功、部分成功（有本地備份）、完全失敗
 * - 部分成功時仍更新 UI
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
        // 部分成功 - 更新 UI
        setTableStates((prev) => ({ ...prev, [tableId]: result.data }));
      } else {
        // 完全失敗
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

      } else {
        // 完全失敗
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
      } else {
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
      } else {
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
    } catch (error) {
      console.error("❌ 儲存菜單到 Firebase 失敗:", error);
    }
  };

  return {
    saveTableStateToFirebase,
    deleteTableStateFromFirebase,
    saveTakeoutOrdersToFirebase,
    saveSalesHistoryToFirebase,
    saveMenuDataToFirebase,
  };
};

export default useFirebaseSync;
