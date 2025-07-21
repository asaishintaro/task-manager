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
  updateServiceWorkerTasksCache,
  scheduleTaskNotification,
  cancelTaskNotification,
  scheduleAllTaskNotifications
} from './taskService'
import notificationService from './notificationService'
import pushNotificationService from './services/pushNotificationService'
import simpleNotificationService from './simpleNotificationService'

function App() {
  const [tasks, setTasks] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [dueDateValue, setDueDateValue] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showDueDateInput, setShowDueDateInput] = useState(false)
  const [notificationStatus, setNotificationStatus] = useState('未確認')
  const [browserInfo, setBrowserInfo] = useState('')
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [pushNotificationStatus, setPushNotificationStatus] = useState('未確認')
  const [pushSubscribed, setPushSubscribed] = useState(false)

  // Firestoreからタスクをリアルタイムで取得
  useEffect(() => {
    const unsubscribe = subscribeToTasks(async (firestoreTasks) => {
      setTasks(firestoreTasks)
      setLoading(false)
      
      // Service Workerにタスクデータを送信
      await updateServiceWorkerTasksCache(firestoreTasks)
      
      // 全てのタスクの期限通知をスケジュール
      scheduleAllTaskNotifications(firestoreTasks)
      
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

  // PWAインストール関連とブラウザ情報設定
  useEffect(() => {
    // ブラウザ情報を取得
    const userAgent = navigator.userAgent
    let browser = 'Unknown'
    if (userAgent.includes('Chrome')) browser = 'Chrome'
    else if (userAgent.includes('Firefox')) browser = 'Firefox'
    else if (userAgent.includes('Safari')) browser = 'Safari'
    else if (userAgent.includes('Edge')) browser = 'Edge'
    
    setBrowserInfo(`${browser} - ${navigator.platform}`)
    
    // PWAインストール状態をチェック
    const checkIfInstalled = () => {
      // スタンドアロンモードかどうか
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      // PWAとして起動されているか
      const isPWA = window.navigator.standalone === true || isStandalone
      setIsInstalled(isPWA)
      
      if (!isPWA && isMobile()) {
        setShowInstallPrompt(true)
      }
    }
    
    checkIfInstalled()
    
    // beforeinstallpromptイベントをキャッチ
    const handleBeforeInstallPrompt = (e) => {
      console.log('PWAインストールプロンプトが利用可能')
      e.preventDefault()
      setDeferredPrompt(e)
      setShowInstallPrompt(true)
    }
    
    // PWAインストール完了時
    const handleAppInstalled = () => {
      console.log('PWAがインストールされました')
      setIsInstalled(true)
      setShowInstallPrompt(false)
      setDeferredPrompt(null)
    }
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  // 通知許可をリクエスト
  useEffect(() => {
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

  // プッシュ通知初期化（PWAインストール後）
  useEffect(() => {
    if (isInstalled) {
      initializePushNotifications()
    }
  }, [isInstalled])

  // プッシュ通知初期化
  const initializePushNotifications = async () => {
    try {
      console.log('プッシュ通知初期化開始')
      setPushNotificationStatus('初期化中...')
      
      // プッシュ通知サービス初期化
      const initialized = await pushNotificationService.initializeMessaging()
      if (!initialized) {
        setPushNotificationStatus('未対応')
        return
      }

      // 既存の購読状況確認
      const isSubscribed = pushNotificationService.isPushSubscribed()
      setPushSubscribed(isSubscribed)
      
      if (isSubscribed) {
        setPushNotificationStatus('購読済み')
      } else {
        setPushNotificationStatus('未購読')
      }
      
    } catch (error) {
      console.error('プッシュ通知初期化エラー:', error)
      setPushNotificationStatus('エラー: ' + error.message)
    }
  }

  // スマホ・タブレット判定
  const isMobile = () => {
    const userAgent = navigator.userAgent.toLowerCase()
    const isMobileDevice = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent)
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0
    return isMobileDevice || isTouchDevice
  }

  // PWAインストール機能
  const handleInstallPWA = async () => {
    if (deferredPrompt) {
      try {
        console.log('PWAインストールプロンプトを表示')
        deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice
        console.log('ユーザーの選択:', outcome)
        
        if (outcome === 'accepted') {
          console.log('PWAインストールが承認されました')
        } else {
          console.log('PWAインストールが拒否されました')
        }
        
        setDeferredPrompt(null)
        setShowInstallPrompt(false)
      } catch (error) {
        console.error('PWAインストールエラー:', error)
      }
    }
  }

  // プッシュ通知購読/購読解除
  const togglePushSubscription = async () => {
    try {
      if (pushSubscribed) {
        // 購読解除
        const result = await pushNotificationService.unsubscribeFromPush()
        if (result.success) {
          setPushSubscribed(false)
          setPushNotificationStatus('購読解除済み')
        } else {
          setPushNotificationStatus('解除エラー: ' + result.error)
        }
      } else {
        // 購読開始
        setPushNotificationStatus('購読中...')
        const result = await pushNotificationService.subscribeToPush()
        if (result.success) {
          setPushSubscribed(true)
          setPushNotificationStatus('購読済み')
        } else {
          setPushNotificationStatus('購読エラー: ' + result.error)
        }
      }
    } catch (error) {
      console.error('プッシュ通知切り替えエラー:', error)
      setPushNotificationStatus('エラー: ' + error.message)
    }
  }

  // プッシュ通知テスト
  const testPushNotification = async () => {
    try {
      console.log('プッシュ通知テスト開始')
      const result = await pushNotificationService.sendTestNotification()
      if (result.success) {
        setPushNotificationStatus('テスト送信済み - 通知を確認してください')
      } else {
        setPushNotificationStatus('テスト送信エラー: ' + result.error)
      }
    } catch (error) {
      console.error('プッシュ通知テストエラー:', error)
      setPushNotificationStatus('テストエラー: ' + error.message)
    }
  }

  // 通知テスト機能（デバッグ情報強化）
  const testNotification = async () => {
    console.log('=== 通知テスト開始 ===')
    console.log('Notification.permission:', Notification.permission)
    console.log('isMobile():', isMobile())
    console.log('isInstalled (PWA):', isInstalled)
    console.log('serviceWorker supported:', 'serviceWorker' in navigator)
    console.log('push supported:', 'PushManager' in window)
    console.log('userAgent:', navigator.userAgent)
    console.log('platform:', navigator.platform)
    
    // プッシュ通知デバッグ情報
    const pushDebugInfo = pushNotificationService.getDebugInfo()
    console.log('Push notification debug info:', pushDebugInfo)
    
    if (Notification.permission === 'granted') {
      try {
        // スマホ・タブレットの場合は最初からService Worker経由で通知
        if (isMobile() && 'serviceWorker' in navigator) {
          console.log('スマホ検出 - Service Worker通知を使用')
          const registration = await navigator.serviceWorker.ready
          console.log('Service Worker ready:', registration)
          await registration.showNotification('テスト通知', {
            body: '通知が正常に動作しています！',
            icon: '/vite.svg',
            badge: '/vite.svg',
            requireInteraction: true,
            vibrate: [200, 100, 200],
            tag: 'test-notification'
          })
          console.log('Service Worker通知送信成功')
          setNotificationStatus('テスト送信済み (Service Worker) - 通知を確認してください')
        } else {
          // PC・デスクトップの場合は通常の通知
          console.log('PC検出 - 通常の通知を使用')
          new Notification('テスト通知', {
            body: '通知が正常に動作しています！',
            icon: '/vite.svg',
            tag: 'test-notification'
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
        const addedTask = await addTask(newTask)
        
        // 期限がある場合は通知をスケジュール
        if (dueDateValue && addedTask) {
          await scheduleTaskNotification(addedTask)
        }
        
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
      // 通知をキャンセル
      cancelTaskNotification(taskId)
      await removeTask(taskId)
    } catch (error) {
      setError('タスクの削除に失敗しました')
    }
  }

  const handleToggleTask = async (taskId, currentCompleted) => {
    try {
      setError(null)
      await updateTask(taskId, { completed: !currentCompleted })
      
      // タスクが完了になった場合は通知をキャンセル
      if (!currentCompleted) {
        cancelTaskNotification(taskId)
      }
      // タスクが未完了に戻った場合は通知を再スケジュール
      else {
        const task = tasks.find(t => t.id === taskId)
        if (task && task.dueDate) {
          scheduleTaskNotification(task)
        }
      }
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
      
      {/* PWAインストール促進バナー */}
      {showInstallPrompt && !isInstalled && (
        <div className="install-banner">
          <div className="install-banner-content">
            <h3>📱 アプリとしてインストール</h3>
            <p>ホーム画面に追加すると通知が正常に動作します</p>
            <div className="install-banner-buttons">
              <button className="install-button" onClick={handleInstallPWA}>
                インストール
              </button>
              <button className="install-dismiss-button" onClick={() => setShowInstallPrompt(false)}>
                後で
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="debug-info">
        <h3>🔧 デバッグ情報</h3>
        <div className="debug-item">ブラウザ: {browserInfo}</div>
        <div className="debug-item">通知状態: {notificationStatus}</div>
        <div className="debug-item">PWAインストール済み: {isInstalled ? 'はい' : 'いいえ'}</div>
        <div className="debug-item">Service Worker: {'serviceWorker' in navigator ? '対応' : '非対応'}</div>
        <div className="debug-item">Push API: {'PushManager' in window ? '対応' : '非対応'}</div>
        <div className="debug-item">モバイル判定: {isMobile() ? 'モバイル' : 'デスクトップ'}</div>
        <div className="debug-item">プッシュ通知状態: {pushNotificationStatus}</div>
        <div className="debug-item">プッシュ購読済み: {pushSubscribed ? 'はい' : 'いいえ'}</div>
        <div className="debug-buttons">
          <button className="test-notification-button" onClick={testNotification}>
            ローカル通知テスト
          </button>
          {isInstalled && (
            <>
              <button 
                className="push-subscription-button" 
                onClick={togglePushSubscription}
                disabled={pushNotificationStatus.includes('中...')}
              >
                {pushSubscribed ? 'プッシュ通知解除' : 'プッシュ通知有効化'}
              </button>
              {pushSubscribed && (
                <button 
                  className="test-push-button" 
                  onClick={testPushNotification}
                >
                  プッシュ通知テスト
                </button>
              )}
            </>
          )}
        </div>
      </div>
      
      {/* 通知設定ガイダンス */}
      {(Notification.permission === 'denied' || notificationStatus.includes('拒否')) && (
        <div className="notification-help">
          <h3>📢 通知設定ガイド</h3>
          
          {/* Android Chrome 向け詳細ガイド */}
          {isMobile() && browserInfo.includes('Chrome') && (
            <div className="android-guide">
              <h4>🤖 Android Chrome の設定手順</h4>
              <ol>
                <li><strong>PWAインストール:</strong> 「ホーム画面に追加」が必要</li>
                <li><strong>ブラウザ設定:</strong> Chrome → ⋮ → 設定 → サイトの設定 → 通知 → 許可</li>
                <li><strong>Android設定:</strong> 設定 → アプリ → Chrome → 通知 → オン</li>
                <li><strong>アプリ設定:</strong> ホーム画面のアプリ → 長押し → アプリ情報 → 通知 → オン</li>
                <li><strong>おやすみモード:</strong> 設定 → サウンド → おやすみモード → オフ</li>
              </ol>
            </div>
          )}
          
          {/* 一般的なブラウザ設定 */}
          <div className="browser-guide">
            <h4>🌐 ブラウザ別設定</h4>
            <div><strong>Chrome:</strong> アドレスバーの🔒アイコン → 通知 → 許可</div>
            <div><strong>Safari:</strong> Safari → 設定 → Webサイト → 通知</div>
            <div><strong>Firefox:</strong> アドレスバーの🛡️アイコン → 通知許可</div>
            <div><strong>Edge:</strong> アドレスバーの🔒アイコン → 通知</div>
          </div>
          
          {/* トラブルシューティング */}
          <div className="troubleshooting">
            <h4>❓ 通知が来ない場合</h4>
            <ul>
              <li>PWAとしてインストールされているか確認</li>
              <li>ブラウザとデバイスの通知許可を確認</li>
              <li>バッテリー最適化の対象外に設定</li>
              <li>おやすみモード・サイレントモードを無効化</li>
              <li>ページを開いたまま5分以上放置して確認</li>
            </ul>
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
      
      {/* シンプル通知テストボタン */}
      <div className="simple-notification-section" style={{ margin: '20px 0', padding: '15px', backgroundColor: '#e8f5e8', borderRadius: '8px', fontSize: '14px' }}>
        <h4>🔔 シンプル通知システム（確実動作！）</h4>
        
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
          <button 
            onClick={() => simpleNotificationService.playSound()}
            style={{ 
              padding: '8px 16px', 
              backgroundColor: '#28a745', 
              color: 'white', 
              border: 'none', 
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            🔔 音声テスト
          </button>
          
          <button 
            onClick={() => simpleNotificationService.vibrate()}
            style={{ 
              padding: '8px 16px', 
              backgroundColor: '#17a2b8', 
              color: 'white', 
              border: 'none', 
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            📳 バイブテスト
          </button>
          
          <button 
            onClick={() => simpleNotificationService.showPopup('📱 テスト通知', 'シンプルなポップアップ通知です！', { type: 'success' })}
            style={{ 
              padding: '8px 16px', 
              backgroundColor: '#ffc107', 
              color: '#212529', 
              border: 'none', 
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            💬 ポップアップテスト
          </button>
        </div>
        
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
          <button 
            onClick={() => simpleNotificationService.showFullNotification('🎯 フル通知テスト', '音声+バイブ+ポップアップのテストです！')}
            style={{ 
              padding: '8px 16px', 
              backgroundColor: '#dc3545', 
              color: 'white', 
              border: 'none', 
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            🎯 フル通知テスト
          </button>
          
          <button 
            onClick={() => simpleNotificationService.showTaskDueNotification('重要な会議の準備')}
            style={{ 
              padding: '8px 16px', 
              backgroundColor: '#6f42c1', 
              color: 'white', 
              border: 'none', 
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            ⏰ タスク期限通知テスト
          </button>
        </div>
        
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button 
            onClick={() => {
              setTimeout(() => {
                simpleNotificationService.showTaskDueNotification('10秒テスト用タスク')
              }, 10000)
              simpleNotificationService.showPopup('⏰ 10秒後通知', '10秒後にタスク期限通知を送信します', { type: 'info', duration: 3000 })
            }}
            style={{ 
              padding: '8px 16px', 
              backgroundColor: '#fd7e14', 
              color: 'white', 
              border: 'none', 
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            ⏱️ 10秒後テスト
          </button>
          
          <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px' }}>
            <input 
              type="checkbox" 
              checked={simpleNotificationService.isEnabled}
              onChange={(e) => simpleNotificationService.setEnabled(e.target.checked)}
            />
            通知有効
          </label>
        </div>
        
        <div style={{ marginTop: '10px', fontSize: '11px', color: '#666' }}>
          💡 このシステムは通知許可不要で確実に動作します（音声+バイブ+ポップアップ）
        </div>
      </div>
    </div>
  )
}

export default App
