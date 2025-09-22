import React from "react";
import { formatPriceAdjustment } from "../../utils/priceCalculations";

/**
 * 訂單項目顯示組件
 *
 * 功能效果：負責訂單項目的視覺呈現，包含商品名稱、價格調整、客製選項
 * 用途：純顯示邏輯，不包含任何操作功能
 * 組件長度：約80行，專注於UI展示
 */
const OrderItemDisplay = ({ item, priceInfo }) => {
  const { unitPrice, adjustment, details } = priceInfo;
  const originalPrice = item.price || 0;
  const hasAdjustment = adjustment !== 0;

  // 渲染價格信息
  const renderPriceInfo = () => {
    if (!hasAdjustment) {
      return <div className="text-xs text-gray-600">${originalPrice}</div>;
    }

    return (
      <div className="text-xs text-gray-600">
        <div className="flex items-center space-x-2">
          <span className="line-through text-gray-400">${originalPrice}</span>
          <span
            className={`font-medium ${
              unitPrice > originalPrice ? "text-red-600" : "text-green-600"
            }`}
          >
            ${unitPrice}
          </span>
          <span className="text-xs text-blue-600">
            ({adjustment > 0 ? "+" : ""}${adjustment})
          </span>
        </div>
      </div>
    );
  };

  // 渲染客製選項
  const renderCustomOptions = () => {
    if (!item.selectedCustom || Object.keys(item.selectedCustom).length === 0) {
      return null;
    }

    return (
      <div className="mt-1 space-y-1">
        {Object.entries(item.selectedCustom).map(([type, value]) => {
          if (!value) return null;

          // 尋找對應的價格調整信息
          const adjustmentDetail = details.find(
            (d) => d.type === type && d.value === value
          );
          let adjustmentText = "";

          if (adjustmentDetail) {
            const adj = adjustmentDetail.adjustment;
            if (adj > 0) {
              adjustmentText = ` (+$${adj})`;
            } else if (adj < 0) {
              adjustmentText = ` (-$${Math.abs(adj)})`;
            }
          }

          return (
            <div
              key={type}
              className="text-xs text-gray-500 flex items-center justify-between"
            >
              <span>
                {type}: {value}
              </span>
              {adjustmentText && (
                <span
                  className={`font-medium ml-2 ${
                    adjustmentDetail.adjustment > 0
                      ? "text-red-600"
                      : "text-green-600"
                  }`}
                >
                  {adjustmentText}
                </span>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // 計算總價
  const subtotal = unitPrice * item.quantity;

  return (
    <div className="flex-1">
      {/* 商品名稱 */}
      <div className="font-medium text-sm flex items-center">
        {item.name}
        {/* 編輯狀態指示器 */}
        {item.isEditing && (
          <span className="ml-2 px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
            編輯中
          </span>
        )}
      </div>

      {/* 價格顯示 */}
      {renderPriceInfo()}

      {/* 客製選項顯示 */}
      {renderCustomOptions()}

      {/* 小計顯示（當數量大於1時） */}
      {item.quantity > 1 && (
        <div className="text-xs text-blue-600 mt-1">
          小計: ${unitPrice} × {item.quantity} = ${subtotal}
        </div>
      )}
    </div>
  );
};

export default OrderItemDisplay;
