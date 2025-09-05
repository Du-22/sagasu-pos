import React from "react";
import TableButton from "../UI/TableButton";
import Timer from "../UI/Timer";

const seatingData = {
  // 1F: 矩形房間，外帶區在左上角，桌子沿著牆邊排列
  "1F": [
    { id: "1F-1", x: 12, y: 40, size: "medium" }, // 左上角
    { id: "1F-2", x: 12, y: 78, size: "medium" }, // 左下角
    { id: "1F-3", x: 37, y: 78, size: "medium" }, // 2桌右邊
    { id: "1F-4", x: 62, y: 78, size: "medium" }, // 3桌右邊
    { id: "1F-5", x: 87, y: 78, size: "medium" }, // 最右下角
  ],
  // 2F: 分兩房間
  "2F": [
    // 左房間：中間1桌，三邊各1桌，總共4桌
    { id: "2F-1", x: 25, y: 25, size: "medium" }, // 中央桌
    { id: "2F-2", x: 10, y: 45, size: "medium" }, // 左邊牆
    { id: "2F-3", x: 25, y: 70, size: "medium" }, // 下邊牆
    { id: "2F-4", x: 40, y: 45, size: "medium" }, // 右邊牆

    // 右房間：4、5桌對齊，6桌是大桌
    { id: "2F-5", x: 60, y: 45, size: "medium" }, // 右房間左側，貼牆
    { id: "2F-6", x: 75, y: 45, size: "medium" }, // 右房間中間，與5桌對齊
    { id: "2F-7", x: 90, y: 45, size: "large" }, // 右房間大桌，間隔較大
  ],
};

