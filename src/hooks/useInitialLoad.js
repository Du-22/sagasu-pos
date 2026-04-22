import { useState, useEffect } from "react";
import {
  getMenuData,
  getTableStates,
  getTakeoutOrders,
  getSalesHistoryByDate,
} from "../firebase/operations";

/**
 * useInitialLoad Hook
 *
 * 原始程式碼：定義在 CafePOSSystem.js 的 loadAllData useEffect 與相關輔助函數
 * 功能效果：應用程式啟動時載入所有資料，包含 localStorage 快取、Firebase 資料
 * 用途：封裝初始載入邏輯，讓主元件只需讀取 isLoading/loadError 狀態
 *
 * 菜單載入策略（重要）：
 * - Firebase 為「唯一真實來源」。讀取成功就用 Firebase（即使是空陣列也尊重）
 * - localStorage 僅在 Firebase 讀取失敗時作為「唯讀 fallback」
 * - 絕對不把 localStorage 的品項寫回 Firebase（避免被刪除的品項被復活）
 * - 離線新增的品項由 Firestore SDK 的 persistentLocalCache 負責 queue，上線後自動同步
 *
 * loadFromLocalStorage：桌位/訂單/歷史的離線備用方案，Firebase 整體載入失敗時呼叫
 */

const useInitialLoad = ({
  dataManager,
  setMenuData,
  setTableStates,
  setTakeoutOrders,
  setSalesHistory,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // 輔助函數：從訂單推斷桌位狀態（僅供 loadFromLocalStorage 使用）
  const getTableStatusFromOrders = (orders) => {
    if (!orders || orders.length === 0) return "available";

    const hasSeatedMarker = orders.some((item) => item && item.__seated);
    if (hasSeatedMarker) return "seated";

    const hasUnpaidItems = orders.some(
      (item) => item && !item.__seated && item.paid === false,
    );
    if (hasUnpaidItems) return "occupied";

    const hasPaidItems = orders.some(
      (item) => item && !item.__seated && item.paid === true,
    );
    return hasPaidItems ? "ready-to-clean" : "available";
  };

  // 離線備用：從 localStorage 還原資料（Firebase 載入失敗時呼叫）
  const loadFromLocalStorage = () => {
    try {
      const savedHistory = localStorage.getItem("cafeSalesHistory");
      if (savedHistory) {
        setSalesHistory(JSON.parse(savedHistory));
      }

      const savedOrders = localStorage.getItem("cafeOrders");
      const savedTimers = localStorage.getItem("cafeTimers");
      if (savedOrders && savedTimers) {
        const orders = JSON.parse(savedOrders);
        const timers = JSON.parse(savedTimers);

        // 將舊格式轉換為新格式
        const convertedTableStates = {};
        Object.keys(orders).forEach((tableId) => {
          convertedTableStates[tableId] = {
            orders: orders[tableId],
            startTime: timers[tableId] || Date.now(),
            status: getTableStatusFromOrders(orders[tableId]),
            updatedAt: new Date().toISOString(),
          };
        });
        setTableStates(convertedTableStates);
      }

      const savedTakeoutOrders = localStorage.getItem("cafeTakeoutOrders");
      if (savedTakeoutOrders) {
        setTakeoutOrders(JSON.parse(savedTakeoutOrders));
      }
    } catch (error) {
      console.error("載入 localStorage 備份數據失敗:", error);
    }
  };

  useEffect(() => {
    const loadAllData = async () => {
      setIsLoading(true);
      setLoadError(null);

      try {
        // ==================== 1. 檢查 localStorage 快取 ====================
        const savedHistory = localStorage.getItem("cafeSalesHistory");
        let hasCachedData = false;

        if (savedHistory) {
          try {
            const parsed = JSON.parse(savedHistory);
            if (parsed && Array.isArray(parsed) && parsed.length > 0) {
              setSalesHistory(parsed);
              hasCachedData = true;
            }
          } catch (e) {
            console.warn("⚠️ localStorage 銷售記錄解析失敗:", e);
          }
        }

        // ==================== 2. 載入必要資料 ====================
        const [
          firebaseMenuData,
          firebaseTableStates,
          firebaseTakeoutOrders,
          recentSalesHistory,
        ] = await Promise.all([
          getMenuData(),
          getTableStates(),
          getTakeoutOrders(),
          hasCachedData
            ? Promise.resolve(null)
            : (async () => {
                const today = new Date();
                const thirtyDaysAgo = new Date(today);
                thirtyDaysAgo.setDate(today.getDate() - 30);
                const endDate = today.toISOString().split("T")[0];
                const startDate = thirtyDaysAgo.toISOString().split("T")[0];
                return getSalesHistoryByDate(startDate, endDate);
              })(),
        ]);

        // ==================== 3. 菜單載入（Firebase 為唯一真實來源）====================
        //
        // 歷史背景：
        // 之前採「精細版逐品項合併」—— 會比對 localStorage 與 Firebase 的時間戳，
        // 本地較新就寫回 Firebase。這設計原意是防止資料遺失，但意外造成兩個問題：
        //   1. 刪除的品項只要 localStorage 有殘留，下次載入就會被「救回來」（殭屍品項）
        //   2. 每次載入會刷新 localStorage 時間戳，讓它幾乎永遠比 Firebase 新 →
        //      觸發整份菜單被重寫回 Firebase，製造大量不必要的寫入
        //
        // 新策略：
        //   - Firebase 回傳非 null：以 Firebase 為準（即使空陣列也尊重，不從本地救回）
        //   - Firebase 回傳 null（讀取失敗）：localStorage 作唯讀 fallback，不寫回
        //
        // 離線編輯不會遺失：Firestore SDK 的 persistentLocalCache（config.js）會把
        // 離線期間的寫入 queue 在 IndexedDB，網路恢復後自動補送，不需要本層額外處理。
        let finalMenuData = [];

        if (firebaseMenuData !== null) {
          finalMenuData = Array.isArray(firebaseMenuData)
            ? [...firebaseMenuData]
            : [];
          console.log(`☁️  Firebase 菜單載入: ${finalMenuData.length} 個品項`);

          try {
            localStorage.setItem(
              "cafeMenuData_backup",
              JSON.stringify({
                data: finalMenuData,
                timestamp: new Date().toISOString(),
                version: "v3_firebase_first",
              }),
            );
          } catch (backupError) {
            console.warn("⚠️ 更新本地備份失敗（不影響主流程）:", backupError);
          }
        } else {
          console.warn("⚠️ Firebase 菜單讀取失敗，改用 localStorage 唯讀 fallback");
          try {
            const localBackup = localStorage.getItem("cafeMenuData_backup");
            if (localBackup) {
              const parsed = JSON.parse(localBackup);
              if (Array.isArray(parsed.data)) {
                finalMenuData = parsed.data;
                console.log(
                  `📱 使用本地備份: ${finalMenuData.length} 個品項 (備份時間 ${parsed.timestamp})`,
                );
              }
            }
          } catch (fallbackError) {
            console.error("❌ 本地備份讀取失敗:", fallbackError);
          }
        }

        finalMenuData.sort((a, b) => (a.order || 0) - (b.order || 0));
        setMenuData(finalMenuData);
        console.log(`✅ 菜單載入完成，共 ${finalMenuData.length} 個品項`);

        // ==================== 4. 設置桌位與外帶資料 ====================
        const loadedTableStates = firebaseTableStates || {};
        const validationResult = dataManager.validateTableData(loadedTableStates);
        if (validationResult.warnings.length > 0) {
          console.warn("桌位數據警告:", validationResult.warnings);
        }
        if (validationResult.errors.length > 0) {
          console.error("桌位數據錯誤:", validationResult.errors);
        }

        setTableStates(loadedTableStates);
        setTakeoutOrders(firebaseTakeoutOrders || {});

        // ==================== 5. 設置銷售歷史 ====================
        if (!hasCachedData && recentSalesHistory) {
          setSalesHistory(recentSalesHistory);
          localStorage.setItem(
            "cafeSalesHistory",
            JSON.stringify(recentSalesHistory),
          );
        } else if (!hasCachedData) {
          setSalesHistory([]);
        }
      } catch (error) {
        console.error("❌ 載入數據失敗:", error);
        setLoadError("載入數據失敗，請檢查網路連線");
        loadFromLocalStorage();
      } finally {
        setIsLoading(false);
      }
    };

    loadAllData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { isLoading, loadError };
};

export default useInitialLoad;
