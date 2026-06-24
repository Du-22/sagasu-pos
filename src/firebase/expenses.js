/**
 * 支出紀錄相關的 Firebase 操作模組
 *
 * 功能：
 * - 新增 / 查詢 / 刪除支出紀錄
 * - 新增 / 查詢 / 編輯 / 刪除常用原材料
 *
 * 用途：
 * - HistoryPage 的支出頁與收支總覽
 */

import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./config";

const STORE_ID = "default_store";

const expenseRecordsRef = () => collection(db, "stores", STORE_ID, "expenseRecords");
const commonExpenseItemsRef = () =>
  collection(db, "stores", STORE_ID, "commonExpenseItems");

const normalizeExpenseRecord = (record) => ({
  date: record.date,
  name: record.name,
  vendor: record.vendor,
  amount: Number(record.amount) || 0,
});

const normalizeCommonItem = (item) => ({
  name: item.name,
  vendor: item.vendor,
  amount: Number(item.amount) || 0,
});

/**
 * 根據日期範圍查詢支出紀錄
 * @param {string} startDate - 開始日期 (YYYY-MM-DD)
 * @param {string} endDate - 結束日期 (YYYY-MM-DD)
 * @returns {Array} 支出紀錄陣列
 */
export const getExpenseRecordsByDate = async (startDate, endDate) => {
  try {
    const expenseQuery = query(
      expenseRecordsRef(),
      where("date", ">=", startDate),
      where("date", "<=", endDate),
      orderBy("date", "desc"),
    );
    const expenseSnap = await getDocs(expenseQuery);

    const records = [];
    expenseSnap.forEach((expenseDoc) => {
      records.push({ id: expenseDoc.id, ...expenseDoc.data() });
    });

    return records.sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return (b.createdAt || "").localeCompare(a.createdAt || "");
    });
  } catch (error) {
    console.error("取得支出紀錄失敗:", error);
    throw error;
  }
};

/**
 * 新增支出紀錄
 * @param {Object} record - 支出紀錄
 * @returns {Object} 新增後的支出紀錄
 */
export const addExpenseRecord = async (record) => {
  try {
    const now = new Date().toISOString();
    const docRef = doc(expenseRecordsRef());
    const recordData = {
      ...normalizeExpenseRecord(record),
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(docRef, recordData);
    return { id: docRef.id, ...recordData };
  } catch (error) {
    console.error("新增支出紀錄失敗:", error);
    throw error;
  }
};

/**
 * 刪除支出紀錄
 * @param {string} recordId - 支出紀錄 ID
 */
export const deleteExpenseRecord = async (recordId) => {
  try {
    await deleteDoc(doc(db, "stores", STORE_ID, "expenseRecords", recordId));
  } catch (error) {
    console.error(`刪除支出紀錄 ${recordId} 失敗:`, error);
    throw error;
  }
};

/**
 * 取得所有常用原材料
 * @returns {Array} 常用原材料陣列
 */
export const getCommonExpenseItems = async () => {
  try {
    const commonQuery = query(commonExpenseItemsRef(), orderBy("createdAt", "desc"));
    const commonSnap = await getDocs(commonQuery);

    const items = [];
    commonSnap.forEach((commonDoc) => {
      items.push({ id: commonDoc.id, ...commonDoc.data() });
    });

    return items;
  } catch (error) {
    console.error("取得常用原材料失敗:", error);
    throw error;
  }
};

/**
 * 新增常用原材料
 * @param {Object} item - 常用原材料
 * @returns {Object} 新增後的常用原材料
 */
export const addCommonExpenseItem = async (item) => {
  try {
    const now = new Date().toISOString();
    const docRef = doc(commonExpenseItemsRef());
    const itemData = {
      ...normalizeCommonItem(item),
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(docRef, itemData);
    return { id: docRef.id, ...itemData };
  } catch (error) {
    console.error("新增常用原材料失敗:", error);
    throw error;
  }
};

/**
 * 更新常用原材料
 * @param {string} itemId - 常用原材料 ID
 * @param {Object} updates - 要更新的欄位
 */
export const updateCommonExpenseItem = async (itemId, updates) => {
  try {
    await updateDoc(doc(db, "stores", STORE_ID, "commonExpenseItems", itemId), {
      ...normalizeCommonItem(updates),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`更新常用原材料 ${itemId} 失敗:`, error);
    throw error;
  }
};

/**
 * 刪除常用原材料
 * @param {string} itemId - 常用原材料 ID
 */
export const deleteCommonExpenseItem = async (itemId) => {
  try {
    await deleteDoc(doc(db, "stores", STORE_ID, "commonExpenseItems", itemId));
  } catch (error) {
    console.error(`刪除常用原材料 ${itemId} 失敗:`, error);
    throw error;
  }
};
