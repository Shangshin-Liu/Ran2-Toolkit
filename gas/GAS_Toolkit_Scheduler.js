/**
 * Ran2-Toolkit-Scheduler (背景排程/定時器程式碼)
 * 
 * 部署說明：
 * 1. 覆蓋貼入您的「Ran2-Toolkit-Scheduler」專案中。
 * 2. 確保專案屬性 (Script Properties) 中已配置：
 *    - `SERVICE_ACCOUNT_KEY` ➔ 填入 GCP 服務帳戶 JSON 金鑰。
 * 3. 點擊左側「時鐘圖示 (觸發器)」建立以下定時器：
 *    - `checkAndCloseExpiredShares` ➔ 每分鐘執行一次。
 *    - `checkAndCloseExpiredParties` ➔ 每分鐘執行一次。
 *    - `checkAndSendNotifications` ➔ 每分鐘執行一次。
 *    - `checkAndSendShareNotifications` ➔ 每分鐘執行一次。
 */

var PROJECT_ID = "ran2-toolkit"; // 您的 Firebase 專案 ID

// ==========================================
// 1. 主入口點 A：每分鐘定時檢查並結案超時的好物分享
// ==========================================
function checkAndCloseExpiredShares() {
  var accessToken = getGoogleAccessToken();
  var nowMs = Date.now();
  var sevenDaysMs = 7 * 24 * 60 * 60 * 1000; // 7 天
  
  var structuredQuery = {
    from: [{ collectionId: "shares" }],
    where: {
      fieldFilter: {
        field: { fieldPath: "status" },
        op: "EQUAL",
        value: { stringValue: "交易中" }
      }
    }
  };
  
  try {
    var results = queryFirestore(accessToken, structuredQuery);
    if (!results || results.length === 0 || !results[0].document) {
      Logger.log("目前無交易中的分享好物項目。");
      return;
    }
    
    results.forEach(function(item) {
      if (!item.document) return;
      var docName = item.document.name;
      var fields = item.document.fields;
      var claimTime = Number(fields.claimTime.integerValue || fields.claimTime.doubleValue);
      var name = fields.name.stringValue;
      var parts = docName.split("/");
      var itemId = parts[parts.length - 1];
      
      if (nowMs - claimTime >= sevenDaysMs) {
        Logger.log("偵測到交易超時好物，自動結案: " + name);
        
        var fieldsToUpdate = {
          status: { stringValue: "已完成" },
          completeTime: { integerValue: nowMs },
          updatedAt: { integerValue: nowMs }
        };
        updateFirestoreDocument(accessToken, docName, fieldsToUpdate, ["status", "completeTime", "updatedAt"]);
        closeRelatedConfirmingApplication(accessToken, itemId, nowMs);
      }
    });
  } catch (err) {
    Logger.log("自動結案好物出錯: " + err.toString());
  }
}

function closeRelatedConfirmingApplication(accessToken, itemId, nowMs) {
  var structuredQuery = {
    from: [{ collectionId: "applications" }],
    where: {
      compositeFilter: {
        op: "AND",
        filters: [
          { fieldFilter: { field: { fieldPath: "itemId" }, op: "EQUAL", value: { stringValue: itemId } } },
          { fieldFilter: { field: { fieldPath: "status" }, op: "EQUAL", value: { stringValue: "確認中" } } }
        ]
      }
    }
  };
  
  try {
    var results = queryFirestore(accessToken, structuredQuery);
    if (results && results.length > 0 && results[0].document) {
      results.forEach(function(item) {
        if (!item.document) return;
        var docName = item.document.name;
        var fieldsToUpdate = {
          status: { stringValue: "已完成" },
          completeTime: { integerValue: nowMs }
        };
        updateFirestoreDocument(accessToken, docName, fieldsToUpdate, ["status", "completeTime"]);
      });
    }
  } catch (e) {
    Logger.log("更新相關超時申請文檔失敗: " + e.toString());
  }
}

