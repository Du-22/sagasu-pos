import React, { useState, useEffect } from "react";
import SeatingPage from "./components/seatingData/SeatingPage";
import OrderingPage from "./components/menuData/OrderingPage";
import HistoryPage from "./components/pages/HistoryPage";
import MenuEditorPage from "./components/pages/MenuEditorPage";
import defaultMenuData from "./components/menuData/defaultMenuData";
import { seatingData } from "./components/seatingData/SeatingArea";
import ExportReportsPage from "./components/pages/ExportReportsPage";
import LoginPage from "./auth/LoginPage";
import LoginFailurePage from "./auth/LoginFailurePage";
import ChangePasswordPage from "./auth/ChangePasswordPage";
import AccountManagementPage from "./components/pages/AccountManagementPage";
import SetupSecurityQuestionPage from "./auth/SetupSecurityQuestionPage";
import ForgotPasswordPage from "./auth/ForgotPasswordPage";
import useDataManager from "./components/hooks/useDataManager";
import SmartConnectionMonitor from "./utils/SmartConnectionMonitor";

// Firebase 操作函數 imports - 使用新版本
import {
  getMenuData,
  saveMenuData,
  getTableStates,
  getTakeoutOrders,
  getSalesHistoryByDate,
  addSalesRecord,
  updateSalesRecord,
} from "./firebase/operations";

// 🆕 Firebase Firestore 直接操作的 imports（精細版同步需要）
import { collection, doc, setDoc, getDocs } from "firebase/firestore";

// 🆕 Firebase config 和常數
import { db } from "./firebase/config";

import useAuth from "./components/hooks/useAuth";

// 🆕 STORE_ID 常數定義
const STORE_ID = "default_store";

