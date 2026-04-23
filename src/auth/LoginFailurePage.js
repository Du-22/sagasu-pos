import React, { useState, useEffect } from "react";
import { AlertTriangle, Clock, Shield, Wifi } from "lucide-react";

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
        icon: <Shield className="w-16 h-16 text-error-warm" />,
        bgColor: "bg-error-warm/10",
        borderColor: "border-error-warm/30",
        titleColor: "text-error-warm",
        title: "帳戶已鎖定",
      };
    }

    switch (errorInfo?.type) {
      case "password":
        return {
          icon: <AlertTriangle className="w-16 h-16 text-warm-olive" />,
          bgColor: "bg-parchment",
          borderColor: "border-warm-sand",
          titleColor: "text-warm-dark",
          title: "密碼錯誤",
        };
      case "system":
        return {
          icon: <Wifi className="w-16 h-16 text-terracotta" />,
          bgColor: "bg-parchment",
          borderColor: "border-terracotta-light",
          titleColor: "text-terracotta-dark",
          title: "系統異常",
        };
      default:
        return {
          icon: <AlertTriangle className="w-16 h-16 text-error-warm" />,
          bgColor: "bg-error-warm/10",
          borderColor: "border-error-warm/30",
          titleColor: "text-error-warm",
          title: "登入失敗",
        };
    }
  };

  const errorDisplay = getErrorDisplay();

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div
          className={`bg-ivory rounded-xl shadow-lg p-8 border ${errorDisplay.borderColor}`}
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
            <p className="text-warm-dark font-medium mb-2">
              {errorInfo?.message ||
                (isLocked ? "帳戶暫時被鎖定" : "登入驗證失敗")}
            </p>
            <p className="text-warm-olive text-sm">
              {errorInfo?.userMessage || "請檢查您的密碼後重新嘗試"}
            </p>
          </div>

          {/* 鎖定倒數計時 */}
          {isLocked && timeRemaining > 0 && (
            <div className="mb-6 p-4 bg-error-warm/10 border border-error-warm/30 rounded-lg">
              <div className="flex items-center justify-center">
                <Clock className="w-5 h-5 text-error-warm mr-2" />
                <span className="text-error-warm font-medium">
                  解鎖倒數: {formatTime(timeRemaining)}
                </span>
              </div>
              <p className="text-error-warm text-xs text-center mt-2">
                系統將自動解鎖，請稍後重新登入
              </p>
            </div>
          )}

          {/* 剩餘嘗試次數（非鎖定狀態） */}
          {!isLocked && attemptsLeft > 0 && (
            <div className="mb-6 p-4 bg-parchment border border-warm-sand rounded-lg">
              <p className="text-warm-dark text-center">
                <span className="font-medium">
                  剩餘嘗試次數: {attemptsLeft}
                </span>
              </p>
              <p className="text-warm-olive text-xs text-center mt-1">
                連續失敗3次將鎖定帳戶5分鐘
              </p>
            </div>
          )}

          {/* 技術資訊（系統錯誤時顯示） */}
          {errorInfo?.type === "system" && errorInfo?.technicalInfo && (
            <div className="mb-6 p-3 bg-parchment border border-warm-cream rounded-lg">
              <details>
                <summary className="text-sm text-warm-olive cursor-pointer hover:text-warm-dark">
                  技術資訊 (點擊展開)
                </summary>
                <p className="text-xs text-warm-stone mt-2 font-mono bg-parchment p-2 rounded">
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
                className="w-full py-3 px-4 bg-terracotta-dark text-ivory rounded-lg hover:bg-terracotta-dark transition-colors font-medium"
              >
                重新嘗試
              </button>
            ) : timeRemaining === 0 ? (
              <button
                onClick={onBackToLogin}
                className="w-full py-3 px-4 bg-terracotta-dark text-ivory rounded-lg hover:bg-terracotta-dark transition-colors font-medium"
              >
                返回登入頁面
              </button>
            ) : (
              <button
                disabled
                className="w-full py-3 px-4 bg-gray-300 text-warm-stone rounded-lg cursor-not-allowed font-medium"
              >
                等待解鎖中...
              </button>
            )}

            <button
              onClick={onBackToLogin}
              disabled={isLocked && timeRemaining > 0}
              className={`w-full py-2 px-4 border rounded-lg transition-colors font-medium ${
                isLocked && timeRemaining > 0
                  ? "border-warm-cream text-warm-silver cursor-not-allowed"
                  : "border-warm-sand text-warm-charcoal hover:bg-parchment"
              }`}
            >
              返回登入頁面
            </button>
          </div>

          {/* 幫助提示 */}
          <div className="mt-6 p-4 bg-parchment border border-terracotta-light rounded-lg">
            <h4 className="text-terracotta-dark font-medium text-sm mb-2">
              需要幫助？
            </h4>
            <ul className="text-terracotta-dark text-xs space-y-1">
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
