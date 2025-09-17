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
  const [selectedQuantities, setSelectedQuantities] = useState({}); // 記錄每個商品選擇的數量
  const [paymentMethod, setPaymentMethod] = useState("cash");

  // 使用與 CafePOSSystem 相同的價格計算邏輯
  const getItemSubtotal = (item) => {
    let basePrice = item.price || 0;
    let totalAdjustment = 0;

    // 檢查新格式的價格調整
    if (item.selectedCustom && item.customOptions) {
      Object.entries(item.selectedCustom).forEach(
        ([optionType, selectedValue]) => {
          if (!selectedValue) return;

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
          }
        }
      );
    }

    // 向下相容：續杯邏輯
    if (
      totalAdjustment === 0 &&
      item.selectedCustom &&
      item.selectedCustom["續杯"] === "是"
    ) {
      const renewalOption = item.customOptions?.find(
        (opt) => opt.type === "續杯"
      );
      if (
        !renewalOption ||
        !renewalOption.priceAdjustments ||
        !renewalOption.priceAdjustments["是"]
      ) {
        totalAdjustment = -20;
      }
    }

    const finalPrice = Math.max(basePrice + totalAdjustment, 0);
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

  // 獲取所有可結帳的商品，按數量拆分
  const getCheckoutableItems = () => {
    const editingPositions = new Set(
      currentOrder
        .filter((item) => item.isEditing && !item.isTakeout)
        .map((item) => `0-${item.originalItemIndex}`)
    );

    const items = [];

    if (processedBatches.length === 0) {
      return items;
    }

    const isFlat =
      processedBatches.length === 1 &&
      Array.isArray(processedBatches[0]) &&
      processedBatches[0].length > 0 &&
      !Array.isArray(processedBatches[0][0]);

    if (isFlat) {
      const flatItems = processedBatches[0];
      flatItems.forEach((item, itemIndex) => {
        const positionKey = `0-${itemIndex}`;

        if (item.paid === true) {
          return;
        }

        if (!editingPositions.has(positionKey)) {
          // 每個商品一個選項
          items.push({
            ...item,
            batchIndex: 0,
            itemIndex: itemIndex,
            key: positionKey,
            itemId: `${item.id}-${JSON.stringify(
              item.selectedCustom
            )}-${itemIndex}`,
          });
        }
      });
    } else {
      let globalIndex = 0;
      processedBatches.forEach((batch, batchIndex) => {
        if (Array.isArray(batch)) {
          batch.forEach((item, itemIndex) => {
            const positionKey = `0-${globalIndex}`;

            if (item.paid === true) {
              globalIndex++;
              return;
            }

            if (!editingPositions.has(positionKey)) {
              items.push({
                ...item,
                batchIndex: 0,
                itemIndex: globalIndex,
                key: positionKey,
                itemId: `${item.id}-${JSON.stringify(
                  item.selectedCustom
                )}-${globalIndex}`,
                originalBatchIndex: batchIndex,
                originalItemIndex: itemIndex,
              });
            }
            globalIndex++;
          });
        }
      });
    }

    return items;
  };

  // 按商品分組顯示的函數
  const groupCheckoutableItems = (items) => {
    const groups = {};

    items.forEach((item) => {
      const groupKey = item.itemId;
      if (!groups[groupKey]) {
        groups[groupKey] = {
          ...item,
          quantities: [],
        };
      }
      groups[groupKey].quantities.push({
        qty: item.displayQuantity,
        key: item.key,
      });
    });

    return Object.values(groups);
  };

  // 計算部分結帳總額（按選中數量計算）
  const calculatePartialTotal = () => {
    let total = 0;
    const checkoutableItems = getCheckoutableItems();

    Object.entries(selectedItems).forEach(([key, isSelected]) => {
      if (isSelected) {
        const selectedQty = selectedQuantities[key] || 1; // 預設為1
        if (selectedQty > 0) {
          const item = checkoutableItems.find((item) => item.key === key);
          if (item) {
            // 計算選中數量的總價
            const unitPrice = getItemSubtotal({ ...item, quantity: 1 });
            total += unitPrice * selectedQty;
          }
        }
      }
    });

    return total;
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
    const initialQuantities = {};

    getCheckoutableItems().forEach((item) => {
      initialSelection[item.key] = false;
      initialQuantities[item.key] = 0; // 預設選擇0個
    });

    setSelectedItems(initialSelection);
    setSelectedQuantities(initialQuantities);
    setShowPartialCheckoutModal(true);
  };

  // 確認部分結帳選擇
  const handleConfirmPartialSelection = () => {
    // 只要有勾選就有效，因為勾選必然有數量
    const hasValidSelection = Object.values(selectedItems).some(Boolean);

    if (!hasValidSelection) {
      alert("請至少選擇一個商品並設定數量");
      return;
    }

    const total = calculatePartialTotal();
    if (total === 0) {
      alert("選中商品的總額為 $0，請檢查是否正確選擇商品和數量");
      return;
    }

    setShowPartialCheckoutModal(false);
    setShowPaymentModal(true);
  };

  // 處理付款確認，支援部分結帳
  const handleConfirmPayment = () => {
    const methodName = paymentMethod === "cash" ? "現金" : "Line Pay";

    const hasPartialSelection = Object.values(selectedItems).some(Boolean);

    if (hasPartialSelection) {
      const total = calculatePartialTotal();
      const selectedCount = Object.entries(selectedItems)
        .filter(([key, isSelected]) => isSelected)
        .reduce((sum, [key]) => sum + (selectedQuantities[key] || 1), 0); // 預設為1

      if (total === 0 || selectedCount === 0) {
        alert("選中商品的總額為0或數量為0，請重新選擇");
        return;
      }

      const confirmed = window.confirm(
        `確定要以 ${methodName} 結帳選中的 ${selectedCount} 個商品，總額 $${total} 嗎？`
      );

      if (confirmed) {
        // 傳遞包含數量信息的選擇數據
        const selectionWithQuantities = {
          items: selectedItems,
          quantities: selectedQuantities,
        };
        onCheckout(paymentMethod, selectionWithQuantities);
        setShowPaymentModal(false);
        setSelectedItems({});
        setSelectedQuantities({});
      }
    } else {
      // 全部結帳邏輯保持不變
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
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 shadow-2xl max-h-[80vh] overflow-y-auto">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                選擇要結帳的餐點數量
              </h3>
              <div className="text-sm text-gray-600">
                勾選商品並選擇要結帳的數量
              </div>
            </div>

            <div className="space-y-4 mb-6">
              {getCheckoutableItems().map((item) => {
                const isSelected = selectedItems[item.key] || false;
                const selectedQty = selectedQuantities[item.key] || 0;
                const unitPrice = getItemSubtotal({ ...item, quantity: 1 });
                const subtotal = unitPrice * selectedQty;

                return (
                  <div
                    key={item.key}
                    className={`border-2 rounded-lg p-4 transition-all ${
                      isSelected && selectedQty > 0
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    {/* 商品信息行 */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3 flex-1">
                        {/* 選擇框 */}
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              const newSelection = {
                                ...selectedItems,
                                [item.key]: e.target.checked,
                              };
                              setSelectedItems(newSelection);

                              // 勾選時自動設為1，取消勾選時設為0
                              if (e.target.checked) {
                                setSelectedQuantities({
                                  ...selectedQuantities,
                                  [item.key]: 1, // 勾選時預設為1
                                });
                              } else {
                                setSelectedQuantities({
                                  ...selectedQuantities,
                                  [item.key]: 0, // 取消勾選時設為0
                                });
                              }
                            }}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                          />
                        </label>

                        {/* 商品詳情 */}
                        <div className="flex-1">
                          <div className="font-medium text-lg">{item.name}</div>
                          <div className="text-sm text-gray-600">
                            單價：${item.price} | 總數量：{item.quantity} 個
                          </div>
                          {item.selectedCustom &&
                            Object.entries(item.selectedCustom).map(
                              ([type, value]) => (
                                <div
                                  key={type}
                                  className="text-xs text-gray-500 mt-1"
                                >
                                  {type}: {value}
                                </div>
                              )
                            )}
                        </div>

                        {/* 調整後單價 */}
                        <div className="text-right">
                          <div className="text-sm text-gray-500">
                            調整後單價
                          </div>
                          <div className="font-bold text-green-600">
                            ${unitPrice}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 數量選擇區 */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <label className="text-sm font-medium text-gray-700">
                          選擇數量：
                        </label>
                        <select
                          value={selectedQty > 0 ? selectedQty : 1} // 選中時最少顯示1
                          onChange={(e) => {
                            const newQty = parseInt(e.target.value) || 1;
                            setSelectedQuantities({
                              ...selectedQuantities,
                              [item.key]: newQty,
                            });
                          }}
                          disabled={!isSelected}
                          className={`border rounded-lg px-3 py-2 text-sm min-w-[80px] ${
                            isSelected
                              ? "border-blue-300 bg-white"
                              : "border-gray-300 bg-gray-100"
                          }`}
                        >
                          {/* 移除0選項，從1開始 */}
                          {Array.from(
                            { length: item.quantity },
                            (_, i) => i + 1
                          ).map((num) => (
                            <option key={num} value={num}>
                              {num}
                            </option>
                          ))}
                        </select>
                        <span className="text-sm text-gray-500">
                          / {item.quantity}
                        </span>
                      </div>

                      {/* 小計顯示 */}
                      <div className="text-right">
                        {isSelected && (
                          <div className="text-sm text-gray-600">
                            {selectedQty > 0 ? selectedQty : 1} × ${unitPrice} =
                            <span className="font-bold text-blue-600 ml-1">
                              ${unitPrice * (selectedQty > 0 ? selectedQty : 1)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 快速選擇按鈕 */}
                    {item.quantity > 1 && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500">
                            快速選擇：
                          </span>
                          {[
                            { label: "全部", value: item.quantity },
                            {
                              label: "一半",
                              value: Math.ceil(item.quantity / 2),
                            },
                            { label: "清空", value: 0 },
                          ].map((option) => (
                            <button
                              key={option.label}
                              onClick={() => {
                                setSelectedQuantities({
                                  ...selectedQuantities,
                                  [item.key]: option.value,
                                });
                                setSelectedItems({
                                  ...selectedItems,
                                  [item.key]: option.value > 0,
                                });
                              }}
                              className="px-2 py-1 text-xs rounded border border-gray-300 hover:bg-gray-50 transition-colors"
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 總計區域 */}
            <div className="border-t pt-4 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold">選中商品總計:</span>
                <span className="text-2xl font-bold text-blue-600">
                  ${calculatePartialTotal()}
                </span>
              </div>
              <div className="text-sm text-gray-500 mt-1">
                已選中{" "}
                {Object.entries(selectedItems)
                  .filter(
                    ([key, isSelected]) =>
                      isSelected && (selectedQuantities[key] || 0) > 0
                  )
                  .reduce(
                    (sum, [key]) => sum + (selectedQuantities[key] || 0),
                    0
                  )}{" "}
                個商品
              </div>

              {/* 詳細清單 */}
              {Object.entries(selectedItems).some(
                ([key, isSelected]) =>
                  isSelected && (selectedQuantities[key] || 0) > 0
              ) && (
                <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                  <div className="text-sm font-medium text-blue-800 mb-2">
                    結帳清單：
                  </div>
                  <div className="space-y-1">
                    {Object.entries(selectedItems)
                      .filter(
                        ([key, isSelected]) =>
                          isSelected && (selectedQuantities[key] || 0) > 0
                      )
                      .map(([key, isSelected]) => {
                        const item = getCheckoutableItems().find(
                          (i) => i.key === key
                        );
                        const qty = selectedQuantities[key] || 1; // 預設為1
                        const unitPrice = getItemSubtotal({
                          ...item,
                          quantity: 1,
                        });
                        return (
                          <div
                            key={key}
                            className="text-sm text-blue-700 flex justify-between"
                          >
                            <span>
                              {item?.name} × {qty}
                            </span>
                            <span>${unitPrice * qty}</span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>

            {/* 操作按鈕 */}
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowPartialCheckoutModal(false);
                  setSelectedItems({});
                  setSelectedQuantities({});
                }}
                className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleConfirmPartialSelection}
                disabled={!Object.values(selectedItems).some(Boolean)}
                className="flex-1 py-3 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
