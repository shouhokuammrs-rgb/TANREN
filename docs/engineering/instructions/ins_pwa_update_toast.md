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

## 追記(2026-08-01・Designer視覚指定+PM裁定)
- 表示保留は `/active` に加え **`/summary` も対象**(PR演出・鏡チェック判定を邪魔しないため)。表示タイミングは**ホーム復帰時**
- 視覚仕様: 位置=画面下・タブバー上に浮かせる(bottom: タブバー高+12px・タブバーを覆わない)/ コンテナ=背景#1A110B・枠#3A2213 1px・角丸12px・padding 12px 14px・左右マージン16px / テキスト=「更新があります」Noto 700 13px #D9CFC6+「再読み込み」Mono 700 12px #B06A3E(タップ領域は行全体)/ 閉じる=右端32×32(タップ領域44px)・✕ Mono 700 13px #6B5A4C / グロー・molten不使用(鈍色に留める)/ 出現=riseIn .3s ease-out(translateY 12px→0+fade)/ /active・/summary中は完全非表示(縮小表示もしない)
