import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [tasks, setTasks] = useState(() => {
    const savedTasks = localStorage.getItem('tasks')
    return savedTasks ? JSON.parse(savedTasks) : [
      { id: 1, text: 'サンプルタスク1', completed: false },
      { id: 2, text: 'サンプルタスク2', completed: false },
      { id: 3, text: 'サンプルタスク3', completed: true }
    ]
  })
  const [inputValue, setInputValue] = useState('')

  useEffect(() => {
    localStorage.setItem('tasks', JSON.stringify(tasks))
  }, [tasks])

  const addTask = () => {
    if (inputValue.trim()) {
      const newTask = {
        id: Date.now(),
        text: inputValue.trim(),
        completed: false
      }
      setTasks([...tasks, newTask])
      setInputValue('')
    }
  }

  const deleteTask = (id) => {
    setTasks(tasks.filter(task => task.id !== id))
  }

  const toggleTask = (id) => {
    setTasks(tasks.map(task => 
      task.id === id ? { ...task, completed: !task.completed } : task
    ))
  }

  return (
    <div className="app-container">
      <h1 className="app-title">タスク管理</h1>
      <div className="task-input-container">
        <input 
          type="text" 
          className="task-input"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="新しいタスクを入力"
        />
        <button className="add-button" onClick={addTask}>追加</button>
      </div>
      <ul className="task-list">
        {tasks.map(task => (
          <li key={task.id} className="task-item">
            <input 
              type="checkbox" 
              className="task-checkbox"
              checked={task.completed}
              onChange={() => toggleTask(task.id)}
            />
            <span className={`task-text ${task.completed ? 'completed' : ''}`}>
              {task.text}
            </span>
            <button className="delete-button" onClick={() => deleteTask(task.id)}>削除</button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default App
