import CryptoJS from "crypto-js";
import { AUTH_CONFIG } from "./constants";

/**
 * 產生密碼雜湊值
 * @param {string} password - 原始密碼
 * @param {string} salt - 鹽值
 * @returns {string} 雜湊密碼
 */
export const hashPassword = (password, salt) => {
  return CryptoJS.SHA256(password + salt).toString();
};

/**
 * 產生隨機鹽值
 * @returns {string} 隨機鹽值
 */
export const generateSalt = () => {
  return CryptoJS.lib.WordArray.random(32).toString();
};

/**
 * 驗證密碼
 * @param {string} inputPassword - 使用者輸入的密碼
 * @param {string} storedHash - 儲存的雜湊值
 * @param {string} salt - 鹽值
 * @returns {boolean} 是否密碼正確
 */
export const verifyPassword = (inputPassword, storedHash, salt) => {
  const hashedInput = hashPassword(inputPassword, salt);
  return hashedInput === storedHash;
};

/**
 * 產生登入 token
 * @returns {string} token
 */
export const generateToken = () => {
  return CryptoJS.lib.WordArray.random(16).toString();
};

/**
 * 檢查 token 是否有效
 * @returns {boolean} token是否有效
 */
export const isTokenValid = () => {
  const token = localStorage.getItem(AUTH_CONFIG.STORAGE_KEYS.TOKEN);
  const expires = localStorage.getItem(AUTH_CONFIG.STORAGE_KEYS.TOKEN_EXPIRES);

  if (!token || !expires) return false;

  return Date.now() < parseInt(expires);
};

/**
 * 清除登入狀態
 */
export const clearAuthData = () => {
  Object.values(AUTH_CONFIG.STORAGE_KEYS).forEach((key) => {
    localStorage.removeItem(key);
  });
};

/**
 * 設定登入成功的狀態
 */
export const setAuthSuccess = () => {
  const token = generateToken();
  const expires = Date.now() + AUTH_CONFIG.TOKEN_EXPIRES_MS;

  localStorage.setItem(AUTH_CONFIG.STORAGE_KEYS.TOKEN, token);
  localStorage.setItem(
    AUTH_CONFIG.STORAGE_KEYS.TOKEN_EXPIRES,
    expires.toString()
  );

  // 清除登入失敗記錄
  localStorage.removeItem(AUTH_CONFIG.STORAGE_KEYS.LOGIN_ATTEMPTS);
  localStorage.removeItem(AUTH_CONFIG.STORAGE_KEYS.LOCKOUT_UNTIL);
};

/**
 * 處理登入失敗
 * @returns {object} { isLocked: boolean, attemptsLeft: number, lockUntil: number }
 */
export const handleLoginFailure = () => {
  const attempts = parseInt(
    localStorage.getItem(AUTH_CONFIG.STORAGE_KEYS.LOGIN_ATTEMPTS) || "0"
  );
  const newAttempts = attempts + 1;

  localStorage.setItem(
    AUTH_CONFIG.STORAGE_KEYS.LOGIN_ATTEMPTS,
    newAttempts.toString()
  );

  if (newAttempts >= AUTH_CONFIG.MAX_LOGIN_ATTEMPTS) {
    const lockUntil = Date.now() + AUTH_CONFIG.LOCKOUT_DURATION_MS;
    localStorage.setItem(
      AUTH_CONFIG.STORAGE_KEYS.LOCKOUT_UNTIL,
      lockUntil.toString()
    );

    return {
      isLocked: true,
      attemptsLeft: 0,
      lockUntil,
    };
  }

  return {
    isLocked: false,
    attemptsLeft: AUTH_CONFIG.MAX_LOGIN_ATTEMPTS - newAttempts,
    lockUntil: null,
  };
};

/**
 * 檢查是否被鎖定
 * @returns {object} { isLocked: boolean, lockUntil: number, timeLeft: number }
 */
export const checkLockStatus = () => {
  const lockUntil = parseInt(
    localStorage.getItem(AUTH_CONFIG.STORAGE_KEYS.LOCKOUT_UNTIL) || "0"
  );

  if (!lockUntil) {
    return { isLocked: false, lockUntil: null, timeLeft: 0 };
  }

  const now = Date.now();
  const timeLeft = lockUntil - now;

  if (timeLeft <= 0) {
    // 鎖定時間已過，清除鎖定狀態
    localStorage.removeItem(AUTH_CONFIG.STORAGE_KEYS.LOCKOUT_UNTIL);
    localStorage.removeItem(AUTH_CONFIG.STORAGE_KEYS.LOGIN_ATTEMPTS);
    return { isLocked: false, lockUntil: null, timeLeft: 0 };
  }

  return {
    isLocked: true,
    lockUntil,
    timeLeft,
  };
};
