import React from "react";

/**
 * SeatConfirmModal
 *
 * 原始程式碼：定義在 CafePOSSystem.js 主 return 的 inline JSX
 * 功能效果：點擊空桌後跳出確認視窗，詢問是否帶客人入座
 * 用途：獨立為可重用元件，讓 CafePOSSystem.js 不含 JSX
 * 組件長度：約 30 行
 */
const SeatConfirmModal = ({ isOpen, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-ivory rounded-lg p-6 shadow-lg min-w-[300px]">
        <h2 className="text-lg font-bold mb-4">帶位確認</h2>
        <div className="mb-4">是否帶客人入座此桌？</div>
        <div className="flex space-x-2">
          <button
            onClick={onConfirm}
            className="bg-terracotta text-ivory px-4 py-2 rounded"
          >
            是
          </button>
          <button
            onClick={onCancel}
            className="bg-gray-300 px-4 py-2 rounded"
          >
            否
          </button>
        </div>
      </div>
    </div>
  );
};

export default SeatConfirmModal;
