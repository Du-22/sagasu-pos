import React, { useState } from "react";

const MenuItemButton = ({ item, onAddToOrder }) => {
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [selectedCustom, setSelectedCustom] = useState({});
  const [previewPrice, setPreviewPrice] = useState(item.price);

  // 計算預覽價格
  const calculatePreviewPrice = (customSelections) => {
    let basePrice = item.price || 0;
    let totalAdjustment = 0;

    if (item.customOptions) {
      Object.entries(customSelections).forEach(
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
            const adjustment = customOption.priceAdjustments[selectedValue];
            totalAdjustment += adjustment;
          }
        }
      );
    }

    return Math.max(basePrice + totalAdjustment, 0);
  };

  // 當客製選項變更時更新預覽價格
  const handleCustomChange = (optionType, value) => {
    const newSelections = {
      ...selectedCustom,
      [optionType]: value,
    };
    setSelectedCustom(newSelections);
    setPreviewPrice(calculatePreviewPrice(newSelections));
  };

  // 點擊按鈕時
  const handleClick = () => {
    if (item.customOptions && item.customOptions.length > 0) {
      setShowCustomModal(true);
      setPreviewPrice(item.price); // 重置預覽價格
      setSelectedCustom({}); // 重置選項
    } else {
      onAddToOrder({
        ...item,
        customOptions: item.customOptions, // 確保包含客製選項設定
      });
    }
  };

  // 確認客製選項
  const handleConfirmCustom = () => {
    onAddToOrder({
      ...item,
      selectedCustom,
      customOptions: item.customOptions, // 重要：確保包含客製選項設定
    });
    setShowCustomModal(false);
    setSelectedCustom({});
    setPreviewPrice(item.price);
  };

  // 取得選項的價格調整顯示文字
  const getPriceAdjustmentText = (option, optionValue) => {
    if (!option.priceAdjustments || !option.priceAdjustments[optionValue]) {
      return "";
    }

    const adjustment = option.priceAdjustments[optionValue];
    if (adjustment > 0) {
      return ` (+$${adjustment})`;
    } else if (adjustment < 0) {
      return ` (-$${Math.abs(adjustment)})`;
    }
    return "";
  };

  return (
    <>
      <button
        onClick={handleClick}
        className="p-6 border-2 border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors min-h-[80px]"
      >
        <div className="text-sm font-medium">{item.name}</div>
        <div className="text-sm text-gray-600 mt-1">${item.price}</div>
        {/* 顯示是否有價格調整選項 */}
        {item.customOptions &&
          item.customOptions.some(
            (opt) =>
              opt.priceAdjustments &&
              Object.keys(opt.priceAdjustments).length > 0
          ) && <div className="text-xs text-green-600 mt-1">💰 可調價</div>}
      </button>

      {/* 客製選項 Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 shadow-lg min-w-[400px] max-w-[500px] max-h-[80vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-4">客製選項</h2>

            {/* 顯示當前價格預覽 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <div className="flex justify-between items-center">
                <span className="font-medium">預覽價格：</span>
                <div className="flex items-center space-x-2">
                  {previewPrice !== item.price && (
                    <span className="text-sm text-gray-500 line-through">
                      ${item.price}
                    </span>
                  )}
                  <span
                    className={`font-bold text-lg ${
                      previewPrice !== item.price ? "text-blue-600" : ""
                    }`}
                  >
                    ${previewPrice}
                  </span>
                </div>
              </div>
              {previewPrice !== item.price && (
                <div className="text-xs text-blue-600 mt-1">
                  價格調整：{previewPrice > item.price ? "+" : ""}$
                  {previewPrice - item.price}
                </div>
              )}
            </div>

            {/* 客製選項列表 */}
            {item.customOptions.map((opt) => (
              <div key={opt.type} className="mb-4">
                <label className="font-medium mr-2 block mb-2">
                  {opt.type}：
                </label>
                <select
                  value={selectedCustom[opt.type] || ""}
                  onChange={(e) => handleCustomChange(opt.type, e.target.value)}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="">請選擇</option>
                  {(opt.options || []).map((optionValue) => (
                    <option key={optionValue} value={optionValue}>
                      {optionValue}
                      {getPriceAdjustmentText(opt, optionValue)}
                    </option>
                  ))}
                </select>
              </div>
            ))}

            <div className="flex space-x-2 mt-6">
              <button
                onClick={handleConfirmCustom}
                className="flex-1 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
              >
                確定加入 ${previewPrice}
              </button>
              <button
                onClick={() => {
                  setShowCustomModal(false);
                  setSelectedCustom({});
                  setPreviewPrice(item.price);
                }}
                className="flex-1 bg-gray-300 px-4 py-2 rounded hover:bg-gray-400 transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MenuItemButton;
