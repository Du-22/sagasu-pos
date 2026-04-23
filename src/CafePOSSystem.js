import React, { useState } from "react";
import SeatingPage from "./components/pages/SeatingPage";
import OrderingPage from "./components/pages/OrderingPage";
import HistoryPage from "./components/pages/HistoryPage";
import MenuEditorPage from "./components/pages/MenuEditorPage";
import defaultMenuData from "./data/defaultMenuData";
import ExportReportsPage from "./components/pages/ExportReportsPage";
import LoginPage from "./auth/LoginPage";
import LoginFailurePage from "./auth/LoginFailurePage";
import ChangePasswordPage from "./auth/ChangePasswordPage";
import AccountManagementPage from "./components/pages/AccountManagementPage";
import SetupSecurityQuestionPage from "./auth/SetupSecurityQuestionPage";
import ForgotPasswordPage from "./auth/ForgotPasswordPage";
import useDataManager from "./hooks/useDataManager";
import SmartConnectionMonitor from "./utils/SmartConnectionMonitor";

import useAuth from "./hooks/useAuth";
import useFirebaseSync from "./hooks/useFirebaseSync";
import useTableActions from "./hooks/useTableActions";
import useOrderActions from "./hooks/useOrderActions";
import useCheckout from "./hooks/useCheckout";
import useInitialLoad from "./hooks/useInitialLoad";
import SeatConfirmModal from "./components/UI/SeatConfirmModal";
import MoveTableModal from "./components/UI/MoveTableModal";


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

  // hook初始化
  const dataManager = useDataManager();

  const {
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
  });

  const { checkout, handleRefund } = useCheckout({
    selectedTable,
    currentOrder,
    tableStates,
    takeoutOrders,
    salesHistory,
    setCurrentOrder,
    setSelectedTable,
    setCurrentView,
    setSalesHistory,
    saveTableStateToFirebase,
    saveTakeoutOrdersToFirebase,
    saveSalesHistoryToFirebase,
  });

  const { isLoading, loadError } = useInitialLoad({
    dataManager,
    setMenuData,
    setTableStates,
    setTakeoutOrders,
    setSalesHistory,
  });


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
      <div className="min-h-screen bg-parchment flex items-center justify-center">
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
      <div className="min-h-screen bg-parchment flex items-center justify-center">
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

  const handleMenuSelect = (menuId) => {
    setCurrentView(menuId);
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
        <MoveTableModal
          isOpen={showMoveTableModal}
          selectedTable={selectedTable}
          allTableIds={allTableIds}
          moveTableTarget={moveTableTarget}
          getTableStatus={getTableStatus}
          onTargetChange={setMoveTableTarget}
          onConfirm={() => handleMoveTable(selectedTable, moveTableTarget)}
          onCancel={() => {
            setShowMoveTableModal(false);
            setMoveTableTarget("");
          }}
        />
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

      <SeatConfirmModal
        isOpen={showSeatConfirmModal}
        onConfirm={handleSeatConfirm}
        onCancel={() => {
          setShowSeatConfirmModal(false);
          setPendingSeatTable(null);
        }}
      />
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
