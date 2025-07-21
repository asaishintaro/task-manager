// シンプルな通知システム（通知許可不要）
class SimpleNotificationService {
  constructor() {
    this.popupContainer = null
    this.audioContext = null
    this.isEnabled = true
  }

  // 通知を無効/有効にする
  setEnabled(enabled) {
    this.isEnabled = enabled
    console.log(`シンプル通知: ${enabled ? '有効' : '無効'}`)
  }

  // 音声アラートを再生
  async playSound() {
    if (!this.isEnabled) return

    try {
      // Web Audio API を使用したビープ音生成
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)()
      }

      const oscillator = this.audioContext.createOscillator()
      const gainNode = this.audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(this.audioContext.destination)
      
      // 通知音の設定（2音階のビープ音）
      oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime)
      oscillator.frequency.setValueAtTime(1000, this.audioContext.currentTime + 0.2)
      oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime + 0.4)
      
      gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.6)
      
      oscillator.start(this.audioContext.currentTime)
      oscillator.stop(this.audioContext.currentTime + 0.6)
      
      console.log('🔔 音声アラート再生成功')
    } catch (error) {
      console.error('🔔 音声アラートエラー:', error)
    }
  }

  // バイブレーション
  vibrate() {
    if (!this.isEnabled) return

    try {
      if ('vibrate' in navigator) {
        navigator.vibrate([200, 100, 200, 100, 200])
        console.log('📳 バイブレーション実行')
      }
    } catch (error) {
      console.error('📳 バイブレーションエラー:', error)
    }
  }

  // ポップアップ通知を表示
  showPopup(title, message, options = {}) {
    if (!this.isEnabled) return

    const {
      duration = 5000,
      type = 'info',
      actions = []
    } = options

    // ポップアップコンテナが存在しない場合は作成
    if (!this.popupContainer) {
      this.createPopupContainer()
    }

    // ポップアップ要素を作成
    const popup = document.createElement('div')
    popup.className = `notification-popup ${type}`
    popup.innerHTML = `
      <div class="popup-content">
        <div class="popup-header">
          <strong class="popup-title">${title}</strong>
          <button class="popup-close">&times;</button>
        </div>
        <div class="popup-body">${message}</div>
        ${actions.length > 0 ? `
          <div class="popup-actions">
            ${actions.map(action => `
              <button class="popup-action" data-action="${action.action}">
                ${action.title}
              </button>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `

    // スタイルを適用
    this.applyPopupStyles(popup, type)

    // イベントリスナーを追加
    this.addPopupEventListeners(popup, options.onAction)

    // コンテナに追加
    this.popupContainer.appendChild(popup)

    // アニメーション開始
    requestAnimationFrame(() => {
      popup.style.transform = 'translateY(0)'
      popup.style.opacity = '1'
    })

    // 自動で消去
    if (duration > 0) {
      setTimeout(() => {
        this.closePopup(popup)
      }, duration)
    }

    console.log('🎯 ポップアップ通知表示:', title)
    return popup
  }

  // ポップアップコンテナを作成
  createPopupContainer() {
    this.popupContainer = document.createElement('div')
    this.popupContainer.className = 'notification-container'
    this.popupContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      max-width: 350px;
      pointer-events: none;
    `
    document.body.appendChild(this.popupContainer)
  }

  // ポップアップスタイルを適用
  applyPopupStyles(popup, type) {
    const colors = {
      info: { bg: '#007bff', border: '#0056b3' },
      success: { bg: '#28a745', border: '#1e7e34' },
      warning: { bg: '#ffc107', border: '#e0a800', text: '#212529' },
      error: { bg: '#dc3545', border: '#c82333' },
      task: { bg: '#17a2b8', border: '#138496' }
    }

    const color = colors[type] || colors.info

    popup.style.cssText = `
      background: ${color.bg};
      color: ${color.text || 'white'};
      border: 2px solid ${color.border};
      border-radius: 8px;
      margin-bottom: 10px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      transform: translateY(-20px);
      opacity: 0;
      transition: all 0.3s ease;
      pointer-events: auto;
      max-width: 100%;
      overflow: hidden;
    `

    // 内部スタイル
    const content = popup.querySelector('.popup-content')
    if (content) {
      content.style.cssText = `
        padding: 12px 16px;
      `
    }

    const header = popup.querySelector('.popup-header')
    if (header) {
      header.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      `
    }

    const title = popup.querySelector('.popup-title')
    if (title) {
      title.style.cssText = `
        font-size: 16px;
        font-weight: bold;
      `
    }

    const closeBtn = popup.querySelector('.popup-close')
    if (closeBtn) {
      closeBtn.style.cssText = `
        background: none;
        border: none;
        color: inherit;
        font-size: 20px;
        cursor: pointer;
        padding: 0;
        line-height: 1;
        opacity: 0.8;
      `
      closeBtn.addEventListener('mouseover', () => closeBtn.style.opacity = '1')
      closeBtn.addEventListener('mouseout', () => closeBtn.style.opacity = '0.8')
    }

    const body = popup.querySelector('.popup-body')
    if (body) {
      body.style.cssText = `
        font-size: 14px;
        line-height: 1.4;
        margin-bottom: ${popup.querySelector('.popup-actions') ? '12px' : '0'};
      `
    }

    const actions = popup.querySelector('.popup-actions')
    if (actions) {
      actions.style.cssText = `
        display: flex;
        gap: 8px;
        margin-top: 12px;
      `

      popup.querySelectorAll('.popup-action').forEach(btn => {
        btn.style.cssText = `
          background: rgba(255,255,255,0.2);
          border: 1px solid rgba(255,255,255,0.3);
          color: inherit;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          transition: background 0.2s ease;
        `
        btn.addEventListener('mouseover', () => {
          btn.style.background = 'rgba(255,255,255,0.3)'
        })
        btn.addEventListener('mouseout', () => {
          btn.style.background = 'rgba(255,255,255,0.2)'
        })
      })
    }
  }

  // ポップアップイベントリスナーを追加
  addPopupEventListeners(popup, onAction) {
    // 閉じるボタン
    const closeBtn = popup.querySelector('.popup-close')
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.closePopup(popup)
      })
    }

    // アクションボタン
    popup.querySelectorAll('.popup-action').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = e.target.dataset.action
        if (onAction) {
          onAction(action)
        }
        this.closePopup(popup)
      })
    })
  }

  // ポップアップを閉じる
  closePopup(popup) {
    popup.style.transform = 'translateY(-20px)'
    popup.style.opacity = '0'
    
    setTimeout(() => {
      if (popup.parentNode) {
        popup.parentNode.removeChild(popup)
      }
    }, 300)
  }

  // すべてのポップアップを閉じる
  closeAllPopups() {
    if (this.popupContainer) {
      this.popupContainer.innerHTML = ''
    }
  }

  // 完全な通知（音声+バイブ+ポップアップ）
  async showFullNotification(title, message, options = {}) {
    if (!this.isEnabled) return

    console.log(`🎯 フル通知実行: ${title}`)
    
    // 音声アラート
    await this.playSound()
    
    // バイブレーション
    this.vibrate()
    
    // ポップアップ通知
    return this.showPopup(title, message, {
      ...options,
      type: options.type || 'task'
    })
  }

  // タスク期限通知（専用）
  async showTaskDueNotification(taskText, options = {}) {
    return this.showFullNotification(
      '⏰ タスクの期限です！',
      `"${taskText}" の期限になりました`,
      {
        type: 'task',
        duration: 10000, // 10秒間表示
        actions: [
          { action: 'complete', title: '完了にする' },
          { action: 'snooze', title: '5分後に再通知' },
          { action: 'dismiss', title: '閉じる' }
        ],
        ...options
      }
    )
  }
}

// シングルトンインスタンス
const simpleNotificationService = new SimpleNotificationService()

export default simpleNotificationService