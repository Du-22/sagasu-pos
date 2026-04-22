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
  getDocsFromServer,
  setDoc,
  deleteDoc,
  waitForPendingWrites,
} from "firebase/firestore";
import { db } from "./config";

const STORE_ID = "default_store";

/**
 * 取得選單資料
 * @returns {Array|null}
 *   - Array（可能是空陣列）：成功讀取，Firebase 實際有幾個品項就回幾個
 *   - null：讀取失敗（網路錯誤等）
 *
 * 注意：空陣列和 null 意義不同
 * - [] 代表 Firebase 確實沒有菜單（全部刪光的合法狀態）
 * - null 代表連線失敗，呼叫方需要改用 localStorage 備份做 fallback
 */
export const getMenuData = async () => {
  try {
    const menuRef = collection(db, "stores", STORE_ID, "menu");
    const menuSnap = await getDocs(menuRef);

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
  // 備份用途：Firebase 讀取失敗時的唯讀 fallback（見 useInitialLoad 菜單載入策略）
  // version 與 useFirebaseSync、useInitialLoad 保持一致（v3_firebase_first）
  try {
    const backup = {
      data: menuData,
      timestamp: new Date().toISOString(),
      version: "v3_firebase_first",
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

  // ==================== 步驟 4.5: 從伺服器驗證實際狀態 ====================
  //
  // 為什麼需要這一步：
  // config.js 啟用了 persistentLocalCache，這會讓 setDoc/deleteDoc 的 promise
  // 在「寫入本地快取」時就 resolve，不等伺服器確認。如果伺服器後來沒真正收到，
  // 前面的 Promise.allSettled 會全部顯示 success，但 Firebase 遠端其實狀態不對。
  //
  // 解法：
  // 1. waitForPendingWrites：等所有 queue 中的寫入實際送到伺服器
  // 2. getDocsFromServer：強制從伺服器（而非快取）讀取當前狀態
  // 3. 比對：應該留下的、應該刪除的，跟伺服器實際狀態是否一致
  //
  // 如果離線或網路不穩，waitForPendingWrites 會卡住，所以加 10 秒 timeout：
  // timeout 時不視為失敗（寫入仍在 queue、上線後會同步），但會 console 警告。
  let verificationIssues = [];
  let verificationSkipped = false;

  try {
    const waitPromise = waitForPendingWrites(db).then(() => ({ synced: true }));
    const timeoutPromise = new Promise((resolve) =>
      setTimeout(() => resolve({ synced: false }), 10000),
    );
    const waitResult = await Promise.race([waitPromise, timeoutPromise]);

    if (!waitResult.synced) {
      verificationSkipped = true;
      console.warn(
        "⚠️ 寫入尚未完全同步到伺服器（可能網路不穩），跳過驗證。上線後 Firestore 會自動補送寫入。",
      );
    } else {
      const serverSnap = await getDocsFromServer(menuRef);
      const serverIds = new Set();
      serverSnap.forEach((d) => serverIds.add(d.id));

      const shouldBeDeletedButStillExist = [];
      for (const [existingId] of existingItems) {
        if (!newItemIds.has(existingId) && serverIds.has(existingId)) {
          shouldBeDeletedButStillExist.push(existingId);
        }
      }

      const shouldExistButMissing = [];
      for (const id of newItemIds) {
        if (!serverIds.has(id)) {
          shouldExistButMissing.push(id);
        }
      }

      if (shouldBeDeletedButStillExist.length > 0) {
        verificationIssues.push(
          `${shouldBeDeletedButStillExist.length} 個品項刪除未生效（伺服器仍有記錄）`,
        );
        console.error(
          "❌ 刪除未生效的品項 ID:",
          shouldBeDeletedButStillExist,
        );
      }
      if (shouldExistButMissing.length > 0) {
        verificationIssues.push(
          `${shouldExistButMissing.length} 個品項寫入未生效（伺服器缺少記錄）`,
        );
        console.error("❌ 寫入未生效的品項 ID:", shouldExistButMissing);
      }

      if (verificationIssues.length === 0) {
        console.log(`✅ 伺服器驗證通過：${serverIds.size} 個品項狀態一致`);
      }
    }
  } catch (verifyError) {
    console.warn("⚠️ 伺服器驗證過程失敗（不視為儲存失敗）:", verifyError);
    verificationSkipped = true;
  }

  // ==================== 步驟 5: 檢查結果 ====================
  const issues = [];
  if (step2Failed) issues.push("無法讀取現有品項清單（刪除操作未執行）");
  if (failCount > 0) issues.push(`${failCount} 個品項更新失敗`);
  if (deleteFailCount > 0) issues.push(`${deleteFailCount} 個品項刪除失敗`);
  if (verificationIssues.length > 0) issues.push(...verificationIssues);

  if (issues.length > 0) {
    const errorMessage = issues.join("、");
    console.error(`⚠️ 儲存問題: ${errorMessage}`);
    throw new Error(errorMessage);
  }

  if (verificationSkipped) {
    console.log("✅ 選單保存完成（未驗證伺服器實際狀態）");
  } else {
    console.log("✅ 選單保存完成（已驗證伺服器狀態）");
  }
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
