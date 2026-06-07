/**
 * Ran2-Toolkit-Function (Web App 接收端程式碼)
 * 
 * 部署說明：
 * 1. 覆蓋貼入您的「Ran2-Toolkit-Function」(原 Ran2-Toolkit-Image-Uploader) 專案中。
 * 2. 點擊右上角「部署」➔「管理部署作業」➔「編輯」➔ 選擇「新版本」➔ 重新部署。
 * 3. 確保專案屬性 (Script Properties) 中已配置：
 *    - `SERVICE_ACCOUNT_KEY` ➔ 填入 GCP 服務帳戶 JSON 金鑰。
 *    - `UPLOAD_FOLDER_ID` ➔ 填入公開 Google Drive 資料夾 ID。
 */

var PROJECT_ID = "ran2-toolkit"; // 您的 Firebase 專案 ID

// ==========================================
// 1. Google Web App 入口點 (doPost)
// ==========================================
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    
    // 支援好物刪除推播通知
    if (data.action === "sendDeleteNotifications") {
      var tokens = data.tokens;
      var itemName = data.itemName;
      var successCount = 0;
      if (tokens && tokens.length > 0) {
        var accessToken = getGoogleAccessToken();
        tokens.forEach(function(token) {
          var pushTitle = "⚠️ 分享好物已被移除";
          var pushBody = "您申請的分享好物「" + itemName + "」已被分享者刪除，此申請已自動取消。";
          var fcmStatus = sendFcmNotification(accessToken, token, pushTitle, pushBody);
          if (fcmStatus === 200) {
            successCount++;
          }
        });
      }
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: "已向 " + successCount + " 位申請人發送刪除通知"
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    var base64Data = data.image; // "data:image/webp;base64,..."
    var fileName = data.name || ("share_" + Date.now() + ".webp");
    
    // 支援純刪除回收空間
    if ((!base64Data || base64Data.trim() === "") && data.oldFileId && data.oldFileId.trim() !== "" && data.oldFileId !== "no-image.png") {
      try {
        var oldFile = DriveApp.getFileById(data.oldFileId);
        oldFile.setTrashed(true);
        Logger.log("已將舊圖片移入垃圾桶，ID: " + data.oldFileId);
      } catch (err) {
        Logger.log("刪除舊圖片失敗（可能已不存在）: " + err.toString());
      }
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: "圖片已回收移入垃圾桶"
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // 讀取屬性
    var folderId = PropertiesService.getScriptProperties().getProperty("UPLOAD_FOLDER_ID");
    if (!folderId) {
      throw new Error("請先在 GAS 設定中配置 UPLOAD_FOLDER_ID 指令碼屬性！");
    }
    
    // 解析 Base64
    var contentType = "image/webp";
    var base64Encoded = "";
    if (base64Data.indexOf(",") > -1) {
      var parts = base64Data.split(",");
      contentType = parts[0].split(":")[1].split(";")[0];
      base64Encoded = parts[1];
    } else {
      base64Encoded = base64Data;
    }
    
    // 限制後端寫入大小 (防洗版：限制 120 KB)
    var decoded = Utilities.base64Decode(base64Encoded);
    if (decoded.length > 125000) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: "檔案太大！請在上傳前進行壓縮。"
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    var blob = Utilities.newBlob(decoded, contentType, fileName);
    var folder = DriveApp.getFolderById(folderId);
    var file = folder.createFile(blob);
    
    // 設定檔案共用屬性為「 know the link anyone can view 」
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    var fileId = file.getId();
    
    // 回收舊圖片
    if (data.oldFileId && data.oldFileId.trim() !== "" && data.oldFileId !== "no-image.png") {
      try {
        var oldFile = DriveApp.getFileById(data.oldFileId);
        oldFile.setTrashed(true);
        Logger.log("已將舊圖片移入垃圾桶，ID: " + data.oldFileId);
      } catch (err) {
        Logger.log("刪除舊圖片失敗（可能已不存在）: " + err.toString());
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      fileId: fileId,
      url: "https://lh3.googleusercontent.com/d/" + fileId
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ==========================================
// 2. 輔助功能 (OAuth Token & FCM 發送)
// ==========================================
function sendFcmNotification(accessToken, token, title, body, data) {
  var url = "https://fcm.googleapis.com/v1/projects/" + PROJECT_ID + "/messages:send";
  var payload = {
    message: {
      token: token,
      notification: {
        title: title,
        body: body
      }
    }
  };
  if (data) {
    payload.message.data = data;
  }
  
  var options = {
    method: "POST",
    contentType: "application/json",
    headers: {
      Authorization: "Bearer " + accessToken
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  
  var response = UrlFetchApp.fetch(url, options);
  return response.getResponseCode();
}

function getGoogleAccessToken() {
  var properties = PropertiesService.getScriptProperties();
  var keyString = properties.getProperty("SERVICE_ACCOUNT_KEY");
  
  if (!keyString) {
    throw new Error("找不到 SERVICE_ACCOUNT_KEY 指令碼屬性！請在專案設定中加入該屬性。");
  }
  
  var serviceAccount = JSON.parse(keyString);
  var privateKey = serviceAccount.private_key;
  var clientEmail = serviceAccount.client_email;
  
  var header = JSON.stringify({
    "alg": "RS256",
    "typ": "JWT"
  });
  
  var now = Math.floor(Date.now() / 1000);
  var claimSet = JSON.stringify({
    "iss": clientEmail,
    "scope": "https://www.googleapis.com/auth/firebase.messaging",
    "aud": "https://oauth2.googleapis.com/token",
    "exp": now + 3600,
    "iat": now
  });
  
  var toSign = Utilities.base64EncodeWebSafe(header) + "." + Utilities.base64EncodeWebSafe(claimSet);
  var signatureBytes = Utilities.computeRsaSha256Signature(toSign, privateKey);
  var jwt = toSign + "." + Utilities.base64EncodeWebSafe(Utilities.newBlob(signatureBytes).getBytes());
  
  var options = {
    method: "POST",
    contentType: "application/x-www-form-urlencoded",
    payload: {
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt
    },
    muteHttpExceptions: true
  };
  
  var response = UrlFetchApp.fetch("https://oauth2.googleapis.com/token", options);
  if (response.getResponseCode() !== 200) {
    throw new Error("取得 Access Token 失敗: " + response.getContentText());
  }
  var result = JSON.parse(response.getContentText());
  return result.access_token;
}
