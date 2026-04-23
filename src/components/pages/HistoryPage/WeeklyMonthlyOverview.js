import React from "react";

/**
 * WeeklyMonthlyOverview
 *
 * 原始程式碼：HistoryPage.js 行 991-1062
 * 功能效果：週/月檢視的訂單概覽列表，可捲動，支援退款按鈕
 * 用途：獨立週/月訂單概覽 UI，只在 viewMode !== "daily" 且有資料時渲染
 */
const WeeklyMonthlyOverview = ({
  viewMode,
  displayRecords,
  showRefundedOrders,
  onShowRefundedChange,
  onRefundClick,
}) => {
  if (viewMode === "daily" || displayRecords.length === 0) return null;

  return (
    <div className="bg-ivory rounded-lg p-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-bold">
          {viewMode === "weekly" ? "本週" : "本月"}記錄概覽
        </h3>
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={showRefundedOrders}
            onChange={(e) => onShowRefundedChange(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm">顯示退款訂單</span>
        </label>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {displayRecords
          .sort((a, b) => b.timestamp - a.timestamp)
          .map((record) => (
            <div
              key={record.id}
              className={`flex items-center justify-between p-3 border rounded-lg ${
                record.isRefunded
                  ? "bg-error-warm/10 border-error-warm/30 opacity-75"
                  : "hover:bg-parchment"
              }`}
            >
              <div className="flex items-center space-x-3">
                <span className="text-sm text-warm-stone">{record.date}</span>
                <span className="font-medium">
                  {record.type === "takeout" ? `外帶 #${record.table}` : record.table}
                </span>
                <span className="text-sm text-warm-olive">{record.time}</span>
                {record.isRefunded && (
                  <span className="bg-error-warm text-ivory px-2 py-1 rounded text-xs">
                    已退款
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-3">
                <span
                  className={`font-bold ${
                    record.isRefunded ? "text-error-warm line-through" : "text-terracotta-dark"
                  }`}
                >
                  ${record.total}
                </span>
                {!record.isRefunded && (
                  <button
                    onClick={() => onRefundClick(record)}
                    className="bg-error-warm text-ivory px-2 py-1 rounded text-xs hover:bg-error-warm transition-colors"
                  >
                    退款
                  </button>
                )}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};

export default WeeklyMonthlyOverview;
