import { useState, useEffect } from 'react'
import './App.css'
import { 
  addTask, 
  updateTask, 
  removeTask, 
  subscribeToTasks,
  checkDueTasks,
  requestNotificationPermission,
  sendNotification
} from './taskService'
import notificationService from './notificationService'

function App() {
  const [tasks, setTasks] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [dueDateValue, setDueDateValue] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showDueDateInput, setShowDueDateInput] = useState(false)

  // Firestoreからタスクをリアルタイムで取得
  useEffect(() => {
    const unsubscribe = subscribeToTasks((firestoreTasks) => {
      setTasks(firestoreTasks)
      setLoading(false)
      
      // 期限チェックと通知
      const { overdueTasks, todayTasks } = checkDueTasks(firestoreTasks)
      
      if (overdueTasks.length > 0) {
        sendNotification('期限超過のタスクがあります', `${overdueTasks.length}件のタスクが期限切れです`)
      }
      
      if (todayTasks.length > 0) {
        sendNotification('今日が期限のタスクがあります', `${todayTasks.length}件のタスクが今日期限です`)
      }
    })

    return () => unsubscribe()
  }, [])

  // 通知許可をリクエスト
  useEffect(() => {
    requestNotificationPermission()
  }, [])

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
