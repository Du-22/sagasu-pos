import React, { useState, useMemo } from "react";
import { calculateItemPrice } from "../../utils/priceCalculations";
import PricePreview from "./PricePreview";

/**
 * 客製選項彈窗組件
 *
 * 功能效果：處理客製選項的選擇和價格預覽
 * 用途：讓用戶在點餐時配置各種客製選項
 * 組件長度：約100行，專注於表單邏輯和狀態管理
 */
const CustomOptionsModal = ({ item, onConfirm, onCancel }) => {
  const [selectedCustom, setSelectedCustom] = useState({});

  // 使用 useMemo 優化價格預覽性能
  const pricePreview = useMemo(() => {
    if (Object.keys(selectedCustom).length === 0) {
      return {
        unitPrice: item.price || 0,
        adjustment: 0,
        hasAdjustment: false,
        details: [],
      };
    }

    const tempItem = {
      ...item,
      selectedCustom: selectedCustom,
      quantity: 1,
    };

    const priceInfo = calculateItemPrice(tempItem);
    return {
      unitPrice: priceInfo.unitPrice,
      adjustment: priceInfo.adjustment,
      hasAdjustment: priceInfo.adjustment !== 0,
      details: priceInfo.details,
    };
  }, [item, selectedCustom]);

  // 處理客製選項變更
  const handleCustomChange = (optionType, value) => {
    setSelectedCustom((prev) => ({
      ...prev,
      [optionType]: value || undefined,
    }));
  };

  // 確認客製選項
  const handleConfirm = () => {
    const cleanedCustom = Object.fromEntries(
      Object.entries(selectedCustom).filter(([_, value]) => value)
    );
    onConfirm(cleanedCustom);
  };

  // 取得價格調整顯示文字
  const getPriceAdjustmentText = (option, optionValue) => {
    if (!option?.priceAdjustments?.[optionValue]) return "";

    const adjustment = option.priceAdjustments[optionValue];
    return adjustment > 0
      ? ` (+$${adjustment})`
      : ` (-$${Math.abs(adjustment)})`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 shadow-2xl min-w-[400px] max-w-[500px] max-h-[80vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4 text-gray-800">客製選項</h2>

        {/* 價格預覽 */}
        <PricePreview
          basePrice={item.price || 0}
          currentPrice={pricePreview.unitPrice}
          adjustment={pricePreview.adjustment}
          hasAdjustment={pricePreview.hasAdjustment}
        />

        {/* 客製選項表單 */}
        <div className="space-y-4 mb-6">
          {item.customOptions?.map((opt) => (
            <div key={opt.type} className="mb-4">
              <label className="font-medium mr-2 block mb-2 text-gray-700">
                {opt.type}：
              </label>

              <select
                value={selectedCustom[opt.type] || ""}
                onChange={(e) => handleCustomChange(opt.type, e.target.value)}
                className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none transition-colors"
              >
                <option value="">請選擇</option>
                {(opt.options || []).map((optionValue) => (
                  <option key={optionValue} value={optionValue}>
                    {optionValue}
                    {getPriceAdjustmentText(opt, optionValue)}
                  </option>
                ))}
              </select>

              {/* 顯示當前選項的價格影響 */}
              {selectedCustom[opt.type] && (
                <div className="mt-1 text-xs text-gray-600">
                  {(() => {
                    const adjustment =
                      opt.priceAdjustments?.[selectedCustom[opt.type]];
                    if (!adjustment) return null;

                    const sign = adjustment > 0 ? "+" : "";
                    const color =
                      adjustment > 0 ? "text-red-600" : "text-green-600";

                    return (
                      <span className={`font-medium ${color}`}>
                        價格調整: {sign}${adjustment}
                      </span>
                    );
                  })()}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 操作按鈕 */}
        <div className="flex space-x-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 px-4 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 py-3 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium transition-colors shadow-md"
          >
            確定加入 ${pricePreview.unitPrice}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomOptionsModal;
