import React from "react";

/**
 * OperationFeedback
 *
 * 原始程式碼：定義在 CafePOSSystem.js 主 return 的 inline JSX
 * 功能效果：在畫面頂部顯示操作結果訊息（成功/警告/錯誤），會自動消失
 * 用途：獨立為可重用元件，讓 CafePOSSystem.js 不含 JSX
 * 組件長度：約 25 行
 */
const OperationFeedback = ({ feedback }) => {
  if (!feedback.show) return null;

  const colorClass =
    feedback.severity === "error"
      ? "bg-red-500 text-white"
      : feedback.severity === "warning"
        ? "bg-yellow-500 text-black"
        : "bg-green-500 text-white";

  return (
    <div
      className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2 rounded shadow-lg
    transition-all duration-300 ease-in-out
    ${feedback.show ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"}
    ${colorClass}`}
    >
      {feedback.message}
    </div>
  );
};

export default OperationFeedback;
