import React, { useState, useEffect } from "react";
import { CreditCard, Edit3, Banknote, Smartphone } from "lucide-react";
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

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash");

  const calculateCurrentTotal = () => {
    return currentOrder.reduce(
      (total, item) => total + item.price * item.quantity,
      0
    );
  };

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
    setShowPaymentModal(true);
  };

  const handleConfirmPayment = () => {
    const methodName = paymentMethod === "cash" ? "現金" : "Line Pay";
    const confirmed = window.confirm(`確定要以 ${methodName} 結帳嗎？`);
    if (confirmed) {
      onCheckout(paymentMethod);
      setShowPaymentModal(false);
    }
  };

  // 格式化顯示項目
  const formatOrderItem = (item) => {
    const subtotal = item.price * item.quantity;
    const dots = "·".repeat(Math.max(5, 20 - item.name.length));
    return `${item.name} $${item.price} x ${item.quantity} ${dots} $${subtotal}`;
  };

  // 付款方式選項
  const paymentMethods = [
    {
      id: "cash",
      name: "現金",
      icon: <Banknote className="w-8 h-8" />,
      description: "店內現金付款",
      popular: true,
    },
    {
      id: "linepay",
      name: "Line Pay",
      icon: <Smartphone className="w-8 h-8" />,
      description: "掃描QR Code付款",
      popular: false,
    },
  ];

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
                                {/* 顯示客製選項 */}
                                {item.selectedCustom &&
                                  Object.entries(item.selectedCustom).map(
                                    ([type, value]) => (
                                      <div
                                        key={type}
                                        className="text-xs text-gray-500 ml-2"
                                      >
                                        {type}: {value}
                                      </div>
                                    )
                                  )}
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
                    className="w-full bg-orange-500 text-white py-3 rounded-lg hover:bg-orange-600 font-medium"
                  >
                    結帳
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

      {/* 改善的付款方式選擇 Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4 shadow-2xl">
            {/* 標題區域 */}
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-800 mb-2">
                選擇付款方式
              </h3>
              <div className="text-3xl font-bold text-blue-600">
                總計: ${calculateGrandTotal()}
              </div>
            </div>

            {/* 付款方式選擇 */}
            <div className="space-y-4 mb-8">
              {paymentMethods.map((method) => (
                <div
                  key={method.id}
                  onClick={() => setPaymentMethod(method.id)}
                  className={`
                    relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-200
                    ${
                      paymentMethod === method.id
                        ? "border-blue-500 bg-blue-50 shadow-md"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }
                    ${method.popular ? "ring-2 ring-orange-200" : ""}
                  `}
                >
                  {/* 推薦標籤 */}
                  {method.popular && (
                    <div className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                      推薦
                    </div>
                  )}

                  <div className="flex items-center space-x-4">
                    {/* 圖示 */}
                    <div
                      className={`
                      p-3 rounded-lg
                      ${
                        paymentMethod === method.id
                          ? "bg-blue-500 text-white"
                          : "bg-gray-100 text-gray-600"
                      }
                      ${
                        method.popular && paymentMethod !== method.id
                          ? "bg-orange-100 text-orange-600"
                          : ""
                      }
                    `}
                    >
                      {method.icon}
                    </div>

                    {/* 文字資訊 */}
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-lg font-semibold text-gray-800">
                          {method.name}
                        </h4>
                        {method.popular && (
                          <span className="text-orange-600 text-sm font-medium">
                            (常用)
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        {method.description}
                      </p>
                    </div>

                    {/* 選擇指示器 */}
                    <div
                      className={`
                      w-6 h-6 rounded-full border-2 flex items-center justify-center
                      ${
                        paymentMethod === method.id
                          ? "border-blue-500 bg-blue-500"
                          : "border-gray-300"
                      }
                    `}
                    >
                      {paymentMethod === method.id && (
                        <div className="w-2 h-2 rounded-full bg-white"></div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 按鈕區域 */}
            <div className="flex space-x-3">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleConfirmPayment}
                className="flex-1 py-3 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium transition-colors shadow-md"
              >
                確認付款
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default OrderSummary;
