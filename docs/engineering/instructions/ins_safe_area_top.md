# INS: 上端セーフエリア対応(ISS-027)

- 発行: PM / 2026-08-02 / 対象: Engineer / 運用: DEC-014準拠

## 背景
`viewport-fit=cover` に対し `safe-area-inset-top` が未適用(bottomはタブバー・モーダル・トーストで対応済み)。iPhoneのPWAスタンドアロンで全画面のヘッダーがステータスバー/Dynamic Island下に潜り込む(オーナー実機報告)。

## 仕様
1. **アプリシェル(レイアウト最上位)に `padding-top: env(safe-area-inset-top)` を一括適用**(画面ごとの個別対応にしない。1箇所で全タブ画面をカバー)
2. `fixed` 系の全画面要素を個別確認して同様に対応: GrowthPageのフルスクリーン推移(`fixed inset-0 pt-6` → `pt-[max(1.5rem,env(safe-area-inset-top))]`)、その他 `fixed` で上端に接する要素があれば同様
3. スクロール時にコンテンツがステータスバー領域を透過して見えるのが気になる場合は、上端に背景色の薄いカバー(bg-forge-black)を敷いてよい(裁量)
4. ブラウザ表示(非スタンドアロン)ではinsetが0になるだけで無害であることを確認

## テスト
E2Eはビューポートでinsetを再現できないため、シェルへの適用有無をユニット/スナップショットで固定。**実機確認はEiichi**(全タブ+成長フルスクリーンで上端が隠れないこと)——handoff冒頭に【Eiichiアクション】として記載

## 完了条件
handoff+SSOT(ISS-027対応済み)+main push
