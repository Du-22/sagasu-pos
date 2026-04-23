import React from "react";

/**
 * 結帳類型選擇 Modal
 *
 * 原始程式碼：從 OrderSummary.js 抽取的 Modal JSX
 * 功能效果：顯示全部結帳或分開結帳選擇介面
 * 用途：供 NewOrderSummary 使用的純 UI 組件
 * 組件長度：約50行，純 JSX 渲染無狀態
 */
const CheckoutTypeModal = ({
  isOpen,
  grandTotal,
  onFullCheckout,
  onPartialCheckout,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-ivory rounded-xl p-8 max-w-md w-full mx-4 shadow-2xl">
        <div className="text-center mb-6">
          <h3 className="text-2xl font-bold text-warm-dark mb-2">
            選擇結帳方式
          </h3>
          <div className="text-lg text-warm-olive">總計: ${grandTotal}</div>
        </div>

        <div className="space-y-4 mb-8">
          <button
            onClick={onFullCheckout}
            className="w-full p-4 rounded-xl border-2 border-terracotta bg-parchment hover:bg-warm-sand transition-colors"
          >
            <h4 className="text-lg font-semibold text-terracotta-dark mb-1">
              全部結帳
            </h4>
            <p className="text-sm text-terracotta">一次結清所有餐點</p>
          </button>

          <button
            onClick={onPartialCheckout}
            className="w-full p-4 rounded-xl border-2 border-terracotta bg-parchment hover:bg-warm-sand transition-colors"
          >
            <h4 className="text-lg font-semibold text-terracotta-dark mb-1">
              分開結帳
            </h4>
            <p className="text-sm text-terracotta">選擇部分餐點結帳</p>
          </button>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 px-4 border border-warm-sand text-warm-charcoal rounded-lg hover:bg-parchment font-medium transition-colors"
        >
          取消
        </button>
      </div>
    </div>
  );
};

export default CheckoutTypeModal;
