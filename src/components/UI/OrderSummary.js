import React, { useState, useEffect } from "react";
import { CreditCard, Edit3 } from "lucide-react";
import OrderItem from "./OrderItem";

const OrderSummary = ({
  currentOrder,
  confirmedOrdersBatches = [],
  selectedTable,
  tableStatus,
  onUpdateQuantity,
  onRemoveItem,
  onSubmitOrder,
  onCheckout,
  onEditConfirmedItem,
}) => {
  // Debug: 列印接收到的資料
  useEffect(() => {
    console.log("OrderSummary 接收到的資料:", {
      selectedTable,
      tableStatus,
      confirmedOrdersBatches,
      currentOrder,
    });
  }, [selectedTable, tableStatus, confirmedOrdersBatches, currentOrder]);

  const calculateCurrentTotal = () => {
    return currentOrder.reduce(
      (total, item) => total + item.price * item.quantity,
      0
    );
  };

  // const calculateConfirmedTotal = () => {
  //   console.log("計算已確認總計，批次資料:", confirmedOrdersBatches);

  //   // 創建一個集合來追蹤正在編輯的項目位置
  //   const editingPositions = new Set(
  //     currentOrder
  //       .filter((item) => item.isEditing)
  //       .map((item) => `${item.originalBatchIndex}-${item.originalItemIndex}`)
  //   );

  //   const total = confirmedOrdersBatches.reduce(
  //     (batchTotal, batch, batchIndex) => {
  //       return (
  //         batchTotal +
  //         batch.reduce((itemTotal, item, itemIndex) => {
  //           // 如果這個項目正在編輯中，不計算原有的價格
  //           const positionKey = `${batchIndex}-${itemIndex}`;
  //           if (editingPositions.has(positionKey)) {
  //             return itemTotal;
  //           }
  //           return itemTotal + item.price * item.quantity;
  //         }, 0)
  //       );
  //     },
  //     0
  //   );

  //   console.log("已確認總計:", total);
  //   return total;
  // };

  const calculateConfirmedTotal = () => {
    console.log("計算已確認總計，批次資料:", confirmedOrdersBatches);

    if (selectedTable.startsWith("T")) {
      // 外帶訂單的計算
      const editingPositions = new Set(
        currentOrder
          .filter((item) => item.isEditing && item.isTakeout)
          .map((item) => item.originalItemIndex)
      );

      const total = confirmedOrdersBatches
        .flat()
        .reduce((total, item, index) => {
          // 如果這個項目正在編輯中，不計算原有的價格
          if (editingPositions.has(index)) {
            return total;
          }
          return total + item.price * item.quantity;
        }, 0);

      return total;
    } else {
      // 內用訂單的計算（原有邏輯）
      const editingPositions = new Set(
        currentOrder
          .filter((item) => item.isEditing && !item.isTakeout)
          .map((item) => `${item.originalBatchIndex}-${item.originalItemIndex}`)
      );

      const total = confirmedOrdersBatches.reduce(
        (batchTotal, batch, batchIndex) => {
          return (
            batchTotal +
            batch.reduce((itemTotal, item, itemIndex) => {
              const positionKey = `${batchIndex}-${itemIndex}`;
              if (editingPositions.has(positionKey)) {
                return itemTotal;
              }
              return itemTotal + item.price * item.quantity;
            }, 0)
          );
        },
        0
      );

      return total;
    }
  };

  // 加在這裡
  const calculateGrandTotal = () => {
    const currentTotal = calculateCurrentTotal();
    const confirmedTotal = calculateConfirmedTotal();
    return currentTotal + confirmedTotal;
  };

  const handleCheckoutClick = () => {
    const confirmed = window.confirm(
      `確定要為 ${selectedTable} 結帳 $${calculateGrandTotal()} 嗎？`
    );
    if (confirmed) {
      onCheckout();
    }
  };

  // 格式化顯示項目
  const formatOrderItem = (item) => {
    const subtotal = item.price * item.quantity;
    const dots = "·".repeat(Math.max(5, 20 - item.name.length));
    return `${item.name} $${item.price} x ${item.quantity} ${dots} $${subtotal}`;
  };

  return (
    <>
      <div className="p-4 max-h-[600px]">
        <div className="bg-white rounded-lg shadow-sm h-full flex flex-col">
          <div className="p-4 border-b">
            <h2 className="text-lg font-bold">小計</h2>
            {/* Debug 資訊
            <div className="text-xs text-gray-500 mt-1">
              Debug: 批次數量={confirmedOrdersBatches.length}, 狀態=
              {tableStatus}
            </div> */}
          </div>

          <div className="flex-1 p-4 overflow-y-auto">
            {/* 已確認的訂單區域 - 按批次顯示 */}
            {confirmedOrdersBatches.length > 0 ? (
              <div className="mb-4">
                <div className="text-sm text-green-600 mb-2">
                  有 {confirmedOrdersBatches.length} 次點餐紀錄
                </div>
                {confirmedOrdersBatches.map((batch, batchIndex) => {
                  console.log(`渲染批次 ${batchIndex}:`, batch);
                  return (
                    <div key={`batch-${batchIndex}`} className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-600">
                          {batchIndex === 0
                            ? "首次點餐"
                            : `第${batchIndex + 1}次追加`}
                        </h3>
                        <span className="text-sm text-gray-500">
                          $
                          {Array.isArray(batch)
                            ? batch.reduce(
                                (total, item) =>
                                  total + item.price * item.quantity,
                                0
                              )
                            : 0}
                        </span>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg space-y-1">
                        {Array.isArray(batch) ? (
                          batch.map((item, itemIndex) => (
                            <div
                              key={`confirmed-${batchIndex}-${item.id}-${itemIndex}`}
                              className="flex items-center justify-between py-1"
                            >
                              <div className="flex-1">
                                <div className="text-sm font-mono text-gray-700">
                                  {formatOrderItem(item)}
                                </div>
                              </div>
                              <button
                                onClick={() =>
                                  onEditConfirmedItem(
                                    item,
                                    batchIndex,
                                    itemIndex
                                  )
                                }
                                className="ml-2 p-1 text-gray-400 hover:text-blue-500"
                                title="修改此項目"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                            </div>
                          ))
                        ) : (
                          <div className="text-red-500 text-xs">
                            警告：批次不是陣列格式: {JSON.stringify(batch)}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-yellow-600 text-sm mb-4">尚未點餐</div>
            )}

            {/* 當前編輯的訂單區域 */}
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-2">
                {currentOrder.length > 0 ? "新增餐點" : "尚未點餐"}
              </h3>
              {currentOrder.length === 0 ? (
                <div className="text-gray-400 text-center text-sm py-4">
                  點選菜單加入餐點
                </div>
              ) : (
                <div className="space-y-3">
                  {currentOrder.map((item, index) => (
                    <OrderItem
                      key={`current-${item.id}-${index}`}
                      item={item}
                      onUpdateQuantity={onUpdateQuantity}
                      onRemove={onRemoveItem}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 總計和按鈕區域 */}
          <div className="p-4 border-t">
            {/* Debug 資訊
            <div className="text-xs text-blue-600 mb-2">
              Debug: 當前={calculateCurrentTotal()}, 已確認=
              {calculateConfirmedTotal()}, 總計={calculateGrandTotal()}
            </div> */}

            {/* 分項顯示 */}
            {confirmedOrdersBatches.length > 0 && (
              <div className="text-sm text-gray-600 mb-2">
                <div className="flex justify-between">
                  <span>已確認:</span>
                  <span>${calculateConfirmedTotal()}</span>
                </div>
                {currentOrder.length > 0 && (
                  <div className="flex justify-between">
                    <span>新增:</span>
                    <span>${calculateCurrentTotal()}</span>
                  </div>
                )}
              </div>
            )}

            {/* 總計 */}
            <div className="flex justify-between items-center mb-4 pt-2 border-t">
              <span className="text-lg font-bold">總計:</span>
              <span className="text-xl font-bold text-blue-600">
                ${calculateGrandTotal()}
              </span>
            </div>

            {/* 按鈕區域 */}
            <div className="space-y-2">
              {(tableStatus === "occupied" || selectedTable.startsWith("T")) &&
                !currentOrder.some((item) => item.isEditing) && (
                  <button
                    onClick={handleCheckoutClick}
                    className="w-full bg-green-500 text-white py-3 rounded-lg hover:bg-green-600 font-medium flex items-center justify-center space-x-2"
                  >
                    <CreditCard className="w-5 h-5" />
                    <span>結帳 (${calculateGrandTotal()})</span>
                  </button>
                )}

              {currentOrder.length > 0 && (
                <button
                  onClick={onSubmitOrder}
                  className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 font-medium"
                >
                  {currentOrder.some((item) => item.isEditing)
                    ? "更新餐點"
                    : "送出新增餐點"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default OrderSummary;
