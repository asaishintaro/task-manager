# PWA強化機能 - 実装計画書

## 📋 実装概要

この実装計画では、PWA強化機能を段階的に実装し、Android Chromeでの通知問題を根本的に解決します。

### 実装アプローチ
- **段階的実装**: 機能を4つのフェーズに分けて実装
- **機能優先**: Phase 1でAndroid通知問題を即座に解決
- **リスク最小化**: 各フェーズでテスト・検証を実施
- **後方互換性**: 既存機能を破壊せずに拡張

## 🚀 Phase 1: 基本プッシュ通知実装 (Priority: High)

### Phase 1 目標
Android Chromeでの通知問題を解決し、基本的なプッシュ通知機能を実装する。

### 1.1 Firebase Cloud Messaging 設定
**推定時間**: 30分  
**担当**: Claude Code  

#### タスク詳細
1. **Firebase プロジェクト設定**
   ```bash
   # Firebase CLIインストール (必要に応じて)
   npm install -g firebase-tools
   
   # Firebase設定の確認
   firebase --version
   ```

2. **FCM SDK追加**
   ```bash
   # プロジェクトにFCM追加
   npm install firebase
   ```

3. **VAPID鍵生成**
   - Firebase Console > プロジェクト設定 > Cloud Messaging
   - ウェブプッシュ証明書の生成
   - 公開鍵をコードに組み込み

4. **firebase-messaging-sw.js作成**
   ```javascript
   // public/firebase-messaging-sw.js
   importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js')
   importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js')
   
   firebase.initializeApp({
     // Firebase設定
   })
   
   const messaging = firebase.messaging()
   ```

### 1.2 PushNotificationService 実装
**推定時間**: 2時間  
**担当**: Claude Code

#### ファイル作成: `src/services/pushNotificationService.js`
```javascript
// プッシュ通知サービスの実装
class PushNotificationService {
  constructor() {
    this.vapidKey = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U'
    this.messaging = null
  }
  
  // FCM初期化
  async initializeMessaging()
  
  // プッシュ購読
  async subscribeToPush()
  
  // 購読解除
  async unsubscribeFromPush()
  
  // トークン取得
  async getToken()
  
  // フォアグラウンド通知ハンドリング
  onForegroundMessage()
}
```

#### 主要メソッド実装
1. **initializeMessaging()**
   - Firebase Messaging初期化
   - Service Worker登録確認
   - エラーハンドリング

2. **subscribeToPush()**
   - ユーザー権限確認
   - FCMトークン取得
   - Firestoreに購読情報保存

3. **getToken()**
   - VAPID鍵を使用したトークン取得
   - トークン変更の監視
   - リフレッシュ処理

### 1.3 Service Worker 拡張
**推定時間**: 1時間  
**担当**: Claude Code

#### ファイル更新: `public/sw.js`
既存のService Workerに以下機能を追加：

```javascript
// Firebase Messaging Service Worker統合
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js')

// プッシュ通知ハンドリング
self.addEventListener('push', (event) => {
  // プッシュデータ解析
  // 通知表示
  // ログ出力
})

// 通知クリック処理
self.addEventListener('notificationclick', (event) => {
  // アクション別処理
  // アプリ起動
  // タスク操作
})
```

### 1.4 App.jsx統合
**推定時間**: 1時間  
**担当**: Claude Code

#### 既存App.jsxの更新
1. **PushNotificationService import**
2. **プッシュ通知初期化**
   ```javascript
   useEffect(() => {
     if (isInstalled) {
       // PWAインストール後にプッシュ通知初期化
       pushNotificationService.initializeMessaging()
     }
   }, [isInstalled])
   ```

3. **プッシュ通知設定UI追加**
   - プッシュ通知有効/無効切り替え
   - 購読状況表示
   - テスト通知送信

### 1.5 テスト・検証
**推定時間**: 1時間  
**担当**: Claude Code

#### テスト項目
1. **権限リクエスト確認**
2. **FCMトークン取得確認**
3. **プッシュ通知受信確認**
4. **通知クリック動作確認**
5. **Android Chromeでの動作確認**

