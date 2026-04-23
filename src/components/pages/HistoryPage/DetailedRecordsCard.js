import React from "react";

/**
 * DetailedRecordsCard
 *
 * 原始程式碼：HistoryPage.js 行 525-571
 * 功能效果：顯示內用/外帶訂單數與金額比例
 * 用途：獨立詳細記錄統計卡片 UI
 */
const DetailedRecordsCard = ({ activePeriodRecords, periodTotal }) => {
  return (
    <div className="bg-ivory rounded-lg p-4">
      <h3 className="text-lg font-bold mb-3">詳細記錄</h3>
      {activePeriodRecords.length === 0 ? (
        <div className="text-center text-warm-stone py-4">暫無資料</div>
      ) : (
        <div className="space-y-4">
          {["table", "takeout"].map((type) => {
            const typeRecords = activePeriodRecords.filter((r) => r.type === type);
            const typeTotal = typeRecords.reduce((sum, r) => sum + r.total, 0);
            const percentage =
              periodTotal > 0 ? Math.round((typeTotal / periodTotal) * 100) : 0;

            return (
              <div key={type} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-4 h-4 rounded ${
                      type === "table" ? "bg-terracotta" : "bg-terracotta"
                    }`}
                  />
                  <span className="font-medium">
                    {type === "table" ? "內用" : "外帶"}
                  </span>
                </div>
                <div className="text-right">
                  <div className="font-bold">{typeRecords.length} 筆</div>
                  <div className="text-sm text-warm-olive">
                    ${typeTotal} ({percentage}%)
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

export default DetailedRecordsCard;
