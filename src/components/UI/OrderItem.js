import React from "react";

const OrderItem = ({ item, onUpdateQuantity, onRemove }) => {
  // 計算調整後的單價
  const calculateAdjustedPrice = (item) => {
    let basePrice = item.price || 0;
    let totalAdjustment = 0;

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
            totalAdjustment += customOption.priceAdjustments[selectedValue];
          }
        }
      );
    }

    // 向下相容舊的續杯邏輯
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

    return Math.max(basePrice + totalAdjustment, 0);
  };

  const adjustedPrice = calculateAdjustedPrice(item);
  const originalPrice = item.price;
  const hasAdjustment = adjustedPrice !== originalPrice;

  return (
    <div className="flex items-center justify-between py-2 border-b">
      <div className="flex-1">
        <div className="font-medium text-sm">{item.name}</div>

        {/* 價格顯示 */}
        <div className="text-xs text-gray-600">
          {hasAdjustment ? (
            <div className="flex items-center space-x-2">
              <span className="line-through text-gray-400">
                ${originalPrice}
              </span>
              <span className="font-medium text-green-600">
                ${adjustedPrice}
              </span>
              <span className="text-xs text-blue-600">
                ({adjustedPrice > originalPrice ? "+" : ""}$
                {adjustedPrice - originalPrice})
              </span>
            </div>
          ) : (
            <span>${originalPrice}</span>
          )}
        </div>

        {/* 客製選項顯示 */}
        {item.selectedCustom &&
          Object.entries(item.selectedCustom).map(([type, value]) => {
            // 查找價格調整信息
            let adjustmentInfo = "";
            if (item.customOptions) {
              const option = item.customOptions.find(
                (opt) => opt.type === type
              );
              if (
                option &&
                option.priceAdjustments &&
                option.priceAdjustments[value]
              ) {
                const adj = option.priceAdjustments[value];
                adjustmentInfo =
                  adj > 0
                    ? ` (+$${adj})`
                    : adj < 0
                    ? ` (-$${Math.abs(adj)})`
                    : "";
              }
            }

            return (
              <div key={type} className="text-xs text-gray-500">
                {type}: {value}
                {adjustmentInfo}
              </div>
            );
          })}
      </div>

      <div className="flex items-center space-x-2">
        <button
          onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
          className="w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-sm"
        >
          -
        </button>
        <span className="w-8 text-center text-sm">{item.quantity}</span>
        <button
          onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
          className="w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-sm"
        >
          +
        </button>
        <button
          onClick={() => onRemove(item.id)}
          className={`w-6 h-6 rounded-full flex items-center justify-center text-sm ${
            item.isEditing
              ? "bg-red-200 hover:bg-red-300 text-red-600"
              : "bg-red-200 hover:bg-red-300"
          }`}
          title={item.isEditing ? "刪除此餐點" : "移除"}
        >
          🗑️
        </button>
      </div>
    </div>
  );
};

export default OrderItem;
