import React from "react";

/**
 * DailyAnalysisTable
 *
 * 原始程式碼：HistoryPage.js 行 430-468
 * 功能效果：週/月檢視時顯示每日營業分析表格
 * 用途：獨立每日分析 UI，只在 viewMode !== "daily" 且有資料時渲染
 */
const DailyAnalysisTable = ({ dailyBreakdown, viewMode }) => {
  if (viewMode === "daily" || dailyBreakdown.length === 0) return null;

  return (
    <div className="bg-white rounded-lg p-4">
      <h3 className="text-lg font-bold mb-3">
        每日營業分析 ({viewMode === "weekly" ? "本週" : "本月"})
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left p-2">日期</th>
              <th className="text-right p-2">訂單數</th>
              <th className="text-right p-2">商品數</th>
              <th className="text-right p-2">營業額</th>
              <th className="text-right p-2">平均單價</th>
            </tr>
          </thead>
          <tbody>
            {dailyBreakdown.map((day) => (
              <tr key={day.date} className="border-b hover:bg-gray-50">
                <td className="p-2 font-medium">{day.date}</td>
                <td className="p-2 text-right">{day.orderCount}</td>
                <td className="p-2 text-right">{day.itemCount}</td>
                <td className="p-2 text-right font-bold text-green-600">
                  ${day.revenue}
                </td>
                <td className="p-2 text-right">
                  ${day.orderCount > 0 ? Math.round(day.revenue / day.orderCount) : 0}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DailyAnalysisTable;
