// src/firebase/config.js
import { initializeApp } from "firebase/app";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";

// 開發環境配置
const devConfig = {
  apiKey: "AIzaSyAbuVw7G5Aiu7I27KLETVVKSOlaUuL1rAI",
  authDomain: "sagasu-pos-system-dev.firebaseapp.com",
  projectId: "sagasu-pos-system-dev",
  storageBucket: "sagasu-pos-system-dev.firebasestorage.app",
  messagingSenderId: "487308381018",
  appId: "1:487308381018:web:9429ec23acfb8298e58163",
  measurementId: "G-K83XLGJEXE",
};

// 正式環境配置
const prodConfig = {
  apiKey: "AIzaSyChkGM347PKI5yNPgLQeUOX9fTmf7gQlbA",
  authDomain: "sagasu-pos-system.firebaseapp.com",
  projectId: "sagasu-pos-system",
  storageBucket: "sagasu-pos-system.firebasestorage.app",
  messagingSenderId: "226107846688",
  appId: "1:226107846688:web:9c98bd8379ec0c66e28c45",
  measurementId: "G-MGV59Z923Z",
};

// 根據環境選擇配置
const isProduction = process.env.NODE_ENV === "production";
const firebaseConfig = isProduction ? prodConfig : devConfig;

// 在 console 顯示當前使用的環境（僅開發時顯示）
if (!isProduction) {
}

// 初始化 Firebase
const app = initializeApp(firebaseConfig);

// 初始化 Firestore，啟用離線持久化快取
// persistentLocalCache：將資料存在 IndexedDB，離線時仍可讀取舊資料、寫入操作會排隊等網路恢復後自動同步
// persistentMultipleTabManager：支援多分頁同時開啟同一個 POS 系統
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});

export default app;
