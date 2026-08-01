# INS: PWA更新トースト(ISS-025)

- 発行: PM / 2026-08-01 / 対象: Engineer / 運用: DEC-014準拠

## 仕様
- 新しいService Workerの待機を検知したら、画面下に常駐トースト「更新があります — 再読み込み」を表示。タップで `skipWaiting`→リロード
- vite-plugin-pwaの `registerType: 'prompt'` +標準の更新フックを使用(自作SWロジック禁止)
- **実行中ワークアウト(/active)では表示を保留**し、セッション終了後に出す(タイマー中のリロード事故防止)
- トーストは既存Toastの流儀・鈍色系(緊急ではない)。閉じるボタンあり(閉じても次回起動時に再表示)

## テスト
表示条件のユニット(activeで保留→復帰で表示)。SW部分は実機確認に委ねてhandoffに確認手順を記載

## 完了条件
handoff+SSOT(ISS-025対応済み)+main push
