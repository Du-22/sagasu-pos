import { useState, useEffect } from "react";
import { collection, doc, setDoc } from "firebase/firestore";
import { db } from "../../firebase/config";
import {
  getMenuData,
  getTableStates,
  getTakeoutOrders,
  getSalesHistoryByDate,
} from "../../firebase/operations";

/**
 * useInitialLoad Hook
 *
 * 原始程式碼：定義在 CafePOSSystem.js 的 loadAllData useEffect 與相關輔助函數
 * 功能效果：應用程式啟動時載入所有資料，包含 localStorage 快取、Firebase 資料、菜單合併邏輯
 * 用途：封裝初始載入邏輯，讓主元件只需讀取 isLoading/loadError 狀態
 * 組件長度：約 230 行
 *
 * 重要說明：
 * - 菜單合併採「精細版逐品項比對」：比較 localStorage 與 Firebase 的 lastUpdated 時間戳，取較新版本
 * - 若本地有 Firebase 沒有的品項（可能是離線新增），會自動同步回 Firebase
 * - loadFromLocalStorage 是離線備用方案，Firebase 載入失敗時才呼叫
 * - getTableStatusFromOrders 僅為 loadFromLocalStorage 服務，將舊格式 orders 轉換成狀態字串
 */

const STORE_ID = "default_store";

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

        // ==================== 3. 精細版菜單合併邏輯 ====================
        // 步驟 1: 讀取 localStorage 備份
        let localMenuMap = new Map();

        try {
          const localBackup = localStorage.getItem("cafeMenuData_backup");
          if (localBackup) {
            const parsed = JSON.parse(localBackup);
            const localMenuData = parsed.data;

            if (Array.isArray(localMenuData)) {
              localMenuData.forEach((item) => {
                if (item && item.id) {
                  localMenuMap.set(item.id, {
                    ...item,
                    _localTimestamp: new Date(parsed.timestamp),
                  });
                }
              });
              console.log(
                `📱 找到本地備份: ${localMenuMap.size} 個品項 (${parsed.timestamp})`,
              );
            }
          }
        } catch (error) {
          console.warn("⚠️ 本地備份讀取失敗:", error);
        }

        // 步驟 2: 建立 Firebase 數據的 Map
        let firebaseMenuMap = new Map();

        if (
          firebaseMenuData &&
          Array.isArray(firebaseMenuData) &&
          firebaseMenuData.length > 0
        ) {
          firebaseMenuData.forEach((item) => {
            if (item && item.id) {
              firebaseMenuMap.set(item.id, {
                ...item,
                _firebaseTimestamp: item.lastUpdated
                  ? new Date(item.lastUpdated)
                  : null,
              });
            }
          });
          console.log(`☁️  找到 Firebase 數據: ${firebaseMenuMap.size} 個品項`);
        }

        // 步驟 3: 逐個產品合併
        const mergedMenu = new Map();
        const needSync = [];
        let syncReasons = {
          newerLocal: 0,
          onlyLocal: 0,
          noFirebaseTime: 0,
          useFirebase: 0,
        };

        // 3.1 處理所有在 localStorage 中的產品
        for (const [id, localItem] of localMenuMap) {
          const firebaseItem = firebaseMenuMap.get(id);

          if (!firebaseItem) {
            const { _localTimestamp, ...cleanItem } = localItem;
            mergedMenu.set(id, cleanItem);
            needSync.push(cleanItem);
            syncReasons.onlyLocal++;
          } else {
            const localTime = localItem._localTimestamp;
            const firebaseTime = firebaseItem._firebaseTimestamp;

            if (!firebaseTime) {
              const { _localTimestamp, ...cleanItem } = localItem;
              mergedMenu.set(id, cleanItem);
              needSync.push(cleanItem);
              syncReasons.noFirebaseTime++;
            } else if (localTime > firebaseTime) {
              const { _localTimestamp, ...cleanItem } = localItem;
              mergedMenu.set(id, cleanItem);
              needSync.push(cleanItem);
              syncReasons.newerLocal++;
            } else {
              const { _firebaseTimestamp, ...cleanItem } = firebaseItem;
              mergedMenu.set(id, cleanItem);
              syncReasons.useFirebase++;
            }
          }
        }

        // 3.2 處理只在 Firebase 中的產品
        for (const [id, firebaseItem] of firebaseMenuMap) {
          if (!localMenuMap.has(id)) {
            const { _firebaseTimestamp, ...cleanItem } = firebaseItem;
            mergedMenu.set(id, cleanItem);
            syncReasons.useFirebase++;
          }
        }

        console.log(
          `📊 菜單合併：本地較新 ${syncReasons.newerLocal}、只在本地 ${syncReasons.onlyLocal}、Firebase 無時間戳 ${syncReasons.noFirebaseTime}、使用 Firebase ${syncReasons.useFirebase}`,
        );

        // 步驟 4: 同步需要更新的品項回 Firebase
        if (needSync.length > 0) {
          console.log(`🔄 需要同步 ${needSync.length} 個產品到 Firebase`);
          try {
            const syncPromises = needSync.map(async (item) => {
              const { id, ...itemData } = item;
              const menuRef = collection(db, "stores", STORE_ID, "menu");
              return setDoc(
                doc(menuRef, id),
                { ...itemData, lastUpdated: new Date().toISOString() },
                { merge: true },
              )
                .then(() => ({ success: true, id, name: item.name }))
                .catch((error) => ({ success: false, id, name: item.name, error }));
            });

            const results = await Promise.allSettled(syncPromises);
            const successCount = results.filter((r) => r.value?.success).length;
            console.log(`✅ 同步完成: ${successCount}/${needSync.length} 成功`);
          } catch (syncError) {
            console.warn("⚠️ 同步過程發生錯誤:", syncError);
          }
        }

        // 步驟 5: 轉換為陣列並排序
        const finalMenuData = Array.from(mergedMenu.values());
        finalMenuData.sort((a, b) => (a.order || 0) - (b.order || 0));
        setMenuData(finalMenuData);
        console.log(`✅ 菜單載入完成，共 ${finalMenuData.length} 個品項`);

        // 步驟 6: 更新 localStorage 備份
        try {
          localStorage.setItem(
            "cafeMenuData_backup",
            JSON.stringify({
              data: finalMenuData,
              timestamp: new Date().toISOString(),
              version: "v2_granular",
            }),
          );
        } catch (backupError) {
          console.warn("⚠️ 更新本地備份失敗:", backupError);
        }

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
