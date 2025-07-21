# Technology Stack

## フロントエンド
- **React 19.1.0** - メインフレームワーク
- **Vite 7.0.3** - ビルドツール・開発サーバー
- **CSS3** - スタイリング（CSS Modules未使用、グローバルCSS）
- **JavaScript (ES6+)** - プログラミング言語

## バックエンド・データベース
- **Firebase Firestore** - NoSQLデータベース・リアルタイム同期
- **Firebase SDK v9** - モジュラー型SDK使用

## PWA・Service Worker
- **Service Worker** - オフライン対応・通知機能
- **Web App Manifest** - PWA設定・ホーム画面追加
- **Cache API** - オフラインデータキャッシュ

## デプロイ・インフラ
- **Vercel** - ホスティング・CI/CD
- **GitHub** - ソースコード管理・自動デプロイトリガー

## 通知システム
- **Notification API** - ブラウザ通知（PC）
- **Service Worker通知** - モバイル対応通知
- **プラットフォーム検出** - デバイス別通知手法の自動切り替え

## 開発ツール
- **Claude Code** - AI支援開発・仕様駆動開発
- **VS Code** - エディタ（推奨）
- **Chrome DevTools** - デバッグ・パフォーマンス分析

## 技術選定理由

### React + Vite
- **高速な開発体験**: HMR (Hot Module Replacement)
- **モダンな開発環境**: ES6+、TypeScript対応（将来的移行可能）
- **軽量**: Create React Appより高速なビルド

### Firebase Firestore
- **リアルタイム同期**: onSnapshot による即座な変更反映
- **スケーラビリティ**: サーバーレス・自動スケーリング
- **セキュリティ**: Firestore Security Rules
- **オフライン対応**: 内蔵キャッシュ機能

### Vercel
- **簡単デプロイ**: GitHub連携による自動デプロイ
- **高速CDN**: 世界規模のエッジネットワーク
- **無料プラン**: 個人プロジェクトに適したコスト

## セキュリティ考慮事項
- Firebase Security Rules によるデータアクセス制御
- HTTPS強制（Vercel標準）
- XSS対策（React標準のエスケープ処理）

## パフォーマンス最適化
- Viteによる最適化されたバンドル
- Firebase Firestoreのクライアントキャッシュ
- Service Workerによるアセットキャッシュ
- 軽量なライブラリ選択（最小限の依存関係）

## 将来的な技術拡張計画
- **TypeScript導入** - 型安全性向上
- **React Native** - モバイルアプリ化
- **Electron** - デスクトップアプリ化
- **PWA Push Notifications** - より高度な通知機能