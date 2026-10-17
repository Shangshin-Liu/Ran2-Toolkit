# Ran2-Toolkit (亂2萬事通)

本專案是一個基於 **Vue 3 + Vite + Firebase** 開發的《亂2 Online》遊戲社群與攻略工具箱，整合了**官方任務指南**、**職業技能配點模擬器（含奧義模式与雲端技能庫）**、**練功組隊招募平台（搭配 FCM 推播提醒）**、**全站布告欄公告系統**以及**動態系統維護攔截機制**。

為了實現後端安全識別碼生成、全站推播廣播、背景定時巡檢與網站流量統計，專案搭配了 **Google Apps Script (GAS)** 作為無伺服器 (Serverless) 後端。本文件完整記錄專案目前的環境變數、Firestore 集合架構與 GAS 部署設定。

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

# Google Apps Script Web App API 網址 (用於計算唯一識別碼與全站新團推播廣播)
VITE_GAS_FUNCTION_URL=https://script.google.com/macros/s/xxxx/exec

# Google Apps Script 網頁拜訪統計次數 (GAS + Google Sheet 策略 A) API 網址
VITE_GAS_ANALYTICS_URL=https://script.google.com/macros/s/xxxx/exec

# Discord Webhook 網址 (回報與聯絡通道)
VITE_DISCORD_CONTACT_WEBHOOK_URL=https://discord.com/api/webhooks/xxxx/xxxx # 聯絡我們通道
VITE_DISCORD_TASK_WEBHOOK_URL=https://discord.com/api/webhooks/xxxx/xxxx    # 任務指南建議與報錯通道
```

---

## 2. Firebase 配置

### A. Firestore 集合 Schema 設計 (Collections)

#### 1. `parties` (練功團組團招募)
*   **用途**：記錄玩家發起的練功團招募資訊。
*   **文檔 ID**：Firebase 自動生成（Auto-generated ID）。

| 欄位名稱 | 資料類型 | 說明 / 可選值 |
| :--- | :--- | :--- |
| `title` | String | 練功團標題（例如：`黃金洞來打怪`） |
| `leaderId` | String | 團長角色名稱 |
| `server` | String | 伺服器名稱（`新東京`、`新大阪`） |
| `location` | String | 練功地圖/地點（例如：`商洞`、`其他`） |
| `customLocation` | String | 自訂練功地點（若 `location` 為 `其他` 時填寫） |
| `startTime` | Number | 出發時間（Unix 時間戳，毫秒） |
| `endTime` | Number | 結束時間（Unix 時間戳，毫秒） |
| `requirements` | Array (String) | 招募要求清單（例如：`['徵格鬥敏捷', '需滿 120 等']`） |
| `creatorHash` | String | 發起人識別碼雜湊值（SHA-256），用於身分校驗 |
| `memberCharIds` | Array (String) | 已加入的成員角色 ID 清單（上限 8 人，作為前端計數單一真相來源） |
| `status` | String | 招募狀態（`招募中`、`進行中`、`已結束`、`已關閉`） |
| `closeReason` | String | 關團原因（手動取消或系統定時判定結束原因） |
| `expectedCount` | Number | 已加入成員人數計數（上限 8 人） |
| `createdAt` | Number | 創建時間（Unix 時間戳，毫秒） |
| `notified10min` | Boolean | 是否已發送過開團前 10 分鐘推播提醒 |

#### 2. `party_subscriptions` (練功團訂閱通知)
*   **用途**：記錄玩家（含團長與隊員）訂閱特定隊伍開團提醒的推播 Token。
*   **文檔 ID**：`[FCM Token]_[練功團ID]`。

| 欄位名稱 | 資料類型 | 說明 / 可選值 |
| :--- | :--- | :--- |
| `token` | String | 訂閱者的 FCM Registration Token |
| `partyId` | String | 訂閱的 `parties` 招募團文檔 ID |
| `createdAt` | Number | 訂閱時間（Unix 時間戳，毫秒） |

#### 3. `global_tokens` (全站通知訂閱)
*   **用途**：記錄玩家啟用「全站新團招募提醒」的推播 Token。
*   **文檔 ID**：`[FCM Token]`。

| 欄位名稱 | 資料類型 | 說明 / 可選值 |
| :--- | :--- | :--- |
| `token` | String | 訂閱者的 FCM Registration Token |
| `createdAt` | Number | 訂閱時間（Unix 時間戳，毫秒） |

#### 4. `users` (註冊角色帳號資料)
*   **用途**：記錄註冊玩家的角色帳號、伺服器、所屬學院/部門，以及安全問題驗證雜湊值。
*   **文檔 ID**：由 GAS 後端根據 `server-dept-charId` 加鹽計算出的 **6 碼英數混合唯一識別碼**（56 進位，排除易混淆字元 `I, l, O, o`；前端存入時統一轉大寫，以防同一伺服器、部門與角色重複註冊）。

| 欄位名稱 | 資料類型 | 說明 / 可選值 |
| :--- | :--- | :--- |
| `server` | String | 所屬伺服器名稱（`新東京`、`新大阪`） |
| `school` | String | 所屬學院（`玄嚴`、`聖門`、`鳳凰`） |
| `dept` | String | 所屬部門（`格鬥部`、`氣功部`、`劍道部`、`弓箭部`） |
| `charId` | String | 遊戲內角色名稱 ID |
| `questionId` | Number | 安全問題 ID (`1 ~ 15`，定義於 `src/composables/useAuth.js`) |
| `answerHash` | String | 安全問題答案的 SHA-256 雜湊值（用於找回識別碼驗證） |
| `createdAt` | Number | 註冊時間（Unix 時間戳，毫秒） |

#### 5. `tasks` (任務指南資料庫)
*   **用途**：儲存 719 筆官方任務步驟、起點、限制與獎勵資訊（本地備份檔位於 `backups/tasks.json`，可透過 `scripts/download_tasks.js` 導出或 `scripts/upload_tasks_to_firestore.js` 還原）。
*   **文檔 ID**：任務唯一 ID（例如：`task_0001`，或【不要有名字】清單任務 `qc_10726_001` 等）。

| 欄位名稱 | 資料類型 | 說明 / 可選值 |
| :--- | :--- | :--- |
| `id` | String | 任務唯一識別碼 |
| `name` | String | 任務標題名稱 |
| `customizedName` | String | 自訂/修正名稱（例如無名字任務的前端客製標題，可為空） |
| `school` | String | 所屬學院限制（`玄嚴`、`聖門`、`鳳凰`、`共通`） |
| `department` | String | 所屬部門限制（`格鬥部`、`氣功部`、`劍道部`、`弓箭部`、`共通`） |
| `isQc10726` | Boolean | 是否屬於【不要有名字】分類任務 |
| `qc10726` | Object | 【不要有名字】額外攻略屬性（內含 `category` 大分類、`npc` 接取對象） |
| `requirements` | Array (String) | 接取任務之前置需求與限制條件清單 |
| `startLocation` | Object | 起點資訊，內含 `desc` (NPC 與地圖描述) 與 `image` (可選，起點地圖截圖路徑) |
| `steps` | Array (Object) | 任務流程步驟，每個元素含 `desc` (步驟說明) 與 `image` (可選，步驟地圖截圖路徑) |
| `rewards` | Object | 任務獎勵，包含 `exp` (經驗值), `statsPoints` (能力點), `skillPoints` (技能點), 及 `customRewards` (Array，自訂道具/禮盒) |
| `tips` | Array (String) | 前端提示與小技巧 |
| `notes` | Array (String) | 前端特別注意事項 / 備註 |

#### 6. `completed_tasks` (已完成任務同步資料)
*   **用途**：記錄登入玩家已勾選完成的任務清單，支援跨裝置雲端備份與還原。
*   **文檔 ID**：使用者的唯一識別碼（`userId` / `code`）。

| 欄位名稱 | 資料類型 | 說明 / 可選值 |
| :--- | :--- | :--- |
| `userId` | String | 使用者唯一識別碼 |
| `taskIds` | Array (String) | 已完成任務 ID 陣列 |
| `updatedAt` | Number | 備份更新時間（Unix 時間戳，毫秒） |

#### 7. `skills` (職業技能樹資料庫)
*   **用途**：儲存全遊戲 8 大職業（一般四部：`劍道部`、`格鬥部`、`弓箭部`、`氣功部`；奧義四部：`神劍部`、`神鬥部`、`神弓部`、`神氣部`）共 32 條技能樹、600 個技能的完整數值（本地備份位於 `backups/ran2_all_skills.json`，可透過 `scripts/upload_skills.js` 批次上傳）。
*   **文檔 ID**：`[職業名稱]_[技能樹名稱]`（例如：`弓箭部_共通`、`格鬥部_進階共通`）。

| 欄位名稱 | 資料類型 | 說明 / 可選值 |
| :--- | :--- | :--- |
| `id` | String | 技能樹識別碼（例如：`shinbow_agi`） |
| `job` | String | 職業名稱（例如：`弓箭部`、`神弓部`） |
| `skill_tree` | String | 技能樹名稱（例如：`敏弓系`、`奧義敏弓系`、`共通`） |
| `require_stat_type` | String | 該樹屬性限制類型（`敏捷`、`力量`、`精神`、`共通`） |
| `skills` | Array (Object) | 技能群組列表，每個元素為一個 `SkillGroup` 物件 |

##### `skills` 陣列中的 `SkillGroup` 物件欄位：
*   `skill_group_id` / `id` (String): 技能唯一 ID（如 `shinbow_agi_001`）
*   `name` (String): 技能名稱
*   `degree` (Number): 技能級別（階級 `1 ~ 19`）
*   `initial_level` (Number): 初始學習角色等級門檻
*   `type` (String): `主動` 或 `被動`
*   `equipment_required` (String / null): 裝備需求限制
*   `description` (String): 技能描述說明
*   `element_property` (String): 元素屬性（`冰`、`火`、`毒`、`電`、`無`）
*   `effect_group` (String / null): 增益效果衝突群組識別，用於檢測同群組技能覆蓋衝突
*   `icon` (String): 技能圖示檔名
*   `animation` (String): 技能動畫檔名
*   `levels` (Array of Object): 技能各等級（Lv.1 ~ Lv.9）數值，元素為 `SkillInstance` 物件

##### `levels` 陣列中的 `SkillInstance` 物件欄位：
*   `instance_id` / `id` (String): 等級實例 ID（如 `shinbow_agi_001_lv1`）
*   `skill_level` (Number): 技能等級 (`1 ~ 9`)
*   `learn_condition` (Object): 學習條件（內含 `character_level`, `point_required`, `stat_required` 以及 `prerequisite` 前置技能物件）
*   `base_stats` (Object): 動態基本屬性（如 `hp_change`, `hp_type` 解耦血量/傷害類型, `target_count`, `range`, `delay_time`, `cast_time`, `duration` 等）
*   `special_effects` (Array of Object): 附加特效（內含 `effect_type`，如 `昏厥`, `中毒` 等）
*   `cost` (Object / null): 施展消耗（內含 `mp`, `sp`，被動技能無）

#### 8. `skill_builds` (使用者雲端技能庫)
*   **用途**：記錄登入玩家儲存的技能配點方案（上限 30 組），支援每 5 秒自動背景同步與離頁緊急同步。
*   **文檔 ID**：使用者的唯一識別碼（`userId` / `code`）。

| 欄位名稱 | 資料類型 | 說明 / 可選值 |
| :--- | :--- | :--- |
| `builds` | Array (Object) | 玩家儲存的配點方案列表 |
| `lastUpdated` | Number | 最後同步更新時間（Unix 時間戳，毫秒） |

##### `builds` 陣列中的配點方案物件欄位：
*   `id` (String): 方案唯一識別 ID（8 碼 16 進位隨機字串）
*   `name` (String): 配點方案名稱（例如：`敏弓奧義團練點`）
*   `job` (String): 職業名稱（例如：`神弓部`）
*   `isUltimate` (Boolean): 是否為奧義模式
*   `allocations` (Object): 技能配點分布（key 為 `skill_group_id`，value 為配點等級 `1 ~ 9`，僅儲存 `> 0` 的項目）
*   `ultimateSelections` (Array of String): 奧義模式下所選擇的前三條奧義技能樹 ID 列表
*   `createdAt` | Number | 建立時間（Unix 時間戳，毫秒）

#### 9. `shared_builds` (技能模擬器分享配點)
*   **用途**：記錄玩家產生的技能模擬器雲端短網址分享配點資料（透由 `/simulator?share={shareId}` 讀取預覽）。
*   **文檔 ID**：隨機生成的 8 碼 36 進位英數識別碼（`shareId`）。

| 欄位名稱 | 資料類型 | 說明 / 可選值 |
| :--- | :--- | :--- |
| `job` | String | 職業名稱 |
| `isUltimate` | Boolean | 是否為奧義模式 |
| `allocations` | Object | 技能配點分布（key 為 `skill_group_id`，value 為配點等級 `1 ~ 9`） |
| `ultimateSelections` | Array (String) | 奧義模式下所選擇的奧義技能樹 ID 列表 |
| `createdAt` | Number | 分享建立時間（Unix 時間戳，毫秒） |

#### 10. `notices` (全站布告欄與置頂公告系統)
*   **用途**：儲存網站布告欄的「公告消息」與「更新歷程」，支援首訪置頂彈窗通知與 Markdown 渲染（本地備份定義檔位於 `backups/notices.yaml`，可透過 `scripts/upload_new_notice.js` 單筆新增或 `scripts/sync_notices_to_firestore.js` 全量同步）。
*   **文檔 ID**：Firebase 自動生成或自訂公告 ID。

| 欄位名稱 | 資料類型 | 說明 / 可選值 |
| :--- | :--- | :--- |
| `type` | String | 公告分類（`公告消息` 或 `更新歷程`） |
| `top` | Boolean | 是否置頂（為 `true` 時將觸發首訪置頂公告彈窗，並在列表置頂排序） |
| `title` | String | 公告標題 |
| `content` | String | 公告內文（支援 Markdown 格式） |
| `createdAt` | String | 發布時間（ISO 8601 字串，前端格式化為 `YYMMDDHH` 顯示） |
| `updatedAt` | String | 更新時間（ISO 8601 字串，可選） |

#### 11. `metadata` (中介快取與系統維護設定)
*   **用途**：提供大資料集（任務、技能）的快取時戳比對，以及全站與各別路由的即時維護攔截開關。
*   **文檔 ID**：
    *   `tasks` / `skills`：記錄 `lastUpdated`（Number，毫秒時間戳），當雲端時間戳大於本地 `localStorage` 時才重新下載整個集合，實現秒開快取。
    *   `maintenance`：控制路由守衛 (`src/router/index.js`) 與維護狀態 (`src/composables/useMaintenance.js`)。本地開發模式 (`npm run dev`) 下會優先使用 `src/config/maintenance.js` 作為維護設定，方便本地測試而不受正式環境雲端狀態干擾。

##### `metadata/maintenance` 文檔結構：
*   `password` (String): 管理員強制解鎖密碼（支援 SHA-256 雜湊或明文，可由 `scripts/update_maintenance_sha256.js` 更新；於網站 Footer 連點 `📊` 圖示 **12 次**可喚出管理對話框，依當前狀態進行密碼驗證登入解鎖或登出恢復維護攔截）。
*   `home`, `tasks`, `simulator`, `parties`, `function1`, `function2` (Object): 各模組維護狀態設定，內含：
    *   `enabled` (Boolean): 是否開啟維護攔截（若 `home.enabled` 為 `true` 則全站攔截；目前 `function1` 與 `function2` 預設開啟，顯示「此功能虛位以待」）。
    *   `title` (String): 維護頁面顯示標題。
    *   `message` (String): 維護頁面說明文案。

---

### B. Firestore 規則與索引部署
本專案的 Firestore 安全規則與複合索引定義於根目錄設定檔中：
1.  **安全規則 (`firestore.rules`)**：定義各集合的讀寫權限（包含 `parties` 的欄位級別隔離與防刪除保護）。
    *   部署指令：`firebase deploy --only firestore:rules`
2.  **複合索引 (`firestore.indexes.json`)**：為練功招募團多條件篩選排序建立複合索引。
    *   部署指令：`firebase deploy --only firestore:indexes`

---

## 3. Google Apps Script (GAS) 備份與部署

專案中所有外部呼叫的自動化腳本與統計說明皆定義於 `gas/` 目錄中：
1.  [GAS_Toolkit_Function.js](file:///c:/Project/Ran2-Toolkit/gas/GAS_Toolkit_Function.js)：網頁應用程式 (Web App) 接收端，負責**安全生成玩家 6 碼唯一識別碼 (`generateUserCode`)** 與**新練功團全站推播廣播 (`broadcastNewParty`)**。
2.  [GAS_Toolkit_Scheduler.js](file:///c:/Project/Ran2-Toolkit/gas/GAS_Toolkit_Scheduler.js)：背景定時排程器，負責**自動關閉過期練功團 (`checkAndCloseExpiredParties`)** 與**定時掃描發送開團前 10 分鐘 FCM 提醒並清理失效 Token (`checkAndSendNotifications`)**。
3.  [GAS_Toolkit_Analytics.js](file:///c:/Project/Ran2-Toolkit/gas/GAS_Toolkit_Analytics.js) / [gas_analytics_guide.md](file:///c:/Project/Ran2-Toolkit/gas/gas_analytics_guide.md)：網站流量統計（當日拜訪次數 + C 欄累進加總）之 Google Apps Script 程式碼與 Google Sheet 部署指南。

### 部署步驟：

#### 步驟 1：建立 Apps Script 專案
1.  前往 [Google Apps Script 儀表板](https://script.google.com)。
2.  建立兩個專案（建議分開）：
    *   專案 A：`Ran2-Toolkit-Function` (貼入 `gas/GAS_Toolkit_Function.js` 程式碼)
    *   專案 B：`Ran2-Toolkit-Scheduler` (貼入 `gas/GAS_Toolkit_Scheduler.js` 程式碼)

#### 步驟 2：設定專案屬性 (Script Properties)
在兩個 GAS 專案的「專案設定（齒輪圖示）」底下的「指令碼屬性」中，新增以下設定：
*   **`SERVICE_ACCOUNT_KEY`**：填入 Google Cloud Platform (GCP) 服務帳戶的 **JSON 金鑰內容**。
    *   *註：該服務帳戶必須擁有存取 Firestore 讀寫權限 (例如 `Cloud Datastore User` / `Owner`) 及發送 FCM 通知權限 (例如 `Firebase Messaging Admin`)。*

#### 步驟 3：部署 Function (Web App API)
1.  在 `Ran2-Toolkit-Function` 專案中，點擊右上角「**部署**」➔「**新增部署**」。
2.  類型選擇「**網頁應用程式**」。
3.  設定值：
    *   執行身分：`Me` (您的 Google 帳戶)
    *   誰有存取權：`Anyone` (任何人)
4.  點擊部署，並複製產生的 **Web App URL**。
5.  將此網址填入前端專案 `.env.local` 檔案中的 `VITE_GAS_FUNCTION_URL` 欄位。

#### 步驟 4：設定 Scheduler 定時器觸發 (Triggers)
1.  進入 `Ran2-Toolkit-Scheduler` 專案。
2.  點擊左側導覽列的「**觸發器**（時鐘圖示）」➔ 右下角「**新增觸發器**」。
3.  分別為以下 **2 個函數**建立定時任務（觸發來源設定為「**時間驅動**」、類型為「**分鐘定時器**」、間隔為「**每分鐘**」）：
    *   `checkAndCloseExpiredParties` (每分鐘檢查並自動關閉已達結束時間的招募團)
    *   `checkAndSendNotifications` (每分鐘檢查並發送開團前 10 分鐘推播提醒，同時自動清理失效的孤兒 FCM Token)

### C. Discord Webhook 設定
本專案之「聯絡我們」與「任務指南建議與報錯」功能，皆透過 Discord Webhook 即時將玩家回饋推播至開發者的 Discord 伺服器頻道：
1.  **建立 Webhook**：前往 Discord 伺服器設定 ➔ 整合 ➔ Webhooks ➔ 點擊「建立 Webhook」。
2.  **複製網址**：選擇目標頻道後，點擊「複製 Webhook 網址」。
3.  **環境設定**：將網址填入 `.env.local` 內對應的 `VITE_DISCORD_CONTACT_WEBHOOK_URL` 與 `VITE_DISCORD_TASK_WEBHOOK_URL`。

---

## 4. 本地開發與建置

```bash
# 安裝依賴
npm install

