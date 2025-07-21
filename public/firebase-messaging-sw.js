// Firebase Cloud Messaging Service Worker
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js')

// Firebase設定
firebase.initializeApp({
  apiKey: "AIzaSyB8jRFRJxiUBdfhxa1ExaOKB8O00CNZgdQ",
  authDomain: "task-manager-6f0f4.firebaseapp.com",
  projectId: "task-manager-6f0f4",
  storageBucket: "task-manager-6f0f4.firebasestorage.app",
  messagingSenderId: "273205436721",
  appId: "1:273205436721:web:267924b80e90122559d010"
})

const messaging = firebase.messaging()

// バックグラウンドメッセージハンドリング
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] バックグラウンドメッセージ受信:', payload)
  
  const { title, body, icon, badge, tag, ...options } = payload.notification || {}
  const { taskId, type, dueDate } = payload.data || {}
  
  const notificationTitle = title || 'タスク通知'
  const notificationOptions = {
    body: body || 'タスクに関する通知があります',
    icon: icon || '/icon-192.png',
    badge: badge || '/icon-192.png',
    tag: tag || `task-${taskId}`,
    data: {
      taskId,
      type,
      dueDate,
      url: '/' // アプリのURL
    },
    actions: [
      {
        action: 'open',
        title: 'アプリを開く'
      },
      {
        action: 'dismiss',
        title: '閉じる'
      }
    ],
    requireInteraction: true,
    vibrate: [200, 100, 200],
    ...options
  }
  
  self.registration.showNotification(notificationTitle, notificationOptions)
})

// 通知クリック処理
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] 通知クリック:', event)
  
  event.notification.close()
  
  const { action } = event
  const { taskId, url } = event.notification.data || {}
  
  if (action === 'dismiss') {
    // 何もしない
    return
  }
  
  // アプリを開く（デフォルトまたは'open'アクション）
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clientList) => {
      // 既に開いているタブがあるかチェック
      for (const client of clientList) {
        if (client.url.includes(url || '/') && 'focus' in client) {
          return client.focus()
        }
      }
      
      // 新しいタブを開く
      if (clients.openWindow) {
        return clients.openWindow(url || '/')
      }
    })
  )
})