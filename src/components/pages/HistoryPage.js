import React from "react";
import Header from "../UI/Header";
import useHistoryData from "../hooks/useHistoryData";
import {
  getDateRangeText,
  getDailyBreakdown,
  groupRecordsByTable,
  getPopularItems,
} from "../../utils/historyUtils";

import DateSelector from "./HistoryPage/DateSelector";
import StatisticsCards from "./HistoryPage/StatisticsCards";
import DailyAnalysisTable from "./HistoryPage/DailyAnalysisTable";
import PopularItemsCard from "./HistoryPage/PopularItemsCard";
import DetailedRecordsCard from "./HistoryPage/DetailedRecordsCard";
import PaymentMethodCard from "./HistoryPage/PaymentMethodCard";
import RefundStatisticsCard from "./HistoryPage/RefundStatisticsCard";
import DailyOrdersList from "./HistoryPage/DailyOrdersList";
import WeeklyMonthlyOverview from "./HistoryPage/WeeklyMonthlyOverview";
import RefundConfirmModal from "./HistoryPage/RefundConfirmModal";

/**
 * HistoryPage
 *
 * 原始程式碼：HistoryPage.js（1128 行）
 * 功能效果：顯示銷售歷史，支援日/週/月篩選、退款操作
 * 用途：重構後的主元件，只負責組合子元件，所有邏輯移至 hook 與工具函數
 * 組件長度：約 80 行
 */
const HistoryPage = ({ onBack, onMenuSelect, onRefundOrder, onLogout }) => {
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

  // 衍生資料
  const allPeriodRecords = salesHistory;
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

  return (
    <div className="min-h-screen bg-gray-100">
      {loading && (
        <div className="fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded shadow-lg z-50">
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
        <DateSelector
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          displayMode={displayMode}
          onDisplayModeChange={setDisplayMode}
          dateRangeText={dateRangeText}
        />

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
