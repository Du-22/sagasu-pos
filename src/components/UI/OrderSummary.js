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
  const [showCheckoutTypeModal, setShowCheckoutTypeModal] = useState(false);
  const [showPartialCheckoutModal, setShowPartialCheckoutModal] =
    useState(false);
  const [selectedItems, setSelectedItems] = useState({});
  const [paymentMethod, setPaymentMethod] = useState("cash");

  // 使用與 CafePOSSystem 相同的價格計算邏輯
  const getItemSubtotal = (item) => {
    let basePrice = item.price;
    let adjustment = 0;

    if (item.selectedCustom) {
      // 續杯折扣 -20 元
      if (item.selectedCustom["續杯"] === "是") {
        adjustment -= 20;
      }

      // 加濃縮 +20 元
      if (item.selectedCustom["濃縮"] === "加濃縮") {
        adjustment += 20;
      }

      // 換燕麥奶 +20 元
      if (item.selectedCustom["奶"] === "換燕麥奶") {
        adjustment += 20;
      }
    }

    const finalPrice = Math.max(basePrice + adjustment, 0);
    return finalPrice * item.quantity;
  };

  // 修正：將扁平化的訂單按時間分組，模擬批次顯示
  const groupOrdersByTime = (flatOrders) => {
    if (!Array.isArray(flatOrders) || flatOrders.length === 0) {
      return [];
    }

    // 依據timestamp分組
    const groups = [];
    const timeGroups = {};

    flatOrders.forEach((item, index) => {
      if (item && !item.__seated) {
        const timestamp = item.timestamp;
        if (!timeGroups[timestamp]) {
          timeGroups[timestamp] = [];
        }
        timeGroups[timestamp].push({ ...item, originalIndex: index });
      }
    });

    // 按時間排序並轉為陣列
    const sortedTimestamps = Object.keys(timeGroups).sort();
    return sortedTimestamps.map((timestamp) => timeGroups[timestamp]);
  };

  // 修正：處理確認訂單的顯示
  const getProcessedConfirmedOrders = () => {
    if (confirmedOrdersBatches.length === 0) return [];

    // 無論是批次格式還是扁平化格式，都統一處理為時間分組的批次結構（僅用於顯示）
    if (Array.isArray(confirmedOrdersBatches[0])) {
      const flatOrders = confirmedOrdersBatches[0];

      // 如果是扁平化結構，按時間分組來模擬批次顯示
      if (flatOrders.length > 0 && !Array.isArray(flatOrders[0])) {
        return groupOrdersByTime(flatOrders);
      }

      // 如果已經是批次結構，直接返回
      return confirmedOrdersBatches[0];
    }

    return [];
  };

  const processedBatches = getProcessedConfirmedOrders();

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

      const total = processedBatches.flat().reduce((total, item, index) => {
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

      const total = processedBatches.reduce((batchTotal, batch, batchIndex) => {
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
      }, 0);

      return total;
    }
  };

  const calculateGrandTotal = () => {
    const currentTotal = calculateCurrentTotal();
    const confirmedTotal = calculateConfirmedTotal();
    return currentTotal + confirmedTotal;
  };

  const formatOrderItem = (item) => {
    // 計算價格調整
    let adjustment = 0;
    const adjustmentDetails = [];

    if (item.selectedCustom) {
      // 續杯折扣 -20 元
      if (item.selectedCustom["續杯"] === "是") {
        adjustment -= 20;
        adjustmentDetails.push("續杯-$20");
      }

      // 加濃縮 +20 元
      if (item.selectedCustom["濃縮"] === "加濃縮") {
        adjustment += 20;
        adjustmentDetails.push("加濃縮+$20");
      }

      // 換燕麥奶 +20 元
      if (item.selectedCustom["奶"] === "換燕麥奶") {
        adjustment += 20;
        adjustmentDetails.push("燕麥奶+$20");
      }
    }

    const finalPrice = Math.max(item.price + adjustment, 0);
    const subtotal = finalPrice * item.quantity;

    // 構建顯示字串
    let displayText = `${item.name}`;

    if (adjustment !== 0) {
      displayText += ` $${item.price}`;
      if (adjustment > 0) {
        displayText += `+$${adjustment}`;
      } else {
        displayText += `-$${Math.abs(adjustment)}`;
      }
      displayText += `=$${finalPrice}`;
    } else {
      displayText += ` $${item.price}`;
    }

    displayText += ` x ${item.quantity}`;

    const dots = "·".repeat(Math.max(5, 25 - displayText.length));
    displayText += ` ${dots} $${subtotal}`;

    if (adjustmentDetails.length > 0) {
      displayText += ` (${adjustmentDetails.join(", ")})`;
    }

    return displayText;
  };

  // 計算部分結帳總額
  const calculatePartialTotal = () => {
    let total = 0;
    const checkoutableItems = getCheckoutableItems();

    console.log("🔧 calculatePartialTotal 開始:", {
      selectedItems,
      checkoutableItems: checkoutableItems.map((item) => ({
        key: item.key,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
      })),
    });

    Object.entries(selectedItems).forEach(([key, isSelected]) => {
      if (isSelected) {
        const item = checkoutableItems.find((item) => item.key === key);
        if (item) {
          const itemSubtotal = getItemSubtotal(item);
          total += itemSubtotal;
          console.log("🔧 計算項目:", {
            key,
            item: item.name,
            price: item.price,
            quantity: item.quantity,
            subtotal: itemSubtotal,
            runningTotal: total,
          });
        } else {
          console.warn("⚠️ 找不到選中的項目:", key);
          console.log(
            "🔧 可用的項目 keys:",
            checkoutableItems.map((item) => item.key)
          );
        }
      }
    });

    console.log("🔧 部分結帳總額:", total);
    return total;
  };

  // 獲取所有可結帳的商品（排除正在編輯的）
  const getCheckoutableItems = () => {
    const editingPositions = new Set(
      currentOrder
        .filter((item) => item.isEditing && !item.isTakeout)
        .map((item) => `0-${item.originalItemIndex}`) // 統一使用 0- 前綴
    );

    const items = [];

    console.log("🔧 Debug getCheckoutableItems:", {
      processedBatches,
      editingPositions: Array.from(editingPositions),
      selectedTable,
    });

    // 統一處理：無論是扁平化還是批次結構，都使用統一的索引格式
    if (processedBatches.length === 0) {
      return items;
    }

    // 檢查是否為扁平化結構
    const isFlat =
      processedBatches.length === 1 &&
      Array.isArray(processedBatches[0]) &&
      processedBatches[0].length > 0 &&
      !Array.isArray(processedBatches[0][0]);

    if (isFlat) {
      // 扁平化結構：統一使用 0-0, 0-1, 0-2 索引
      const flatItems = processedBatches[0];
      flatItems.forEach((item, itemIndex) => {
        const positionKey = `0-${itemIndex}`;

        // 檢查是否已付款
        if (item.paid === true) {
          return;
        }

        // 檢查是否正在編輯
        if (!editingPositions.has(positionKey)) {
          items.push({
            ...item,
            batchIndex: 0,
            itemIndex: itemIndex,
            key: positionKey,
          });
        }
      });
    } else {
      // 批次結構：轉換為統一索引格式
      let globalIndex = 0;
      processedBatches.forEach((batch, batchIndex) => {
        if (Array.isArray(batch)) {
          batch.forEach((item, itemIndex) => {
            const positionKey = `0-${globalIndex}`; // 統一使用 0- 前綴和全局索引

            // 檢查是否已付款
            if (item.paid === true) {
              globalIndex++;
              return;
            }

            if (!editingPositions.has(positionKey)) {
              items.push({
                ...item,
                batchIndex: 0, // 統一設為 0
                itemIndex: globalIndex, // 使用全局索引
                key: positionKey,
                originalBatchIndex: batchIndex, // 保留原始批次信息供調試
                originalItemIndex: itemIndex,
              });
            }
            globalIndex++;
          });
        }
      });
    }

    console.log("🔧 可結帳項目:", items);
    return items;
  };

  // 格式化時間顯示
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "未知時間";
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString("zh-TW", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return "未知時間";
    }
  };

  // 處理結帳按鈕點擊
  const handleCheckoutClick = () => {
    const checkoutableItems = getCheckoutableItems();

    if (checkoutableItems.length <= 1) {
      setShowPaymentModal(true);
    } else {
      setShowCheckoutTypeModal(true);
    }
  };

  // 處理全部結帳
  const handleFullCheckout = () => {
    setShowCheckoutTypeModal(false);
    setShowPaymentModal(true);
  };

  // 處理部分結帳
  const handlePartialCheckout = () => {
    setShowCheckoutTypeModal(false);
    const initialSelection = {};
    getCheckoutableItems().forEach((item) => {
      initialSelection[item.key] = false;
    });
    setSelectedItems(initialSelection);
    setShowPartialCheckoutModal(true);
  };

  // 確認部分結帳選擇
  const handleConfirmPartialSelection = () => {
    const hasSelection = Object.values(selectedItems).some(Boolean);
    if (!hasSelection) {
      alert("請至少選擇一個商品");
      return;
    }

    const total = calculatePartialTotal();
    if (total === 0) {
      alert("選中商品的總額為 $0，請檢查是否正確選擇商品");
      return;
    }

    setShowPartialCheckoutModal(false);
    setShowPaymentModal(true);
  };

  // 處理付款確認，支援部分結帳
  const handleConfirmPayment = () => {
    const methodName = paymentMethod === "cash" ? "現金" : "Line Pay";

    // 修正：正確定義 hasPartialSelection
    const hasPartialSelection =
      Object.keys(selectedItems).length > 0 &&
      Object.values(selectedItems).some(Boolean);

    if (hasPartialSelection) {
      const total = calculatePartialTotal();

      if (total === 0) {
        alert("選中商品的總額為0，請重新選擇");
        return;
      }

      const selectedCount = Object.values(selectedItems).filter(Boolean).length;
      const confirmed = window.confirm(
        `確定要以 ${methodName} 結帳選中的 ${selectedCount} 項商品，總額 $${total} 嗎？`
      );

      if (confirmed) {
        console.log("🔧 執行部分結帳:", {
          paymentMethod,
          selectedItems,
          total,
        });
        onCheckout(paymentMethod, selectedItems);
        setShowPaymentModal(false);
        setSelectedItems({});
      }
    } else {
      // 全部結帳
      const total = calculateGrandTotal();
      const confirmed = window.confirm(
        `確定要以 ${methodName} 結帳全部商品，總額 $${total} 嗎？`
      );
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
            {/* 已確認的訂單區域 - 修正顯示邏輯 */}
            {processedBatches.length > 0 ? (
              <div className="mb-4">
                <div className="text-sm text-green-600 mb-2">
                  有 {processedBatches.length} 次點餐紀錄
                </div>
                {processedBatches.map((batch, batchIndex) => {
                  // 獲取該批次的時間（取第一個商品的時間）
                  const batchTime =
                    batch.length > 0 ? batch[0].timestamp : null;

                  return (
                    <div
                      key={`batch-${batchIndex}-${batchTime}`}
                      className="mb-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-600">
                          {batchIndex === 0
                            ? "首次點餐"
                            : `第${batchIndex + 1}次追加`}
                          {batchTime && (
                            <span className="ml-2 text-xs text-gray-500">
                              ({formatTimestamp(batchTime)})
                            </span>
                          )}
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
                              key={`confirmed-${batchIndex}-${item.id}-${itemIndex}-${item.timestamp}`}
                              className="py-2 border-b border-gray-200 last:border-b-0"
                            >
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex-1">
                                  <div className="text-sm font-medium text-gray-700">
                                    {item.name}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    基本價格 ${item.price} × {item.quantity}
                                  </div>
                                </div>
                                <button
                                  onClick={() =>
                                    onEditConfirmedItem(
                                      item,
                                      batchIndex,
                                      item.originalIndex !== undefined
                                        ? item.originalIndex
                                        : itemIndex
                                    )
                                  }
                                  className="ml-2 p-1 text-gray-400 hover:text-blue-500"
                                  title="修改此項目"
                                >
                                  <Edit3 className="w-3 h-3" />
                                </button>
                              </div>

                              {/* 客製選項和價格調整 */}
                              {item.selectedCustom &&
                                Object.entries(item.selectedCustom).length >
                                  0 && (
                                  <div className="ml-4 mb-2">
                                    {Object.entries(item.selectedCustom).map(
                                      ([type, value]) => {
                                        // 計算價格調整
                                        let adjustment = null;
                                        if (type === "續杯" && value === "是") {
                                          adjustment = {
                                            type: "續杯折扣",
                                            amount: -20,
                                          };
                                        } else if (
                                          type === "濃縮" &&
                                          value === "加濃縮"
                                        ) {
                                          adjustment = {
                                            type: "加濃縮",
                                            amount: 20,
                                          };
                                        } else if (
                                          type === "奶" &&
                                          value === "換燕麥奶"
                                        ) {
                                          adjustment = {
                                            type: "換燕麥奶",
                                            amount: 20,
                                          };
                                        }

                                        return (
                                          <div
                                            key={type}
                                            className="text-xs text-gray-600 flex justify-between"
                                          >
                                            <span>
                                              {type}: {value}
                                            </span>
                                            {adjustment && (
                                              <span
                                                className={`font-medium ${
                                                  adjustment.amount > 0
                                                    ? "text-red-600"
                                                    : "text-green-600"
                                                }`}
                                              >
                                                {adjustment.amount > 0
                                                  ? "+"
                                                  : ""}
                                                ${adjustment.amount}
                                              </span>
                                            )}
                                          </div>
                                        );
                                      }
                                    )}
                                  </div>
                                )}

                              {/* 價格小計 */}
                              <div className="ml-4 mt-1 pt-1 border-t border-gray-100">
                                <div className="flex justify-between items-center">
                                  <div className="text-xs text-gray-600">
                                    {(() => {
                                      const subtotal = getItemSubtotal(item);
                                      const finalUnitPrice =
                                        subtotal / item.quantity;
                                      const adjustment =
                                        finalUnitPrice - item.price;

                                      if (adjustment !== 0) {
                                        return (
                                          <span>
                                            ${item.price}
                                            <span
                                              className={`mx-1 ${
                                                adjustment > 0
                                                  ? "text-red-600"
                                                  : "text-green-600"
                                              }`}
                                            >
                                              {adjustment > 0 ? "+" : ""}$
                                              {adjustment}
                                            </span>
                                            = ${finalUnitPrice} ×{" "}
                                            {item.quantity}
                                          </span>
                                        );
                                      } else {
                                        return (
                                          <span>
                                            ${item.price} × {item.quantity}
                                          </span>
                                        );
                                      }
                                    })()}
                                  </div>
                                  <div className="text-sm font-bold text-green-600">
                                    小計: ${getItemSubtotal(item)}
                                  </div>
                                </div>
                              </div>
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
            {processedBatches.length > 0 && (
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

      {/* 結帳類型選擇 Modal */}
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

      {/* 部分結帳商品選擇 Modal */}
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
