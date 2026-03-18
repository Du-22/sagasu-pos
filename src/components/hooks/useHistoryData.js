import { useState, useEffect } from "react";
import { getSalesHistoryByDate, updateSalesRecord } from "../../firebase/operations";
import { getWeekRange, getMonthRange } from "../../utils/historyUtils";

/**
 * useHistoryData Hook
 *
 * 原始程式碼：定義在 HistoryPage.js 的 state、fetchSalesData、退款處理函數
 * 功能效果：管理銷售歷史資料的載入、篩選狀態、退款 Modal 狀態與操作
 * 用途：封裝 HistoryPage 的所有資料邏輯，讓主元件只負責組合 UI
 * 組件長度：約 90 行
 */
const useHistoryData = ({ onRefundOrder }) => {
  const [salesHistory, setSalesHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    const parts = now
      .toLocaleDateString("zh-TW", { timeZone: "Asia/Taipei" })
      .split("/");
    return `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
  });
  const [viewMode, setViewMode] = useState("daily");
  const [displayMode, setDisplayMode] = useState("grouped");
  const [showRefundedOrders, setShowRefundedOrders] = useState(true);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [selectedRefundRecord, setSelectedRefundRecord] = useState(null);

  useEffect(() => {
    fetchSalesData();
  }, [selectedDate, viewMode]);

  const fetchSalesData = async () => {
    setLoading(true);
    try {
      let startDate, endDate;

      if (viewMode === "daily") {
        startDate = endDate = selectedDate;
      } else if (viewMode === "weekly") {
        const range = getWeekRange(selectedDate);
        startDate = range.start;
        endDate = range.end;
      } else if (viewMode === "monthly") {
        const range = getMonthRange(selectedDate);
        startDate = range.start;
        endDate = range.end;
      }

      const data = await getSalesHistoryByDate(startDate, endDate);
      setSalesHistory(data);
    } catch (error) {
      console.error("載入銷售資料失敗:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefundClick = (record) => {
    setSelectedRefundRecord(record);
    setShowRefundModal(true);
  };

  const handleConfirmRefund = async () => {
    if (!selectedRefundRecord) return;

    try {
      await updateSalesRecord(selectedRefundRecord.id, {
        isRefunded: true,
        refundDate: new Date().toISOString().split("T")[0],
        refundTime: new Date().toLocaleTimeString("zh-TW", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Asia/Taipei",
        }),
      });

      await fetchSalesData();
      setShowRefundModal(false);
      setSelectedRefundRecord(null);

      if (onRefundOrder) {
        onRefundOrder(selectedRefundRecord.id);
      }
    } catch (error) {
      console.error("退款失敗:", error);
      alert("退款失敗，請稍後再試");
    }
  };

  const handleCancelRefund = () => {
    setShowRefundModal(false);
    setSelectedRefundRecord(null);
  };

  return {
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
  };
};

export default useHistoryData;
