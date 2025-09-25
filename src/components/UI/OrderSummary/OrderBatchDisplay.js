import React from "react";
import { Edit3 } from "lucide-react";
import {
  calculateItemPrice,
  calculateItemsTotal,
} from "../../../utils/priceCalculations";
import { formatTimestamp } from "../../../utils/orderDataProcessors";

/**
 * 訂單批次顯示組件
 *
 * 原始程式碼：從 OrderSummary.js 抽取的訂單顯示 JSX
 * 功能效果：顯示已確認的訂單批次，包含時間、價格調整、編輯功能
 * 用途：供 NewOrderSummary 使用的純 UI 組件
 * 組件長度：約80行，純 JSX 渲染無狀態
 */
const OrderBatchDisplay = ({ processedBatches, onEditConfirmedItem }) => {
  if (processedBatches.length === 0) {
    return <div className="text-yellow-600 text-sm mb-4">尚未點餐</div>;
  }

  return (
    <div className="mb-4">
      <div className="text-sm text-green-600 mb-2">
        有 {processedBatches.length} 次點餐紀錄
      </div>

      {processedBatches.map((batch, batchIndex) => {
        const batchTime = batch.length > 0 ? batch[0].timestamp : null;
        const batchTotal = calculateItemsTotal(batch).total;

        return (
          <div key={`batch-${batchIndex}-${batchTime}`} className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">
                {batchIndex === 0 ? "首次點餐" : `第${batchIndex + 1}次追加`}
                {batchTime && (
                  <span className="ml-2 text-xs text-gray-500">
                    ({formatTimestamp(batchTime)})
                  </span>
                )}
              </h3>
              <span className="text-sm text-gray-500">${batchTotal}</span>
            </div>

            <div className="bg-gray-50 p-3 rounded-lg space-y-1">
              {batch.map((item, itemIndex) => (
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
                    Object.entries(item.selectedCustom).length > 0 && (
                      <div className="ml-4 mb-2">
                        {Object.entries(item.selectedCustom).map(
                          ([type, value]) => {
                            // 計算價格調整
                            let adjustment = null;
                            if (type === "續杯" && value === "是") {
                              adjustment = { type: "續杯折扣", amount: -20 };
                            } else if (type === "濃縮" && value === "加濃縮") {
                              adjustment = { type: "加濃縮", amount: 20 };
                            } else if (type === "奶" && value === "換燕麥奶") {
                              adjustment = { type: "換燕麥奶", amount: 20 };
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
                                    {adjustment.amount > 0 ? "+" : ""}$
                                    {adjustment.amount}
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
                          const subtotal = calculateItemPrice(item).subtotal;
                          const finalUnitPrice = subtotal / item.quantity;
                          const adjustment = finalUnitPrice - item.price;

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
                                  {adjustment > 0 ? "+" : ""}${adjustment}
                                </span>
                                = ${finalUnitPrice} × {item.quantity}
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
                        小計: ${calculateItemPrice(item).subtotal}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default OrderBatchDisplay;