**成功基準**: Android ChromeでPWAインストール後、プッシュ通知が正常に受信できる

---

## 🔄 Phase 2: 通知スケジューリング実装 (Priority: High)

### Phase 2 目標
タスクの期限に基づく自動通知スケジューリング機能を実装する。

### 2.1 NotificationScheduler 実装
**推定時間**: 2時間  

#### ファイル作成: `src/services/notificationScheduler.js`
```javascript
class NotificationScheduler {
  // 期限ベースの通知時刻計算
  calculateNotificationTimes(dueDate) {
    const times = []
    const due = new Date(dueDate)
    
    // 15分前
    times.push(new Date(due.getTime() - 15 * 60 * 1000))
    // 1時間前
    times.push(new Date(due.getTime() - 60 * 60 * 1000))
    // 1日前
    times.push(new Date(due.getTime() - 24 * 60 * 60 * 1000))
    
    return times.filter(time => time > new Date())
  }
  
  // スケジュール作成
  async createSchedule(task)
  
  // スケジュール更新
  async updateSchedule(taskId, newDueDate)
  
  // スケジュール削除
  async deleteSchedule(taskId)
}
```

### 2.2 Firestore Collections 追加
**推定時間**: 30分  

#### notificationSchedules Collection
```javascript
// 通知スケジュール用Firestoreコレクション
{
  taskId: string,
  dueDate: timestamp,
  notificationTimes: [{
    type: 'before_due',
    scheduledTime: timestamp,
    sent: boolean
  }],
  deviceTokens: [string],
  createdAt: timestamp
}
```

### 2.3 taskService.js 拡張
**推定時間**: 1時間  

#### 既存関数の更新
1. **addTask()** - スケジュール作成追加
2. **updateTask()** - スケジュール更新追加
3. **removeTask()** - スケジュール削除追加

### 2.4 バックエンド通知送信機能
**推定時間**: 3時間  

#### オプション A: Firebase Functions
```javascript
// functions/index.js
exports.sendScheduledNotifications = functions.pubsub
  .schedule('every 1 minutes')
  .onRun(async (context) => {
    // スケジュール済み通知を確認
    // FCMで通知送信
    // 送信フラグ更新
  })
```

#### オプション B: Vercel Serverless Functions
```javascript
// api/send-notifications.js
export default async function handler(req, res) {
  // cron-jobサービスから定期実行
  // Firebase Admin SDKで通知送信
}
```

### 2.5 通知設定UI
**推定時間**: 2時間  

#### 設定画面追加
1. **通知タイミング設定**
2. **通知タイプ選択**
3. **時間帯制限設定**

---

## 🔄 Phase 3: バックグラウンド同期実装 (Priority: Medium)

### Phase 3 目標
オフライン操作のバックグラウンド同期機能を実装する。

### 3.1 IndexedDB設定
**推定時間**: 2時間  

#### ファイル作成: `src/services/offlineStorageManager.js`
```javascript
class OfflineStorageManager {
  // IndexedDB初期化
  async initDB()
  
  // ローカルタスク保存
  async storeTaskLocally(task)
  
  // 同期待ちアクション記録
  async storePendingAction(action)
  
  // データ同期
  async syncWithServer()
}
```

### 3.2 SyncManager実装
**推定時間**: 3時間  

#### 同期ロジック実装
1. **オフライン検出**
2. **操作キューイング**
3. **競合解決**
4. **自動同期**

### 3.3 Service Worker Background Sync
**推定時間**: 2時間  

#### Background Sync API実装
```javascript
// Service Worker内
self.addEventListener('sync', (event) => {
  if (event.tag === 'task-sync') {
    event.waitUntil(syncTasks())
  }
})
```

---

## 🎨 Phase 4: 高度な機能・最適化 (Priority: Low)

### Phase 4 目標
ユーザー体験の向上と機能の最適化を行う。

### 4.1 通知カスタマイズ
**推定時間**: 2時間  
- 通知音設定
- バイブレーションパターン
- 通知アクション拡張

