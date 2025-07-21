# PWA強化機能 - 設計書

## 1. アーキテクチャ概要

### システム構成図
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Firebase      │    │   Notification  │
│   (React PWA)   │◄──►│   Firestore     │    │   Service       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Service Worker  │    │ Firebase FCM    │    │ Push Manager    │
│ (Push Handler)  │◄──►│ (Cloud Message) │◄──►│ (Browser API)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 技術スタック拡張
- **既存**: React + Vite + Firebase Firestore + Service Worker
- **追加**: Firebase Cloud Messaging (FCM) + Push API + Background Sync API + IndexedDB

## 2. コンポーネント設計

### 2.1 プッシュ通知システム

#### PushNotificationService クラス
```javascript
class PushNotificationService {
  // VAPID鍵設定
  static VAPID_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U'
  
  // プッシュ購読の初期化
  async initializePushSubscription()
  
  // 購読情報をFirestoreに保存
  async savePushSubscription(subscription)
  
  // 購読解除
  async unsubscribePush()
  
  // FCM管理トークンの取得
  async getFCMToken()
  
  // 通知スケジュールの設定
  async scheduleNotification(taskId, dueDate, notificationType)
}
```

#### NotificationScheduler クラス
```javascript
class NotificationScheduler {
  // 期限ベースの通知計算
  calculateNotificationTimes(dueDate)
  
  // Firebase Functions向けスケジュール作成
  createSchedulePayload(task, notificationTimes)
  
  // スケジュールの更新・削除
  async updateSchedule(taskId, newDueDate)
  async deleteSchedule(taskId)
}
```

### 2.2 バックグラウンド同期システム

#### SyncManager クラス
```javascript
class SyncManager {
  // オフライン操作の記録
  async recordOfflineAction(action, data)
  
  // 同期キューの管理
  async addToSyncQueue(operation)
  async processSyncQueue()
  
  // 競合解決
  async resolveConflicts(localData, serverData)
  
  // 同期状況の監視
  getSyncStatus()
}
```

#### OfflineStorageManager クラス
```javascript
class OfflineStorageManager {
  // IndexedDBでのローカルストレージ
  async storeTaskLocally(task)
  async getLocalTasks()
  async deleteLocalTask(taskId)
  
  // 同期待ちアクションの管理
  async storePendingAction(action)
  async getPendingActions()
  async clearPendingAction(actionId)
}
```

### 2.3 通知設定管理

#### NotificationSettingsManager クラス
```javascript
class NotificationSettingsManager {
  // デフォルト設定
  static DEFAULT_SETTINGS = {
    pushNotifications: true,
    localNotifications: true,
    beforeDueTimes: [15, 60], // 15分前、1時間前
    overdueEnabled: true,
    overdueDelayTimes: [60, 1440], // 1時間後、1日後
    quietHours: { start: '22:00', end: '08:00' },
    soundEnabled: true,
    vibrationEnabled: true
  }
  
  // 設定の保存・読み込み
  async saveSettings(settings)
  async loadSettings()
  
  // 設定に基づく通知判定
  shouldSendNotification(type, time)
  getNotificationTiming(dueDate)
}
```

## 3. データベース設計

### 3.1 Firestore Collections拡張

#### pushSubscriptions Collection
```javascript
// Document ID: userId (将来の認証機能用) または deviceId
{
  endpoint: string,           // プッシュエンドポイント
  keys: {
    p256dh: string,          // 公開鍵
    auth: string             // 認証シークレット
  },
  userAgent: string,         // ブラウザ情報
  createdAt: timestamp,      // 登録日時
  lastUsed: timestamp,       // 最終使用日時
  isActive: boolean          // アクティブ状態
}
```

#### notificationSchedules Collection
```javascript
// Document ID: scheduleId
{
  taskId: string,            // 対象タスクID
  dueDate: timestamp,        // タスク期限
  notificationTimes: [       // 通知予定時刻の配列
    {
      type: 'before_due',    // 通知タイプ
      scheduledTime: timestamp,
      sent: boolean
    }
  ],
  deviceIds: [string],       // 通知対象デバイス
  createdAt: timestamp,
  updatedAt: timestamp
}
```

#### syncQueue Collection (ローカルオフライン用)
```javascript
// Document ID: actionId
{
  type: 'create' | 'update' | 'delete',
  collection: 'tasks',
  documentId: string,
  data: object,              // 操作データ
  timestamp: timestamp,      // 操作時刻
  deviceId: string,          // 操作元デバイス
  synced: boolean,           // 同期完了フラグ
  retryCount: number         // リトライ回数
}
```

### 3.2 IndexedDB設計 (ローカルストレージ)

#### Database: taskManagerDB

**ObjectStore: tasks**
```javascript
{
  id: string,              // タスクID
  text: string,            // タスクテキスト
  completed: boolean,      // 完了状態
  dueDate: Date,           // 期限
  lastModified: timestamp, // 最終更新時刻
  syncStatus: 'synced' | 'pending' | 'conflict'
}
```

**ObjectStore: pendingActions**
```javascript
{
  id: string,              // アクションID
  type: string,            // 操作タイプ
  data: object,            // 操作データ
  timestamp: timestamp,    // 作成時刻
  retryCount: number       // リトライ回数
}
```

**ObjectStore: notificationSettings**
```javascript
{
  id: 'settings',          // 固定ID
  settings: object,        // 設定オブジェクト
  lastUpdated: timestamp   // 最終更新時刻
}
```

