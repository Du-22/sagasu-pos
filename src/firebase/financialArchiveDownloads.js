import { getFunctions, httpsCallable } from "firebase/functions";

/**
 * 建立封存檔短效下載 session。
 *
 * 後端會重新驗證 POS 密碼，驗證通過後回傳短效下載連結。
 * @param {Object} params
 * @param {string} params.month - YYYY-MM
 * @param {string} params.password - POS 管理密碼
 * @returns {Object} 下載 session 結果
 */
export const createArchiveDownloadSession = async ({ month, password }) => {
  const functions = getFunctions();
  const createSession = httpsCallable(
    functions,
    "createFinancialArchiveDownloadSession",
  );
  const result = await createSession({ month, password });
  return result.data;
};
