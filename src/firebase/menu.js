/**
 * 選單相關的 Firebase 操作模組
 *
 * 功能：
 * - 取得選單資料
 * - 儲存選單資料（含備份機制）
 * - 本地快取管理
 *
 * 用途：
 * - MenuEditorPage 編輯選單時使用
 * - CafePOSSystem 載入選單時使用
 * - 提供選單的 CRUD 操作
 *
 */

import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "./config";

const STORE_ID = "default_store";

/**
 * 取得選單資料
 * @returns {Array|null} 選單項目陣列，失敗時返回 null
 */
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
    console.error("取得選單失敗:", error);
    return null;
  }
};

/**
 * 儲存選單資料（含備份與批次更新機制）
 * @param {Array} menuData - 選單資料陣列
 * @throws {Error} 當儲存失敗時拋出錯誤
 *
 * 執行步驟：
 * 1. 備份到 localStorage
 * 2. 取得現有選單
 * 3. 更新或新增品項
 * 4. 刪除不再需要的品項
 * 5. 檢查結果
 */
export const saveMenuData = async (menuData) => {
  console.log("📝 開始安全保存選單數據...");

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

  // ==================== 步驟 2: 取得現有選單 ====================
  const menuRef = collection(db, "stores", STORE_ID, "menu");
  let existingItems = new Map();
  let step2Failed = false;

  try {
    const existingDocs = await getDocs(menuRef);
    existingDocs.forEach((doc) => {
      existingItems.set(doc.id, doc.data());
    });
    console.log(`📊 現有品項數量: ${existingItems.size}`);
  } catch (error) {
    step2Failed = true;
    console.error("⚠️ 無法讀取現有選單,將直接寫入:", error);
    // 繼續執行,當作沒有現有數據
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
      { merge: true }, // ✅ 關鍵：使用 merge 模式,不會先刪除
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

  let deleteFailCount = 0;

  if (deletePromises.length > 0) {
    const deleteResults = await Promise.allSettled(deletePromises);
    const deleteSuccess = deleteResults.filter((r) => r.value?.success).length;
    deleteFailCount = deletePromises.length - deleteSuccess;
    console.log(`🗑️ 刪除結果: ${deleteSuccess}/${deletePromises.length} 成功`);
  }

  // ==================== 步驟 5: 檢查結果 ====================
  const issues = [];
  if (step2Failed) issues.push("無法讀取現有品項清單（刪除操作未執行）");
  if (failCount > 0) issues.push(`${failCount} 個品項更新失敗`);
  if (deleteFailCount > 0) issues.push(`${deleteFailCount} 個品項刪除失敗`);

  if (issues.length > 0) {
    const errorMessage = issues.join("、");
    console.error(`⚠️ 儲存問題: ${errorMessage}`);
    throw new Error(errorMessage);
  }

  console.log("✅ 選單保存完成");
};

/**
 * 從 localStorage 取得快取的選單
 * @returns {Array|null} 快取的選單資料，沒有快取時返回 null
 */
export const getCachedMenu = () => {
  try {
    const cached = localStorage.getItem("cafeMenuData");
    if (cached) {
      return JSON.parse(cached);
    }
    return null;
  } catch (error) {
    console.error("讀取快取選單失敗:", error);
    return null;
  }
};

/**
 * 清除選單快取
 */
export const clearMenuCache = () => {
  try {
    localStorage.removeItem("cafeMenuData");
    localStorage.removeItem("cafeMenuData_backup");
    console.log("✅ 選單快取已清除");
  } catch (error) {
    console.error("清除選單快取失敗:", error);
  }
};
