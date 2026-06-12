# Ran2-Toolkit (亂好練工具箱)

本專案是一個基於 **Vue 3 + Vite + Firebase** 開發的遊戲社群工具箱，整合了地圖任務指南、練功組團招募（搭配 FCM 推播提醒）以及玩家好物分享（結合 Google Drive 雲端截圖與自動交易結案系統）。

為了實現背景定時任務與圖片上傳，專案搭配了 **Google Apps Script (GAS)** 作為無伺服器 (Serverless) 後端。本文件將詳細記錄本專案的 Firebase 配置與 GAS 部署設定。

---

## 1. 環境變數配置 (`.env.local`)

請在專案根目錄建立 `.env.local` 檔案（此檔案已列入 `.gitignore`，請勿提交），並填入以下配置：

```env
# Firebase SDK 設定
VITE_FIREBASE_API_KEY=YOUR_API_KEY
VITE_FIREBASE_AUTH_DOMAIN=YOUR_AUTH_DOMAIN.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=ran2-toolkit
VITE_FIREBASE_STORAGE_BUCKET=YOUR_STORAGE_BUCKET.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=YOUR_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID=YOUR_APP_ID

# FCM Web Push VAPID 金鑰
VITE_FIREBASE_VAPID_KEY=YOUR_FCM_VAPID_PUBLIC_KEY

# Google Apps Script Web App API 網址 (用於圖片上傳與主動推播)
VITE_GAS_FUNCTION_URL=https://script.google.com/macros/s/xxxx/exec
```

---

## 2. Firebase 配置

### A. Firestore 集合 Schema 設計 (Collections)

#### 1. `shares` (好物分享庫)
*   **用途**：記錄玩家上傳分享的道具裝備資料。
*   **文檔 ID**：Firebase 自動生成（Auto-generated ID）。

| 欄位名稱 | 資料類型 | 說明 / 可選值 |
| :--- | :--- | :--- |
| `name` | String | 道具/裝備名稱 |
| `giverId` | String | 分享者角色名稱 |
| `server` | String | 伺服器名稱（例如：`商洞一服`） |
| `type` | String | 道具分類（例如：`武器`、`防具`、`消耗品`） |
| `passwordHash` | String | 該分享項目的管理密碼（SHA-256 雜湊值） |
| `status` | String | 分享狀態（`分享中`、`交易中`、`已完成`） |
| `image` | String | 道具截圖 URL（儲存於 Google Drive 的直連下載網址） |
| `statReq` | Array (String) | 屬性限制條件清單（預設：`['無特殊裝備要求']`） |
| `stats` | Array (String) | 道具屬性清單（預設：`['基礎屬性，無額外加成']`） |
| `notes` | String | 備註說明 |
| `createdAt` | Number | 創建時間（Unix 時間戳，毫秒） |
| `updatedAt` | Number | 更新時間（Unix 時間戳，毫秒） |
| `claimTime` | Number / null | 被認領（指定得主）時間（毫秒） |
| `completeTime` | Number / null | 交易完成（結案）時間（毫秒） |
| `receiverId` | String / null | 得標（認領）者角色 ID |
| `applicantCount` | Number | 累計申請人數計數器 |

#### 2. `applications` (好物申請紀錄)
*   **用途**：記錄玩家對特定好物的申請、抽獎與得標狀態。
*   **文檔 ID**：`[識別碼]_[好物ID]`（例如：`code123_docId456`，用以防止重複申請）。

| 欄位名稱 | 資料類型 | 說明 / 可選值 |
| :--- | :--- | :--- |
| `itemId` | String | 關聯的 `shares` 好物文檔 ID |
| `itemName` | String | 關聯的好物道具名稱 |
| `charId` | String | 申請人填寫的遊戲角色 ID |
| `userId` | String | 申請人的識別碼（即文檔 ID 前綴） |
| `status` | String | 申請狀態（`申請中`、`確認中`、`已完成`、`已取消`、`未中標`） |
| `applyTime` | Number | 申請時間（Unix 時間戳，毫秒） |
| `completeTime` | Number / null | 交易完成結案時間（毫秒） |
| `fcmToken` | String / null | 申請人的 FCM Registration Token（用於接收得標通知） |
| `notifiedWinner` | Boolean | 是否已完成 FCM 得標推播（避免重複通知） |

#### 3. `parties` (練功團組團招募)
*   **用途**：記錄玩家發起的練功團招募資訊。
*   **文檔 ID**：Firebase 自動生成（Auto-generated ID）。

