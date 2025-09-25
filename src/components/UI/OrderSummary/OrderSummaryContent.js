import React from "react";
import OrderItem from "../OrderItem";
import OrderBatchDisplay from "./OrderBatchDisplay";

/**
 * 訂單摘要內容組件
 *
 * 原始程式碼：從 OrderSummary.js 抽取的主要顯示區域 JSX
 * 功能效果：顯示訂單摘要主要內容，包含標題、訂單批次、總計、操作按鈕
 * 用途：供 NewOrderSummary 使用的純 UI 組件，組合其他UI組件
 * 組件長度：約80行，純 JSX 渲染無狀態
 */
const OrderSummaryContent = ({
  processedBatches,
  currentOrder,
  currentTotal,
  confirmedTotal,
  grandTotal,
  tableStatus,
  selectedTable,
  onEditConfirmedItem,
  onUpdateQuantity,
  onRemoveItem,
  onSubmitOrder,
  onCheckoutClick,
}) => {
  return (
    <div className="p-4 max-h-[600px]">
      <div className="bg-white rounded-lg shadow-sm h-full flex flex-col">
        {/* 標題 */}
        <div className="p-4 border-b">
          <h2 className="text-lg font-bold">小計</h2>
        </div>

        {/* 訂單內容 */}
        <div className="flex-1 p-4 overflow-y-auto">
          {/* 已確認的訂單區域 */}
          <OrderBatchDisplay
            processedBatches={processedBatches}
            onEditConfirmedItem={onEditConfirmedItem}
          />

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
                <span>${confirmedTotal}</span>
              </div>
              {currentOrder.length > 0 && (
                <div className="flex justify-between">
                  <span>新增:</span>
                  <span>${currentTotal}</span>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-between items-center mb-4 pt-2 border-t">
            <span className="text-lg font-bold">總計:</span>
            <span className="text-xl font-bold text-blue-600">
              ${grandTotal}
            </span>
          </div>

          <div className="space-y-2">
            {(tableStatus === "occupied" || selectedTable.startsWith("T")) &&
              !currentOrder.some((item) => item.isEditing) && (
                <button
                  onClick={onCheckoutClick}
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
  );
};

export default OrderSummaryContent;
