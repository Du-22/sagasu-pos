/**
 * 桌位狀態相關的 Firebase 操作模組
 *
 * 功能：
 * - 取得所有桌位狀態
 * - 儲存/更新桌位狀態
 * - 刪除桌位狀態
 * - Debug 版本的桌位操作
 *
 * 用途：
 * - SeatingArea 管理桌位狀態
 * - OrderingPage 更新桌位訂單
 * - CafePOSSystem 載入桌位狀態
 *
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
} from "firebase/firestore";
import { db } from "./config";

const STORE_ID = "default_store";

/**
 * 取得所有桌位狀態（包含訂單、時間、狀態）
 * @returns {Object} 桌位狀態物件，格式為 { tableId: tableData }
 */
export const getTableStates = async () => {
  try {
    const tablesRef = collection(db, "stores", STORE_ID, "tables");
    const tablesSnap = await getDocs(tablesRef);

    const tableStates = {};
    tablesSnap.forEach((doc) => {
      tableStates[doc.id] = doc.data();
    });

    return tableStates;
  } catch (error) {
    console.error("取得桌位狀態失敗:", error);
    return {};
  }
};

/**
 * 儲存單一桌位狀態
 * @param {string} tableId - 桌位 ID
 * @param {Object} tableData - 桌位資料
 * @throws {Error} 儲存失敗時拋出錯誤
 *
 * 注意：使用 merge 模式，不會覆蓋現有欄位
 */
export const saveTableState = async (tableId, tableData) => {
  try {
    const tableRef = doc(db, "stores", STORE_ID, "tables", tableId);
    await setDoc(
      tableRef,
      {
        ...tableData,
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );
  } catch (error) {
    console.error(`儲存桌位 ${tableId} 失敗:`, error);
    throw error;
  }
};

/**
 * 更新桌位狀態（部分更新）
 * @param {string} tableId - 桌位 ID
 * @param {Object} updates - 要更新的欄位
 * @throws {Error} 更新失敗時拋出錯誤
 *
 * 用途：當只需要更新部分欄位時使用（比 saveTableState 更有效率）
 */
export const updateTableState = async (tableId, updates) => {
  try {
    const tableRef = doc(db, "stores", STORE_ID, "tables", tableId);
    await updateDoc(tableRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`更新桌位 ${tableId} 失敗:`, error);
    throw error;
  }
};

/**
 * 刪除桌位狀態
 * @param {string} tableId - 桌位 ID
 * @throws {Error} 刪除失敗時拋出錯誤
 *
 * 用途：清空桌位時使用
 */
export const deleteTableState = async (tableId) => {
  try {
    const tableRef = doc(db, "stores", STORE_ID, "tables", tableId);
    await deleteDoc(tableRef);
  } catch (error) {
    console.error(`刪除桌位 ${tableId} 失敗:`, error);
    throw error;
  }
};

/**
 * Debug 版本：儲存桌位狀態（帶驗證機制）
 * @param {string} tableId - 桌位 ID
 * @param {Object} tableData - 桌位資料
 * @throws {Error} 儲存失敗時拋出錯誤
 *
 * 特點：
 * - 寫入後立即讀取驗證
 * - 記錄詳細的錯誤資訊
 * - 用於 Debug 和問題排查
 */
export const debugSaveTableState = async (tableId, tableData) => {
  try {
    const tableRef = doc(db, "stores", STORE_ID, "tables", tableId);

    const dataToSave = {
      ...tableData,
      updatedAt: new Date().toISOString(),
      debugTime: Date.now(),
    };

    await setDoc(tableRef, dataToSave, { merge: true });

    // 立即讀取驗證
    const savedDoc = await getDoc(tableRef);
    if (savedDoc.exists()) {
      console.log("✅ 桌位狀態儲存並驗證成功");
    } else {
      console.error("❌ 驗證失敗：數據沒有寫入 Firebase");
    }
  } catch (error) {
    console.error("❌ 儲存桌位狀態失敗:", error);
    console.error("錯誤詳情:", error.message);
    console.error("錯誤代碼:", error.code);
    throw error;
  }
};

/**
 * Debug 版本：讀取桌位狀態
 * @returns {Object} 桌位狀態物件
 *
 * 特點：
 * - 記錄詳細的錯誤資訊
 * - 用於 Debug 和問題排查
 */
export const debugGetTableStates = async () => {
  try {
    const tablesRef = collection(db, "stores", STORE_ID, "tables");
    const tablesSnap = await getDocs(tablesRef);

    const tableStates = {};
    tablesSnap.forEach((doc) => {
      tableStates[doc.id] = doc.data();
    });

    console.log(`📊 Debug: 讀取到 ${Object.keys(tableStates).length} 個桌位`);
    return tableStates;
  } catch (error) {
    console.error("❌ 讀取桌位狀態失敗:", error);
    return {};
  }
};

/**
 * 取得單一桌位狀態
 * @param {string} tableId - 桌位 ID
 * @returns {Object|null} 桌位資料，不存在時返回 null
 */
export const getTableState = async (tableId) => {
  try {
    const tableRef = doc(db, "stores", STORE_ID, "tables", tableId);
    const tableSnap = await getDoc(tableRef);

    if (tableSnap.exists()) {
      return tableSnap.data();
    } else {
      return null;
    }
  } catch (error) {
    console.error(`取得桌位 ${tableId} 失敗:`, error);
    return null;
  }
};

/**
 * 訂閱桌位狀態變更（即時監聽）
 * @param {Function} callback - 回調函數，當桌位狀態變更時觸發
 * @returns {Function} 取消訂閱的函數
 *
 * 用途：
 * - 即時同步桌位狀態
 * - 多設備協同作業
 *
 * 使用方式：
 * const unsubscribe = subscribeToTables((tableStates) => {
 *   console.log('桌位狀態更新:', tableStates);
 * });
 * // 當不需要監聽時，呼叫 unsubscribe() 取消訂閱
 */
export const subscribeToTables = (callback) => {
  try {
    const tablesRef = collection(db, "stores", STORE_ID, "tables");

    const unsubscribe = onSnapshot(
      tablesRef,
      (snapshot) => {
        const tableStates = {};
        snapshot.forEach((doc) => {
          tableStates[doc.id] = doc.data();
        });
        callback(tableStates);
      },
      (error) => {
        console.error("訂閱桌位狀態失敗:", error);
      },
    );

    return unsubscribe;
  } catch (error) {
    console.error("建立桌位訂閱失敗:", error);
    return () => {}; // 返回空函數避免錯誤
  }
};
