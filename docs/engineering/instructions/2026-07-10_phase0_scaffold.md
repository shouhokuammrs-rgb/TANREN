# Instruction: Phase 0 — プロジェクト基盤構築

- Phase: 0
- Priority: 🔴
- 発行: PM / 2026-07-10

## 目的

TANREN(家トレコーチPWA)の開発基盤を作り、Vercelで空アプリが表示される状態まで持っていく。

## 前提(必読)

1. リポジトリルートの `CLAUDE.md`
2. `docs/pm/01_requirements.md`(特に §3 技術スタック、§7 データモデル)
3. `docs/pm/tanren_project_state.md`

## 要件

1. Vite + React + TypeScript + Tailwind CSS でscaffold
2. vite-plugin-pwa 導入(manifest: 名称"TANREN"、テーマカラーは仮でOK、standalone表示)
3. Dexie.js 導入。要件§7のデータモデルをスキーマ定義(profiles / goals / equipment / exercises / sessions / session_exercises / sets / photos / body_stats / injuries)
4. `src/engine/` ディレクトリを作成し、空のエンジンモジュール雛形+Vitestセットアップ(サンプルテスト1本がgreenであること)
5. ルーティング雛形: ホーム / 今日のトレ / ログ / 設定 の4タブ(中身は仮でOK、モバイル下部タブナビ)
6. Eiichi器具の初期シード(要件§4): 可変ダンベル2.5-24kg 15段階×2、ベンチ-20°〜90°、自重

## 受け入れ条件

- [ ] `npm run dev` でモバイル幅(390px)で4タブが表示される
- [ ] `npm run test` がgreen
- [ ] iPhoneのSafariで「ホーム画面に追加」するとstandaloneで起動する
- [ ] Dexieスキーマにシードデータが投入され、設定タブに器具一覧が仮表示される

## Eiichiアクション(handoffに再掲すること)

- GitHubリポジトリ作成+このdocs一式の配置(約5分)
- Vercelでリポジトリをインポートしデプロイ(約10分)

## 完了報告

`docs/engineering/handoffs/YYYY-MM-DD_phase0.md` を作成し、state.mdのWBS 0-2〜0-3にチェックを入れてpush。
