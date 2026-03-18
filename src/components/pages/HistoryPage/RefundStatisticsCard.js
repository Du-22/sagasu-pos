import React from "react";

/**
 * RefundStatisticsCard
 *
 * 原始程式碼：HistoryPage.js 行 623-655
 * 功能效果：顯示退款筆數、退款金額、退款率（只在有退款時顯示）
 * 用途：獨立退款統計卡片 UI
 */
const RefundStatisticsCard = ({ refundedPeriodRecords, allPeriodRecords, refundedTotal }) => {
  if (refundedPeriodRecords.length === 0) return null;

  const refundRate =
    allPeriodRecords.length > 0
      ? Math.round((refundedPeriodRecords.length / allPeriodRecords.length) * 100)
      : 0;

  return (
    <div className="bg-white rounded-lg p-4">
      <h3 className="text-lg font-bold mb-3 text-red-600">退款統計</h3>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="font-medium">退款筆數</span>
          <span className="font-bold text-red-600">
            {refundedPeriodRecords.length} 筆
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="font-medium">退款金額</span>
          <span className="font-bold text-red-600">${refundedTotal}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="font-medium">退款率</span>
          <span className="font-bold text-red-600">{refundRate}%</span>
        </div>
      </div>
    </div>
  );
};

export default RefundStatisticsCard;
