import React, { useState, useMemo } from "react";
import { calculateItemPrice } from "../../utils/priceCalculations";
import CustomOptionsModal from "./CustomOptionsModal";

/**
 * 菜單項目按鈕組件
 *
 * 原始程式碼：基於 MenuItemButton.js，簡化為純按鈕邏輯
 * 功能效果：顯示菜單項目，處理點擊事件和基本資訊顯示
 * 用途：點餐介面的菜單項目按鈕
 * 組件長度：約60行，專注於按鈕邏輯和狀態管理
 */
const MenuItemButton = ({ item, onAddToOrder }) => {
  const [showCustomModal, setShowCustomModal] = useState(false);

  // 檢查是否有可調價的客製選項
  const hasAdjustableOptions = useMemo(() => {
    if (!item.customOptions || !Array.isArray(item.customOptions)) {
      return false;
    }
    return item.customOptions.some(
      (opt) =>
        opt.priceAdjustments && Object.keys(opt.priceAdjustments).length > 0
    );
  }, [item.customOptions]);

  // 處理按鈕點擊
  const handleClick = () => {
    if (item.customOptions && item.customOptions.length > 0) {
      setShowCustomModal(true);
    } else {
      onAddToOrder({
        ...item,
        customOptions: item.customOptions,
      });
    }
  };

  // 處理客製選項確認
  const handleCustomConfirm = (selectedCustom) => {
    onAddToOrder({
      ...item,
      selectedCustom: selectedCustom,
      customOptions: item.customOptions,
    });
    setShowCustomModal(false);
  };

  return (
    <>
      {/* 菜單項目按鈕 */}
      <button
        onClick={handleClick}
        className="p-6 border-2 border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 min-h-[80px] group"
      >
        <div className="text-sm font-medium text-gray-800 group-hover:text-blue-800">
          {item.name}
        </div>
        <div className="text-sm text-gray-600 mt-1 group-hover:text-blue-600">
          ${item.price}
        </div>

        {/* 特色標籤 */}
        <div className="flex flex-wrap gap-1 mt-2">
          {hasAdjustableOptions && (
            <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded-full">
              可調價
            </span>
          )}
          {item.customOptions && item.customOptions.length > 0 && (
            <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full">
              可客製
            </span>
          )}
        </div>
      </button>

      {/* 客製選項 Modal */}
      {showCustomModal && (
        <CustomOptionsModal
          item={item}
          onConfirm={handleCustomConfirm}
          onCancel={() => setShowCustomModal(false)}
        />
      )}
    </>
  );
};

export default MenuItemButton;
