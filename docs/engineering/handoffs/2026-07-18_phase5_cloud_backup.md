# Handoff: Phase 5 — クラウド自動バックアップ(DEC-006)

- 日付: 2026-07-18
- 担当: Engineer(Claude Code)
- 対応指示書: `docs/engineering/instructions/2026-07-18_phase5_cloud_backup.md`
- ブランチ: `claude/tetsu-tanren-rename-p25kvo`(PR作成済み)

## 【Eiichiアクション】3ステップで有効化(合計 約5分)

マージ&デプロイ後、以下の順で。**これを終えるまではアプリは従来どおり動きます**(未ログイン時は完全に従来動作)。

1. **Confirm emailをOFF**(約1分)
   Supabaseダッシュボード → プロジェクト → Authentication → Sign In / Providers → Email →「Confirm email」のトグルをOFF → Save
2. **セットアップSQLを実行**(約1分)
   ダッシュボード → SQL Editor → `docs/engineering/setup/supabase_setup.sql` の全文を貼り付け → Run
   (backupsバケット作成+本人のみ読み書き可のRLS。1回でOK・再実行しても安全)
3. **アプリ内で登録1回**(約1分)
   本番URL(tanren-lake.vercel.app)→ 設定 → ☁️クラウドバックアップ → メール `shouhoku.ammrs@gmail.com`+任意のパスワード(6文字以上)→「新規登録」
   → 直後に初回バックアップが自動実行され「☁️ クラウドへバックアップしました」トーストが出ます

### 実機確認手順(受け入れ条件の残り・約3分)

- **保存→クラウド反映**: トレを1回保存 → トースト表示 → ダッシュボード → Storage → backups → `{user_id}/latest.json` が更新されている(2回目以降は `previous.json` も残る=世代退避)
- **復元**: 設定 →「クラウドから復元」→ 確認2回 → 全データが戻る
- **オフライン**: 機内モードでトレ保存 → エラーなし・「オフラインのため保留」トースト → オンラインでアプリを開き直すと自動同期トースト

## 実装内容

### アーキテクチャ(指示書どおり)

- **ローカル(Dexie)が常に正**。クラウドは最新スナップショットの保管庫(フル同期なし)
- トレセッション保存成功(トレ終了・中断して保存の両方)のたびに、既存のエクスポートJSON生成(`exportBackup`)を再利用して `backups/{user_id}/latest.json` へ非同期アップロード。直前版は `previous.json` に退避(remove→copy→upsert uploadの3手順)
- オフライン時・失敗時はDexie settingsの `cloudSyncPending` を立ててスキップし、**次回起動時に自動再試行**(App起動フック)。設定画面には「未同期あり」バッジ表示
- 復元は latest.json を取得して**既存のインポート処理(全置換)**へ。実行前に二段確認

### 要件対応

1. **認証**: `@supabase/supabase-js` 導入。設定に「☁️クラウドバックアップ」セクション新設。未ログイン: メール+パスワードの登録/ログインフォーム(バリデーション付き)。ログイン状態はsupabase-jsデフォルトで自動維持。ログアウト導線あり
2. **自動アップロード**: 保存フローをブロックしない fire-and-forget。成否はトースト(成功=緑/保留=黄/失敗=赤)+設定に「最終クラウド同期」日時(Dexie settings保存・リアルタイム反映)
3. **手動操作**: 「今すぐバックアップ」「クラウドから復元」ボタンを設置
4. **セットアップSQL**: `docs/engineering/setup/supabase_setup.sql`(バケット作成+select/insert/update/delete全てを本人フォルダ限定にするRLS。`drop policy if exists`付きで再実行安全)
5. **Eiichiアクション**: 上記3点のみ
6. **テスト**: supabase-jsを最小インターフェース(`CloudClient`)に切り出し、モックで8本のユニットテスト(アップロード成功時の世代退避と同期記録/オフラインスキップ+pending/未ログイン時は設定にも触れない/失敗時pending/復元の全置換/復元失敗時ローカル無傷/未ログイン端末の即スキップ)。**supabase-jsは動的importの専用チャンク(約200KB)に分離**され、ログイン操作をするまで一切ロードされない(E2Eで確認)

### トースト基盤(新規)

成功/情報/失敗の3トーンの軽量トースト(`utils/toast.ts`+`components/Toast.tsx`、App直下に`ToastHost`)。今後の通知にも流用可

## 受け入れ条件の検証結果

- [x] ログイン→トレ保存→latest.jsonアップロード(ユニットテストで固定+**実機確認手順を上記に記載**)
- [x] 「クラウドから復元」で全データ復元・previous.json世代退避(ユニットテストで固定)
- [x] 機内モード保存→エラーなし→オンライン起動で自動同期(オフラインスキップ+pending再試行をユニットテストで固定)
- [x] **未ログイン時は現行と完全同一動作**(E2E 390px: トレ一周してsupabase通信ゼロ・チャンク未ロード・エラーなしを確認)
- [x] テストgreen(115本)、tsc/oxlint/本番ビルドすべてクリーン、mainへのPR作成

## 補足

- publishableキーとURLは指示書どおりリポジトリ直置き(`src/constants/cloud.ts`)。安全性はRLSで担保
- 未ログイン端末でsupabase-jsをロードしない旗として settings に `cloudEnabled` を保持(ログインで true / ログアウトで false)
- 定常#3(ISS-014 ローカルバックアップ強化)は**未着手のまま**。本Phase 5と二重安全網になる設計のため、次の指示で対応可能
