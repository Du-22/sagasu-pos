import { useCallback, useEffect, useState } from "react";
import {
  getDailyFinancialSummariesByDate,
  getMonthlyFinancialSummary,
} from "../firebase/financialSummaries";
import { getMonthRange, getWeekRange } from "../utils/historyUtils";

const getDateRange = (selectedDate, viewMode) => {
  if (viewMode === "weekly") return getWeekRange(selectedDate);
  if (viewMode === "monthly") return getMonthRange(selectedDate);
  return { start: selectedDate, end: selectedDate };
};

const getMonthId = (selectedDate) => selectedDate.slice(0, 7);

/**
 * useFinancialSummaryData Hook
 *
 * 功能效果：讀取封存後保留的每日 / 每月收支彙總
 * 使用範例：const { dailySummaries } = useFinancialSummaryData(selectedDate, viewMode)
 */
const useFinancialSummaryData = (selectedDate, viewMode) => {
  const [dailySummaries, setDailySummaries] = useState([]);
  const [monthlySummary, setMonthlySummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const fetchSummaries = useCallback(async () => {
    const range = getDateRange(selectedDate, viewMode);
    setSummaryLoading(true);

    try {
      const [dailyData, monthlyData] = await Promise.all([
        getDailyFinancialSummariesByDate(range.start, range.end),
        viewMode === "monthly"
          ? getMonthlyFinancialSummary(getMonthId(selectedDate))
          : Promise.resolve(null),
      ]);

      setDailySummaries(dailyData);
      setMonthlySummary(monthlyData);
    } catch (error) {
      console.error("載入收支彙總失敗:", error);
      setDailySummaries([]);
      setMonthlySummary(null);
    } finally {
      setSummaryLoading(false);
    }
  }, [selectedDate, viewMode]);

  useEffect(() => {
    fetchSummaries();
  }, [fetchSummaries]);

  return {
    dailySummaries,
    monthlySummary,
    summaryLoading,
    refetchSummaries: fetchSummaries,
  };
};

export default useFinancialSummaryData;
