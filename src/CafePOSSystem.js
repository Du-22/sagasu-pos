import React, { useState, useEffect } from "react";
import OrderingPage from "./components/menuData/OrderingPage";
import SeatingPage from "./components/seatingData/SeatingPage";
import HistoryPage from "./components/pages/HistoryPage";

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

  useEffect(() => {
    console.log("currentView 已變更為:", currentView);
    console.log("selectedTable:", selectedTable);
  }, [currentView, selectedTable]);

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

  const generateHistoryId = () => {
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0].replace(/-/g, "");
    const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, "");
    const randomStr = Math.random().toString(36).substr(2, 3).toUpperCase();
    return `H${dateStr}${timeStr}${randomStr}`;
  };

  const createHistoryRecord = (tableId, orderData, type = "dine-in") => {
    const now = new Date();
    let items = [];
    let total = 0;

    if (type === "takeout") {
      // 外帶資料處理（合併所有批次）
      if (orderData.batches && Array.isArray(orderData.batches)) {
        orderData.batches.forEach((batch) => {
          batch.forEach((item) => {
            const existingItem = items.find((i) => i.id === item.id);
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
              });
            }
          });
        });
      }
      total = items.reduce((sum, item) => sum + item.subtotal, 0);
    } else {
      // 內用資料處理 - 將所有批次合併
      orderData.forEach((batch) => {
        batch.forEach((item) => {
          const existingItem = items.find((i) => i.id === item.id);
          if (existingItem) {
            existingItem.quantity += item.quantity;
            existingItem.subtotal = existingItem.price * existingItem.quantity;
          } else {
            items.push({
              id: item.id,
              name: item.name,
              price: item.price,
              quantity: item.quantity,
              subtotal: item.price * item.quantity,
            });
          }
        });
      });
      total = items.reduce((sum, item) => sum + item.subtotal, 0);
    }

    const parts = now
      .toLocaleDateString("zh-TW", { timeZone: "Asia/Taipei" })
      .split("/");
    const taiwanDateStr = `${parts[0]}-${parts[1].padStart(
      2,
      "0"
    )}-${parts[2].padStart(2, "0")}`;

    return {
      id: generateHistoryId(),
      date: taiwanDateStr,
      time: now.toTimeString().slice(0, 8),
      timestamp: now.getTime(),
      type: type,
      table: tableId,
      items: items,
      total: total,
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    };
  };

  const saveSalesHistory = (newHistory) => {
    setSalesHistory(newHistory);
    localStorage.setItem("cafeSalesHistory", JSON.stringify(newHistory));
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
    if (status === "available" || status === "occupied") {
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

  const addToOrder = (item) => {
    const existingItem = currentOrder.find(
      (orderItem) => orderItem.id === item.id
    );
    if (existingItem) {
      setCurrentOrder(
        currentOrder.map((orderItem) =>
          orderItem.id === item.id
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
          // 找到正在編輯的批次和項目
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
      const existingBatches = Array.isArray(orders[selectedTable])
        ? [...orders[selectedTable]]
        : [];
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

  const checkout = () => {
    if (!selectedTable) return;

    if (selectedTable.startsWith("T")) {
      let takeoutData = takeoutOrders[selectedTable];

      // 如果還沒送出訂單，但 currentOrder 有內容
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
          "takeout"
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

    if (selectedTable) {
      const tableOrder = orders[selectedTable];
      if (tableOrder && !tableOrder.paid) {
        const historyRecord = createHistoryRecord(
          selectedTable,
          tableOrder,
          "table"
        );
        const newHistory = [...salesHistory, historyRecord];
        saveSalesHistory(newHistory);

        const paidBatches = tableOrder.map((batch) =>
          batch.map((item) => ({ ...item, paid: true }))
        );
        const newOrders = {
          ...orders,
          [selectedTable]: paidBatches,
        };
        setOrders(newOrders);
        localStorage.setItem("cafeOrders", JSON.stringify(newOrders));
      }
      setCurrentOrder([]);
      setSelectedTable(null);
      setCurrentView("main");
    }
    if (timers[selectedTable]) {
      const newTimers = { ...timers };
      delete newTimers[selectedTable];
      setTimers(newTimers);
      localStorage.setItem("cafeTimers", JSON.stringify(newTimers));
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

  const handleMenuSelect = (menuId) => {
    setCurrentView(menuId);
  };

  if (currentView === "history") {
    return (
      <HistoryPage
        salesHistory={salesHistory}
        onBack={() => setCurrentView("seating")}
        onMenuSelect={handleMenuSelect}
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
      />
    );
  }

  return (
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
  );
};

export default CafePOSSystem;
