/**
 * Ran2-Toolkit-Analytics (網站拜訪統計 GAS 程式碼)
 *
 * 試算表欄位結構 (Sheet1)：
 * - A 欄 (A1: 日期)       ：記錄每日日期 (YYYY-MM-DD)
 * - B 欄 (B1: 當日拜訪次數)：記錄該日拜訪人次累加
 * - C 欄 (C1: 累計總次數)  ：記錄截至該日為止的全站拜訪次數累進加總 (Running Total)
 */

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