| 欄位名稱 | 資料類型 | 說明 / 可選值 |
| :--- | :--- | :--- |
| `title` | String | 練功團標題（例如：`黃金洞來打怪`） |
| `leaderId` | String | 團長角色名稱 |
| `server` | String | 伺服器名稱 |
| `location` | String | 練功地圖/地點（例如：`商洞`、`其他`） |
| `customLocation` | String | 自訂練功地點（若 `location` 為其他時填寫） |
| `startTime` | Number | 出發時間（Unix 時間戳，毫秒） |
| `endTime` | Number | 結束時間（Unix 時間戳，毫秒） |
| `requirements` | String | 招募要求（例如：`徵格鬥敏捷、需滿 120 等`） |
| `passwordHash` | String | 練功團管理密碼（SHA-256 雜湊值） |
| `status` | String | 招募狀態（`招募中`、`進行中`、`已結束`） |
| `closeReason` | String | 關團原因（手動或自動定時關團原因） |
| `expectedCount` | Number | 已加入/預計通知的訂閱者人數 |
| `createdAt` | Number | 創建時間（Unix 時間戳，毫秒） |
| `notified10min` | Boolean | 是否已發送過開團前 10 分鐘推播提醒 |

#### 4. `party_subscriptions` (練功團訂閱通知)
*   **用途**：記錄玩家訂閱特定隊伍開團提醒的推播 Token。
*   **文檔 ID**：`[FCM Token]_[練功團ID]`。

| 欄位名稱 | 資料類型 | 說明 / 可選值 |
| :--- | :--- | :--- |
| `token` | String | 訂閱者的 FCM Registration Token |
| `partyId` | String | 訂閱的 `parties` 招募團文檔 ID |
| `createdAt` | Number | 訂閱時間（Unix 時間戳，毫秒） |

#### 5. `global_tokens` (全站通知訂閱)
*   **用途**：記錄玩家啟用「全站新團招募提醒」的推播 Token。
*   **文檔 ID**：`[FCM Token]`。

| 欄位名稱 | 資料類型 | 說明 / 可選值 |
| :--- | :--- | :--- |
| `token` | String | 訂閱者的 FCM Registration Token |
| `createdAt` | Number | 訂閱時間（Unix 時間戳，毫秒） |

### B. Firestore 規則與索引
*   安全性設定請參照專案根目錄的 `firestore.rules`。
*   複合索引設定請參照 `firestore.indexes.json`（可使用 Firebase CLI 執行 `firebase deploy --only firestore` 進行部署）。

---

## 3. Google Apps Script (GAS) 備份與部署

