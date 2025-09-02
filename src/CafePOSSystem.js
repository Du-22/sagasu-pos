import React, { useState, useEffect } from "react";
import OrderingPage from "./components/menuData/OrderingPage";
import SeatingPage from "./components/seatingData/SeatingPage";

const CafePOSSystem = () => {
  const [currentFloor, setCurrentFloor] = useState("1F");
  const [selectedTable, setSelectedTable] = useState(null);
  const [currentView, setCurrentView] = useState("seating");
  const [orders, setOrders] = useState({});
  const [currentOrder, setCurrentOrder] = useState([]);
  const [takeoutOrders, setTakeoutOrders] = useState({});
  const [nextTakeoutId, setNextTakeoutId] = useState(1);

  useEffect(() => {
    console.log("currentView 已變更為:", currentView);
    console.log("selectedTable:", selectedTable);
  }, [currentView, selectedTable]);

  // 從localStorage載入資料
  useEffect(() => {
    const savedOrders = localStorage.getItem("cafeOrders");
    if (savedOrders) {
      try {
        const parsedOrders = JSON.parse(savedOrders);
        console.log("載入的原始資料:", parsedOrders);
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

  // 儲存訂單到localStorage
  const saveOrders = (newOrders) => {
    console.log("儲存資料:", newOrders);
    setOrders(newOrders);
    localStorage.setItem("cafeOrders", JSON.stringify(newOrders));
  };

  // 外帶相關函數
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
      // 清除已結帳的外帶訂單
      const newTakeoutOrders = { ...takeoutOrders };
      delete newTakeoutOrders[takeoutId];
      setTakeoutOrders(newTakeoutOrders);
      localStorage.setItem(
        "cafeTakeoutOrders",
        JSON.stringify(newTakeoutOrders)
      );
    }
  };

  // 取得座位狀態
  const getTableStatus = (tableId) => {
    // 如果是外帶，返回特殊狀態
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

    // 簡化邏輯：檢查是否有未付款的項目
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

  // 點選座位處理
  const handleTableClick = (tableId) => {
    const status = getTableStatus(tableId);
    console.log(`點擊座位 ${tableId}, 狀態: ${status}`);

    if (status === "available" || status === "occupied") {
      // 強制同步更新，避免狀態競爭
      console.log("強制進入點餐模式");

      // 先更新所有狀態
      setSelectedTable(tableId);
      setCurrentOrder([]);

      // 使用 setTimeout 確保狀態更新後再改變視圖
      setTimeout(() => {
        setCurrentView("ordering");
        console.log("視圖已切換到 ordering");
      }, 10);
    } else if (status === "ready-to-clean") {
      const newOrders = { ...orders };
      delete newOrders[tableId];
      saveOrders(newOrders);
    }
  };

  // 添加商品到訂單
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

  // 更新商品數量
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

  // 移除商品
  const removeFromOrder = (itemId) => {
    const removingItem = currentOrder.find((item) => item.id === itemId);

    if (removingItem && removingItem.isEditing) {
      if (removingItem.isTakeout) {
        // 外帶項目的刪除邏輯
        const takeoutData = takeoutOrders[selectedTable];
        if (takeoutData && takeoutData.items) {
          const updatedItems = takeoutData.items.filter(
            (_, index) => index !== removingItem.originalItemIndex
          );

          const newTakeoutOrders = {
            ...takeoutOrders,
            [selectedTable]: {
              ...takeoutData,
              items: updatedItems,
            },
          };

          setTakeoutOrders(newTakeoutOrders);
          localStorage.setItem(
            "cafeTakeoutOrders",
            JSON.stringify(newTakeoutOrders)
          );
        }
      } else {
        // 內用項目的刪除邏輯（原有邏輯）
        const batches = [...(orders[selectedTable] || [])];
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

    // 從當前編輯區域移除
    setCurrentOrder(currentOrder.filter((item) => item.id !== itemId));
  };

  // 送出訂單
  const submitOrder = () => {
    if (currentOrder.length === 0) return;

    // 判斷是外帶還是內用
    if (selectedTable.startsWith("T")) {
      // 外帶訂單
      const existingTakeoutData = takeoutOrders[selectedTable];
      const newItems = [];
      let updatedItems = existingTakeoutData
        ? [...existingTakeoutData.items]
        : [];
      const hasEditingItems = currentOrder.some(
        (item) => item.isEditing && item.isTakeout
      );

      currentOrder.forEach((item) => {
        if (item.isEditing && item.isTakeout) {
          // 這是修改的外帶項目，更新原位置
          const { isEditing, isTakeout, originalItemIndex, ...updatedItem } =
            item;
          updatedItems[originalItemIndex] = {
            ...updatedItem,
            timestamp: new Date().toISOString(),
            paid: false,
          };
        } else {
          // 這是新增的項目
          newItems.push({
            ...item,
            timestamp: new Date().toISOString(),
            paid: false,
          });
        }
      });

      const newTakeoutOrders = {
        ...takeoutOrders,
        [selectedTable]: {
          items: [...updatedItems, ...newItems],
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

      // 外帶的跳轉邏輯
      if (hasEditingItems && newItems.length === 0) {
        setCurrentOrder([]); // 只清空編輯區域
      } else {
        // 有新增項目或是第一次點餐，跳回座位頁面
        setCurrentView("seating");
        setSelectedTable(null);
        setCurrentOrder([]);
      }
    } else {
      // 內用訂單 - 使用替換邏輯
      const existingBatches = [...(orders[selectedTable] || [])];
      const newItems = [];
      const hasEditingItems = currentOrder.some(
        (item) => item.isEditing && !item.isTakeout
      );

      currentOrder.forEach((item) => {
        if (item.isEditing && !item.isTakeout) {
          // 內用修改項目，更新原位置
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
          // 新增的項目
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

      // 內用的跳轉邏輯
      if (hasEditingItems && newItems.length === 0) {
        setCurrentOrder([]);
      } else {
        setCurrentView("seating");
        setSelectedTable(null);
        setCurrentOrder([]);
      }
    }
  };

  // 結帳
  const checkout = () => {
    if (selectedTable.startsWith("T")) {
      // 外帶結帳
      const newTakeoutOrders = {
        ...takeoutOrders,
        [selectedTable]: {
          ...takeoutOrders[selectedTable],
          paid: true,
        },
      };
      setTakeoutOrders(newTakeoutOrders);
      localStorage.setItem(
        "cafeTakeoutOrders",
        JSON.stringify(newTakeoutOrders)
      );
    } else {
      // 內用結帳（原有邏輯）
      if (!orders[selectedTable]) return;

      const updatedBatches = orders[selectedTable].map((batch) =>
        batch.map((item) => ({ ...item, paid: true }))
      );

      const newOrders = {
        ...orders,
        [selectedTable]: updatedBatches,
      };

      saveOrders(newOrders);
    }

    setCurrentView("seating");
    setSelectedTable(null);
    setCurrentOrder([]);
  };

  // 編輯已確認項目
  const editConfirmedItem = (item, batchIndex, itemIndex) => {
    if (selectedTable.startsWith("T")) {
      // 外帶訂單編輯
      const takeoutData = takeoutOrders[selectedTable];
      if (!takeoutData || !takeoutData.items[itemIndex]) return;

      const editingItem = { ...takeoutData.items[itemIndex] };

      // 檢查是否已經在編輯這個項目
      const isAlreadyEditing = currentOrder.some(
        (orderItem) =>
          orderItem.isEditing &&
          orderItem.originalItemIndex === itemIndex &&
          orderItem.isTakeout === true
      );

      if (isAlreadyEditing) {
        // 取消編輯
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
        // 開始編輯
        setCurrentOrder([
          ...currentOrder,
          {
            ...editingItem,
            isEditing: true,
            isTakeout: true,
            originalItemIndex: itemIndex,
          },
        ]);
      }
    } else {
      // 內用訂單編輯（原有邏輯保持不變）
      const batches = orders[selectedTable] || [];
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

  // 返回座位頁面
  const handleBack = () => {
    setCurrentView("seating");
    setSelectedTable(null);
    setCurrentOrder([]);
  };

  console.log("檢查 currentView:", currentView);

  if (currentView === "ordering") {
    let confirmedOrdersBatches = [];

    // 判斷是外帶還是內用
    if (selectedTable.startsWith("T")) {
      // 外帶訂單
      const takeoutData = takeoutOrders[selectedTable];
      if (takeoutData && !takeoutData.paid) {
        confirmedOrdersBatches = [takeoutData.items]; // 外帶只有一個批次
      }
    } else {
      // 內用訂單（原有邏輯）
      const tableBatches = orders[selectedTable] || [];
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

    console.log("處理後的確認批次:", confirmedOrdersBatches);

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
        onEditConfirmedItem={editConfirmedItem}
      />
    );
  }

  return (
    <SeatingPage
      currentFloor={currentFloor}
      orders={orders}
      takeoutOrders={takeoutOrders} // 新增
      onFloorChange={setCurrentFloor}
      onTableClick={handleTableClick}
      onTakeoutClick={handleTakeoutClick} // 新增
      onNewTakeout={handleNewTakeout} // 新增
    />
  );
};

export default CafePOSSystem;
