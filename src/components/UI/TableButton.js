import React from "react";
import Timer from "./Timer";

const TableButton = ({ table, status, onClick, startTime }) => {
  const getTableSizeClass = (size) => {
    switch (size) {
      case "small":
        return "w-8 h-8";
      case "medium":
        return "w-24 h-24";
      case "large":
        return "w-[150px] h-[150px]";
      default:
        return "w-10 h-10";
    }
  };

  // 新增入座狀態顏色
  const getTableColor = (status) => {
    switch (status) {
      case "available":
        return "bg-blue-200 border-blue-400 hover:bg-blue-300";
      case "seated":
        return "bg-green-200 border-green-400 hover:bg-green-300";
      case "occupied":
        return "bg-purple-200 border-purple-400 hover:bg-purple-300";
      case "ready-to-clean":
        return "bg-yellow-200 border-yellow-400 hover:bg-yellow-300";
      default:
        return "bg-gray-200 border-gray-400";
    }
  };

  // 新增入座狀態文字
  const getStatusText = (status) => {
    switch (status) {
      case "available":
        return "空桌";
      case "seated":
        return "入座";
      case "occupied":
        return "用餐中";
      case "ready-to-clean":
        return "待清理";
      default:
        return "";
    }
  };

  return (
    <div
      className="absolute"
      style={{
        left: `${table.x}%`,
        top: `${table.y}%`,
        transform: "translate(-50%, -50%)",
        zIndex: 1,
        width:
          table.size === "large"
            ? "150px"
            : table.size === "medium"
            ? "96px"
            : "32px",
        height:
          table.size === "large"
            ? "150px"
            : table.size === "medium"
            ? "96px"
            : "32px",
      }}
    >
      <button
        onClick={() => onClick(table.id)}
        className={`border-2 rounded-full w-full h-full ${getTableColor(
          status
        )} 
      flex items-center justify-center font-bold text-xs transition-all duration-200
      ${status === "ready-to-clean" ? "animate-pulse" : ""}`}
        title={`${table.id} - ${getStatusText(status)}`}
        style={{ zIndex: 2 }}
      >
        {table.id.split("-")[1]}
      </button>
      {/* Timer 用絕對定位在 div 下方 */}
      {status !== "available" && startTime && (
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "100%",
            transform: "translate(-50%, 0)",
            marginTop: "2px",
            zIndex: 3,
          }}
        >
          <Timer
            startTime={startTime}
            className="bg-black text-white px-2 py-0.5 rounded text-xs"
          />
        </div>
      )}
      {console.log(table.id, status, startTime)}
    </div>
  );
};

export default TableButton;
