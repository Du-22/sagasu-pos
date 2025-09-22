/**
 * 認證頁面導航工具函數
 * 處理認證相關的頁面跳轉和導航邏輯
 *
 * 用途：
 * - 被 hooks/useAuth.js 調用
 * - 被主組件的頁面路由邏輯使用
 * - 提供認證流程中的頁面導航功能
 */

/**
 * handleGoToChangePassword - 跳轉到修改密碼頁面
 *
 * 原始功能：在原檔案中設定 currentView 為修改密碼頁面
 * 效果：導航到密碼修改頁面
 * 用途：被帳戶管理頁面的修改密碼按鈕調用
 *
 * @param {Function} setCurrentView - 設定當前頁面視圖的函數
 */
export const handleGoToChangePassword = (setCurrentView) => {
  setCurrentView("changepassword");
};

/**
 * handlePasswordChanged - 密碼修改成功後的處理
 *
 * 原始功能：在原檔案中顯示成功訊息並回到帳戶管理頁面
 * 效果：顯示成功提示，導航回帳戶管理頁面
 * 用途：被 ChangePasswordPage 組件的成功回調調用
 *
 * @param {Function} setCurrentView - 設定當前頁面視圖的函數
 */
export const handlePasswordChanged = (setCurrentView) => {
  alert("密碼已成功更改");
  setCurrentView("account");
};
