// src/firebase/operations.js - 改良版本
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  onSnapshot,
} from "firebase/firestore";
import { db } from "./config";

const STORE_ID = "default_store";

// ==================== 菜單相關操作 ====================
export const getMenuData = async () => {
  try {
    const menuRef = collection(db, "stores", STORE_ID, "menu");
    const menuSnap = await getDocs(menuRef);

    if (menuSnap.empty) {
      return null;
    }

    const menuItems = [];
    menuSnap.forEach((doc) => {
      menuItems.push({ id: doc.id, ...doc.data() });
    });

    return menuItems;
  } catch (error) {
    console.error("獲取菜單失敗:", error);
    return null;
  }
};

export const saveMenuData = async (menuData) => {
  try {
    // 清除舊菜單
    const menuRef = collection(db, "stores", STORE_ID, "menu");
    const oldItems = await getDocs(menuRef);
    const deletePromises = oldItems.docs.map((doc) => deleteDoc(doc.ref));
    await Promise.all(deletePromises);

    // 新增菜單項目
    const addPromises = menuData.map((item) => {
      const { id, ...itemData } = item;
      return setDoc(doc(menuRef, id), itemData);
    });

    await Promise.all(addPromises);
    console.log("菜單儲存成功");
  } catch (error) {
    console.error("儲存菜單失敗:", error);
    throw error;
  }
};

// ==================== 桌位狀態相關操作 ====================

// 獲取所有桌位狀態（包含訂單、時間、狀態）
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
    console.error("獲取桌位狀態失敗:", error);
    return {};
  }
};

// 儲存單一桌位狀態
export const saveTableState = async (tableId, tableData) => {
  try {
    const tableRef = doc(db, "stores", STORE_ID, "tables", tableId);
    await setDoc(
      tableRef,
      {
        ...tableData,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error(`儲存桌位 ${tableId} 失敗:`, error);
    throw error;
  }
};

// 更新桌位狀態（部分更新）
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

// 刪除桌位狀態
export const deleteTableState = async (tableId) => {
  try {
    const tableRef = doc(db, "stores", STORE_ID, "tables", tableId);
    await deleteDoc(tableRef);
  } catch (error) {
    console.error(`刪除桌位 ${tableId} 失敗:`, error);
    throw error;
  }
};

// Debug 版本：保存桌位狀態
export const debugSaveTableState = async (tableId, tableData) => {
  try {
    console.log("🔄 嘗試儲存桌位狀態:", tableId, tableData);

    const tableRef = doc(db, "stores", STORE_ID, "tables", tableId);

    const dataToSave = {
      ...tableData,
      updatedAt: new Date().toISOString(),
      debugTime: Date.now(),
    };

    console.log("📤 準備儲存的數據:", dataToSave);

    await setDoc(tableRef, dataToSave, { merge: true });

    console.log("✅ 桌位狀態儲存成功:", tableId);

    // 立即讀取驗證
    const savedDoc = await getDoc(tableRef);
    if (savedDoc.exists()) {
      console.log("✅ 驗證：數據已成功寫入 Firebase:", savedDoc.data());
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

// ==================== Debug 版本：讀取桌位狀態 ====================
export const debugGetTableStates = async () => {
  try {
    console.log("🔄 嘗試讀取所有桌位狀態...");

    const tablesRef = collection(db, "stores", STORE_ID, "tables");
    const tablesSnap = await getDocs(tablesRef);

    console.log("📊 找到桌位數量:", tablesSnap.size);

    const tableStates = {};
    tablesSnap.forEach((doc) => {
      console.log("📋 桌位資料:", doc.id, doc.data());
      tableStates[doc.id] = doc.data();
    });

    console.log("✅ 所有桌位狀態:", tableStates);
    return tableStates;
  } catch (error) {
    console.error("❌ 讀取桌位狀態失敗:", error);
    return {};
  }
};

// ==================== 外帶訂單相關操作 ====================
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
    console.error("獲取外帶訂單失敗:", error);
    return {};
  }
};

export const saveTakeoutOrders = async (takeoutOrders) => {
  try {
    const promises = Object.entries(takeoutOrders).map(
      ([takeoutId, orderData]) => {
        const takeoutRef = doc(db, "stores", STORE_ID, "takeout", takeoutId);
        return setDoc(takeoutRef, {
          ...orderData,
          updatedAt: new Date().toISOString(),
        });
      }
    );

    await Promise.all(promises);
  } catch (error) {
    console.error("儲存外帶訂單失敗:", error);
    throw error;
  }
};

export const deleteTakeoutOrder = async (takeoutId) => {
  try {
    const takeoutRef = doc(db, "stores", STORE_ID, "takeout", takeoutId);
    await deleteDoc(takeoutRef);
  } catch (error) {
    console.error("刪除外帶訂單失敗:", error);
    throw error;
  }
};

// ==================== 銷售歷史相關操作 ====================
export const getSalesHistory = async () => {
  try {
    const salesRef = collection(db, "stores", STORE_ID, "sales");
    const salesQuery = query(salesRef, orderBy("timestamp", "desc"));
    const salesSnap = await getDocs(salesQuery);

    const salesHistory = [];
    salesSnap.forEach((doc) => {
      salesHistory.push({ id: doc.id, ...doc.data() });
    });

    return salesHistory;
  } catch (error) {
    console.error("獲取銷售歷史失敗:", error);
    return [];
  }
};

export const addSalesRecord = async (record) => {
  try {
    const salesRef = collection(db, "stores", STORE_ID, "sales");
    // 使用 record.id 作為文檔 ID
    await setDoc(doc(salesRef, record.id), {
      ...record,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("新增銷售記錄失敗:", error);
    throw error;
  }
};

export const updateSalesRecord = async (recordId, updates) => {
  try {
    const recordRef = doc(db, "stores", STORE_ID, "sales", recordId);
    await updateDoc(recordRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("更新銷售記錄失敗:", error);
    throw error;
  }
};

// ==================== 實時監聽功能 ====================

// 監聽桌位狀態變化
export const subscribeToTables = (callback) => {
  const tablesRef = collection(db, "stores", STORE_ID, "tables");

  return onSnapshot(
    tablesRef,
    (snapshot) => {
      const tables = {};
      snapshot.forEach((doc) => {
        tables[doc.id] = doc.data();
      });
      callback(tables);
    },
    (error) => {
      console.error("監聽桌位失敗:", error);
    }
  );
};

// 監聽外帶訂單變化
export const subscribeToTakeoutOrders = (callback) => {
  const takeoutRef = collection(db, "stores", STORE_ID, "takeout");

  return onSnapshot(
    takeoutRef,
    (snapshot) => {
      const takeoutOrders = {};
      snapshot.forEach((doc) => {
        takeoutOrders[doc.id] = doc.data();
      });
      callback(takeoutOrders);
    },
    (error) => {
      console.error("監聽外帶訂單失敗:", error);
    }
  );
};
