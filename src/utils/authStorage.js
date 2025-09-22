/**
 * 認證資料存取的工具函數
 * 這些是純函數，專門處理 localStorage 的認證資料讀寫
 *
 * 用途：
 * - 將被 hooks/useAuth.js 調用
 * - 可被任何需要檢查認證狀態的組件直接使用
 * - 提供認證資料的存取和驗證
 */

/**
 * clearAuthData - 清除所有認證相關資料
 *
 * 原始功能：在原檔案 handleLogout 中清除認證資料
 * 效果：移除 localStorage 中的所有認證相關資料
 * 用途：會被 useAuth hook 的 handleLogout 函數調用，也可被其他組件用於登出操作
 */
export const clearAuthData = () => {
  try {
    // 清除認證相關的所有資料
    localStorage.removeItem("authToken");
    localStorage.removeItem("authExpiration");
    localStorage.removeItem("loginAttempts");
    localStorage.removeItem("accountLockUntil");

    console.log("✅ 認證資料已清除");
  } catch (error) {
    console.error("清除認證資料失敗:", error);
  }
};

/**
 * isTokenValid - 檢查認證 token 是否有效
 *
 * 原始功能：在原檔案 initializeAuth 中檢查是否有有效的登入狀態
 * 效果：檢查 localStorage 中的 token 和過期時間，自動清除過期資料
 * 用途：會被 useAuth hook 的 initializeAuth 函數調用，也可被路由守衛等組件使用
 *
 * @returns {boolean} token 是否有效
 */
export const isTokenValid = () => {
  try {
    const token = localStorage.getItem("authToken");
    const expiration = localStorage.getItem("authExpiration");

    if (!token || !expiration) {
      return false;
    }

    const expirationTime = parseInt(expiration);
    const now = Date.now();

    if (now >= expirationTime) {
      // Token 已過期，清除資料
      clearAuthData();
      return false;
    }

    return token === "authenticated";
  } catch (error) {
    console.error("檢查 token 有效性失敗:", error);
    return false;
  }
};
