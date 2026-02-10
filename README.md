# 🍵 Sagasu POS System

> Sagasu 咖啡廳專用的點餐管理系統

[![Deploy Status](https://img.shields.io/badge/deploy-vercel-black)](https://sagasu-pos.vercel.app)
[![Firebase](https://img.shields.io/badge/database-Firebase-orange)](https://firebase.google.com/)
[![React](https://img.shields.io/badge/react-18.x-blue)](https://reactjs.org/)

## 🌟 專案簡介

Sagasu POS 是一個為咖啡廳設計的全功能點餐系統，**從需求訪談到上線部署全程獨立開發完成**。系統支援內用與外帶訂單管理、即時庫存追蹤、銷售報表分析等功能。

### 💼 專案特色（作品集亮點）

- 🎯 **真實商用案例** - 實際部署於 Sagasu 咖啡廳使用中
- 🏗️ **完整開發週期** - 從需求分析、系統設計到部署維護
- ⚡ **效能優化** - 離線同步、本地快取、批次處理
- 🔧 **持續改進** - 進行中的重構計畫展現程式碼品質追求

> 本專案採用 React + Firebase 技術棧，提供流暢的使用者體驗與可靠的資料同步機制。

### ✨ 主要功能

#### 📱 點餐系統

- 🪑 **座位管理** - 支援多樓層座位配置（1F/2F）
- 🥤 **內用/外帶** - 彈性切換訂單類型
- ✏️ **訂單編輯** - 即時修改品項、數量、客製化選項
- 🔄 **批次管理** - 訂單分批送出，方便廚房出餐

#### 💳 結帳功能

- 💰 **多元支付** - 支援現金、Line Pay
- 🧾 **部分結帳** - 可選擇特定品項結帳（適合分帳）
- 🔢 **自動計算** - 即時顯示小計、總計、找零

#### 🍰 選單管理

- 📝 **品項編輯** - 新增、修改、刪除菜單品項
- 🏷️ **分類管理** - 依類別組織菜單
- ⚙️ **客製化選項** - 設定溫度、甜度、加料等選項
- 💵 **彈性定價** - 支援基礎價格與加購價格設定

#### 📊 報表與歷史

- 📅 **日/週/月報表** - 多維度銷售統計
- 🔍 **訂單查詢** - 快速搜尋歷史訂單
- ↩️ **退款處理** - 支援訂單退款與記錄
- 📈 **營收分析** - 即時統計營業額與客單價

#### 🔐 帳號管理

- 👤 **使用者認證** - 安全的登入/登出機制
- 🔑 **密碼管理** - 支援密碼修改與找回
- ❓ **安全問題** - 額外的帳號保護機制

#### 🌐 離線同步

- 📡 **智慧偵測** - 自動偵測網路狀態
- 💾 **本地快取** - 斷線時仍可繼續操作
- 🔄 **自動同步** - 恢復連線後自動上傳資料

## 🚀 快速開始

### 環境需求

- Node.js >= 14.x
- npm >= 6.x
- Firebase 帳號

### 安裝步驟

1. **Clone 專案**

```bash
git clone https://github.com/Du-22/sagasu-pos.git
cd sagasu-pos
```

2. **安裝相依套件**

```bash
npm install
```

3. **設定 Firebase**
   - 在 Firebase Console 建立新專案
   - 啟用 Firestore、Authentication、Storage
   - 將 Firebase 配置複製到 `src/firebase/config.js`

4. **啟動開發伺服器**

```bash
npm start
```

5. **開啟瀏覽器**
   - 前往 http://localhost:3000
   - 使用預設帳號登入或建立新帳號

## 📁 專案結構

⚠️ **注意**：下方為重構後的目標結構。目前專案結構請參考 [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md)

### 重構後的目標結構

```
sagasu-pos/
├── public/                 # 靜態資源
├── src/
│   ├── components/         # React 元件
│   │   ├── seatingData/    # 座位相關元件
│   │   ├── menuData/       # 菜單相關元件
│   │   ├── pages/          # 頁面元件
│   │   ├── UI/             # 通用 UI 元件
│   │   └── hooks/          # 自訂 Hooks
│   ├── firebase/           # Firebase 相關
│   │   ├── config.js       # Firebase 配置
│   │   └── operations.js   # Firestore 操作
│   ├── auth/               # 認證相關
│   │   ├── LoginPage.js
│   │   ├── authHelpers.js
│   │   └── utils.js
│   ├── utils/              # 工具函數
│   │   ├── formatters.js
│   │   ├── validators.js
│   │   └── core.js
│   ├── App.js              # 主應用程式
│   ├── CafePOSSystem.js    # POS 系統核心
│   └── index.js            # 進入點
├── functions/              # Firebase Cloud Functions
├── .firebaserc             # Firebase 專案設定
├── firebase.json           # Firebase 部署設定
└── package.json            # 專案相依性
```

### 當前結構

請參考 [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) 查看實際的檔案配置。

## 🛠️ 技術架構

### 前端技術

- **React 18** - UI 框架
- **React Hooks** - 狀態管理
- **Lucide React** - Icon 圖示庫
- **CSS Modules** - 樣式管理

### 後端服務

- **Firebase Firestore** - NoSQL 資料庫
- **Firebase Authentication** - 使用者認證
- **Firebase Storage** - 檔案儲存
- **Firebase Functions** - 雲端函數

### 開發工具

- **Create React App** - 專案腳手架
- **ESLint** - 程式碼檢查
- **Git** - 版本控制

## 📦 部署

### 部署到 Vercel

```bash
# 安裝 Vercel CLI
npm i -g vercel

# 部署
vercel
```

### 部署到 Firebase Hosting

```bash
# 建立生產版本
npm run build

# 部署到 Firebase
firebase deploy
```

## 🔧 可用指令

```bash
npm start          # 啟動開發伺服器 (localhost:3000)
npm test           # 執行測試
npm run build      # 建立生產版本
npm run eject      # 彈出 CRA 配置（不可逆）
```

## 📝 開發注意事項

### 資料結構

#### Firestore 集合架構

```
stores/
  └── {STORE_ID}/
      ├── menu/          # 菜單品項
      ├── tables/        # 桌位狀態
      ├── sales/         # 銷售記錄
      └── users/         # 使用者資料
```

#### LocalStorage 快取

- `cafeMenuData` - 菜單資料
- `cafeTableStates` - 桌位狀態
- `cafeSalesHistory` - 銷售歷史
- `cafeTakeoutOrders` - 外帶訂單

### 離線機制

系統使用 `SmartConnectionMonitor` 監控網路狀態：

- ✅ **Online** - 即時同步到 Firebase
- ⚠️ **Offline** - 儲存到 localStorage
- 🔄 **Reconnected** - 批次上傳離線資料

## 🗺️ 開發歷程與重構

### 專案背景

本系統為親戚經營的 Sagasu 咖啡廳客製開發，針對實際營運需求設計功能，目前已穩定運行。

### 技術重構計畫

為提升程式碼品質與可維護性，規劃進行全面重構：

#### 🎯 重構目標

- **模組化** - 將肥大檔案拆分為獨立模組
- **架構優化** - 導入三層式架構（UI / Business Logic / Data）
- **程式碼品質** - 降低耦合度，提高內聚性
- **可讀性提升** - 單一檔案不超過 300 行

#### 📋 重構階段（9 個 Phase）

1. ✅ **資料夾結構重組** - 建立清晰的模組架構
2. 🔄 **Firebase 操作拆分** - 按功能域分離 API 層
3. 🔄 **核心元件重構** - 抽取狀態管理與業務邏輯
4. 🔄 **UI 元件拆分** - 獨立化訂單、結帳、歷史頁面
5. 🔄 **工具函數模組化** - 統一管理計算與格式化
6. 🔄 **常數統一管理** - 消除 magic number
7. 🔄 **測試與優化** - 確保重構後穩定性

詳細重構計畫請參考：[refactoring-plan.md](docs/refactoring-plan.md)

### 🎓 技術亮點（作品集重點）

- ✨ **複雜狀態管理** - 處理多桌位、批次訂單的並發狀態
- 🔄 **離線同步機制** - 智慧偵測網路並自動同步資料
- 📊 **即時數據計算** - 動態計算訂單金額、統計報表
- 🎨 **直覺式 UI/UX** - 針對餐飲業流程優化的操作介面
- 🔐 **安全認證機制** - Firebase Authentication 整合
- 📱 **響應式設計** - 支援桌面與平板使用

## 📄 授權

本專案採用 MIT 授權條款 - 詳見 [LICENSE](LICENSE) 檔案

## 👨‍💻 作者

**Du-22**

- GitHub: [@Du-22](https://github.com/Du-22)
- Project Link: [https://github.com/Du-22/sagasu-pos](https://github.com/Du-22/sagasu-pos)
- Live Demo: [https://sagasu-pos.vercel.app](https://sagasu-pos.vercel.app)

> 💡 本專案展示了從零到一開發商用系統的完整能力，包含需求分析、系統架構設計、前後端整合、部署維運等全端開發技能。

## 🙏 致謝

- Create React App 團隊
- Firebase 提供的優質後端服務
- Lucide 的精美圖示
- 所有使用與測試本系統的朋友們

---

**部署連結**：https://sagasu-pos.vercel.app

**最後更新**：2026-02-10