專案中所有外部呼叫的自動化腳本皆備份於 `gas/` 資料夾中：
1.  [GAS_Toolkit_Function.js](file:///c:/Project/Ran2-Toolkit/gas/GAS_Toolkit_Function.js)：網頁應用程式 (Web App) 接收端，負責**圖片上傳 Google Drive**、**空間舊圖移入垃圾桶回收**以及**主動刪除好物推播**。
2.  [GAS_Toolkit_Scheduler.js](file:///c:/Project/Ran2-Toolkit/gas/GAS_Toolkit_Scheduler.js)：背景定時器，負責**自動結案超時好物**、**關閉過期練功團**與**定時掃描並發送 FCM 提醒**。

### 部署步驟：

#### 步驟 1：建立 Apps Script 專案
1.  前往 [Google Apps Script 儀表板](https://script.google.com)。
2.  建立兩個專案（建議分開）：
    *   專案 A：`Ran2-Toolkit-Function` (貼入 `GAS_Toolkit_Function.js` 程式碼)
    *   專案 B：`Ran2-Toolkit-Scheduler` (貼入 `GAS_Toolkit_Scheduler.js` 程式碼)

#### 步驟 2：設定專案屬性 (Script Properties)
在兩個 GAS 專案的「專案設定（齒輪圖示）」底下的「指令碼屬性」中，新增以下設定：
*   **`SERVICE_ACCOUNT_KEY`**：填入 Google Cloud Platform (GCP) 服務帳戶的 **JSON 金鑰金鑰內容**。
    *   *註：該服務帳戶必須擁有存取 Firestore 寫入權限 (例如 `Cloud Datastore Owner`) 及發送 FCM 通知權限 (例如 `Firebase SDK Admin Service Agent` 或 `Firebase Messaging Admin`)。*
*   **`UPLOAD_FOLDER_ID`** *(僅限 Function 專案)*：在 Google Drive 建立一個資料夾，設定共用權限為「知道連結的任何人皆可檢視」，並將該資料夾 ID 填入此屬性中。

#### 步驟 3：部署 Function (Web App API)
1.  在 `Ran2-Toolkit-Function` 專案中，點擊右上角「**部署**」➔「**新增部署**」。
2.  類型選擇「**網頁應用程式**」。
3.  設定值：
    *   執行身分：`Me` (您的 Google 帳戶)
    *   誰有存取權：`Anyone` (任何人)
4.  點擊部署，並複製產生的 **Web App URL**。
5.  將此網址填入前端專案的 `.env.local` 檔案中的 `VITE_GAS_FUNCTION_URL` 欄位。

#### 步驟 4：設定 Scheduler 定時器觸發 (Triggers)
1.  進入 `Ran2-Toolkit-Scheduler` 專案。
2.  點擊左側導覽列的「**觸發器**（時鐘圖示）」➔ 右下角「**新增觸發器**」。
3.  分別為以下 4 個函數建立定時任務（觸發來源設定為「**時間驅動**」、類型為「**分鐘定時器**」、間隔為「**每分鐘**」）：
    *   `checkAndCloseExpiredShares` (每分鐘檢查並自動結案 7 天超時好物)
    *   `checkAndCloseExpiredParties` (每分鐘檢查並自動關閉過期招募團)
    *   `checkAndSendNotifications` (每分鐘檢查並發送開團前 10 分鐘推播提醒)
    *   `checkAndSendShareNotifications` (每分鐘檢查並發送指定得主通知推播)

---

## 4. 本地開發與建置

```bash
# 安裝依賴
npm install

# 啟動開發伺服器
npm run dev

# 專案建置打包
npm run build

# 執行單元測試
npm run test
```

---

## 5. FCM (雲端推播通知) 配置說明

本專案使用 Firebase Cloud Messaging (FCM) 實現練功團開團提醒以及好物得標通知，整合了網頁端 Service Worker 與 Google Apps Script 背景推播：

### A. Firebase 控制台設定 (FCM Setup)
1.  **開啟 Cloud Messaging**：前往 Firebase 控制台 ➔ 專案設定 ➔ 「**雲端通訊**」標籤頁。
2.  **生成 Web 憑證 (VAPID Key)**：
    *   在「網頁配置」區塊中，點擊「**產生金鑰組**」。
    *   將產生的 VAPID 公開金鑰 (VAPID Key) 複製，填入前端專案 `.env.local` 中的 `VITE_FIREBASE_VAPID_KEY`。
3.  **生成服務帳戶金鑰**：
    *   前往專案設定 ➔ 「**服務帳戶**」標籤頁。
    *   點擊「**產生新的私密金鑰**」，下載 JSON 金鑰檔案。
    *   此 JSON 的內容即為 GAS 中需要填入的 `SERVICE_ACCOUNT_KEY` 屬性值。

### B. 前端 Web 瀏覽器接收端設定
1.  **Service Worker 檔案**：
    *   在專案的 `public/` 目錄下建有 [firebase-messaging-sw.js](file:///c:/Project/Ran2-Toolkit/public/firebase-messaging-sw.js)。
    *   此檔案在瀏覽器背景運行，當網頁關閉時亦可接收推播，點擊通知將自動引導、聚焦至對應的隊伍 `/parties/:id`。
    *   *注意：若 Firebase 專案配置變更，需同步更新 `firebase-messaging-sw.js` 內的 `firebase.initializeApp({...})` 參數。*
2.  **通知授權與 Token 收集**：
    *   系統會在使用者點擊「好物申請」或「訂閱開團通知」時，調用瀏覽器權限詢問。
    *   取得使用者的 FCM Registration Token 後，會將其儲存於 Firestore 的對應集合（如 `party_subscriptions` 或 `applications`）。

### C. 後端推播觸發 (GAS & FCM v1 API)
1.  **Token 簽發與驗證**：
    *   Google Apps Script 藉由載入 `SERVICE_ACCOUNT_KEY`，在執行時利用 Utilities 簽發 JWT Token，並向 Google OAuth2 服務交換專屬 Access Token。
2.  **FCM v1 REST API 呼叫**：
    *   GAS 呼叫 `https://fcm.googleapis.com/v1/projects/{projectId}/messages:send`，並以 `Bearer AccessToken` 作為 Header 進行安全驗證。
    *   推播承載（Payload）包含自訂的通知標題、內文，以及額外的 Data 屬性（如 `partyId`、`itemId`），用以驅動前端點擊通知後的頁面導航行為。
