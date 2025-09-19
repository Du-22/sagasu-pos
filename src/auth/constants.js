export const AUTH_CONFIG = {
  // Token 有效時間（12小時：10小時營業 + 2小時緩衝）
  TOKEN_EXPIRES_MS: 12 * 60 * 60 * 1000,

  // 防暴力破解設定
  MAX_LOGIN_ATTEMPTS: 3,
  LOCKOUT_DURATION_MS: 5 * 60 * 1000, // 5分鐘

  // localStorage 鍵名
  STORAGE_KEYS: {
    TOKEN: "sagasu_pos_token",
    TOKEN_EXPIRES: "sagasu_pos_token_expires",
    LOGIN_ATTEMPTS: "sagasu_pos_login_attempts",
    LOCKOUT_UNTIL: "sagasu_pos_lockout_until",
  },
};
