/**
 * 收支封存彙總相關的 Firebase 查詢
 *
 * 功能：
 * - 查詢每日收支彙總
 * - 查詢每月封存狀態
 *
 * 用途：
 * - HistoryPage 在明細封存後仍可顯示長期收支總覽
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { db } from "./config";

const STORE_ID = "default_store";

const normalizeDailySummary = (summaryDoc) => {
  const data = summaryDoc.data();

  return {
    id: summaryDoc.id,
    date: data.date || summaryDoc.id,
    incomeTotal: Number(data.incomeTotal) || 0,
    expenseTotal: Number(data.expenseTotal) || 0,
    netTotal: Number(data.netTotal) || 0,
    orderCount: Number(data.orderCount) || 0,
    itemCount: Number(data.itemCount) || 0,
    refundTotal: Number(data.refundTotal) || 0,
    refundCount: Number(data.refundCount) || 0,
    salesRecordCount: Number(data.salesRecordCount) || 0,
    expenseRecordCount: Number(data.expenseRecordCount) || 0,
    archivedAt: data.archivedAt || null,
    sourceRange: data.sourceRange || null,
  };
};

/**
 * 根據日期範圍查詢每日收支彙總
 * @param {string} startDate - 開始日期 (YYYY-MM-DD)
 * @param {string} endDate - 結束日期 (YYYY-MM-DD)
 * @returns {Array} 每日收支彙總陣列
 */
export const getDailyFinancialSummariesByDate = async (startDate, endDate) => {
  try {
    const summariesRef = collection(
      db,
      "stores",
      STORE_ID,
      "dailyFinancialSummaries",
    );
    const summariesQuery = query(
      summariesRef,
      where("date", ">=", startDate),
      where("date", "<=", endDate),
      orderBy("date", "desc"),
    );
    const summariesSnap = await getDocs(summariesQuery);

    return summariesSnap.docs.map(normalizeDailySummary);
  } catch (error) {
    console.error("取得每日收支彙總失敗:", error);
    return [];
  }
};

/**
 * 取得單一月份的封存摘要
 * @param {string} month - YYYY-MM
 * @returns {Object|null} 每月封存摘要
 */
export const getMonthlyFinancialSummary = async (month) => {
  try {
    const summaryRef = doc(
      db,
      "stores",
      STORE_ID,
      "monthlyFinancialSummaries",
      month,
    );
    const summarySnap = await getDoc(summaryRef);

    if (!summarySnap.exists()) return null;
    return { id: summarySnap.id, ...summarySnap.data() };
  } catch (error) {
    console.error(`取得每月收支彙總 ${month} 失敗:`, error);
    return null;
  }
};
