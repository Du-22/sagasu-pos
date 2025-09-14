import React from "react";
import { Trash2 } from "lucide-react";

const OrderItem = ({ item, onUpdateQuantity, onRemove }) => {
  // 計算價格調整
  const calculatePriceAdjustments = (item) => {
    const adjustments = [];
    let totalAdjustment = 0;

    if (item.selectedCustom) {
      // 續杯折扣 -20 元
      if (item.selectedCustom["續杯"] === "是") {
        adjustments.push({ type: "續杯折扣", amount: -20 });
        totalAdjustment -= 20;
      }

      // 加濃縮 +20 元
      if (item.selectedCustom["濃縮"] === "加濃縮") {
        adjustments.push({ type: "加濃縮", amount: 20 });
        totalAdjustment += 20;
      }

      // 換燕麥奶 +20 元
      if (item.selectedCustom["奶"] === "換燕麥奶") {
        adjustments.push({ type: "換燕麥奶", amount: 20 });
        totalAdjustment += 20;
      }
    }

    const finalPrice = Math.max(item.price + totalAdjustment, 0);
    return { adjustments, totalAdjustment, finalPrice };
  };

  const { adjustments, totalAdjustment, finalPrice } =
    calculatePriceAdjustments(item);
  const itemSubtotal = finalPrice * item.quantity;

  return (
    <div className="py-3 border-b">
      {/* 商品基本資訊 */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex-1">
          <div className="font-medium text-sm">{item.name}</div>
          <div className="text-xs text-gray-600">基本價格 ${item.price}</div>
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

      {/* 客製選項和價格調整 */}
      {item.selectedCustom && Object.keys(item.selectedCustom).length > 0 && (
        <div className="ml-4 mb-2">
          {Object.entries(item.selectedCustom).map(([type, value]) => {
            // 找到對應的價格調整
            const adjustment = adjustments.find(
              (adj) =>
                (type === "續杯" && adj.type === "續杯折扣") ||
                (type === "濃縮" && adj.type === "加濃縮") ||
                (type === "奶" && adj.type === "換燕麥奶")
            );

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
                      adjustment.amount > 0 ? "text-red-600" : "text-green-600"
                    }`}
                  >
                    {adjustment.amount > 0 ? "+" : ""}${adjustment.amount}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 價格小計 */}
      <div className="ml-4 mt-2 pt-2 border-t border-gray-100">
        <div className="flex justify-between items-center">
          <div className="text-sm">
            {totalAdjustment !== 0 ? (
              <span>
                ${item.price}
                <span
                  className={`mx-1 ${
                    totalAdjustment > 0 ? "text-red-600" : "text-green-600"
                  }`}
                >
                  {totalAdjustment > 0 ? "+" : ""}${totalAdjustment}
                </span>
                = ${finalPrice} × {item.quantity}
              </span>
            ) : (
              <span>
                ${item.price} × {item.quantity}
              </span>
            )}
          </div>
          <div className="font-bold text-blue-600">小計: ${itemSubtotal}</div>
        </div>
      </div>
    </div>
  );
};

export default OrderItem;
