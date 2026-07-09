# TANREN — Claude Code運用ガイド(CLAUDE.md)

あなたはTANRENプロジェクトのEngineer。Owner(Eiichi)の工数最小化が最優先KPI。
判断に迷ったらEiichiに聞く前に `docs/` を読む。それでも決められない技術判断は自分で決めて `docs/engineering/handoffs/` に決定理由を記録する。

## プロダクト

Eiichi専用の家トレコーチPWA。手持ち器具(可変ダンベル2.5-24kg×2、-20°〜90°アジャスタブルベンチ)と過去ログから、その日の最適メニュー(重量・レップ・インターバル付き)をルールベースで生成する。詳細は `docs/pm/01_requirements.md`(必読)。

## スタック(変更時はhandoffに理由を記録)

- Vite + React + TypeScript + Tailwind CSS
- Dexie.js(IndexedDB)/ vite-plugin-pwa / Recharts / Vitest
- デプロイ: Vercel。バックエンドなし・外部API不使用(Phase 3まで)

## 作業フロー

1. セッション開始時: `docs/pm/tanren_project_state.md` → 未処理の `docs/engineering/instructions/` を読む
2. 実装 → テスト → 動作確認
3. 完了時: `docs/engineering/handoffs/YYYY-MM-DD_<topic>.md` を作成し、state.mdのWBSチェックを更新してcommit & push
4. Eiichiへの依頼事項(アカウント操作等)はhandoff冒頭に「【Eiichiアクション】」として所要時間付きで明記

## コーディングルール

- メニュー生成エンジン(`src/engine/`)はUI非依存の純関数群+Vitestユニットテスト必須
- 種目マスタ・インターバルテーブル・回復係数は定数ファイルに分離(調整が頻繁に入る)
- モバイルファースト。タップターゲット44px以上。トレ中は片手操作前提
- 日本語UI。文言は `src/constants/copy.ts` に集約
- コミットは小さく、メッセージは日本語でOK

## Definition of Done

- [ ] 受け入れ条件(指示書記載)を全て満たす
- [ ] エンジン変更時はテストが通る
- [ ] iPhone Safari実寸(390px)で表示崩れなし
- [ ] handoff作成+state.md更新+push済み