## 4. Service Worker設計

### 4.1 拡張機能

#### プッシュ通知ハンドリング
```javascript
// sw.js内の新機能
self.addEventListener('push', async (event) => {
  const data = event.data ? event.data.json() : {}
  
  // 通知データの解析
  const { title, body, taskId, type, actions } = data
  
  // 通知オプション設定
  const options = {
    body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: `task-${taskId}`,
    data: { taskId, type },
    actions: [
      { action: 'complete', title: '完了' },
      { action: 'snooze', title: '後で' }
    ],
    requireInteraction: true,
    vibrate: [200, 100, 200]
  }
  
  // 通知表示
  event.waitUntil(
    self.registration.showNotification(title, options)
  )
})
```

#### 通知クリック処理
```javascript
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  
  const { taskId, type } = event.notification.data
  const action = event.action
  
  if (action === 'complete') {
    // タスク完了処理
    event.waitUntil(completeTask(taskId))
  } else if (action === 'snooze') {
    // スヌーズ処理
    event.waitUntil(snoozeTask(taskId))
  } else {
    // アプリを開く
    event.waitUntil(openApp())
  }
})
```

#### バックグラウンド同期
```javascript
self.addEventListener('sync', (event) => {
  if (event.tag === 'task-sync') {
    event.waitUntil(syncTasks())
  }
})

async function syncTasks() {
  // IndexedDBから未同期データを取得
  const pendingActions = await getPendingActions()
  
  for (const action of pendingActions) {
    try {
      await processAction(action)
      await removePendingAction(action.id)
    } catch (error) {
      // エラー処理・リトライロジック
      await updateRetryCount(action.id)
    }
  }
}
```

## 5. Firebase Functions設計 (オプション)

### 5.1 通知スケジューリング関数

```javascript
// functions/index.js
exports.scheduleNotifications = functions.firestore
  .document('tasks/{taskId}')
  .onWrite(async (change, context) => {
    const { taskId } = context.params
    const newData = change.after.data()
    const oldData = change.before.data()
    
    // 期限が変更された場合
    if (newData?.dueDate !== oldData?.dueDate) {
      await updateNotificationSchedule(taskId, newData.dueDate)
    }
    
    // タスクが削除された場合
    if (!change.after.exists) {
      await deleteNotificationSchedule(taskId)
    }
  })

exports.sendScheduledNotifications = functions.pubsub
  .schedule('every 1 minutes')
  .onRun(async (context) => {
    const now = admin.firestore.Timestamp.now()
    
    // 送信予定の通知を取得
    const notifications = await getScheduledNotifications(now)
    
    for (const notification of notifications) {
      await sendPushNotification(notification)
      await markNotificationAsSent(notification.id)
    }
  })
```

## 6. セキュリティ設計

### 6.1 VAPID鍵管理
- 環境変数での秘密鍵管理
- フロントエンドでは公開鍵のみ使用
- 定期的な鍵ローテーション計画

### 6.2 プッシュデータの暗号化
- 機密情報を含む場合の暗号化
- 最小限の情報のみ送信
- タスク詳細はアプリ起動後に取得

### 6.3 購読管理
- 無効なエンドポイントの自動削除
- デバイス登録の重複防止
- アクセス制御の実装

## 7. パフォーマンス設計

### 7.1 効率的な同期
- 差分のみの送信
- バッチ処理による一括更新
- 競合解決の最適化

### 7.2 通知配信の最適化
- タイムゾーン考慮
- バッテリー消費の最小化
- 不要な通知の自動削除

### 7.3 オフライン性能
- IndexedDBの効率的な利用
- キャッシュ戦略の最適化
- ネットワーク復帰時の高速同期

## 8. テスト設計

### 8.1 単体テスト
- PushNotificationService のメソッドテスト
- SyncManager の同期ロジックテスト
- 通知スケジューリングの計算テスト

### 8.2 統合テスト
- Firebase FCMとの連携テスト
- Service Workerとの通信テスト
- オフライン・オンライン切り替えテスト

### 8.3 E2Eテスト
- プッシュ通知の受信確認
- バックグラウンド同期の動作確認
- 複数デバイス間での同期確認

## 9. エラーハンドリング

### 9.1 プッシュ通知エラー
- 購読失敗時のフォールバック
- FCMエラーの分類と対処
- リトライロジックの実装

### 9.2 同期エラー
- 競合解決の失敗処理
- ネットワークエラーの処理
- データ整合性の保証

### 9.3 ユーザー体験の保護
- エラー時のユーザー通知
- 機能の段階的な劣化
- 復旧時の自動回復

## 10. 監視・メトリクス

### 10.1 主要指標
- プッシュ通知の配信成功率
- バックグラウンド同期の成功率
- 通知からアプリ起動率
- オフライン期間の測定

### 10.2 ログ設計
- 通知送信ログ
- 同期処理ログ
- エラー発生ログ
- ユーザー行動ログ

## 11. 段階的リリース計画

### Phase 1: 基本プッシュ通知
- Firebase FCM設定
- 基本的なプッシュ通知送信
- 通知設定UI

### Phase 2: スケジューリング
- 期限ベースの通知スケジュール
- 複数タイミングでの通知
- 通知設定の詳細化

### Phase 3: バックグラウンド同期
- オフライン操作の記録
- 自動同期機能
- 競合解決機能

### Phase 4: 高度な機能
- 通知の最適化
- 分析・レポート機能
- パフォーマンス改善