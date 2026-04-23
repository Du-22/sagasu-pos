import React, { useState, useEffect } from "react";
import {
  Key,
  Clock,
  User,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import Header from "../UI/Header";

const AccountManagementPage = ({
  onBack,
  onMenuSelect,
  onChangePassword,
  onLogout,
}) => {
  const [loginLogs, setLoginLogs] = useState([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadLoginLogs();
  }, []);

  const loadLoginLogs = async () => {
    setIsLoadingLogs(true);
    setError("");

    try {
      // 動態 import Firebase 操作函數
      const { getRecentLoginLogs } = await import("../../firebase/operations");

      const logs = await getRecentLoginLogs(20); // 最近20筆記錄
      setLoginLogs(logs);
    } catch (err) {
      console.error("載入登入記錄失敗:", err);
      setError("無法載入登入記錄");
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const formatDateTime = (timestamp) => {
    if (!timestamp) return "未知時間";

    const date = new Date(timestamp);
    return date.toLocaleString("zh-TW", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZone: "Asia/Taipei",
    });
  };

  const getBrowserInfo = (userAgent) => {
    if (!userAgent) return "未知瀏覽器";

    // 簡單的瀏覽器識別
    if (userAgent.includes("Chrome")) return "Chrome";
    if (userAgent.includes("Firefox")) return "Firefox";
    if (userAgent.includes("Safari") && !userAgent.includes("Chrome"))
      return "Safari";
    if (userAgent.includes("Edge")) return "Edge";

    return "其他瀏覽器";
  };

  const getStatusColor = (success) => {
    return success
      ? "text-terracotta-dark bg-parchment border-warm-sand"
      : "text-error-warm bg-error-warm/10 border-error-warm/30";
  };

  const getStatusText = (success) => {
    return success ? "成功" : "失敗";
  };

  return (
    <div className="min-h-screen bg-parchment">
      <Header
        title="Sagasu POS系統"
        subtitle="帳戶管理"
        currentPage="account"
        onMenuSelect={onMenuSelect}
        onLogout={onLogout}
      />

      <div className="p-4 space-y-6">
        {/* 帳戶操作區域 */}
        <div className="bg-ivory rounded-lg p-6 shadow-whisper">
          <div className="flex items-center mb-4">
            <User className="w-6 h-6 text-terracotta mr-2" />
            <h2 className="text-xl font-bold text-anthropic-black">帳戶設定</h2>
          </div>

          <div className="space-y-4">
            {/* 更改密碼按鈕 */}
            <button
              onClick={onChangePassword}
              className="w-full flex items-center justify-between p-4 border rounded-lg hover:bg-parchment transition-colors"
            >
              <div className="flex items-center">
                <Key className="w-5 h-5 text-warm-olive mr-3" />
                <div className="text-left">
                  <div className="font-medium text-anthropic-black">更改密碼</div>
                  <div className="text-sm text-warm-stone">
                    修改登入密碼以確保帳戶安全
                  </div>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-warm-silver" />
            </button>

            {/* 未來可以加入更改安全問題的按鈕 */}
            {/* <button className="w-full flex items-center justify-between p-4 border rounded-lg hover:bg-parchment transition-colors opacity-50 cursor-not-allowed">
              <div className="flex items-center">
                <Shield className="w-5 h-5 text-warm-olive mr-3" />
                <div className="text-left">
                  <div className="font-medium text-anthropic-black">安全問題</div>
                  <div className="text-sm text-warm-stone">設定或更改安全問題（開發中）</div>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-warm-silver" />
            </button> */}
          </div>
        </div>

        {/* 登入記錄區域 */}
        <div className="bg-ivory rounded-lg p-6 shadow-whisper">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Clock className="w-6 h-6 text-terracotta mr-2" />
              <h2 className="text-xl font-bold text-anthropic-black">登入記錄</h2>
            </div>
            <button
              onClick={loadLoginLogs}
              disabled={isLoadingLogs}
              className="flex items-center px-3 py-2 text-sm bg-parchment text-terracotta rounded-lg hover:bg-warm-sand transition-colors disabled:opacity-50"
            >
              <RefreshCw
                className={`w-4 h-4 mr-1 ${
                  isLoadingLogs ? "animate-spin" : ""
                }`}
              />
              重新載入
            </button>
          </div>

          {/* 錯誤提示 */}
          {error && (
            <div className="mb-4 p-3 bg-error-warm/10 border border-error-warm/30 rounded-lg">
              <p className="text-error-warm text-sm">{error}</p>
            </div>
          )}

          {/* 載入中狀態 */}
          {isLoadingLogs ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-terracotta mx-auto mb-2"></div>
              <p className="text-warm-olive">載入登入記錄中...</p>
            </div>
          ) : loginLogs.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="text-warm-stone">暫無登入記錄</p>
            </div>
          ) : (
            <div className="space-y-3">
              {loginLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(
                        log.success
                      )}`}
                    >
                      {getStatusText(log.success)}
                    </span>
                    <div>
                      <div className="font-medium text-anthropic-black">
                        {formatDateTime(log.timestamp)}
                      </div>
                      <div className="text-sm text-warm-stone">
                        {getBrowserInfo(log.userAgent)}
                      </div>
                    </div>
                  </div>

                  {/* 如果是失敗的登入，可以加入更多資訊 */}
                  {!log.success && (
                    <div className="text-right">
                      <div className="text-xs text-error-warm">登入失敗</div>
                    </div>
                  )}
                </div>
              ))}

              {/* 顯示總記錄數 */}
              <div className="text-center pt-4 border-t">
                <p className="text-sm text-warm-stone">
                  顯示最近 {loginLogs.length} 筆記錄
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 系統資訊區域（可選） */}
        <div className="bg-ivory rounded-lg p-6 shadow-whisper">
          <h3 className="text-lg font-bold text-anthropic-black mb-3">系統資訊</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex justify-between">
              <span className="text-warm-olive">當前登入時間：</span>
              <span className="text-anthropic-black">
                {formatDateTime(Date.now())}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-warm-olive">瀏覽器：</span>
              <span className="text-anthropic-black">
                {getBrowserInfo(navigator.userAgent)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-warm-olive">系統版本：</span>
              <span className="text-anthropic-black">Sagasu POS v1.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-warm-olive">最後更新：</span>
              <span className="text-anthropic-black">2024年12月</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountManagementPage;
