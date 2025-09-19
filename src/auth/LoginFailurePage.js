import React, { useState, useEffect } from "react";
import { AlertTriangle, Clock, Shield, Wifi, ArrowLeft } from "lucide-react";

const LoginFailurePage = ({
  attemptsLeft,
  isLocked,
  lockUntil,
  onRetry,
  onBackToLogin,
  errorInfo, // 新增參數，包含詳細錯誤資訊
}) => {
  const [timeRemaining, setTimeRemaining] = useState(0);

  useEffect(() => {
    if (isLocked && lockUntil) {
      const updateTimer = () => {
        const now = Date.now();
        const remaining = Math.max(0, Math.ceil((lockUntil - now) / 1000));
        setTimeRemaining(remaining);

        if (remaining === 0) {
          // 自動返回登入頁面
          setTimeout(() => {
            onBackToLogin();
          }, 1000);
        }
      };

      updateTimer();
      const timer = setInterval(updateTimer, 1000);
      return () => clearInterval(timer);
    }
  }, [isLocked, lockUntil, onBackToLogin]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  // 根據錯誤類型選擇圖示和顏色
  const getErrorDisplay = () => {
    if (isLocked) {
      return {
        icon: <Shield className="w-16 h-16 text-red-500" />,
        bgColor: "bg-red-50",
        borderColor: "border-red-200",
        titleColor: "text-red-800",
        title: "帳戶已鎖定",
      };
    }

    switch (errorInfo?.type) {
      case "password":
        return {
          icon: <AlertTriangle className="w-16 h-16 text-yellow-500" />,
          bgColor: "bg-yellow-50",
          borderColor: "border-yellow-200",
          titleColor: "text-yellow-800",
          title: "密碼錯誤",
        };
      case "system":
        return {
          icon: <Wifi className="w-16 h-16 text-blue-500" />,
          bgColor: "bg-blue-50",
          borderColor: "border-blue-200",
          titleColor: "text-blue-800",
          title: "系統異常",
        };
      default:
        return {
          icon: <AlertTriangle className="w-16 h-16 text-red-500" />,
          bgColor: "bg-red-50",
          borderColor: "border-red-200",
          titleColor: "text-red-800",
          title: "登入失敗",
        };
    }
  };

  const errorDisplay = getErrorDisplay();

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div
          className={`bg-white rounded-xl shadow-lg p-8 border ${errorDisplay.borderColor}`}
        >
          {/* 錯誤圖示 */}
          <div className="text-center mb-6">
            <div
              className={`w-20 h-20 ${errorDisplay.bgColor} rounded-full flex items-center justify-center mx-auto mb-4`}
            >
              {errorDisplay.icon}
            </div>
            <h1 className={`text-2xl font-bold ${errorDisplay.titleColor}`}>
              {errorDisplay.title}
            </h1>
          </div>

          {/* 主要錯誤訊息 */}
          <div className="text-center mb-6">
            <p className="text-gray-800 font-medium mb-2">
              {errorInfo?.message ||
                (isLocked ? "帳戶暫時被鎖定" : "登入驗證失敗")}
            </p>
            <p className="text-gray-600 text-sm">
              {errorInfo?.userMessage || "請檢查您的密碼後重新嘗試"}
            </p>
          </div>

          {/* 鎖定倒數計時 */}
          {isLocked && timeRemaining > 0 && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center justify-center">
                <Clock className="w-5 h-5 text-red-600 mr-2" />
                <span className="text-red-800 font-medium">
                  解鎖倒數: {formatTime(timeRemaining)}
                </span>
              </div>
              <p className="text-red-600 text-xs text-center mt-2">
                系統將自動解鎖，請稍後重新登入
              </p>
            </div>
          )}

          {/* 剩餘嘗試次數（非鎖定狀態） */}
          {!isLocked && attemptsLeft > 0 && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-800 text-center">
                <span className="font-medium">
                  剩餘嘗試次數: {attemptsLeft}
                </span>
              </p>
              <p className="text-yellow-600 text-xs text-center mt-1">
                連續失敗3次將鎖定帳戶5分鐘
              </p>
            </div>
          )}

          {/* 技術資訊（系統錯誤時顯示） */}
          {errorInfo?.type === "system" && errorInfo?.technicalInfo && (
            <div className="mb-6 p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <details>
                <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-800">
                  技術資訊 (點擊展開)
                </summary>
                <p className="text-xs text-gray-500 mt-2 font-mono bg-gray-100 p-2 rounded">
                  {errorInfo.technicalInfo}
                </p>
              </details>
            </div>
          )}

          {/* 操作按鈕 */}
          <div className="space-y-3">
            {!isLocked ? (
              <button
                onClick={onRetry}
                className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                重新嘗試
              </button>
            ) : timeRemaining === 0 ? (
              <button
                onClick={onBackToLogin}
                className="w-full py-3 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                返回登入頁面
              </button>
            ) : (
              <button
                disabled
                className="w-full py-3 px-4 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed font-medium"
              >
                等待解鎖中...
              </button>
            )}

            <button
              onClick={onBackToLogin}
              disabled={isLocked && timeRemaining > 0}
              className={`w-full py-2 px-4 border rounded-lg transition-colors font-medium ${
                isLocked && timeRemaining > 0
                  ? "border-gray-200 text-gray-400 cursor-not-allowed"
                  : "border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              返回登入頁面
            </button>
          </div>

          {/* 幫助提示 */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="text-blue-800 font-medium text-sm mb-2">
              需要幫助？
            </h4>
            <ul className="text-blue-700 text-xs space-y-1">
              <li>• 確認密碼輸入是否正確（注意大小寫）</li>
              <li>• 檢查網路連線狀態</li>
              <li>• 如問題持續，請聯絡技術支援</li>
              {errorInfo?.type === "system" && (
                <li>• 嘗試重新整理頁面或清除瀏覽器快取</li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginFailurePage;
