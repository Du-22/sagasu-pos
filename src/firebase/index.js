/**
 * Firebase API 統一匯出檔案
 * 
 * 用途：
 * - 提供單一入口匯出所有 Firebase 操作
 * - 方便其他模組引用
 * - 保持向下相容
 * 
 * 使用方式：
 * import { getMenuData, saveTableState } from './api/firebase';
 */

// 選單相關操作
export {
  getMenuData,
  saveMenuData,
  getCachedMenu,
  clearMenuCache,
} from './menu';

// 桌位狀態相關操作
export {
  getTableStates,
  saveTableState,
  updateTableState,
  deleteTableState,
  getTableState,
  debugSaveTableState,
  debugGetTableStates,
  subscribeToTables,
} from './tables';

// 訂單相關操作（外帶）
export {
  getTakeoutOrders,
  saveTakeoutOrders,
  saveTakeoutOrder,
  updateTakeoutOrder,
  deleteTakeoutOrder,
  clearAllTakeoutOrders,
  batchUpdateTakeoutOrders,
  subscribeToTakeoutOrders,
} from './orders';

// 銷售記錄相關操作
export {
  getSalesHistoryByDate,
  getAllSalesHistory,
  getSalesHistory,
  addSalesRecord,
  updateSalesRecord,
  deleteSalesRecord,
  getSalesRecord,
  getRecentSalesHistory,
  getSalesStatistics,
} from './sales';

// 使用者認證相關操作
export {
  getAuthSettings,
  setAuthPassword,
  verifyPassword,
  changeAuthPassword,
  initializeDefaultPassword,
  needsPasswordSetup,
  logLoginAttempt,
  getRecentLoginLogs,
  getSecurityQuestion,
  setSecurityQuestion,
  verifySecurityAnswer,
  needsSecuritySetup,
  updateSecurityQuestion,
  resetPasswordWithSecurity,
} from './users';
