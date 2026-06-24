import React, { useMemo, useState } from "react";
import Header from "../UI/Header";
import useHistoryData from "../../hooks/useHistoryData";
import {
  getDateRangeText,
  getDailyBreakdown,
  getMonthRange,
  groupRecordsByTable,
  getPopularItems,
  getWeekRange,
} from "../../utils/historyUtils";

import DateSelector from "./HistoryPage/DateSelector";
import FinancialTabs from "./HistoryPage/FinancialTabs";
import ExpenseRecordsPage from "./HistoryPage/ExpenseRecordsPage";
import ProfitOverviewPage from "./HistoryPage/ProfitOverviewPage";
import StatisticsCards from "./HistoryPage/StatisticsCards";
import DailyAnalysisTable from "./HistoryPage/DailyAnalysisTable";
import PopularItemsCard from "./HistoryPage/PopularItemsCard";
import DetailedRecordsCard from "./HistoryPage/DetailedRecordsCard";
import PaymentMethodCard from "./HistoryPage/PaymentMethodCard";
import RefundStatisticsCard from "./HistoryPage/RefundStatisticsCard";
import DailyOrdersList from "./HistoryPage/DailyOrdersList";
import WeeklyMonthlyOverview from "./HistoryPage/WeeklyMonthlyOverview";
import RefundConfirmModal from "./HistoryPage/RefundConfirmModal";
import {
  createDemoIncomeRecords,
  demoCommonExpenseItems,
  demoExpenseRecords,
} from "./HistoryPage/demoFinancialData";

/**
 * HistoryPage
 *
 * 原始程式碼：HistoryPage.js（1128 行）
 * 功能效果：顯示銷售歷史，支援日/週/月篩選、退款操作
 * 用途：重構後的主元件，只負責組合子元件，所有邏輯移至 hook 與工具函數
 * 組件長度：約 80 行
 */
