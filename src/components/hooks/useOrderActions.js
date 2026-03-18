/**
 * useOrderActions Hook
 *
 * 原始程式碼：定義在 CafePOSSystem.js 的訂單管理函數群
 * 功能效果：處理所有訂單相關操作，包含新增、修改、刪除、送出訂單，以及外帶訂單的建立與點擊
 * 用途：封裝訂單業務邏輯，讓主元件只負責組合 hooks 和路由
 * 組件長度：約 230 行
 *
 * 重要說明：
 * - submitOrder 同時處理內用（扁平化結構）和外帶（也是扁平化結構）
 * - editConfirmedItem 負責將已確認訂單的項目放回 currentOrder 供修改，外帶/內用邏輯分開
 * - handleTakeoutClick 點擊已付款外帶單時會直接刪除該訂單
 * - removeFromOrder 只有 isEditing 的項目才需要同步到 Firebase，新加但還沒送出的不用
 */
const useOrderActions = ({
  currentOrder,
  selectedTable,
  tableStates,
  takeoutOrders,
  nextTakeoutId,
  dataManager,
  setCurrentOrder,
  setSelectedTable,
  setCurrentView,
  setNextTakeoutId,
  setTakeoutOrders,
  saveTableStateToFirebase,
  deleteTableStateFromFirebase,
  saveTakeoutOrdersToFirebase,
}) => {
  // 新增品項到當前點餐暫存
  const addToOrder = (item) => {
    // 生成唯一識別碼，包含客製選項
    const generateUniqueId = (item) => {
      if (item.selectedCustom && Object.keys(item.selectedCustom).length > 0) {
        return `${item.id}-${JSON.stringify(item.selectedCustom)}`;
      }
      return item.id.toString();
    };

    const uniqueId = generateUniqueId(item);

    const existingItem = currentOrder.find(
      (orderItem) => orderItem.uniqueId === uniqueId,
    );

    if (existingItem) {
      setCurrentOrder(
        currentOrder.map((orderItem) =>
          orderItem.uniqueId === uniqueId
            ? { ...orderItem, quantity: orderItem.quantity + 1 }
            : orderItem,
        ),
      );
    } else {
      setCurrentOrder([
        ...currentOrder,
        {
          ...item,
          uniqueId: uniqueId,
          quantity: 1,
          customOptions: item.customOptions,
        },
      ]);
    }
  };

  // 更新暫存訂單中某項目的數量（<=0 時直接移除）
  const updateQuantity = (uniqueId, quantity) => {
    if (quantity <= 0) {
      setCurrentOrder(
        currentOrder.filter((item) => item.uniqueId !== uniqueId),
      );
    } else {
      setCurrentOrder(
        currentOrder.map((item) =>
          item.uniqueId === uniqueId ? { ...item, quantity } : item,
        ),
      );
    }
  };

  // 移除訂單項目
  // 重要：只有 isEditing 的項目（已確認訂單被拉回修改）才需要同步 Firebase
  const removeFromOrder = async (uniqueId) => {
    const removingItem = currentOrder.find(
      (item) => item.uniqueId === uniqueId,
    );

    if (removingItem && removingItem.isEditing) {
      if (removingItem.isTakeout) {
        // 外帶項目邏輯
        const takeoutData = takeoutOrders[selectedTable];
        if (
          takeoutData &&
          takeoutData.orders &&
          Array.isArray(takeoutData.orders)
        ) {
          const originalIndex = removingItem.originalItemIndex;

          if (originalIndex >= 0 && originalIndex < takeoutData.orders.length) {
            const updatedOrders = [...takeoutData.orders];
            updatedOrders.splice(originalIndex, 1);

            if (updatedOrders.length === 0) {
              // 最後一筆品項被刪除，取消整個外帶單並返回座位圖
              const result = await dataManager.deleteTakeoutOrder(
                selectedTable,
                takeoutOrders,
              );
              if (result.success || result.hasBackup) {
                setTakeoutOrders(result.data);
              }
              setCurrentOrder([]);
              setSelectedTable(null);
              setCurrentView("seating");
              return;
            }

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
        // 內用項目（扁平化結構）
        const currentTableState = tableStates[selectedTable] || {};
        const flatOrders = currentTableState.orders
          ? [...currentTableState.orders]
          : [];

        const actualIndex = removingItem.originalItemIndex;

        if (actualIndex >= 0 && actualIndex < flatOrders.length) {
          flatOrders.splice(actualIndex, 1);

          if (flatOrders.length > 0) {
            const validOrders = flatOrders.filter(
              (item) =>
                item &&
                typeof item === "object" &&
                (item.__seated || item.name),
            );

            await saveTableStateToFirebase(selectedTable, {
              ...currentTableState,
              orders: validOrders,
            });
          } else {
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

    setCurrentOrder(currentOrder.filter((item) => item.uniqueId !== uniqueId));
  };

  // 送出訂單（內用/外帶都處理）
  const submitOrder = async () => {
    if (currentOrder.length === 0) return;

    if (selectedTable.startsWith("T")) {
      // 外帶訂單 - 扁平化結構
      const existingTakeoutData = takeoutOrders[selectedTable];
      let existingOrders = existingTakeoutData?.orders
        ? [...existingTakeoutData.orders]
        : [];

      // 處理編輯項目：原地更新，不要加到末尾（與內用邏輯一致）
      const hasEditingItems = currentOrder.some(
        (item) => item.isEditing && item.isTakeout,
      );

      if (hasEditingItems) {
        currentOrder.forEach((item) => {
          if (item.isEditing && item.isTakeout) {
            const {
              isEditing,
              isTakeout,
              originalBatchIndex,
              originalItemIndex,
              ...updatedItem
            } = item;

            if (existingOrders[originalItemIndex]) {
              existingOrders[originalItemIndex] = {
                ...updatedItem,
                timestamp: new Date().toISOString(),
                paid: false,
              };
            }
          }
        });
      }

      // 只把非編輯項目加到末尾
      const newItems = currentOrder
        .filter((item) => !item.isEditing)
        .map((item) => ({
          ...item,
          timestamp: new Date().toISOString(),
          paid: false,
          customOptions: item.customOptions,
        }));

      let finalOrders = [...existingOrders, ...newItems];

      // 驗證：確保沒有巢狀陣列
      const hasNestedArrays = finalOrders.some((item) => Array.isArray(item));
      if (hasNestedArrays) {
        console.error("❌ 外帶訂單檢測到巢狀陣列，進行扁平化");
        finalOrders = finalOrders.flat();
      }

      const newTakeoutOrders = {
        ...takeoutOrders,
        [selectedTable]: {
          orders: finalOrders,
          timestamp: existingTakeoutData
            ? existingTakeoutData.timestamp
            : new Date().toISOString(),
          paid: false,
        },
      };

      await saveTakeoutOrdersToFirebase(newTakeoutOrders);

      if (hasEditingItems && newItems.length === 0) {
        // 只有編輯項目，沒有新增品項，留在點餐頁
        setCurrentOrder([]);
      } else {
        setCurrentView("seating");
        setSelectedTable(null);
        setCurrentOrder([]);
      }
    } else {
      // 內用訂單 - 扁平化結構
      const currentTableState = tableStates[selectedTable] || {};
      let existingOrders = currentTableState.orders
        ? [...currentTableState.orders]
        : [];

      existingOrders = existingOrders.filter((item) => {
        return !(item && item.__seated);
      });

      const hasEditingItems = currentOrder.some(
        (item) => item.isEditing && !item.isTakeout,
      );

      if (hasEditingItems) {
        currentOrder.forEach((item) => {
          if (item.isEditing && !item.isTakeout) {
            const {
              isEditing,
              originalBatchIndex,
              originalItemIndex,
              ...updatedItem
            } = item;

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

      const newItems = currentOrder
        .filter((item) => !item.isEditing)
        .map((item) => ({
          ...item,
          timestamp: new Date().toISOString(),
          paid: false,
        }));

      let finalOrders = [...existingOrders, ...newItems];

      const hasNestedArrays = finalOrders.some((item) => Array.isArray(item));
      if (hasNestedArrays) {
        console.error("❌ 檢測到巢狀陣列，進行扁平化");
        finalOrders = finalOrders.flat();
      }

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

  // 將已確認訂單的項目拉回 currentOrder 供修改
  const editConfirmedItem = (item, batchIndex, itemIndex) => {
    if (selectedTable.startsWith("T")) {
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
          orderItem.isTakeout === true,
      );

      if (isAlreadyEditing) {
        setCurrentOrder(
          currentOrder.filter(
            (orderItem) =>
              !(
                orderItem.isEditing &&
                orderItem.originalItemIndex === itemIndex &&
                orderItem.isTakeout === true
              ),
          ),
        );
      } else {
        setCurrentOrder([
          ...currentOrder,
          {
            ...editingItem,
            isEditing: true,
            isTakeout: true,
            originalBatchIndex: 0,
            originalItemIndex: itemIndex,
            customOptions: editingItem.customOptions,
          },
        ]);
      }
    } else {
      // 內用項目（扁平化結構）
      const currentTableState = tableStates[selectedTable] || {};
      const flatOrders = currentTableState.orders || [];

      const realOrders = flatOrders.filter(
        (item) => item && typeof item === "object" && !item.__seated,
      );

      if (itemIndex < 0 || itemIndex >= realOrders.length) {
        console.warn("⚠️ 內用項目索引無效:", {
          itemIndex,
          realOrdersLength: realOrders.length,
        });
        return;
      }

      const editingItem = { ...realOrders[itemIndex] };

      // 找到在扁平化陣列中的實際位置
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

      if (actualFlatIndex === -1) {
        console.warn("⚠️ 無法找到項目在扁平化陣列中的位置");
        return;
      }

      const isAlreadyEditing = currentOrder.some(
        (orderItem) =>
          orderItem.isEditing &&
          orderItem.originalItemIndex === actualFlatIndex &&
          !orderItem.isTakeout,
      );

      if (isAlreadyEditing) {
        setCurrentOrder(
          currentOrder.filter(
            (orderItem) =>
              !(
                orderItem.isEditing &&
                orderItem.originalItemIndex === actualFlatIndex &&
                !orderItem.isTakeout
              ),
          ),
        );
      } else {
        setCurrentOrder([
          ...currentOrder,
          {
            ...editingItem,
            isEditing: true,
            originalBatchIndex: 0,
            originalItemIndex: actualFlatIndex,
            customOptions: editingItem.customOptions,
          },
        ]);
      }
    }
  };

  // 建立新外帶訂單
  const handleNewTakeout = () => {
    const takeoutId = `T${String(nextTakeoutId).padStart(3, "0")}`;
    setSelectedTable(takeoutId);
    setCurrentOrder([]);
    setCurrentView("ordering");
    setNextTakeoutId(nextTakeoutId + 1);
  };

  // 點擊外帶訂單：未付款→進入點餐，已付款→刪除該訂單
  const handleTakeoutClick = async (takeoutId) => {
    const orderData = takeoutOrders[takeoutId];
    if (orderData && !orderData.paid) {
      setSelectedTable(takeoutId);
      setCurrentOrder([]);
      setCurrentView("ordering");
    } else if (orderData && orderData.paid) {
      try {
        const result = await dataManager.deleteTakeoutOrder(
          takeoutId,
          takeoutOrders,
        );
        if (result.success || result.hasBackup) {
          setTakeoutOrders(result.data);
        }
      } catch (error) {
        console.error("刪除外帶訂單失敗:", error);
      }
    }
  };

  return {
    addToOrder,
    updateQuantity,
    removeFromOrder,
    submitOrder,
    editConfirmedItem,
    handleNewTakeout,
    handleTakeoutClick,
  };
};

export default useOrderActions;
