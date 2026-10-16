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
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    // 取得腳本鎖 (最多等待 10 秒)，防止多人同時進站產生併發覆寫
    lock.waitLock(10000);

    var postData = JSON.parse(e.postData.contents);
    if (postData.action === "trackVisit") {
      var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
      var now = new Date();
      var timezone = Session.getScriptTimeZone();
      var dateString = Utilities.formatDate(now, timezone, "yyyy-MM-dd");

      var lastRow = sheet.getLastRow();
      var dateFound = false;
      var targetRow = 0;

      // 1. 取得目前的全站累計總次數基數 (優先從最後一列 C 欄 O(1) 讀取，若 C 欄尚未初始化則回退加總 B 欄)
      var previousTotal = getLatestTotalCount(sheet, lastRow);

      // 2. 檢查今天是否已有紀錄 (由下往上找最快)
      if (lastRow > 0) {
        var dates = sheet.getRange(1, 1, lastRow, 1).getValues();
        for (var i = dates.length - 1; i >= 0; i--) {
          var checkDate = "";
          if (dates[i][0] instanceof Date) {
            checkDate = Utilities.formatDate(dates[i][0], timezone, "yyyy-MM-dd");
          } else {
            checkDate = String(dates[i][0]).trim();
          }

          if (checkDate === dateString) {
            dateFound = true;
            targetRow = i + 1; // 1-based index
            break;
          }
        }
      }

      var newDailyCount = 1;
      var newTotalCount = previousTotal + 1;

      // 3. 更新當日次數 (B 欄) 與累進加總 (C 欄)
      if (dateFound) {
        var currentDaily = Number(sheet.getRange(targetRow, 2).getValue()) || 0;
        newDailyCount = currentDaily + 1;
        // 一次批次寫入 B 欄與 C 欄
        sheet.getRange(targetRow, 2, 1, 2).setValues([[newDailyCount, newTotalCount]]);
      } else {
        // 新的一天：新增一列 [日期, 當日次數(1), 累進加總]
        sheet.appendRow([dateString, 1, newTotalCount]);
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

function doGet(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var lastRow = sheet.getLastRow();
    var totalCount = getLatestTotalCount(sheet, lastRow);

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

function getLatestTotalCount(sheet, lastRow) {
  if (lastRow <= 0) return 0;

  var lastCellVal = sheet.getRange(lastRow, 3).getValue();
  var parsedLastTotal = Number(lastCellVal);
  if (lastCellVal !== "" && !isNaN(parsedLastTotal) && parsedLastTotal > 0) {
    return parsedLastTotal;
  }

  // Fallback：若 C 欄尚未填值，自動掃描 B 欄加總
  var counts = sheet.getRange(1, 2, lastRow, 1).getValues();
  var sum = 0;
  for (var i = 0; i < counts.length; i++) {
    var val = Number(counts[i][0]);
    if (!isNaN(val)) {
      sum += val;
    }
  }
  return sum;
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
4. **（推薦）一鍵補齊歷史資料的 C 欄累進加總**：
   * 在 GAS 編輯器頂部工具列的函式下拉選單中，選擇 **`backfillCumulativeTotal`**，然後點擊 **「執行」**。
   * 執行完畢後，試算表內所有舊日期的 `C` 欄都會自動填上對應的累進總數！

---

## 📌 第三階段：重新部署為新版本 (關鍵步驟)

1. 點擊 Apps Script 編輯器右上角的 **「部署」** ➔ **「管理部署作業」**。
2. 點擊現有部署作業右上角的 **「編輯（鉛筆圖示）」**。
3. 在「版本」下拉選單中，選擇 **「建立新版本 (New version)」**。
4. 點擊 **「部署」**（如此可維持原來的 `VITE_GAS_ANALYTICS_URL` 網址不變）。
