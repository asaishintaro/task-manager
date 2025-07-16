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
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [100, 50, 100],
    requireInteraction: true,
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'open',
        title: 'アプリを開く',
        icon: '/icon-192.png'
      },
      {
        action: 'close',
        title: '閉じる',
        icon: '/icon-192.png'
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
    // Service Worker内でFirestoreに直接アクセスはできないため、
    // メインスレッドからのメッセージを待つか、キャッシュされたデータを使用する
    console.log('バックグラウンドタスクチェック開始')
    
    // 現在時刻
    const now = new Date()
    
    // キャッシュからタスクデータを取得（メインスレッドから送信されたデータ）
    const cachedTasks = await getCachedTasks()
    
    if (!cachedTasks || cachedTasks.length === 0) {
      console.log('キャッシュされたタスクがありません')
      return
    }
    
    // 期限チェック
    const overdueTasks = cachedTasks.filter(task => 
      task.dueDate && 
      new Date(task.dueDate) < now && 
      !task.completed
    )
    
    const todayTasks = cachedTasks.filter(task => {
      if (!task.dueDate || task.completed) return false
      const dueDate = new Date(task.dueDate)
      const today = new Date()
      return dueDate.toDateString() === today.toDateString()
    })
    
    // 通知を送信
    if (overdueTasks.length > 0) {
      await self.registration.showNotification('期限切れのタスクがあります！', {
        body: `${overdueTasks.length}件のタスクが期限切れです`,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        vibrate: [200, 100, 200],
        requireInteraction: true,
        data: { url: '/' },
        actions: [
          {
            action: 'open',
            title: 'アプリを開く'
          }
        ]
      })
    }
    
    if (todayTasks.length > 0) {
      await self.registration.showNotification('今日が期限のタスクがあります', {
        body: `${todayTasks.length}件のタスクが今日期限です`,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        vibrate: [200, 100, 200],
        requireInteraction: true,
        data: { url: '/' },
        actions: [
          {
            action: 'open',
            title: 'アプリを開く'
          }
        ]
      })
    }
    
    console.log('バックグラウンドタスクチェック完了')
  } catch (error) {
    console.error('バックグラウンドタスクチェックエラー:', error)
  }
}

// キャッシュからタスクデータを取得
async function getCachedTasks() {
  try {
    const cache = await caches.open('task-data-cache')
    const response = await cache.match('/tasks-data')
    if (response) {
      return await response.json()
    }
    return null
  } catch (error) {
    console.error('キャッシュからのタスク取得エラー:', error)
    return null
  }
}

// メインスレッドからのメッセージ処理
self.addEventListener('message', async (event) => {
  const { type, data } = event.data || {}
  
  switch (type) {
    case 'START_BACKGROUND_CHECK':
      // 1時間ごとにバックグラウンドチェック
      setInterval(() => {
        checkTasksInBackground()
      }, 60 * 60 * 1000)
      break
      
    case 'UPDATE_TASKS_CACHE':
      // タスクデータをキャッシュに保存
      await cacheTasksData(data.tasks)
      console.log('タスクデータをキャッシュに保存しました')
      break
      
    case 'IMMEDIATE_TASK_CHECK':
      // 即座にタスクチェック実行
      await checkTasksInBackground()
      break
      
    default:
      console.log('未知のメッセージタイプ:', type)
  }
})

// タスクデータをキャッシュに保存
async function cacheTasksData(tasks) {
  try {
    const cache = await caches.open('task-data-cache')
    const response = new Response(JSON.stringify(tasks), {
      headers: { 'Content-Type': 'application/json' }
    })
    await cache.put('/tasks-data', response)
  } catch (error) {
    console.error('タスクデータキャッシュエラー:', error)
  }
}