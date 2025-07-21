import { getMessagingInstance, VAPID_KEY } from '../firebase.js'
import { getToken, onMessage } from 'firebase/messaging'

class PushNotificationService {
  constructor() {
    this.subscription = null
    this.token = null
    this.isInitialized = false
    this.messaging = null
  }

  // Firebase Messaging初期化
  async initializeMessaging() {
    try {
      console.log('[PushNotificationService] 初期化開始')
      
      // Messagingインスタンス取得
      this.messaging = await getMessagingInstance()
      if (!this.messaging) {
        console.warn('[PushNotificationService] Firebase Messaging未対応')
        return false
      }

      // Service Worker確認
      if (!('serviceWorker' in navigator)) {
        console.warn('[PushNotificationService] Service Worker未対応')
        return false
      }

      // Service Worker登録確認
      const registration = await navigator.serviceWorker.getRegistration()
      if (!registration) {
        console.warn('[PushNotificationService] Service Worker未登録')
        return false
      }

      // フォアグラウンドメッセージのリスナー設定
      this.setupForegroundMessageHandler()
      
      this.isInitialized = true
      console.log('[PushNotificationService] 初期化完了')
      return true
      
    } catch (error) {
      console.error('[PushNotificationService] 初期化エラー:', error)
      return false
    }
  }

  // プッシュ通知購読
  async subscribeToPush() {
    try {
      console.log('[PushNotificationService] プッシュ購読開始')
      
      if (!this.isInitialized) {
        const initialized = await this.initializeMessaging()
        if (!initialized) {
          throw new Error('Firebase Messaging初期化失敗')
        }
      }

      // 通知権限確認
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        throw new Error(`通知権限が拒否されました: ${permission}`)
      }

      // FCMトークン取得
      const token = await getToken(this.messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: await navigator.serviceWorker.getRegistration()
      })

      if (!token) {
        throw new Error('FCMトークンの取得に失敗しました')
      }

      this.token = token
      console.log('[PushNotificationService] FCMトークン取得成功:', token)

      // トークンをローカルストレージに保存
      localStorage.setItem('fcm_token', token)
      
      // TODO: トークンをFirestoreに保存（後で実装）
      await this.savePushSubscriptionToFirestore(token)

      return { success: true, token }
      
    } catch (error) {
      console.error('[PushNotificationService] プッシュ購読エラー:', error)
      return { success: false, error: error.message }
    }
  }

  // プッシュ購読解除
  async unsubscribeFromPush() {
    try {
      console.log('[PushNotificationService] プッシュ購読解除開始')
      
      // ローカルストレージからトークン削除
      localStorage.removeItem('fcm_token')
      
      // TODO: Firestoreから購読情報削除（後で実装）
      
      this.token = null
      this.subscription = null
      
      console.log('[PushNotificationService] プッシュ購読解除完了')
      return { success: true }
      
    } catch (error) {
      console.error('[PushNotificationService] プッシュ購読解除エラー:', error)
      return { success: false, error: error.message }
    }
  }

  // 現在のFCMトークン取得
  async getToken() {
    try {
      if (this.token) {
        return this.token
      }

      // ローカルストレージから取得を試行
      const savedToken = localStorage.getItem('fcm_token')
      if (savedToken) {
        this.token = savedToken
        return savedToken
      }

      // 新規取得
      const result = await this.subscribeToPush()
      return result.success ? result.token : null
      
    } catch (error) {
      console.error('[PushNotificationService] トークン取得エラー:', error)
      return null
    }
  }

  // 購読状況確認
  isPushSubscribed() {
    return !!this.token || !!localStorage.getItem('fcm_token')
  }

  // フォアグラウンドメッセージハンドラー設定
  setupForegroundMessageHandler() {
    if (!this.messaging) return

    onMessage(this.messaging, (payload) => {
      console.log('[PushNotificationService] フォアグラウンドメッセージ受信:', payload)
      
      const { title, body, icon } = payload.notification || {}
      const { taskId, type } = payload.data || {}

      // フォアグラウンドでは手動で通知表示
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.showNotification(title || 'タスク通知', {
            body: body || 'タスクに関する通知があります',
            icon: icon || '/icon-192.png',
            badge: '/icon-192.png',
            tag: `task-${taskId}`,
            data: { taskId, type },
            actions: [
              { action: 'open', title: 'アプリを開く' },
              { action: 'dismiss', title: '閉じる' }
            ],
            requireInteraction: true,
            vibrate: [200, 100, 200]
          })
        })
      }
    })
  }

  // Firestoreにプッシュ購読情報を保存
  async savePushSubscriptionToFirestore(token) {
    try {
      // TODO: 認証機能実装後にユーザーIDを使用
      const deviceId = this.getDeviceId()
      
      const subscriptionData = {
        token,
        deviceId,
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        createdAt: new Date(),
        lastUsed: new Date(),
        isActive: true
      }

      console.log('[PushNotificationService] 購読情報をFirestoreに保存:', subscriptionData)
      
      // TODO: Firestoreに保存する実装（後で追加）
      // await addDoc(collection(db, 'pushSubscriptions'), subscriptionData)
      
    } catch (error) {
      console.error('[PushNotificationService] Firestore保存エラー:', error)
    }
  }

  // デバイスID生成（簡易版）
  getDeviceId() {
    let deviceId = localStorage.getItem('device_id')
    if (!deviceId) {
      deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
      localStorage.setItem('device_id', deviceId)
    }
    return deviceId
  }

  // デバッグ情報取得
  getDebugInfo() {
    return {
      isInitialized: this.isInitialized,
      hasToken: !!this.token,
      isSubscribed: this.isPushSubscribed(),
      messagingSupported: !!this.messaging,
      serviceWorkerSupported: 'serviceWorker' in navigator,
      notificationPermission: Notification?.permission,
      savedToken: !!localStorage.getItem('fcm_token'),
      deviceId: this.getDeviceId()
    }
  }

  // テスト通知送信（開発用）
  async sendTestNotification() {
    try {
      if (!this.isPushSubscribed()) {
        throw new Error('プッシュ通知が購読されていません')
      }

      // Service Workerから直接通知を送信
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready
        await registration.showNotification('プッシュ通知テスト', {
          body: 'FCMプッシュ通知が正常に動作しています！',
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          tag: 'test-push-notification',
          data: { type: 'test' },
          actions: [
            { action: 'open', title: 'アプリを開く' },
            { action: 'dismiss', title: '閉じる' }
          ],
          requireInteraction: true,
          vibrate: [200, 100, 200]
        })
        
        console.log('[PushNotificationService] テスト通知送信完了')
        return { success: true }
      }
      
    } catch (error) {
      console.error('[PushNotificationService] テスト通知送信エラー:', error)
      return { success: false, error: error.message }
    }
  }
}

// シングルトンインスタンス
const pushNotificationService = new PushNotificationService()

export default pushNotificationService