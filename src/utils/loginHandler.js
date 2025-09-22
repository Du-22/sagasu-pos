/**
 * 登入處理邏輯工具函數
 * 處理完整的登入流程，包含密碼驗證、錯誤處理、狀態設定
 *
 * 用途：
 * - 被 hooks/useAuth.js 調用
 * - 提供完整的登入和登入失敗處理邏輯
 * - 整合密碼驗證、帳戶鎖定檢查、錯誤處理等複雜邏輯
 */

import { checkLockStatus, handleLoginFailureUtil } from "./lockManager";
import { setAuthSuccess } from "./authHelpers";
import {
  verifyPassword,
  logLoginAttempt,
  initializeDefaultPassword,
} from "../../firebase/operations";

/**
 * handleLoginSuccess - 處理登入成功的邏輯
 *
 * 原始功能：在原檔案中驗證密碼、檢查帳戶鎖定狀態、設定登入成功狀態
 * 效果：完整的登入流程處理，包含密碼驗證、鎖定檢查、錯誤處理
 * 用途：被 useAuth hook 調用，處理使用者登入請求
 *
 * @param {string} password - 使用者輸入的密碼
 * @param {Function} setLoginError - 設定登入錯誤狀態的函數
 * @param {Function} setLoginState - 設定登入狀態的函數
 * @param {Function} setIsAuthenticated - 設定認證狀態的函數
 * @returns {Object|null} 如果需要設定安全問題則返回 { needsSecuritySetup: true }
 */
export const handleLoginSuccess = async (
  password,
  setLoginError,
  setLoginState,
  setIsAuthenticated
) => {
  try {
    // 檢查是否被鎖定
    const { isLocked, timeLeft } = checkLockStatus();
    if (isLocked) {
      setLoginError({
        type: "locked",
        attemptsLeft: 0,
        lockUntil: Date.now() + timeLeft,
        message: "連續錯誤3次，帳戶已鎖定5分鐘",
        userMessage: "請等待鎖定時間結束後再試，或聯絡店長協助",
      });
      setLoginState("locked");
      return;
    }

    // 驗證密碼
    let isValid = false;
    try {
      isValid = await verifyPassword(password);
    } catch (verifyError) {
      console.error("密碼驗證過程發生錯誤:", verifyError);

      // 根據錯誤類型提供具體訊息
      if (
        verifyError.message.includes("Firebase") ||
        verifyError.code?.includes("firebase")
      ) {
        setLoginError({
          type: "system",
          message: "系統連線異常",
          userMessage: "請檢查網路連線，或稍後再試。若問題持續，請聯絡技術支援",
          technicalInfo: verifyError.message,
        });
      } else if (
        verifyError.message.includes("auth") ||
        verifyError.message.includes("password")
      ) {
        setLoginError({
          type: "system",
          message: "密碼驗證系統異常",
          userMessage: "系統初始化失敗，請聯絡技術支援",
          technicalInfo: verifyError.message,
        });
      } else {
        setLoginError({
          type: "system",
          message: "未知系統錯誤",
          userMessage: "系統發生未預期錯誤，請聯絡技術支援",
          technicalInfo: verifyError.message,
        });
      }

      setLoginState("failed");
      return;
    }

    if (isValid) {
      // 設定登入成功狀態
      setAuthSuccess();

      // 檢查是否需要設定安全問題
      const { needsSecuritySetup } = await import("../../firebase/operations");
      const needsSetup = await needsSecuritySetup();

      if (needsSetup) {
        setIsAuthenticated(true); // 先設定為已驗證
        return { needsSecuritySetup: true };
      }

      // 記錄登入日誌（可選）
      try {
        await logLoginAttempt(true, navigator.userAgent);
      } catch (logError) {
        console.warn("登入日誌記錄失敗:", logError);
      }

      // 切換到已登入狀態
      setIsAuthenticated(true);
      setLoginState("login");
      setLoginError(null);
    } else {
      // 處理登入失敗邏輯
      const failureResult = handleLoginFailureUtil();

      // 記錄失敗日誌
      try {
        await logLoginAttempt(false, navigator.userAgent);
      } catch (logError) {
        console.warn("登入日誌記錄失敗:", logError);
      }

      // 根據剩餘次數提供不同訊息
      if (failureResult.isLocked) {
        setLoginError({
          type: "locked",
          attemptsLeft: 0,
          lockUntil: failureResult.lockUntil,
          message: "連續錯誤3次，帳戶已鎖定5分鐘",
          userMessage:
            "請等待鎖定時間結束，或確認密碼是否正確。如需協助請聯絡店長",
        });
        setLoginState("locked");
      } else {
        setLoginError({
          type: "password",
          attemptsLeft: failureResult.attemptsLeft,
          message: "密碼錯誤，請重新輸入",
          userMessage: `還有 ${failureResult.attemptsLeft} 次機會。請確認密碼是否正確，或嘗試使用忘記密碼功能`,
        });
        setLoginState("failed");
      }
    }
  } catch (error) {
    console.error("登入處理過程發生錯誤:", error);

    // 顯示通用錯誤訊息
    setLoginError({
      type: "system",
      attemptsLeft: 0,
      lockUntil: null,
      message: "系統錯誤",
      userMessage:
        "登入過程發生異常，請重新整理頁面後再試。若問題持續，請聯絡技術支援",
      technicalInfo: error.message,
    });
    setLoginState("failed");
  }
};

/**
 * handleLoginFailure - 處理登入失敗
 *
 * 原始功能：在原檔案中處理來自 LoginPage 組件的錯誤回調
 * 效果：處理 LoginPage 組件內部的錯誤，如網路錯誤、Firebase 連線失敗等
 * 用途：被 useAuth hook 調用，作為 LoginPage 組件的錯誤回調函數
 *
 * @param {Error} error - 錯誤物件
 * @param {Function} setLoginError - 設定登入錯誤狀態的函數
 * @param {Function} setLoginState - 設定登入狀態的函數
 */
export const handleLoginFailure = (error, setLoginError, setLoginState) => {
  console.error("登入失敗回調:", error);

  // 這個函數主要用於處理 LoginPage 組件內部的錯誤
  // 例如網路錯誤、Firebase 連線失敗等
  setLoginError({
    attemptsLeft: 0,
    lockUntil: null,
    message: "登入處理失敗，請檢查網路連線",
  });
  setLoginState("failed");
};
