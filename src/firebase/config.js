// src/firebase/config.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// 你的 Firebase 配置
const firebaseConfig = {
  apiKey: "AIzaSyChkGM347PKI5yNPgLQeUOX9fTmf7gQlbA",
  authDomain: "sagasu-pos-system.firebaseapp.com",
  projectId: "sagasu-pos-system",
  storageBucket: "sagasu-pos-system.firebasestorage.app",
  messagingSenderId: "226107846688",
  appId: "1:226107846688:web:9c98bd8379ec0c66e28c45",
  measurementId: "G-MGV59Z923Z",
};

// 初始化 Firebase
const app = initializeApp(firebaseConfig);

// 初始化 Firestore
export const db = getFirestore(app);

export default app;