const TakeoutPanel = ({
  takeoutOrders = [],
  timers = {},
  onTakeoutClick,
  onNewTakeout,
}) => {
  return (
    <div className="w-1/5 bg-white border-l-2 border-b-2 border-t-2 border-r-2 border-gray-300 flex flex-col h-[605px]">
      {/* 外帶標題 */}
      <div className="p-4 border-b bg-orange-50">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-orange-600">外帶訂單</h3>
          <button
            onClick={onNewTakeout}
            className="bg-orange-500 text-white px-3 py-1 rounded-lg text-sm hover:bg-orange-600"
          >
            新增外帶
          </button>
        </div>
      </div>

      {/* 外帶訂單列表 */}
      <div className="flex-1 p-4 overflow-y-auto">
        {Object.keys(takeoutOrders).length === 0 ? (
          <div className="text-gray-500 text-center mt-8">尚無外帶訂單</div>
        ) : (
          <div className="space-y-3">
            {Object.entries(takeoutOrders).map(([takeoutId, orderData]) => {
              const total = (orderData.items || []).reduce(
                (sum, item) => sum + item.price * item.quantity,
                0
              );
              const isPaid = orderData.paid;

              return (
                <div
                  key={takeoutId}
                  onClick={() => onTakeoutClick(takeoutId)}
                  className={`p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                    isPaid
                      ? "bg-green-50 border-green-300 hover:bg-green-100"
                      : "bg-orange-50 border-orange-300 hover:bg-orange-100"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-sm">外帶 #{takeoutId}</div>
                    <div className="flex items-center space-x-2">
                      <Timer startTime={timers[takeoutId]} />
                      <div
                        className={`text-xs px-2 py-1 rounded ${
                          isPaid
                            ? "bg-green-200 text-green-700"
                            : "bg-orange-200 text-orange-700"
                        }`}
                      >
                        {isPaid ? "已結帳" : "待結帳"}
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 text-sm text-gray-600">
                    {(orderData.items || []).length} 項商品
                  </div>

                  <div className="mt-1 font-bold text-orange-600">${total}</div>

                  <div className="mt-1 text-xs text-gray-500">
                    {new Date(orderData.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

const SeatingArea = ({
  currentFloor,
  orders,
  takeoutOrders,
  timers,
  onTableClick,
  onTakeoutClick,
  onNewTakeout,
}) => {
  // 新增：入座狀態判斷
  const getTableStatus = (tableId) => {
    const tableBatches = orders[tableId];

    // 新增：如果有 __seated 標記，回傳 seated
    if (
      tableBatches &&
      Array.isArray(tableBatches) &&
      tableBatches.length === 1 &&
      tableBatches[0] &&
      tableBatches[0][0] &&
      tableBatches[0][0].__seated
    ) {
      return "seated";
    }

    if (
      !tableBatches ||
      !Array.isArray(tableBatches) ||
      tableBatches.length === 0
    ) {
      return "available";
    }

    const hasUnpaidItems = tableBatches.some((batch) => {
      if (!Array.isArray(batch)) return false;
      return batch.some((item) => item && !item.paid);
    });

    if (hasUnpaidItems) return "occupied";

    const hasPaidItems = tableBatches.some((batch) => {
      if (!Array.isArray(batch)) return false;
      return batch.some((item) => item && item.paid);
    });

    if (hasPaidItems) return "ready-to-clean";
    return "available";
  };

  // 根據樓層決定容器樣式
  const getContainerStyle = () => {
    if (currentFloor === "1F") {
      // 1F: 左側座位區 + 右側外帶區
      return {
        containerClass: "flex",
        seatingClass:
          "flex-1 bg-white rounded-lg shadow-sm h-[605px] relative border-2 border-gray-300 mr-8",
      };
    } else {
      // 2F: 只有座位區
      return {
        containerClass: "flex",
        seatingClass:
          "flex-1 bg-white rounded-lg shadow-sm h-[620px] relative border-2 border-gray-300",
      };
    }
  };

  const { containerClass, seatingClass } = getContainerStyle();

  return (
    <div className="relative px-6 flex-1 flex flex-col">
      {/* 2F 區域分隔線 */}
      {currentFloor === "2F" && (
        <div
          className="absolute top-0 left-1/2 w-0.5 h-[620px] bg-gray-400"
          style={{ zIndex: 10 }}
        ></div>
      )}
      <div className={containerClass + " flex-1 flex"}>
        {/* 座位區域 */}
        <div className={seatingClass} style={{ overflowY: "auto" }}>
          {/* 1F 外帶區域標示 */}
          {/* {currentFloor === "1F" && (
            <div className="absolute top-4 left-4 w-20 h-12 border-2 border-orange-400 rounded flex items-center justify-center bg-orange-50">
              <div className="text-xs text-center font-medium text-orange-600">
                外帶
              </div>
            </div>
          )} */}

          <div className="relative w-full h-[600px] bg-white">
            {/* 這裡渲染所有 TableButton */}
            {seatingData[currentFloor].map((table) => (
              <TableButton
                key={table.id}
                table={table}
                status={getTableStatus(table.id)}
                onClick={onTableClick}
                startTime={timers[table.id]}
              />
            ))}
          </div>
        </div>

        {/* 外帶面板（只在 1F 顯示） */}
        {currentFloor === "1F" && (
          <TakeoutPanel
            takeoutOrders={takeoutOrders}
            timers={timers}
            onTakeoutClick={onTakeoutClick}
            onNewTakeout={onNewTakeout}
          />
        )}
      </div>

      {/* 圖例：新增入座 */}
      <div
        className="absolute left-0 bottom-0 w-full flex justify-center space-x-6 bg-gray-100 py-8"
        style={{ zIndex: 20 }}
      >
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-blue-200 border border-blue-400 rounded-full"></div>
          <span className="text-sm">空桌</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-green-200 border-green-400 rounded-full"></div>
          <span className="text-sm">入座</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-purple-200 border-purple-400 rounded-full"></div>
          <span className="text-sm">用餐中</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-yellow-200 border-yellow-400 rounded-full animate-pulse"></div>
          <span className="text-sm">待清理</span>
        </div>
      </div>
    </div>
  );
};

export { seatingData };
export default SeatingArea;