// ==========================================
// 2. 主入口點 B：每分鐘定時檢查並關閉過期的練功團
// ==========================================
function checkAndCloseExpiredParties() {
  var accessToken = getGoogleAccessToken();
  var nowMs = Date.now();
  
  var structuredQuery = {
    from: [{ collectionId: "parties" }],
    where: {
      compositeFilter: {
        op: "AND",
        filters: [
          {
            fieldFilter: {
              field: { fieldPath: "status" },
              op: "IN",
              value: {
                arrayValue: {
                  values: [
                    { stringValue: "招募中" },
                    { stringValue: "進行中" }
                  ]
                }
              }
            }
          }
        ]
      }
    }
  };
  
  try {
    var results = queryFirestore(accessToken, structuredQuery);
    if (!results || results.length === 0 || !results[0].document) {
      Logger.log("無進行中或招募中的練功團。");
      return;
    }
    
    results.forEach(function(item) {
      if (!item.document) return;
      var docName = item.document.name;
      var fields = item.document.fields;
      var endTime = Number(fields.endTime.integerValue || fields.endTime.doubleValue);
      var title = fields.title.stringValue;
      
      if (nowMs >= endTime) {
        Logger.log("偵測到過期招募，準備關閉: " + title);
        
        var fieldsToUpdate = {
          status: { stringValue: "已結束" },
          closeReason: { stringValue: "已經順利結束囉 (系統自動判定)" }
        };
        
        var statusCode = updateFirestoreDocument(accessToken, docName, fieldsToUpdate, ["status", "closeReason"]);
        Logger.log("關閉結果 HTTP Status: " + statusCode);
      }
    });
  } catch (err) {
    Logger.log("關閉過期練功團出錯: " + err.toString());
  }
}

// ==========================================
// 3. 主入口點 C：每分鐘定時檢查並發送開團提醒
// ==========================================
function checkAndSendNotifications() {
  var accessToken = getGoogleAccessToken();
  var nowMs = Date.now();
  var tenMinMs = 10 * 60 * 1000;
  
  var structuredQuery = {
    from: [{ collectionId: "parties" }],
    where: {
      compositeFilter: {
        op: "AND",
        filters: [
          {
            fieldFilter: {
              field: { fieldPath: "status" },
              op: "EQUAL",
              value: { stringValue: "招募中" }
            }
          },
          {
            fieldFilter: {
              field: { fieldPath: "notified10min" },
              op: "EQUAL",
              value: { booleanValue: false }
            }
          }
        ]
      }
    }
  };
  
  try {
    var results = queryFirestore(accessToken, structuredQuery);
    if (!results || results.length === 0 || !results[0].document) {
      Logger.log("無符合提醒條件的練功團。");
      return;
    }
    
    results.forEach(function(item) {
      if (!item.document) return;
      var docName = item.document.name;
      var parts = docName.split("/");
      var partyId = parts[parts.length - 1];
      
      var fields = item.document.fields;
      var startTime = Number(fields.startTime.integerValue || fields.startTime.doubleValue);
      var title = fields.title.stringValue;
      var leaderId = fields.leaderId.stringValue;
      var location = fields.location.stringValue === "其他" ? fields.customLocation.stringValue : fields.location.stringValue;
      
      if (startTime > nowMs && (startTime - nowMs <= tenMinMs)) {
        Logger.log("開始發送開團提醒: " + title);
        
        var tokens = getSubscriberTokens(accessToken, partyId);
        if (tokens.length > 0) {
          tokens.forEach(function(token) {
            var pushTitle = "⚔️ 練功準備出發！";
            var pushBody = leaderId + "所發起的「" + title + "」即將於 10 分鐘內在【" + location + "】開始！";
            var fcmStatus = sendFcmNotification(accessToken, token, pushTitle, pushBody, { partyId: partyId });
            Logger.log("推播發送至 " + token.substring(0, 10) + "... 結果: " + fcmStatus);
          });
        }
        
        var fieldsToUpdate = {
          notified10min: { booleanValue: true }
        };
        updateFirestoreDocument(accessToken, docName, fieldsToUpdate, ["notified10min"]);
      }
    });
  } catch (err) {
    Logger.log("發送通知出錯: " + err.toString());
  }
}

