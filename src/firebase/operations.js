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
  limit,
  onSnapshot,
} from "firebase/firestore";
import { db } from "./config";
import { hashPassword, generateSalt } from "../auth/utils";

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
  console.log("📝 開始安全保存菜單數據...");

  // ==================== 步驟 1: 備份到 localStorage ====================
  try {
    const backup = {
      data: menuData,
      timestamp: new Date().toISOString(),
      version: "v2_granular",
    };
    localStorage.setItem("cafeMenuData", JSON.stringify(menuData));
    localStorage.setItem("cafeMenuData_backup", JSON.stringify(backup));
    console.log("✅ 本地備份成功");
  } catch (backupError) {
    console.error("⚠️ 本地備份失敗:", backupError);
    // 繼續執行，不中斷
  }

  // ==================== 步驟 2: 獲取現有菜單 ====================
  const menuRef = collection(db, "stores", STORE_ID, "menu");
  let existingItems = new Map();

  try {
    const existingDocs = await getDocs(menuRef);
    existingDocs.forEach((doc) => {
      existingItems.set(doc.id, doc.data());
    });
    console.log(`📊 現有品項數量: ${existingItems.size}`);
  } catch (error) {
    console.error("⚠️ 無法讀取現有菜單，將直接寫入:", error);
    // 繼續執行，當作沒有現有數據
  }

  // ==================== 步驟 3: 更新或新增品項 ====================
  const updatePromises = [];
  const newItemIds = new Set();

  for (const item of menuData) {
    const { id, ...itemData } = item;

    if (!id) {
      console.error("❌ 品項缺少 ID:", item);
      continue;
    }

    newItemIds.add(id);

    // ✅ 使用 setDoc 的 merge 模式更新或新增
    // 關鍵：每個產品都有自己的時間戳
    const promise = setDoc(
      doc(menuRef, id),
      {
        ...itemData,
        lastUpdated: new Date().toISOString(), // ✅ 每個產品獨立時間戳
      },
      { merge: true } // ✅ 關鍵：使用 merge 模式，不會先刪除
    )
      .then(() => {
        console.log(`✅ 更新品項: ${item.name || id}`);
        return { success: true, id, name: item.name };
      })
      .catch((error) => {
        console.error(`❌ 更新品項失敗: ${item.name || id}`, error);
        return { success: false, id, name: item.name, error };
      });

    updatePromises.push(promise);
  }

  // 等待所有更新完成
  const results = await Promise.allSettled(updatePromises);
  const successCount = results.filter((r) => r.value?.success).length;
  const failCount = results.filter((r) => !r.value?.success).length;

  console.log(`📊 更新結果: ${successCount} 成功, ${failCount} 失敗`);

  // ==================== 步驟 4: 刪除不再需要的品項 ====================
  const deletePromises = [];

  for (const [existingId] of existingItems) {
    if (!newItemIds.has(existingId)) {
      console.log(`🗑️ 刪除舊品項: ${existingId}`);
      const promise = deleteDoc(doc(menuRef, existingId))
        .then(() => ({ success: true, id: existingId }))
        .catch((error) => ({ success: false, id: existingId, error }));
      deletePromises.push(promise);
    }
  }

  if (deletePromises.length > 0) {
    const deleteResults = await Promise.allSettled(deletePromises);
    const deleteSuccess = deleteResults.filter((r) => r.value?.success).length;
    console.log(`🗑️ 刪除結果: ${deleteSuccess}/${deletePromises.length} 成功`);
  }

  // ==================== 步驟 5: 檢查結果 ====================
  if (failCount > 0) {
    console.error(`⚠️ 有 ${failCount} 個品項保存失敗`);
    throw new Error(`保存失敗: ${failCount} 個品項未能成功儲存`);
  }

  console.log("✅ 菜單保存完成");
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
    const tablesRef = collection(db, "stores", STORE_ID, "tables");
    const tablesSnap = await getDocs(tablesRef);

    const tableStates = {};
    tablesSnap.forEach((doc) => {
      tableStates[doc.id] = doc.data();
    });

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

// ==================== 登入驗證相關操作 ====================

/**
 * 獲取系統密碼設定
 * @returns {Object|null} { hashedPassword, salt } 或 null
 */
export const getAuthSettings = async () => {
  try {
    const authRef = doc(db, "stores", STORE_ID, "settings", "auth");
    const authSnap = await getDoc(authRef);

    if (authSnap.exists()) {
      const data = authSnap.data();
      return {
        hashedPassword: data.hashedPassword,
        salt: data.salt,
        createdAt: data.createdAt,
        lastUpdated: data.lastUpdated,
      };
    } else {
      return null;
    }
  } catch (error) {
    console.error("❌ 獲取密碼設定失敗:", error);
    return null;
  }
};

