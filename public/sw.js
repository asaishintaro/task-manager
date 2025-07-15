const CACHE_NAME = 'task-manager-v1'
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json'
]

// Service Worker インストール
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  )
})

// Service Worker アクティベート
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
})

// ネットワークリクエストの処理
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // キャッシュにある場合は返す
        if (response) {
          return response
        }
        // キャッシュにない場合はネットワークから取得
        return fetch(event.request)
      })
  )
})

// プッシュ通知の処理
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'タスクの期限が近づいています',
    icon: '/vite.svg',
    badge: '/vite.svg',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'open',
        title: 'アプリを開く',
        icon: '/vite.svg'
      },
      {
        action: 'close',
        title: '閉じる',
        icon: '/vite.svg'
      }
    ]
  }

  event.waitUntil(
    self.registration.showNotification('タスク管理アプリ', options)
  )
})

// 通知のクリック処理
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  
  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow('/')
    )
  }
})

// バックグラウンド同期
self.addEventListener('sync', (event) => {
  if (event.tag === 'task-check') {
    event.waitUntil(checkTasksInBackground())
  }
})

// バックグラウンドでのタスクチェック
async function checkTasksInBackground() {
  try {
    // Firebase から最新のタスクを取得
    const response = await fetch('/api/tasks')
    const tasks = await response.json()
    
    // 期限チェック
    const now = new Date()
    const overdueTasks = tasks.filter(task => 
      task.dueDate && 
      new Date(task.dueDate) < now && 
      !task.completed
    )
    
    const todayTasks = tasks.filter(task => {
      if (!task.dueDate || task.completed) return false
      const dueDate = new Date(task.dueDate)
      const today = new Date()
      return dueDate.toDateString() === today.toDateString()
    })
    
    // 通知を送信
    if (overdueTasks.length > 0) {
      self.registration.showNotification('期限切れのタスクがあります！', {
        body: `${overdueTasks.length}件のタスクが期限切れです`,
        icon: '/vite.svg',
        badge: '/vite.svg',
        vibrate: [100, 50, 100],
        requireInteraction: true
      })
    }
    
    if (todayTasks.length > 0) {
      self.registration.showNotification('今日が期限のタスクがあります', {
        body: `${todayTasks.length}件のタスクが今日期限です`,
        icon: '/vite.svg',
        badge: '/vite.svg',
        vibrate: [100, 50, 100],
        requireInteraction: true
      })
    }
  } catch (error) {
    console.error('バックグラウンドタスクチェックエラー:', error)
  }
}

// 定期的なバックグラウンドチェック
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'START_BACKGROUND_CHECK') {
    // 1時間ごとにバックグラウンドチェック
    setInterval(() => {
      checkTasksInBackground()
    }, 60 * 60 * 1000)
  }
})