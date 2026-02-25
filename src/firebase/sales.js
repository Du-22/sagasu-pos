/**
 * 銷售記錄相關的 Firebase 操作模組
 *
 * 功能：
 * - 新增銷售記錄
 * - 查詢銷售記錄（按日期範圍）
 * - 更新銷售記錄
 * - 刪除銷售記錄（退款）
 * - 取得銷售統計
 *
 * 用途：
 * - HistoryPage 查詢歷史記錄
 * - PaymentModal 完成結帳時新增記錄
 * - ExportReportsPage 匯出報表
 *
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "./config";

const STORE_ID = "default_store";

/**
 * 根據日期範圍查詢銷售歷史
 * @param {string} startDate - 開始日期 (YYYY-MM-DD)
 * @param {string} endDate - 結束日期 (YYYY-MM-DD)
 * @returns {Array} 銷售記錄陣列
 */
export const getSalesHistoryByDate = async (startDate, endDate) => {
  try {
    const salesRef = collection(db, "stores", STORE_ID, "sales");
    const salesQuery = query(
      salesRef,
      where("date", ">=", startDate),
      where("date", "<=", endDate),
      orderBy("date", "desc"),
    );
    const salesSnap = await getDocs(salesQuery);

    const salesHistory = [];
    salesSnap.forEach((doc) => {
      salesHistory.push({ id: doc.id, ...doc.data() });
    });

    return salesHistory;
  } catch (error) {
    console.error("取得銷售歷史失敗:", error);
    return [];
  }
};

/**
 * 取得所有銷售記錄
 * @returns {Array} 銷售記錄陣列
 *
 * 注意：此函數可能返回大量資料，建議使用 getSalesHistoryByDate 進行篩選
 */
export const getAllSalesHistory = async () => {
  try {
    const salesRef = collection(db, "stores", STORE_ID, "sales");
    const salesSnap = await getDocs(salesRef);

    const salesHistory = [];
    salesSnap.forEach((doc) => {
      salesHistory.push({ id: doc.id, ...doc.data() });
    });

    return salesHistory;
  } catch (error) {
    console.error("取得所有銷售記錄失敗:", error);
    return [];
  }
};

/**
 * 取得銷售歷史（別名，為了向下相容）
 * @returns {Array} 銷售記錄陣列
 */
export const getSalesHistory = getAllSalesHistory;

/**
 * 新增銷售記錄
 * @param {Object} salesData - 銷售資料
 * @returns {string} 新增的文檔 ID
 * @throws {Error} 新增失敗時拋出錯誤
 *
 * 銷售資料格式：
 * {
 *   date: "YYYY-MM-DD",
 *   timestamp: "ISO 8601 格式",
 *   tableId: "桌號或外帶",
 *   items: [...],
 *   total: 總金額,
 *   paymentMethod: "現金/信用卡/行動支付",
 *   ...
 * }
 */
export const addSalesRecord = async (salesData) => {
  try {
    const salesRef = collection(db, "stores", STORE_ID, "sales");
    const docRef = await addDoc(salesRef, {
      ...salesData,
      createdAt: new Date().toISOString(),
    });
    console.log(`✅ 銷售記錄新增成功，ID: ${docRef.id}`);
    return docRef.id;
  } catch (error) {
    console.error("新增銷售記錄失敗:", error);
    throw error;
  }
};

/**
 * 更新銷售記錄
 * @param {string} recordId - 記錄 ID
 * @param {Object} updates - 要更新的欄位
 * @throws {Error} 更新失敗時拋出錯誤
 */
export const updateSalesRecord = async (recordId, updates) => {
  try {
    const recordRef = doc(db, "stores", STORE_ID, "sales", recordId);
    await updateDoc(recordRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    console.log(`✅ 銷售記錄 ${recordId} 更新成功`);
  } catch (error) {
    console.error(`更新銷售記錄 ${recordId} 失敗:`, error);
    throw error;
  }
};

/**
 * 刪除銷售記錄（退款）
 * @param {string} recordId - 記錄 ID
 * @throws {Error} 刪除失敗時拋出錯誤
 */
export const deleteSalesRecord = async (recordId) => {
  try {
    const recordRef = doc(db, "stores", STORE_ID, "sales", recordId);
    await deleteDoc(recordRef);
    console.log(`✅ 銷售記錄 ${recordId} 刪除成功`);
  } catch (error) {
    console.error(`刪除銷售記錄 ${recordId} 失敗:`, error);
    throw error;
  }
};

/**
 * 取得單一銷售記錄
 * @param {string} recordId - 記錄 ID
 * @returns {Object|null} 銷售記錄，不存在時返回 null
 */
export const getSalesRecord = async (recordId) => {
  try {
    const recordRef = doc(db, "stores", STORE_ID, "sales", recordId);
    const recordSnap = await getDoc(recordRef);

    if (recordSnap.exists()) {
      return { id: recordSnap.id, ...recordSnap.data() };
    } else {
      return null;
    }
  } catch (error) {
    console.error(`取得銷售記錄 ${recordId} 失敗:`, error);
    return null;
  }
};

/**
 * 取得最近的銷售記錄
 * @param {number} limitCount - 取得筆數限制
 * @returns {Array} 銷售記錄陣列
 */
export const getRecentSalesHistory = async (limitCount = 50) => {
  try {
    const salesRef = collection(db, "stores", STORE_ID, "sales");
    const salesQuery = query(
      salesRef,
      orderBy("timestamp", "desc"),
      limit(limitCount),
    );
    const salesSnap = await getDocs(salesQuery);

    const salesHistory = [];
    salesSnap.forEach((doc) => {
      salesHistory.push({ id: doc.id, ...doc.data() });
    });

    return salesHistory;
  } catch (error) {
    console.error("取得最近銷售記錄失敗:", error);
    return [];
  }
};

/**
 * 取得銷售統計（按日期範圍）
 * @param {string} startDate - 開始日期 (YYYY-MM-DD)
 * @param {string} endDate - 結束日期 (YYYY-MM-DD)
 * @returns {Object} 統計資料
 *
 * 返回格式：
 * {
 *   totalSales: 總銷售額,
 *   totalOrders: 總訂單數,
 *   averageOrderValue: 平均訂單金額,
 *   dailyBreakdown: { date: amount } 每日銷售額
 * }
 */
export const getSalesStatistics = async (startDate, endDate) => {
  try {
    const salesHistory = await getSalesHistoryByDate(startDate, endDate);

    // 計算總銷售額和訂單數
    const totalSales = salesHistory.reduce(
      (sum, record) => sum + (record.total || 0),
      0,
    );
    const totalOrders = salesHistory.length;
    const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

    // 計算每日銷售額
    const dailyBreakdown = {};
    salesHistory.forEach((record) => {
      const date = record.date;
      if (!dailyBreakdown[date]) {
        dailyBreakdown[date] = 0;
      }
      dailyBreakdown[date] += record.total || 0;
    });

    return {
      totalSales,
      totalOrders,
      averageOrderValue,
      dailyBreakdown,
    };
  } catch (error) {
    console.error("取得銷售統計失敗:", error);
    return {
      totalSales: 0,
      totalOrders: 0,
      averageOrderValue: 0,
      dailyBreakdown: {},
    };
  }
};
