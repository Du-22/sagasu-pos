import React from "react";
import Timer from "./Timer";

const TableButton = ({ table, status, onClick, startTime }) => {
  // 新增入座狀態顏色（Claude 暖色系）
  const getTableColor = (status) => {
    switch (status) {
      case "available":
        // 空桌：米色（Warm Sand），邀請感
        return "bg-warm-sand border-warm-cream hover:bg-parchment text-warm-charcoal";
      case "seated":
        // 入座：淺赤陶，剛開始
        return "bg-terracotta-light/30 border-terracotta-light hover:bg-terracotta-light/50 text-warm-charcoal";
      case "occupied":
        // 用餐中：完整赤陶色，進行中
        return "bg-terracotta/70 border-terracotta hover:bg-terracotta/90 text-ivory";
      case "ready-to-clean":
        // 待清理：暖炭色半透明，需要注意
        return "bg-warm-charcoal/30 border-warm-olive hover:bg-warm-charcoal/50 text-warm-charcoal";
      default:
        return "bg-warm-sand border-warm-cream text-warm-charcoal";
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
    </div>
  );
};

export default TableButton;
