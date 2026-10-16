/**
 * Ran2-Toolkit-Function (Web App 接收端程式碼)
 * 
 * 部署說明：
 * 1. 覆蓋貼入您的「Ran2-Toolkit-Function」專案中。
 * 2. 點擊右上角「部署」➔「管理部署作業」➔「編輯」➔ 選擇「新版本」➔ 重新部署。
 * 3. 確保專案屬性 (Script Properties) 中已配置：
 *    - `SERVICE_ACCOUNT_KEY` ➔ 填入 GCP 服務帳戶 JSON 金鑰。
 */

var PROJECT_ID = "ran2-toolkit"; // 您的 Firebase 專案 ID

// ==========================================
// 1. Google Web App 入口點 (doPost)
// ==========================================
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    
    // 1. 支援統一身分識別碼生成 (在後端安全地計算，避免鹽值與邏輯外流)
    if (data.action === "generateUserCode") {
      var server = data.server;
      var dept = data.dept;
      var charId = data.charId;
      if (!server || !dept || !charId) {
        return ContentService.createTextOutput(JSON.stringify({
          success: false,
          error: "缺少伺服器、部門或角色 ID"
        })).setMimeType(ContentService.MimeType.JSON);
      }
      
      var rawStr = server + "-" + dept + "-" + charId + "-ran2toolkit";
      var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, rawStr, Utilities.Charset.UTF_8);
      
      // 混和大小寫+數字，排除 I、l、O、o (23大寫 + 23小寫 + 10數字 = 56進位)
      var allowedChars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz0123456789";
      
      var code = "";
      for (var i = 0; i < 6; i++) {
        var byteIndex = i * 4;
        var num = ((digest[byteIndex] & 0xFF) << 24) |
                  ((digest[byteIndex + 1] & 0xFF) << 16) |
                  ((digest[byteIndex + 2] & 0xFF) << 8) |
                  (digest[byteIndex + 3] & 0xFF);
        num = num >>> 0; // 轉無符號整數
        var index = num % allowedChars.length;
        code += allowedChars.charAt(index);
      }
      
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        code: code
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 2. 支援練功團全站推播廣播 (P5)
    if (data.action === "broadcastNewParty") {
      var partyTitle = data.title || "全新招募";
      var leaderId = data.leaderId || "發起人";
      var location = data.location || "未知地點";
      var partyId = data.partyId || "";
      var successCount = 0;
      
      try {
        var accessToken = getGoogleAccessToken();
        var structuredQuery = {
          from: [{ collectionId: "global_tokens" }]
        };
        var results = queryFirestore(accessToken, structuredQuery);
        if (results && results.length > 0) {
          var pushTitle = "⚔️ 全新練功團發起！";
          var pushBody = leaderId + " 於【" + location + "】發起了「" + partyTitle + "」，快來加入！";
          results.forEach(function(item) {
            if (item.document && item.document.fields && item.document.fields.token) {
              var token = item.document.fields.token.stringValue;
              try {
                var fcmStatus = sendFcmNotification(accessToken, token, pushTitle, pushBody, { partyId: partyId });
                if (fcmStatus === 200) successCount++;
              } catch (tokenErr) {
                Logger.log("發送全站推播失敗: " + tokenErr.toString());
              }
            }
          });
        }
      } catch (err) {
        Logger.log("執行全站推播廣播失敗: " + err.toString());
      }
      
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: "已向 " + successCount + " 位全站訂閱者發送推播通知"
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: "未知的 action 指令: " + (data.action || "未提供")
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
    "scope": "https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/firebase.messaging",
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

function queryFirestore(accessToken, structuredQuery) {
  var url = "https://firestore.googleapis.com/v1/projects/" + PROJECT_ID + "/databases/(default)/documents:runQuery";
  var options = {
    method: "POST",
    contentType: "application/json",
    headers: {
      Authorization: "Bearer " + accessToken
    },
    payload: JSON.stringify({
      structuredQuery: structuredQuery
    }),
    muteHttpExceptions: true
  };
  
  var response = UrlFetchApp.fetch(url, options);
  if (response.getResponseCode() !== 200) {
    throw new Error("Firestore API Error (" + response.getResponseCode() + "): " + response.getContentText());
  }
  return JSON.parse(response.getContentText());
}