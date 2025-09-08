// ===== 1. 修改 OrderSummary.js =====

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
  useEffect(() => {}, [
    selectedTable,
    tableStatus,
    confirmedOrdersBatches,
    currentOrder,
  ]);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCheckoutTypeModal, setShowCheckoutTypeModal] = useState(false); // 新增：選擇結帳類型
  const [showPartialCheckoutModal, setShowPartialCheckoutModal] =
    useState(false); // 新增：部分結帳商品選擇
  const [selectedItems, setSelectedItems] = useState({}); // 新增：選中的商品
  const [paymentMethod, setPaymentMethod] = useState("cash");

  // 計算相關函數保持不變
  const calculateCurrentTotal = () => {
    return currentOrder.reduce(
      (total, item) => total + getItemSubtotal(item),
      0
    );
  };

  const calculateConfirmedTotal = () => {
    if (selectedTable.startsWith("T")) {
      const editingPositions = new Set(
        currentOrder
          .filter((item) => item.isEditing && item.isTakeout)
          .map((item) => item.originalItemIndex)
      );

      const total = confirmedOrdersBatches
        .flat()
        .reduce((total, item, index) => {
          if (editingPositions.has(index)) {
            return total;
          }
          return total + getItemSubtotal(item);
        }, 0);

      return total;
    } else {
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
              return itemTotal + getItemSubtotal(item);
            }, 0)
          );
        },
        0
      );

      return total;
    }
  };

  const getItemSubtotal = (item) => {
    let discount = 0;
    if (item.selectedCustom && item.selectedCustom["續杯"] === "是") {
      discount = 20;
    }
    return Math.max(item.price - discount, 0) * item.quantity;
  };

  const calculateGrandTotal = () => {
    const currentTotal = calculateCurrentTotal();
    const confirmedTotal = calculateConfirmedTotal();
    return currentTotal + confirmedTotal;
  };

  // 新增：計算部分結帳總額
  const calculatePartialTotal = () => {
    let total = 0;
    Object.entries(selectedItems).forEach(([key, isSelected]) => {
      if (isSelected) {
        const [batchIndex, itemIndex] = key.split("-").map(Number);
        const item = confirmedOrdersBatches[batchIndex][itemIndex];
        total += getItemSubtotal(item);
      }
    });
    return total;
  };

  // 新增：獲取所有可結帳的商品（排除正在編輯的）
  const getCheckoutableItems = () => {
    const editingPositions = new Set(
      currentOrder
        .filter((item) => item.isEditing && !item.isTakeout)
        .map((item) => `${item.originalBatchIndex}-${item.originalItemIndex}`)
    );

    const items = [];
    confirmedOrdersBatches.forEach((batch, batchIndex) => {
      batch.forEach((item, itemIndex) => {
        const positionKey = `${batchIndex}-${itemIndex}`;
        // 檢查是否已付款
        if (item.paid === true) {
          return;
        }

        if (!editingPositions.has(positionKey)) {
          items.push({
            ...item,
            batchIndex,
            itemIndex,
            key: positionKey,
          });
        }
      });
    });

    return items;
  };

  const formatOrderItem = (item) => {
    const subtotal = getItemSubtotal(item);
    const dots = "·".repeat(Math.max(5, 20 - item.name.length));
    return `${item.name} $${item.price} x ${item.quantity} ${dots} $${subtotal}`;
  };

  // 新增：處理結帳按鈕點擊
  const handleCheckoutClick = () => {
    const checkoutableItems = getCheckoutableItems();

    // 如果只有當前訂單或者已確認商品少於2個，直接跳到付款選擇
    if (checkoutableItems.length <= 1) {
      setShowPaymentModal(true);
    } else {
      // 有多個已確認商品，先選擇結帳類型
      setShowCheckoutTypeModal(true);
    }
  };

  // 新增：處理全部結帳
  const handleFullCheckout = () => {
    setShowCheckoutTypeModal(false);
    setShowPaymentModal(true);
  };

  // 新增：處理部分結帳
  const handlePartialCheckout = () => {
    setShowCheckoutTypeModal(false);
    // 初始化選中狀態
    const initialSelection = {};
    getCheckoutableItems().forEach((item) => {
      initialSelection[item.key] = false;
    });
    setSelectedItems(initialSelection);
    setShowPartialCheckoutModal(true);
  };

  // 新增：確認部分結帳選擇
  const handleConfirmPartialSelection = () => {
    const hasSelection = Object.values(selectedItems).some(Boolean);
    if (!hasSelection) {
      alert("請至少選擇一個商品");
      return;
    }
    setShowPartialCheckoutModal(false);
    setShowPaymentModal(true);
  };

  // 修改：處理付款確認，支援部分結帳
  const handleConfirmPayment = () => {
    const methodName = paymentMethod === "cash" ? "現金" : "Line Pay";

    // 檢查是否為部分結帳
    const hasPartialSelection =
      Object.keys(selectedItems).length > 0 &&
      Object.values(selectedItems).some(Boolean);

    if (hasPartialSelection) {
      const total = calculatePartialTotal();
      const confirmed = window.confirm(
        `確定要以 ${methodName} 結帳選中的商品，總額 $${total} 嗎？`
      );
      if (confirmed) {
        onCheckout(paymentMethod, selectedItems); // 傳遞選中的商品
        setShowPaymentModal(false);
        setSelectedItems({});
      }
    } else {
      const confirmed = window.confirm(`確定要以 ${methodName} 結帳嗎？`);
      if (confirmed) {
        onCheckout(paymentMethod);
        setShowPaymentModal(false);
      }
    }
  };

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
          </div>

          <div className="flex-1 p-4 overflow-y-auto">
            {/* 已確認的訂單區域 - 按批次顯示 */}
            {confirmedOrdersBatches.length > 0 ? (
              <div className="mb-4">
                <div className="text-sm text-green-600 mb-2">
                  有 {confirmedOrdersBatches.length} 次點餐紀錄
                </div>
                {confirmedOrdersBatches.map((batch, batchIndex) => {
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
                                (total, item) => total + getItemSubtotal(item),
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

            <div className="flex justify-between items-center mb-4 pt-2 border-t">
              <span className="text-lg font-bold">總計:</span>
              <span className="text-xl font-bold text-blue-600">
                ${calculateGrandTotal()}
              </span>
            </div>

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

      {/* 新增：結帳類型選擇 Modal */}
      {showCheckoutTypeModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-800 mb-2">
                選擇結帳方式
              </h3>
              <div className="text-lg text-gray-600">
                總計: ${calculateGrandTotal()}
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <button
                onClick={handleFullCheckout}
                className="w-full p-4 rounded-xl border-2 border-blue-500 bg-blue-50 hover:bg-blue-100 transition-colors"
              >
                <h4 className="text-lg font-semibold text-blue-800 mb-1">
                  全部結帳
                </h4>
                <p className="text-sm text-blue-600">一次結清所有餐點</p>
              </button>

              <button
                onClick={handlePartialCheckout}
                className="w-full p-4 rounded-xl border-2 border-orange-500 bg-orange-50 hover:bg-orange-100 transition-colors"
              >
                <h4 className="text-lg font-semibold text-orange-800 mb-1">
                  分開結帳
                </h4>
                <p className="text-sm text-orange-600">選擇部分餐點結帳</p>
              </button>
            </div>

            <button
              onClick={() => setShowCheckoutTypeModal(false)}
              className="w-full py-3 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* 新增：部分結帳商品選擇 Modal */}
      {showPartialCheckoutModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4 shadow-2xl max-h-[80vh] overflow-y-auto">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                選擇要結帳的餐點
              </h3>
              <div className="text-sm text-gray-600">請勾選要結帳的商品</div>
            </div>

            <div className="space-y-3 mb-6">
              {getCheckoutableItems().map((item, index) => {
                return (
                  <label
                    key={item.key}
                    className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                      selectedItems[item.key]
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedItems[item.key] || false}
                      onChange={(e) => {
                        setSelectedItems({
                          ...selectedItems,
                          [item.key]: e.target.checked,
                        });
                      }}
                      className="mr-3 w-4 h-4"
                    />
                    <div className="flex-1">
                      <div className="font-medium">{item.name}</div>
                      <div className="text-sm text-gray-600">
                        ${item.price} x {item.quantity} = $
                        {getItemSubtotal(item)}
                      </div>
                      {item.selectedCustom &&
                        Object.entries(item.selectedCustom).map(
                          ([type, value]) => (
                            <div key={type} className="text-xs text-gray-500">
                              {type}: {value}
                            </div>
                          )
                        )}
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="border-t pt-4 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold">選中商品總計:</span>
                <span className="text-xl font-bold text-blue-600">
                  ${calculatePartialTotal()}
                </span>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowPartialCheckoutModal(false)}
                className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleConfirmPartialSelection}
                className="flex-1 py-3 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium transition-colors"
              >
                確認選擇
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 付款方式選擇 Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-800 mb-2">
                選擇付款方式
              </h3>
              <div className="text-3xl font-bold text-blue-600">
                總計: $
                {Object.keys(selectedItems).length > 0 &&
                Object.values(selectedItems).some(Boolean)
                  ? calculatePartialTotal()
                  : calculateGrandTotal()}
              </div>
            </div>

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
                  {method.popular && (
                    <div className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                      推薦
                    </div>
                  )}

                  <div className="flex items-center space-x-4">
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
