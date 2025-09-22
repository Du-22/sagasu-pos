import React from "react";
import { calculateItemPrice } from "../../utils/priceCalculations";
import OrderItemDisplay from "./OrderItemDisplay";
import OrderItemControls from "./OrderItemControls";

/**
 * 訂單項目組件（主組件）
 *
 * 原始程式碼：基於 OrderItem.js，拆分為顯示和控制兩部分
 * 功能效果：整合顯示邏輯和操作邏輯，提供統一的訂單項目介面
 * 用途：購物車、訂單摘要等顯示訂單項目的地方
 * 組件長度：約40行，專注於邏輯整合
 */
const OrderItem = ({ item, onUpdateQuantity, onRemove }) => {
  // 使用統一價格計算
  const priceInfo = calculateItemPrice(item);

  return (
    <div className="flex items-center justify-between py-2 border-b">
      {/* 顯示區域 */}
      <OrderItemDisplay item={item} priceInfo={priceInfo} />

      {/* 控制區域 */}
      <OrderItemControls
        item={item}
        onUpdateQuantity={onUpdateQuantity}
        onRemove={onRemove}
      />
    </div>
  );
};

export default OrderItem;
