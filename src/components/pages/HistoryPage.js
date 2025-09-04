import React, { useState } from "react";
import Header from "../UI/Header";

const HistoryPage = ({ salesHistory, onBack, onMenuSelect }) => {
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
  const [viewMode, setViewMode] = useState("daily"); // 'daily', 'weekly', 'monthly'

  console.log("selectedDate", selectedDate);
  console.log(
    "salesHistory",
    salesHistory.map((r) => r.date)
  );

  // 過濾選中日期的記錄
  const dayRecords = salesHistory.filter(
    (record) => record.date === selectedDate
  );
  const dayTotal = dayRecords.reduce((sum, record) => sum + record.total, 0);
  const dayItemCount = dayRecords.reduce(
    (sum, record) => sum + record.itemCount,
    0
  );

  // 計算熱門商品
  const getPopularItems = (records) => {
    const itemStats = {};
    records.forEach((record) => {
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

  const popularItems = getPopularItems(dayRecords);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 標題列 */}
      <Header
        title="Sasuga POS系統"
        subtitle="營業記錄"
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
            </div>
            <div className="flex space-x-2">
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {dayRecords.length}
            </div>
            <div className="text-sm text-gray-600">筆訂單</div>
          </div>
          <div className="bg-white rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {dayItemCount}
            </div>
            <div className="text-sm text-gray-600">項商品</div>
          </div>
          <div className="bg-white rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">
              ${dayTotal}
            </div>
            <div className="text-sm text-gray-600">營業額</div>
          </div>
          <div className="bg-white rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">
              {dayRecords.length > 0
                ? Math.round(dayTotal / dayRecords.length)
                : 0}
            </div>
            <div className="text-sm text-gray-600">平均桌單價</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* 熱門商品 */}
          <div className="bg-white rounded-lg p-4">
            <h3 className="text-lg font-bold mb-3">熱門商品 TOP 5</h3>
            {popularItems.length === 0 ? (
              <div className="text-center text-gray-500 py-4">暫無數據</div>
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

          {/* 訂單類型分析 */}
          <div className="bg-white rounded-lg p-4">
            <h3 className="text-lg font-bold mb-3">訂單類型分析</h3>
            {dayRecords.length === 0 ? (
              <div className="text-center text-gray-500 py-4">暫無數據</div>
            ) : (
              <div className="space-y-4">
                {["table", "takeout"].map((type) => {
                  const typeRecords = dayRecords.filter((r) => r.type === type);
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

          {/* 付款方式統計 */}
          <div className="bg-white rounded-lg p-4">
            <h3 className="text-lg font-bold mb-3">付款方式統計</h3>
            {dayRecords.length === 0 ? (
              <div className="text-center text-gray-500 py-4">暫無數據</div>
            ) : (
              <div className="space-y-4">
                {["cash", "linepay"].map((method) => {
                  const methodRecords = dayRecords.filter(
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
                            method === "cash"
                              ? "bg-blue-500"
                              : method === "credit_card"
                              ? "bg-orange-500"
                              : "bg-green-500"
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
        </div>

        {/* 詳細記錄 */}
        <div className="bg-white rounded-lg p-4">
          <h3 className="text-lg font-bold mb-3">詳細記錄</h3>
          {dayRecords.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              {selectedDate} 無營業記錄
            </div>
          ) : (
            <div className="space-y-3">
              {dayRecords
                .sort((a, b) => b.timestamp - a.timestamp)
                .map((record) => (
                  <div
                    key={record.id}
                    className="border rounded-lg p-3 hover:bg-gray-50"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center space-x-3">
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
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-green-600">
                          ${record.total}
                        </span>
                        <div className="text-sm text-gray-600">
                          {record.itemCount} 項商品
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-gray-700">
                      {record.items.map((item, index) => (
                        <span key={index}>
                          {item.name} x{item.quantity}
                          {/* 顯示客製選項 */}
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
    </div>
  );
};

export default HistoryPage;