const HistoryPage = ({ onBack, onMenuSelect, onRefundOrder, onLogout }) => {
  const [activeFinancialTab, setActiveFinancialTab] = useState("income");
  const [expenseRecords, setExpenseRecords] = useState(demoExpenseRecords);
  const [commonExpenseItems, setCommonExpenseItems] = useState(demoCommonExpenseItems);

  const {
    salesHistory,
    loading,
    selectedDate,
    setSelectedDate,
    viewMode,
    setViewMode,
    displayMode,
    setDisplayMode,
    showRefundedOrders,
    setShowRefundedOrders,
    showRefundModal,
    selectedRefundRecord,
    handleRefundClick,
    handleConfirmRefund,
    handleCancelRefund,
  } = useHistoryData({ onRefundOrder });

  const demoIncomeRecords = useMemo(
    () => createDemoIncomeRecords(selectedDate),
    [selectedDate],
  );

  // v0 fallback: 沒有 Firebase 收入資料時，先用範例資料讓收支總覽可預覽。
  const allPeriodRecords = salesHistory.length > 0 ? salesHistory : demoIncomeRecords;
  const activePeriodRecords = allPeriodRecords.filter((r) => !r.isRefunded);
  const refundedPeriodRecords = allPeriodRecords.filter((r) => r.isRefunded);
  const periodTotal = activePeriodRecords.reduce((sum, r) => sum + r.total, 0);
  const periodItemCount = activePeriodRecords.reduce((sum, r) => sum + r.itemCount, 0);
  const refundedTotal = refundedPeriodRecords.reduce((sum, r) => sum + r.total, 0);
  const displayRecords = showRefundedOrders ? allPeriodRecords : activePeriodRecords;

  const popularItems = getPopularItems(allPeriodRecords);
  const groupedRecords = groupRecordsByTable(displayRecords);
  const dailyBreakdown = viewMode !== "daily" ? getDailyBreakdown(allPeriodRecords) : [];
  const dateRangeText = getDateRangeText(viewMode, selectedDate);

  const filteredExpenseRecords = useMemo(() => {
    let startDate = selectedDate;
    let endDate = selectedDate;

    if (viewMode === "weekly") {
      const range = getWeekRange(selectedDate);
      startDate = range.start;
      endDate = range.end;
    }

    if (viewMode === "monthly") {
      const range = getMonthRange(selectedDate);
      startDate = range.start;
      endDate = range.end;
    }

    return expenseRecords
      .filter((record) => record.date >= startDate && record.date <= endDate)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [expenseRecords, selectedDate, viewMode]);

  const periodExpenseTotal = filteredExpenseRecords.reduce(
    (sum, record) => sum + record.amount,
    0,
  );

  const vendorOptions = useMemo(
    () => [...new Set(filteredExpenseRecords.map((record) => record.vendor))],
    [filteredExpenseRecords],
  );

  const materialOptions = useMemo(
    () => [...new Set(commonExpenseItems.map((item) => item.name))],
    [commonExpenseItems],
  );

  const commonVendorOptions = useMemo(
    () => [...new Set(commonExpenseItems.map((item) => item.vendor))],
    [commonExpenseItems],
  );

  const handleAddExpenseRecord = (record) => {
    setExpenseRecords((currentRecords) => [
      {
        ...record,
        id: `expense-${Date.now()}`,
      },
      ...currentRecords,
    ]);
  };

  const handleDeleteExpenseRecord = (recordId) => {
    setExpenseRecords((currentRecords) =>
      currentRecords.filter((record) => record.id !== recordId),
    );
  };

  const handleAddCommonExpenseItem = (item) => {
    setCommonExpenseItems((currentItems) => [
      {
        ...item,
        id: `common-expense-${Date.now()}`,
      },
      ...currentItems,
    ]);
  };

  const handleDeleteCommonExpenseItem = (itemId) => {
    setCommonExpenseItems((currentItems) =>
      currentItems.filter((item) => item.id !== itemId),
    );
  };

  const handleUpdateCommonExpenseItem = (itemId, nextItem) => {
    setCommonExpenseItems((currentItems) =>
      currentItems.map((item) =>
        item.id === itemId ? { ...item, ...nextItem } : item,
      ),
    );
  };

  return (
    <div className="min-h-screen bg-parchment">
      {loading && (
        <div className="fixed top-4 right-4 bg-terracotta text-ivory px-4 py-2 rounded shadow-lg z-50">
          載入中...
        </div>
      )}

      <Header
        title="Sasuga POS系統"
        subtitle="營業紀錄"
        currentPage="history"
        onMenuSelect={onMenuSelect}
        onLogout={onLogout}
      />

      <div className="p-4 space-y-4">
        <FinancialTabs
          activeTab={activeFinancialTab}
          onTabChange={setActiveFinancialTab}
        />

        <DateSelector
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          displayMode={displayMode}
          onDisplayModeChange={setDisplayMode}
          dateRangeText={dateRangeText}
          showDisplayModeControls={activeFinancialTab === "income"}
        />

        {activeFinancialTab === "income" && (
          <>
            <StatisticsCards
              orderCount={activePeriodRecords.length}
              itemCount={periodItemCount}
              periodTotal={periodTotal}
              refundedTotal={refundedTotal}
            />

            <DailyAnalysisTable dailyBreakdown={dailyBreakdown} viewMode={viewMode} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <PopularItemsCard popularItems={popularItems} viewMode={viewMode} />
              <DetailedRecordsCard
                activePeriodRecords={activePeriodRecords}
                periodTotal={periodTotal}
              />
              <PaymentMethodCard
                activePeriodRecords={activePeriodRecords}
                periodTotal={periodTotal}
              />
              <RefundStatisticsCard
                refundedPeriodRecords={refundedPeriodRecords}
                allPeriodRecords={allPeriodRecords}
                refundedTotal={refundedTotal}
              />
            </div>

            <DailyOrdersList
              viewMode={viewMode}
              displayMode={displayMode}
              displayRecords={displayRecords}
              groupedRecords={groupedRecords}
              selectedDate={selectedDate}
              showRefundedOrders={showRefundedOrders}
              onShowRefundedChange={setShowRefundedOrders}
              onRefundClick={handleRefundClick}
            />

            <WeeklyMonthlyOverview
              viewMode={viewMode}
              displayRecords={displayRecords}
              showRefundedOrders={showRefundedOrders}
              onShowRefundedChange={setShowRefundedOrders}
              onRefundClick={handleRefundClick}
            />
          </>
        )}

        {activeFinancialTab === "expense" && (
          <ExpenseRecordsPage
            selectedDate={selectedDate}
            dateRangeText={dateRangeText}
            expenseRecords={filteredExpenseRecords}
            vendorOptions={vendorOptions}
            materialOptions={materialOptions}
            commonVendorOptions={commonVendorOptions}
            commonExpenseItems={commonExpenseItems}
            onAddRecord={handleAddExpenseRecord}
            onDeleteRecord={handleDeleteExpenseRecord}
            onAddCommonItem={handleAddCommonExpenseItem}
            onUpdateCommonItem={handleUpdateCommonExpenseItem}
            onDeleteCommonItem={handleDeleteCommonExpenseItem}
          />
        )}

        {activeFinancialTab === "overview" && (
          <ProfitOverviewPage
            incomeTotal={periodTotal}
            expenseTotal={periodExpenseTotal}
            orderCount={activePeriodRecords.length}
            expenseCount={filteredExpenseRecords.length}
            dateRangeText={dateRangeText}
          />
        )}
      </div>

      <RefundConfirmModal
        isOpen={showRefundModal}
        record={selectedRefundRecord}
        onConfirm={handleConfirmRefund}
        onCancel={handleCancelRefund}
      />
    </div>
  );
};

export default HistoryPage;
