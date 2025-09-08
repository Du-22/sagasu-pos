import React, { useState, useEffect } from "react";
import OrderingPage from "./components/menuData/OrderingPage";
import SeatingPage from "./components/seatingData/SeatingPage";
import HistoryPage from "./components/pages/HistoryPage";
import MenuEditorPage from "./components/pages/MenuEditorPage";
import defaultMenuData from "./components/menuData/defaultMenuData";
import { seatingData } from "./components/seatingData/SeatingArea";

const CafePOSSystem = () => {
  const [currentFloor, setCurrentFloor] = useState("1F");
  const [selectedTable, setSelectedTable] = useState(null);
  const [currentView, setCurrentView] = useState("seating");
  const [orders, setOrders] = useState({});
  const [currentOrder, setCurrentOrder] = useState([]);
  const [takeoutOrders, setTakeoutOrders] = useState({});
  const [nextTakeoutId, setNextTakeoutId] = useState(1);
  const [timers, setTimers] = useState({});
  const [salesHistory, setSalesHistory] = useState([]);
  const [menuData, setMenuData] = useState(defaultMenuData);
  const [showMoveTableModal, setShowMoveTableModal] = useState(false);
  const [moveTableTarget, setMoveTableTarget] = useState("");

  // 入座相關狀態
  const [showSeatConfirmModal, setShowSeatConfirmModal] = useState(false);
  const [pendingSeatTable, setPendingSeatTable] = useState(null);

  useEffect(() => {}, [currentView, selectedTable]);

  useEffect(() => {
    const savedHistory = localStorage.getItem("cafeSalesHistory");
    if (savedHistory) {
      try {
        setSalesHistory(JSON.parse(savedHistory));
      } catch (error) {
        console.error("載入歷史記錄時發生錯誤:", error);
      }
    }
  }, []);

  useEffect(() => {
    const savedOrders = localStorage.getItem("cafeOrders");
    if (savedOrders) {
      try {
        const parsedOrders = JSON.parse(savedOrders);
        setOrders(parsedOrders);
      } catch (error) {
        console.error("載入訂單資料時發生錯誤:", error);
        setOrders({});
      }
    }

    const savedTakeoutOrders = localStorage.getItem("cafeTakeoutOrders");
    if (savedTakeoutOrders) {
      try {
        setTakeoutOrders(JSON.parse(savedTakeoutOrders));
      } catch (error) {
        console.error("載入外帶訂單時發生錯誤:", error);
      }
    }
  }, []);

  useEffect(() => {
    const savedTimers = localStorage.getItem("cafeTimers");
    if (savedTimers) {
      try {
        setTimers(JSON.parse(savedTimers));
      } catch (error) {
        console.error("載入計時器資料時發生錯誤:", error);
      }
    }
  }, []);

  const saveOrders = (newOrders) => {
    setOrders(newOrders);
    localStorage.setItem("cafeOrders", JSON.stringify(newOrders));
  };

  // 取得所有桌號
  const allTableIds = Object.values(seatingData)
    .flat()
    .map((table) => table.id);

  // 換桌邏輯
  const handleMoveTable = (fromTable, toTable) => {
    if (!fromTable || !toTable || fromTable === toTable) return;

    const targetTableStatus = getTableStatus(toTable);

    if (
      targetTableStatus !== "available" &&
      targetTableStatus !== "ready-to-clean"
    ) {
      alert("目標桌不可用，請選擇空桌或待清理的桌子。");
      return;
    }

    if (
      !orders[fromTable] ||
      !Array.isArray(orders[fromTable]) ||
      orders[fromTable].length === 0
    ) {
      alert("原桌沒有訂單可搬移。");
      return;
    }

    const newOrders = { ...orders };

    newOrders[toTable] = newOrders[fromTable];
    delete newOrders[fromTable];
    saveOrders(newOrders);

    const newTimers = { ...timers };
    if (newTimers[fromTable]) {
      newTimers[toTable] = newTimers[fromTable];
      delete newTimers[fromTable];
      saveTimers(newTimers);
    }

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

  // 產生群組ID
  const generateGroupId = () => {
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0].replace(/-/g, "");
    const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, "");
    const randomStr = Math.random().toString(36).substr(2, 2).toUpperCase();
    return `G${dateStr}${timeStr}${randomStr}`;
  };

  // 支援分開結帳
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
      // 部分結帳：只處理選中的商品

      if (type === "takeout") {
        console.warn("外帶訂單目前不支援部分結帳");
        return null;
      } else {
        // 內用部分結帳 - 只記錄這次選中的商品
        if (orderData && Array.isArray(orderData)) {
          orderData.forEach((batch, batchIndex) => {
            if (Array.isArray(batch)) {
              batch.forEach((item, itemIndex) => {
                const key = `${batchIndex}-${itemIndex}`;

                if (partialItems[key]) {
                  // 找到相同商品（包括客製選項）進行合併
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
      // 全部結帳的邏輯
      if (type === "takeout") {
        // 外帶資料處理（合併所有批次）
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
        // 內用全部結帳 - 修正邏輯：只處理未付款的商品

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

    items.forEach((item, index) => {});

    // 修正：創建正確的歷史記錄物件
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

  const saveSalesHistory = (newHistory) => {
    setSalesHistory(newHistory);
    localStorage.setItem("cafeSalesHistory", JSON.stringify(newHistory));
  };

  // 處理退款的函數 - 放在 saveSalesHistory 之後
  const handleRefund = (recordId) => {
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

    saveSalesHistory(newSalesHistory);
    alert(`訂單 ${record.table} (${record.time}) 已成功退款 $${record.total}`);
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

  const handleTakeoutClick = (takeoutId) => {
    const orderData = takeoutOrders[takeoutId];
    if (orderData && !orderData.paid) {
      setSelectedTable(takeoutId);
      setCurrentOrder([]);
      setCurrentView("ordering");
    } else if (orderData && orderData.paid) {
      const newTakeoutOrders = { ...takeoutOrders };
      delete newTakeoutOrders[takeoutId];
      setTakeoutOrders(newTakeoutOrders);
      localStorage.setItem(
        "cafeTakeoutOrders",
        JSON.stringify(newTakeoutOrders)
      );
    }
  };

  const saveTimers = (newTimers) => {
    setTimers(newTimers);
    localStorage.setItem("cafeTimers", JSON.stringify(newTimers));
  };

  // 入座確認
  const handleSeatConfirm = () => {
    const newOrders = {
      ...orders,
      [pendingSeatTable]: [[{ __seated: true }]],
    };
    saveOrders(newOrders);
    const newTimers = {
      ...timers,
      [pendingSeatTable]: Date.now(),
    };
    saveTimers(newTimers);
    setShowSeatConfirmModal(false);
    setPendingSeatTable(null);
  };

  // 修改 getTableStatus，支援入座
  const getTableStatus = (tableId) => {
    if (tableId.startsWith("T")) {
      const takeoutData = takeoutOrders[tableId];
      if (takeoutData) {
        return takeoutData.paid ? "takeout-paid" : "takeout-unpaid";
      }
      return "takeout-new";
    }

    const tableBatches = orders[tableId];

    if (
      tableBatches &&
      Array.isArray(tableBatches) &&
      tableBatches.length === 1 &&
      tableBatches[0] &&
      tableBatches[0][0] &&
      tableBatches[0][0].__seated
    ) {
      return "seated";
    }

    if (
      !tableBatches ||
      !Array.isArray(tableBatches) ||
      tableBatches.length === 0
    ) {
      return "available";
    }

    let hasUnpaidItems = false;
    let hasPaidItems = false;

    for (const batch of tableBatches) {
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
      const newOrders = { ...orders };
      delete newOrders[tableId];
      saveOrders(newOrders);
    }
  };

  const submitOrder = () => {
    if (currentOrder.length === 0) return;

    if (!timers[selectedTable]) {
      const newTimers = {
        ...timers,
        [selectedTable]: Date.now(),
      };
      saveTimers(newTimers);
    }

    if (selectedTable.startsWith("T")) {
      // 外帶訂單分批記錄
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

      setTakeoutOrders(newTakeoutOrders);
      localStorage.setItem(
        "cafeTakeoutOrders",
        JSON.stringify(newTakeoutOrders)
      );

      setCurrentView("seating");
      setSelectedTable(null);
      setCurrentOrder([]);
    } else {
      // 內用訂單 - 使用替換邏輯
      let existingBatches = Array.isArray(orders[selectedTable])
        ? [...orders[selectedTable]]
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

      const newOrders = {
        ...orders,
        [selectedTable]:
          newItems.length > 0
            ? [...existingBatches, newItems]
            : existingBatches,
      };

      saveOrders(newOrders);

      if (hasEditingItems && newItems.length === 0) {
        setCurrentOrder([]);
      } else {
        setCurrentView("seating");
        setSelectedTable(null);
        setCurrentOrder([]);
      }
    }
  };

  const handleReleaseSeat = (tableId) => {
    const newOrders = { ...orders };
    delete newOrders[tableId];
    saveOrders(newOrders);
    const newTimers = { ...timers };
    delete newTimers[tableId];
    saveTimers(newTimers);
    setCurrentView("seating");
    setSelectedTable(null);
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

  const removeFromOrder = (itemId) => {
    const removingItem = currentOrder.find((item) => item.id === itemId);

    if (removingItem && removingItem.isEditing) {
      if (removingItem.isTakeout) {
        // 外帶項目的刪除邏輯
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
          setTakeoutOrders(newTakeoutOrders);
          localStorage.setItem(
            "cafeTakeoutOrders",
            JSON.stringify(newTakeoutOrders)
          );
        }
      } else {
        // 內用項目的刪除邏輯
        const batches = Array.isArray(orders[selectedTable])
          ? [...orders[selectedTable]]
          : [];
        const { originalBatchIndex, originalItemIndex } = removingItem;
        batches[originalBatchIndex].splice(originalItemIndex, 1);
        const filteredBatches = batches.filter((batch) => batch.length > 0);
        const newOrders = {
          ...orders,
          [selectedTable]: filteredBatches,
        };
        saveOrders(newOrders);
      }
    }

    setCurrentOrder(currentOrder.filter((item) => item.id !== itemId));
  };

  //支援分開結帳
  const checkout = (paymentMethod = "cash", partialItems = null) => {
    if (!selectedTable) return;

    const isPartialCheckout =
      partialItems && Object.values(partialItems).some(Boolean);

    if (selectedTable.startsWith("T")) {
      // 外帶訂單邏輯（暫時不支援部分結帳）
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
        setTakeoutOrders(newTakeoutOrders);
        localStorage.setItem(
          "cafeTakeoutOrders",
          JSON.stringify(newTakeoutOrders)
        );
      }

      if (takeoutData && !takeoutData.paid) {
        const historyRecord = createHistoryRecord(
          selectedTable,
          takeoutData,
          "takeout",
          paymentMethod
        );
        const newHistory = [...salesHistory, historyRecord];
        saveSalesHistory(newHistory);

        const newTakeoutOrders = {
          ...takeoutOrders,
          [selectedTable]: {
            ...takeoutData,
            paid: true,
          },
        };
        setTakeoutOrders(newTakeoutOrders);
        localStorage.setItem(
          "cafeTakeoutOrders",
          JSON.stringify(newTakeoutOrders)
        );
      }
      setCurrentOrder([]);
      setSelectedTable(null);
      setCurrentView("main");
      return;
    }

    // 內用訂單邏輯
    if (selectedTable) {
      const tableOrder = orders[selectedTable];

      if (tableOrder && !tableOrder.paid) {
        // 檢查是否為同桌的第二次以上結帳（從 orders 狀態查找）
        let existingGroupId = null;
        const tableOrder = orders[selectedTable];
        if (tableOrder && Array.isArray(tableOrder) && tableOrder.length > 0) {
          // 從已有的訂單中找第一個有 groupId 的項目
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
          // 構建和前端顯示相同的過濾後資料，但保留原始索引信息
          const filteredBatches = [];
          const indexMapping = {}; // 映射表：過濾後索引 -> 原始索引
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
                  // 記錄映射關係
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

          //將前端的選擇項目轉換為原始索引
          const mappedPartialItems = {};
          Object.entries(partialItems).forEach(([filteredKey, isSelected]) => {
            const originalKey = indexMapping[filteredKey];
            if (originalKey && isSelected) {
              mappedPartialItems[originalKey] = true;
            }
          });

          //使用過濾後的資料來創建歷史記錄
          const historyRecord = createHistoryRecord(
            selectedTable,
            tableOrder,
            "table",
            paymentMethod,
            true,
            mappedPartialItems,
            existingGroupId
          );

          //更新訂單狀態也使用映射後的索引
          if (historyRecord) {
            const newHistory = [...salesHistory, historyRecord];
            saveSalesHistory(newHistory);

            // 將選中的商品標記為已付款
            const newOrders = { ...orders };
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
                    // 如果是第一次結帳，同時加入 groupId
                    ...(!existingGroupId && historyRecord.groupId
                      ? { groupId: historyRecord.groupId }
                      : {}),
                  };
                }
              }
            });

            // 如果是第一次結帳，將 groupId 寫回所有商品（包含未付款的）
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

            newOrders[selectedTable] = updatedTableOrder;
            saveOrders(newOrders);
          }
        } else {
          // 全部結帳
          // 先創建歷史記錄（使用當前未付款的商品）
          const historyRecord = createHistoryRecord(
            selectedTable,
            tableOrder,
            "table",
            paymentMethod,
            false, // isPartialPayment
            null,
            existingGroupId
          );

          if (historyRecord) {
            const newHistory = [...salesHistory, historyRecord];
            saveSalesHistory(newHistory);

            // 如果是第一次結帳，將 groupId 寫回 orders 狀態
            if (!existingGroupId && historyRecord.groupId) {
              // 將所有未付款商品標記為已付款，同時加入 groupId
              const paidBatches = tableOrder.map((batch) =>
                batch.map((item) => ({
                  ...item,
                  paid: true,
                  groupId: historyRecord.groupId,
                }))
              );
              const newOrders = {
                ...orders,
                [selectedTable]: paidBatches,
              };
              saveOrders(newOrders);
            } else {
              // 原有邏輯：只標記為已付款
              const paidBatches = tableOrder.map((batch) =>
                batch.map((item) => ({
                  ...item,
                  paid: true,
                }))
              );
              const newOrders = {
                ...orders,
                [selectedTable]: paidBatches,
              };
              saveOrders(newOrders);
            }

            // 全部結帳完成後才清空狀態
            setCurrentOrder([]);
            setSelectedTable(null);
            setCurrentView("main");

            // 只有在全部結帳時才移除計時器
            if (timers[selectedTable]) {
              const newTimers = { ...timers };
              delete newTimers[selectedTable];
              setTimers(newTimers);
              localStorage.setItem("cafeTimers", JSON.stringify(newTimers));
            }
          }
        }
      }
    }
  };

  const editConfirmedItem = (item, batchIndex, itemIndex) => {
    if (selectedTable.startsWith("T")) {
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
      const batches = Array.isArray(orders[selectedTable])
        ? [...orders[selectedTable]]
        : [];
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

  if (currentView === "menuedit") {
    return (
      <MenuEditorPage
        menuData={menuData}
        setMenuData={setMenuData}
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
        onRefundOrder={handleRefund} // 新增退款功能
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
      const tableBatches = Array.isArray(orders[selectedTable])
        ? [...orders[selectedTable]]
        : [];
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
        {/* 換桌功能相關 */}
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
          timers={timers}
          onEditConfirmedItem={editConfirmedItem}
          menuData={menuData}
          onReleaseSeat={handleReleaseSeat}
          onMoveTable={() => setShowMoveTableModal(true)}
        />
      </>
    );
  }

  // 入座確認 Modal
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
        orders={orders}
        takeoutOrders={takeoutOrders}
        timers={timers}
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
