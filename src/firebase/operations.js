// src/firebase/operations.js
import {
  collection,
  doc,
  getDocs,
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

// 產生店家 ID（可以是固定值或動態產生）
const STORE_ID = "default_store"; // 你可以改成你的店家識別碼

// ==================== 菜單相關操作 ====================

// 獲取菜單
export const getMenuData = async () => {
  try {
    const menuRef = doc(db, "stores", STORE_ID, "settings", "menu");
    const menuSnap = await getDocs(collection(menuRef, "items"));

    if (menuSnap.empty) {
      return null; // 返回 null 表示需要使用預設菜單
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

// 儲存菜單
export const saveMenuData = async (menuData) => {
  try {
    const batch = [];
    const menuRef = collection(
      db,
      "stores",
      STORE_ID,
      "settings",
      "menu",
      "items"
    );

    // 刪除舊的菜單項目（簡化處理）
    const oldItems = await getDocs(menuRef);
    const deletePromises = oldItems.docs.map((doc) => deleteDoc(doc.ref));
    await Promise.all(deletePromises);

    // 新增新的菜單項目
    const addPromises = menuData.map((item) => {
      const { id, ...itemData } = item;
      return addDoc(menuRef, itemData);
    });

    await Promise.all(addPromises);
    console.log("菜單儲存成功");
  } catch (error) {
    console.error("儲存菜單失敗:", error);
    throw error;
  }
};

// ==================== 訂單相關操作 ====================

// 獲取所有訂單
export const getOrders = async () => {
  try {
    const ordersRef = collection(db, "stores", STORE_ID, "orders");
    const ordersSnap = await getDocs(ordersRef);

    const orders = {};
    ordersSnap.forEach((doc) => {
      orders[doc.id] = doc.data().batches;
    });

    return orders;
  } catch (error) {
    console.error("獲取訂單失敗:", error);
    return {};
  }
};

// 儲存訂單
export const saveOrders = async (orders) => {
  try {
    const promises = Object.entries(orders).map(([tableId, batches]) => {
      const orderRef = doc(db, "stores", STORE_ID, "orders", tableId);
      return setDoc(orderRef, {
        batches,
        updatedAt: new Date().toISOString(),
      });
    });

    await Promise.all(promises);
  } catch (error) {
    console.error("儲存訂單失敗:", error);
    throw error;
  }
};

// 刪除訂單
export const deleteOrder = async (tableId) => {
  try {
    const orderRef = doc(db, "stores", STORE_ID, "orders", tableId);
    await deleteDoc(orderRef);
  } catch (error) {
    console.error("刪除訂單失敗:", error);
    throw error;
  }
};

// ==================== 外帶訂單相關操作 ====================

// 獲取外帶訂單
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

// 儲存外帶訂單
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

// 刪除外帶訂單
export const deleteTakeoutOrder = async (takeoutId) => {
  try {
    const takeoutRef = doc(db, "stores", STORE_ID, "takeout", takeoutId);
    await deleteDoc(takeoutRef);
  } catch (error) {
    console.error("刪除外帶訂單失敗:", error);
    throw error;
  }
};

// ==================== 計時器相關操作 ====================

// 獲取計時器
export const getTimers = async () => {
  try {
    const timersRef = collection(db, "stores", STORE_ID, "timers");
    const timersSnap = await getDocs(timersRef);

    const timers = {};
    timersSnap.forEach((doc) => {
      timers[doc.id] = doc.data().startTime;
    });

    return timers;
  } catch (error) {
    console.error("獲取計時器失敗:", error);
    return {};
  }
};

// 儲存計時器
export const saveTimers = async (timers) => {
  try {
    const promises = Object.entries(timers).map(([tableId, startTime]) => {
      const timerRef = doc(db, "stores", STORE_ID, "timers", tableId);
      return setDoc(timerRef, {
        startTime,
        updatedAt: new Date().toISOString(),
      });
    });

    await Promise.all(promises);
  } catch (error) {
    console.error("儲存計時器失敗:", error);
    throw error;
  }
};

// 刪除計時器
export const deleteTimer = async (tableId) => {
  try {
    const timerRef = doc(db, "stores", STORE_ID, "timers", tableId);
    await deleteDoc(timerRef);
  } catch (error) {
    console.error("刪除計時器失敗:", error);
    throw error;
  }
};

// ==================== 銷售歷史相關操作 ====================

// 獲取銷售歷史
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

// 新增銷售記錄
export const addSalesRecord = async (record) => {
  try {
    const salesRef = collection(db, "stores", STORE_ID, "sales");
    await addDoc(salesRef, {
      ...record,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("新增銷售記錄失敗:", error);
    throw error;
  }
};

// 更新銷售記錄（用於退款）
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

// 監聽訂單變化（可用於多裝置同步）
export const subscribeToOrders = (callback) => {
  const ordersRef = collection(db, "stores", STORE_ID, "orders");

  return onSnapshot(
    ordersRef,
    (snapshot) => {
      const orders = {};
      snapshot.forEach((doc) => {
        orders[doc.id] = doc.data().batches;
      });
      callback(orders);
    },
    (error) => {
      console.error("監聽訂單失敗:", error);
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