/**
 * 設定系統密碼（第一次使用或更改密碼時）
 * @param {string} password - 新密碼
 * @returns {boolean} 是否設定成功
 */
export const setAuthPassword = async (password) => {
  try {
    const salt = generateSalt();
    const hashedPassword = hashPassword(password, salt);

    const authRef = doc(db, "stores", STORE_ID, "settings", "auth");
    const authData = {
      hashedPassword,
      salt,
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
    };

    await setDoc(authRef, authData);
    return true;
  } catch (error) {
    console.error("❌ 設定密碼失敗:", error);
    return false;
  }
};

/**
 * 驗證密碼
 * @param {string} inputPassword - 使用者輸入的密碼
 * @returns {boolean} 密碼是否正確
 */
export const verifyPassword = async (inputPassword) => {
  try {
    const authSettings = await getAuthSettings();
    if (!authSettings) {
      return false;
    }
    const { hashedPassword, salt } = authSettings;
    const inputHash = hashPassword(inputPassword, salt);
    const isValid = inputHash === hashedPassword;

    return isValid;
  } catch (error) {
    console.error("❌ 密碼驗證失敗:", error);
    return false;
  }
};

/**
 * 更改系統密碼
 * @param {string} oldPassword - 舊密碼
 * @param {string} newPassword - 新密碼
 * @returns {boolean} 是否更改成功
 */
export const changeAuthPassword = async (oldPassword, newPassword) => {
  try {
    // 先驗證舊密碼
    const isOldPasswordValid = await verifyPassword(oldPassword);
    if (!isOldPasswordValid) {
      return false;
    }

    // 設定新密碼
    const success = await setAuthPassword(newPassword);
    if (success) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.error("❌ 更改密碼失敗:", error);
    return false;
  }
};

/**
 * 初始化預設密碼（系統第一次啟動時）
 * @returns {string|null} 如果建立了預設密碼就回傳密碼，否則回傳null
 */
export const initializeDefaultPassword = async () => {
  try {
    const existingAuth = await getAuthSettings();

    if (existingAuth) {
      return null;
    }

    // 固定預設密碼
    const defaultPassword = "sagasu2024";

    const success = await setAuthPassword(defaultPassword);

    if (success) {
      return defaultPassword;
    } else {
      console.error("❌ 預設密碼建立失敗");
      return null;
    }
  } catch (error) {
    console.error("❌ 初始化預設密碼失敗:", error);
    return null;
  }
};

/**
 * 檢查是否需要設定密碼
 * @returns {boolean} true表示需要設定密碼，false表示已設定
 */
export const needsPasswordSetup = async () => {
  try {
    const authSettings = await getAuthSettings();
    return authSettings === null;
  } catch (error) {
    console.error("❌ 檢查密碼設定狀態失敗:", error);
    return true; // 出錯時假設需要設定
  }
};

// ==================== 登入日誌相關（可選功能） ====================

/**
 * 記錄登入嘗試
 * @param {boolean} success - 是否登入成功
 * @param {string} userAgent - 瀏覽器資訊
 * @param {string} ip - IP位址（如果有的話）
 */
export const logLoginAttempt = async (
  success,
  userAgent = "",
  ip = "unknown"
) => {
  try {
    const logRef = collection(db, "stores", STORE_ID, "loginLogs");
    const logData = {
      success,
      timestamp: new Date().toISOString(),
      userAgent: userAgent.substring(0, 200), // 限制長度
      ip,
      date: new Date().toISOString().slice(0, 10), // YYYY-MM-DD
    };

    await addDoc(logRef, logData);
  } catch (error) {
    console.error("❌ 記錄登入日誌失敗:", error);
    // 不拋出錯誤，避免影響主要登入流程
  }
};

/**
 * 獲取最近的登入日誌
 * @param {number} LimitCount - 取得筆數限制
 * @returns {Array} 登入日誌陣列
 */
export const getRecentLoginLogs = async (LimitCount = 50) => {
  try {
    const logRef = collection(db, "stores", STORE_ID, "loginLogs");
    const logQuery = query(
      logRef,
      orderBy("timestamp", "desc"),
      limit(LimitCount)
    );
    const logSnap = await getDocs(logQuery);

    const logs = [];
    logSnap.forEach((doc) => {
      logs.push({ id: doc.id, ...doc.data() });
    });

    return logs;
  } catch (error) {
    console.error("❌ 獲取登入日誌失敗:", error);
    return [];
  }
};

// ==================== 安全問題相關操作 ====================

