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

const COLLECTION_NAME = 'tasks'

// タスクをFirestoreに追加
export const addTask = async (task) => {
  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...task,
      createdAt: new Date(),
      dueDate: task.dueDate || null
    })
    return docRef.id
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

// 通知を送信
export const sendNotification = async (title, body) => {
  console.log('通知送信試行:', { title, body, permission: Notification.permission, isMobile: isMobile() })
  
  if (Notification.permission !== 'granted') {
    console.log('通知許可がありません:', Notification.permission)
    return
  }

  try {
    // スマホ・タブレットの場合は最初からService Worker経由で通知
    if (isMobile() && 'serviceWorker' in navigator) {
      console.log('スマホ検出 - Service Worker通知を使用')
      const registration = await navigator.serviceWorker.ready
      await registration.showNotification(title, {
        body,
        icon: '/vite.svg',
        badge: '/vite.svg',
        requireInteraction: true,
        vibrate: [200, 100, 200],
        actions: [
          {
            action: 'open',
            title: 'アプリを開く'
          }
        ]
      })
      console.log('Service Worker通知送信成功')
    } else {
      // PC・デスクトップの場合は通常の通知
      console.log('PC検出 - 通常の通知を使用')
      new Notification(title, {
        body,
        icon: '/vite.svg'
      })
      console.log('通常の通知送信成功')
    }
  } catch (error) {
    console.error('通知送信エラー:', error)
  }
}