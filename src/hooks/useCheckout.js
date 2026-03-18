import { calculateItemPrice } from "../utils/priceCalculations";
import { generateHistoryId, generateGroupId } from "../utils/idGenerators";
import { updateSalesRecord } from "../firebase/operations";

/**
 * useCheckout Hook
 *
 * 原始程式碼：定義在 CafePOSSystem.js 的結帳與退款函數群
 * 功能效果：處理全額結帳、部分結帳、退款邏輯，並同步更新 Firebase
 * 用途：封裝最複雜的結帳業務邏輯，讓主元件只負責組合 hooks 和路由
 * 組件長度：約 200 行
 *
 * 重要說明：
 * - checkout 同時處理內用與外帶，以 selectedTable 是否以 "T" 開頭判斷
 * - 部分結帳（isPartialCheckout）：依 partialSelection.items 篩選品項，原地更新剩餘數量
 * - 全額結帳：所有未付款品項標記為 paid: true，內用桌位狀態改為 ready-to-clean
 * - 內用結帳後 groupId 寫入桌位狀態，供下次結帳識別同一批次（分開結帳場景）
 * - calculateItemPrice 改為從 utils/priceCalculations import，不再 inline 定義
 */
const useCheckout = ({
  selectedTable,
  currentOrder,
  tableStates,
  takeoutOrders,
  salesHistory,
  setCurrentOrder,
  setSelectedTable,
  setCurrentView,
  setSalesHistory,
  saveTableStateToFirebase,
  saveTakeoutOrdersToFirebase,
  saveSalesHistoryToFirebase,
}) => {
  // 統一結帳函數（全額 + 部分結帳）
  const checkout = async (paymentMethod = "cash", partialSelection = null) => {
    console.group(`💳 統一結帳流程開始 - ${selectedTable}`);

    try {
      // ==================== 1. 環境判斷 ====================
      const isPartialCheckout = Boolean(
        partialSelection &&
          Object.values(partialSelection.items || {}).some(Boolean),
      );
      const type = selectedTable.startsWith("T") ? "takeout" : "dine-in";

      // ==================== 2. 資料準備 ====================
      let sourceData;
      let allItems = [];

      if (type === "takeout") {
        sourceData = takeoutOrders[selectedTable];
        if (!sourceData && currentOrder.length > 0) {
          // 處理新建立的外帶訂單（直接從點餐頁結帳，還沒送出）
          const newItems = currentOrder.map((item) => ({
            ...item,
            timestamp: new Date().toISOString(),
            paid: false,
            customOptions: item.customOptions,
          }));

          sourceData = {
            orders: newItems,
            timestamp: new Date().toISOString(),
            paid: false,
          };

          await saveTakeoutOrdersToFirebase({
            ...takeoutOrders,
            [selectedTable]: sourceData,
          });
        }

        allItems = (sourceData?.orders || []).filter(
          (item) => item && typeof item === "object",
        );
      } else {
        sourceData = tableStates[selectedTable];
        if (!sourceData?.orders) {
          throw new Error("找不到桌位訂單資料");
        }

        // 排除入座標記，只保留真正的餐點
        allItems = sourceData.orders.filter(
          (item) => item && typeof item === "object" && !item.__seated,
        );
      }

      const unpaidItems = allItems.filter((item) => item.paid === false);

      if (unpaidItems.length === 0) {
        alert("沒有可結帳的項目");
        return;
      }

      // ==================== 3. 商品處理邏輯 ====================
      let itemsToCheckout = [];
      let updateInstructions = [];

      if (isPartialCheckout) {
        // 部分結帳：依選取的品項建立結帳清單與更新指令
        const { items: selectedItems, quantities: selectedQuantities } =
          partialSelection;

        Object.entries(selectedItems).forEach(([key, isSelected]) => {
          if (!isSelected) return;

          const selectedQty = selectedQuantities[key] || 1;
          if (selectedQty <= 0) return;

          const itemIndex = parseInt(key.split("-")[1] || key);
          const originalItem = unpaidItems[itemIndex];

          if (!originalItem) {
            console.error(`❌ 找不到索引 ${itemIndex} 的商品`);
            return;
          }

          if (selectedQty > originalItem.quantity) {
            console.error(
              `❌ 選擇數量 ${selectedQty} 超過可用數量 ${originalItem.quantity}`,
            );
            return;
          }

          const priceInfo = calculateItemPrice(originalItem, selectedQty);

          itemsToCheckout.push({
            id: originalItem.id,
            name: originalItem.name,
            price: originalItem.price,
            quantity: selectedQty,
            subtotal: priceInfo.subtotal,
            selectedCustom: originalItem.selectedCustom || null,
            customOptions: originalItem.customOptions || null,
          });

          const actualIndex = allItems.findIndex(
            (item) => item === originalItem,
          );

          if (actualIndex !== -1) {
            const remainingQuantity = originalItem.quantity - selectedQty;
            updateInstructions.push({
              actualIndex,
              shouldRemove: remainingQuantity === 0,
              shouldUpdateQuantity: remainingQuantity > 0,
              remainingQuantity,
              markAsPaid: remainingQuantity === 0,
            });
          }
        });
      } else {
        // 全額結帳：所有未付款品項一次結清
        itemsToCheckout = unpaidItems.map((item) => {
          const priceInfo = calculateItemPrice(item);
          return {
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            subtotal: priceInfo.subtotal,
            selectedCustom: item.selectedCustom || null,
            customOptions: item.customOptions || null,
          };
        });

        unpaidItems.forEach((item) => {
          const actualIndex = allItems.findIndex(
            (listItem) => listItem === item,
          );
          if (actualIndex !== -1) {
            updateInstructions.push({
              actualIndex,
              shouldRemove: false,
              shouldUpdateQuantity: false,
              markAsPaid: true,
            });
          }
        });
      }

      if (itemsToCheckout.length === 0) {
        alert("沒有有效的結帳項目");
        return;
      }

      const total = itemsToCheckout.reduce(
        (sum, item) => sum + item.subtotal,
        0,
      );

      // ==================== 4. 歷史記錄建立 ====================
      const createHistoryRecord = () => {
        const now = new Date();
        const parts = now
          .toLocaleDateString("zh-TW", { timeZone: "Asia/Taipei" })
          .split("/");
        const taiwanDateStr = `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;

        // 重要：內用桌位重用同一個 groupId，讓分開結帳的多筆記錄能被歸為同一組
        let groupId;
        if (type === "dine-in") {
          groupId = sourceData.groupId || generateGroupId();
        } else {
          groupId = generateGroupId();
        }

        return {
          id: generateHistoryId(),
          groupId,
          date: taiwanDateStr,
          time: now.toTimeString().slice(0, 8),
          timestamp: now.getTime(),
          type: type === "takeout" ? "takeout" : "table",
          table: selectedTable,
          items: itemsToCheckout,
          total,
          itemCount: itemsToCheckout.reduce(
            (sum, item) => sum + item.quantity,
            0,
          ),
          paymentMethod,
          isPartialPayment: isPartialCheckout,
          partialPaymentInfo: isPartialCheckout
            ? {
                totalItems: Object.keys(partialSelection.items || {}).length,
                selectedItems: Object.values(
                  partialSelection.items || {},
                ).filter(Boolean).length,
                note: "此為部分結帳，每個商品項目獨立記錄",
              }
            : null,
        };
      };

      const historyRecord = createHistoryRecord();

      // ==================== 5. 資料更新 ====================
      const newHistory = [...salesHistory, historyRecord];
      await saveSalesHistoryToFirebase(newHistory);

      if (type === "takeout") {
        const updatedOrders = [...allItems];

        updateInstructions.forEach(
          ({ actualIndex, shouldUpdateQuantity, remainingQuantity, markAsPaid }) => {
            if (actualIndex >= 0 && actualIndex < updatedOrders.length) {
              if (markAsPaid) {
                updatedOrders[actualIndex] = {
                  ...updatedOrders[actualIndex],
                  paid: true,
                };
              }
              if (shouldUpdateQuantity) {
                updatedOrders[actualIndex] = {
                  ...updatedOrders[actualIndex],
                  quantity: remainingQuantity,
                };
              }
            }
          },
        );

        const hasUnpaidItems = updatedOrders.some(
          (item) => item.paid === false,
        );
        await saveTakeoutOrdersToFirebase({
          ...takeoutOrders,
          [selectedTable]: {
            ...sourceData,
            orders: updatedOrders,
            paid: !hasUnpaidItems,
          },
        });
      } else {
        const updatedOrders = [...sourceData.orders];

        updateInstructions.forEach(
          ({ actualIndex, shouldUpdateQuantity, remainingQuantity, markAsPaid }) => {
            if (actualIndex >= 0 && actualIndex < updatedOrders.length) {
              if (markAsPaid) {
                updatedOrders[actualIndex] = {
                  ...updatedOrders[actualIndex],
                  paid: true,
                  groupId: historyRecord.groupId,
                };
              }
              if (shouldUpdateQuantity) {
                updatedOrders[actualIndex] = {
                  ...updatedOrders[actualIndex],
                  quantity: remainingQuantity,
                };
              }
            }
          },
        );

        const stillHasUnpaidItems = updatedOrders.some(
          (item) => item && !item.__seated && item.paid === false,
        );

        await saveTableStateToFirebase(selectedTable, {
          ...sourceData,
          orders: updatedOrders,
          groupId: historyRecord.groupId,
          status: stillHasUnpaidItems ? "occupied" : "ready-to-clean",
        });
      }

      // ==================== 6. UI 回饋 ====================
      setCurrentOrder([]);

      if (isPartialCheckout) {
        alert(
          `${type === "takeout" ? "外帶" : "內用"}部分結帳成功！結帳金額：$${total}`,
        );

        // 部分結帳後，若所有品項都已結清，返回主頁面
        const remainingUnpaid = allItems.filter(
          (item) => item.paid === false,
        ).length;
        const markedAsPaidCount = updateInstructions.filter(
          (inst) => inst.markAsPaid,
        ).length;
        const hasRemainingQty = updateInstructions.some(
          (inst) => inst.shouldUpdateQuantity,
        );

        if (remainingUnpaid === markedAsPaidCount && !hasRemainingQty) {
          setSelectedTable(null);
          setCurrentView("main");
        }
      } else {
        setSelectedTable(null);
        setCurrentView("main");
        alert(
          `${type === "takeout" ? "外帶" : "內用"}結帳成功！結帳金額：$${total}`,
        );
      }
    } catch (error) {
      console.error("❌ 結帳失敗:", error);
      alert("結帳失敗，請稍後再試。錯誤: " + error.message);
    } finally {
      console.groupEnd();
    }
  };

  // 退款處理
  const handleRefund = async (recordId) => {
    const recordIndex = salesHistory.findIndex(
      (record) => record.id === recordId,
    );

    if (recordIndex === -1) {
      alert("找不到該訂單記錄");
      return;
    }

    const record = salesHistory[recordIndex];
    const newSalesHistory = [...salesHistory];
    const now = new Date();
    const parts = now
      .toLocaleDateString("zh-TW", { timeZone: "Asia/Taipei" })
      .split("/");
    const refundDate = `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;

    newSalesHistory[recordIndex] = {
      ...record,
      isRefunded: true,
      refundDate,
      refundTime: now.toTimeString().slice(0, 8),
      refundTimestamp: Date.now(),
    };

    try {
      await updateSalesRecord(recordId, {
        isRefunded: true,
        refundDate: newSalesHistory[recordIndex].refundDate,
        refundTime: newSalesHistory[recordIndex].refundTime,
        refundTimestamp: newSalesHistory[recordIndex].refundTimestamp,
      });

      // 退款是更新既有記錄，直接更新本地 state 即可，不透過 saveSalesHistoryToFirebase（那是給新增用的）
      setSalesHistory(newSalesHistory);
      alert(`訂單 ${record.table} (${record.time}) 已成功退款 $${record.total}`);
    } catch (error) {
      console.error("處理退款失敗:", error);
      alert("退款處理失敗，請稍後再試");
    }
  };

  return { checkout, handleRefund };
};

export default useCheckout;
