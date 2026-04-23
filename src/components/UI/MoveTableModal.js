import React from "react";

/**
 * MoveTableModal
 *
 * 原始程式碼：定義在 CafePOSSystem.js ordering view 的 inline JSX
 * 功能效果：顯示換桌選擇視窗，列出可換入的空桌或待清理桌
 * 用途：獨立為可重用元件，讓 CafePOSSystem.js 不含 JSX
 * 組件長度：約 55 行
 */
const MoveTableModal = ({
  isOpen,
  selectedTable,
  allTableIds,
  moveTableTarget,
  getTableStatus,
  onTargetChange,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-ivory rounded-lg p-6 shadow-lg min-w-[300px]">
        <h2 className="text-lg font-bold mb-4">換桌</h2>
        <div className="mb-4">
          選擇要搬移到哪個桌位：
          <select
            className="border rounded px-2 py-1 ml-2"
            value={moveTableTarget}
            onChange={(e) => onTargetChange(e.target.value)}
          >
            <option value="">請選擇桌號</option>
            {allTableIds
              .filter((tid) => {
                const status = getTableStatus(tid);
                return (
                  tid !== selectedTable &&
                  (status === "available" || status === "ready-to-clean")
                );
              })
              .map((tid) => (
                <option key={tid} value={tid}>
                  {tid} (
                  {getTableStatus(tid) === "available" ? "空桌" : "待清理"})
                </option>
              ))}
          </select>
        </div>
        <div className="flex space-x-2">
          <button
            className="bg-terracotta text-ivory px-4 py-2 rounded"
            onClick={onConfirm}
            disabled={!moveTableTarget}
          >
            確認換桌
          </button>
          <button className="bg-gray-300 px-4 py-2 rounded" onClick={onCancel}>
            取消
          </button>
        </div>
      </div>
    </div>
  );
};

export default MoveTableModal;
