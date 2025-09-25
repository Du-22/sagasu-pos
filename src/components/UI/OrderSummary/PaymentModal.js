import React from "react";
import { Banknote, Smartphone } from "lucide-react";

/**
 * 付款方式選擇 Modal
 *
 * 原始程式碼：從 OrderSummary.js 抽取的付款方式 Modal JSX
 * 功能效果：顯示付款方式選擇介面（現金/Line Pay）
 * 用途：供 NewOrderSummary 使用的純 UI 組件
 * 組件長度：約70行，純 JSX 渲染無狀態
 */
const PaymentModal = ({
  isOpen,
  total,
  paymentMethod,
  onPaymentMethodChange,
  onConfirm,
  onClose,
}) => {
  if (!isOpen) return null;

  const paymentMethods = [
    {
      id: "cash",
      name: "現金",
      icon: <Banknote className="w-8 h-8" />,
      description: "店內現金付款",
      popular: true,
    },
    {
      id: "linepay",
      name: "Line Pay",
      icon: <Smartphone className="w-8 h-8" />,
      description: "掃描QR Code付款",
      popular: false,
    },
  ];

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4 shadow-2xl">
        <div className="text-center mb-6">
          <h3 className="text-2xl font-bold text-gray-800 mb-2">
            選擇付款方式
          </h3>
          <div className="text-3xl font-bold text-blue-600">總計: ${total}</div>
        </div>

        <div className="space-y-4 mb-8">
          {paymentMethods.map((method) => (
            <div
              key={method.id}
              onClick={() => onPaymentMethodChange(method.id)}
              className={`
                relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-200
                ${
                  paymentMethod === method.id
                    ? "border-blue-500 bg-blue-50 shadow-md"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                }
                ${method.popular ? "ring-2 ring-orange-200" : ""}
              `}
            >
              {method.popular && (
                <div className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                  推薦
                </div>
              )}

              <div className="flex items-center space-x-4">
                <div
                  className={`
                    p-3 rounded-lg
                    ${
                      paymentMethod === method.id
                        ? "bg-blue-500 text-white"
                        : "bg-gray-100 text-gray-600"
                    }
                    ${
                      method.popular && paymentMethod !== method.id
                        ? "bg-orange-100 text-orange-600"
                        : ""
                    }
                  `}
                >
                  {method.icon}
                </div>

                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h4 className="text-lg font-semibold text-gray-800">
                      {method.name}
                    </h4>
                    {method.popular && (
                      <span className="text-orange-600 text-sm font-medium">
                        (常用)
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{method.description}</p>
                </div>

                <div
                  className={`
                    w-6 h-6 rounded-full border-2 flex items-center justify-center
                    ${
                      paymentMethod === method.id
                        ? "border-blue-500 bg-blue-500"
                        : "border-gray-300"
                    }
                  `}
                >
                  {paymentMethod === method.id && (
                    <div className="w-2 h-2 rounded-full bg-white"></div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium transition-colors shadow-md"
          >
            確認付款
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
