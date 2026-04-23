import React from "react";

/**
 * StatisticsCards
 *
 * 原始程式碼：HistoryPage.js 行 394-428
 * 功能效果：顯示筆訂單、項商品、營業額、退款金額、平均單價 5 個統計數字
 * 用途：獨立統計卡片 UI
 */
const StatisticsCards = ({
  orderCount,
  itemCount,
  periodTotal,
  refundedTotal,
}) => {
  const avgPrice = orderCount > 0 ? Math.round(periodTotal / orderCount) : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
      <div className="bg-ivory rounded-lg p-4 text-center">
        <div className="text-2xl font-bold text-terracotta">{orderCount}</div>
        <div className="text-sm text-warm-olive">筆訂單</div>
      </div>
      <div className="bg-ivory rounded-lg p-4 text-center">
        <div className="text-2xl font-bold text-terracotta-dark">{itemCount}</div>
        <div className="text-sm text-warm-olive">項商品</div>
      </div>
      <div className="bg-ivory rounded-lg p-4 text-center">
        <div className="text-2xl font-bold text-terracotta">${periodTotal}</div>
        <div className="text-sm text-warm-olive">營業額</div>
      </div>
      <div className="bg-ivory rounded-lg p-4 text-center">
        <div className="text-2xl font-bold text-error-warm">${refundedTotal}</div>
        <div className="text-sm text-warm-olive">退款金額</div>
      </div>
      <div className="bg-ivory rounded-lg p-4 text-center">
        <div className="text-2xl font-bold text-terracotta">{avgPrice}</div>
        <div className="text-sm text-warm-olive">平均單價</div>
      </div>
    </div>
  );
};

export default StatisticsCards;
