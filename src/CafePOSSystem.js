import React, { useState, useEffect } from "react";
import OrderingPage from "./components/menuData/OrderingPage";
import SeatingPage from "./components/seatingData/SeatingPage";
import HistoryPage from "./components/pages/HistoryPage";
import MenuEditorPage from "./components/pages/MenuEditorPage";
import defaultMenuData from "./components/menuData/defaultMenuData";
import { seatingData } from "./components/seatingData/SeatingArea";

// Firebase 操作函數 imports - 使用新版本
import {
  getMenuData,
  saveMenuData,
  getTableStates,
  saveTableState,
  updateTableState,
  deleteTableState,
  getTakeoutOrders,
  saveTakeoutOrders,
  deleteTakeoutOrder,
  getSalesHistory,
  addSalesRecord,
  updateSalesRecord,
} from "./firebase/operations";

const CafePOSSystem = () => {
  const [currentFloor, setCurrentFloor] = useState("1F");
  const [selectedTable, setSelectedTable] = useState(null);
  const [currentView, setCurrentView] = useState("seating");

  // 新的數據結構：tableStates 包含 orders + timers + status
  const [tableStates, setTableStates] = useState({});

  const [currentOrder, setCurrentOrder] = useState([]);
  const [takeoutOrders, setTakeoutOrders] = useState({});
  const [nextTakeoutId, setNextTakeoutId] = useState(1);
  const [salesHistory, setSalesHistory] = useState([]);
  const [menuData, setMenuData] = useState(defaultMenuData);
  const [showMoveTableModal, setShowMoveTableModal] = useState(false);
  const [moveTableTarget, setMoveTableTarget] = useState("");

  // 入座相關狀態
  const [showSeatConfirmModal, setShowSeatConfirmModal] = useState(false);
  const [pendingSeatTable, setPendingSeatTable] = useState(null);

  // 載入狀態
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {}, [currentView, selectedTable]);

  // 輔助函數：為了相容性，提供 timers 格式給 UI 組件
  const getTimersForDisplay = () => {
    const timersForDisplay = {};
    Object.entries(tableStates).forEach(([tableId, tableState]) => {
      if (tableState.startTime) {
        timersForDisplay[tableId] = tableState.startTime;
      }
    });
    return timersForDisplay;
  };

  // 輔助函數：為了相容性，提供 orders 格式給 UI 組件
  const getOrdersForDisplay = () => {
    const ordersForDisplay = {};
    Object.entries(tableStates).forEach(([tableId, tableState]) => {
      if (tableState.orders) {
        ordersForDisplay[tableId] = tableState.orders;
      }
    });
    return ordersForDisplay;
  };

  // 從 Firebase 載入所有數據
  useEffect(() => {
    const loadAllData = async () => {
      setIsLoading(true);
      setLoadError(null);

      try {
        console.log("🔄 開始載入數據...");

        // 同時載入所有數據
        const [
          firebaseMenuData,
          firebaseTableStates,
          firebaseTakeoutOrders,
          firebaseSalesHistory,
        ] = await Promise.all([
          getMenuData(),
          getTableStates(),
          getTakeoutOrders(),
          getSalesHistory(),
        ]);

        // 設置菜單數據
        if (firebaseMenuData && firebaseMenuData.length > 0) {
          console.log(
            "📋 從 Firebase 載入菜單:",
            firebaseMenuData.length,
            "項"
          );
          setMenuData(firebaseMenuData);
        } else {
          console.log("📋 首次使用，儲存預設菜單到 Firebase");
          await saveMenuData(defaultMenuData);
          setMenuData(defaultMenuData);
        }

        // 設置桌位狀態（新的整合數據）
        console.log(
          "🪑 載入桌位狀態:",
          Object.keys(firebaseTableStates || {}).length,
          "桌"
        );
        setTableStates(firebaseTableStates || {});

        // 設置外帶訂單
        console.log(
          "📦 載入外帶訂單:",
          Object.keys(firebaseTakeoutOrders || {}).length,
          "筆"
        );
        setTakeoutOrders(firebaseTakeoutOrders || {});

        // 設置銷售歷史
        console.log(
          "💰 載入銷售歷史:",
          firebaseSalesHistory?.length || 0,
          "筆"
        );
        setSalesHistory(firebaseSalesHistory || []);

        console.log("✅ 所有數據載入完成");
      } catch (error) {
        console.error("❌ 載入數據失敗:", error);
        setLoadError("載入數據失敗，請檢查網路連線");
        loadFromLocalStorage();
      } finally {
        setIsLoading(false);
      }
    };

    loadAllData();
  }, []);

  // 備用：從 localStorage 載入數據
  const loadFromLocalStorage = () => {
    try {
      console.log("📦 嘗試從 localStorage 載入備份數據");

      const savedHistory = localStorage.getItem("cafeSalesHistory");
      if (savedHistory) {
        setSalesHistory(JSON.parse(savedHistory));
      }

      const savedOrders = localStorage.getItem("cafeOrders");
      const savedTimers = localStorage.getItem("cafeTimers");
      if (savedOrders && savedTimers) {
        const orders = JSON.parse(savedOrders);
        const timers = JSON.parse(savedTimers);

        // 將舊格式轉換為新格式
        const convertedTableStates = {};
        Object.keys(orders).forEach((tableId) => {
          convertedTableStates[tableId] = {
            orders: orders[tableId],
            startTime: timers[tableId] || Date.now(),
            status: getTableStatusFromOrders(orders[tableId]),
            updatedAt: new Date().toISOString(),
          };
        });
        setTableStates(convertedTableStates);
      }

      const savedTakeoutOrders = localStorage.getItem("cafeTakeoutOrders");
      if (savedTakeoutOrders) {
        setTakeoutOrders(JSON.parse(savedTakeoutOrders));
      }

      console.log("📦 從 localStorage 載入備份數據完成");
    } catch (error) {
      console.error("載入 localStorage 備份數據失敗:", error);
    }
  };

  // 輔助函數：從訂單推斷桌位狀態
  const getTableStatusFromOrders = (orderBatches) => {
    if (!orderBatches || orderBatches.length === 0) return "available";

    // 檢查是否有入座標記
    if (orderBatches.length === 1 && orderBatches[0]?.[0]?.__seated) {
      return "seated";
    }

    // 檢查付款狀態
    const hasUnpaidItems = orderBatches.some(
      (batch) =>
        Array.isArray(batch) && batch.some((item) => item.paid === false)
    );

    if (hasUnpaidItems) return "occupied";

    const hasPaidItems = orderBatches.some(
      (batch) =>
        Array.isArray(batch) && batch.some((item) => item.paid === true)
    );

    return hasPaidItems ? "ready-to-clean" : "available";
  };

  // 新版本：儲存桌位狀態到 Firebase
  const saveTableStateToFirebase = async (tableId, updates) => {
    const currentState = tableStates[tableId] || {};
    const newState = { ...currentState, ...updates };

    setTableStates((prev) => ({
      ...prev,
      [tableId]: newState,
    }));

    try {
      await saveTableState(tableId, newState);

      // 同時保存到 localStorage 作為備份（舊格式）
      if (newState.orders) {
        const oldOrders = JSON.parse(
          localStorage.getItem("cafeOrders") || "{}"
        );
        oldOrders[tableId] = newState.orders;
        localStorage.setItem("cafeOrders", JSON.stringify(oldOrders));
      }

      if (newState.startTime) {
        const oldTimers = JSON.parse(
          localStorage.getItem("cafeTimers") || "{}"
        );
        oldTimers[tableId] = newState.startTime;
        localStorage.setItem("cafeTimers", JSON.stringify(oldTimers));
      }
    } catch (error) {
      console.error("儲存桌位狀態到 Firebase 失敗:", error);

      // 失敗時至少保存到 localStorage
      if (newState.orders) {
        const oldOrders = JSON.parse(
          localStorage.getItem("cafeOrders") || "{}"
        );
        oldOrders[tableId] = newState.orders;
        localStorage.setItem("cafeOrders", JSON.stringify(oldOrders));
      }
    }
  };

  // 刪除桌位狀態
  const deleteTableStateFromFirebase = async (tableId) => {
    const newTableStates = { ...tableStates };
    delete newTableStates[tableId];
    setTableStates(newTableStates);

    try {
      await deleteTableState(tableId);

      // 同時從 localStorage 移除
      const oldOrders = JSON.parse(localStorage.getItem("cafeOrders") || "{}");
      const oldTimers = JSON.parse(localStorage.getItem("cafeTimers") || "{}");
      delete oldOrders[tableId];
      delete oldTimers[tableId];
      localStorage.setItem("cafeOrders", JSON.stringify(oldOrders));
      localStorage.setItem("cafeTimers", JSON.stringify(oldTimers));
    } catch (error) {
      console.error("刪除桌位狀態失敗:", error);
    }
  };

  // 儲存外帶訂單到 Firebase
  const saveTakeoutOrdersToFirebase = async (newTakeoutOrders) => {
    setTakeoutOrders(newTakeoutOrders);

    try {
      await saveTakeoutOrders(newTakeoutOrders);
      localStorage.setItem(
        "cafeTakeoutOrders",
        JSON.stringify(newTakeoutOrders)
      );
    } catch (error) {
      console.error("儲存外帶訂單到 Firebase 失敗:", error);
      localStorage.setItem(
        "cafeTakeoutOrders",
        JSON.stringify(newTakeoutOrders)
      );
    }
  };

  // 儲存銷售歷史到 Firebase
  const saveSalesHistoryToFirebase = async (newHistory) => {
    setSalesHistory(newHistory);

    try {
      localStorage.setItem("cafeSalesHistory", JSON.stringify(newHistory));
    } catch (error) {
      console.error("儲存銷售歷史到 Firebase 失敗:", error);
      localStorage.setItem("cafeSalesHistory", JSON.stringify(newHistory));
    }
  };

  // 儲存菜單到 Firebase
  const saveMenuDataToFirebase = async (newMenuData) => {
    setMenuData(newMenuData);

    try {
      await saveMenuData(newMenuData);
      console.log("✅ 菜單儲存到 Firebase 成功");
    } catch (error) {
      console.error("❌ 儲存菜單到 Firebase 失敗:", error);
    }
  };

  // 取得所有桌號
  const allTableIds = Object.values(seatingData)
    .flat()
    .map((table) => table.id);

  // 換桌邏輯（使用新數據結構）
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

    // 複製桌位狀態到新桌位
    await saveTableStateToFirebase(toTable, {
      orders: fromTableState.orders,
      startTime: fromTableState.startTime || Date.now(),
      status: fromTableState.status,
    });

    // 刪除原桌位狀態
    await deleteTableStateFromFirebase(fromTable);

    setSelectedTable(toTable);
    setShowMoveTableModal(false);
    setMoveTableTarget("");
    setCurrentOrder([]);
    setCurrentView("ordering");
  };

  const generateHistoryId = () => {
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0].replace(/-/g, "");
    const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, "");
    const randomStr = Math.random().toString(36).substr(2, 3).toUpperCase();
    return `H${dateStr}${timeStr}${randomStr}`;
  };

  const generateGroupId = () => {
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0].replace(/-/g, "");
    const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, "");
    const randomStr = Math.random().toString(36).substr(2, 2).toUpperCase();
    return `G${dateStr}${timeStr}${randomStr}`;
  };

  // createHistoryRecord 保持不變
  const createHistoryRecord = (
    tableId,
    orderData,
    type = "dine-in",
    paymentMethod = "cash",
    isPartialPayment = false,
    partialItems = null,
    groupId = null
  ) => {
    const now = new Date();
    let items = [];
    let total = 0;

    if (isPartialPayment && partialItems) {
      if (type === "takeout") {
        console.warn("外帶訂單目前不支援部分結帳");
        return null;
      } else {
        if (orderData && Array.isArray(orderData)) {
          orderData.forEach((batch, batchIndex) => {
            if (Array.isArray(batch)) {
              batch.forEach((item, itemIndex) => {
                const key = `${batchIndex}-${itemIndex}`;

                if (partialItems[key]) {
                  const existingItem = items.find(
                    (i) =>
                      i.id === item.id &&
                      JSON.stringify(i.selectedCustom) ===
                        JSON.stringify(item.selectedCustom)
                  );

                  if (existingItem) {
                    existingItem.quantity += item.quantity;
                    existingItem.subtotal =
                      existingItem.price * existingItem.quantity;
                  } else {
                    items.push({
                      id: item.id,
                      name: item.name,
                      price: item.price,
                      quantity: item.quantity,
                      subtotal: item.price * item.quantity,
                      selectedCustom: item.selectedCustom || null,
                    });
                  }
                }
              });
            }
          });
        }
        total = items.reduce((sum, item) => sum + item.subtotal, 0);
      }
    } else {
      if (type === "takeout") {
        if (orderData.batches && Array.isArray(orderData.batches)) {
          orderData.batches.forEach((batch) => {
            batch.forEach((item) => {
              const existingItem = items.find(
                (i) =>
                  i.id === item.id &&
                  JSON.stringify(i.selectedCustom) ===
                    JSON.stringify(item.selectedCustom)
              );
              if (existingItem) {
                existingItem.quantity += item.quantity;
                existingItem.subtotal =
                  existingItem.price * existingItem.quantity;
              } else {
                items.push({
                  id: item.id,
                  name: item.name,
                  price: item.price,
                  quantity: item.quantity,
                  subtotal: item.price * item.quantity,
                  selectedCustom: item.selectedCustom || null,
                });
              }
            });
          });
        }
        total = items.reduce((sum, item) => sum + item.subtotal, 0);
      } else {
        orderData.forEach((batch, batchIndex) => {
          batch.forEach((item, itemIndex) => {
            if (item.paid !== true) {
              const existingItem = items.find(
                (i) =>
                  i.id === item.id &&
                  JSON.stringify(i.selectedCustom) ===
                    JSON.stringify(item.selectedCustom)
              );
              if (existingItem) {
                existingItem.quantity += item.quantity;
                existingItem.subtotal =
                  existingItem.price * existingItem.quantity;
              } else {
                items.push({
                  id: item.id,
                  name: item.name,
                  price: item.price,
                  quantity: item.quantity,
                  subtotal: item.price * item.quantity,
                  selectedCustom: item.selectedCustom || null,
                });
              }
            }
          });
        });
        total = items.reduce((sum, item) => sum + item.subtotal, 0);
      }
    }

    const parts = now
      .toLocaleDateString("zh-TW", { timeZone: "Asia/Taipei" })
      .split("/");
    const taiwanDateStr = `${parts[0]}-${parts[1].padStart(
      2,
      "0"
    )}-${parts[2].padStart(2, "0")}`;

    const finalRecord = {
      id: generateHistoryId(),
      groupId: groupId || generateGroupId(),
      date: taiwanDateStr,
      time: now.toTimeString().slice(0, 8),
      timestamp: now.getTime(),
      type: type,
      table: tableId,
      items: items,
      total: total,
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      paymentMethod,
      isPartialPayment: isPartialPayment,
      partialPaymentInfo: isPartialPayment
        ? {
            totalItems: partialItems ? Object.keys(partialItems).length : 0,
            selectedItems: partialItems
              ? Object.values(partialItems).filter(Boolean).length
              : 0,
            note: "此為部分結帳，僅顯示本次結帳的商品",
          }
        : null,
    };

    return finalRecord;
  };

  // 處理退款（使用 Firebase）
  const handleRefund = async (recordId) => {
    const recordIndex = salesHistory.findIndex(
      (record) => record.id === recordId
    );

    if (recordIndex === -1) {
      alert("找不到該訂單記錄");
      return;
    }

    const record = salesHistory[recordIndex];
    const newSalesHistory = [...salesHistory];
    newSalesHistory[recordIndex] = {
      ...record,
      isRefunded: true,
      refundDate: (() => {
        const now = new Date();
        const parts = now
          .toLocaleDateString("zh-TW", { timeZone: "Asia/Taipei" })
          .split("/");
        return `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(
          2,
          "0"
        )}`;
      })(),
      refundTime: new Date().toTimeString().slice(0, 8),
      refundTimestamp: Date.now(),
    };

    try {
      await updateSalesRecord(recordId, {
        isRefunded: true,
        refundDate: newSalesHistory[recordIndex].refundDate,
        refundTime: newSalesHistory[recordIndex].refundTime,
        refundTimestamp: newSalesHistory[recordIndex].refundTimestamp,
      });

      await saveSalesHistoryToFirebase(newSalesHistory);
      alert(
        `訂單 ${record.table} (${record.time}) 已成功退款 $${record.total}`
      );
    } catch (error) {
      console.error("處理退款失敗:", error);
      alert("退款處理失敗，請稍後再試");
    }
  };

  const handleMenuSelect = (menuId) => {
    setCurrentView(menuId);
  };

  const handleNewTakeout = () => {
    const takeoutId = `T${String(nextTakeoutId).padStart(3, "0")}`;
    setSelectedTable(takeoutId);
    setCurrentOrder([]);
    setCurrentView("ordering");
    setNextTakeoutId(nextTakeoutId + 1);
  };

  const handleTakeoutClick = async (takeoutId) => {
    const orderData = takeoutOrders[takeoutId];
    if (orderData && !orderData.paid) {
      setSelectedTable(takeoutId);
      setCurrentOrder([]);
      setCurrentView("ordering");
    } else if (orderData && orderData.paid) {
      try {
        await deleteTakeoutOrder(takeoutId);
        const newTakeoutOrders = { ...takeoutOrders };
        delete newTakeoutOrders[takeoutId];
        await saveTakeoutOrdersToFirebase(newTakeoutOrders);
      } catch (error) {
        console.error("刪除外帶訂單失敗:", error);
      }
    }
  };

  // 入座確認（使用新數據結構）
  const handleSeatConfirm = async () => {
    await saveTableStateToFirebase(pendingSeatTable, {
      orders: [[{ __seated: true }]],
      startTime: Date.now(),
      status: "seated",
    });

    setShowSeatConfirmModal(false);
    setPendingSeatTable(null);
  };

  // 修改：getTableStatus 使用新數據結構
  const getTableStatus = (tableId) => {
    if (tableId.startsWith("T")) {
      const takeoutData = takeoutOrders[tableId];
      if (takeoutData) {
        return takeoutData.paid ? "takeout-paid" : "takeout-unpaid";
      }
      return "takeout-new";
    }

    const tableState = tableStates[tableId];

    // 如果沒有桌位狀態，表示空桌
    if (!tableState || !tableState.orders || tableState.orders.length === 0) {
      return "available";
    }

    // 檢查入座狀態
    if (
      tableState.orders.length === 1 &&
      tableState.orders[0] &&
      tableState.orders[0][0] &&
      tableState.orders[0][0].__seated
    ) {
      return "seated";
    }

    // 檢查付款狀態
    let hasUnpaidItems = false;
    let hasPaidItems = false;

    for (const batch of tableState.orders) {
      if (Array.isArray(batch)) {
        for (const item of batch) {
          if (item.paid === false) {
            hasUnpaidItems = true;
          } else if (item.paid === true) {
            hasPaidItems = true;
          }
        }
      }
    }

    if (hasUnpaidItems) return "occupied";
    if (hasPaidItems) return "ready-to-clean";
    return "available";
  };

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

  // 清理桌子（使用新數據結構）
  const handleCleanTable = async (tableId) => {
    try {
      await deleteTableStateFromFirebase(tableId);
    } catch (error) {
      console.error("清理桌子失敗:", error);
    }
  };

  // submitOrder（使用新數據結構）
  const submitOrder = async () => {
    if (currentOrder.length === 0) return;

    if (selectedTable.startsWith("T")) {
      // 外帶訂單邏輯保持不變
      const existingTakeoutData = takeoutOrders[selectedTable];
      const newBatch = currentOrder.map((item) => ({
        ...item,
        timestamp: new Date().toISOString(),
        paid: false,
      }));

      const updatedBatches =
        existingTakeoutData && Array.isArray(existingTakeoutData.batches)
          ? [...existingTakeoutData.batches, newBatch]
          : [newBatch];

      const newTakeoutOrders = {
        ...takeoutOrders,
        [selectedTable]: {
          batches: updatedBatches,
          timestamp: existingTakeoutData
            ? existingTakeoutData.timestamp
            : new Date().toISOString(),
          paid: false,
        },
      };

      await saveTakeoutOrdersToFirebase(newTakeoutOrders);
      setCurrentView("seating");
      setSelectedTable(null);
      setCurrentOrder([]);
    } else {
      // 內用訂單（使用新數據結構）
      const currentTableState = tableStates[selectedTable] || {};
      let existingBatches = currentTableState.orders
        ? [...currentTableState.orders]
        : [];

      // 如果是入座狀態，移除 __seated 標記
      if (
        existingBatches.length === 1 &&
        existingBatches[0] &&
        existingBatches[0][0] &&
        existingBatches[0][0].__seated
      ) {
        existingBatches = [];
      }

      const newItems = [];
      const hasEditingItems = currentOrder.some(
        (item) => item.isEditing && !item.isTakeout
      );

      currentOrder.forEach((item) => {
        if (item.isEditing && !item.isTakeout) {
          const {
            isEditing,
            originalBatchIndex,
            originalItemIndex,
            ...updatedItem
          } = item;
          existingBatches[originalBatchIndex][originalItemIndex] = {
            ...updatedItem,
            timestamp: new Date().toISOString(),
            paid: false,
          };
        } else if (!item.isEditing) {
          newItems.push({
            ...item,
            timestamp: new Date().toISOString(),
            paid: false,
          });
        }
      });

      const finalBatches =
        newItems.length > 0 ? [...existingBatches, newItems] : existingBatches;

      // 儲存桌位狀態
      await saveTableStateToFirebase(selectedTable, {
        orders: finalBatches,
        startTime: currentTableState.startTime || Date.now(),
        status: "occupied",
      });

      if (hasEditingItems && newItems.length === 0) {
        setCurrentOrder([]);
      } else {
        setCurrentView("seating");
        setSelectedTable(null);
        setCurrentOrder([]);
      }
    }
  };

  // handleReleaseSeat（使用新數據結構）
  const handleReleaseSeat = async (tableId) => {
    try {
      await deleteTableStateFromFirebase(tableId);
      setCurrentView("seating");
      setSelectedTable(null);
    } catch (error) {
      console.error("釋放座位失敗:", error);
    }
  };

  const addToOrder = (item) => {
    const existingItem = currentOrder.find(
      (orderItem) =>
        orderItem.id === item.id &&
        JSON.stringify(orderItem.selectedCustom || {}) ===
          JSON.stringify(item.selectedCustom || {})
    );
    if (existingItem) {
      setCurrentOrder(
        currentOrder.map((orderItem) =>
          orderItem.id === item.id &&
          JSON.stringify(orderItem.selectedCustom || {}) ===
            JSON.stringify(item.selectedCustom || {})
            ? { ...orderItem, quantity: orderItem.quantity + 1 }
            : orderItem
        )
      );
    } else {
      setCurrentOrder([...currentOrder, { ...item, quantity: 1 }]);
    }
  };

  const updateQuantity = (itemId, quantity) => {
    if (quantity <= 0) {
      setCurrentOrder(currentOrder.filter((item) => item.id !== itemId));
    } else {
      setCurrentOrder(
        currentOrder.map((item) =>
          item.id === itemId ? { ...item, quantity } : item
        )
      );
    }
  };

  // removeFromOrder（使用新數據結構）
  const removeFromOrder = async (itemId) => {
    const removingItem = currentOrder.find((item) => item.id === itemId);

    if (removingItem && removingItem.isEditing) {
      if (removingItem.isTakeout) {
        // 外帶項目邏輯保持不變
        const takeoutData = takeoutOrders[selectedTable];
        if (takeoutData && takeoutData.batches) {
          const batchIndex = removingItem.originalBatchIndex ?? 0;
          const itemIndex = removingItem.originalItemIndex;
          const updatedBatches = takeoutData.batches.map((batch, idx) =>
            idx === batchIndex ? batch.filter((_, i) => i !== itemIndex) : batch
          );
          const filteredBatches = updatedBatches.filter(
            (batch) => batch.length > 0
          );
          const newTakeoutOrders = {
            ...takeoutOrders,
            [selectedTable]: {
              ...takeoutData,
              batches: filteredBatches,
            },
          };
          await saveTakeoutOrdersToFirebase(newTakeoutOrders);
        }
      } else {
        // 內用項目（使用新數據結構）
        const currentTableState = tableStates[selectedTable] || {};
        const batches = currentTableState.orders
          ? [...currentTableState.orders]
          : [];
        const { originalBatchIndex, originalItemIndex } = removingItem;

        if (batches[originalBatchIndex]) {
          batches[originalBatchIndex].splice(originalItemIndex, 1);
          const filteredBatches = batches.filter((batch) => batch.length > 0);

          if (filteredBatches.length > 0) {
            await saveTableStateToFirebase(selectedTable, {
              ...currentTableState,
              orders: filteredBatches,
            });
          } else {
            // 如果沒有訂單了，刪除整個桌位狀態
            await deleteTableStateFromFirebase(selectedTable);
          }
        }
      }
    }

    setCurrentOrder(currentOrder.filter((item) => item.id !== itemId));
  };

  // checkout（使用新數據結構）
  const checkout = async (paymentMethod = "cash", partialItems = null) => {
    if (!selectedTable) return;

    const isPartialCheckout =
      partialItems && Object.values(partialItems).some(Boolean);

    if (selectedTable.startsWith("T")) {
      // 外帶訂單邏輯保持不變
      let takeoutData = takeoutOrders[selectedTable];

      if (!takeoutData && currentOrder.length > 0) {
        const newBatch = currentOrder.map((item) => ({
          ...item,
          timestamp: new Date().toISOString(),
        }));
        takeoutData = {
          batches: [newBatch],
          timestamp: new Date().toISOString(),
          paid: false,
        };
        const newTakeoutOrders = {
          ...takeoutOrders,
          [selectedTable]: takeoutData,
        };
        await saveTakeoutOrdersToFirebase(newTakeoutOrders);
      }

      if (takeoutData && !takeoutData.paid) {
        const historyRecord = createHistoryRecord(
          selectedTable,
          takeoutData,
          "takeout",
          paymentMethod
        );

        try {
          await addSalesRecord(historyRecord);
          const newHistory = [...salesHistory, historyRecord];
          await saveSalesHistoryToFirebase(newHistory);

          const newTakeoutOrders = {
            ...takeoutOrders,
            [selectedTable]: {
              ...takeoutData,
              paid: true,
            },
          };
          await saveTakeoutOrdersToFirebase(newTakeoutOrders);
        } catch (error) {
          console.error("外帶結帳失敗:", error);
          alert("結帳失敗，請稍後再試");
          return;
        }
      }
      setCurrentOrder([]);
      setSelectedTable(null);
      setCurrentView("main");
      return;
    }

    // 內用訂單邏輯（使用新數據結構）
    const currentTableState = tableStates[selectedTable];
    if (currentTableState && currentTableState.orders) {
      const tableOrder = currentTableState.orders;

      let existingGroupId = null;
      if (tableOrder && Array.isArray(tableOrder) && tableOrder.length > 0) {
        for (const batch of tableOrder) {
          if (Array.isArray(batch)) {
            for (const item of batch) {
              if (item.groupId) {
                existingGroupId = item.groupId;
                break;
              }
            }
            if (existingGroupId) break;
          }
        }
      }

      if (isPartialCheckout) {
        // 部分結帳邏輯
        const filteredBatches = [];
        const indexMapping = {};
        const tableBatches = Array.isArray(tableOrder) ? [...tableOrder] : [];

        for (
          let batchIndex = 0;
          batchIndex < tableBatches.length;
          batchIndex++
        ) {
          const batch = tableBatches[batchIndex];
          if (Array.isArray(batch)) {
            const unpaidItems = [];
            let filteredItemIndex = 0;

            batch.forEach((item, originalItemIndex) => {
              if (item.paid === false) {
                unpaidItems.push(item);
                indexMapping[
                  `0-${filteredItemIndex}`
                ] = `${batchIndex}-${originalItemIndex}`;
                filteredItemIndex++;
              }
            });

            if (unpaidItems.length > 0) {
              filteredBatches.push(unpaidItems);
            }
          }
        }

        const mappedPartialItems = {};
        Object.entries(partialItems).forEach(([filteredKey, isSelected]) => {
          const originalKey = indexMapping[filteredKey];
          if (originalKey && isSelected) {
            mappedPartialItems[originalKey] = true;
          }
        });

        const historyRecord = createHistoryRecord(
          selectedTable,
          tableOrder,
          "table",
          paymentMethod,
          true,
          mappedPartialItems,
          existingGroupId
        );

        if (historyRecord) {
          try {
            await addSalesRecord(historyRecord);
            const newHistory = [...salesHistory, historyRecord];
            await saveSalesHistoryToFirebase(newHistory);

            const updatedTableOrder = [...tableOrder];

            Object.entries(mappedPartialItems).forEach(([key, isSelected]) => {
              if (isSelected) {
                const [batchIndex, itemIndex] = key.split("-").map(Number);

                if (
                  updatedTableOrder[batchIndex] &&
                  updatedTableOrder[batchIndex][itemIndex]
                ) {
                  updatedTableOrder[batchIndex][itemIndex] = {
                    ...updatedTableOrder[batchIndex][itemIndex],
                    paid: true,
                    ...(!existingGroupId && historyRecord.groupId
                      ? { groupId: historyRecord.groupId }
                      : {}),
                  };
                }
              }
            });

            if (!existingGroupId && historyRecord.groupId) {
              for (
                let batchIndex = 0;
                batchIndex < updatedTableOrder.length;
                batchIndex++
              ) {
                for (
                  let itemIndex = 0;
                  itemIndex < updatedTableOrder[batchIndex].length;
                  itemIndex++
                ) {
                  if (!updatedTableOrder[batchIndex][itemIndex].groupId) {
                    updatedTableOrder[batchIndex][itemIndex] = {
                      ...updatedTableOrder[batchIndex][itemIndex],
                      groupId: historyRecord.groupId,
                    };
                  }
                }
              }
            }

            await saveTableStateToFirebase(selectedTable, {
              ...currentTableState,
              orders: updatedTableOrder,
              status: getTableStatusFromOrders(updatedTableOrder),
            });
          } catch (error) {
            console.error("部分結帳失敗:", error);
            alert("結帳失敗，請稍後再試");
          }
        }
      } else {
        // 全部結帳
        const historyRecord = createHistoryRecord(
          selectedTable,
          tableOrder,
          "table",
          paymentMethod,
          false,
          null,
          existingGroupId
        );

        if (historyRecord) {
          try {
            await addSalesRecord(historyRecord);
            const newHistory = [...salesHistory, historyRecord];
            await saveSalesHistoryToFirebase(newHistory);

            if (!existingGroupId && historyRecord.groupId) {
              const paidBatches = tableOrder.map((batch) =>
                batch.map((item) => ({
                  ...item,
                  paid: true,
                  groupId: historyRecord.groupId,
                }))
              );

              await saveTableStateToFirebase(selectedTable, {
                ...currentTableState,
                orders: paidBatches,
                status: "ready-to-clean",
              });
            } else {
              const paidBatches = tableOrder.map((batch) =>
                batch.map((item) => ({
                  ...item,
                  paid: true,
                }))
              );

              await saveTableStateToFirebase(selectedTable, {
                ...currentTableState,
                orders: paidBatches,
                status: "ready-to-clean",
              });
            }

            setCurrentOrder([]);
            setSelectedTable(null);
            setCurrentView("main");
          } catch (error) {
            console.error("全部結帳失敗:", error);
            alert("結帳失敗，請稍後再試");
          }
        }
      }
    }
  };

  const editConfirmedItem = (item, batchIndex, itemIndex) => {
    if (selectedTable.startsWith("T")) {
      // 外帶項目編輯邏輯保持不變
      const takeoutData = takeoutOrders[selectedTable];
      if (
        !takeoutData ||
        !takeoutData.batches ||
        !takeoutData.batches[batchIndex] ||
        !takeoutData.batches[batchIndex][itemIndex]
      )
        return;

      const editingItem = { ...takeoutData.batches[batchIndex][itemIndex] };

      const isAlreadyEditing = currentOrder.some(
        (orderItem) =>
          orderItem.isEditing &&
          orderItem.originalBatchIndex === batchIndex &&
          orderItem.originalItemIndex === itemIndex &&
          orderItem.isTakeout === true
      );

      if (isAlreadyEditing) {
        setCurrentOrder(
          currentOrder.filter(
            (orderItem) =>
              !(
                orderItem.isEditing &&
                orderItem.originalBatchIndex === batchIndex &&
                orderItem.originalItemIndex === itemIndex &&
                orderItem.isTakeout === true
              )
          )
        );
      } else {
        setCurrentOrder([
          ...currentOrder,
          {
            ...editingItem,
            isEditing: true,
            isTakeout: true,
            originalBatchIndex: batchIndex,
            originalItemIndex: itemIndex,
          },
        ]);
      }
    } else {
      // 內用項目編輯（使用新數據結構）
      const currentTableState = tableStates[selectedTable] || {};
      const batches = currentTableState.orders || [];

      if (!batches[batchIndex] || !batches[batchIndex][itemIndex]) return;

      const editingItem = { ...batches[batchIndex][itemIndex] };

      const isAlreadyEditing = currentOrder.some(
        (orderItem) =>
          orderItem.isEditing &&
          orderItem.originalBatchIndex === batchIndex &&
          orderItem.originalItemIndex === itemIndex
      );

      if (isAlreadyEditing) {
        setCurrentOrder(
          currentOrder.filter(
            (orderItem) =>
              !(
                orderItem.isEditing &&
                orderItem.originalBatchIndex === batchIndex &&
                orderItem.originalItemIndex === itemIndex
              )
          )
        );
      } else {
        setCurrentOrder([
          ...currentOrder,
          {
            ...editingItem,
            isEditing: true,
            originalBatchIndex: batchIndex,
            originalItemIndex: itemIndex,
          },
        ]);
      }
    }
  };

  const handleBack = () => {
    setCurrentView("seating");
    setSelectedTable(null);
    setCurrentOrder([]);
  };

  // 載入中的顯示
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-lg text-gray-600">載入中...</p>
        </div>
      </div>
    );
  }

  // 錯誤顯示
  if (loadError) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">載入失敗</h2>
          <p className="text-gray-600 mb-4">{loadError}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            重新載入
          </button>
        </div>
      </div>
    );
  }

  if (currentView === "menuedit") {
    return (
      <MenuEditorPage
        menuData={menuData}
        setMenuData={saveMenuDataToFirebase}
        onBack={() => setCurrentView("seating")}
      />
    );
  }

  if (currentView === "history") {
    return (
      <HistoryPage
        salesHistory={salesHistory}
        onBack={() => setCurrentView("seating")}
        onMenuSelect={handleMenuSelect}
        onRefundOrder={handleRefund}
      />
    );
  }

  if (currentView === "ordering") {
    let confirmedOrdersBatches = [];
    if (selectedTable.startsWith("T")) {
      const takeoutData = takeoutOrders[selectedTable];
      if (takeoutData && !takeoutData.paid) {
        confirmedOrdersBatches = takeoutData.batches || [];
      }
    } else {
      // 使用新數據結構
      const currentTableState = tableStates[selectedTable] || {};
      const tableBatches = currentTableState.orders || [];

      for (let i = 0; i < tableBatches.length; i++) {
        const batch = tableBatches[i];
        if (Array.isArray(batch)) {
          const unpaidItems = batch.filter((item) => item.paid === false);
          if (unpaidItems.length > 0) {
            confirmedOrdersBatches.push(unpaidItems);
          }
        }
      }
    }

    return (
      <>
        {showMoveTableModal && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 shadow-lg min-w-[300px]">
              <h2 className="text-lg font-bold mb-4">換桌</h2>

              <div className="mb-4">
                選擇要搬移到哪個桌位：
                <select
                  className="border rounded px-2 py-1 ml-2"
                  value={moveTableTarget}
                  onChange={(e) => setMoveTableTarget(e.target.value)}
                >
                  <option value="">請選擇桌號</option>
                  {allTableIds
                    .filter((tid) => {
                      const status = getTableStatus(tid);
                      return (
                        tid !== selectedTable &&
                        (status === "available" || status === "ready-to-clean")
                      );
                    })
                    .map((tid) => (
                      <option key={tid} value={tid}>
                        {tid} (
                        {getTableStatus(tid) === "available"
                          ? "空桌"
                          : "待清理"}
                        )
                      </option>
                    ))}
                </select>
              </div>
              <div className="flex space-x-2">
                <button
                  className="bg-blue-500 text-white px-4 py-2 rounded"
                  onClick={() =>
                    handleMoveTable(selectedTable, moveTableTarget)
                  }
                  disabled={!moveTableTarget}
                >
                  確認換桌
                </button>
                <button
                  className="bg-gray-300 px-4 py-2 rounded"
                  onClick={() => {
                    setShowMoveTableModal(false);
                    setMoveTableTarget("");
                  }}
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        )}
        <OrderingPage
          selectedTable={selectedTable}
          currentOrder={currentOrder}
          confirmedOrdersBatches={confirmedOrdersBatches}
          tableStatus={getTableStatus(selectedTable)}
          onBack={handleBack}
          onAddToOrder={addToOrder}
          onUpdateQuantity={updateQuantity}
          onRemoveItem={removeFromOrder}
          onSubmitOrder={submitOrder}
          onCheckout={checkout}
          timers={getTimersForDisplay()}
          onEditConfirmedItem={editConfirmedItem}
          menuData={menuData}
          onReleaseSeat={handleReleaseSeat}
          onMoveTable={() => setShowMoveTableModal(true)}
        />
      </>
    );
  }

  return (
    <>
      {showSeatConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 shadow-lg min-w-[300px]">
            <h2 className="text-lg font-bold mb-4">帶位確認</h2>
            <div className="mb-4">是否帶客人入座此桌？</div>
            <div className="flex space-x-2">
              <button
                onClick={handleSeatConfirm}
                className="bg-blue-500 text-white px-4 py-2 rounded"
              >
                是
              </button>
              <button
                onClick={() => {
                  setShowSeatConfirmModal(false);
                  setPendingSeatTable(null);
                }}
                className="bg-gray-300 px-4 py-2 rounded"
              >
                否
              </button>
            </div>
          </div>
        </div>
      )}
      <SeatingPage
        currentFloor={currentFloor}
        orders={getOrdersForDisplay()}
        takeoutOrders={takeoutOrders}
        timers={getTimersForDisplay()}
        onFloorChange={setCurrentFloor}
        onTableClick={handleTableClick}
        onTakeoutClick={handleTakeoutClick}
        onNewTakeout={handleNewTakeout}
        onMenuSelect={handleMenuSelect}
      />
    </>
  );
};

export default CafePOSSystem;
