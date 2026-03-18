import React from "react";

/**
 * DateSelector
 *
 * 原始程式碼：HistoryPage.js 行 335-392
 * 功能效果：日期輸入框、日/週/月切換按鈕、同桌/詳細顯示模式切換
 * 用途：獨立日期篩選 UI，讓 HistoryPage 不含大段 JSX
 */
const DateSelector = ({
  selectedDate,
  onDateChange,
  viewMode,
  onViewModeChange,
  displayMode,
  onDisplayModeChange,
  dateRangeText,
}) => {
  return (
    <div className="bg-white rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <label className="font-medium">查看日期:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => onDateChange(e.target.value)}
            className="border rounded-lg px-3 py-2"
          />
          <div className="text-sm text-gray-600">期間: {dateRangeText}</div>
        </div>
        <div className="flex space-x-2">
          {viewMode === "daily" && (
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => onDisplayModeChange("grouped")}
                className={`px-3 py-1 rounded-lg text-sm ${
                  displayMode === "grouped"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600"
                }`}
              >
                同桌訂單
              </button>
              <button
                onClick={() => onDisplayModeChange("detailed")}
                className={`px-3 py-1 rounded-lg text-sm ${
                  displayMode === "detailed"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600"
                }`}
              >
                詳細檢視
              </button>
            </div>
          )}
          {["daily", "weekly", "monthly"].map((mode) => (
            <button
              key={mode}
              onClick={() => onViewModeChange(mode)}
              className={`px-3 py-1 rounded-lg text-sm ${
                viewMode === mode
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 text-gray-700"
              }`}
            >
              {mode === "daily" ? "日" : mode === "weekly" ? "週" : "月"}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DateSelector;