const CafePOSSystem = () => {
  const [currentFloor, setCurrentFloor] = useState("1F");
  const [selectedTable, setSelectedTable] = useState(null);
  const [currentView, setCurrentView] = useState("seating");

  // 認證相關
  const {
    isAuthenticated,
    loginState,
    loginError,
    handleLoginSuccess,
    handleLoginFailure,
    handleLogout,
    handleGoToChangePassword,
    handlePasswordChanged,
    resetLoginState,
  } = useAuth(setCurrentView);

  // 數據結構：tableStates 包含 orders + timers + status
  const [tableStates, setTableStates] = useState({});

  const [currentOrder, setCurrentOrder] = useState([]);
  const [takeoutOrders, setTakeoutOrders] = useState({});
  const [nextTakeoutId, setNextTakeoutId] = useState(1);
  const [salesHistory, setSalesHistory] = useState([]);
  const [menuData, setMenuData] = useState(defaultMenuData);
  const [showMoveTableModal, setShowMoveTableModal] = useState(false);
  const [moveTableTarget, setMoveTableTarget] = useState("");

  // 入座相關狀態
  const [showSeatConfirmModal, setShowSeatConfirmModal] = useState(false);
  const [pendingSeatTable, setPendingSeatTable] = useState(null);

  // 載入狀態
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // 操作回饋狀態
  const [operationFeedback, setOperationFeedback] = useState({
    show: false,
    message: "",
    severity: "info",
  });

  // hook初始化
  const dataManager = useDataManager();

  useEffect(() => {}, [currentView, selectedTable]);

  // 從 Firebase 載入所有數據
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

        // ==================== 🆕 精細版菜單載入邏輯 ====================
        // 步驟 1: 讀取 localStorage 備份
        let localMenuMap = new Map(); // 使用 Map 方便查找

        try {
          const localBackup = localStorage.getItem("cafeMenuData_backup");
          if (localBackup) {
            const parsed = JSON.parse(localBackup);
            const localMenuData = parsed.data;

            if (Array.isArray(localMenuData)) {
              // 建立 Map: id -> {產品資料 + 時間戳}
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

        // 步驟 3: 逐個產品合併（精細版）
        const mergedMenu = new Map();
        const needSync = []; // 需要同步回 Firebase 的產品
        let syncReasons = {
          newerLocal: 0, // 本地較新
          onlyLocal: 0, // 只在本地
          noFirebaseTime: 0, // Firebase 無時間戳
          useFirebase: 0, // 使用 Firebase
        };

        // 3.1 處理所有在 localStorage 中的產品
        for (const [id, localItem] of localMenuMap) {
          const firebaseItem = firebaseMenuMap.get(id);

          if (!firebaseItem) {
            // 情況 A: Firebase 沒有這個產品（可能是新增的）
            console.log(`🆕 產品只存在本地: ${localItem.name} (${id})`);
            const { _localTimestamp, ...cleanItem } = localItem;
            mergedMenu.set(id, cleanItem);
            needSync.push(cleanItem);
            syncReasons.onlyLocal++;
          } else {
            // 情況 B: 兩邊都有，比較時間戳
            const localTime = localItem._localTimestamp;
            const firebaseTime = firebaseItem._firebaseTimestamp;

            if (!firebaseTime) {
              // Firebase 沒有時間戳，優先用本地
              console.log(
                `⚠️ ${localItem.name} Firebase 無時間戳，使用本地版本`,
              );
              const { _localTimestamp, ...cleanItem } = localItem;
              mergedMenu.set(id, cleanItem);
              needSync.push(cleanItem);
              syncReasons.noFirebaseTime++;
            } else if (localTime > firebaseTime) {
              // 本地較新
              const timeDiff = Math.round((localTime - firebaseTime) / 1000); // 秒
              console.log(
                `🔄 ${localItem.name} 本地較新 (相差 ${timeDiff} 秒)`,
              );
              const { _localTimestamp, ...cleanItem } = localItem;
              mergedMenu.set(id, cleanItem);
              needSync.push(cleanItem);
              syncReasons.newerLocal++;
            } else {
              // Firebase 較新或相同
              console.log(`✅ ${firebaseItem.name} 使用 Firebase 版本`);
              const { _firebaseTimestamp, ...cleanItem } = firebaseItem;
              mergedMenu.set(id, cleanItem);
              syncReasons.useFirebase++;
            }
          }
        }

        // 3.2 處理只在 Firebase 中的產品（本地沒有的）
        for (const [id, firebaseItem] of firebaseMenuMap) {
          if (!localMenuMap.has(id)) {
            console.log(
              `☁️  產品只存在 Firebase: ${firebaseItem.name} (${id})`,
            );
            const { _firebaseTimestamp, ...cleanItem } = firebaseItem;
            mergedMenu.set(id, cleanItem);
            syncReasons.useFirebase++;
          }
        }

        // 步驟 4: 顯示合併統計
        console.log("📊 合併統計:");
        console.log(`  - 本地較新: ${syncReasons.newerLocal} 個`);
        console.log(`  - 只在本地: ${syncReasons.onlyLocal} 個`);
        console.log(`  - Firebase 無時間戳: ${syncReasons.noFirebaseTime} 個`);
        console.log(`  - 使用 Firebase: ${syncReasons.useFirebase} 個`);
        console.log(`  - 總計: ${mergedMenu.size} 個品項`);

        // 步驟 5: 如果有需要同步的產品，同步回 Firebase
        if (needSync.length > 0) {
          console.log(`🔄 需要同步 ${needSync.length} 個產品到 Firebase`);

          try {
            // 使用 merge 模式逐個更新
            const syncPromises = needSync.map(async (item) => {
              const { id, ...itemData } = item;
              const menuRef = collection(db, "stores", STORE_ID, "menu");

              return setDoc(
                doc(menuRef, id),
                {
                  ...itemData,
                  lastUpdated: new Date().toISOString(),
                },
                { merge: true },
              )
                .then(() => {
                  console.log(`  ✅ 同步成功: ${item.name}`);
                  return { success: true, id, name: item.name };
                })
                .catch((error) => {
                  console.error(`  ❌ 同步失敗: ${item.name}`, error);
                  return { success: false, id, name: item.name, error };
                });
            });

            const results = await Promise.allSettled(syncPromises);
            const successCount = results.filter((r) => r.value?.success).length;
            const failCount = results.filter((r) => !r.value?.success).length;

            console.log(`✅ 同步完成: ${successCount}/${needSync.length} 成功`);

            if (failCount > 0) {
              console.warn(
                `⚠️ 有 ${failCount} 個產品同步失敗，但不影響本地使用`,
              );
            }
          } catch (syncError) {
            console.warn("⚠️ 同步過程發生錯誤:", syncError);
            // 不中斷載入流程，本地數據已經合併完成
          }
        } else {
          console.log("✅ 無需同步，Firebase 數據已是最新");
        }

        // 步驟 6: 處理沒有任何數據的情況
        if (mergedMenu.size === 0) {
          console.log("ℹ️ 目前無任何菜單數據，等待使用者手動新增");
          // 不再自動載入預設菜單，允許從空白開始
        }

        // 步驟 7: 轉換回陣列並設置
        const finalMenuData = Array.from(mergedMenu.values());

        // 按 order 排序（如果有的話）
        finalMenuData.sort((a, b) => (a.order || 0) - (b.order || 0));

        setMenuData(finalMenuData);
        console.log(`✅ 菜單載入完成，共 ${finalMenuData.length} 個品項`);

        // 步驟 8: 更新 localStorage 備份（使用最新合併結果）
        try {
          const backup = {
            data: finalMenuData,
            timestamp: new Date().toISOString(),
            version: "v2_granular",
          };
          localStorage.setItem("cafeMenuData_backup", JSON.stringify(backup));
          console.log("💾 已更新本地備份");
        } catch (backupError) {
          console.warn("⚠️ 更新本地備份失敗:", backupError);
        }

        // 設置桌位狀態...（後續邏輯保持不變）

        // 設置桌位狀態（新的整合數據）
        const loadedTableStates = firebaseTableStates || {};

        // 新增：使用新的驗證工具檢查數據完整性
        const validationResult =
          dataManager.validateTableData(loadedTableStates);
        if (validationResult.warnings.length > 0) {
          console.warn("桌位數據警告:", validationResult.warnings);
        }
        if (validationResult.errors.length > 0) {
          console.error("桌位數據錯誤:", validationResult.errors);
        }

        setTableStates(loadedTableStates);

        // 設置外帶訂單
        setTakeoutOrders(firebaseTakeoutOrders || {});

        // ==================== 3. 設置銷售歷史（如果沒有快取） ====================
        if (!hasCachedData && recentSalesHistory) {
          setSalesHistory(recentSalesHistory);
          // ✅ 儲存到 localStorage 供下次快速啟動
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
  }, []);

  useEffect(() => {
    // 特別檢查有入座標記的桌位
    Object.entries(tableStates).forEach(([tableId, state]) => {
      if (state.orders && state.orders.length > 0) {
        const firstBatch = state.orders[0];
        if (
          (firstBatch && firstBatch.__seated) ||
          (Array.isArray(firstBatch) && firstBatch[0] && firstBatch[0].__seated)
        ) {
        }
      }
    });
  }, [tableStates]);

  // 操作回饋處理
  const showOperationFeedback = (message, severity = "info") => {
    setOperationFeedback({ show: true, message, severity });
    setTimeout(() => {
      setOperationFeedback({ show: false, message: "", severity: "info" });
    }, 5000);
  };

  // ==================== 登入相關處理函數 ====================

  //登入檢查
  if (!isAuthenticated) {
    // 處理忘記密碼的頁面
    if (currentView === "forgotpassword") {
      return (
        <ForgotPasswordPage
          onBack={() => setCurrentView("login")}
          onResetSuccess={() => {
            alert("密碼重置成功！請使用新密碼登入");
            setCurrentView("login");
          }}
        />
      );
    }
    if (loginState === "failed" || loginState === "locked") {
      return (
        <LoginFailurePage
          attemptsLeft={loginError?.attemptsLeft || 0}
          isLocked={loginState === "locked"}
          lockUntil={loginError?.lockUntil}
          onRetry={() => resetLoginState()}
          onBackToLogin={() => resetLoginState()}
          errorInfo={loginError}
        />
      );
    } else {
      return (
        <LoginPage
          onLoginSuccess={handleLoginSuccess}
          onLoginFailure={handleLoginFailure}
          onForgotPassword={() => setCurrentView("forgotpassword")}
          isLoading={false}
        />
      );
    }
  }

  // 載入中的顯示
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-lg text-gray-600">載入中...</p>
        </div>
      </div>
    );
  }

  // 錯誤顯示
  if (loadError) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">載入失敗</h2>
          <p className="text-gray-600 mb-4">{loadError}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            重新載入
          </button>
        </div>
      </div>
    );
  }

  // 提供 timers 格式給 UI 組件
  const getTimersForDisplay = () => {
    return dataManager.getDisplayTimers(tableStates);
  };

  // 提供 orders 格式給 UI 組件
  const getOrdersForDisplay = () => {
    return dataManager.getDisplayOrders(tableStates);
  };

  // 從 localStorage 載入數據
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

  //新增資料清理函數
  const sanitizeTableData = (tableData) => {
    if (!tableData || !tableData.orders) return tableData;

    // 確保 orders 是一維陣列，每個元素可以是物件或物件陣列，但不是巢狀陣列
    const sanitizedOrders = tableData.orders
      .map((batch) => {
        if (Array.isArray(batch)) {
          // 如果是陣列，確保裡面都是有效物件
          return batch.filter((item) => item && typeof item === "object");
        } else if (batch && typeof batch === "object") {
          // 如果是物件，直接返回
          return batch;
        }
        return null;
      })
      .filter(
        (batch) =>
          batch !== null && (Array.isArray(batch) ? batch.length > 0 : true),
      );

    return {
      ...tableData,
      orders: sanitizedOrders,
    };
  };

  // 輔助函數：從訂單推斷桌位狀態(TTOD：目前單純為了loadFromLocalStorage函數服務 待之後修改成組件系統)
  const getTableStatusFromOrders = (orders) => {
    if (!orders || orders.length === 0) return "available";

    // 檢查入座標記
    const hasSeatedMarker = orders.some((item) => item && item.__seated);
    if (hasSeatedMarker) return "seated";

    // 檢查付款狀態
    const hasUnpaidItems = orders.some(
      (item) => item && !item.__seated && item.paid === false,
    );
    if (hasUnpaidItems) return "occupied";

    const hasPaidItems = orders.some(
      (item) => item && !item.__seated && item.paid === true,
    );
    return hasPaidItems ? "ready-to-clean" : "available";
  };

  // 儲存桌位狀態到 Firebase
  const saveTableStateToFirebase = async (tableId, updates) => {
    try {
      const result = await dataManager.saveTableState(
        tableId,
        updates,
        tableStates,
      );

      // 處理操作結果
      if (result.success) {
        // 完全成功
        setTableStates((prev) => ({ ...prev, [tableId]: result.data }));
      } else if (result.hasBackup) {
        // 部分成功 - 更新 UI 但顯示警告
        setTableStates((prev) => ({ ...prev, [tableId]: result.data }));
        showOperationFeedback(
          result.uiGuidance.message,
          result.uiGuidance.severity,
        );
      } else {
        // 完全失敗
        showOperationFeedback(
          result.uiGuidance.message,
          result.uiGuidance.severity,
        );
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("❌ 儲存桌位狀態失敗:", error);
      throw error;
    }
  };

  // 刪除桌位狀態
  const deleteTableStateFromFirebase = async (tableId) => {
    try {
      const result = await dataManager.deleteTableState(tableId);

      if (result.success || result.hasBackup) {
        // 成功或部分成功都更新本地狀態
        const newTableStates = { ...tableStates };
        delete newTableStates[tableId];
        setTableStates(newTableStates);

        if (!result.success && result.hasBackup) {
          showOperationFeedback(
            result.uiGuidance.message,
            result.uiGuidance.severity,
          );
        }
      } else {
        // 完全失敗
        showOperationFeedback(
          result.uiGuidance.message,
          result.uiGuidance.severity,
        );
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("❌ 刪除桌位狀態失敗:", error);
      throw error;
    }
  };

  // 儲存外帶訂單到 Firebase
  const saveTakeoutOrdersToFirebase = async (newTakeoutOrders) => {
    try {
      const result = await dataManager.saveTakeoutOrders(newTakeoutOrders);

      if (result.success || result.hasBackup) {
        setTakeoutOrders(newTakeoutOrders);

        if (!result.success && result.hasBackup) {
          showOperationFeedback(
            result.uiGuidance.message,
            result.uiGuidance.severity,
          );
        }
      } else {
        showOperationFeedback(
          result.uiGuidance.message,
          result.uiGuidance.severity,
        );
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("❌ 儲存外帶訂單失敗:", error);
      throw error;
    }
  };

  // 儲存銷售歷史到 Firebase
  const saveSalesHistoryToFirebase = async (newHistory) => {
    try {
      const newRecord = newHistory[newHistory.length - 1]; // 假設新記錄在最後
      const result = await dataManager.addSalesRecord(newRecord, salesHistory);

      if (result.success || result.hasBackup) {
        setSalesHistory(result.data);

        if (!result.success && result.hasBackup) {
          showOperationFeedback(
            result.uiGuidance.message,
            result.uiGuidance.severity,
          );
        }
      } else {
        showOperationFeedback(
          result.uiGuidance.message,
          result.uiGuidance.severity,
        );
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("❌ 儲存銷售歷史失敗:", error);
      throw error;
    }
  };

  // 儲存菜單到 Firebase
  const saveMenuDataToFirebase = async (newMenuData) => {
    // ✅ 先更新本地 state（立即反應）
    setMenuData(newMenuData);

    try {
      // ✅ 嘗試保存到 Firebase
      await saveMenuData(newMenuData);

      console.log("✅ 菜單儲存成功");

      // ✅ 顯示成功訊息
      showOperationFeedback("✅ 菜單儲存成功", "success");
    } catch (error) {
      console.error("❌ 儲存菜單到 Firebase 失敗:", error);

      // ✅ 顯示警告（不是錯誤，因為本地已有備份）
      showOperationFeedback(
        "⚠️ 雲端同步失敗，已保存到本地裝置。請檢查網路後會自動同步。",
        "warning",
      );
    }
  };

  // 取得所有桌號
  const allTableIds = Object.values(seatingData)
    .flat()
    .map((table) => table.id);

  // 換桌邏輯（使用新數據結構）
  const handleMoveTable = async (fromTable, toTable) => {
    if (!fromTable || !toTable || fromTable === toTable) return;

    const targetTableStatus = getTableStatus(toTable);

    if (
      targetTableStatus !== "available" &&
      targetTableStatus !== "ready-to-clean"
    ) {
      alert("目標桌不可用，請選擇空桌或待清理的桌子。");
      return;
    }

    const fromTableState = tableStates[fromTable];
    if (!fromTableState?.orders || fromTableState.orders.length === 0) {
      alert("原桌沒有訂單可搬移。");
      return;
    }

    try {
      // 1. 複製桌位狀態到新桌位
      await saveTableStateToFirebase(toTable, {
        orders: fromTableState.orders,
        startTime: fromTableState.startTime || Date.now(),
        status: fromTableState.status,
      });

      // 2. 刪除原桌位狀態
      await deleteTableStateFromFirebase(fromTable);

      // 3. 強制更新本地狀態，確保 UI 立即反映變化
      setTableStates((prevStates) => {
        const newStates = { ...prevStates };

        // 複製到新桌位
        newStates[toTable] = {
          orders: fromTableState.orders,
          startTime: fromTableState.startTime || Date.now(),
          status: fromTableState.status,
          updatedAt: new Date().toISOString(),
        };

        // 刪除原桌位
        delete newStates[fromTable];

        return newStates;
      });

      // 4. 更新當前選中的桌子
      setSelectedTable(toTable);
      setCurrentOrder([]);

      // 5. 關閉 modal
      setShowMoveTableModal(false);
      setMoveTableTarget("");

      // 6. 返回座位視圖
      setCurrentView("seating");
    } catch (error) {
      console.error("❌ 換桌操作失敗:", error);
      alert("換桌失敗，請稍後再試");
    }
  };

  const generateHistoryId = () => {
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0].replace(/-/g, "");
    const timeStr = now.getTime().toString();
    const randomStr = Math.random().toString(36).substr(2, 4).toUpperCase();
    return `H${dateStr}${timeStr}${randomStr}`;
  };

  const generateGroupId = () => {
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0].replace(/-/g, "");
    const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, "");
    const randomStr = Math.random().toString(36).substr(2, 2).toUpperCase();
    return `G${dateStr}${timeStr}${randomStr}`;
  };

  const handleRefund = async (recordId) => {
    const recordIndex = salesHistory.findIndex(
      (record) => record.id === recordId,
    );

    if (recordIndex === -1) {
      alert("找不到該訂單記錄");
      return;
    }

    const record = salesHistory[recordIndex];
    const newSalesHistory = [...salesHistory];
    newSalesHistory[recordIndex] = {
      ...record,
      isRefunded: true,
      refundDate: (() => {
        const now = new Date();
        const parts = now
          .toLocaleDateString("zh-TW", { timeZone: "Asia/Taipei" })
          .split("/");
        return `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(
          2,
          "0",
        )}`;
      })(),
      refundTime: new Date().toTimeString().slice(0, 8),
      refundTimestamp: Date.now(),
    };

    try {
      await updateSalesRecord(recordId, {
        isRefunded: true,
        refundDate: newSalesHistory[recordIndex].refundDate,
        refundTime: newSalesHistory[recordIndex].refundTime,
        refundTimestamp: newSalesHistory[recordIndex].refundTimestamp,
      });

      await saveSalesHistoryToFirebase(newSalesHistory);
      alert(
        `訂單 ${record.table} (${record.time}) 已成功退款 $${record.total}`,
      );
    } catch (error) {
      console.error("處理退款失敗:", error);
      alert("退款處理失敗，請稍後再試");
    }
  };

  const handleMenuSelect = (menuId) => {
    setCurrentView(menuId);
  };

  const handleNewTakeout = () => {
    const takeoutId = `T${String(nextTakeoutId).padStart(3, "0")}`;
    setSelectedTable(takeoutId);
    setCurrentOrder([]);
    setCurrentView("ordering");
    setNextTakeoutId(nextTakeoutId + 1);
  };

  const handleTakeoutClick = async (takeoutId) => {
    const orderData = takeoutOrders[takeoutId];
    if (orderData && !orderData.paid) {
      setSelectedTable(takeoutId);
      setCurrentOrder([]);
      setCurrentView("ordering");
    } else if (orderData && orderData.paid) {
      try {
        const result = await dataManager.deleteTakeoutOrder(
          takeoutId,
          takeoutOrders,
        );
        if (result.success || result.hasBackup) {
          setTakeoutOrders(result.data);
          if (!result.success && result.hasBackup) {
            showOperationFeedback(
              result.uiGuidance.message,
              result.uiGuidance.severity,
            );
          }
        } else {
          showOperationFeedback(
            result.uiGuidance.message,
            result.uiGuidance.severity,
          );
        }
      } catch (error) {
        console.error("刪除外帶訂單失敗:", error);
      }
    }
  };

  // 入座確認（使用新數據結構）
  const handleSeatConfirm = async () => {
    const seatData = {
      orders: [{ __seated: true, timestamp: new Date().toISOString() }], // 扁平化陣列
      startTime: Date.now(),
      status: "seated",
    };

    await saveTableStateToFirebase(pendingSeatTable, seatData);
    setShowSeatConfirmModal(false);
    setPendingSeatTable(null);
  };

  // getTableStatus 使用新數據結構
  const getTableStatus = (tableId) => {
    if (tableId.startsWith("T")) {
      const takeoutData = takeoutOrders[tableId];
      if (takeoutData) {
        return takeoutData.paid ? "takeout-paid" : "takeout-unpaid";
      }
      return "takeout-new";
    }

    const tableState = tableStates[tableId];

    if (!tableState || !tableState.orders || tableState.orders.length === 0) {
      return "available";
    }

    // 詳細檢查入座狀態
    for (let i = 0; i < tableState.orders.length; i++) {
      const item = tableState.orders[i];

      if (item && typeof item === "object" && item.__seated === true) {
        return "seated";
      }
    }

    // 檢查付款狀態
    let hasUnpaidItems = false;
    let hasPaidItems = false;

    for (const item of tableState.orders) {
      if (item && typeof item === "object" && !item.__seated) {
        if (item.paid === false) {
          hasUnpaidItems = true;
        } else if (item.paid === true) {
          hasPaidItems = true;
        }
      }
    }

    if (hasUnpaidItems) {
      return "occupied";
    }
    if (hasPaidItems) {
      return "ready-to-clean";
    }

    return "available";
  };

  const handleTableClick = (tableId) => {
    const status = getTableStatus(tableId);
    if (status === "available") {
      setPendingSeatTable(tableId);
      setShowSeatConfirmModal(true);
    } else if (status === "seated" || status === "occupied") {
      setSelectedTable(tableId);
      setCurrentOrder([]);
      setTimeout(() => {
        setCurrentView("ordering");
      }, 10);
    } else if (status === "ready-to-clean") {
      handleCleanTable(tableId);
    }
  };

  // 清理桌子（使用新數據結構）
  const handleCleanTable = async (tableId) => {
    try {
      // 清理桌子時完全刪除桌位狀態，包括計時器
      await deleteTableStateFromFirebase(tableId);
    } catch (error) {
      console.error("清理桌子失敗:", error);
    }
  };

  // submitOrder（使用新數據結構）
  const submitOrder = async () => {
    if (currentOrder.length === 0) return;

    if (selectedTable.startsWith("T")) {
      // 外帶訂單 - 改為扁平化結構

      const existingTakeoutData = takeoutOrders[selectedTable];
      let existingOrders = existingTakeoutData?.orders
        ? [...existingTakeoutData.orders]
        : [];

      // 新增項目（直接加到扁平化陣列末尾）
      const newItems = currentOrder.map((item) => ({
        ...item,
        timestamp: new Date().toISOString(),
        paid: false,
        customOptions: item.customOptions,
      }));

      // 合併：扁平化結構，不要巢狀陣列
      let finalOrders = [...existingOrders, ...newItems];

      // 驗證：確保沒有巢狀陣列
      const hasNestedArrays = finalOrders.some((item) => Array.isArray(item));

      if (hasNestedArrays) {
        console.error("❌ 外帶訂單檢測到巢狀陣列，進行扁平化");
        finalOrders = finalOrders.flat();
      }

      const newTakeoutOrders = {
        ...takeoutOrders,
        [selectedTable]: {
          orders: finalOrders, // 改用 orders 而不是 batches
          timestamp: existingTakeoutData
            ? existingTakeoutData.timestamp
            : new Date().toISOString(),
          paid: false,
        },
      };

      await saveTakeoutOrdersToFirebase(newTakeoutOrders);
      setCurrentView("seating");
      setSelectedTable(null);
      setCurrentOrder([]);
    } else {
      // 內用訂單 - 使用扁平化結構

      const currentTableState = tableStates[selectedTable] || {};
      let existingOrders = currentTableState.orders
        ? [...currentTableState.orders]
        : [];

      // 移除入座標記
      existingOrders = existingOrders.filter((item) => {
        return !(item && item.__seated);
      });

      // 處理編輯項目
      const hasEditingItems = currentOrder.some(
        (item) => item.isEditing && !item.isTakeout,
      );

      if (hasEditingItems) {
        // 如果有編輯項目，更新現有訂單
        currentOrder.forEach((item) => {
          if (item.isEditing && !item.isTakeout) {
            const {
              isEditing,
              originalBatchIndex,
              originalItemIndex,
              ...updatedItem
            } = item;

            // 計算在扁平化陣列中的實際位置
            let flatIndex = 0;
            for (let b = 0; b < originalBatchIndex; b++) {
              if (Array.isArray(currentTableState.orders[b])) {
                flatIndex += currentTableState.orders[b].length;
              } else {
                flatIndex += 1;
              }
            }
            flatIndex += originalItemIndex;

            if (existingOrders[flatIndex]) {
              existingOrders[flatIndex] = {
                ...updatedItem,
                timestamp: new Date().toISOString(),
                paid: false,
              };
            }
          }
        });
      }

      // 新增項目（直接加到扁平化陣列末尾）
      const newItems = currentOrder
        .filter((item) => !item.isEditing)
        .map((item) => ({
          ...item,
          timestamp: new Date().toISOString(),
          paid: false,
        }));

      // 合併：扁平化結構，不要巢狀陣列
      let finalOrders = [...existingOrders, ...newItems];

      // 驗證：確保沒有巢狀陣列
      const hasNestedArrays = finalOrders.some((item) => Array.isArray(item));

      if (hasNestedArrays) {
        console.error("❌ 檢測到巢狀陣列，進行扁平化");
        finalOrders = finalOrders.flat();
      }

      // 儲存桌位狀態
      const stateToSave = {
        orders: finalOrders,
        startTime: currentTableState.startTime || Date.now(),
        status: "occupied",
      };

      await saveTableStateToFirebase(selectedTable, stateToSave);

      if (hasEditingItems && newItems.length === 0) {
        setCurrentOrder([]);
      } else {
        setCurrentView("seating");
        setSelectedTable(null);
        setCurrentOrder([]);
      }
    }
  };

  // handleReleaseSeat（使用新數據結構）
  const handleReleaseSeat = async (tableId) => {
    try {
      await deleteTableStateFromFirebase(tableId);
      setCurrentView("seating");
      setSelectedTable(null);
    } catch (error) {
      console.error("釋放座位失敗:", error);
    }
  };

  const addToOrder = (item) => {
    // 生成唯一識別碼，包含客製選項
    const generateUniqueId = (item) => {
      if (item.selectedCustom && Object.keys(item.selectedCustom).length > 0) {
        return `${item.id}-${JSON.stringify(item.selectedCustom)}`;
      }
      return item.id.toString();
    };

    const uniqueId = generateUniqueId(item);

    const existingItem = currentOrder.find(
      (orderItem) => orderItem.uniqueId === uniqueId,
    );

    if (existingItem) {
      setCurrentOrder(
        currentOrder.map((orderItem) =>
          orderItem.uniqueId === uniqueId
            ? { ...orderItem, quantity: orderItem.quantity + 1 }
            : orderItem,
        ),
      );
    } else {
      setCurrentOrder([
        ...currentOrder,
        {
          ...item,
          uniqueId: uniqueId,
          quantity: 1,
          customOptions: item.customOptions,
        },
      ]);
    }
  };

  const updateQuantity = (uniqueId, quantity) => {
    if (quantity <= 0) {
      setCurrentOrder(
        currentOrder.filter((item) => item.uniqueId !== uniqueId),
      );
    } else {
      setCurrentOrder(
        currentOrder.map((item) =>
          item.uniqueId === uniqueId ? { ...item, quantity } : item,
        ),
      );
    }
  };

  // removeFromOrder（使用新數據結構）
  const removeFromOrder = async (uniqueId) => {
    const removingItem = currentOrder.find(
      (item) => item.uniqueId === uniqueId,
    );

    if (removingItem && removingItem.isEditing) {
      if (removingItem.isTakeout) {
        // 外帶項目邏輯
        const takeoutData = takeoutOrders[selectedTable];
        if (
          takeoutData &&
          takeoutData.orders &&
          Array.isArray(takeoutData.orders)
        ) {
          // 使用扁平化結構
          const originalIndex = removingItem.originalItemIndex;

          // 確保索引有效
          if (originalIndex >= 0 && originalIndex < takeoutData.orders.length) {
            const updatedOrders = [...takeoutData.orders];
            updatedOrders.splice(originalIndex, 1);

            const newTakeoutOrders = {
              ...takeoutOrders,
              [selectedTable]: {
                ...takeoutData,
                orders: updatedOrders,
              },
            };
            await saveTakeoutOrdersToFirebase(newTakeoutOrders);
          }
        }
      } else {
        // 內用項目（使用新數據結構）
        const currentTableState = tableStates[selectedTable] || {};
        const flatOrders = currentTableState.orders
          ? [...currentTableState.orders]
          : [];

        // 從 originalItemIndex 獲取在扁平化陣列中的實際位置
        const actualIndex = removingItem.originalItemIndex;

        // 確保索引有效且該位置有項目
        if (actualIndex >= 0 && actualIndex < flatOrders.length) {
          // 直接從扁平化陣列中移除項目
          flatOrders.splice(actualIndex, 1);

          if (flatOrders.length > 0) {
            // 過濾掉可能的空值或無效項目
            const validOrders = flatOrders.filter(
              (item) =>
                item &&
                typeof item === "object" &&
                (item.__seated || item.name),
            );

            await saveTableStateToFirebase(selectedTable, {
              ...currentTableState,
              orders: validOrders,
            });
          } else {
            // 如果沒有訂單了，刪除整個桌位狀態
            await deleteTableStateFromFirebase(selectedTable);
          }
        } else {
          console.warn("⚠️ 無效的索引或項目不存在:", {
            actualIndex,
            flatOrdersLength: flatOrders.length,
          });
        }
      }
    }

    // 從當前訂單中移除項目
    setCurrentOrder(currentOrder.filter((item) => item.uniqueId !== uniqueId));
  };

  //統一結帳函數
  const checkout = async (paymentMethod = "cash", partialSelection = null) => {
    console.group(`💳 統一結帳流程開始 - ${selectedTable}`);

    try {
      // ==================== 1. 環境判斷 ====================
      const isPartialCheckout = Boolean(
        partialSelection &&
        Object.values(partialSelection.items || {}).some(Boolean),
      );
      const type = selectedTable.startsWith("T") ? "takeout" : "dine-in";

      // ==================== 2. 資料準備 ====================
      let sourceData;
      let allItems = []; // 統一的完整商品列表

      if (type === "takeout") {
        sourceData = takeoutOrders[selectedTable];
        if (!sourceData && currentOrder.length > 0) {
          // 處理新建立的外帶訂單
          const newItems = currentOrder.map((item) => ({
            ...item,
            timestamp: new Date().toISOString(),
            paid: false,
            customOptions: item.customOptions,
          }));

          sourceData = {
            orders: newItems,
            timestamp: new Date().toISOString(),
            paid: false,
          };

          await saveTakeoutOrdersToFirebase({
            ...takeoutOrders,
            [selectedTable]: sourceData,
          });
        }

        // 統一格式：取得完整商品列表
        allItems = (sourceData?.orders || []).filter(
          (item) => item && typeof item === "object",
        );
      } else {
        // 內用
        sourceData = tableStates[selectedTable];
        if (!sourceData?.orders) {
          throw new Error("找不到桌位訂單資料");
        }

        // 統一格式：取得完整商品列表（排除入座標記）
        allItems = sourceData.orders.filter(
          (item) => item && typeof item === "object" && !item.__seated,
        );
      }

      // 篩選未付款商品
      const unpaidItems = allItems.filter((item) => item.paid === false);

      if (unpaidItems.length === 0) {
        alert("沒有可結帳的項目");
        return;
      }

      // ==================== 3. 商品處理邏輯（統一） ====================

      // 統一的價格計算函數
      const calculateItemPrice = (item, quantity = null) => {
        const qty = quantity !== null ? quantity : item.quantity;
        let basePrice = item.price || 0;
        let totalAdjustment = 0;

        // 處理客製選項價格調整
        if (item.selectedCustom && item.customOptions) {
          Object.entries(item.selectedCustom).forEach(
            ([optionType, selectedValue]) => {
              if (!selectedValue) return;

              const customOption = item.customOptions.find(
                (opt) => opt.type === optionType,
              );
              if (customOption?.priceAdjustments?.[selectedValue]) {
                totalAdjustment += customOption.priceAdjustments[selectedValue];
              }
            },
          );
        }

        // 向下相容：舊的續杯邏輯
        if (totalAdjustment === 0 && item.selectedCustom?.["續杯"] === "是") {
          const renewalOption = item.customOptions?.find(
            (opt) => opt.type === "續杯",
          );
          if (!renewalOption?.priceAdjustments?.["是"]) {
            totalAdjustment = -20;
          }
        }

        const finalPrice = Math.max(basePrice + totalAdjustment, 0);
        return {
          unitPrice: finalPrice,
          subtotal: finalPrice * qty,
          adjustment: totalAdjustment,
        };
      };

      let itemsToCheckout = [];
      let updateInstructions = [];

      if (isPartialCheckout) {
        // ==================== 部分結帳邏輯 ====================
        const { items: selectedItems, quantities: selectedQuantities } =
          partialSelection;

        Object.entries(selectedItems).forEach(([key, isSelected]) => {
          if (!isSelected) return;

          const selectedQty = selectedQuantities[key] || 1;
          if (selectedQty <= 0) return;

          // 直接使用 key 作為 unpaidItems 的索引
          const itemIndex = parseInt(key.split("-")[1] || key);
          const originalItem = unpaidItems[itemIndex];

          if (!originalItem) {
            console.error(`❌ 找不到索引 ${itemIndex} 的商品`);
            return;
          }

          if (selectedQty > originalItem.quantity) {
            console.error(
              `❌ 選擇數量 ${selectedQty} 超過可用數量 ${originalItem.quantity}`,
            );
            return;
          }

          // 計算價格
          const priceInfo = calculateItemPrice(originalItem, selectedQty);

          // 加入結帳清單
          itemsToCheckout.push({
            id: originalItem.id,
            name: originalItem.name,
            price: originalItem.price,
            quantity: selectedQty,
            subtotal: priceInfo.subtotal,
            selectedCustom: originalItem.selectedCustom || null,
            customOptions: originalItem.customOptions || null,
          });

          // 建立更新指令 - 使用在 allItems 中的實際索引
          const actualIndex = allItems.findIndex(
            (item) => item === originalItem,
          );

          if (actualIndex !== -1) {
            const remainingQuantity = originalItem.quantity - selectedQty;
            updateInstructions.push({
              actualIndex,
              shouldRemove: remainingQuantity === 0,
              shouldUpdateQuantity: remainingQuantity > 0,
              remainingQuantity,
              markAsPaid: remainingQuantity === 0,
            });
          }
        });
      } else {
        // ==================== 全部結帳邏輯 ====================
        itemsToCheckout = unpaidItems.map((item) => {
          const priceInfo = calculateItemPrice(item);
          return {
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            subtotal: priceInfo.subtotal,
            selectedCustom: item.selectedCustom || null,
            customOptions: item.customOptions || null,
          };
        });

        // 全部標記為已付款
        unpaidItems.forEach((item) => {
          const actualIndex = allItems.findIndex(
            (listItem) => listItem === item,
          );
          if (actualIndex !== -1) {
            updateInstructions.push({
              actualIndex,
              shouldRemove: false,
              shouldUpdateQuantity: false,
              markAsPaid: true,
            });
          }
        });
      }

      if (itemsToCheckout.length === 0) {
        alert("沒有有效的結帳項目");
        return;
      }

      const total = itemsToCheckout.reduce(
        (sum, item) => sum + item.subtotal,
        0,
      );

      // ==================== 4. 歷史記錄建立（統一） ====================
      const createHistoryRecord = () => {
        const now = new Date();
        const parts = now
          .toLocaleDateString("zh-TW", { timeZone: "Asia/Taipei" })
          .split("/");
        const taiwanDateStr = `${parts[0]}-${parts[1].padStart(
          2,
          "0",
        )}-${parts[2].padStart(2, "0")}`;

        // 取得或產生 groupId
        let groupId;
        if (type === "dine-in") {
          groupId = sourceData.groupId || generateGroupId();
        } else {
          groupId = generateGroupId(); // 外帶每次都產生新的 groupId
        }

        return {
          id: generateHistoryId(),
          groupId: groupId,
          date: taiwanDateStr,
          time: now.toTimeString().slice(0, 8),
          timestamp: now.getTime(),
          type: type === "takeout" ? "takeout" : "table",
          table: selectedTable,
          items: itemsToCheckout,
          total: total,
          itemCount: itemsToCheckout.reduce(
            (sum, item) => sum + item.quantity,
            0,
          ),
          paymentMethod,
          isPartialPayment: isPartialCheckout,
          partialPaymentInfo: isPartialCheckout
            ? {
                totalItems: Object.keys(partialSelection.items || {}).length,
                selectedItems: Object.values(
                  partialSelection.items || {},
                ).filter(Boolean).length,
                note: "此為部分結帳，每個商品項目獨立記錄",
              }
            : null,
        };
      };

      const historyRecord = createHistoryRecord();

      // ==================== 5. 資料更新（統一） ====================

      // 儲存歷史記錄
      await addSalesRecord(historyRecord);
      const newHistory = [...salesHistory, historyRecord];
      await saveSalesHistoryToFirebase(newHistory);

      // 更新原始資料
      if (type === "takeout") {
        // 外帶資料更新
        const updatedOrders = [...allItems];

        updateInstructions.forEach(
          ({
            actualIndex,
            shouldRemove,
            shouldUpdateQuantity,
            remainingQuantity,
            markAsPaid,
          }) => {
            if (actualIndex >= 0 && actualIndex < updatedOrders.length) {
              if (markAsPaid) {
                updatedOrders[actualIndex] = {
                  ...updatedOrders[actualIndex],
                  paid: true,
                };
              }
              if (shouldUpdateQuantity) {
                updatedOrders[actualIndex] = {
                  ...updatedOrders[actualIndex],
                  quantity: remainingQuantity,
                };
              }
            }
          },
        );

        const hasUnpaidItems = updatedOrders.some(
          (item) => item.paid === false,
        );
        const newTakeoutOrders = {
          ...takeoutOrders,
          [selectedTable]: {
            ...sourceData,
            orders: updatedOrders,
            paid: !hasUnpaidItems,
          },
        };
        await saveTakeoutOrdersToFirebase(newTakeoutOrders);
      } else {
        // 內用資料更新
        const updatedOrders = [...sourceData.orders];

        updateInstructions.forEach(
          ({
            actualIndex,
            shouldRemove,
            shouldUpdateQuantity,
            remainingQuantity,
            markAsPaid,
          }) => {
            if (actualIndex >= 0 && actualIndex < updatedOrders.length) {
              if (markAsPaid) {
                updatedOrders[actualIndex] = {
                  ...updatedOrders[actualIndex],
                  paid: true,
                  groupId: historyRecord.groupId,
                };
              }
              if (shouldUpdateQuantity) {
                updatedOrders[actualIndex] = {
                  ...updatedOrders[actualIndex],
                  quantity: remainingQuantity,
                };
              }
            }
          },
        );

        // 重新判斷桌位狀態
        const stillHasUnpaidItems = updatedOrders.some(
          (item) => item && !item.__seated && item.paid === false,
        );

        const newStatus = stillHasUnpaidItems ? "occupied" : "ready-to-clean";

        await saveTableStateToFirebase(selectedTable, {
          ...sourceData,
          orders: updatedOrders,
          groupId: historyRecord.groupId,
          status: newStatus,
        });
      }

      // ==================== 6. UI回饋 ====================
      setCurrentOrder([]);

      if (isPartialCheckout) {
        alert(
          `${
            type === "takeout" ? "外帶" : "內用"
          }部分結帳成功！結帳金額：$${total}`,
        );

        // 部分結帳完成後，檢查是否需要返回主頁面
        const remainingUnpaid = allItems.filter(
          (item) => item.paid === false,
        ).length;
        const updateInstructionsMarkAsPaid = updateInstructions.filter(
          (inst) => inst.markAsPaid,
        ).length;
        const updateInstructionsUpdateQty = updateInstructions.filter(
          (inst) => inst.shouldUpdateQuantity,
        ).length;

        // 如果所有商品都已結帳完畢，返回主頁面
        if (
          remainingUnpaid === updateInstructionsMarkAsPaid &&
          updateInstructionsUpdateQty === 0
        ) {
          setSelectedTable(null);
          setCurrentView("main");
        }
      } else {
        setSelectedTable(null);
        setCurrentView("main");
        alert(
          `${type === "takeout" ? "外帶" : "內用"}結帳成功！結帳金額：$${total}`,
        );
      }
    } catch (error) {
      console.error("❌ 結帳失敗:", error);
      alert("結帳失敗，請稍後再試。錯誤: " + error.message);
    } finally {
      console.groupEnd();
    }
  };

  const editConfirmedItem = (item, batchIndex, itemIndex) => {
    if (selectedTable.startsWith("T")) {
      // 外帶項目編輯邏輯
      const takeoutData = takeoutOrders[selectedTable];
      if (
        !takeoutData ||
        !takeoutData.orders ||
        !Array.isArray(takeoutData.orders)
      ) {
        console.warn("⚠️ 外帶訂單數據無效");
        return;
      }

      if (itemIndex < 0 || itemIndex >= takeoutData.orders.length) {
        console.warn("⚠️ 外帶項目索引無效:", itemIndex);
        return;
      }

      const editingItem = { ...takeoutData.orders[itemIndex] };

      const isAlreadyEditing = currentOrder.some(
        (orderItem) =>
          orderItem.isEditing &&
          orderItem.originalItemIndex === itemIndex &&
          orderItem.isTakeout === true,
      );

      if (isAlreadyEditing) {
        setCurrentOrder(
          currentOrder.filter(
            (orderItem) =>
              !(
                orderItem.isEditing &&
                orderItem.originalItemIndex === itemIndex &&
                orderItem.isTakeout === true
              ),
          ),
        );
      } else {
        setCurrentOrder([
          ...currentOrder,
          {
            ...editingItem,
            isEditing: true,
            isTakeout: true,
            originalBatchIndex: 0, // 外帶都是批次0
            originalItemIndex: itemIndex,
            customOptions: editingItem.customOptions,
          },
        ]);
      }
    } else {
      // 內用項目編輯（適應扁平化結構）
      const currentTableState = tableStates[selectedTable] || {};
      const flatOrders = currentTableState.orders || [];

      // 過濾掉入座標記，獲取真正的餐點
      const realOrders = flatOrders.filter(
        (item) => item && typeof item === "object" && !item.__seated,
      );

      // 檢查索引是否有效
      if (itemIndex < 0 || itemIndex >= realOrders.length) {
        console.warn("⚠️ 內用項目索引無效:", {
          itemIndex,
          realOrdersLength: realOrders.length,
        });
        return;
      }

      const editingItem = { ...realOrders[itemIndex] };

      // 找到在原始扁平化陣列中的實際位置
      let actualFlatIndex = -1;
      let realItemCount = 0;

      for (let i = 0; i < flatOrders.length; i++) {
        const currentItem = flatOrders[i];
        if (
          currentItem &&
          typeof currentItem === "object" &&
          !currentItem.__seated
        ) {
          if (realItemCount === itemIndex) {
            actualFlatIndex = i;
            break;
          }
          realItemCount++;
        }
      }

      if (actualFlatIndex === -1) {
        console.warn("⚠️ 無法找到項目在扁平化陣列中的位置");
        return;
      }

      const isAlreadyEditing = currentOrder.some(
        (orderItem) =>
          orderItem.isEditing &&
          orderItem.originalItemIndex === actualFlatIndex &&
          !orderItem.isTakeout,
      );

      if (isAlreadyEditing) {
        setCurrentOrder(
          currentOrder.filter(
            (orderItem) =>
              !(
                orderItem.isEditing &&
                orderItem.originalItemIndex === actualFlatIndex &&
                !orderItem.isTakeout
              ),
          ),
        );
      } else {
        setCurrentOrder([
          ...currentOrder,
          {
            ...editingItem,
            isEditing: true,
            originalBatchIndex: 0, // 在顯示時總是批次0
            originalItemIndex: actualFlatIndex, // 使用在扁平化陣列中的實際位置
            customOptions: editingItem.customOptions,
          },
        ]);
      }
    }
  };

  const handleBack = () => {
    setCurrentView("seating");
    setSelectedTable(null);
    setCurrentOrder([]);
  };

  if (currentView === "menuedit") {
    return (
      <MenuEditorPage
        menuData={menuData}
        setMenuData={saveMenuDataToFirebase}
        onBack={() => setCurrentView("seating")}
      />
    );
  }

  if (currentView === "export") {
    return (
      <ExportReportsPage
        onMenuSelect={handleMenuSelect}
        onBack={() => setCurrentView("seating")}
      />
    );
  }

  if (currentView === "history") {
    return (
      <HistoryPage
        onBack={() => setCurrentView("seating")}
        onMenuSelect={handleMenuSelect}
        onRefundOrder={handleRefund}
        onLogout={handleLogout}
      />
    );
  }

  if (currentView === "account") {
    return (
      <AccountManagementPage
        onBack={() => setCurrentView("seating")}
        onMenuSelect={handleMenuSelect}
        onChangePassword={handleGoToChangePassword}
        onLogout={handleLogout}
      />
    );
  }

  // 現在從帳戶管理頁面進入更改密碼頁面路由
  if (currentView === "changepassword") {
    return (
      <ChangePasswordPage
        onBack={() => setCurrentView("account")}
        onPasswordChanged={handlePasswordChanged}
      />
    );
  }

  // 初始設定安全問題頁面
  if (currentView === "securitysetup") {
    return (
      <SetupSecurityQuestionPage
        onComplete={() => setCurrentView("seating")}
        onSkip={() => setCurrentView("seating")}
      />
    );
  }

  if (currentView === "ordering") {
    let confirmedOrdersBatches = [];
    if (selectedTable.startsWith("T")) {
      const takeoutData = takeoutOrders[selectedTable];
      if (takeoutData && !takeoutData.paid) {
        const flatOrders = takeoutData.orders || [];
        const realOrders = flatOrders.filter(
          (item) => item && typeof item === "object" && item.paid === false,
        );
        if (realOrders.length > 0) {
          confirmedOrdersBatches = [realOrders];
        }
      }
    } else {
      // 內用訂單 - 處理扁平化資料
      const currentTableState = tableStates[selectedTable] || {};
      const flatOrders = currentTableState.orders || [];

      // 過濾掉入座標記，只保留真正的餐點
      const realOrders = flatOrders.filter(
        (item) =>
          item &&
          typeof item === "object" &&
          !item.__seated &&
          item.paid === false,
      );

      // 將扁平化訂單重新組織為批次格式（為了相容現有的 UI）
      if (realOrders.length > 0) {
        confirmedOrdersBatches = [realOrders]; // 包成一個批次
      }
    }

    return (
      <>
        {showMoveTableModal && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 shadow-lg min-w-[300px]">
              <h2 className="text-lg font-bold mb-4">換桌</h2>

              <div className="mb-4">
                選擇要搬移到哪個桌位：
                <select
                  className="border rounded px-2 py-1 ml-2"
                  value={moveTableTarget}
                  onChange={(e) => setMoveTableTarget(e.target.value)}
                >
                  <option value="">請選擇桌號</option>
                  {allTableIds
                    .filter((tid) => {
                      const status = getTableStatus(tid);
                      return (
                        tid !== selectedTable &&
                        (status === "available" || status === "ready-to-clean")
                      );
                    })
                    .map((tid) => (
                      <option key={tid} value={tid}>
                        {tid} (
                        {getTableStatus(tid) === "available"
                          ? "空桌"
                          : "待清理"}
                        )
                      </option>
                    ))}
                </select>
              </div>
              <div className="flex space-x-2">
                <button
                  className="bg-blue-500 text-white px-4 py-2 rounded"
                  onClick={() =>
                    handleMoveTable(selectedTable, moveTableTarget)
                  }
                  disabled={!moveTableTarget}
                >
                  確認換桌
                </button>
                <button
                  className="bg-gray-300 px-4 py-2 rounded"
                  onClick={() => {
                    setShowMoveTableModal(false);
                    setMoveTableTarget("");
                  }}
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        )}
        <OrderingPage
          selectedTable={selectedTable}
          currentOrder={currentOrder}
          confirmedOrdersBatches={confirmedOrdersBatches}
          tableStatus={getTableStatus(selectedTable)}
          onBack={handleBack}
          onAddToOrder={addToOrder}
          onUpdateQuantity={updateQuantity}
          onRemoveItem={removeFromOrder}
          onSubmitOrder={submitOrder}
          onCheckout={checkout}
          timers={getTimersForDisplay()}
          onEditConfirmedItem={editConfirmedItem}
          menuData={menuData}
          onReleaseSeat={handleReleaseSeat}
          onMoveTable={() => setShowMoveTableModal(true)}
          onLogout={handleLogout}
        />
      </>
    );
  }

  return (
    <>
      {/* 🆕 連線監測器 */}
      {isAuthenticated && (
        <div className="fixed top-4 right-4 z-[60]">
          <SmartConnectionMonitor
            autoCheckOnMount={true}
            showIndicator={true}
          />
        </div>
      )}

      {/* 操作回饋UI */}
      {operationFeedback.show && (
        <div
          className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2 rounded shadow-lg 
    transition-all duration-300 ease-in-out
    ${
      operationFeedback.show
        ? "opacity-100 translate-y-0"
        : "opacity-0 -translate-y-4"
    }
    ${
      operationFeedback.severity === "error"
        ? "bg-red-500 text-white"
        : operationFeedback.severity === "warning"
          ? "bg-yellow-500 text-black"
          : "bg-green-500 text-white"
    }`}
        >
          {operationFeedback.message}
        </div>
      )}

      {showSeatConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 shadow-lg min-w-[300px]">
            <h2 className="text-lg font-bold mb-4">帶位確認</h2>
            <div className="mb-4">是否帶客人入座此桌？</div>
            <div className="flex space-x-2">
              <button
                onClick={handleSeatConfirm}
                className="bg-blue-500 text-white px-4 py-2 rounded"
              >
                是
              </button>
              <button
                onClick={() => {
                  setShowSeatConfirmModal(false);
                  setPendingSeatTable(null);
                }}
                className="bg-gray-300 px-4 py-2 rounded"
              >
                否
              </button>
            </div>
          </div>
        </div>
      )}
      <SeatingPage
        currentFloor={currentFloor}
        orders={getOrdersForDisplay()}
        takeoutOrders={takeoutOrders}
        timers={getTimersForDisplay()}
        onFloorChange={setCurrentFloor}
        onTableClick={handleTableClick}
        onTakeoutClick={handleTakeoutClick}
        onNewTakeout={handleNewTakeout}
        onMenuSelect={handleMenuSelect}
        onLogout={handleLogout}
      />
    </>
  );
};

export default CafePOSSystem;
