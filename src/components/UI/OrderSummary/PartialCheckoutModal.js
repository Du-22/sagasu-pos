import React from "react";
import { calculateItemPrice } from "../../../utils/priceCalculations";

/**
 * 部分結帳選擇 Modal
 *
 * 原始程式碼：從 OrderSummary.js 抽取的部分結帳 Modal JSX
 * 功能效果：顯示可結帳商品清單，支援數量選擇和快速操作
 * 用途：供 NewOrderSummary 使用的純 UI 組件
 * 組件長度：約150行，純 JSX 渲染無狀態
 */
const PartialCheckoutModal = ({
  isOpen,
  checkoutableItems,
  selectedItems,
  selectedQuantities,
  onItemSelect,
  onQuantityChange,
  onQuickSelect,
  onConfirm,
  onClose,
}) => {
  if (!isOpen) return null;

  // 計算選中商品總價
  const calculatePartialTotal = () => {
    return Object.entries(selectedItems).reduce((total, [key, isSelected]) => {
      if (!isSelected) return total;
      const selectedQty = selectedQuantities[key] || 1;
      const item = checkoutableItems.find((item) => item.key === key);
      return item
        ? total +
            calculateItemPrice({ ...item, quantity: selectedQty }).subtotal
        : total;
    }, 0);
  };

  const partialTotal = calculatePartialTotal();

  // 計算選中商品數量
  const selectedCount = Object.entries(selectedItems)
    .filter(
      ([key, isSelected]) => isSelected && (selectedQuantities[key] || 0) > 0
    )
    .reduce((sum, [key]) => sum + (selectedQuantities[key] || 0), 0);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-ivory rounded-xl p-6 max-w-2xl w-full mx-4 shadow-2xl max-h-[80vh] overflow-y-auto">
        <div className="mb-6">
          <h3 className="text-xl font-bold text-warm-dark mb-2">
            選擇要結帳的餐點數量
          </h3>
          <div className="text-sm text-warm-olive">
            勾選商品並選擇要結帳的數量
          </div>
        </div>

        <div className="space-y-4 mb-6">
          {checkoutableItems.map((item) => {
            const isSelected = selectedItems[item.key] || false;
            const selectedQty = selectedQuantities[item.key] || 0;
            const unitPrice = calculateItemPrice({
              ...item,
              quantity: 1,
            }).subtotal;

            return (
              <div
                key={item.key}
                className={`border-2 rounded-lg p-4 transition-all ${
                  isSelected && selectedQty > 0
                    ? "border-terracotta bg-parchment"
                    : "border-warm-cream hover:border-warm-sand"
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
                        onChange={(e) =>
                          onItemSelect(item.key, e.target.checked)
                        }
                        className="w-4 h-4 text-terracotta rounded focus:ring-terracotta"
                      />
                    </label>

                    {/* 商品詳情 */}
                    <div className="flex-1">
                      <div className="font-medium text-lg">{item.name}</div>
                      <div className="text-sm text-warm-olive">
                        單價：${item.price} | 總數量：{item.quantity} 個
                      </div>
                      {item.selectedCustom &&
                        Object.entries(item.selectedCustom).map(
                          ([type, value]) => (
                            <div
                              key={type}
                              className="text-xs text-warm-stone mt-1"
                            >
                              {type}: {value}
                            </div>
                          )
                        )}
                    </div>

                    {/* 調整後單價 */}
                    <div className="text-right">
                      <div className="text-sm text-warm-stone">調整後單價</div>
                      <div className="font-bold text-terracotta-dark">
                        ${unitPrice}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 數量選擇區 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <label className="text-sm font-medium text-warm-charcoal">
                      選擇數量：
                    </label>
                    <select
                      value={selectedQty > 0 ? selectedQty : 1}
                      onChange={(e) =>
                        onQuantityChange(
                          item.key,
                          parseInt(e.target.value) || 1
                        )
                      }
                      disabled={!isSelected}
                      className={`border rounded-lg px-3 py-2 text-sm min-w-[80px] ${
                        isSelected
                          ? "border-terracotta-light bg-ivory"
                          : "border-warm-sand bg-parchment"
                      }`}
                    >
                      {Array.from(
                        { length: item.quantity },
                        (_, i) => i + 1
                      ).map((num) => (
                        <option key={num} value={num}>
                          {num}
                        </option>
                      ))}
                    </select>
                    <span className="text-sm text-warm-stone">
                      / {item.quantity}
                    </span>
                  </div>

                  {/* 小計顯示 */}
                  <div className="text-right">
                    {isSelected && (
                      <div className="text-sm text-warm-olive">
                        {selectedQty > 0 ? selectedQty : 1} × ${unitPrice} =
                        <span className="font-bold text-terracotta ml-1">
                          ${unitPrice * (selectedQty > 0 ? selectedQty : 1)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 快速選擇按鈕 */}
                {item.quantity > 1 && (
                  <div className="mt-3 pt-3 border-t border-warm-cream">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-warm-stone">快速選擇：</span>
                      {[
                        { label: "全部", value: item.quantity },
                        { label: "一半", value: Math.ceil(item.quantity / 2) },
                        { label: "清空", value: 0 },
                      ].map((option) => (
                        <button
                          key={option.label}
                          onClick={() => onQuickSelect(item.key, option.value)}
                          className="px-2 py-1 text-xs rounded border border-warm-sand hover:bg-parchment transition-colors"
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
            <span className="text-2xl font-bold text-terracotta">
              ${partialTotal}
            </span>
          </div>
          <div className="text-sm text-warm-stone mt-1">
            已選中 {selectedCount} 個商品
          </div>

          {/* 詳細清單 */}
          {selectedCount > 0 && (
            <div className="mt-3 p-3 bg-parchment rounded-lg">
              <div className="text-sm font-medium text-terracotta-dark mb-2">
                結帳清單：
              </div>
              <div className="space-y-1">
                {Object.entries(selectedItems)
                  .filter(
                    ([key, isSelected]) =>
                      isSelected && (selectedQuantities[key] || 0) > 0
                  )
                  .map(([key]) => {
                    const item = checkoutableItems.find((i) => i.key === key);
                    const qty = selectedQuantities[key] || 1;
                    const unitPrice = calculateItemPrice({
                      ...item,
                      quantity: 1,
                    }).subtotal;
                    return (
                      <div
                        key={key}
                        className="text-sm text-terracotta-dark flex justify-between"
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
            onClick={onClose}
            className="flex-1 py-3 px-4 border border-warm-sand text-warm-charcoal rounded-lg hover:bg-parchment font-medium transition-colors"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            disabled={!Object.values(selectedItems).some(Boolean)}
            className="flex-1 py-3 px-4 bg-terracotta text-ivory rounded-lg hover:bg-terracotta-dark font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            確認選擇
          </button>
        </div>
      </div>
    </div>
  );
};

export default PartialCheckoutModal;
