import React from "react";

/**
 * RefundConfirmModal
 *
 * 原始程式碼：HistoryPage.js 行 1065-1123
 * 功能效果：退款確認視窗，顯示訂單詳情並要求二次確認
 * 用途：獨立退款 Modal UI
 */
const RefundConfirmModal = ({ isOpen, record, onConfirm, onCancel }) => {
  if (!isOpen || !record) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
        <div className="mb-6">
          <h3 className="text-xl font-bold text-gray-800 mb-2">退款確認</h3>
          <div className="text-gray-600">
            <p className="mb-2">
              桌號:{" "}
              {record.type === "takeout" ? `外帶 #${record.table}` : record.table}
            </p>
            <p className="mb-2">時間: {record.time}</p>
            <p className="mb-2">金額: ${record.total}</p>
            <p className="mb-4">
              付款方式: {record.paymentMethod === "cash" ? "現金" : "Line Pay"}
            </p>
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm font-medium mb-1">商品明細:</p>
              <div className="text-sm text-gray-700">
                {record.items.map((item, index) => (
                  <div key={index}>
                    {item.name} x{item.quantity} - ${item.subtotal}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800 text-sm">
            ⚠️ 退款確認 退款後此訂單將無法恢復，請確認是否刪除，但退款紀錄將保留。確認是否刪除？
          </p>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 px-4 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium transition-colors"
          >
            確認退款
          </button>
        </div>
      </div>
    </div>
  );
};

export default RefundConfirmModal;