# 啟動開發伺服器
npm run dev

# 專案建置打包
npm run build

# 執行單元測試 (Vitest)
npm run test
```

---

## 5. FCM (雲端推播通知) 配置說明

本專案使用 Firebase Cloud Messaging (FCM) 實現練功團全站新團廣播與開團前 10 分鐘提醒，整合了網頁端 Service Worker、前景電競浮條與 Google Apps Script 背景推播：

### A. Firebase 控制台設定 (FCM Setup)
1.  **開啟 Cloud Messaging**：前往 Firebase 控制台 ➔ 專案設定 ➔ 「**雲端通訊**」標籤頁。
2.  **生成 Web 憑證 (VAPID Key)**：
    *   在「網頁配置」區塊中，點擊「**產生金鑰組**」。
    *   將產生的 VAPID 公開金鑰複製，填入 `.env.local` 中的 `VITE_FIREBASE_VAPID_KEY`。
3.  **生成服務帳戶金鑰**：
    *   前往專案設定 ➔ 「**服務帳戶**」標籤頁。
    *   點擊「**產生新的私密金鑰**」，下載 JSON 金鑰檔案，並將內容設為 GAS 的 `SERVICE_ACCOUNT_KEY` 屬性值。

### B. 前端 Web 瀏覽器接收端設定
1.  **背景推播 Service Worker**：
    *   位於 [public/firebase-messaging-sw.js](file:///c:/Project/Ran2-Toolkit/public/firebase-messaging-sw.js)。
    *   當網頁處於背景或關閉時接收推播，點擊通知將自動引導並聚焦至對應的隊伍詳情頁 `/parties/:id`。
2.  **前景全域推播浮條**：
    *   於 [src/App.vue](file:///c:/Project/Ran2-Toolkit/src/App.vue) 掛載 `onMessage` 監聽，無論玩家正在瀏覽任務指南或配點模擬器，皆會在右上角彈出電競風通知浮條並觸發桌面原生通知。
3.  **通知授權與 Token 收集**：
    *   當玩家建立練功團、參加跟團或開啟「全站新團通知」時，透過 [src/composables/useParty.js](file:///c:/Project/Ran2-Toolkit/src/composables/useParty.js) 的 `getFcmToken` 請求通知權限並快取 Token，寫入 `party_subscriptions` 或 `global_tokens` 集合。
