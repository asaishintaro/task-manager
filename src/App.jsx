import { useState, useEffect } from 'react'
import './App.css'
import { addTask, updateTask, removeTask, subscribeToTasks } from './taskService'

function App() {
  const [tasks, setTasks] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Firestoreからタスクをリアルタイムで取得
  useEffect(() => {
    const unsubscribe = subscribeToTasks((firestoreTasks) => {
      setTasks(firestoreTasks)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const handleAddTask = async () => {
    if (inputValue.trim()) {
      try {
        setError(null)
        const newTask = {
          text: inputValue.trim(),
          completed: false
        }
        await addTask(newTask)
        setInputValue('')
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
          onKeyPress={(e) => e.key === 'Enter' && handleAddTask()}
        />
        <button className="add-button" onClick={handleAddTask}>追加</button>
      </div>
      <ul className="task-list">
        {tasks.map(task => (
          <li key={task.id} className="task-item">
            <input 
              type="checkbox" 
              className="task-checkbox"
              checked={task.completed}
              onChange={() => handleToggleTask(task.id, task.completed)}
            />
            <span className={`task-text ${task.completed ? 'completed' : ''}`}>
              {task.text}
            </span>
            <button className="delete-button" onClick={() => handleDeleteTask(task.id)}>削除</button>
          </li>
        ))}
      </ul>
      {tasks.length === 0 && (
        <div className="empty-state">タスクがありません。新しいタスクを追加してください。</div>
      )}
    </div>
  )
}

export default App
