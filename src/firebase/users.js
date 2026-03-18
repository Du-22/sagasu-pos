/**
 * 使用者認證相關的 Firebase 操作模組
 *
 * 功能：
 * - 密碼設定與驗證
 * - 安全問題設定與驗證
 * - 登入日誌記錄
 * - 密碼重置
 *
 * 用途：
 * - LoginPage 登入驗證
 * - ChangePasswordPage 修改密碼
 * - ForgotPasswordPage 忘記密碼
 * - SetupSecurityQuestionPage 設定安全問題
 *
 */

import {
  collection,
  doc,
  getDoc,
  setDoc,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "./config";
import { hashPassword, generateSalt } from "../auth/utils";

const STORE_ID = "default_store";

// ==================== 密碼相關操作 ====================

/**
 * 取得認證設定
 * @returns {Object|null} 認證設定物件，不存在時返回 null
 *
 * 返回格式：
 * {
 *   hashedPassword: "雜湊後的密碼",
 *   salt: "鹽值",
 *   createdAt: "建立時間",
 *   lastUpdated: "最後更新時間"
 * }
 */
export const getAuthSettings = async () => {
  try {
    const authRef = doc(db, "stores", STORE_ID, "settings", "auth");
    const authSnap = await getDoc(authRef);

    if (authSnap.exists()) {
      return authSnap.data();
    } else {
      return null;
    }
  } catch (error) {
    console.error("取得認證設定失敗:", error);
    return null;
  }
};

/**
 * 設定密碼
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
    console.log("✅ 密碼設定成功");
    return true;
  } catch (error) {
    console.error("設定密碼失敗:", error);
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
      console.error("❌ 認證設定不存在");
      return false;
    }

    const { hashedPassword, salt } = authSettings;
    const inputHash = hashPassword(inputPassword, salt);
    const isValid = inputHash === hashedPassword;

    return isValid;
  } catch (error) {
    console.error("驗證密碼失敗:", error);
    return false;
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

// ==================== 登入日誌相關 ====================

/**
 * 記錄登入嘗試
 * @param {boolean} success - 是否登入成功
 * @param {string} userAgent - 瀏覽器資訊
 * @param {string} ip - IP位址（如果有的話）
 */
export const logLoginAttempt = async (
  success,
  userAgent = "",
  ip = "unknown",
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
 * 取得最近的登入日誌
 * @param {number} limitCount - 取得筆數限制
 * @returns {Array} 登入日誌陣列
 */
export const getRecentLoginLogs = async (limitCount = 50) => {
  try {
    const logRef = collection(db, "stores", STORE_ID, "loginLogs");
    const logQuery = query(
      logRef,
      orderBy("timestamp", "desc"),
      limit(limitCount),
    );
    const logSnap = await getDocs(logQuery);

    const logs = [];
    logSnap.forEach((doc) => {
      logs.push({ id: doc.id, ...doc.data() });
    });

    return logs;
  } catch (error) {
    console.error("❌ 取得登入日誌失敗:", error);
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
    console.log("✅ 安全問題設定成功");
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
      console.log("✅ 安全問題更新成功");
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
 * 更改密碼（需要先驗證舊密碼）
 * @param {string} oldPassword - 舊密碼
 * @param {string} newPassword - 新密碼
 * @returns {boolean} 是否更改成功
 */
export const changeAuthPassword = async (oldPassword, newPassword) => {
  try {
    // 先驗證舊密碼
    const isOldPasswordValid = await verifyPassword(oldPassword);
    if (!isOldPasswordValid) {
      console.error("❌ 舊密碼錯誤");
      return false;
    }

    // 設定新密碼
    const success = await setAuthPassword(newPassword);
    if (success) {
      console.log("✅ 密碼更改成功");
    }
    return success;
  } catch (error) {
    console.error("更改密碼失敗:", error);
    return false;
  }
};

/**
 * 初始化預設密碼（僅在首次使用時）
 * @param {string} defaultPassword - 預設密碼
 * @returns {boolean} 是否初始化成功
 */
export const initializeDefaultPassword = async (defaultPassword = "0000") => {
  try {
    // 檢查是否已經設定密碼
    const needsSetup = await needsPasswordSetup();
    if (!needsSetup) {
      console.log("⚠️ 密碼已存在，不需要初始化");
      return false;
    }

    // 設定預設密碼
    const success = await setAuthPassword(defaultPassword);
    if (success) {
      console.log("✅ 預設密碼初始化成功");
    }
    return success;
  } catch (error) {
    console.error("初始化預設密碼失敗:", error);
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
  newPassword,
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
