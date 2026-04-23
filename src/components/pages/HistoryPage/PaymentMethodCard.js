import React from "react";

/**
 * PaymentMethodCard
 *
 * 原始程式碼：HistoryPage.js 行 573-621
 * 功能效果：顯示現金/Line Pay 付款筆數與金額比例
 * 用途：獨立付款方式統計卡片 UI
 */
const PaymentMethodCard = ({ activePeriodRecords, periodTotal }) => {
  return (
    <div className="bg-ivory rounded-lg p-4">
      <h3 className="text-lg font-bold mb-3">付款方式統計</h3>
      {activePeriodRecords.length === 0 ? (
        <div className="text-center text-warm-stone py-4">暫無資料</div>
      ) : (
        <div className="space-y-4">
          {["cash", "linepay"].map((method) => {
            const methodRecords = activePeriodRecords.filter(
              (r) => r.paymentMethod === method
            );
            const methodTotal = methodRecords.reduce((sum, r) => sum + r.total, 0);
            const percentage =
              periodTotal > 0 ? Math.round((methodTotal / periodTotal) * 100) : 0;

            return (
              <div key={method} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-4 h-4 rounded ${
                      method === "cash" ? "bg-terracotta" : "bg-terracotta"
                    }`}
                  />
                  <span className="font-medium">
                    {method === "cash" ? "現金" : "Line Pay"}
                  </span>
                </div>
                <div className="text-right">
                  <div className="font-bold">{methodRecords.length} 筆</div>
                  <div className="text-sm text-warm-olive">
                    ${methodTotal} ({percentage}%)
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PaymentMethodCard;
