/**
 * Ran2-Toolkit-Analytics (網站拜訪統計 GAS 程式碼)
 *
 * 試算表欄位結構 (Sheet1)：
 * - A 欄 (A1: 日期)       ：記錄每日日期 (YYYY-MM-DD)
 * - B 欄 (B1: 當日拜訪次數)：記錄該日拜訪人次累加
 * - C 欄 (C1: 累計總次數)  ：記錄截至該日為止的全站拜訪次數累進加總 (Running Total)
 */

/**
 * 處理前端 POST 請求 (寫入/累加拜訪紀錄)
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
      var dateFound = false;
      var targetRow = 0;

      // 1. 取得目前的全站累計總次數基數 (優先從最後一列 C 欄 O(1) 讀取，若 C 欄尚未初始化則回退加總 B 欄)
      var previousTotal = getLatestTotalCount(sheet, lastRow);

      // 2. 檢查今天是否已有紀錄 (由下往上找最快，因為今天一定在最底下幾列)
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
        // 一次批次寫入 B 欄與 C 欄，減少 Spreadsheet I/O 次數
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

/**
 * 處理前端 GET 請求 (O(1) 讀取最新累進總次數)
 */
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

/**
 * 取得目前最新累進總數：
 * 優先直接讀取最後一列 C 欄 (O(1))；若舊資料 C 欄為空，自動加總 B 欄並回填
 */
function getLatestTotalCount(sheet, lastRow) {
  if (lastRow <= 0) return 0;

  var lastCellVal = sheet.getRange(lastRow, 3).getValue();
  var parsedLastTotal = Number(lastCellVal);
  if (lastCellVal !== "" && !isNaN(parsedLastTotal) && parsedLastTotal > 0) {
    return parsedLastTotal;
  }

  // Fallback：若 C 欄尚未填值，掃描 B 欄加總
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
 * 使用方式：在 GAS 編輯器上方下拉選單選擇 `backfillCumulativeTotal` 點擊「執行」即可
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
    // 判斷是否為標題列 (例如第一列 B1 為文字「拜訪次數」)
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
