## sagasu-pos 專案目錄結構

> 說明：此檔案整理的是實際專案中的資料夾與檔案，已略過一般不會直接打開的大型相依資料夾（如 `node_modules/`）。

```text
sagasu-pos/
├── functions/                     # Firebase Cloud Functions
│   ├── .gitignore
│   ├── index.js
│   ├── package-lock.json
│   └── package.json
│
├── public/                        # 靜態資源
│   ├── index.html
│   └── manifest.json
│
├── src/                           # 前端 React 原始碼
│   ├── auth/                      # 登入、驗證與帳號相關頁面
│   │   ├── authContext.js
│   │   ├── ChangePasswordPage.js
│   │   ├── constants.js
│   │   ├── ForgotPasswordPage.js
│   │   ├── LoginFailurePage.js
│   │   ├── LoginPage.js
│   │   ├── SetupSecurityQuestionPage.js
│   │   └── utils.js
│   │
│   ├── components/                # React 元件與頁面
│   │   ├── hooks/                 # 自訂 Hooks
│   │   │   ├── useAuth.js
│   │   │   └── useDataManager.js
│   │   │
│   │   ├── menuData/              # 菜單資料與相關頁面
│   │   │   ├── defaultMenuData.js
│   │   │   └── OrderingPage.js
│   │   │
│   │   ├── pages/                 # 各功能主頁面
│   │   │   ├── AccountManagementPage.js
│   │   │   ├── ExportReportsPage.js
│   │   │   ├── HistoryPage.js
│   │   │   └── MenuEditorPage.js
│   │   │
│   │   ├── seatingData/           # 座位與樓層相關元件
│   │   │   ├── SeatingArea.js
│   │   │   └── SeatingPage.js
│   │   │
│   │   └── UI/                    # 共用 UI 元件
│   │       ├── OrderSummary/      # （資料夾存在，細節依實際內容）
│   │       ├── ConfirmationModal.js
│   │       ├── CustomOptionsModal.js
│   │       ├── FloorTabs.js
│   │       ├── Header.js
│   │       ├── MenuArea.js
│   │       ├── MenuCategories.js
│   │       ├── MenuItemButton.js
│   │       ├── OrderItem.js
│   │       ├── OrderItemControls.js
│   │       ├── OrderItemDisplay.js
│   │       ├── OrderSummary.js
│   │       ├── PricePreview.js
│   │       ├── TableButton.js
│   │       └── Timer.js
│   │
│   ├── firebase/                  # Firebase 設定與操作封裝
│   │   ├── config.js              # Firebase 配置
│   │   └── operations.js          # Firestore / Functions 封裝
│   │
│   ├── utils/                     # 共用工具函式
│   │   ├── priceCalculations/     # 價格計算模組
│   │   │   ├── batchProcessor.js
│   │   │   ├── core.js
│   │   │   ├── formatters.js
│   │   │   ├── index.js
│   │   │   └── validators.js
│   │   │
│   │   ├── authHelpers.js
│   │   ├── authNavigation.js
│   │   ├── authStorage.js
│   │   ├── firebaseHelpers.js
│   │   ├── lockManager.js
│   │   ├── loginHandler.js
│   │   ├── orderDataProcessors.js
│   │   ├── SmartConnectionMonitor.js
│   │   └── tableStateHelpers.js
│   │
│   ├── App.css
│   ├── App.js
│   ├── CafePOSSystem.js           # POS 核心邏輯與畫面
│   ├── index.css
│   └── index.js
│
├── .firebaserc                    # Firebase 專案設定
├── .gitignore
├── firebase.json                  # Firebase 部署設定
├── package-lock.json
├── package.json
└── README.md
```

