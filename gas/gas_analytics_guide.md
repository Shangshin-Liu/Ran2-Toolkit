# 網站拜訪統計次數 (GAS + Google Sheet 累進加總版) 部署與升級指南

本指南引導您如何設定或升級 Google Sheet (試算表) 與 Google Apps Script (GAS)，以實現**每日拜訪紀錄 + 累進加總 (Running Total)** 統計功能（完整程式碼亦備份於 [gas/GAS_Toolkit_Analytics.js](file:///c:/Project/Ran2-Toolkit/gas/GAS_Toolkit_Analytics.js)）。

---

## 📌 第一階段：設定 / 調整 Google 試算表 (Google Sheet)

1. 開啟您的 `Ran2-Toolkit-Analytics` 試算表。
2. 在第一張工作表 (`Sheet1`) 的第一列設定三個標題欄位：
   * `A1`：**`日期`**（格式如 `2026-10-17`）
   * `B1`：**`當日拜訪次數`**（原 `拜訪次數`，記錄單日累加人次）
   * `C1`：**`累計總次數`**（**新增欄位**：記錄截至該日為止的全站拜訪累進加總）

| 儲存格 | A 欄 (`日期`) | B 欄 (`當日拜訪次數`) | C 欄 (`累計總次數` - 新增) |
| :--- | :--- | :--- | :--- |
| **第 1 列 (標題)** | `日期` | `當日拜訪次數` | `累計總次數` |
| **第 2 列 (範例)** | `2026-10-15` | `120` | `120` |
| **第 3 列 (範例)** | `2026-10-16` | `85` | `205` |
| **第 4 列 (範例)** | `2026-10-17` | `40` | `245` |

---

## 📌 第二階段：更新 GAS 專案程式碼

1. 在 Google 試算表頂部選單中，點擊 **「延伸功能」** ➔ **「Apps Script」**。
2. 將編輯器內的程式碼替換為以下最新版本（或直接複製 [gas/GAS_Toolkit_Analytics.js](file:///c:/Project/Ran2-Toolkit/gas/GAS_Toolkit_Analytics.js)）：

```javascript
/**
 * 處理前端 POST 請求 (僅讀取最後一列 O(1) 比對日期並更新累進加總)
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    // 取得腳本鎖 (最多等待 10 秒)，防止多人同時進站產生併發覆寫 (Race Condition)
    lock.waitLock(10000);

    var postData = JSON.parse(e.postData.contents);
    if (postData.action === "trackVisit") {
      var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
      var now = new Date();
      var timezone = Session.getScriptTimeZone();
      var dateString = Utilities.formatDate(now, timezone, "yyyy-MM-dd");

      var lastRow = sheet.getLastRow();
      var newDailyCount = 1;
      var newTotalCount = 1;

      if (lastRow > 0) {
        // O(1) 一次只讀取最後一列的 A、B、C 三格 [日期, 當日次數, 累計總次數]，完全不撈全表
        var lastRowValues = sheet.getRange(lastRow, 1, 1, 3).getValues()[0];
        var rawLastDate = lastRowValues[0];
        var lastDaily = Number(lastRowValues[1]) || 0;
        var lastTotal = Number(lastRowValues[2]) || 0;

        var lastDateStr = "";
        if (rawLastDate instanceof Date) {
          lastDateStr = Utilities.formatDate(rawLastDate, timezone, "yyyy-MM-dd");
        } else {
          lastDateStr = String(rawLastDate).trim();
        }

        newTotalCount = lastTotal + 1;

        if (lastDateStr === dateString) {
          // 最後一列就是今天：直接將最後一列的當日次數與累計總數各 +1
          newDailyCount = lastDaily + 1;
          sheet.getRange(lastRow, 2, 1, 2).setValues([[newDailyCount, newTotalCount]]);
        } else {
          // 跨日（新的一天）：在最底部新增一列 [今天日期, 1, 最新累進總數]
          sheet.appendRow([dateString, 1, newTotalCount]);
        }
      } else {
        // 空白試算表第一筆
        sheet.appendRow([dateString, 1, 1]);
      }

      return ContentService.createTextOutput(
        JSON.stringify({
          success: true,
          daily: newDailyCount,
          total: newTotalCount
        })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(
      JSON.stringify({ success: false, error: "未知的 action 指令" })
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ success: false, error: err.toString() })
    ).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

/**
 * 處理前端 GET 請求 (純 O(1) 直接讀取最後一列 C 欄的累進總次數)
 */
function doGet(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var lastRow = sheet.getLastRow();
    var totalCount = lastRow > 0 ? (Number(sheet.getRange(lastRow, 3).getValue()) || 0) : 0;

    return ContentService.createTextOutput(
      JSON.stringify({
        success: true,
        total: totalCount
      })
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ success: false, error: err.toString() })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * 【一次性工具函數】將歷史資料的 C 欄（累進加總）自動補齊
 */
function backfillCumulativeTotal() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var lastRow = sheet.getLastRow();
  if (lastRow <= 0) return;

  var rows = sheet.getRange(1, 1, lastRow, 3).getValues();
  var runningTotal = 0;
  var outputC = [];

  for (var i = 0; i < rows.length; i++) {
    var dailyVal = Number(rows[i][1]);
    if (i === 0 && isNaN(dailyVal)) {
      outputC.push([rows[i][2] || "累計總次數"]);
    } else {
      if (!isNaN(dailyVal)) {
        runningTotal += dailyVal;
      }
      outputC.push([runningTotal]);
    }
  }

  sheet.getRange(1, 3, lastRow, 1).setValues(outputC);
  Logger.log("歷史資料 C 欄累進加總回填完成！目前總計：" + runningTotal);
}
```

3. 按下 **Ctrl + S** 儲存專案。
4. **【必做】一鍵補齊歷史資料的 C 欄累進加總**：
   * 在 GAS 編輯器頂部工具列的函式下拉選單中，選擇 **`backfillCumulativeTotal`**，然後點擊 **「執行」**。
   * 執行完畢後，試算表內所有舊日期的 `C` 欄都會自動填上對應的累進總數！

---

## 📌 第三階段：重新部署為新版本 (關鍵步驟)

1. 點擊 Apps Script 編輯器右上角的 **「部署」** ➔ **「管理部署作業」**。
2. 點擊現有部署作業右上角的 **「編輯（鉛筆圖示）」**。
3. 在「版本」下拉選單中，選擇 **「建立新版本 (New version)」**。
4. 點擊 **「部署」**（如此可維持原來的 `VITE_GAS_ANALYTICS_URL` 網址不變）。
