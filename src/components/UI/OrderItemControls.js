import React from "react";

/**
 * 訂單項目控制組件
 *
 * 功能效果：提供數量調整和刪除功能的操作介面
 * 用途：純操作邏輯，不包含任何顯示內容
 * 組件長度：約50行，專注於用戶操作
 */
const OrderItemControls = ({ item, onUpdateQuantity, onRemove }) => {
  return (
    <div className="flex items-center space-x-2">
      {/* 減少數量按鈕 */}
      <button
        onClick={() => onUpdateQuantity(item.uniqueId, item.quantity - 1)}
        className="w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-sm font-bold transition-colors"
        title="減少數量"
      >
        -
      </button>

      {/* 數量顯示 */}
      <span className="w-8 text-center text-sm font-medium">
        {item.quantity}
      </span>

      {/* 增加數量按鈕 */}
      <button
        onClick={() => onUpdateQuantity(item.uniqueId, item.quantity + 1)}
        className="w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-sm font-bold transition-colors"
        title="增加數量"
      >
        +
      </button>

      {/* 刪除按鈕 */}
      <button
        onClick={() => onRemove(item.uniqueId || item.id)}
        className={`w-6 h-6 rounded-full flex items-center justify-center text-sm transition-colors ${
          item.isEditing
            ? "bg-red-200 hover:bg-red-300 text-red-600"
            : "bg-red-200 hover:bg-red-300 text-red-500"
        }`}
        title={item.isEditing ? "刪除此餐點" : "移除"}
      >
        🗑️
      </button>
    </div>
  );
};

export default OrderItemControls;