/**
 * 取得安全問題設定
 * @returns {Object|null} { question, hashedAnswer, salt, createdAt } 或 null
 */
export const getSecurityQuestion = async () => {
  try {
    const securityRef = doc(db, "stores", STORE_ID, "settings", "security");
    const securitySnap = await getDoc(securityRef);

    if (securitySnap.exists()) {
      const data = securitySnap.data();
      return {
        question: data.question,
        hashedAnswer: data.hashedAnswer,
        salt: data.salt,
        createdAt: data.createdAt,
        lastUpdated: data.lastUpdated,
      };
    } else {
      return null;
    }
  } catch (error) {
    console.error("取得安全問題設定失敗:", error);
    return null;
  }
};

/**
 * 設定安全問題和答案
 * @param {string} question - 安全問題（固定為咖啡廳店名）
 * @param {string} answer - 答案
 * @returns {boolean} 是否設定成功
 */
export const setSecurityQuestion = async (question, answer) => {
  try {
    const salt = generateSalt();
    const hashedAnswer = hashPassword(answer.toLowerCase().trim(), salt);

    const securityRef = doc(db, "stores", STORE_ID, "settings", "security");
    const securityData = {
      question,
      hashedAnswer,
      salt,
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
    };

    await setDoc(securityRef, securityData);
    return true;
  } catch (error) {
    console.error("設定安全問題失敗:", error);
    return false;
  }
};

/**
 * 驗證安全問題答案
 * @param {string} inputAnswer - 使用者輸入的答案
 * @returns {boolean} 答案是否正確
 */
export const verifySecurityAnswer = async (inputAnswer) => {
  try {
    const securitySettings = await getSecurityQuestion();
    if (!securitySettings) {
      return false;
    }
    const { hashedAnswer, salt } = securitySettings;
    const inputHash = hashPassword(inputAnswer.toLowerCase().trim(), salt);
    const isValid = inputHash === hashedAnswer;
    return isValid;
  } catch (error) {
    console.error("驗證安全問題答案失敗:", error);
    return false;
  }
};

/**
 * 檢查是否需要設定安全問題
 * @returns {boolean} true表示需要設定安全問題，false表示已設定
 */
export const needsSecuritySetup = async () => {
  try {
    const securitySettings = await getSecurityQuestion();
    return securitySettings === null;
  } catch (error) {
    console.error("檢查安全問題設定狀態失敗:", error);
    return true; // 出錯時假設需要設定
  }
};

/**
 * 更新安全問題（需要先驗證密碼）
 * @param {string} currentPassword - 目前密碼
 * @param {string} newAnswer - 新答案
 * @returns {boolean} 是否更新成功
 */
export const updateSecurityQuestion = async (currentPassword, newAnswer) => {
  try {
    // 先驗證目前密碼
    const isPasswordValid = await verifyPassword(currentPassword);
    if (!isPasswordValid) {
      return false;
    }

    // 更新安全問題答案
    const fixedQuestion = "您的咖啡廳店名是？";
    const success = await setSecurityQuestion(fixedQuestion, newAnswer);

    if (success) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.error("更新安全問題失敗:", error);
    return false;
  }
};

/**
 * 使用安全問題重置密碼
 * @param {string} securityAnswer - 安全問題答案
 * @param {string} newPassword - 新密碼
 * @returns {Object} { success: boolean, message: string }
 */
export const resetPasswordWithSecurity = async (
  securityAnswer,
  newPassword
) => {
  try {
    // 驗證安全問題答案
    const isAnswerValid = await verifySecurityAnswer(securityAnswer);
    if (!isAnswerValid) {
      return {
        success: false,
        message: "安全問題答案錯誤，請重新確認",
      };
    }
    // 設定新密碼
    const isPasswordSet = await setAuthPassword(newPassword);

    if (isPasswordSet) {
      // 記錄重置密碼的日誌
      try {
        await addDoc(collection(db, "stores", STORE_ID, "passwordResetLogs"), {
          timestamp: new Date().toISOString(),
          method: "security_question",
          userAgent: navigator.userAgent || "unknown",
          success: true,
        });
      } catch (logError) {
        console.warn("記錄密碼重置日誌失敗:", logError);
      }

      return {
        success: true,
        message: "密碼重置成功",
      };
    } else {
      return {
        success: false,
        message: "密碼重置失敗，請稍後再試",
      };
    }
  } catch (error) {
    console.error("使用安全問題重置密碼失敗:", error);
    return {
      success: false,
      message: "系統錯誤，請稍後再試",
    };
  }
};

// ==================== 日期範圍查詢 ====================
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
      orderBy("date", "desc")
    );
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
