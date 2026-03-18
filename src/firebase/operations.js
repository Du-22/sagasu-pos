/**
 * Firebase Operations - 向下相容層
 * 
 * 此檔案用於保持向下相容性，重新匯出所有已拆分的模組
 * 
 * 注意：
 * - 這是一個過渡性檔案
 * - 新程式碼應該直接從對應的模組 import
 * - 舊程式碼可以繼續使用這個檔案而不需修改
 * 
 * 原始檔案已備份為 operations.legacy.js
 */

// 從新的模組中重新匯出所有函數
export * from './menu';
export * from './tables';
export * from './orders';
export * from './sales';
export * from './users';
