import { useState, useEffect } from 'react'
import './App.css'
import { 
  addTask, 
  updateTask, 
  removeTask, 
  subscribeToTasks,
  checkDueTasks,
  requestNotificationPermission,
  sendNotification,
  updateServiceWorkerTasksCache
} from './taskService'
import notificationService from './notificationService'

function App() {
  const [tasks, setTasks] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [dueDateValue, setDueDateValue] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showDueDateInput, setShowDueDateInput] = useState(false)
  const [notificationStatus, setNotificationStatus] = useState('未確認')
  const [browserInfo, setBrowserInfo] = useState('')

  // Firestoreからタスクをリアルタイムで取得
  useEffect(() => {
    const unsubscribe = subscribeToTasks(async (firestoreTasks) => {
      setTasks(firestoreTasks)
      setLoading(false)
      
      // Service Workerにタスクデータを送信
      await updateServiceWorkerTasksCache(firestoreTasks)
      
      // 期限チェックと通知（初回読み込み時は通知しない）
      if (tasks.length > 0) {
        const { overdueTasks, todayTasks } = checkDueTasks(firestoreTasks)
        
        if (overdueTasks.length > 0) {
          console.log('期限切れタスク:', overdueTasks)
          await sendNotification('期限超過のタスクがあります', `${overdueTasks.length}件のタスクが期限切れです`)
        }
        
        if (todayTasks.length > 0) {
          console.log('今日期限タスク:', todayTasks)
          await sendNotification('今日が期限のタスクがあります', `${todayTasks.length}件のタスクが今日期限です`)
        }
      }
    })

    return () => unsubscribe()
  }, [])

  // 通知許可をリクエスト
  useEffect(() => {
    // ブラウザ情報を取得
    const userAgent = navigator.userAgent
    let browser = 'Unknown'
    if (userAgent.includes('Chrome')) browser = 'Chrome'
    else if (userAgent.includes('Firefox')) browser = 'Firefox'
    else if (userAgent.includes('Safari')) browser = 'Safari'
    else if (userAgent.includes('Edge')) browser = 'Edge'
    
    setBrowserInfo(`${browser} - ${navigator.platform}`)
    
    // 通知サポート確認
    if (!('Notification' in window)) {
      setNotificationStatus('このブラウザは通知をサポートしていません')
      return
    }
    
    // 現在の許可状態を確認
    const currentPermission = Notification.permission
    setNotificationStatus(`現在の状態: ${currentPermission}`)
    
    // 許可をリクエスト
    requestNotificationPermission().then((granted) => {
      if (granted) {
        setNotificationStatus('許可済み')
      } else {
        setNotificationStatus(`拒否されました (${Notification.permission})`)
      }
    })
  }, [])

  // スマホ・タブレット判定
  const isMobile = () => {
    const userAgent = navigator.userAgent.toLowerCase()
    const isMobileDevice = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent)
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0
    return isMobileDevice || isTouchDevice
  }

  // 通知テスト機能
  const testNotification = async () => {
    console.log('通知テスト開始')
    console.log('Notification.permission:', Notification.permission)
    console.log('isMobile:', isMobile())
    
    if (Notification.permission === 'granted') {
      try {
        // スマホ・タブレットの場合は最初からService Worker経由で通知
        if (isMobile() && 'serviceWorker' in navigator) {
          console.log('スマホ検出 - Service Worker通知を使用')
          const registration = await navigator.serviceWorker.ready
          await registration.showNotification('テスト通知', {
            body: '通知が正常に動作しています！',
            icon: '/vite.svg',
            badge: '/vite.svg',
            requireInteraction: true,
            vibrate: [200, 100, 200]
          })
          console.log('Service Worker通知送信成功')
          setNotificationStatus('テスト送信済み (Service Worker) - 通知を確認してください')
        } else {
          // PC・デスクトップの場合は通常の通知
          console.log('PC検出 - 通常の通知を使用')
          new Notification('テスト通知', {
            body: '通知が正常に動作しています！',
            icon: '/vite.svg'
          })
          console.log('通常の通知送信成功')
          setNotificationStatus('テスト送信済み - 通知を確認してください')
        }
      } catch (error) {
        console.error('通知作成エラー:', error)
        setNotificationStatus('通知作成エラー: ' + error.message)
      }
    } else if (Notification.permission === 'default') {
      // 再度許可をリクエスト
      const permission = await Notification.requestPermission()
      if (permission === 'granted') {
        testNotification()
      } else {
        setNotificationStatus('通知許可が必要です')
      }
    } else {
      setNotificationStatus('通知が拒否されています - ブラウザ設定を確認してください')
    }
  }

  // 通知サービスの初期化
  useEffect(() => {
    if (tasks.length > 0) {
      // 朝の通知をスケジュール
      notificationService.scheduleMorningNotification(tasks)
      
      // ページの表示/非表示を監視
      const handleVisibilityChange = () => {
        notificationService.handleVisibilityChange(tasks)
      }
      
      document.addEventListener('visibilitychange', handleVisibilityChange)
      
      // Service Workerにバックグラウンドチェック開始を通知
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.active?.postMessage({
            type: 'START_BACKGROUND_CHECK'
          })
        })
      }
      
      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange)
        notificationService.stopPeriodicCheck()
      }
    }
  }, [tasks])

  const handleAddTask = async () => {
    if (inputValue.trim()) {
      try {
        setError(null)
        const newTask = {
          text: inputValue.trim(),
          completed: false,
          dueDate: dueDateValue ? new Date(dueDateValue) : null
        }
        await addTask(newTask)
        setInputValue('')
        setDueDateValue('')
        setShowDueDateInput(false)
      } catch (error) {
        setError('タスクの追加に失敗しました')
      }
    }
  }

  const handleDeleteTask = async (taskId) => {
    try {
      setError(null)
      await removeTask(taskId)
    } catch (error) {
      setError('タスクの削除に失敗しました')
    }
  }

  const handleToggleTask = async (taskId, currentCompleted) => {
    try {
      setError(null)
      await updateTask(taskId, { completed: !currentCompleted })
    } catch (error) {
      setError('タスクの更新に失敗しました')
    }
  }

  if (loading) {
    return (
      <div className="app-container">
        <h1 className="app-title">タスク管理</h1>
        <div className="loading">読み込み中...</div>
      </div>
    )
  }

  return (
    <div className="app-container">
      <h1 className="app-title">タスク管理</h1>
      {error && <div className="error-message">{error}</div>}
      
      <div className="notification-status">
        <div>
          <div>ブラウザ: {browserInfo}</div>
          <div>通知状態: {notificationStatus}</div>
        </div>
        <button className="test-notification-button" onClick={testNotification}>
          通知テスト
        </button>
      </div>
      
      {Notification.permission === 'denied' && (
        <div className="notification-help">
          <h3>通知設定の手順</h3>
          <div>
            <strong>Chrome:</strong> アドレスバーの🔒アイコン → 通知 → 許可
          </div>
          <div>
            <strong>Safari:</strong> Safari → 設定 → Webサイト → 通知
          </div>
          <div>
            <strong>Firefox:</strong> アドレスバーの🛡️アイコン → 通知許可
          </div>
          <div>
            <strong>スマホ:</strong> ブラウザ設定 → サイト設定 → 通知
          </div>
        </div>
      )}
      <div className="task-input-container">
        <input 
          type="text" 
          className="task-input"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="新しいタスクを入力"
          onKeyPress={(e) => e.key === 'Enter' && !showDueDateInput && handleAddTask()}
        />
        <button 
          className="date-toggle-button"
          onClick={() => setShowDueDateInput(!showDueDateInput)}
        >
          📅
        </button>
        <button className="add-button" onClick={handleAddTask}>追加</button>
      </div>
      {showDueDateInput && (
        <div className="due-date-container">
          <input 
            type="datetime-local" 
            className="due-date-input"
            value={dueDateValue}
            onChange={(e) => setDueDateValue(e.target.value)}
            placeholder="期限を設定"
          />
        </div>
      )}
      <ul className="task-list">
        {tasks.map(task => {
          const { overdueTasks, todayTasks } = checkDueTasks([task])
          const isOverdue = overdueTasks.length > 0
          const isToday = todayTasks.length > 0
          
          return (
            <li key={task.id} className={`task-item ${isOverdue ? 'overdue' : ''} ${isToday ? 'today' : ''}`}>
              <input 
                type="checkbox" 
                className="task-checkbox"
                checked={task.completed}
                onChange={() => handleToggleTask(task.id, task.completed)}
              />
              <div className="task-content">
                <span className={`task-text ${task.completed ? 'completed' : ''}`}>
                  {task.text}
                </span>
                {task.dueDate && (
                  <div className="due-date">
                    期限: {task.dueDate.toLocaleDateString('ja-JP')} {task.dueDate.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                    {isOverdue && <span className="overdue-badge">期限切れ</span>}
                    {isToday && !isOverdue && <span className="today-badge">今日期限</span>}
                  </div>
                )}
              </div>
              <button className="delete-button" onClick={() => handleDeleteTask(task.id)}>削除</button>
            </li>
          )
        })}
      </ul>
      {tasks.length === 0 && (
        <div className="empty-state">タスクがありません。新しいタスクを追加してください。</div>
      )}
    </div>
  )
}

export default App
