# Sagasu POS 系統 - Claude Instructions

## 專案背景
這是為親戚經營的 Sagasu 咖啡廳開發的 POS 系統，目前已部署使用中。
前期的架構重構（Phase 1~9）已全部完成並合併到 main，目前進入維護與功能調整階段。

## 技術堆疊
- **React** 19.1.1
- **Firebase** 12.2.1（Modular SDK，使用 `import { xxx } from 'firebase/xxx'` 語法）
- **lucide-react** 0.542.0（圖示庫）
- **react-scripts** 5.0.1（Create React App）
- **部署平台**：Vercel
- **語言**：JavaScript（非 TypeScript）

## 已知問題與注意事項
- 專案目前已在生產環境運行，任何重構都不能破壞現有功能
- Firebase 使用 Modular SDK（v9+），請勿使用舊版 `firebase.firestore()` 命名空間語法
- Create React App 架構，不支援 Vite 或其他打包工具的特定語法

## 常用指令
```bash
npm start       # 啟動開發環境（localhost:3000）
npm run build   # 打包生產版本
npm test        # 執行測試
git push        # 推送到 GitHub（Vercel 會自動從 main 部署）
```

## 專案結構
**實際專案路徑：** `sagasu-pos/src/`

**關鍵資料夾：**
- `src/components/` - UI 元件
- `src/firebase/` - Firebase 操作
- `src/auth/` - 認證相關
- `src/utils/` - 工具函數
- `src/services/` - 業務邏輯
- `src/pages/` - 頁面元件
- `src/hooks/` - 自訂 Hooks

## 程式碼風格原則
- **單一職責原則（SRP）**：每個檔案/函數只做一件事
- **檔案長度限制**：單一檔案盡量不超過 300 行
- **函數長度限制**：單一函數盡量不超過 50 行
- **保持可運行**：修改時要確保專案能正常執行
- 特別重要或困難的地方加區塊註解說明「為什麼」這樣做
- 新元件需包含功能說明與使用範例

## 開發準則
- **頻繁提交**：每完成一個小功能就提交，方便隨時回滾
- **邊做邊測**：不要做完才測試，每個階段都要確保功能正常
- **主動提醒**：如果認為該功能值得做一個段落，請主動提出提交測試
- **詳細記錄**：保持詳細的變更記錄和回滾準備
- **完整文件**：新組件需包含功能說明和使用範例

## Git 工作流程

### 分支策略
- `main` 是正式分支，Vercel 自動從 main 部署
- 每次改動（feature / fix / chore）**開獨立分支**，不在 main 直接改
- 分支命名：`fix/xxx`、`feat/xxx`、`chore/xxx` 等
- 完成 + 測試通過 → GitHub 建 PR → 合併到 main

### 合併習慣
- 偏好在 GitHub 網站建立並合併 PR（不使用本地 merge）
- 合併後的標準本地收尾：
```bash
git checkout main
git pull
git branch -d <合併完的分支>
git remote prune origin
```

### 改動完成檢查流程
1. Claude 完成程式碼修改
2. Claude 提醒需要測試的功能項目
3. 使用者測試功能（本地 / preview URL）
4. 測試通過 → commit + push → PR → 合併
5. 測試失敗 → 告知 Claude 錯誤 → 修正 → 重新測試

### 回滾機制（僅限未 push 或 preview 狀態）
```bash
git reset --hard HEAD~1  # 回到上一個 commit
git push -f              # 強制推送（僅限 feature/fix 分支，main 絕對禁止）
```

### 重構文件管理（歷史資料）
- 重構過程的計畫書、Phase 報告存放在**桌面的獨立資料夾** `sagasu-pos-refactoring/`
- 這些文件**不加入專案 Git**，保留作為重構歷程紀錄

## 測試重點（動到核心功能時需驗證）
- [ ] 登入/登出
- [ ] 點餐功能（新增、修改、刪除）
- [ ] 送出訂單與批次顯示
- [ ] 結帳功能（全額、部分結帳）
- [ ] 歷史記錄查詢（日/週/月）
- [ ] 選單編輯
- [ ] 離線同步機制

## 溝通規則
- **換聊天串時**：請主動整理當前進度與狀況，方便新聊天快速進入狀態
- **減少 Emoji**：避免過度使用 emoji，僅在必要時使用
- **頻繁提醒**：如果認為該功能值得做一個段落，請主動提出提交測試

## 輸出格式規則
- 只有在討論片段程式碼或說明概念時才用 Markdown 程式碼區塊
- 直接修改/建立本地檔案，不需要額外的下載流程
- 修改完成後說明放置路徑與 import 路徑

## 提醒事項
- 如果發現適合放到 CLAUDE.md 的內容，請主動提醒
- 修改時保持專案隨時可運行
- 小步前進，頻繁測試
- 使用者正在學習 JS 及前後端技術，說明時可適當解釋原因
