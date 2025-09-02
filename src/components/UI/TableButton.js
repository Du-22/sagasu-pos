import React from "react";

const TableButton = ({ table, status, onClick }) => {
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

  const getTableColor = (status) => {
    switch (status) {
      case "available":
        return "bg-green-200 border-green-400 hover:bg-green-300";
      case "occupied":
        return "bg-red-200 border-red-400 hover:bg-red-300";
      case "ready-to-clean":
        return "bg-yellow-200 border-yellow-400 hover:bg-yellow-300";
      default:
        return "bg-gray-200 border-gray-400";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "available":
        return "空桌";
      case "occupied":
        return "用餐中";
      case "ready-to-clean":
        return "待清理";
      default:
        return "";
    }
  };

  return (
    <button
      onClick={() => onClick(table.id)}
      className={`absolute border-2 rounded-full ${getTableSizeClass(
        table.size
      )} ${getTableColor(status)} 
        flex items-center justify-center font-bold text-xs transition-all duration-200
        ${status === "ready-to-clean" ? "animate-pulse" : ""}`}
      style={{
        left: `${table.x}%`,
        top: `${table.y}%`,
        transform: "translate(-50%, -50%)",
      }}
      title={`${table.id} - ${getStatusText(status)}`}
    >
      {table.id.split("-")[1]}
    </button>
  );
};

export default TableButton;
