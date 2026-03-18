import { seatingData } from "../components/UI/SeatingArea";

/**
 * useTableActions Hook
 *
 * 原始程式碼：定義在 CafePOSSystem.js 的桌位管理函數群
 * 功能效果：處理所有桌位相關的操作，包含狀態判斷、入座、清桌、換桌、釋放座位
 * 用途：封裝桌位業務邏輯，讓主元件只負責組合 hooks 和路由
 * 組件長度：約 130 行
 *
 * 重要說明：
 * - getTableStatus 是 closure，直接讀取 tableStates 和 takeoutOrders
 * - handleMoveTable 在換桌後會強制更新本地 state，確保 UI 立即反映（不等 Firebase 回應）
 * - handleTableClick 對不同狀態的桌子執行不同動作：
 *   available → 帶位確認 | seated/occupied → 進入點餐 | ready-to-clean → 清桌
 */
const useTableActions = ({
  tableStates,
  takeoutOrders,
  pendingSeatTable,
  saveTableStateToFirebase,
  deleteTableStateFromFirebase,
  setTableStates,
  setSelectedTable,
  setCurrentOrder,
  setCurrentView,
  setShowSeatConfirmModal,
  setPendingSeatTable,
  setShowMoveTableModal,
  setMoveTableTarget,
}) => {
  // 取得所有桌號（供換桌 modal 使用）
  const allTableIds = Object.values(seatingData)
    .flat()
    .map((table) => table.id);

  // 取得桌位狀態
  // 重要：外帶（T開頭）和內用桌位邏輯分開處理
  const getTableStatus = (tableId) => {
    if (tableId.startsWith("T")) {
      const takeoutData = takeoutOrders[tableId];
      if (takeoutData) {
        return takeoutData.paid ? "takeout-paid" : "takeout-unpaid";
      }
      return "takeout-new";
    }

    const tableState = tableStates[tableId];

    if (!tableState || !tableState.orders || tableState.orders.length === 0) {
      return "available";
    }

    // 詳細檢查入座狀態
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

    if (hasUnpaidItems) return "occupied";
    if (hasPaidItems) return "ready-to-clean";
    return "available";
  };

  // 點擊桌位：依狀態執行對應動作
  const handleTableClick = (tableId) => {
    const status = getTableStatus(tableId);
    if (status === "available") {
      setPendingSeatTable(tableId);
      setShowSeatConfirmModal(true);
    } else if (status === "seated" || status === "occupied") {
      setSelectedTable(tableId);
      setCurrentOrder([]);
      setTimeout(() => {
        setCurrentView("ordering");
      }, 10);
    } else if (status === "ready-to-clean") {
      handleCleanTable(tableId);
    }
  };

  // 確認帶位入座
  const handleSeatConfirm = async () => {
    const seatData = {
      orders: [{ __seated: true, timestamp: new Date().toISOString() }],
      startTime: Date.now(),
      status: "seated",
    };

    await saveTableStateToFirebase(pendingSeatTable, seatData);
    setShowSeatConfirmModal(false);
    setPendingSeatTable(null);
  };

  // 清理桌子（刪除整個桌位狀態，包含計時器）
  const handleCleanTable = async (tableId) => {
    try {
      await deleteTableStateFromFirebase(tableId);
    } catch (error) {
      console.error("清理桌子失敗:", error);
    }
  };

  // 換桌邏輯
  // 重要：Firebase 更新後還需要強制同步本地 state，確保 UI 立即反映
  const handleMoveTable = async (fromTable, toTable) => {
    if (!fromTable || !toTable || fromTable === toTable) return;

    const targetTableStatus = getTableStatus(toTable);

    if (
      targetTableStatus !== "available" &&
      targetTableStatus !== "ready-to-clean"
    ) {
      alert("目標桌不可用，請選擇空桌或待清理的桌子。");
      return;
    }

    const fromTableState = tableStates[fromTable];
    if (!fromTableState?.orders || fromTableState.orders.length === 0) {
      alert("原桌沒有訂單可搬移。");
      return;
    }

    try {
      await saveTableStateToFirebase(toTable, {
        orders: fromTableState.orders,
        startTime: fromTableState.startTime || Date.now(),
        status: fromTableState.status,
      });

      await deleteTableStateFromFirebase(fromTable);

      // 強制更新本地 state，確保 UI 立即反映（不等 Firebase 回應）
      setTableStates((prevStates) => {
        const newStates = { ...prevStates };
        newStates[toTable] = {
          orders: fromTableState.orders,
          startTime: fromTableState.startTime || Date.now(),
          status: fromTableState.status,
          updatedAt: new Date().toISOString(),
        };
        delete newStates[fromTable];
        return newStates;
      });

      setSelectedTable(toTable);
      setCurrentOrder([]);
      setShowMoveTableModal(false);
      setMoveTableTarget("");
      setCurrentView("seating");
    } catch (error) {
      console.error("❌ 換桌操作失敗:", error);
      alert("換桌失敗，請稍後再試");
    }
  };

  // 釋放座位（入座後反悔，未點餐就離開）
  const handleReleaseSeat = async (tableId) => {
    try {
      await deleteTableStateFromFirebase(tableId);
      setCurrentView("seating");
      setSelectedTable(null);
    } catch (error) {
      console.error("釋放座位失敗:", error);
    }
  };

  return {
    allTableIds,
    getTableStatus,
    handleTableClick,
    handleSeatConfirm,
    handleCleanTable,
    handleMoveTable,
    handleReleaseSeat,
  };
};

export default useTableActions;
