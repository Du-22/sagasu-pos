/**
 * 訂單相關的 Firebase 操作模組
 *
 * 功能：
 * - 外帶訂單的 CRUD 操作
 * - 訂單批次更新
 * - 訂單狀態管理
 *
 * 用途：
 * - OrderingPage 處理外帶訂單
 * - CafePOSSystem 載入外帶訂單
 * - OrderSummary 顯示和管理訂單
 *
 * 注意：
 * - 桌位訂單存在 tables collection 中，由 tables.js 管理
 * - 此檔案主要處理外帶訂單（takeout collection）
 */

import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
} from "firebase/firestore";
import { db } from "./config";

const STORE_ID = "default_store";

/**
 * 取得所有外帶訂單
 * @returns {Object} 外帶訂單物件，格式為 { orderId: orderData }
 */
export const getTakeoutOrders = async () => {
  try {
    const takeoutRef = collection(db, "stores", STORE_ID, "takeout");
    const takeoutSnap = await getDocs(takeoutRef);

    const takeoutOrders = {};
    takeoutSnap.forEach((doc) => {
      takeoutOrders[doc.id] = doc.data();
    });

    return takeoutOrders;
  } catch (error) {
    console.error("取得外帶訂單失敗:", error);
    return {};
  }
};

/**
 * 儲存所有外帶訂單（批次更新）
 * @param {Object} takeoutOrders - 外帶訂單物件
 * @throws {Error} 儲存失敗時拋出錯誤
 *
 * 注意：
 * - 使用批次操作提升效能
 * - 會刪除不存在於 takeoutOrders 中的訂單
 */
export const saveTakeoutOrders = async (takeoutOrders) => {
  try {
    const takeoutRef = collection(db, "stores", STORE_ID, "takeout");

    // 取得現有訂單
    const existingOrders = await getTakeoutOrders();
    const existingOrderIds = Object.keys(existingOrders);
    const newOrderIds = Object.keys(takeoutOrders);

    // 更新或新增訂單
    const updatePromises = newOrderIds.map((orderId) => {
      const orderRef = doc(takeoutRef, orderId);
      return setDoc(
        orderRef,
        {
          ...takeoutOrders[orderId],
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );
    });

    // 刪除不再存在的訂單
    const deletePromises = existingOrderIds
      .filter((orderId) => !newOrderIds.includes(orderId))
      .map((orderId) => {
        const orderRef = doc(takeoutRef, orderId);
        return deleteDoc(orderRef);
      });

    await Promise.all([...updatePromises, ...deletePromises]);
    console.log("✅ 外帶訂單批次儲存成功");
  } catch (error) {
    console.error("儲存外帶訂單失敗:", error);
    throw error;
  }
};

/**
 * 儲存單一外帶訂單
 * @param {string} orderId - 訂單 ID
 * @param {Object} orderData - 訂單資料
 * @throws {Error} 儲存失敗時拋出錯誤
 */
export const saveTakeoutOrder = async (orderId, orderData) => {
  try {
    const orderRef = doc(db, "stores", STORE_ID, "takeout", orderId);
    await setDoc(
      orderRef,
      {
        ...orderData,
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );
    console.log(`✅ 外帶訂單 ${orderId} 儲存成功`);
  } catch (error) {
    console.error(`儲存外帶訂單 ${orderId} 失敗:`, error);
    throw error;
  }
};

/**
 * 更新外帶訂單（部分更新）
 * @param {string} orderId - 訂單 ID
 * @param {Object} updates - 要更新的欄位
 * @throws {Error} 更新失敗時拋出錯誤
 */
export const updateTakeoutOrder = async (orderId, updates) => {
  try {
    const orderRef = doc(db, "stores", STORE_ID, "takeout", orderId);
    await updateDoc(orderRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    console.log(`✅ 外帶訂單 ${orderId} 更新成功`);
  } catch (error) {
    console.error(`更新外帶訂單 ${orderId} 失敗:`, error);
    throw error;
  }
};

/**
 * 刪除外帶訂單
 * @param {string} orderId - 訂單 ID
 * @throws {Error} 刪除失敗時拋出錯誤
 */
export const deleteTakeoutOrder = async (orderId) => {
  try {
    const orderRef = doc(db, "stores", STORE_ID, "takeout", orderId);
    await deleteDoc(orderRef);
    console.log(`✅ 外帶訂單 ${orderId} 刪除成功`);
  } catch (error) {
    console.error(`刪除外帶訂單 ${orderId} 失敗:`, error);
    throw error;
  }
};

/**
 * 清空所有外帶訂單
 * @throws {Error} 刪除失敗時拋出錯誤
 *
 * 用途：
 * - 測試環境清理資料
 * - 營業日結束時清空
 */
export const clearAllTakeoutOrders = async () => {
  try {
    const takeoutOrders = await getTakeoutOrders();
    const orderIds = Object.keys(takeoutOrders);

    const deletePromises = orderIds.map((orderId) => {
      const orderRef = doc(db, "stores", STORE_ID, "takeout", orderId);
      return deleteDoc(orderRef);
    });

    await Promise.all(deletePromises);
    console.log(`✅ 已清空 ${orderIds.length} 個外帶訂單`);
  } catch (error) {
    console.error("清空外帶訂單失敗:", error);
    throw error;
  }
};

/**
 * 批次更新多個外帶訂單的狀態
 * @param {Array<string>} orderIds - 訂單 ID 陣列
 * @param {Object} updates - 要更新的欄位
 * @returns {Object} 更新結果統計 { success: number, failed: number }
 *
 * 用途：
 * - 批次確認訂單
 * - 批次標記為已完成
 */
export const batchUpdateTakeoutOrders = async (orderIds, updates) => {
  try {
    const updatePromises = orderIds.map(async (orderId) => {
      try {
        await updateTakeoutOrder(orderId, updates);
        return { success: true, orderId };
      } catch (error) {
        console.error(`批次更新訂單 ${orderId} 失敗:`, error);
        return { success: false, orderId, error };
      }
    });

    const results = await Promise.all(updatePromises);
    const successCount = results.filter((r) => r.success).length;
    const failedCount = results.filter((r) => !r.success).length;

    console.log(`📊 批次更新結果: ${successCount} 成功, ${failedCount} 失敗`);

    return {
      success: successCount,
      failed: failedCount,
      details: results,
    };
  } catch (error) {
    console.error("批次更新外帶訂單失敗:", error);
    throw error;
  }
};

/**
 * 訂閱外帶訂單變更（即時監聽）
 * @param {Function} callback - 回調函數，當外帶訂單變更時觸發
 * @returns {Function} 取消訂閱的函數
 *
 * 用途：
 * - 即時同步外帶訂單
 * - 多設備協同作業
 *
 * 使用方式：
 * const unsubscribe = subscribeToTakeoutOrders((orders) => {
 *   console.log('外帶訂單更新:', orders);
 * });
 * // 當不需要監聽時，呼叫 unsubscribe() 取消訂閱
 */
export const subscribeToTakeoutOrders = (callback) => {
  try {
    const takeoutRef = collection(db, "stores", STORE_ID, "takeout");

    const unsubscribe = onSnapshot(
      takeoutRef,
      (snapshot) => {
        const takeoutOrders = {};
        snapshot.forEach((doc) => {
          takeoutOrders[doc.id] = doc.data();
        });
        callback(takeoutOrders);
      },
      (error) => {
        console.error("訂閱外帶訂單失敗:", error);
      },
    );

    return unsubscribe;
  } catch (error) {
    console.error("建立外帶訂單訂閱失敗:", error);
    return () => {}; // 返回空函數避免錯誤
  }
};