### 4.2 分析・レポート機能
**推定時間**: 3時間  
- 通知配信率統計
- ユーザー行動分析
- パフォーマンスメトリクス

### 4.3 パフォーマンス最適化
**推定時間**: 2時間  
- 通知配信最適化
- バッテリー消費削減
- ネットワーク効率化

---

## 📊 実装スケジュール

### 週1: Phase 1 (基本プッシュ通知)
- **月曜**: Firebase FCM設定・VAPID鍵生成
- **火曜**: PushNotificationService実装
- **水曜**: Service Worker拡張・App.jsx統合
- **木曜**: テスト・デバッグ・修正
- **金曜**: Android Chrome動作確認・調整

### 週2: Phase 2 (通知スケジューリング)
- **月曜**: NotificationScheduler実装
- **火曜**: Firestore拡張・taskService更新
- **水曜**: バックエンド通知送信機能
- **木曜**: 通知設定UI実装
- **金曜**: 統合テスト・調整

### 週3: Phase 3 (バックグラウンド同期)
- **月曜**: IndexedDB設定・OfflineStorageManager
- **火曜**: SyncManager実装・競合解決
- **水曜**: Background Sync API実装
- **木曜**: オフライン機能テスト
- **金曜**: 統合テスト・パフォーマンス確認

### 週4: Phase 4 (高度な機能)
- **月曜**: 通知カスタマイズ機能
- **火曜**: 分析・レポート機能
- **水曜**: パフォーマンス最適化
- **木曜**: 最終テスト・品質確認
- **金曜**: ドキュメント更新・リリース

## 🎯 成功指標・検証基準

### Phase 1 成功指標
- [ ] Android ChromeでPWAインストール後、プッシュ通知受信率95%以上
- [ ] FCMトークン取得成功率99%以上
- [ ] 通知クリックからアプリ起動成功率95%以上

### Phase 2 成功指標
- [ ] 期限通知の送信成功率95%以上
- [ ] 通知タイミングの精度±2分以内
- [ ] ユーザー設定に基づく通知制御100%

### Phase 3 成功指標
- [ ] オフライン操作の同期成功率99%以上
- [ ] 競合解決の自動処理率90%以上
- [ ] ネットワーク復帰後の同期完了時間30秒以内

### Phase 4 成功指標
- [ ] 通知配信の最適化による電池消費20%削減
- [ ] ユーザー満足度4.5/5.0以上
- [ ] アプリ継続使用率30%向上

## ⚠️ リスク・対応策

### 技術的リスク
1. **FCM配信制限**: Firebase無料枠の制限 → 使用量監視・有料プラン検討
2. **ブラウザ互換性**: 一部ブラウザでの制限 → フォールバック機能実装
3. **通知ブロック**: ユーザーによる通知無効化 → 設定ガイダンス強化

### 実装リスク
1. **スケジュール遅延**: 複雑な機能による遅延 → MVP優先・段階的リリース
2. **既存機能の破損**: 新機能による既存機能への影響 → 徹底したテスト実施
3. **パフォーマンス劣化**: 新機能による重量化 → パフォーマンス監視・最適化

## 📝 次のアクション

### 即座に実行 (今日)
1. **Firebase プロジェクトの設定確認**
2. **VAPID鍵の生成**
3. **FCM SDKの追加**

### 今週中に実行
1. **PushNotificationService の実装**
2. **Service Worker の拡張**
3. **基本プッシュ通知のテスト**

### 承認が必要な項目
- [ ] Firebase Functions 使用の承認 (コスト発生の可能性)
- [ ] 外部通知サービス利用の承認
- [ ] プッシュ通知の送信内容・タイミングの承認

## 📚 参考資料

### 技術文書
- [Firebase Cloud Messaging Documentation](https://firebase.google.com/docs/cloud-messaging)
- [Web Push Protocol RFC8030](https://tools.ietf.org/rfc/rfc8030.txt)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)

### 実装例
- [PWA Push Notifications Example](https://github.com/GoogleChrome/samples/tree/gh-pages/push-messaging-and-notifications)
- [Firebase FCM Web Example](https://github.com/firebase/quickstart-js/tree/master/messaging)