# Instruction: Phase 5 — クラウド自動バックアップ(DEC-006)

- Priority: 🔴(データ喪失2件を受けた恒久対策)
- 発行: PM / 2026-07-18
- 前提: main最新(ISS-014ローカル強化と併存し、二重安全網とする)
- 決定: DEC-006 = DEC-000(ローカル完結)を部分改訂。ローカルファーストは維持し、
  バックアップ用途に限りSupabaseを導入する。フル同期はしない

## 接続情報(公開可能な値・リポジトリ直置きでよい)

- SUPABASE_URL: `https://emzgkwvxjhdimqqndpmv.supabase.co`
- SUPABASE_PUBLISHABLE_KEY: `sb_publishable_dvPANDvOHxu3Ir9oW8CpUQ_DMOdizob`
- publishableキーの安全性はRLS前提。**全テーブル/バケットにRLS必須**(下記SQL)

## アーキテクチャ

- ローカル(Dexie)が常に正。クラウドは「最新スナップショットの保管庫」
- トレセッション保存成功のたびに、既存のエクスポートJSON生成ロジックを再利用して
  Supabase Storageへアップロード(`backups/{user_id}/latest.json`。直前版を `previous.json` に退避=世代2つ)
- オフライン時はスキップし、次回オンライン起動時に未同期なら自動アップロード
- 復元: ログイン後「クラウドから復元」ボタン → latest.jsonを取得し既存インポート処理(全置換・二段確認)へ

## 要件

1. **認証(メール+パスワード)**: `@supabase/supabase-js` 導入。設定に「クラウドバックアップ」セクションを新設し、
   未ログイン時: 登録/ログインフォーム(登録は `shouhoku.ammrs@gmail.com` 用の1回きり想定・招待制等は不要)。
   ログイン状態は自動維持(supabase-jsのデフォルト)。ログアウト導線も設置
2. **自動アップロード**: セッション保存成功時に非同期実行(UIをブロックしない)。
   成否をトースト+設定に「最終クラウド同期」日時表示。失敗時は次回起動時に再試行
3. **手動操作**: 設定に「今すぐバックアップ」「クラウドから復元」ボタン
4. **セットアップSQL**: `docs/engineering/setup/supabase_setup.sql` を作成(Storageバケット作成+
   本人のuser_idのみ読み書き可のRLSポリシー)。EiichiがSQL Editorに貼るだけで完了する形にし、
   handoffの【Eiichiアクション】に手順を記載
5. **Eiichiアクション最小化**: 必要な手動作業は
   (a) Supabase Authentication設定で「Confirm email」をOFF(トグル1つ・手順をhandoffに記載)
   (b) 上記SQLの貼り付け実行
   (c) アプリ内で登録1回 — の3点のみに収めること
6. テスト: アップロード/復元/オフラインスキップ/未ログイン時は完全に従来動作、をモックでユニットテスト。
   supabase-jsは遅延読み込みし、未ログイン時のバンドル・起動性能への影響を最小化

## 受け入れ条件

- [ ] ログイン→トレ保存→Supabase Storageにlatest.jsonが載る(手順をhandoffに記載しEiichi実機確認)
- [ ] 「クラウドから復元」で全データが戻る(previous.json世代退避も確認)
- [ ] 機内モードでトレ保存→エラーなし→オンライン起動で自動同期
- [ ] 未ログイン時は現行と完全同一動作
- [ ] テストgreen、mainへのPR作成まで
