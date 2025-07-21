import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy 
} from 'firebase/firestore'
import { db } from './firebase'

// Service Workerにタスクデータを送信
export const updateServiceWorkerTasksCache = async (tasks) => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready
      registration.active?.postMessage({
        type: 'UPDATE_TASKS_CACHE',
        data: { tasks }
      })
    } catch (error) {
      console.error('Service Workerへのタスクデータ送信エラー:', error)
    }
  }
}

const COLLECTION_NAME = 'tasks'

// タスクをFirestoreに追加
export const addTask = async (task) => {
  try {
    const taskData = {
      ...task,
      createdAt: new Date(),
      dueDate: task.dueDate || null
    }
    const docRef = await addDoc(collection(db, COLLECTION_NAME), taskData)
    
    // 追加されたタスクのデータを返す
    return {
      id: docRef.id,
      ...taskData
    }
  } catch (error) {
    console.error('タスクの追加に失敗しました:', error)
    throw error
  }
}

// タスクを更新
export const updateTask = async (taskId, updates) => {
  try {
    const taskRef = doc(db, COLLECTION_NAME, taskId)
    await updateDoc(taskRef, {
      ...updates,
      updatedAt: new Date()
    })
  } catch (error) {
    console.error('タスクの更新に失敗しました:', error)
    throw error
  }
}

// タスクを削除
export const removeTask = async (taskId) => {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, taskId))
  } catch (error) {
    console.error('タスクの削除に失敗しました:', error)
    throw error
  }
}

// リアルタイムでタスクを監視
export const subscribeToTasks = (callback) => {
  const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'))
  
  return onSnapshot(q, (snapshot) => {
    const tasks = []
    snapshot.forEach((doc) => {
      const data = doc.data()
      tasks.push({
        id: doc.id,
        ...data,
        dueDate: data.dueDate ? data.dueDate.toDate() : null
      })
    })
    callback(tasks)
  }, (error) => {
    console.error('タスクの監視に失敗しました:', error)
  })
}

// 期限チェック関数
export const checkDueTasks = (tasks) => {
  const now = new Date()
  const overdueTasks = []
  const todayTasks = []
  
  tasks.forEach(task => {
    if (task.dueDate && !task.completed) {
      const timeUntilDue = task.dueDate.getTime() - now.getTime()
      const hoursUntilDue = timeUntilDue / (1000 * 60 * 60)
      
      if (timeUntilDue < 0) {
        overdueTasks.push(task)
      } else if (hoursUntilDue <= 24) {
        todayTasks.push(task)
      }
    }
  })
  
  return { overdueTasks, todayTasks }
}

// 通知許可をリクエスト
export const requestNotificationPermission = async () => {
  if ('Notification' in window) {
    const permission = await Notification.requestPermission()
    return permission === 'granted'
  }
  return false
}

// スマホ・タブレットかどうかを判定
const isMobile = () => {
  const userAgent = navigator.userAgent.toLowerCase()
  const isMobileDevice = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent)
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0
  return isMobileDevice || isTouchDevice
}

// 個別タスクの期限通知をスケジュール（FCM版）
const scheduledNotifications = new Map()

export const scheduleTaskNotification = async (task) => {
  if (!task.dueDate || task.completed) {
    return
  }

  // 既存の通知をキャンセル
  if (scheduledNotifications.has(task.id)) {
    clearTimeout(scheduledNotifications.get(task.id))
    scheduledNotifications.delete(task.id)
  }

  const now = new Date()
  const timeUntilDue = task.dueDate.getTime() - now.getTime()
  
  // 期限が過去の場合はスケジュールしない
  if (timeUntilDue <= 0) {
    return
  }

  console.log(`タスク "${task.text}" の通知を${Math.floor(timeUntilDue/1000/60)}分後にスケジュール`)

  // 期限時刻にService Worker通知を送信（AndroidとPC両対応）
  const timeoutId = setTimeout(async () => {
    console.log(`タスクの期限通知を送信: "${task.text}"`)
    
    // Service Worker経由で確実に通知
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready
        await registration.showNotification('タスクの期限です！', {
          body: `"${task.text}" の期限になりました`,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          tag: `task-due-${task.id}`,
          data: { 
            taskId: task.id,
            type: 'task-due',
            url: '/' 
          },
          actions: [
            { action: 'open', title: 'アプリを開く' },
            { action: 'complete', title: '完了にする' },
            { action: 'dismiss', title: '閉じる' }
          ],
          requireInteraction: true,
          vibrate: [200, 100, 200, 100, 200]
        })
        console.log('Service Worker通知送信成功')
      } catch (error) {
        console.error('Service Worker通知送信エラー:', error)
        // フォールバック
        await sendNotification(
          'タスクの期限です！',
          `"${task.text}" の期限になりました`
        )
      }
    } else {
      // フォールバック
      await sendNotification(
        'タスクの期限です！',
        `"${task.text}" の期限になりました`
      )
    }
    
    scheduledNotifications.delete(task.id)
  }, timeUntilDue)

  scheduledNotifications.set(task.id, timeoutId)
}

export const cancelTaskNotification = (taskId) => {
  if (scheduledNotifications.has(taskId)) {
    clearTimeout(scheduledNotifications.get(taskId))
    scheduledNotifications.delete(taskId)
    console.log(`タスク ${taskId} の通知をキャンセルしました`)
  }
}

// 全ての通知をスケジュール（アプリ起動時に呼び出し）
export const scheduleAllTaskNotifications = (tasks) => {
  console.log(`${tasks.length}個のタスクの通知をスケジュール中...`)
  tasks.forEach(task => {
    if (task.dueDate && !task.completed) {
      scheduleTaskNotification(task)
    }
  })
}

// 通知を送信（プラットフォーム対応版）
export const sendNotification = async (title, body) => {
  console.log('通知送信試行:', { title, body, permission: Notification.permission, isMobile: isMobile() })
  
  if (!('Notification' in window)) {
    console.log('このブラウザは通知をサポートしていません')
    return
  }

  if (Notification.permission !== 'granted') {
    console.log('通知許可がありません:', Notification.permission)
    return
  }

  const options = {
    body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    requireInteraction: true,
    vibrate: [200, 100, 200],
    data: { url: '/' }
  }

  try {
    // まずは通常の通知を試行
    if (!isMobile()) {
      console.log('PC検出 - 通常の通知を使用')
      new Notification(title, options)
      console.log('通常の通知送信成功')
      return
    }
    
    // スマホの場合は最初からService Worker経由で通知
    console.log('スマホ検出 - Service Worker通知を使用')
    if ('serviceWorker' in navigator && 'showNotification' in ServiceWorkerRegistration.prototype) {
      const registration = await navigator.serviceWorker.ready
      await registration.showNotification(title, {
        ...options,
        actions: [
          {
            action: 'open',
            title: 'アプリを開く'
          }
        ]
      })
      console.log('Service Worker通知送信成功')
    } else {
      throw new Error('Service Worker通知がサポートされていません')
    }
  } catch (error) {
    console.error('通知送信エラー:', error)
    
    // フォールバック: Service Worker経由で再試行
    if ('serviceWorker' in navigator) {
      try {
        console.log('フォールバック: Service Worker通知を再試行')
        const registration = await navigator.serviceWorker.ready
        await registration.showNotification(title, options)
        console.log('フォールバック通知送信成功')
      } catch (fallbackError) {
        console.error('フォールバック通知も失敗:', fallbackError)
      }
    }
  }
}