# Sagasu POS System

> Sagasu 咖啡廳專用的點餐與結帳管理系統

[![Deploy Status](https://img.shields.io/badge/deploy-vercel-black)](https://sagasu-pos.vercel.app)
[![Firebase](https://img.shields.io/badge/database-Firebase-orange)](https://firebase.google.com/)
[![React](https://img.shields.io/badge/react-19.1.1-blue)](https://reactjs.org/)

## 專案簡介

Sagasu POS 是一個為咖啡廳設計的全功能點餐與結帳系統，**從需求訪談到上線部署全程獨立開發**，目前穩定運行於實體店面的日常營業中。

系統支援內用、外帶訂單管理、多桌位即時同步、銷售報表分析，以及每週、每月自動寄送營業報告至店家 Email。

---

## 實際使用場景

<!-- 建議放 1-2 張店員實際操作的照片，背景是咖啡廳環境 -->
<!-- 範例：![店家使用情境](docs/images/store-usage.jpg) -->

> 本系統現正使用於 **Sagasu 咖啡廳**，供店長與店員進行每日點餐、結帳與帳務管理。

---

## 系統截圖

### 座位管理
<!-- ![座位圖](docs/images/seating.png) -->
> 截圖準備中

### 點餐畫面
<!-- ![點餐畫面](docs/images/ordering.png) -->
> 截圖準備中

### 結帳流程
<!-- ![結帳畫面](docs/images/checkout.png) -->
> 截圖準備中

### 菜單編輯
<!-- ![菜單編輯](docs/images/menu-editor.png) -->
> 截圖準備中

### 銷售報表
<!-- ![銷售報表](docs/images/history.png) -->
> 截圖準備中

### 自動週報 / 月報 Email
<!-- ![週報 Email](docs/images/weekly-report-email.png) -->
<!-- ![月報 Email](docs/images/monthly-report-email.png) -->
> 截圖準備中

---

## 主要功能

### 點餐系統
- **座位管理** — 支援多樓層座位配置（1F / 2F），即時顯示桌位狀態
- **內用 / 外帶** — 彈性切換訂單類型，外帶單獨立編號管理
- **訂單編輯** — 即時修改品項、數量、客製化選項（溫度、甜度、加料等）
- **批次送出** — 訂單分批送出，方便廚房對餐

### 結帳功能
- **多元支付** — 支援現金、Line Pay
- **部分結帳** — 可選擇特定品項結帳，適合多人分帳
- **自動計算** — 即時顯示小計、總計、找零

### 選單管理
- **品項 CRUD** — 新增、修改、刪除菜單品項
- **分類管理** — 依類別組織菜單，支援新增 / 刪除 / 重新命名類別
- **拖拉排序** — 直覺拖拉調整品項顯示順序
- **客製化選項** — 設定選項類型與對應加價金額

### 報表與分析
- **日 / 週 / 月報表** — 多維度銷售統計
- **自動寄送報告** — 每週、每月自動產生報表並寄送至指定 Email
- **訂單查詢** — 快速搜尋歷史訂單
- **退款處理** — 支援訂單退款與記錄

### 離線同步
- **智慧偵測** — 自動偵測網路連線狀態
- **本地快取** — 斷線時仍可繼續操作，資料不遺失
- **自動同步** — 恢復連線後自動上傳離線期間的資料

---

## 技術架構

| 類別 | 技術 |
|------|------|
| 前端框架 | React 19.1.1 |
| 後端服務 | Firebase Firestore、Firebase Authentication |
| 部署平台 | Vercel |
| 樣式 | Tailwind CSS |
| 圖示 | Lucide React |
| 開發工具 | Create React App、ESLint |

---

## 專案結構

```
src/
├── hooks/                  # Custom Hooks（狀態與業務邏輯）
│   ├── useAuth.js          # 認證邏輯
│   ├── useOrderActions.js  # 訂單操作
│   ├── useCheckout.js      # 結帳流程
│   ├── useFirebaseSync.js  # Firebase 同步
│   ├── useTableActions.js  # 桌位操作
│   ├── useMenuEditor.js    # 菜單編輯
│   ├── useHistoryData.js   # 歷史資料
│   ├── useDataManager.js   # 資料管理
│   └── useInitialLoad.js   # 初始化載入
├── components/
│   ├── pages/              # 頁面元件
│   │   ├── OrderingPage.js
│   │   ├── SeatingPage.js
│   │   ├── HistoryPage/
│   │   ├── MenuEditorPage/
│   │   ├── ExportReportsPage.js
│   │   └── AccountManagementPage.js
│   └── UI/                 # 通用 UI 元件
├── firebase/               # Firebase 模組（按功能域拆分）
│   ├── config.js
│   ├── menu.js
│   ├── tables.js
│   ├── orders.js
│   ├── sales.js
│   └── users.js
├── auth/                   # 認證相關頁面與工具
├── data/                   # 靜態資料
└── utils/                  # 工具函數
```

---

## 重構歷程

### 背景

本系統最初為了快速交付而採用單一大型元件架構，整個應用邏輯集中在 `CafePOSSystem.js` 一個檔案中。系統上線並穩定運行後，為了提升可維護性與程式碼品質，進行了一次完整的架構重構。

### Before → After

**重構前**
```
src/
├── CafePOSSystem.js   # 1800+ 行，所有邏輯集中於此
└── components/
    ├── menuData/      # 頁面元件與資料定義混放
    └── seatingData/   # 頁面元件與資料定義混放
```

**重構後**
```
src/
├── CafePOSSystem.js   # ~400 行，只負責組合 hooks 與路由
├── hooks/             # 9 個獨立 Hook，各自負責單一業務邏輯
├── components/
│   ├── pages/         # 所有頁面元件集中
│   └── UI/            # 所有 UI 元件集中
├── firebase/          # 5 個模組，按功能域拆分
└── data/              # 靜態資料獨立
```

### 重構原則

- **單一職責原則** — 每個檔案、每個函數只做一件事
- **保持可運行** — 每個階段完成後確認功能正常，再進行下一步
- **不改變行為** — 只改結構，不改功能

### 重構成果

| 指標 | 重構前 | 重構後 |
|------|--------|--------|
| CafePOSSystem.js 行數 | 1800+ 行 | ~400 行 |
| Firebase 操作 | 集中在單一檔案 | 5 個獨立模組 |
| 自訂 Hook 數量 | 0 | 9 個 |
| ESLint 警告 | 多處 | 零警告 |

---

## 快速開始

### 環境需求

- Node.js >= 14.x
- npm >= 6.x
- Firebase 帳號

### 安裝步驟

```bash
# 1. Clone 專案
git clone https://github.com/Du-22/sagasu-pos.git
cd sagasu-pos

# 2. 安裝相依套件
npm install

# 3. 設定 Firebase（將你的 Firebase 配置填入 src/firebase/config.js）

# 4. 啟動開發伺服器
npm start
```

### 可用指令

```bash
npm start        # 啟動開發伺服器（localhost:3000）
npm run build    # 建立生產版本
npm test         # 執行測試
```

---

## 作者

**Du-22**

- GitHub: [@Du-22](https://github.com/Du-22)
- Live Demo: [https://sagasu-pos.vercel.app](https://sagasu-pos.vercel.app)

---

*最後更新：2026-03-25*
