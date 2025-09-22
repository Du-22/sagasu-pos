/**
 * 帳戶鎖定管理工具函數
 * 處理登入失敗計數和帳戶鎖定相關邏輯
 *
 * 用途：
 * - 將被 hooks/useAuth.js 的 handleLoginSuccess 調用
 * - 處理帳戶鎖定和登入失敗的業務邏輯
 */

/**
 * checkLockStatus - 檢查帳戶是否被鎖定
 *
 * 原始功能：在原檔案的 handleLoginSuccess 中用來檢查登入嘗試次數和鎖定狀態
 * 效果：檢查 localStorage 中的鎖定資料，計算剩餘鎖定時間
 * 用途：會被 useAuth hook 的 handleLoginSuccess 函數調用
 *
 * @returns {Object} { isLocked: boolean, timeLeft: number }
 */
export const checkLockStatus = () => {
  try {
    const lockData = localStorage.getItem("accountLockUntil");
    if (!lockData) {
      return { isLocked: false, timeLeft: 0 };
    }

    const lockUntil = parseInt(lockData);
    const now = Date.now();

    if (now >= lockUntil) {
      // 鎖定時間已過，清除鎖定狀態
      localStorage.removeItem("accountLockUntil");
      localStorage.removeItem("loginAttempts");
      return { isLocked: false, timeLeft: 0 };
    }

    const timeLeft = lockUntil - now;
    return { isLocked: true, timeLeft };
  } catch (error) {
    console.error("檢查鎖定狀態失敗:", error);
    return { isLocked: false, timeLeft: 0 };
  }
};

/**
 * handleLoginFailureUtil - 處理登入失敗的計數和鎖定邏輯
 *
 * 原始功能：在原檔案 handleLoginSuccess 中處理密碼錯誤時的邏輯
 * 效果：增加失敗次數，達到上限時鎖定帳戶 5 分鐘
 * 用途：會被 useAuth hook 的 handleLoginSuccess 函數調用
 *
 * @returns {Object} { isLocked: boolean, attemptsLeft: number, lockUntil: number }
 */
export const handleLoginFailureUtil = () => {
  try {
    const maxAttempts = 3;
    const lockDuration = 5 * 60 * 1000; // 5分鐘

    // 取得目前失敗次數
    let attempts = parseInt(localStorage.getItem("loginAttempts") || "0");
    attempts += 1;
    localStorage.setItem("loginAttempts", attempts.toString());

    const attemptsLeft = maxAttempts - attempts;

    if (attempts >= maxAttempts) {
      // 鎖定帳戶
      const lockUntil = Date.now() + lockDuration;
      localStorage.setItem("accountLockUntil", lockUntil.toString());

      return {
        isLocked: true,
        attemptsLeft: 0,
        lockUntil,
      };
    }

    return {
      isLocked: false,
      attemptsLeft,
      lockUntil: null,
    };
  } catch (error) {
    console.error("處理登入失敗失敗:", error);
    return {
      isLocked: false,
      attemptsLeft: 0,
      lockUntil: null,
    };
  }
};
