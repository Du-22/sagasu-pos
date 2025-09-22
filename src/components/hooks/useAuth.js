/**
 * useAuth - 認證管理自定義 Hook
 * 管理使用者認證狀態和相關操作
 *
 * 用途：
 * - 被 CafePOSSystem 主組件調用
 * - 提供認證狀態和認證相關的所有操作函數
 * - 整合所有認證邏輯，讓主組件保持簡潔
 */

/* eslint-disable no-undef */

import { useState, useEffect } from "react";
import { clearAuthData, isTokenValid } from "../../utils/authStorage";
import {
  handleLoginSuccess,
  handleLoginFailure,
} from "../../utils/loginHandler";
import {
  handleGoToChangePassword,
  handlePasswordChanged,
} from "../../utils/authNavigation";
import { initializeDefaultPassword } from "../../firebase/operations";

const useAuth = () => {
  // 認證相關狀態
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginState, setLoginState] = useState("login"); // "login" | "failed" | "locked"
  const [loginError, setLoginError] = useState(null);

  /**
   * initializeAuth - 初始化認證狀態
   *
   * 原始功能：在原檔案的 useEffect 中檢查是否有有效的登入狀態
   * 效果：檢查 token 有效性，初始化預設密碼
   * 用途：在 Hook 載入時自動執行，設定初始認證狀態
   */
  const initializeAuth = async () => {
    try {
      // 檢查是否有有效的 token
      const tokenValid = isTokenValid();

      if (tokenValid) {
        setIsAuthenticated(true);
        setLoginState("login");
      } else {
        // 清除過期的認證資料
        clearAuthData();

        // 初始化預設密碼（如果需要的話）
        try {
          const defaultPassword = await initializeDefaultPassword();
          if (defaultPassword) {
            console.log("預設密碼初始化完成");
          }
        } catch (error) {
          console.error("初始化預設密碼失敗:", error);
          // 不阻擋登入流程
        }
      }
    } catch (error) {
      console.error("認證系統初始化失敗:", error);
      // 發生錯誤時保持未登入狀態
      setIsAuthenticated(false);
    }
  };

  /**
   * resetLoginState - 重置登入狀態
   *
   * 功能：將登入狀態重置為初始狀態，清除錯誤訊息
   * 效果：設定 loginState 為 "login"，清空 loginError
   * 用途：被 LoginFailurePage 的重試和返回按鈕調用
   */
  const resetLoginState = () => {
    setLoginState("login");
    setLoginError(null);
  };

  /**
   * handleLogout - 處理登出
   *
   * 原始功能：在原檔案中清除認證資料、重置狀態、回到登入頁面
   * 效果：清除所有認證相關的本地儲存，重置認證狀態
   * 用途：被登出按鈕或自動登出機制調用
   */
  const handleLogout = () => {
    // 清除所有驗證相關的本地儲存
    clearAuthData();

    // 重置狀態
    setIsAuthenticated(false);
    setLoginState("login");
    setLoginError(null);

    console.log("使用者已登出");
  };

  // 包裝 loginHandler 的函數，傳入狀態設定函數
  const wrappedHandleLoginSuccess = (password) => {
    return handleLoginSuccess(
      password,
      setLoginError,
      setLoginState,
      setIsAuthenticated
    );
  };

  const wrappedHandleLoginFailure = (error) => {
    handleLoginFailure(error, setLoginError, setLoginState);
  };

  // 暫時移除導航函數，直接返回空函數避免錯誤
  // TODO: 修正 setCurrentView 傳遞問題後恢復完整功能
  const wrappedHandleGoToChangePassword = () => {
    console.warn("修改密碼頁面跳轉功能暫時停用");
    alert("修改密碼功能暫時不可用，請聯絡系統管理員");
  };

  const wrappedHandlePasswordChanged = () => {
    console.warn("密碼修改後跳轉功能暫時停用");
    alert("密碼已成功更改");
  };

  // 在組件載入時初始化認證狀態
  useEffect(() => {
    initializeAuth();
  }, []);

  return {
    // 認證狀態
    isAuthenticated,
    loginState,
    loginError,
    resetLoginState,

    // 認證操作
    handleLoginSuccess: wrappedHandleLoginSuccess,
    handleLoginFailure: wrappedHandleLoginFailure,
    handleLogout,
    resetLoginState,

    // 導航操作 (需要外部提供 setCurrentView)
    handleGoToChangePassword: wrappedHandleGoToChangePassword,
    handlePasswordChanged: wrappedHandlePasswordChanged,
  };
};

export default useAuth;
