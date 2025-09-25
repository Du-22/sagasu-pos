/**
 * 認證成功處理工具函數
 * 處理登入成功後的狀態設定邏輯
 *
 * 用途：
 * - 將被 hooks/useAuth.js 的 handleLoginSuccess 調用
 * - 處理登入成功後的認證狀態設定
 */

/**
 * setAuthSuccess - 設定登入成功狀態
 *
 * 原始功能：在原檔案 handleLoginSuccess 中設定登入成功的 token 和時間戳
 * 效果：清除失敗記錄，設定認證 token 和過期時間
 * 用途：會被 useAuth hook 的 handleLoginSuccess 函數調用
 */
export const setAuthSuccess = () => {
  try {
    // 清除登入失敗記錄
    localStorage.removeItem("loginAttempts");
    localStorage.removeItem("accountLockUntil");

    // 設定認證成功標記和時間戳（24小時有效）
    const expirationTime = Date.now() + 24 * 60 * 60 * 1000;
    localStorage.setItem("authToken", "authenticated");
    localStorage.setItem("authExpiration", expirationTime.toString());
  } catch (error) {
    console.error("設定認證狀態失敗:", error);
  }
};
