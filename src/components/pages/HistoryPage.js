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
  const [showRefundedOrders, setShowRefundedOrders] = useState(true); // 新增：是否顯示退款訂單
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [selectedRefundRecord, setSelectedRefundRecord] = useState(null);

  // 分類有效訂單和全部訂單
  const allDayRecords = salesHistory.filter(
    (record) => record.date === selectedDate
  );
  const activeDayRecords = allDayRecords.filter((record) => !record.isRefunded);
  const refundedDayRecords = allDayRecords.filter(
    (record) => record.isRefunded
  );

  // 計算有效訂單（排除退款）
  const dayTotal = activeDayRecords.reduce(
    (sum, record) => sum + record.total,
    0
  );
  const dayItemCount = activeDayRecords.reduce(
    (sum, record) => sum + record.itemCount,
    0
  );
  const refundedTotal = refundedDayRecords.reduce(
    (sum, record) => sum + record.total,
    0
  );

  // 顯示用的訂單（是否包含退款訂單）
  const displayRecords = showRefundedOrders ? allDayRecords : activeDayRecords;

  // 群組訂單按桌號
  const groupRecordsByTable = (records) => {
    records.forEach((record, index) => {});

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
          hasRefunded: false, // 新增：群組是否包含退款記錄
        };
      }

      groups[groupKey].records.push(record);

      // 只計算未退款的金額和商品數
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
    if (records.length === 0) return "æœªçŸ¥";

    const times = records.map((r) => r.time);
    const earliest = times.sort()[0];
    const latest = times.sort().reverse()[0];

    if (earliest === latest) {
      return `${earliest}`;
    }

    return `${earliest} - ${latest}`;
  };

  // 熱門商品統計（排除退款）
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

  const popularItems = getPopularItems(allDayRecords);
  const groupedRecords = groupRecordsByTable(displayRecords);

  return (
    <div className="min-h-screen bg-gray-100">
      <Header
        title="Sasuga POS系統"
        subtitle="營業紀錄"
        currentPage="history"
        onMenuSelect={onMenuSelect}
      />

      <div className="p-4 space-y-4">
        {/* 日期選擇和檢視模式 */}
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
            </div>
            <div className="flex space-x-2">
              {/* 顯示模式切換 */}
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

        {/* 當日統計卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {activeDayRecords.length}
            </div>
            <div className="text-sm text-gray-600">筆訂單</div>
          </div>
          <div className="bg-white rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {dayItemCount}
            </div>
            <div className="text-sm text-gray-600">項商品</div>
          </div>
          <div className="bg-white rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">
              ${dayTotal}
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
              {activeDayRecords.length > 0
                ? Math.round(dayTotal / activeDayRecords.length)
                : 0}
            </div>
            <div className="text-sm text-gray-600">平均桌單價</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* 熱門商品（排除退款） */}
          <div className="bg-white rounded-lg p-4">
            <h3 className="text-lg font-bold mb-3">熱門商品 TOP 5</h3>
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
                        ${item.price}/ä»½
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 詳細記錄（排除退款） */}
          <div className="bg-white rounded-lg p-4">
            <h3 className="text-lg font-bold mb-3">詳細記錄</h3>
            {activeDayRecords.length === 0 ? (
              <div className="text-center text-gray-500 py-4">暫無資料</div>
            ) : (
              <div className="space-y-4">
                {["table", "takeout"].map((type) => {
                  const typeRecords = activeDayRecords.filter(
                    (r) => r.type === type
                  );
                  const typeTotal = typeRecords.reduce(
                    (sum, r) => sum + r.total,
                    0
                  );
                  const percentage =
                    dayTotal > 0 ? Math.round((typeTotal / dayTotal) * 100) : 0;

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

          {/* 付款方式統計（排除退款） */}
          <div className="bg-white rounded-lg p-4">
            <h3 className="text-lg font-bold mb-3">付款方式統計</h3>
            {activeDayRecords.length === 0 ? (
              <div className="text-center text-gray-500 py-4">暫無資料</div>
            ) : (
              <div className="space-y-4">
                {["cash", "linepay"].map((method) => {
                  const methodRecords = activeDayRecords.filter(
                    (r) => r.paymentMethod === method
                  );
                  const methodTotal = methodRecords.reduce(
                    (sum, r) => sum + r.total,
                    0
                  );
                  const percentage =
                    dayTotal > 0
                      ? Math.round((methodTotal / dayTotal) * 100)
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
          {refundedDayRecords.length > 0 && (
            <div className="bg-white rounded-lg p-4">
              <h3 className="text-lg font-bold mb-3 text-red-600">退款統計</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">退款筆數</span>
                  <span className="font-bold text-red-600">
                    {refundedDayRecords.length} 筆
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
                    {allDayRecords.length > 0
                      ? Math.round(
                          (refundedDayRecords.length / allDayRecords.length) *
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

        {/* 詳細記錄 */}

        <div className="bg-white rounded-lg p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-bold">
              詳細記錄 {displayMode === "grouped" ? "(同桌訂單)" : "(詳細檢視)"}
            </h3>
            {/* 顯示/隱藏退款訂單切換 */}
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
            // 群組
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
                          <div className="text-sm opacity-90">(已刪除退款)</div>
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
                                  已退款 {record.refundDate} {record.refundTime}
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
            // 群組外詳細列表
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
                            {record.itemCount} 項商品
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
