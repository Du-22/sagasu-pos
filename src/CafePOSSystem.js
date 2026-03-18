import React, { useState, useEffect } from "react";
import SeatingPage from "./components/seatingData/SeatingPage";
import OrderingPage from "./components/menuData/OrderingPage";
import HistoryPage from "./components/pages/HistoryPage";
import MenuEditorPage from "./components/pages/MenuEditorPage";
import defaultMenuData from "./components/menuData/defaultMenuData";
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
  getTableStates,
  getTakeoutOrders,
  getSalesHistoryByDate,
  updateSalesRecord,
} from "./firebase/operations";

// 🆕 Firebase Firestore 直接操作的 imports（精細版同步需要）
import { collection, doc, setDoc, getDocs } from "firebase/firestore";

// 🆕 Firebase config 和常數
import { db } from "./firebase/config";

import useAuth from "./components/hooks/useAuth";
import useFirebaseSync from "./components/hooks/useFirebaseSync";
import useTableActions from "./components/hooks/useTableActions";
import useOrderActions from "./components/hooks/useOrderActions";
import { generateHistoryId, generateGroupId } from "./utils/idGenerators";

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

  // hook初始化
  const dataManager = useDataManager();

  const {
    operationFeedback,
    showOperationFeedback,
    saveTableStateToFirebase,
    deleteTableStateFromFirebase,
    saveTakeoutOrdersToFirebase,
    saveSalesHistoryToFirebase,
    saveMenuDataToFirebase,
  } = useFirebaseSync({
    dataManager,
    tableStates,
    salesHistory,
    setTableStates,
    setTakeoutOrders,
    setSalesHistory,
    setMenuData,
  });

  const {
    allTableIds,
    getTableStatus,
    handleTableClick,
    handleSeatConfirm,
    handleMoveTable,
    handleReleaseSeat,
  } = useTableActions({
    tableStates,
    takeoutOrders,
    pendingSeatTable,
    saveTableStateToFirebase,
    deleteTableStateFromFirebase,
    setTableStates,
    setSelectedTable,
    setCurrentOrder,
    setCurrentView,
    setShowSeatConfirmModal,
    setPendingSeatTable,
    setShowMoveTableModal,
    setMoveTableTarget,
  });

  const {
    addToOrder,
    updateQuantity,
    removeFromOrder,
    submitOrder,
    editConfirmedItem,
    handleNewTakeout,
    handleTakeoutClick,
  } = useOrderActions({
    currentOrder,
    selectedTable,
    tableStates,
    takeoutOrders,
    nextTakeoutId,
    dataManager,
    setCurrentOrder,
    setSelectedTable,
    setCurrentView,
    setNextTakeoutId,
    setTakeoutOrders,
    saveTableStateToFirebase,
    deleteTableStateFromFirebase,
    saveTakeoutOrdersToFirebase,
    showOperationFeedback,
  });

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

      // 儲存歷史記錄（saveSalesHistoryToFirebase 已包含 Firebase 寫入）
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
