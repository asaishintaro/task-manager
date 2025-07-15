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

// 通知を送信
export const sendNotification = (title, body) => {
  console.log('通知送信試行:', { title, body, permission: Notification.permission })
  
  if (Notification.permission === 'granted') {
    try {
      // シンプルな通知システム
      new Notification(title, {
        body,
        icon: '/vite.svg'
      })
      console.log('通知送信成功')
    } catch (error) {
      console.error('通知送信エラー:', error)
      // スマホの場合はService Worker経由で再試行
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.showNotification(title, {
            body,
            icon: '/vite.svg'
          })
        }).catch((swError) => {
          console.error('Service Worker通知エラー:', swError)
        })
      }
    }
  } else {
    console.log('通知許可がありません:', Notification.permission)
  }
}