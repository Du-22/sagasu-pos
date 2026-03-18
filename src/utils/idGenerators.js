/**
 * ID 生成工具函數
 *
 * 原始程式碼：定義在 CafePOSSystem.js 中
 * 功能效果：產生唯一的歷史記錄 ID 和訂單群組 ID
 * 用途：確保每筆銷售記錄和訂單群組都有唯一識別碼
 * 組件長度：20 行
 */

/**
 * 產生歷史記錄唯一 ID
 * 格式：H + 日期(8碼) + 時間戳毫秒 + 4碼隨機英數
 * 範例：H20260318171234567890ABCD
 */
export const generateHistoryId = () => {
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0].replace(/-/g, "");
  const timeStr = now.getTime().toString();
  const randomStr = Math.random().toString(36).substr(2, 4).toUpperCase();
  return `H${dateStr}${timeStr}${randomStr}`;
};

/**
 * 產生訂單群組 ID（用於關聯同一桌的多次結帳記錄）
 * 格式：G + 日期(8碼) + 時間(6碼) + 2碼隨機英數
 * 範例：G20260318171234AB
 */
export const generateGroupId = () => {
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0].replace(/-/g, "");
  const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, "");
  const randomStr = Math.random().toString(36).substr(2, 2).toUpperCase();
  return `G${dateStr}${timeStr}${randomStr}`;
};
