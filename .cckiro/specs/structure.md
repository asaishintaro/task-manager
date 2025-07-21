# Project Structure

## プロジェクト全体構成
```
task-manager/
├── .cckiro/specs/          # 仕様駆動開発ドキュメント
├── public/                 # 静的ファイル・PWA設定
├── src/                    # ソースコード
├── node_modules/           # 依存関係
├── README.md              # プロジェクト説明
├── DEVELOPMENT_LOG.md     # 開発履歴
├── CLAUDE.md             # Claude Code設定
└── 設定ファイル群         # package.json, vite.config.js等
```

## 詳細ファイル構成

### `/src` - アプリケーションコア
```
src/
├── App.jsx                 # メインアプリケーションコンポーネント
├── App.css                 # アプリケーション全体のスタイル
├── main.jsx               # エントリーポイント・Service Worker登録
├── index.css              # グローバルCSS・リセットスタイル
├── firebase.js            # Firebase設定・初期化
├── taskService.js         # Firestoreタスク操作・通知ロジック
├── notificationService.js # 通知システム・プラットフォーム検出
└── assets/
    └── react.svg          # Reactロゴ
```

### `/public` - PWA・静的リソース
```
public/
├── index.html             # HTMLテンプレート
├── manifest.json          # PWA設定
├── sw.js                  # Service Worker
├── icon-192.png          # PWAアイコン（192x192）
├── icon-512.png          # PWAアイコン（512x512）
├── icon.svg              # SVGアイコン
├── task-icon.svg         # タスクアイコン
└── vite.svg              # Viteロゴ
```

### `/.cckiro/specs` - 仕様駆動開発
```
.cckiro/specs/
├── product.md             # プロダクト概要
├── tech.md               # 技術スタック
├── structure.md          # プロジェクト構造（このファイル）
└── [feature]/            # 機能別仕様（将来作成）
    ├── requirements.md   # 要件定義
    ├── design.md         # 設計書
    └── tasks.md          # 実装タスク
```

## 主要コンポーネント

### App.jsx
- **役割**: メインUIコンポーネント・状態管理
- **機能**: タスク表示・追加・削除・完了切り替え・期限管理
- **状態管理**: React hooks (useState, useEffect)

### taskService.js
- **役割**: Firestoreとの通信・通知トリガー
- **機能**: CRUD操作・リアルタイム同期・期限チェック

### notificationService.js
- **役割**: プラットフォーム別通知処理
- **機能**: 権限管理・デバイス検出・通知送信

### sw.js (Service Worker)
- **役割**: PWA機能・オフライン対応・通知処理
- **機能**: キャッシュ管理・バックグラウンド通知

## データフロー

```
User Input → App.jsx → taskService.js → Firebase Firestore
                    ↓
                notificationService.js → Browser/SW Notification
                    ↓
            Real-time Updates → App.jsx → UI Update
```

## 設定ファイル

### package.json
- 依存関係管理
- スクリプト定義（dev, build, preview）
- プロジェクトメタデータ

### vite.config.js
- Vite設定
- ビルド最適化
- 開発サーバー設定

### eslint.config.js
- コード品質管理
- リンティングルール

## セキュリティ・権限

### Firebase Security Rules
- Firestoreアクセス制御
- 認証なしでも読み書き可能（現在の設定）
- 将来的に認証機能追加予定

### ブラウザ権限
- 通知権限（Notification API）
- Service Worker登録権限
- ローカルストレージアクセス

## 拡張性の考慮

### コンポーネント分割（将来計画）
```
src/
├── components/
│   ├── TaskList.jsx
│   ├── TaskItem.jsx
│   ├── AddTask.jsx
│   └── Header.jsx
├── hooks/
│   ├── useTasks.js
│   └── useNotifications.js
├── utils/
│   ├── dateHelpers.js
│   └── constants.js
└── styles/
    ├── components/
    └── global/
```

### モジュール化方針
- 機能別ファイル分割
- 再利用可能なhooks
- 設定の外部化
- TypeScript移行準備