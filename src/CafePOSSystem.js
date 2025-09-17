import React, { useState, useEffect } from "react";
import OrderingPage from "./components/menuData/OrderingPage";
import SeatingPage from "./components/seatingData/SeatingPage";
import HistoryPage from "./components/pages/HistoryPage";
import MenuEditorPage from "./components/pages/MenuEditorPage";
import defaultMenuData from "./components/menuData/defaultMenuData";
import { seatingData } from "./components/seatingData/SeatingArea";
import ExportReportsPage from "./components/pages/ExportReportsPage";

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

  const calculateItemSubtotal = (item) => {
    let basePrice = item.price || 0;
    let totalAdjustment = 0;

    console.log(`🔧 計算 ${item.name} 的價格:`, {
      basePrice,
      selectedCustom: item.selectedCustom,
      customOptions: item.customOptions,
    });

    // 檢查新格式的價格調整
    if (item.selectedCustom && item.customOptions) {
      Object.entries(item.selectedCustom).forEach(
        ([optionType, selectedValue]) => {
          if (!selectedValue) return;

          // 找到對應的客製選項設定
          const customOption = item.customOptions.find(
            (opt) => opt.type === optionType
          );

          if (
            customOption &&
            customOption.priceAdjustments &&
            customOption.priceAdjustments[selectedValue]
          ) {
            const adjustment = customOption.priceAdjustments[selectedValue];
            totalAdjustment += adjustment;
            console.log(
              `💰 價格調整: ${optionType}=${selectedValue} 調整${adjustment}元`
            );
          }
        }
      );
    }

    // 向下相容：如果沒有新格式設定，使用舊的續杯邏輯
    if (
      totalAdjustment === 0 &&
      item.selectedCustom &&
      item.selectedCustom["續杯"] === "是"
    ) {
      // 檢查是否已經在新系統中處理過續杯
      const renewalOption = item.customOptions?.find(
        (opt) => opt.type === "續杯"
      );
      if (
        !renewalOption ||
        !renewalOption.priceAdjustments ||
        !renewalOption.priceAdjustments["是"]
      ) {
        totalAdjustment = -20;
        console.log(`💰 使用舊邏輯: 續杯折扣20元`);
      }
    }

    const finalPrice = Math.max(basePrice + totalAdjustment, 0);
    const subtotal = finalPrice * item.quantity;

    console.log(
      `💰 最終價格: 基本價格${basePrice} + 調整${totalAdjustment} = ${finalPrice} × ${item.quantity} = ${subtotal}`
    );

    return subtotal;
  };

  useEffect(() => {}, [currentView, selectedTable]);

  // 輔助函數：為了相容性，提供 timers 格式給 UI 組件
  const getTimersForDisplay = () => {
    const timersForDisplay = {};
    Object.entries(tableStates).forEach(([tableId, tableState]) => {
      if (tableState.startTime) {
        const currentStatus = getTableStatus(tableId);

        // 修改：讓計時器在用餐中、入座和待清理狀態都顯示
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

  // 輔助函數：為了相容性，提供 orders 格式給 UI 組件
  const getOrdersForDisplay = () => {
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
          ordersForDisplay[tableId] = [realOrders];
        }
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
          setMenuData(firebaseMenuData);
        } else {
          console.log("📋 首次使用，儲存預設菜單到 Firebase");
          await saveMenuData(defaultMenuData);
          setMenuData(defaultMenuData);
        }

        // 設置桌位狀態（新的整合數據）

        setTableStates(firebaseTableStates || {});

        // 設置外帶訂單

        setTakeoutOrders(firebaseTakeoutOrders || {});

        // 設置銷售歷史

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

  useEffect(() => {
    // 特別檢查有入座標記的桌位
    Object.entries(tableStates).forEach(([tableId, state]) => {
      if (state.orders && state.orders.length > 0) {
        const firstBatch = state.orders[0];
        if (
          (firstBatch && firstBatch.__seated) ||
          (Array.isArray(firstBatch) && firstBatch[0] && firstBatch[0].__seated)
        ) {
        }
      }
    });
  }, [tableStates]);

  // 備用：從 localStorage 載入數據
  const loadFromLocalStorage = () => {
    try {
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
    } catch (error) {
      console.error("載入 localStorage 備份數據失敗:", error);
    }
  };

  //新增資料清理函數
  const sanitizeTableData = (tableData) => {
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

  // 輔助函數：從訂單推斷桌位狀態
  const getTableStatusFromOrders = (orders) => {
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

  // 新版本：儲存桌位狀態到 Firebase
  const saveTableStateToFirebase = async (tableId, updates) => {
    const currentState = tableStates[tableId] || {};
    const newState = { ...currentState, ...updates };

    // 在儲存前清理資料
    const sanitizedState = sanitizeTableData(newState);

    setTableStates((prev) => ({
      ...prev,
      [tableId]: sanitizedState,
    }));

    try {
      await saveTableState(tableId, sanitizedState);

      // 同時保存到 localStorage 作為備份
      if (sanitizedState.orders) {
        const oldOrders = JSON.parse(
          localStorage.getItem("cafeOrders") || "{}"
        );
        oldOrders[tableId] = sanitizedState.orders;
        localStorage.setItem("cafeOrders", JSON.stringify(oldOrders));
      }

      if (sanitizedState.startTime) {
        const oldTimers = JSON.parse(
          localStorage.getItem("cafeTimers") || "{}"
        );
        oldTimers[tableId] = sanitizedState.startTime;
        localStorage.setItem("cafeTimers", JSON.stringify(oldTimers));
      }
    } catch (error) {
      console.error("儲存桌位狀態到 Firebase 失敗:", error);

      // 失敗時至少保存到 localStorage
      if (sanitizedState.orders) {
        const oldOrders = JSON.parse(
          localStorage.getItem("cafeOrders") || "{}"
        );
        oldOrders[tableId] = sanitizedState.orders;
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

    try {
      // 1. 複製桌位狀態到新桌位
      await saveTableStateToFirebase(toTable, {
        orders: fromTableState.orders,
        startTime: fromTableState.startTime || Date.now(),
        status: fromTableState.status,
      });

      // 2. 刪除原桌位狀態
      await deleteTableStateFromFirebase(fromTable);

      // 3. 強制更新本地狀態，確保 UI 立即反映變化
      setTableStates((prevStates) => {
        const newStates = { ...prevStates };

        // 複製到新桌位
        newStates[toTable] = {
          orders: fromTableState.orders,
          startTime: fromTableState.startTime || Date.now(),
          status: fromTableState.status,
          updatedAt: new Date().toISOString(),
        };

        // 刪除原桌位
        delete newStates[fromTable];

        return newStates;
      });

      // 4. 更新當前選中的桌子
      setSelectedTable(toTable);
      setCurrentOrder([]);

      // 5. 關閉 modal
      setShowMoveTableModal(false);
      setMoveTableTarget("");

      // 6. 返回座位視圖
      setCurrentView("seating");
    } catch (error) {
      console.error("❌ 換桌操作失敗:", error);
      alert("換桌失敗，請稍後再試");
    }
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

    console.log("🔧 createHistoryRecord 開始:", {
      tableId,
      type,
      isPartialPayment,
      partialItems,
      orderData,
    });

    if (isPartialPayment && partialItems) {
      if (type === "takeout") {
        console.warn("外帶訂單目前不支援部分結帳");
        return null;
      } else {
        // 內用部分結帳 - 修正邏輯
        console.log("🔧 處理內用部分結帳");

        if (orderData && Array.isArray(orderData) && orderData.length > 0) {
          // orderData 是 [itemsToCheckout] 格式，直接使用傳入的商品陣列
          const itemsToCheckout = orderData[0]; // 取出實際的商品陣列

          console.log("🔧 要結帳的商品:", itemsToCheckout);

          if (Array.isArray(itemsToCheckout)) {
            itemsToCheckout.forEach((item) => {
              if (item && item.name) {
                const existingItem = items.find(
                  (i) =>
                    i.id === item.id &&
                    JSON.stringify(i.selectedCustom) ===
                      JSON.stringify(item.selectedCustom)
                );

                if (existingItem) {
                  existingItem.quantity += item.quantity;
                  existingItem.subtotal = calculateItemSubtotal(existingItem);
                } else {
                  items.push({
                    id: item.id,
                    name: item.name,
                    price: item.price,
                    quantity: item.quantity,
                    subtotal: calculateItemSubtotal(item),
                    selectedCustom: item.selectedCustom || null,
                    customOptions: item.customOptions || null,
                  });
                }

                console.log("🔧 加入結帳商品:", {
                  name: item.name,
                  price: item.price,
                  quantity: item.quantity,
                  subtotal: calculateItemSubtotal(item),
                });
              }
            });
          } else {
            console.error("❌ itemsToCheckout 不是陣列:", itemsToCheckout);
          }

          total = items.reduce((sum, item) => sum + item.subtotal, 0);

          console.log("🔧 部分結帳計算結果:", {
            items,
            total,
            itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
          });
        } else {
          console.error("❌ orderData 格式錯誤:", orderData);
        }
      }
    } else {
      // 全部結帳邏輯
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
                existingItem.subtotal = calculateItemSubtotal(existingItem);
              } else {
                items.push({
                  id: item.id,
                  name: item.name,
                  price: item.price,
                  quantity: item.quantity,
                  subtotal: calculateItemSubtotal(item),
                  selectedCustom: item.selectedCustom || null,
                });
              }
            });
          });
        }
        total = items.reduce((sum, item) => sum + item.subtotal, 0);
      } else {
        // 內用全部結帳
        if (Array.isArray(orderData) && orderData.length > 0) {
          const allItems = orderData[0]; // orderData 是 [allUnpaidItems] 格式
          if (Array.isArray(allItems)) {
            allItems.forEach((item) => {
              if (item && item.name && item.paid !== true) {
                const existingItem = items.find(
                  (i) =>
                    i.id === item.id &&
                    JSON.stringify(i.selectedCustom) ===
                      JSON.stringify(item.selectedCustom)
                );
                if (existingItem) {
                  existingItem.quantity += item.quantity;
                  existingItem.subtotal = calculateItemSubtotal(existingItem);
                } else {
                  items.push({
                    id: item.id,
                    name: item.name,
                    price: item.price,
                    quantity: item.quantity,
                    subtotal: calculateItemSubtotal(item),
                    selectedCustom: item.selectedCustom || null,
                  });
                }
              }
            });
          } else {
            console.error("❌ 內用全部結帳：allItems 不是陣列:", allItems);
          }
        } else {
          console.error("❌ 內用全部結帳：orderData 格式錯誤:", orderData);
        }
        total = items.reduce((sum, item) => sum + item.subtotal, 0);
      }
    }

    // 確保有商品才建立記錄
    if (items.length === 0) {
      console.warn("⚠️ 沒有商品，無法建立歷史記錄");
      return null;
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
      type: type === "takeout" ? "takeout" : "table",
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

    console.log("🔧 最終歷史記錄:", finalRecord);
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
    const seatData = {
      orders: [{ __seated: true, timestamp: new Date().toISOString() }], // 扁平化陣列
      startTime: Date.now(),
      status: "seated",
    };

    await saveTableStateToFirebase(pendingSeatTable, seatData);
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

    if (hasUnpaidItems) {
      return "occupied";
    }
    if (hasPaidItems) {
      return "ready-to-clean";
    }

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
      // 修改：清理桌子時完全刪除桌位狀態，包括計時器
      await deleteTableStateFromFirebase(tableId);
    } catch (error) {
      console.error("清理桌子失敗:", error);
    }
  };

  // submitOrder（使用新數據結構）
  const submitOrder = async () => {
    if (currentOrder.length === 0) return;

    if (selectedTable.startsWith("T")) {
      // 外帶訂單 - 改為扁平化結構

      const existingTakeoutData = takeoutOrders[selectedTable];
      let existingOrders = existingTakeoutData?.orders
        ? [...existingTakeoutData.orders]
        : [];

      // 新增項目（直接加到扁平化陣列末尾）
      const newItems = currentOrder.map((item) => ({
        ...item,
        timestamp: new Date().toISOString(),
        paid: false,
        customOptions: item.customOptions,
      }));

      // 合併：扁平化結構，不要巢狀陣列
      const finalOrders = [...existingOrders, ...newItems];

      // 驗證：確保沒有巢狀陣列
      const hasNestedArrays = finalOrders.some((item) => Array.isArray(item));

      if (hasNestedArrays) {
        console.error("❌ 外帶訂單檢測到巢狀陣列，進行扁平化");
        finalOrders = finalOrders.flat();
      }

      const newTakeoutOrders = {
        ...takeoutOrders,
        [selectedTable]: {
          orders: finalOrders, // 改用 orders 而不是 batches
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
      // 內用訂單 - 使用扁平化結構

      const currentTableState = tableStates[selectedTable] || {};
      let existingOrders = currentTableState.orders
        ? [...currentTableState.orders]
        : [];

      // 移除入座標記
      existingOrders = existingOrders.filter((item) => {
        return !(item && item.__seated);
      });

      // 處理編輯項目
      const hasEditingItems = currentOrder.some(
        (item) => item.isEditing && !item.isTakeout
      );

      if (hasEditingItems) {
        // 如果有編輯項目，更新現有訂單
        currentOrder.forEach((item) => {
          if (item.isEditing && !item.isTakeout) {
            const {
              isEditing,
              originalBatchIndex,
              originalItemIndex,
              ...updatedItem
            } = item;

            // 計算在扁平化陣列中的實際位置
            let flatIndex = 0;
            for (let b = 0; b < originalBatchIndex; b++) {
              if (Array.isArray(currentTableState.orders[b])) {
                flatIndex += currentTableState.orders[b].length;
              } else {
                flatIndex += 1;
              }
            }
            flatIndex += originalItemIndex;

            if (existingOrders[flatIndex]) {
              existingOrders[flatIndex] = {
                ...updatedItem,
                timestamp: new Date().toISOString(),
                paid: false,
              };
            }
          }
        });
      }

      // 新增項目（直接加到扁平化陣列末尾）
      const newItems = currentOrder
        .filter((item) => !item.isEditing)
        .map((item) => ({
          ...item,
          timestamp: new Date().toISOString(),
          paid: false,
        }));

      // 合併：扁平化結構，不要巢狀陣列
      const finalOrders = [...existingOrders, ...newItems];

      // 驗證：確保沒有巢狀陣列
      const hasNestedArrays = finalOrders.some((item) => Array.isArray(item));

      if (hasNestedArrays) {
        console.error("❌ 檢測到巢狀陣列，進行扁平化");
        finalOrders = finalOrders.flat();
      }

      // 儲存桌位狀態
      const stateToSave = {
        orders: finalOrders,
        startTime: currentTableState.startTime || Date.now(),
        status: "occupied",
      };

      await saveTableStateToFirebase(selectedTable, stateToSave);

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
      setCurrentOrder([
        ...currentOrder,
        { ...item, quantity: 1, customOptions: item.customOptions },
      ]);
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
        // 外帶項目邏輯
        const takeoutData = takeoutOrders[selectedTable];
        if (
          takeoutData &&
          takeoutData.orders &&
          Array.isArray(takeoutData.orders)
        ) {
          // 使用扁平化結構
          const originalIndex = removingItem.originalItemIndex;

          // 確保索引有效
          if (originalIndex >= 0 && originalIndex < takeoutData.orders.length) {
            const updatedOrders = [...takeoutData.orders];
            updatedOrders.splice(originalIndex, 1);

            const newTakeoutOrders = {
              ...takeoutOrders,
              [selectedTable]: {
                ...takeoutData,
                orders: updatedOrders,
              },
            };
            await saveTakeoutOrdersToFirebase(newTakeoutOrders);
          }
        }
      } else {
        // 內用項目（使用新數據結構）
        const currentTableState = tableStates[selectedTable] || {};
        const flatOrders = currentTableState.orders
          ? [...currentTableState.orders]
          : [];

        // 從 originalItemIndex 獲取在扁平化陣列中的實際位置
        const actualIndex = removingItem.originalItemIndex;

        console.log("🔧 Debug removeFromOrder:", {
          flatOrders,
          actualIndex,
          removingItem,
          flatOrdersLength: flatOrders.length,
          itemAtIndex: flatOrders[actualIndex],
        });

        // 確保索引有效且該位置有項目
        if (actualIndex >= 0 && actualIndex < flatOrders.length) {
          // 直接從扁平化陣列中移除項目
          flatOrders.splice(actualIndex, 1);

          if (flatOrders.length > 0) {
            // 過濾掉可能的空值或無效項目
            const validOrders = flatOrders.filter(
              (item) =>
                item && typeof item === "object" && (item.__seated || item.name)
            );

            await saveTableStateToFirebase(selectedTable, {
              ...currentTableState,
              orders: validOrders,
            });
          } else {
            // 如果沒有訂單了，刪除整個桌位狀態
            await deleteTableStateFromFirebase(selectedTable);
          }
        } else {
          console.warn("⚠️ 無效的索引或項目不存在:", {
            actualIndex,
            flatOrdersLength: flatOrders.length,
          });
        }
      }
    }

    // 從當前訂單中移除項目
    setCurrentOrder(currentOrder.filter((item) => item.id !== itemId));
  };

  // checkout（使用新數據結構）
  const checkout = async (paymentMethod = "cash", partialSelection = null) => {
    if (!selectedTable) return;

    //檢查新的數據格式
    const isPartialCheckout =
      partialSelection &&
      (partialSelection.items || partialSelection.quantities) &&
      Object.values(partialSelection.items || {}).some(Boolean);

    console.log("🔧 開始結帳:", {
      selectedTable,
      paymentMethod,
      isPartialCheckout,
      partialSelection,
    });

    if (selectedTable.startsWith("T")) {
      // 外帶訂單邏輯保持不變...
      // (這部分可以之後套用相同的下拉選單邏輯)
    } else {
      // 內用邏輯
      const currentTableState = tableStates[selectedTable];
      if (currentTableState && currentTableState.orders) {
        const allUnpaidItems = currentTableState.orders.filter(
          (item) => item && !item.__seated && item.paid === false
        );

        if (allUnpaidItems.length === 0) {
          alert("沒有可結帳的項目");
          return;
        }

        // 獲取或生成 groupId
        let existingGroupId = currentTableState.groupId;

        if (!existingGroupId) {
          for (const item of allUnpaidItems) {
            if (item.groupId) {
              existingGroupId = item.groupId;
              break;
            }
          }
        }

        if (!existingGroupId) {
          existingGroupId = generateGroupId();
          await saveTableStateToFirebase(selectedTable, {
            ...currentTableState,
            groupId: existingGroupId,
          });
        }

        if (isPartialCheckout) {
          // 處理下拉選單格式
          console.log("🔧 執行下拉選單分開結帳...");

          const { items: selectedItems, quantities: selectedQuantities } =
            partialSelection;

          // 建立用於歷史記錄的項目列表
          const itemsToCheckout = [];
          // 建立要更新的索引和數量映射
          const updateInstructions = [];

          // 處理下拉選單選擇的數據
          Object.entries(selectedItems).forEach(([key, isSelected]) => {
            if (isSelected) {
              const selectedQty = selectedQuantities[key] || 0;

              if (selectedQty > 0) {
                console.log("🔧 處理選中項目:", { key, selectedQty });

                // key 格式：0-itemIndex
                const [batchIndex, itemIndexStr] = key.split("-");
                const itemIndex = parseInt(itemIndexStr);

                const originalItem = allUnpaidItems[itemIndex];

                if (originalItem && selectedQty <= originalItem.quantity) {
                  console.log("🔧 處理商品:", {
                    itemIndex,
                    itemName: originalItem.name,
                    originalQuantity: originalItem.quantity,
                    selectedQuantity: selectedQty,
                  });

                  // 創建結帳項目
                  itemsToCheckout.push({
                    ...originalItem,
                    quantity: selectedQty,
                  });

                  // 找到該項目在原始訂單陣列中的實際位置
                  const actualIndex = currentTableState.orders.findIndex(
                    (orderItem) => orderItem === originalItem
                  );

                  if (actualIndex !== -1) {
                    const remainingQuantity =
                      originalItem.quantity - selectedQty;

                    updateInstructions.push({
                      actualIndex,
                      originalQuantity: originalItem.quantity,
                      selectedQty,
                      remainingQuantity,
                      shouldRemove: remainingQuantity === 0,
                    });

                    console.log("🔧 更新指令:", {
                      actualIndex,
                      originalQuantity: originalItem.quantity,
                      selectedQty,
                      remainingQuantity,
                      shouldRemove: remainingQuantity === 0,
                    });
                  } else {
                    console.error("❌ 找不到商品在訂單中的位置:", originalItem);
                  }
                } else {
                  console.warn("⚠️ 商品不存在或數量超出範圍:", {
                    itemIndex,
                    selectedQty,
                    originalItem: originalItem ? originalItem.name : "不存在",
                    maxQuantity: originalItem ? originalItem.quantity : 0,
                  });
                }
              }
            }
          });

          console.log("🔧 最終結帳項目:", itemsToCheckout);
          console.log("🔧 更新指令:", updateInstructions);

          if (itemsToCheckout.length === 0) {
            alert("沒有選中有效的項目");
            return;
          }

          // 為了相容 createHistoryRecord，包裝成批次格式
          const batchFormatOrders = [itemsToCheckout];

          const historyRecord = createHistoryRecord(
            selectedTable,
            batchFormatOrders,
            "table",
            paymentMethod,
            true,
            partialSelection, // 傳遞完整的選擇數據
            existingGroupId
          );

          if (historyRecord) {
            try {
              await addSalesRecord(historyRecord);
              const newHistory = [...salesHistory, historyRecord];
              await saveSalesHistoryToFirebase(newHistory);

              // 更新桌位狀態
              const updatedOrders = [...currentTableState.orders];

              updateInstructions.forEach(
                ({ actualIndex, remainingQuantity, shouldRemove }) => {
                  if (actualIndex >= 0 && actualIndex < updatedOrders.length) {
                    if (shouldRemove || remainingQuantity <= 0) {
                      // 標記為已付款
                      updatedOrders[actualIndex] = {
                        ...updatedOrders[actualIndex],
                        paid: true,
                        groupId: existingGroupId,
                      };
                      console.log(
                        "🔧 標記為已付款:",
                        updatedOrders[actualIndex].name
                      );
                    } else {
                      // 更新剩餘數量
                      updatedOrders[actualIndex] = {
                        ...updatedOrders[actualIndex],
                        quantity: remainingQuantity,
                      };
                      console.log("🔧 更新數量:", {
                        name: updatedOrders[actualIndex].name,
                        newQuantity: remainingQuantity,
                      });
                    }
                  }
                }
              );

              await saveTableStateToFirebase(selectedTable, {
                ...currentTableState,
                orders: updatedOrders,
                groupId: existingGroupId,
                status: getTableStatusFromOrders(updatedOrders),
              });

              console.log("✅ 下拉選單分開結帳完成");
              setCurrentOrder([]);
            } catch (error) {
              console.error("❌ 下拉選單分開結帳失敗:", error);
              alert("結帳失敗，請稍後再試");
            }
          }
        } else {
          // 全部結帳邏輯保持不變
          const batchFormatOrders = [allUnpaidItems];

          const historyRecord = createHistoryRecord(
            selectedTable,
            batchFormatOrders,
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

              const paidOrders = currentTableState.orders.map((item) => {
                if (item && !item.__seated) {
                  return {
                    ...item,
                    paid: true,
                    groupId: existingGroupId,
                  };
                }
                return item;
              });

              await saveTableStateToFirebase(selectedTable, {
                ...currentTableState,
                orders: paidOrders,
                groupId: existingGroupId,
                status: "ready-to-clean",
              });

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
    }
  };

  const editConfirmedItem = (item, batchIndex, itemIndex) => {
    if (selectedTable.startsWith("T")) {
      // 外帶項目編輯邏輯
      const takeoutData = takeoutOrders[selectedTable];
      if (
        !takeoutData ||
        !takeoutData.orders ||
        !Array.isArray(takeoutData.orders)
      ) {
        console.warn("⚠️ 外帶訂單數據無效");
        return;
      }

      if (itemIndex < 0 || itemIndex >= takeoutData.orders.length) {
        console.warn("⚠️ 外帶項目索引無效:", itemIndex);
        return;
      }

      const editingItem = { ...takeoutData.orders[itemIndex] };

      const isAlreadyEditing = currentOrder.some(
        (orderItem) =>
          orderItem.isEditing &&
          orderItem.originalItemIndex === itemIndex &&
          orderItem.isTakeout === true
      );

      if (isAlreadyEditing) {
        setCurrentOrder(
          currentOrder.filter(
            (orderItem) =>
              !(
                orderItem.isEditing &&
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
            originalBatchIndex: 0, // 外帶都是批次0
            originalItemIndex: itemIndex,
            customOptions: editingItem.customOptions,
          },
        ]);
      }
    } else {
      // 內用項目編輯（適應扁平化結構）
      const currentTableState = tableStates[selectedTable] || {};
      const flatOrders = currentTableState.orders || [];

      // 過濾掉入座標記，獲取真正的餐點
      const realOrders = flatOrders.filter(
        (item) => item && typeof item === "object" && !item.__seated
      );

      console.log("🔧 Debug editConfirmedItem:", {
        batchIndex,
        itemIndex,
        flatOrders,
        realOrders,
        flatOrdersLength: flatOrders.length,
        realOrdersLength: realOrders.length,
      });

      // 檢查索引是否有效
      if (itemIndex < 0 || itemIndex >= realOrders.length) {
        console.warn("⚠️ 內用項目索引無效:", {
          itemIndex,
          realOrdersLength: realOrders.length,
        });
        return;
      }

      const editingItem = { ...realOrders[itemIndex] };

      // 找到在原始扁平化陣列中的實際位置
      let actualFlatIndex = -1;
      let realItemCount = 0;

      for (let i = 0; i < flatOrders.length; i++) {
        const currentItem = flatOrders[i];
        if (
          currentItem &&
          typeof currentItem === "object" &&
          !currentItem.__seated
        ) {
          if (realItemCount === itemIndex) {
            actualFlatIndex = i;
            break;
          }
          realItemCount++;
        }
      }

      console.log("🔧 計算實際索引:", {
        itemIndex,
        actualFlatIndex,
        editingItem: editingItem.name,
      });

      if (actualFlatIndex === -1) {
        console.warn("⚠️ 無法找到項目在扁平化陣列中的位置");
        return;
      }

      const isAlreadyEditing = currentOrder.some(
        (orderItem) =>
          orderItem.isEditing &&
          orderItem.originalItemIndex === actualFlatIndex &&
          !orderItem.isTakeout
      );

      if (isAlreadyEditing) {
        setCurrentOrder(
          currentOrder.filter(
            (orderItem) =>
              !(
                orderItem.isEditing &&
                orderItem.originalItemIndex === actualFlatIndex &&
                !orderItem.isTakeout
              )
          )
        );
      } else {
        setCurrentOrder([
          ...currentOrder,
          {
            ...editingItem,
            isEditing: true,
            originalBatchIndex: 0, // 在顯示時總是批次0
            originalItemIndex: actualFlatIndex, // 使用在扁平化陣列中的實際位置
            customOptions: editingItem.customOptions,
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

  if (currentView === "export") {
    return (
      <ExportReportsPage
        onMenuSelect={handleMenuSelect}
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
        const flatOrders = takeoutData.orders || [];
        const realOrders = flatOrders.filter(
          (item) => item && typeof item === "object" && item.paid === false
        );
        if (realOrders.length > 0) {
          confirmedOrdersBatches = [realOrders];
        }
      }
    } else {
      // 內用訂單 - 處理扁平化資料
      const currentTableState = tableStates[selectedTable] || {};
      const flatOrders = currentTableState.orders || [];

      // 過濾掉入座標記，只保留真正的餐點
      const realOrders = flatOrders.filter(
        (item) =>
          item &&
          typeof item === "object" &&
          !item.__seated &&
          item.paid === false
      );

      // 將扁平化訂單重新組織為批次格式（為了相容現有的 UI）
      if (realOrders.length > 0) {
        confirmedOrdersBatches = [realOrders]; // 包成一個批次
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
