import React, { useState } from "react";
import Header from "../UI/Header";

const HistoryPage = ({ salesHistory, onBack, onMenuSelect, onRefundOrder }) => {
  const [selectedDate, setSelectedDate] = useState(
    (() => {
      const now = new Date();
      const parts = now
        .toLocaleDateString("zh-TW", { timeZone: "Asia/Taipei" })
        .split("/");
      return `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(
        2,
        "0"
      )}`;
    })()
  );
  const [viewMode, setViewMode] = useState("daily");
  const [displayMode, setDisplayMode] = useState("grouped");
  const [showRefundedOrders, setShowRefundedOrders] = useState(true);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [selectedRefundRecord, setSelectedRefundRecord] = useState(null);

  // 獲取週的開始和結束日期
  const getWeekRange = (dateStr) => {
    const date = new Date(dateStr);
    const dayOfWeek = date.getDay();
    const startDate = new Date(date);
    startDate.setDate(date.getDate() - dayOfWeek); // 週日開始
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);

    return {
      start: startDate.toISOString().split("T")[0],
      end: endDate.toISOString().split("T")[0],
    };
  };

  // 獲取月的開始和結束日期
  const getMonthRange = (dateStr) => {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = date.getMonth();

    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);

    return {
      start: startDate.toISOString().split("T")[0],
      end: endDate.toISOString().split("T")[0],
    };
  };

  // 根據檢視模式過濾記錄
  const getFilteredRecords = () => {
    if (viewMode === "daily") {
      return salesHistory.filter((record) => record.date === selectedDate);
    } else if (viewMode === "weekly") {
      const { start, end } = getWeekRange(selectedDate);
      return salesHistory.filter((record) => {
        return record.date >= start && record.date <= end;
      });
    } else if (viewMode === "monthly") {
      const { start, end } = getMonthRange(selectedDate);
      return salesHistory.filter((record) => {
        return record.date >= start && record.date <= end;
      });
    }
    return [];
  };

  // 獲取日期範圍顯示文字
  const getDateRangeText = () => {
    if (viewMode === "daily") {
      return selectedDate;
    } else if (viewMode === "weekly") {
      const { start, end } = getWeekRange(selectedDate);
      return `${start} ~ ${end}`;
    } else if (viewMode === "monthly") {
      const date = new Date(selectedDate);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      return `${year}年${month}月`;
    }
    return selectedDate;
  };

  // 獲取日期範圍內的每日統計（用於週/月檢視的詳細分析）
  const getDailyBreakdown = (records) => {
    const dailyStats = {};

    records
      .filter((record) => !record.isRefunded)
      .forEach((record) => {
        const date = record.date;
        if (!dailyStats[date]) {
          dailyStats[date] = {
            date,
            orderCount: 0,
            itemCount: 0,
            revenue: 0,
            records: [],
          };
        }

        dailyStats[date].orderCount += 1;
        dailyStats[date].itemCount += record.itemCount;
        dailyStats[date].revenue += record.total;
        dailyStats[date].records.push(record);
      });

    return Object.values(dailyStats).sort((a, b) =>
      b.date.localeCompare(a.date)
    );
  };

  const allPeriodRecords = getFilteredRecords();
  const activePeriodRecords = allPeriodRecords.filter(
    (record) => !record.isRefunded
  );
  const refundedPeriodRecords = allPeriodRecords.filter(
    (record) => record.isRefunded
  );

  // 計算統計數據
  const periodTotal = activePeriodRecords.reduce(
    (sum, record) => sum + record.total,
    0
  );
  const periodItemCount = activePeriodRecords.reduce(
    (sum, record) => sum + record.itemCount,
    0
  );
  const refundedTotal = refundedPeriodRecords.reduce(
    (sum, record) => sum + record.total,
    0
  );

  // 顯示用的訂單
  const displayRecords = showRefundedOrders
    ? allPeriodRecords
    : activePeriodRecords;

  // 群組訂單按桌號
  const groupRecordsByTable = (records) => {
    const groups = {};

    records.forEach((record) => {
      const groupKey = record.groupId || record.id;

      if (!groups[groupKey]) {
        groups[groupKey] = {
          groupId: groupKey,
          table: record.table,
          type: record.type,
          records: [],
          totalAmount: 0,
          totalItems: 0,
          paymentMethods: {},
          isGrouped: false,
          hasRefunded: false,
        };
      }

      groups[groupKey].records.push(record);

      if (!record.isRefunded) {
        groups[groupKey].totalAmount += record.total;
        groups[groupKey].totalItems += record.itemCount;

        if (groups[groupKey].paymentMethods[record.paymentMethod]) {
          groups[groupKey].paymentMethods[record.paymentMethod] += record.total;
        } else {
          groups[groupKey].paymentMethods[record.paymentMethod] = record.total;
        }
      } else {
        groups[groupKey].hasRefunded = true;
      }
    });

    Object.values(groups).forEach((group) => {
      if (group.records.length > 1) {
        group.isGrouped = true;
      }
    });

    return Object.values(groups).sort((a, b) => {
      const latestA = Math.max(...a.records.map((r) => r.timestamp));
      const latestB = Math.max(...b.records.map((r) => r.timestamp));
      return latestB - latestA;
    });
  };

  const calculateDiningTime = (records) => {
    if (records.length === 0) return "未知";

    const times = records.map((r) => r.time);
    const earliest = times.sort()[0];
    const latest = times.sort().reverse()[0];

    if (earliest === latest) {
      return `${earliest}`;
    }

    return `${earliest} - ${latest}`;
  };

  // 熱門商品統計
  const getPopularItems = (records) => {
    const itemStats = {};
    records
      .filter((record) => !record.isRefunded)
      .forEach((record) => {
        record.items.forEach((item) => {
          if (itemStats[item.name]) {
            itemStats[item.name].quantity += item.quantity;
            itemStats[item.name].revenue += item.subtotal;
          } else {
            itemStats[item.name] = {
              name: item.name,
              quantity: item.quantity,
              revenue: item.subtotal,
              price: item.price,
            };
          }
        });
      });

    return Object.values(itemStats)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  };

  const handleRefundClick = (record) => {
    setSelectedRefundRecord(record);
    setShowRefundModal(true);
  };

  const handleConfirmRefund = () => {
    if (selectedRefundRecord && onRefundOrder) {
      onRefundOrder(selectedRefundRecord.id);
      setShowRefundModal(false);
      setSelectedRefundRecord(null);
    }
  };

  const handleCancelRefund = () => {
    setShowRefundModal(false);
    setSelectedRefundRecord(null);
  };

  const popularItems = getPopularItems(allPeriodRecords);
  const groupedRecords = groupRecordsByTable(displayRecords);
  const dailyBreakdown =
    viewMode !== "daily" ? getDailyBreakdown(allPeriodRecords) : [];

  return (
    <div className="min-h-screen bg-gray-100">
      <Header
        title="Sasuga POS系統"
        subtitle="營業紀錄"
        currentPage="history"
        onMenuSelect={onMenuSelect}
      />

      <div className="p-4 space-y-4">
        {/* 日期選擇和檢視模式 */}
        <div className="bg-white rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <label className="font-medium">查看日期:</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="border rounded-lg px-3 py-2"
              />
              <div className="text-sm text-gray-600">
                期間: {getDateRangeText()}
              </div>
            </div>
            <div className="flex space-x-2">
              {/* 顯示模式切換 */}
              {viewMode === "daily" && (
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setDisplayMode("grouped")}
                    className={`px-3 py-1 rounded-lg text-sm ${
                      displayMode === "grouped"
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-600"
                    }`}
                  >
                    同桌訂單
                  </button>
                  <button
                    onClick={() => setDisplayMode("detailed")}
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
                  onClick={() => setViewMode(mode)}
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

        {/* 統計卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {activePeriodRecords.length}
            </div>
            <div className="text-sm text-gray-600">筆訂單</div>
          </div>
          <div className="bg-white rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {periodItemCount}
            </div>
            <div className="text-sm text-gray-600">項商品</div>
          </div>
          <div className="bg-white rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">
              ${periodTotal}
            </div>
            <div className="text-sm text-gray-600">營業額</div>
          </div>
          <div className="bg-white rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-red-600">
              ${refundedTotal}
            </div>
            <div className="text-sm text-gray-600">退款金額</div>
          </div>
          <div className="bg-white rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">
              {activePeriodRecords.length > 0
                ? Math.round(periodTotal / activePeriodRecords.length)
                : 0}
            </div>
            <div className="text-sm text-gray-600">平均單價</div>
          </div>
        </div>

        {/* 週/月檢視的每日分析 */}
        {viewMode !== "daily" && dailyBreakdown.length > 0 && (
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
                        $
                        {day.orderCount > 0
                          ? Math.round(day.revenue / day.orderCount)
                          : 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* 熱門商品 */}
          <div className="bg-white rounded-lg p-4">
            <h3 className="text-lg font-bold mb-3">
              熱門商品 TOP 5
              {viewMode !== "daily" && (
                <span className="text-sm font-normal text-gray-600">
                  ({viewMode === "weekly" ? "本週" : "本月"})
                </span>
              )}
            </h3>
            {popularItems.length === 0 ? (
              <div className="text-center text-gray-500 py-4">暫無資料</div>
            ) : (
              <div className="space-y-3">
                {popularItems.map((item, index) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                          index === 0
                            ? "bg-yellow-500"
                            : index === 1
                            ? "bg-gray-400"
                            : index === 2
                            ? "bg-orange-400"
                            : "bg-blue-400"
                        }`}
                      >
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium">{item.name}</div>
                        <div className="text-sm text-gray-600">
                          售出 {item.quantity} 份
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-600">
                        ${item.revenue}
                      </div>
                      <div className="text-sm text-gray-600">
                        ${item.price}/份
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 詳細記錄 */}
          <div className="bg-white rounded-lg p-4">
            <h3 className="text-lg font-bold mb-3">詳細記錄</h3>
            {activePeriodRecords.length === 0 ? (
              <div className="text-center text-gray-500 py-4">暫無資料</div>
            ) : (
              <div className="space-y-4">
                {["table", "takeout"].map((type) => {
                  const typeRecords = activePeriodRecords.filter(
                    (r) => r.type === type
                  );
                  const typeTotal = typeRecords.reduce(
                    (sum, r) => sum + r.total,
                    0
                  );
                  const percentage =
                    periodTotal > 0
                      ? Math.round((typeTotal / periodTotal) * 100)
                      : 0;

                  return (
                    <div
                      key={type}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-4 h-4 rounded ${
                            type === "table" ? "bg-blue-500" : "bg-orange-500"
                          }`}
                        ></div>
                        <span className="font-medium">
                          {type === "table" ? "內用" : "外帶"}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{typeRecords.length} 筆</div>
                        <div className="text-sm text-gray-600">
                          ${typeTotal} ({percentage}%)
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 付款方式統計 */}
          <div className="bg-white rounded-lg p-4">
            <h3 className="text-lg font-bold mb-3">付款方式統計</h3>
            {activePeriodRecords.length === 0 ? (
              <div className="text-center text-gray-500 py-4">暫無資料</div>
            ) : (
              <div className="space-y-4">
                {["cash", "linepay"].map((method) => {
                  const methodRecords = activePeriodRecords.filter(
                    (r) => r.paymentMethod === method
                  );
                  const methodTotal = methodRecords.reduce(
                    (sum, r) => sum + r.total,
                    0
                  );
                  const percentage =
                    periodTotal > 0
                      ? Math.round((methodTotal / periodTotal) * 100)
                      : 0;

                  return (
                    <div
                      key={method}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-4 h-4 rounded ${
                            method === "cash" ? "bg-blue-500" : "bg-green-500"
                          }`}
                        ></div>
                        <span className="font-medium">
                          {method === "cash" ? "現金" : "Line Pay"}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">
                          {methodRecords.length} 筆
                        </div>
                        <div className="text-sm text-gray-600">
                          ${methodTotal} ({percentage}%)
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 退款統計 */}
          {refundedPeriodRecords.length > 0 && (
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
                  <span className="font-bold text-red-600">
                    ${refundedTotal}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium">退款率</span>
                  <span className="font-bold text-red-600">
                    {allPeriodRecords.length > 0
                      ? Math.round(
                          (refundedPeriodRecords.length /
                            allPeriodRecords.length) *
                            100
                        )
                      : 0}
                    %
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 詳細記錄 - 只在日檢視顯示 */}
        {viewMode === "daily" && (
          <div className="bg-white rounded-lg p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-bold">
                詳細記錄{" "}
                {displayMode === "grouped" ? "(同桌訂單)" : "(詳細檢視)"}
              </h3>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={showRefundedOrders}
                  onChange={(e) => setShowRefundedOrders(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">顯示退款訂單</span>
              </label>
            </div>

            {displayRecords.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                {selectedDate} 暫無資料
              </div>
            ) : displayMode === "grouped" ? (
              // 群組顯示
              <div className="space-y-6">
                {groupedRecords.map((group) => (
                  <div
                    key={group.groupId}
                    className={`border-2 rounded-lg overflow-hidden ${
                      group.hasRefunded
                        ? "border-red-200 bg-red-50"
                        : group.isGrouped
                        ? "border-blue-300 bg-blue-50"
                        : "border-gray-200 bg-white"
                    }`}
                  >
                    {/* 群組摘要 */}
                    <div
                      className={`p-4 ${
                        group.hasRefunded
                          ? "bg-red-500 text-white"
                          : group.isGrouped
                          ? "bg-blue-500 text-white"
                          : group.type === "takeout"
                          ? "bg-orange-500 text-white"
                          : "bg-gray-500 text-white"
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="text-lg font-bold">
                            {group.type === "takeout"
                              ? `外帶 ${group.table}`
                              : `${group.table} 桌`}
                            {group.isGrouped && " (分開結帳)"}
                            {group.hasRefunded && " (含退款)"}
                          </h4>
                          <p className="text-sm opacity-90">
                            用餐時段: {calculateDiningTime(group.records)} •
                            {group.isGrouped
                              ? ` 分 ${group.records.length} 次結帳`
                              : " 單次結帳"}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold">
                            ${group.totalAmount}
                          </div>
                          <div className="text-sm opacity-90">
                            {group.totalItems} 件商品
                          </div>
                          {group.hasRefunded && (
                            <div className="text-sm opacity-90">
                              (已扣除退款)
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 群組內容 */}
                    <div className="p-4">
                      {group.isGrouped ? (
                        // 分開結帳顯示
                        <div className="space-y-3">
                          {group.records.map((record, index) => (
                            <div
                              key={record.id}
                              className={`border rounded-lg p-3 ${
                                record.isRefunded
                                  ? "bg-red-50 border-red-200 opacity-75"
                                  : "bg-white"
                              }`}
                            >
                              {record.isRefunded && (
                                <div className="mb-2">
                                  <span className="bg-red-500 text-white px-2 py-1 rounded text-xs">
                                    已退款 {record.refundDate}{" "}
                                    {record.refundTime}
                                  </span>
                                </div>
                              )}
                              <div className="flex justify-between items-center mb-2">
                                <div className="flex items-center space-x-3">
                                  <span
                                    className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold text-white ${
                                      record.isRefunded
                                        ? "bg-red-500"
                                        : "bg-blue-500"
                                    }`}
                                  >
                                    {index + 1}
                                  </span>
                                  <div>
                                    <div className="font-medium">
                                      第{index + 1}次結帳 - {record.time}
                                    </div>
                                    <span
                                      className={`text-xs px-2 py-1 rounded ${
                                        record.paymentMethod === "cash"
                                          ? "bg-blue-100 text-blue-800"
                                          : "bg-green-100 text-green-800"
                                      }`}
                                    >
                                      {record.paymentMethod === "cash"
                                        ? "現金"
                                        : "Line Pay"}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <div
                                    className={`text-lg font-bold ${
                                      record.isRefunded
                                        ? "text-red-600 line-through"
                                        : ""
                                    }`}
                                  >
                                    ${record.total}
                                  </div>
                                  {!record.isRefunded && (
                                    <button
                                      onClick={() => handleRefundClick(record)}
                                      className="bg-red-500 text-white px-3 py-1 rounded text-xs hover:bg-red-600 transition-colors"
                                    >
                                      退款
                                    </button>
                                  )}
                                </div>
                              </div>
                              <div className="text-sm text-gray-700">
                                {record.items.map((item, idx) => (
                                  <span key={idx}>
                                    {item.name} x{item.quantity}
                                    {item.selectedCustom &&
                                      Object.entries(item.selectedCustom).map(
                                        ([type, value]) => (
                                          <span
                                            key={type}
                                            className="ml-1 text-xs text-gray-500"
                                          >
                                            [{type}:{value}]
                                          </span>
                                        )
                                      )}
                                    {idx < record.items.length - 1 ? ", " : ""}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        // 單獨結帳顯示
                        <div>
                          {group.records[0].isRefunded && (
                            <div className="mb-2">
                              <span className="bg-red-500 text-white px-2 py-1 rounded text-xs">
                                已退款 {group.records[0].refundDate}{" "}
                                {group.records[0].refundTime}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between items-start mb-2">
                            <div className="text-sm text-gray-700 flex-1">
                              {group.records[0].items.map((item, index) => (
                                <span key={index}>
                                  {item.name} x{item.quantity}
                                  {item.selectedCustom &&
                                    Object.entries(item.selectedCustom).map(
                                      ([type, value]) => (
                                        <span
                                          key={type}
                                          className="ml-1 text-xs text-gray-500"
                                        >
                                          [{type}:{value}]
                                        </span>
                                      )
                                    )}
                                  {index < group.records[0].items.length - 1
                                    ? ", "
                                    : ""}
                                </span>
                              ))}
                            </div>
                            {!group.records[0].isRefunded && (
                              <button
                                onClick={() =>
                                  handleRefundClick(group.records[0])
                                }
                                className="bg-red-500 text-white px-3 py-1 rounded text-xs hover:bg-red-600 transition-colors ml-4"
                              >
                                退款
                              </button>
                            )}
                          </div>
                          <div className="mt-2">
                            <span
                              className={`text-xs px-2 py-1 rounded ${
                                group.records[0].paymentMethod === "cash"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-green-100 text-green-800"
                              }`}
                            >
                              {group.records[0].paymentMethod === "cash"
                                ? "現金"
                                : "Line Pay"}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // 詳細列表
              <div className="space-y-3">
                {displayRecords
                  .sort((a, b) => b.timestamp - a.timestamp)
                  .map((record) => (
                    <div
                      key={record.id}
                      className={`border rounded-lg p-3 ${
                        record.isRefunded
                          ? "bg-red-50 border-red-200 opacity-75"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      {record.isRefunded && (
                        <div className="mb-2">
                          <span className="bg-red-500 text-white px-2 py-1 rounded text-xs">
                            已退款 {record.refundDate} {record.refundTime}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center space-x-3 flex-1">
                          <span className="font-medium">
                            {record.type === "takeout"
                              ? `外帶 #${record.table}`
                              : record.table}
                          </span>
                          <span className="text-sm text-gray-600">
                            {record.time}
                          </span>
                          <span
                            className={`text-xs px-2 py-1 rounded ${
                              record.type === "takeout"
                                ? "bg-orange-100 text-orange-700"
                                : "bg-blue-100 text-blue-700"
                            }`}
                          >
                            {record.type === "takeout" ? "外帶" : "內用"}
                          </span>
                          {record.isPartialPayment && (
                            <span className="text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-700">
                              部分結帳
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="text-right">
                            <span
                              className={`font-bold ${
                                record.isRefunded
                                  ? "text-red-600 line-through"
                                  : "text-green-600"
                              }`}
                            >
                              ${record.total}
                            </span>
                            <div className="text-sm text-gray-600">
                              {record.itemCount} 項商品
                            </div>
                          </div>
                          {!record.isRefunded && (
                            <button
                              onClick={() => handleRefundClick(record)}
                              className="bg-red-500 text-white px-3 py-1 rounded text-xs hover:bg-red-600 transition-colors"
                            >
                              退款
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="text-sm text-gray-700">
                        {record.items.map((item, index) => (
                          <span key={index}>
                            {item.name} x{item.quantity}
                            {item.selectedCustom &&
                              Object.entries(item.selectedCustom).map(
                                ([type, value]) => (
                                  <span
                                    key={type}
                                    className="ml-1 text-xs text-gray-500"
                                  >
                                    [{type}:{value}]
                                  </span>
                                )
                              )}
                            {index < record.items.length - 1 ? ", " : ""}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* 週/月檢視的簡化記錄列表 */}
        {viewMode !== "daily" && displayRecords.length > 0 && (
          <div className="bg-white rounded-lg p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-bold">
                {viewMode === "weekly" ? "本週" : "本月"}記錄概覽
              </h3>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={showRefundedOrders}
                  onChange={(e) => setShowRefundedOrders(e.target.checked)}
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
                        ? "bg-red-50 border-red-200 opacity-75"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-sm text-gray-500">
                        {record.date}
                      </span>
                      <span className="font-medium">
                        {record.type === "takeout"
                          ? `外帶 #${record.table}`
                          : record.table}
                      </span>
                      <span className="text-sm text-gray-600">
                        {record.time}
                      </span>
                      {record.isRefunded && (
                        <span className="bg-red-500 text-white px-2 py-1 rounded text-xs">
                          已退款
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-3">
                      <span
                        className={`font-bold ${
                          record.isRefunded
                            ? "text-red-600 line-through"
                            : "text-green-600"
                        }`}
                      >
                        ${record.total}
                      </span>
                      {!record.isRefunded && (
                        <button
                          onClick={() => handleRefundClick(record)}
                          className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600 transition-colors"
                        >
                          退款
                        </button>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* 退款確認 Modal */}
      {showRefundModal && selectedRefundRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-gray-800 mb-2">退款確認</h3>
              <div className="text-gray-600">
                <p className="mb-2">
                  桌號:{" "}
                  {selectedRefundRecord.type === "takeout"
                    ? `外帶 #${selectedRefundRecord.table}`
                    : selectedRefundRecord.table}
                </p>
                <p className="mb-2">時間: {selectedRefundRecord.time}</p>
                <p className="mb-2">金額: ${selectedRefundRecord.total}</p>
                <p className="mb-4">
                  付款方式:{" "}
                  {selectedRefundRecord.paymentMethod === "cash"
                    ? "現金"
                    : "Line Pay"}
                </p>

                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm font-medium mb-1">商品明細:</p>
                  <div className="text-sm text-gray-700">
                    {selectedRefundRecord.items.map((item, index) => (
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
                ⚠️ 退款確認
                退款後此訂單將無法恢復，請確認是否刪除，但退款紀錄將保留。確認是否刪除？
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleCancelRefund}
                className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleConfirmRefund}
                className="flex-1 py-3 px-4 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium transition-colors"
              >
                確認退款
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryPage;
