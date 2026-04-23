/**
 * 智慧連線監測組件（省額度版本）
 *
 * 設計原則：
 * 1. 優先使用瀏覽器原生 API（零成本）
 * 2. 只在必要時才實際連接 Firebase
 * 3. 快取連線狀態，避免重複檢測
 *
 * 不會自動定時檢測 Firebase！
 *
 * 組件長度：約 400 行
 */

import React, { useState, useEffect, useCallback } from "react";
import { db } from "../firebase/config";
import { collection, getDocs, limit, query } from "firebase/firestore";

/**
 * 連線狀態組件（省額度版本）
 *
 * 特色：
 * - 主要依靠瀏覽器的 online/offline 事件（免費）
 * - 顯示最近一次成功連線時間
 * - 提供手動測試按鈕
 * - 只在操作失敗時才自動檢測
 */
export const SmartConnectionMonitor = ({
  autoCheckOnMount = true, // 初始載入時檢測一次
  showIndicator = true, // 是否顯示指示器
}) => {
  // ==================== 狀態管理 ====================
  const [networkOnline, setNetworkOnline] = useState(navigator.onLine); // 瀏覽器網路狀態
  const [firebaseConnected, setFirebaseConnected] = useState(null); // null = 未知, true/false
  const [lastCheckTime, setLastCheckTime] = useState(null);
  const [lastSuccessTime, setLastSuccessTime] = useState(null);
  const [latency, setLatency] = useState(null);
  const [isTesting, setIsTesting] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [errorDetails, setErrorDetails] = useState("");

  // ==================== 從本地存儲載入狀態 ====================
  useEffect(() => {
    // 載入上次成功連線時間
    const savedSuccessTime = localStorage.getItem(
      "lastSuccessfulFirebaseConnection"
    );
    if (savedSuccessTime) {
      setLastSuccessTime(new Date(savedSuccessTime));
    }
  }, []);

  // ==================== Firebase 連線測試（只在需要時執行）====================
  const testFirebaseConnection = useCallback(async () => {
    // 如果瀏覽器都沒網路，就不用測試了
    if (!navigator.onLine) {
      setFirebaseConnected(false);
      return {
        success: false,
        message: "瀏覽器偵測到網路離線",
        latency: null,
      };
    }

    setIsTesting(true);
    setErrorDetails("");
    const startTime = Date.now();

    try {
      // ⚠️ 這裡會消耗 1 次 Firestore 讀取額度
      // 所以只在必要時才呼叫這個函數！
      console.log("🔍 測試 Firebase 連線...");

      const testRef = collection(db, "stores");
      const testQuery = query(testRef, limit(1));
      await getDocs(testQuery);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // 成功連線
      setFirebaseConnected(true);
      setLatency(responseTime);
      setLastCheckTime(new Date());
      setLastSuccessTime(new Date());

      // 儲存成功時間到本地
      localStorage.setItem(
        "lastSuccessfulFirebaseConnection",
        new Date().toISOString()
      );
      localStorage.setItem("lastFirebaseLatency", responseTime);

      console.log(`✅ Firebase 連線成功 (延遲: ${responseTime}ms)`);

      return {
        success: true,
        message: responseTime < 1000 ? "連線正常" : "連線較慢",
        latency: responseTime,
      };
    } catch (error) {
      console.error("❌ Firebase 連線失敗:", error);

      setFirebaseConnected(false);
      setLastCheckTime(new Date());

      // 分析錯誤類型
      let errorMsg = "無法連接到 Firebase";
      if (error.code === "permission-denied") {
        errorMsg = "權限不足，請重新登入";
      } else if (error.code === "unavailable") {
        errorMsg = "Firebase 服務暫時無法使用";
      } else if (error.message.includes("network")) {
        errorMsg = "網路連線問題";
      }

      setErrorDetails(errorMsg);

      return {
        success: false,
        message: errorMsg,
        latency: null,
      };
    } finally {
      setIsTesting(false);
    }
  }, []);

  // ==================== 監聽瀏覽器網路事件（免費！）====================
  useEffect(() => {
    const handleOnline = () => {
      console.log("🌐 瀏覽器偵測到網路恢復");
      setNetworkOnline(true);

      // 網路恢復時，自動測試一次 Firebase 連線
      testFirebaseConnection();
    };

    const handleOffline = () => {
      console.log("🌐 瀏覽器偵測到網路斷線");
      setNetworkOnline(false);
      setFirebaseConnected(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [testFirebaseConnection]);

  // ==================== 初始載入時檢測一次 ====================
  useEffect(() => {
    if (autoCheckOnMount) {
      // 延遲 500ms 後再檢測，避免影響頁面載入
      const timer = setTimeout(() => {
        testFirebaseConnection();
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [autoCheckOnMount, testFirebaseConnection]);

  // ==================== 計算連線狀態 ====================
  const getConnectionStatus = () => {
    if (!networkOnline) {
      return {
        status: "offline",
        color: "#EF4444", // 紅色
        icon: "🔴",
        text: "網路離線",
        description: "瀏覽器偵測到網路斷線",
      };
    }

    if (firebaseConnected === null) {
      return {
        status: "unknown",
        color: "#9CA3AF", // 灰色
        icon: "⚪",
        text: "未知",
        description: "尚未測試 Firebase 連線",
      };
    }

    if (isTesting) {
      return {
        status: "testing",
        color: "#3B82F6", // 藍色
        icon: "🔵",
        text: "測試中...",
        description: "正在檢測 Firebase 連線",
      };
    }

    if (!firebaseConnected) {
      return {
        status: "error",
        color: "#EF4444", // 紅色
        icon: "🔴",
        text: "Firebase 離線",
        description: errorDetails || "無法連接到 Firebase",
      };
    }

    // Firebase 連線成功
    if (latency < 1000) {
      return {
        status: "good",
        color: "#10B981", // 綠色
        icon: "🟢",
        text: "連線正常",
        description: `延遲: ${latency}ms`,
      };
    } else if (latency < 3000) {
      return {
        status: "slow",
        color: "#F59E0B", // 黃色
        icon: "🟡",
        text: "連線較慢",
        description: `延遲: ${latency}ms（建議稍後再試）`,
      };
    } else {
      return {
        status: "verySlow",
        color: "#F59E0B", // 橙色
        icon: "🟠",
        text: "連線很慢",
        description: `延遲: ${latency}ms（不建議進行重要操作）`,
      };
    }
  };

  const connectionStatus = getConnectionStatus();

  // ==================== 時間格式化 ====================
  const formatTime = (date) => {
    if (!date) return "從未";
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return "剛才";
    if (diff < 3600000) return `${Math.floor(diff / 60000)} 分鐘前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小時前`;
    return `${Math.floor(diff / 86400000)} 天前`;
  };

  // ==================== 渲染 ====================
  if (!showIndicator) {
    return null;
  }

  return (
    <div className="fixed top-4 right-40 z-50">
      {/* 簡易指示器 */}
      <div
        className="flex items-center gap-2 bg-ivory rounded-lg shadow-lg px-3 py-2 cursor-pointer hover:shadow-xl transition-shadow"
        onClick={() => setShowDetails(!showDetails)}
      >
        {/* 狀態圖示 */}
        <div
          className="w-3 h-3 rounded-full animate-pulse"
          style={{ backgroundColor: connectionStatus.color }}
          title={connectionStatus.description}
        />

        {/* 狀態文字 */}
        <span className="text-sm font-medium text-warm-charcoal">
          {connectionStatus.text}
        </span>

        {/* 展開/收合圖示 */}
        <span className="text-warm-silver text-xs">{showDetails ? "▲" : "▼"}</span>
      </div>

      {/* 詳細資訊面板 */}
      {showDetails && (
        <div className="mt-2 bg-ivory rounded-lg shadow-xl p-4 min-w-[300px]">
          <div className="space-y-3">
            {/* 標題 */}
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-warm-dark">連線狀態</h3>
              <button
                onClick={() => setShowDetails(false)}
                className="text-warm-silver hover:text-warm-olive"
              >
                ✕
              </button>
            </div>

            {/* 瀏覽器網路狀態 */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-warm-olive">瀏覽器網路:</span>
              <span
                className={
                  networkOnline
                    ? "text-terracotta font-medium"
                    : "text-error-warm font-medium"
                }
              >
                {networkOnline ? "✓ 在線" : "✗ 離線"}
              </span>
            </div>

            {/* Firebase 連線狀態 */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-warm-olive">Firebase:</span>
              <span
                className="font-medium"
                style={{ color: connectionStatus.color }}
              >
                {connectionStatus.text}
              </span>
            </div>

            {/* 延遲時間 */}
            {latency !== null && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-warm-olive">延遲:</span>
                <span className="text-warm-dark font-medium">{latency} ms</span>
              </div>
            )}

            {/* 最後檢測時間 */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-warm-olive">最後檢測:</span>
              <span className="text-warm-stone">{formatTime(lastCheckTime)}</span>
            </div>

            {/* 最後成功時間 */}
            {lastSuccessTime && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-warm-olive">最後成功:</span>
                <span className="text-warm-stone">
                  {formatTime(lastSuccessTime)}
                </span>
              </div>
            )}

            {/* 錯誤訊息 */}
            {errorDetails && (
              <div className="text-xs text-error-warm bg-error-warm/10 p-2 rounded">
                {errorDetails}
              </div>
            )}

            {/* 測試按鈕 */}
            <button
              onClick={testFirebaseConnection}
              disabled={isTesting}
              className={`w-full py-2 rounded-lg font-medium text-sm transition-colors ${
                isTesting
                  ? "bg-gray-300 text-warm-stone cursor-not-allowed"
                  : "bg-terracotta text-ivory hover:bg-terracotta-dark"
              }`}
            >
              {isTesting ? "測試中..." : "🔄 測試連線"}
            </button>

            {/* 說明文字 */}
            <div className="text-xs text-warm-stone pt-2 border-t">
              <p>💡 提示：</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>綠色 = 連線正常</li>
                <li>黃色 = 連線較慢</li>
                <li>紅色 = 無法連線</li>
              </ul>
              <p className="mt-2 text-warm-silver">
                ⚠️ 點擊「測試連線」會使用 1 次 Firebase 讀取額度
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Hook 版本：用於在其他組件中使用
 *
 * 使用範例：
 * const { testConnection, status } = useConnectionStatus();
 *
 * // 在儲存失敗時檢測
 * catch (error) {
 *   const result = await testConnection();
 *   if (!result.success) {
 *     alert('網路連線異常，請稍後再試');
 *   }
 * }
 */
export const useConnectionStatus = () => {
  const [status, setStatus] = useState({
    networkOnline: navigator.onLine,
    firebaseConnected: null,
    lastCheckTime: null,
    latency: null,
  });

  const testConnection = useCallback(async () => {
    if (!navigator.onLine) {
      return { success: false, message: "網路離線" };
    }

    const startTime = Date.now();

    try {
      const testRef = collection(db, "stores");
      const testQuery = query(testRef, limit(1));
      await getDocs(testQuery);

      const latency = Date.now() - startTime;

      setStatus({
        networkOnline: true,
        firebaseConnected: true,
        lastCheckTime: new Date(),
        latency,
      });

      return { success: true, latency };
    } catch (error) {
      setStatus({
        networkOnline: navigator.onLine,
        firebaseConnected: false,
        lastCheckTime: new Date(),
        latency: null,
      });

      return { success: false, message: error.message };
    }
  }, []);

  useEffect(() => {
    const handleOnline = () =>
      setStatus((s) => ({ ...s, networkOnline: true }));
    const handleOffline = () =>
      setStatus((s) => ({
        ...s,
        networkOnline: false,
        firebaseConnected: false,
      }));

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return {
    ...status,
    testConnection,
  };
};

export default SmartConnectionMonitor;
