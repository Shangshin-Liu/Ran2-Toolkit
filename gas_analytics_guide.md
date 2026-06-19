# 網站拜訪統計次數 (GAS + Google Sheet 策略 A) 部署指南

本指南引導您如何設定 Google Sheet (試算表) 並部署 Google Apps Script (GAS)，以實現每日拜訪統計功能。

---

## 📌 第一階段：建立 Google 試算表 (Google Sheet)

1. 前往 [Google 雲端硬碟](https://drive.google.com/) 或 [Google 試算表](https://docs.google.com/spreadsheets/)。
2. 建立一個全新的試算表，並命名為 `Ran2-Toolkit-Analytics`。
3. 在第一張工作表 (Sheet1) 中，手動在最上方新增標題列（非必要，但有助於閱讀）：
   * `A1` 填入：`日期`
   * `B1` 填入：`拜訪次數`
4. **記錄該試算表的網址，保持開啟。**

---

## 📌 第二階段：建立與設定 GAS 專案

1. 在剛建立好的 Google 試算表頂部選單中，點擊 **「延伸功能」** ➔ **「Apps Script」**。
2. Apps Script 編輯器開啟後，將預設的 `myFunction` 清空。
3. 複製下方提供的 **GAS 統計程式碼**，貼入編輯器中：

```javascript
function doPost(e) {
  try {
    const postData = JSON.parse(e.postData.contents);
    if (postData.action === 'trackVisit') {
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
      
      // 1. 取得今天日期字串 (格式如 YYYY-MM-DD)
      const now = new Date();
      const timezone = Session.getScriptTimeZone();
      const dateString = Utilities.formatDate(now, timezone, "yyyy-MM-dd");
      
      // 2. 在第一欄尋找今天的日期
      const lastRow = sheet.getLastRow();
      let dateFound = false;
      let targetRow = 0;
      
      if (lastRow > 0) {
        const dates = sheet.getRange(1, 1, lastRow, 1).getValues();
        for (let i = 0; i < dates.length; i++) {
          // 清除時間干擾，轉成格式化後的字串進行比對
          let checkDate = "";
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
      
      // 3. 根據尋找結果進行更新
      if (dateFound) {
        const currentCountCell = sheet.getRange(targetRow, 2);
        const currentCount = Number(currentCountCell.getValue()) || 0;
        currentCountCell.setValue(currentCount + 1);
      } else {
        // 第一天或是新的一天，建立新行
        sheet.appendRow([dateString, 1]);
      }
      
      return ContentService.createTextOutput(JSON.stringify({ success: true }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const lastRow = sheet.getLastRow();
    let totalCount = 0;
    
    if (lastRow > 0) {
      const counts = sheet.getRange(1, 2, lastRow, 1).getValues();
      for (let i = 0; i < counts.length; i++) {
        const val = Number(counts[i][0]);
        if (!isNaN(val)) {
          totalCount += val;
        }
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({ success: true, total: totalCount }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

4. 按下 **Ctrl + S** 儲存專案。

---

## 📌 第三階段：部署為網頁應用程式 (Web App)

1. 點擊 Apps Script 編輯器右上角的 **「部署」** 按鈕 ➔ 選擇 **「新增部署作業」**。
2. 點擊「選取類型」旁的 **齒輪圖示** ➔ 選擇 **「網頁應用程式 (Web App)」**。
3. 配置部署設定：
   * **說明**：`網站流量統計 API`
   * **將網頁應用程式執行為**：選擇 **「我」 (您的 Google 帳戶)**
   * **誰有權限存取**：選擇 **「任何人」 (Anyone)** *(關鍵設定，否則前台網頁會因權限不足無法傳送)*
4. 點擊 **「部署」**。
5. 若畫面出現授權提示，請點擊 **「授予存取權」** ➔ 選擇您的 Google 帳戶 ➔ 點擊 **「進階」** ➔ 點擊 **「前往您的專案 (不安全)」** ➔ 點擊 **「允許」** 以授權。
6. 部署完成後，複製畫面上顯示的 **「網頁應用程式網址」** (URL 格式約為 `https://script.google.com/macros/s/xxxx/exec`)。

---

## 📌 第四階段：前台專案環境變數設定

1. 在您的前台專案根目錄下，開啟或編輯 `.env.local` 檔案。
2. 新增以下環境變數，並貼上您剛才複製的網頁應用程式網址：
   ```env
   VITE_GAS_ANALYTICS_URL=https://script.google.com/macros/s/xxxx/exec
   ```
3. 重新啟動您的本地開發伺服器（`npm run dev`）或重新進行打包編譯。

*現在只要有裝置在間隔 3 小時以上再次拜訪網站，您的 Google 試算表便會自動累加今日的拜訪次數了！*
