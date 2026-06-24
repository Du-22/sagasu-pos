import React, { useMemo, useState } from "react";
import Header from "../UI/Header";
import useHistoryData from "../../hooks/useHistoryData";
import useExpenseData from "../../hooks/useExpenseData";
import useFinancialSummaryData from "../../hooks/useFinancialSummaryData";
import {
  getDateRangeText,
  getDailyBreakdown,
  groupRecordsByTable,
  getPopularItems,
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
import ArchivedSummaryNotice from "./HistoryPage/ArchivedSummaryNotice";

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

  const {
    expenseRecords,
    commonExpenseItems,
    expenseLoading,
    expenseSaving,
    handleAddExpenseRecord,
    handleDeleteExpenseRecord,
    handleAddCommonExpenseItem,
    handleUpdateCommonExpenseItem,
    handleDeleteCommonExpenseItem,
  } = useExpenseData(selectedDate, viewMode);

  const {
    dailySummaries,
    summaryLoading,
  } = useFinancialSummaryData(selectedDate, viewMode);

  const summarizedDateSet = useMemo(
    () => new Set(dailySummaries.map((summary) => summary.date)),
    [dailySummaries],
  );

  const summaryTotals = useMemo(
    () =>
      dailySummaries.reduce(
        (totals, summary) => ({
          incomeTotal: totals.incomeTotal + summary.incomeTotal,
          expenseTotal: totals.expenseTotal + summary.expenseTotal,
          netTotal: totals.netTotal + summary.netTotal,
          orderCount: totals.orderCount + summary.orderCount,
          itemCount: totals.itemCount + summary.itemCount,
          refundTotal: totals.refundTotal + summary.refundTotal,
          refundCount: totals.refundCount + summary.refundCount,
          expenseRecordCount:
            totals.expenseRecordCount + summary.expenseRecordCount,
        }),
        {
          incomeTotal: 0,
          expenseTotal: 0,
          netTotal: 0,
          orderCount: 0,
          itemCount: 0,
          refundTotal: 0,
          refundCount: 0,
          expenseRecordCount: 0,
        },
      ),
    [dailySummaries],
  );

  const allPeriodRecords = salesHistory;
  const activePeriodRecords = allPeriodRecords.filter((r) => !r.isRefunded);
  const refundedPeriodRecords = allPeriodRecords.filter((r) => r.isRefunded);
  const visiblePeriodRecords = allPeriodRecords.filter(
    (record) => !summarizedDateSet.has(record.date),
  );
  const visibleActivePeriodRecords = visiblePeriodRecords.filter(
    (r) => !r.isRefunded,
  );
  const visibleRefundedPeriodRecords = visiblePeriodRecords.filter(
    (r) => r.isRefunded,
  );
  const activeDetailRecordsForTotals = activePeriodRecords.filter(
    (record) => !summarizedDateSet.has(record.date),
  );
  const refundedDetailRecordsForTotals = refundedPeriodRecords.filter(
    (record) => !summarizedDateSet.has(record.date),
  );
  const detailExpenseRecordsForTotals = expenseRecords.filter(
    (record) => !summarizedDateSet.has(record.date),
  );
  const periodTotal =
    summaryTotals.incomeTotal +
    activeDetailRecordsForTotals.reduce((sum, r) => sum + r.total, 0);
  const periodItemCount =
    summaryTotals.itemCount +
    activeDetailRecordsForTotals.reduce((sum, r) => sum + r.itemCount, 0);
  const periodOrderCount =
    summaryTotals.orderCount + activeDetailRecordsForTotals.length;
  const refundedTotal =
    summaryTotals.refundTotal +
    refundedDetailRecordsForTotals.reduce((sum, r) => sum + r.total, 0);
  const displayRecords = showRefundedOrders
    ? visiblePeriodRecords
    : visibleActivePeriodRecords;

  const popularItems = getPopularItems(visiblePeriodRecords);
  const groupedRecords = groupRecordsByTable(displayRecords);
  const dateRangeText = getDateRangeText(viewMode, selectedDate);
  const dailyBreakdown =
    viewMode !== "daily"
      ? [
          ...dailySummaries.map((summary) => ({
            date: summary.date,
            orderCount: summary.orderCount,
            itemCount: summary.itemCount,
            revenue: summary.incomeTotal,
            isArchived: true,
          })),
          ...getDailyBreakdown(
            allPeriodRecords.filter((record) => !summarizedDateSet.has(record.date)),
          ),
        ].sort((a, b) => b.date.localeCompare(a.date))
      : [];

  const detailExpenseTotal = detailExpenseRecordsForTotals.reduce(
    (sum, record) => sum + record.amount,
    0,
  );
  const periodExpenseTotal = summaryTotals.expenseTotal + detailExpenseTotal;
  const periodExpenseCount =
    summaryTotals.expenseRecordCount + detailExpenseRecordsForTotals.length;
  const hasArchivedSummaries = dailySummaries.length > 0;
  const hasVisibleDetails =
    visiblePeriodRecords.length > 0 || detailExpenseRecordsForTotals.length > 0;

  const vendorOptions = useMemo(
    () => [...new Set(expenseRecords.map((record) => record.vendor))],
    [expenseRecords],
  );

  const materialOptions = useMemo(
    () => [...new Set(commonExpenseItems.map((item) => item.name))],
    [commonExpenseItems],
  );

  const commonVendorOptions = useMemo(
    () => [...new Set(commonExpenseItems.map((item) => item.vendor))],
    [commonExpenseItems],
  );

  return (
    <div className="min-h-screen bg-parchment">
      {(loading || expenseLoading || expenseSaving || summaryLoading) && (
        <div className="fixed top-4 right-4 bg-terracotta text-ivory px-4 py-2 rounded shadow-lg z-50">
          資料同步中...
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

        {hasArchivedSummaries && (
          <ArchivedSummaryNotice
            archivedDayCount={dailySummaries.length}
            archivedIncomeTotal={summaryTotals.incomeTotal}
            archivedExpenseTotal={summaryTotals.expenseTotal}
            hasVisibleDetails={hasVisibleDetails}
            dateRangeText={dateRangeText}
          />
        )}

        {activeFinancialTab === "income" && (
          <>
            <StatisticsCards
              orderCount={periodOrderCount}
              itemCount={periodItemCount}
              periodTotal={periodTotal}
              refundedTotal={refundedTotal}
            />

            <DailyAnalysisTable dailyBreakdown={dailyBreakdown} viewMode={viewMode} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <PopularItemsCard popularItems={popularItems} viewMode={viewMode} />
              <DetailedRecordsCard
                activePeriodRecords={visibleActivePeriodRecords}
                periodTotal={periodTotal}
              />
              <PaymentMethodCard
                activePeriodRecords={visibleActivePeriodRecords}
                periodTotal={periodTotal}
              />
              <RefundStatisticsCard
                refundedPeriodRecords={visibleRefundedPeriodRecords}
                allPeriodRecords={visiblePeriodRecords}
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
            expenseRecords={expenseRecords}
            archivedExpenseTotal={summaryTotals.expenseTotal}
            archivedExpenseCount={summaryTotals.expenseRecordCount}
            hasArchivedSummaries={hasArchivedSummaries}
            vendorOptions={vendorOptions}
            materialOptions={materialOptions}
            commonVendorOptions={commonVendorOptions}
            commonExpenseItems={commonExpenseItems}
            isSaving={expenseSaving}
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
            orderCount={periodOrderCount}
            expenseCount={periodExpenseCount}
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
