import React from "react";

/**
 * 價格預覽顯示組件
 *
 * 功能效果：統一的價格預覽UI，顯示基礎價格、調整後價格和調整說明
 * 用途：用於客製選項選擇時的即時價格反饋
 * 組件長度：約50行，純UI顯示邏輯
 */
const PricePreview = ({
  basePrice,
  currentPrice,
  adjustment,
  hasAdjustment,
}) => {
  return (
    <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-4">
      <div className="flex justify-between items-center">
        <span className="font-medium text-gray-700">預覽價格：</span>
        <div className="flex items-center space-x-2">
          {hasAdjustment && (
            <span className="text-sm text-gray-500 line-through">
              ${basePrice}
            </span>
          )}
          <span
            className={`font-bold text-lg ${
              hasAdjustment
                ? adjustment > 0
                  ? "text-red-600"
                  : "text-green-600"
                : "text-gray-800"
            }`}
          >
            ${currentPrice}
          </span>
        </div>
      </div>

      {hasAdjustment && (
        <div className="mt-2 text-xs">
          <div
            className={`font-medium ${
              adjustment > 0 ? "text-red-600" : "text-green-600"
            }`}
          >
            價格調整：{adjustment > 0 ? "+" : ""}${adjustment}
          </div>
          <div className="text-gray-500 mt-1">
            基本價格 ${basePrice} {adjustment > 0 ? "+" : ""} 調整 $
            {Math.abs(adjustment)} = ${currentPrice}
          </div>
        </div>
      )}
    </div>
  );
};

export default PricePreview;