// ==========================================
// 4. 主入口點 D：每分鐘定時檢查並發送好物中獎通知
// ==========================================
function checkAndSendShareNotifications() {
  var accessToken = getGoogleAccessToken();
  
  var structuredQuery = {
    from: [{ collectionId: "applications" }],
    where: {
      compositeFilter: {
        op: "AND",
        filters: [
          { fieldFilter: { field: { fieldPath: "status" }, op: "EQUAL", value: { stringValue: "確認中" } } },
          { fieldFilter: { field: { fieldPath: "notifiedWinner" }, op: "EQUAL", value: { booleanValue: false } } }
        ]
      }
    }
  };
  
  try {
    var results = queryFirestore(accessToken, structuredQuery);
    if (!results || results.length === 0 || !results[0].document) {
      Logger.log("無需要發送中獎通知的申請。");
      return;
    }
    
    results.forEach(function(item) {
      if (!item.document) return;
      var docName = item.document.name;
      var fields = item.document.fields;
      var token = fields.fcmToken ? fields.fcmToken.stringValue : null;
      var itemId = fields.itemId.stringValue;
      
      if (token && token.trim() !== "") {
        var itemName = getShareItemName(accessToken, itemId);
        var pushTitle = "🎁 恭喜獲得好物分享！";
        var pushBody = "您申請的「" + itemName + "」已被大老指定給您，請主動至遊戲內聯絡大老進行交易！";
        
        var fcmStatus = sendFcmNotification(accessToken, token, pushTitle, pushBody, { itemId: itemId });
        Logger.log("得標推播發送結果 (HTTP " + fcmStatus + ")，Token: " + token.substring(0, 10) + "...");
      }
      
      var fieldsToUpdate = {
        notifiedWinner: { booleanValue: true }
      };
      updateFirestoreDocument(accessToken, docName, fieldsToUpdate, ["notifiedWinner"]);
    });
  } catch (err) {
    Logger.log("發送中獎通知出錯: " + err.toString());
  }
}

// ==========================================
// 5. 輔助函數 (Firestore & FCM & OAuth)
// ==========================================
function getShareItemName(accessToken, itemId) {
  try {
    var url = "https://firestore.googleapis.com/v1/projects/" + PROJECT_ID + "/databases/(default)/documents/shares/" + itemId;
    var options = {
      method: "GET",
      headers: { Authorization: "Bearer " + accessToken },
      muteHttpExceptions: true
    };
    var response = UrlFetchApp.fetch(url, options);
    if (response.getResponseCode() === 200) {
      var data = JSON.parse(response.getContentText());
      return data.fields && data.fields.name ? data.fields.name.stringValue : "分享的道具";
    }
  } catch (e) {
    Logger.log("讀取寶物名稱失敗: " + e.toString());
  }
  return "分享的道具";
}

function getSubscriberTokens(accessToken, partyId) {
  var structuredQuery = {
    from: [{ collectionId: "party_subscriptions" }],
    where: {
      fieldFilter: {
        field: { fieldPath: "partyId" },
        op: "EQUAL",
        value: { stringValue: partyId }
      }
    }
  };
  
  var tokens = [];
  try {
    var results = queryFirestore(accessToken, structuredQuery);
    if (results && results.length > 0 && results[0].document) {
      results.forEach(function(item) {
        if (item.document && item.document.fields && item.document.fields.token) {
          tokens.push(item.document.fields.token.stringValue);
        }
      });
    }
  } catch (err) {
    Logger.log("取得訂閱 Token 失敗: " + err.toString());
  }
  return tokens;
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

function updateFirestoreDocument(accessToken, documentPath, fieldsToUpdate, updateMaskPaths) {
  var url = "https://firestore.googleapis.com/v1/" + documentPath;
  var queryParams = updateMaskPaths.map(function(path) {
    return "updateMask.fieldPaths=" + encodeURIComponent(path);
  }).join("&");
  
  url += "?" + queryParams;
  
  var options = {
    method: "PATCH",
    contentType: "application/json",
    headers: {
      Authorization: "Bearer " + accessToken
    },
    payload: JSON.stringify({
      fields: fieldsToUpdate
    }),
    muteHttpExceptions: true
  };
  
  var response = UrlFetchApp.fetch(url, options);
  return response.getResponseCode();
}

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
