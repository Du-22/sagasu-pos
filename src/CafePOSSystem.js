import React, { useState, useEffect } from "react";
import OrderingPage from "./components/menuData/OrderingPage";
import SeatingPage from "./components/seatingData/SeatingPage";
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

// Firebase 操作函數 imports - 使用新版本
import {
  getMenuData,
  saveMenuData,
  getTableStates,
  saveTableState,
  updateTableState,
  deleteTableState,
  getTakeoutOrders,
  saveTakeoutOrders,
  deleteTakeoutOrder,
  getSalesHistory,
  addSalesRecord,
  updateSalesRecord,
  logLoginAttempt,
  initializeDefaultPassword,
  verifyPassword,
} from "./firebase/operations";

import {
  checkLockStatus,
  setAuthSuccess,
  handleLoginFailure as handleLoginFailureUtil,
  clearAuthData,
  isTokenValid,
} from "./auth/utils";

const CafePOSSystem = () => {
  const [currentFloor, setCurrentFloor] = useState("1F");
  const [selectedTable, setSelectedTable] = useState(null);
  const [currentView, setCurrentView] = useState("seating");

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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginState, setLoginState] = useState("login");
  const [loginError, setLoginError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {}, [currentView, selectedTable]);

  // 從 Firebase 載入所有數據
  useEffect(() => {
    const loadAllData = async () => {
      setIsLoading(true);
      setLoadError(null);

      try {
        //先初始化認證系統
        await initializeAuth();

        // 同時載入所有數據
        const [
          firebaseMenuData,
          firebaseTableStates,
          firebaseTakeoutOrders,
          firebaseSalesHistory,
        ] = await Promise.all([
          getMenuData(),
          getTableStates(),
          getTakeoutOrders(),
          getSalesHistory(),
        ]);

        // 設置菜單數據
        if (firebaseMenuData && firebaseMenuData.length > 0) {
          setMenuData(firebaseMenuData);
        } else {
          console.log("📋 首次使用，儲存預設菜單到 Firebase");
          await saveMenuData(defaultMenuData);
          setMenuData(defaultMenuData);
        }

        // 設置桌位狀態（新的整合數據）

        setTableStates(firebaseTableStates || {});

        // 設置外帶訂單

        setTakeoutOrders(firebaseTakeoutOrders || {});

        // 設置銷售歷史

        setSalesHistory(firebaseSalesHistory || []);
        console.log("✅ 所有數據載入完成");
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

  /**
   * 處理登入成功
   * @param {string} password - 使用者輸入的密碼
   */
  const handleLoginSuccess = async (password) => {
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
        console.error("❌ 密碼驗證過程發生錯誤:", verifyError);

        // 根據錯誤類型提供具體訊息
        if (
          verifyError.message.includes("Firebase") ||
          verifyError.code?.includes("firebase")
        ) {
          setLoginError({
            type: "system",
            message: "系統連線異常",
            userMessage:
              "請檢查網路連線，或稍後再試。若問題持續，請聯絡技術支援",
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
        const { needsSecuritySetup } = await import("./firebase/operations");
        const needsSetup = await needsSecuritySetup();

        if (needsSetup) {
          setIsAuthenticated(true); // 先設定為已驗證
          setCurrentView("securitysetup"); // 跳轉到安全問題設定頁面
          return;
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
      console.error("❌ 登入處理過程發生錯誤:", error);

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
   * 處理登入失敗
   * @param {Error} error - 錯誤物件
   */
  const handleLoginFailure = (error) => {
    console.error("❌ 登入失敗回調:", error);

    // 這個函數主要用於處理 LoginPage 組件內部的錯誤
    // 例如網路錯誤、Firebase 連線失敗等
    setLoginError({
      attemptsLeft: 0,
      lockUntil: null,
      message: "登入處理失敗，請檢查網路連線",
    });
    setLoginState("failed");
  };

  /**
   * 處理登出
   */
  const handleLogout = () => {
    // 清除所有驗證相關的本地儲存
    clearAuthData();

    // 重置狀態
    setIsAuthenticated(false);
    setLoginState("login");
    setLoginError(null);

    // 清除其他敏感資料
    setCurrentOrder([]);
    setSelectedTable(null);
    setCurrentView("seating");
  };

  /**
   * 初始化認證狀態（在系統啟動時檢查）
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
          }
        } catch (error) {
          console.error("初始化預設密碼失敗:", error);
          // 不阻擋登入流程
        }
      }
    } catch (error) {
      console.error("❌ 認證系統初始化失敗:", error);
      // 發生錯誤時保持未登入狀態
      setIsAuthenticated(false);
    }
  };

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
          onRetry={() => setLoginState("login")}
          onBackToLogin={() => setLoginState("login")}
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

  // // 舊calculateItemSubtotal(保險起見暫且保留)
  // const calculateItemSubtotal = (item) => {
  //   let basePrice = item.price || 0;
  //   let totalAdjustment = 0;

  //   // 檢查新格式的價格調整
  //   if (item.selectedCustom && item.customOptions) {
  //     Object.entries(item.selectedCustom).forEach(
  //       ([optionType, selectedValue]) => {
  //         if (!selectedValue) return;

  //         // 找到對應的客製選項設定
  //         const customOption = item.customOptions.find(
  //           (opt) => opt.type === optionType
  //         );

  //         if (
  //           customOption &&
  //           customOption.priceAdjustments &&
  //           customOption.priceAdjustments[selectedValue]
  //         ) {
  //           const adjustment = customOption.priceAdjustments[selectedValue];
  //           totalAdjustment += adjustment;
  //         }
  //       }
  //     );
  //   }

  //   // 向下相容：如果沒有新格式設定，使用舊的續杯邏輯
  //   if (
  //     totalAdjustment === 0 &&
  //     item.selectedCustom &&
  //     item.selectedCustom["續杯"] === "是"
  //   ) {
  //     // 檢查是否已經在新系統中處理過續杯
  //     const renewalOption = item.customOptions?.find(
  //       (opt) => opt.type === "續杯"
  //     );
  //     if (
  //       !renewalOption ||
  //       !renewalOption.priceAdjustments ||
  //       !renewalOption.priceAdjustments["是"]
  //     ) {
  //       totalAdjustment = -20;
  //     }
  //   }

  //   const finalPrice = Math.max(basePrice + totalAdjustment, 0);
  //   const subtotal = finalPrice * item.quantity;

  //   return subtotal;
  // };

  // 輔助函數：為了相容性，提供 timers 格式給 UI 組件
  const getTimersForDisplay = () => {
    const timersForDisplay = {};
    Object.entries(tableStates).forEach(([tableId, tableState]) => {
      if (tableState.startTime) {
        const currentStatus = getTableStatus(tableId);

        // 讓計時器在用餐中、入座和待清理狀態都顯示
        if (
          currentStatus === "occupied" ||
          currentStatus === "seated" ||
          currentStatus === "ready-to-clean"
        ) {
          timersForDisplay[tableId] = tableState.startTime;
        }
      }
    });

    return timersForDisplay;
  };

  // 輔助函數：為了相容性，提供 orders 格式給 UI 組件
  const getOrdersForDisplay = () => {
    const ordersForDisplay = {};
    Object.entries(tableStates).forEach(([tableId, tableState]) => {
      if (tableState.orders && Array.isArray(tableState.orders)) {
        // 檢查是否只有入座標記
        const onlySeatedMarker =
          tableState.orders.length === 1 &&
          tableState.orders[0] &&
          tableState.orders[0].__seated;

        if (onlySeatedMarker) {
          ordersForDisplay[tableId] = [{ __seated_only: true }];
          return;
        }

        // 過濾掉入座標記，只顯示真正的訂單
        const realOrders = tableState.orders.filter((item) => {
          return item && typeof item === "object" && !item.__seated;
        });

        if (realOrders.length > 0) {
          ordersForDisplay[tableId] = [realOrders];
        }
      }
    });

    return ordersForDisplay;
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
          batch !== null && (Array.isArray(batch) ? batch.length > 0 : true)
      );

    return {
      ...tableData,
      orders: sanitizedOrders,
    };
  };

  // 輔助函數：從訂單推斷桌位狀態
  const getTableStatusFromOrders = (orders) => {
    if (!orders || orders.length === 0) return "available";

    // 檢查入座標記
    const hasSeatedMarker = orders.some((item) => item && item.__seated);
    if (hasSeatedMarker) return "seated";

    // 檢查付款狀態
    const hasUnpaidItems = orders.some(
      (item) => item && !item.__seated && item.paid === false
    );
    if (hasUnpaidItems) return "occupied";

    const hasPaidItems = orders.some(
      (item) => item && !item.__seated && item.paid === true
    );
    return hasPaidItems ? "ready-to-clean" : "available";
  };

  // 儲存桌位狀態到 Firebase
  const saveTableStateToFirebase = async (tableId, updates) => {
    const currentState = tableStates[tableId] || {};
    const newState = { ...currentState, ...updates };

    // 在儲存前清理資料
    const sanitizedState = sanitizeTableData(newState);

    setTableStates((prev) => ({
      ...prev,
      [tableId]: sanitizedState,
    }));

    try {
      await saveTableState(tableId, sanitizedState);

      // 同時保存到 localStorage 作為備份
      if (sanitizedState.orders) {
        const oldOrders = JSON.parse(
          localStorage.getItem("cafeOrders") || "{}"
        );
        oldOrders[tableId] = sanitizedState.orders;
        localStorage.setItem("cafeOrders", JSON.stringify(oldOrders));
      }

      if (sanitizedState.startTime) {
        const oldTimers = JSON.parse(
          localStorage.getItem("cafeTimers") || "{}"
        );
        oldTimers[tableId] = sanitizedState.startTime;
        localStorage.setItem("cafeTimers", JSON.stringify(oldTimers));
      }
    } catch (error) {
      console.error("儲存桌位狀態到 Firebase 失敗:", error);

      // 失敗時至少保存到 localStorage
      if (sanitizedState.orders) {
        const oldOrders = JSON.parse(
          localStorage.getItem("cafeOrders") || "{}"
        );
        oldOrders[tableId] = sanitizedState.orders;
        localStorage.setItem("cafeOrders", JSON.stringify(oldOrders));
      }
    }
  };

  // 刪除桌位狀態
  const deleteTableStateFromFirebase = async (tableId) => {
    const newTableStates = { ...tableStates };
    delete newTableStates[tableId];
    setTableStates(newTableStates);

    try {
      await deleteTableState(tableId);

      // 同時從 localStorage 移除
      const oldOrders = JSON.parse(localStorage.getItem("cafeOrders") || "{}");
      const oldTimers = JSON.parse(localStorage.getItem("cafeTimers") || "{}");
      delete oldOrders[tableId];
      delete oldTimers[tableId];
      localStorage.setItem("cafeOrders", JSON.stringify(oldOrders));
      localStorage.setItem("cafeTimers", JSON.stringify(oldTimers));
    } catch (error) {
      console.error("刪除桌位狀態失敗:", error);
    }
  };

  // 儲存外帶訂單到 Firebase
  const saveTakeoutOrdersToFirebase = async (newTakeoutOrders) => {
    setTakeoutOrders(newTakeoutOrders);

    try {
      await saveTakeoutOrders(newTakeoutOrders);
      localStorage.setItem(
        "cafeTakeoutOrders",
        JSON.stringify(newTakeoutOrders)
      );
    } catch (error) {
      console.error("儲存外帶訂單到 Firebase 失敗:", error);
      localStorage.setItem(
        "cafeTakeoutOrders",
        JSON.stringify(newTakeoutOrders)
      );
    }
  };

  // 儲存銷售歷史到 Firebase
  const saveSalesHistoryToFirebase = async (newHistory) => {
    setSalesHistory(newHistory);

    try {
      localStorage.setItem("cafeSalesHistory", JSON.stringify(newHistory));
    } catch (error) {
      console.error("儲存銷售歷史到 Firebase 失敗:", error);
      localStorage.setItem("cafeSalesHistory", JSON.stringify(newHistory));
    }
  };

  // 儲存菜單到 Firebase
  const saveMenuDataToFirebase = async (newMenuData) => {
    setMenuData(newMenuData);

    try {
      await saveMenuData(newMenuData);
    } catch (error) {
      console.error("❌ 儲存菜單到 Firebase 失敗:", error);
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
    const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, "");
    const randomStr = Math.random().toString(36).substr(2, 3).toUpperCase();
    return `H${dateStr}${timeStr}${randomStr}`;
  };

  const generateGroupId = () => {
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0].replace(/-/g, "");
    const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, "");
    const randomStr = Math.random().toString(36).substr(2, 2).toUpperCase();
    return `G${dateStr}${timeStr}${randomStr}`;
  };

  // // 舊createHistoryRecord(保險起見暫且保留)
  // const createHistoryRecord = (
  //   tableId,
  //   orderData,
  //   type = "dine-in",
  //   paymentMethod = "cash",
  //   isPartialPayment = false,
  //   partialItems = null,
  //   groupId = null
  // ) => {
  //   const now = new Date();
  //   let items = [];
  //   let total = 0;

  //   if (isPartialPayment && partialItems) {
  //     if (type === "takeout") {
  //       // 🔥 外帶部分結帳邏輯 - 修正索引問題
  //       const { items: selectedItems, quantities: selectedQuantities } =
  //         partialItems;

  //       // 從 orderData.batches 取得完整商品列表，處理巢狀陣列格式
  //       let allItems = []; // 完整商品列表（包含已付款和未付款）
  //       if (orderData.batches && Array.isArray(orderData.batches)) {
  //         // 處理 { batches: [[...]] } 格式
  //         orderData.batches.forEach((batch) => {
  //           if (Array.isArray(batch)) {
  //             // batch 本身是陣列，展開它
  //             allItems = allItems.concat(batch);
  //           } else {
  //             // batch 是單個商品
  //             allItems.push(batch);
  //           }
  //         });
  //       } else if (Array.isArray(orderData)) {
  //         // 處理直接陣列格式 [...]
  //         allItems = orderData;
  //       }

  //       if (Array.isArray(allItems)) {
  //         Object.entries(selectedItems).forEach(([key, isSelected]) => {
  //           if (isSelected) {
  //             const selectedQty = selectedQuantities[key] || 1;

  //             if (selectedQty > 0) {
  //               const [batchIndex, itemIndexStr] = key.split("-");
  //               const itemIndex = parseInt(itemIndexStr);

  //               // 🔥 使用完整商品列表查找，而不是只用未付款商品
  //               const originalItem = allItems[itemIndex];

  //               // 確保商品存在且未付款
  //               if (
  //                 originalItem &&
  //                 originalItem.paid === false &&
  //                 selectedQty <= originalItem.quantity
  //               ) {
  //                 items.push({
  //                   id: originalItem.id,
  //                   name: originalItem.name,
  //                   price: originalItem.price,
  //                   quantity: selectedQty,
  //                   subtotal: calculateItemSubtotal({
  //                     ...originalItem,
  //                     quantity: selectedQty,
  //                   }),
  //                   selectedCustom: originalItem.selectedCustom || null,
  //                   customOptions: originalItem.customOptions || null,
  //                   partialCheckoutKey: key,
  //                   originalItemIndex: itemIndex, // 保持原始索引用於後續更新
  //                 });
  //               } else {
  //                 console.error(`❌ 外帶無效項目: ${key}`, {
  //                   originalItem: originalItem
  //                     ? `${originalItem.name} (paid: ${originalItem.paid})`
  //                     : "not found",
  //                   selectedQty,
  //                   itemIndex,
  //                   totalItems: allItems.length,
  //                   availableQuantity: originalItem ? originalItem.quantity : 0,
  //                 });
  //               }
  //             }
  //           }
  //         });

  //         total = items.reduce((sum, item) => sum + item.subtotal, 0);
  //       }
  //     } else {
  //       // 內用部分結帳邏輯
  //       const { items: selectedItems, quantities: selectedQuantities } =
  //         partialItems;

  //       if (orderData && Array.isArray(orderData) && orderData.length > 0) {
  //         const allUnpaidItems = orderData[0];

  //         Object.entries(selectedItems).forEach(([key, isSelected]) => {
  //           if (isSelected) {
  //             const selectedQty = selectedQuantities[key] || 1;

  //             if (selectedQty > 0) {
  //               const [batchIndex, itemIndexStr] = key.split("-");
  //               const itemIndex = parseInt(itemIndexStr);
  //               const originalItem = allUnpaidItems[itemIndex];

  //               if (originalItem && selectedQty <= originalItem.quantity) {
  //                 items.push({
  //                   id: originalItem.id,
  //                   name: originalItem.name,
  //                   price: originalItem.price,
  //                   quantity: selectedQty,
  //                   subtotal: calculateItemSubtotal({
  //                     ...originalItem,
  //                     quantity: selectedQty,
  //                   }),
  //                   selectedCustom: originalItem.selectedCustom || null,
  //                   customOptions: originalItem.customOptions || null,
  //                   partialCheckoutKey: key,
  //                   originalItemIndex: itemIndex,
  //                 });
  //               } else {
  //                 console.error(`❌ 無效項目: ${key}`, {
  //                   originalItem,
  //                   selectedQty,
  //                 });
  //               }
  //             }
  //           }
  //         });

  //         total = items.reduce((sum, item) => sum + item.subtotal, 0);
  //       }
  //     }
  //   } else {
  //     // 全部結帳邏輯，處理外帶和內用
  //     if (type === "takeout") {
  //       // 外帶全部結帳
  //       let allItems = [];

  //       if (orderData.batches && Array.isArray(orderData.batches)) {
  //         // 處理 { batches: [[...]] } 格式
  //         orderData.batches.forEach((batch) => {
  //           if (Array.isArray(batch)) {
  //             // batch 本身是陣列，展開它
  //             allItems = allItems.concat(batch);
  //           } else {
  //             // batch 是單個商品
  //             allItems.push(batch);
  //           }
  //         });
  //       } else if (Array.isArray(orderData)) {
  //         // 處理直接陣列格式 [...]
  //         allItems = orderData;
  //       }

  //       console.log("🔍 外帶商品處理結果:", allItems);

  //       if (allItems.length > 0) {
  //         items = allItems.map((item) => ({
  //           id: item.id,
  //           name: item.name,
  //           price: item.price,
  //           quantity: item.quantity,
  //           subtotal: calculateItemSubtotal(item),
  //           selectedCustom: item.selectedCustom || null,
  //           customOptions: item.customOptions || null,
  //         }));
  //         total = items.reduce((sum, item) => sum + item.subtotal, 0);
  //       }
  //     } else {
  //       // 內用全部結帳
  //       if (orderData && Array.isArray(orderData) && orderData.length > 0) {
  //         const allUnpaidItems = orderData[0];
  //         items = allUnpaidItems.map((item) => ({
  //           id: item.id,
  //           name: item.name,
  //           price: item.price,
  //           quantity: item.quantity,
  //           subtotal: calculateItemSubtotal(item),
  //           selectedCustom: item.selectedCustom || null,
  //           customOptions: item.customOptions || null,
  //         }));
  //         total = items.reduce((sum, item) => sum + item.subtotal, 0);
  //       }
  //     }
  //   }

  //   if (items.length === 0) {
  //     console.warn("⚠️ 沒有商品，無法建立歷史記錄");
  //     console.warn("🔍 Debug 資訊:", {
  //       tableId,
  //       type,
  //       isPartialPayment,
  //       orderData: JSON.stringify(orderData, null, 2),
  //       partialItems: JSON.stringify(partialItems, null, 2),
  //     });
  //     return null;
  //   }

  //   const parts = now
  //     .toLocaleDateString("zh-TW", { timeZone: "Asia/Taipei" })
  //     .split("/");
  //   const taiwanDateStr = `${parts[0]}-${parts[1].padStart(
  //     2,
  //     "0"
  //   )}-${parts[2].padStart(2, "0")}`;

  //   const finalRecord = {
  //     id: generateHistoryId(),
  //     groupId: groupId || generateGroupId(),
  //     date: taiwanDateStr,
  //     time: now.toTimeString().slice(0, 8),
  //     timestamp: now.getTime(),
  //     type: type === "takeout" ? "takeout" : "table",
  //     table: tableId,
  //     items: items,
  //     total: total,
  //     itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
  //     paymentMethod,
  //     isPartialPayment: isPartialPayment,
  //     partialPaymentInfo: isPartialPayment
  //       ? {
  //           totalItems: partialItems
  //             ? Object.keys(partialItems.items || {}).length
  //             : 0,
  //           selectedItems: partialItems
  //             ? Object.values(partialItems.items || {}).filter(Boolean).length
  //             : 0,
  //           note: "此為部分結帳，每個商品項目獨立記錄",
  //           checkoutKeys: items
  //             .map((item) => item.partialCheckoutKey)
  //             .filter(Boolean),
  //         }
  //       : null,
  //   };

  //   return finalRecord;
  // };

  // 處理退款（使用 Firebase）
  const handleRefund = async (recordId) => {
    const recordIndex = salesHistory.findIndex(
      (record) => record.id === recordId
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
          "0"
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
        `訂單 ${record.table} (${record.time}) 已成功退款 $${record.total}`
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
        await deleteTakeoutOrder(takeoutId);
        const newTakeoutOrders = { ...takeoutOrders };
        delete newTakeoutOrders[takeoutId];
        await saveTakeoutOrdersToFirebase(newTakeoutOrders);
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
      const finalOrders = [...existingOrders, ...newItems];

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
        (item) => item.isEditing && !item.isTakeout
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
      const finalOrders = [...existingOrders, ...newItems];

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
    const existingItem = currentOrder.find(
      (orderItem) =>
        orderItem.id === item.id &&
        JSON.stringify(orderItem.selectedCustom || {}) ===
          JSON.stringify(item.selectedCustom || {})
    );
    if (existingItem) {
      setCurrentOrder(
        currentOrder.map((orderItem) =>
          orderItem.id === item.id &&
          JSON.stringify(orderItem.selectedCustom || {}) ===
            JSON.stringify(item.selectedCustom || {})
            ? { ...orderItem, quantity: orderItem.quantity + 1 }
            : orderItem
        )
      );
    } else {
      setCurrentOrder([
        ...currentOrder,
        { ...item, quantity: 1, customOptions: item.customOptions },
      ]);
    }
  };

  const updateQuantity = (itemId, quantity) => {
    if (quantity <= 0) {
      setCurrentOrder(currentOrder.filter((item) => item.id !== itemId));
    } else {
      setCurrentOrder(
        currentOrder.map((item) =>
          item.id === itemId ? { ...item, quantity } : item
        )
      );
    }
  };

  // removeFromOrder（使用新數據結構）
  const removeFromOrder = async (itemId) => {
    const removingItem = currentOrder.find((item) => item.id === itemId);

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
                item && typeof item === "object" && (item.__seated || item.name)
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
    setCurrentOrder(currentOrder.filter((item) => item.id !== itemId));
  };

  // // 舊checkout (保險起見暫且保留)
  // const checkout = async (paymentMethod = "cash", partialSelection = null) => {
  //   if (!selectedTable) return;

  //   console.group(`💳 開始結帳流程 - ${selectedTable}`);

  //   const isPartialCheckout =
  //     partialSelection &&
  //     (partialSelection.items || partialSelection.quantities) &&
  //     Object.values(partialSelection.items || {}).some(Boolean);

  //   if (selectedTable.startsWith("T")) {
  //     // ==================== 外帶邏輯 ====================
  //     let takeoutData = takeoutOrders[selectedTable];

  //     if (!takeoutData && currentOrder.length > 0) {
  //       const newItems = currentOrder.map((item) => ({
  //         ...item,
  //         timestamp: new Date().toISOString(),
  //         paid: false,
  //         customOptions: item.customOptions,
  //       }));

  //       takeoutData = {
  //         orders: newItems,
  //         timestamp: new Date().toISOString(),
  //         paid: false,
  //       };

  //       const newTakeoutOrders = {
  //         ...takeoutOrders,
  //         [selectedTable]: takeoutData,
  //       };
  //       await saveTakeoutOrdersToFirebase(newTakeoutOrders);
  //     }

  //     if (takeoutData && !takeoutData.paid) {
  //       if (isPartialCheckout) {
  //         // 外帶部分結帳邏輯 - 修正資料傳遞
  //         const { items: selectedItems, quantities: selectedQuantities } =
  //           partialSelection;
  //         const allUnpaidItems = takeoutData.orders.filter(
  //           (item) => item && item.paid === false
  //         );
  //         const itemsToCheckout = [];
  //         const updateInstructions = [];

  //         // 這裡保持原有的 itemsToCheckout 建立邏輯（用於後續更新資料）
  //         Object.entries(selectedItems).forEach(([key, isSelected]) => {
  //           if (isSelected) {
  //             const selectedQty = selectedQuantities[key] || 0;
  //             if (selectedQty > 0) {
  //               const [batchIndex, itemIndexStr] = key.split("-");
  //               const itemIndex = parseInt(itemIndexStr);
  //               const originalItem = allUnpaidItems[itemIndex];

  //               if (originalItem && selectedQty <= originalItem.quantity) {
  //                 itemsToCheckout.push({
  //                   ...originalItem,
  //                   quantity: selectedQty,
  //                 });

  //                 const actualIndex = takeoutData.orders.findIndex(
  //                   (orderItem) => orderItem === originalItem
  //                 );
  //                 if (actualIndex !== -1) {
  //                   const remainingQuantity =
  //                     originalItem.quantity - selectedQty;
  //                   updateInstructions.push({
  //                     actualIndex,
  //                     originalQuantity: originalItem.quantity,
  //                     selectedQty,
  //                     remainingQuantity,
  //                     shouldRemove: remainingQuantity === 0,
  //                   });
  //                 }
  //               }
  //             }
  //           }
  //         });

  //         if (itemsToCheckout.length === 0) {
  //           alert("沒有選中有效的項目");
  //           return;
  //         }

  //         const completeOrderData = {
  //           batches: [takeoutData.orders], // 完整的訂單列表
  //         };
  //         const historyRecord = createHistoryRecord(
  //           selectedTable,
  //           completeOrderData,
  //           "takeout",
  //           paymentMethod,
  //           true,
  //           partialSelection
  //         );

  //         if (!historyRecord) {
  //           alert("建立結帳記錄失敗，請稍後再試");
  //           return;
  //         }

  //         try {
  //           await addSalesRecord(historyRecord);
  //           const newHistory = [...salesHistory, historyRecord];
  //           await saveSalesHistoryToFirebase(newHistory);

  //           const updatedOrders = [...takeoutData.orders];
  //           updateInstructions.forEach(
  //             ({ actualIndex, remainingQuantity, shouldRemove }) => {
  //               if (actualIndex >= 0 && actualIndex < updatedOrders.length) {
  //                 if (shouldRemove || remainingQuantity <= 0) {
  //                   updatedOrders[actualIndex] = {
  //                     ...updatedOrders[actualIndex],
  //                     paid: true,
  //                   };
  //                 } else {
  //                   updatedOrders[actualIndex] = {
  //                     ...updatedOrders[actualIndex],
  //                     quantity: remainingQuantity,
  //                   };
  //                 }
  //               }
  //             }
  //           );

  //           const hasUnpaidItems = updatedOrders.some(
  //             (item) => item.paid === false
  //           );
  //           const newTakeoutOrders = {
  //             ...takeoutOrders,
  //             [selectedTable]: {
  //               ...takeoutData,
  //               orders: updatedOrders,
  //               paid: !hasUnpaidItems,
  //             },
  //           };
  //           await saveTakeoutOrdersToFirebase(newTakeoutOrders);

  //           if (hasUnpaidItems) {
  //             setCurrentOrder([]);
  //             alert(`外帶部分結帳成功！結帳金額：$${historyRecord.total}`);
  //           } else {
  //             setCurrentOrder([]);
  //             setSelectedTable(null);
  //             setCurrentView("main");
  //             alert(`外帶全部結帳完成！結帳金額：$${historyRecord.total}`);
  //           }
  //         } catch (error) {
  //           console.error("外帶部分結帳失敗:", error);
  //           alert("結帳失敗，請稍後再試");
  //         }
  //       } else {
  //         // 外帶全部結帳邏輯
  //         const allUnpaidItems = takeoutData.orders.filter(
  //           (item) => item && item.paid === false
  //         );
  //         if (allUnpaidItems.length === 0) {
  //           alert("沒有可結帳的項目");
  //           return;
  //         }

  //         const batchFormatData = { batches: [allUnpaidItems] };
  //         const historyRecord = createHistoryRecord(
  //           selectedTable,
  //           batchFormatData,
  //           "takeout",
  //           paymentMethod
  //         );

  //         if (!historyRecord) {
  //           alert("建立結帳記錄失敗，請稍後再試");
  //           return;
  //         }

  //         try {
  //           await addSalesRecord(historyRecord);
  //           const newHistory = [...salesHistory, historyRecord];
  //           await saveSalesHistoryToFirebase(newHistory);

  //           const paidOrders = takeoutData.orders.map((item) => ({
  //             ...item,
  //             paid: true,
  //           }));
  //           const newTakeoutOrders = {
  //             ...takeoutOrders,
  //             [selectedTable]: {
  //               ...takeoutData,
  //               orders: paidOrders,
  //               paid: true,
  //             },
  //           };
  //           await saveTakeoutOrdersToFirebase(newTakeoutOrders);

  //           setCurrentOrder([]);
  //           setSelectedTable(null);
  //           setCurrentView("main");
  //           alert(`外帶結帳成功！結帳金額：$${historyRecord.total}`);
  //         } catch (error) {
  //           console.error("外帶全部結帳失敗:", error);
  //           alert("結帳失敗，請稍後再試");
  //           return;
  //         }
  //       }
  //     }
  //     console.groupEnd();
  //     return;
  //   } else {
  //     // ==================== 內用邏輯 ====================
  //     const currentTableState = tableStates[selectedTable];

  //     if (currentTableState && currentTableState.orders) {
  //       const allUnpaidItems = currentTableState.orders.filter(
  //         (item) => item && !item.__seated && item.paid === false
  //       );

  //       if (allUnpaidItems.length === 0) {
  //         alert("沒有可結帳的項目");
  //         console.groupEnd();
  //         return;
  //       }

  //       // 獲取或生成 groupId
  //       let existingGroupId = currentTableState.groupId;
  //       if (!existingGroupId) {
  //         for (const item of allUnpaidItems) {
  //           if (item.groupId) {
  //             existingGroupId = item.groupId;
  //             break;
  //           }
  //         }
  //       }
  //       if (!existingGroupId) {
  //         existingGroupId = generateGroupId();
  //         await saveTableStateToFirebase(selectedTable, {
  //           ...currentTableState,
  //           groupId: existingGroupId,
  //         });
  //       }

  //       if (isPartialCheckout) {
  //         const { items: selectedItems, quantities: selectedQuantities } =
  //           partialSelection;

  //         // 直接在這裡建立歷史記錄，避免索引不一致問題
  //         const itemsToCheckout = [];
  //         const updateInstructions = [];

  //         // 處理選擇的商品
  //         Object.entries(selectedItems).forEach(([key, isSelected]) => {
  //           if (isSelected) {
  //             const selectedQty = selectedQuantities[key] || 1;

  //             if (selectedQty > 0) {
  //               const [batchIndex, itemIndexStr] = key.split("-");
  //               const itemIndex = parseInt(itemIndexStr);

  //               const originalItem = allUnpaidItems[itemIndex];

  //               if (originalItem && selectedQty <= originalItem.quantity) {
  //                 // 創建結帳項目 - 計算正確的價格
  //                 const itemSubtotal = calculateItemSubtotal({
  //                   ...originalItem,
  //                   quantity: selectedQty,
  //                 });

  //                 itemsToCheckout.push({
  //                   id: originalItem.id,
  //                   name: originalItem.name,
  //                   price: originalItem.price,
  //                   quantity: selectedQty,
  //                   subtotal: itemSubtotal,
  //                   selectedCustom: originalItem.selectedCustom || null,
  //                   customOptions: originalItem.customOptions || null,
  //                 });

  //                 // 找到實際索引用於更新
  //                 const actualIndex = currentTableState.orders.findIndex(
  //                   (orderItem) => orderItem === originalItem
  //                 );

  //                 if (actualIndex !== -1) {
  //                   const remainingQuantity =
  //                     originalItem.quantity - selectedQty;

  //                   updateInstructions.push({
  //                     actualIndex,
  //                     originalQuantity: originalItem.quantity,
  //                     selectedQty,
  //                     remainingQuantity,
  //                     shouldRemove: remainingQuantity === 0,
  //                   });
  //                 } else {
  //                   console.error("❌ 找不到商品在訂單中的位置:", originalItem);
  //                 }
  //               } else {
  //                 console.warn("⚠️ 商品不存在或數量超出範圍:", {
  //                   itemIndex,
  //                   selectedQty,
  //                   originalItem: originalItem ? originalItem.name : "不存在",
  //                   maxQuantity: originalItem ? originalItem.quantity : 0,
  //                 });
  //               }
  //             }
  //           }
  //         });

  //         itemsToCheckout.forEach((item, index) => {});

  //         if (itemsToCheckout.length === 0) {
  //           alert("沒有選中有效的項目");
  //           console.groupEnd();
  //           return;
  //         }

  //         // 直接建立歷史記錄，避免使用 createHistoryRecord
  //         const now = new Date();
  //         const parts = now
  //           .toLocaleDateString("zh-TW", { timeZone: "Asia/Taipei" })
  //           .split("/");
  //         const taiwanDateStr = `${parts[0]}-${parts[1].padStart(
  //           2,
  //           "0"
  //         )}-${parts[2].padStart(2, "0")}`;

  //         const total = itemsToCheckout.reduce(
  //           (sum, item) => sum + item.subtotal,
  //           0
  //         );

  //         const historyRecord = {
  //           id: generateHistoryId(),
  //           groupId: existingGroupId,
  //           date: taiwanDateStr,
  //           time: now.toTimeString().slice(0, 8),
  //           timestamp: now.getTime(),
  //           type: "table",
  //           table: selectedTable,
  //           items: itemsToCheckout,
  //           total: total,
  //           itemCount: itemsToCheckout.reduce(
  //             (sum, item) => sum + item.quantity,
  //             0
  //           ),
  //           paymentMethod,
  //           isPartialPayment: true,
  //           partialPaymentInfo: {
  //             totalItems: Object.keys(partialSelection.items || {}).length,
  //             selectedItems: Object.values(partialSelection.items || {}).filter(
  //               Boolean
  //             ).length,
  //             note: "此為部分結帳，每個商品項目獨立記錄",
  //           },
  //         };

  //         try {
  //           // 儲存歷史記錄
  //           await addSalesRecord(historyRecord);

  //           const newHistory = [...salesHistory, historyRecord];
  //           await saveSalesHistoryToFirebase(newHistory);

  //           // 更新桌位狀態
  //           const updatedOrders = [...currentTableState.orders];

  //           updateInstructions.forEach(
  //             ({ actualIndex, remainingQuantity, shouldRemove }) => {
  //               if (actualIndex >= 0 && actualIndex < updatedOrders.length) {
  //                 if (shouldRemove || remainingQuantity <= 0) {
  //                   // 標記為已付款
  //                   updatedOrders[actualIndex] = {
  //                     ...updatedOrders[actualIndex],
  //                     paid: true,
  //                     groupId: existingGroupId,
  //                   };
  //                 } else {
  //                   // 更新剩餘數量
  //                   updatedOrders[actualIndex] = {
  //                     ...updatedOrders[actualIndex],
  //                     quantity: remainingQuantity,
  //                   };
  //                 }
  //               }
  //             }
  //           );

  //           await saveTableStateToFirebase(selectedTable, {
  //             ...currentTableState,
  //             orders: updatedOrders,
  //             groupId: existingGroupId,
  //             status: getTableStatusFromOrders(updatedOrders),
  //           });

  //           setCurrentOrder([]);
  //         } catch (error) {
  //           console.error("❌ 內用部分結帳失敗:", error);
  //           console.error("錯誤詳情:", error.message);
  //           console.error("錯誤堆疊:", error.stack);
  //           alert("結帳失敗，請稍後再試。錯誤: " + error.message);
  //         }
  //       } else {
  //         // 🔄 內用全部結帳邏輯 - 直接建立歷史記錄

  //         // 計算所有商品的小計
  //         const itemsToCheckout = allUnpaidItems.map((item) => ({
  //           id: item.id,
  //           name: item.name,
  //           price: item.price,
  //           quantity: item.quantity,
  //           subtotal: calculateItemSubtotal(item),
  //           selectedCustom: item.selectedCustom || null,
  //           customOptions: item.customOptions || null,
  //         }));

  //         if (itemsToCheckout.length === 0) {
  //           alert("沒有可結帳的項目");
  //           console.groupEnd();
  //           return;
  //         }

  //         // 直接建立歷史記錄
  //         const now = new Date();
  //         const parts = now
  //           .toLocaleDateString("zh-TW", { timeZone: "Asia/Taipei" })
  //           .split("/");
  //         const taiwanDateStr = `${parts[0]}-${parts[1].padStart(
  //           2,
  //           "0"
  //         )}-${parts[2].padStart(2, "0")}`;

  //         const total = itemsToCheckout.reduce(
  //           (sum, item) => sum + item.subtotal,
  //           0
  //         );

  //         const historyRecord = {
  //           id: generateHistoryId(),
  //           groupId: existingGroupId,
  //           date: taiwanDateStr,
  //           time: now.toTimeString().slice(0, 8),
  //           timestamp: now.getTime(),
  //           type: "table",
  //           table: selectedTable,
  //           items: itemsToCheckout,
  //           total: total,
  //           itemCount: itemsToCheckout.reduce(
  //             (sum, item) => sum + item.quantity,
  //             0
  //           ),
  //           paymentMethod,
  //           isPartialPayment: false,
  //           partialPaymentInfo: null,
  //         };

  //         try {
  //           await addSalesRecord(historyRecord);

  //           const newHistory = [...salesHistory, historyRecord];
  //           await saveSalesHistoryToFirebase(newHistory);

  //           // 更新桌位狀態 - 全部標記為已付款
  //           const paidOrders = currentTableState.orders.map((item) => {
  //             if (item && !item.__seated) {
  //               return {
  //                 ...item,
  //                 paid: true,
  //                 groupId: existingGroupId,
  //               };
  //             }
  //             return item;
  //           });

  //           await saveTableStateToFirebase(selectedTable, {
  //             ...currentTableState,
  //             orders: paidOrders,
  //             groupId: existingGroupId,
  //             status: "ready-to-clean",
  //           });

  //           setCurrentOrder([]);
  //           setSelectedTable(null);
  //           setCurrentView("main");
  //         } catch (error) {
  //           console.error("❌ 內用全部結帳失敗:", error);
  //           alert("結帳失敗，請稍後再試");
  //         }
  //       }
  //     }
  //   }

  //   console.groupEnd();
  // };

  //統一結帳函數
  const checkout = async (paymentMethod = "cash", partialSelection = null) => {
    console.group(`💳 統一結帳流程開始 - ${selectedTable}`);

    try {
      // ==================== 1. 環境判斷 ====================
      const isPartialCheckout = Boolean(
        partialSelection &&
          Object.values(partialSelection.items || {}).some(Boolean)
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
          (item) => item && typeof item === "object"
        );
      } else {
        // 內用
        sourceData = tableStates[selectedTable];
        if (!sourceData?.orders) {
          throw new Error("找不到桌位訂單資料");
        }

        // 統一格式：取得完整商品列表（排除入座標記）
        allItems = sourceData.orders.filter(
          (item) => item && typeof item === "object" && !item.__seated
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
                (opt) => opt.type === optionType
              );
              if (customOption?.priceAdjustments?.[selectedValue]) {
                totalAdjustment += customOption.priceAdjustments[selectedValue];
              }
            }
          );
        }

        // 向下相容：舊的續杯邏輯
        if (totalAdjustment === 0 && item.selectedCustom?.["續杯"] === "是") {
          const renewalOption = item.customOptions?.find(
            (opt) => opt.type === "續杯"
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

          // 解析 key: "0-itemIndex" 格式
          const [batchIndex, itemIndexStr] = key.split("-");
          const itemIndex = parseInt(itemIndexStr);

          // 從未付款商品中查找（這樣索引就對應了）
          const originalItem = unpaidItems[itemIndex];

          if (!originalItem) {
            console.error(`❌ 找不到索引 ${itemIndex} 的商品`);
            return;
          }

          if (selectedQty > originalItem.quantity) {
            console.error(
              `❌ 選擇數量 ${selectedQty} 超過可用數量 ${originalItem.quantity}`
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

          // 建立更新指令
          const remainingQuantity = originalItem.quantity - selectedQty;
          const actualIndex = allItems.findIndex(
            (item) => item === originalItem
          );

          if (actualIndex !== -1) {
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
            (listItem) => listItem === item
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
        0
      );

      // ==================== 4. 歷史記錄建立（統一） ====================

      // 統一的歷史記錄產生函數
      const createHistoryRecord = () => {
        const now = new Date();
        const parts = now
          .toLocaleDateString("zh-TW", { timeZone: "Asia/Taipei" })
          .split("/");
        const taiwanDateStr = `${parts[0]}-${parts[1].padStart(
          2,
          "0"
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
            0
          ),
          paymentMethod,
          isPartialPayment: isPartialCheckout,
          partialPaymentInfo: isPartialCheckout
            ? {
                totalItems: Object.keys(partialSelection.items || {}).length,
                selectedItems: Object.values(
                  partialSelection.items || {}
                ).filter(Boolean).length,
                note: "此為部分結帳，每個商品項目獨立記錄",
              }
            : null,
        };
      };

      const historyRecord = createHistoryRecord();

      // ==================== 5. 資料更新（統一） ====================

      // 移除這裡的確認對話框，因為在 OrderSummary 的付款方式選擇時已經確認過了

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
          }
        );

        const hasUnpaidItems = updatedOrders.some(
          (item) => item.paid === false
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
          }
        );

        // 判斷桌位新狀態
        const newStatus = updatedOrders.some(
          (item) => item && !item.__seated && item.paid === false
        )
          ? "occupied"
          : "ready-to-clean";

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
          }部分結帳成功！結帳金額：$${total}`
        );
      } else {
        setSelectedTable(null);
        setCurrentView("main");
        alert(
          `${type === "takeout" ? "外帶" : "內用"}結帳成功！結帳金額：$${total}`
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
          orderItem.isTakeout === true
      );

      if (isAlreadyEditing) {
        setCurrentOrder(
          currentOrder.filter(
            (orderItem) =>
              !(
                orderItem.isEditing &&
                orderItem.originalItemIndex === itemIndex &&
                orderItem.isTakeout === true
              )
          )
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
        (item) => item && typeof item === "object" && !item.__seated
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
          !orderItem.isTakeout
      );

      if (isAlreadyEditing) {
        setCurrentOrder(
          currentOrder.filter(
            (orderItem) =>
              !(
                orderItem.isEditing &&
                orderItem.originalItemIndex === actualFlatIndex &&
                !orderItem.isTakeout
              )
          )
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

  //處理頁面跳轉
  const handleGoToChangePassword = () => {
    setCurrentView("changepassword");
  };

  // 密碼更改成功後可以返回帳戶管理頁面
  const handlePasswordChanged = () => {
    alert("密碼已成功更改");
    setCurrentView("account");
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
        salesHistory={salesHistory}
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
          (item) => item && typeof item === "object" && item.paid === false
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
          item.paid === false
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
