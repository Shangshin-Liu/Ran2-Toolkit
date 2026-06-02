importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// 初始化 Firebase (Service Worker 中需要使用 Compat 版本的 SDK)
firebase.initializeApp({
  apiKey: "AIzaSyCA4jc0LE5idc2Y9Ejeckq2pt6czMt12HA",
  authDomain: "ran2-toolkit.firebaseapp.com",
  projectId: "ran2-toolkit",
  storageBucket: "ran2-toolkit.firebasestorage.app",
  messagingSenderId: "415180332080",
  appId: "1:415180332080:web:8fe6cf9a47d620c608a1f5"
});

const messaging = firebase.messaging();

// 背景接收通知的預設處理 (當網頁關閉或在背景時觸發)
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] 收到背景推播訊息：', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/favicon.ico', // 使用預設 icon
    badge: '/favicon.ico',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// 監聽推播通知點擊事件，點擊後導向詳情頁
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  // 取得夾帶的 partyId 數據
  const partyId = event.notification.data ? event.notification.data.partyId : null;
  let targetUrl = '/parties';
  if (partyId) {
    targetUrl = '/parties/' + partyId;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // 搜尋是否已有開啟的網頁分頁
      for (const client of clientList) {
        // 如果已經在 parties 頁面，則直接轉址並聚焦
        if (client.url.includes('/parties') && 'focus' in client) {
          return client.navigate(targetUrl).then(c => c.focus());
        }
      }
      // 若無，則開一個新視窗
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
