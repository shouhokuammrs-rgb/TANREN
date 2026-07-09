# TANREN Project State(Single Source of Truth)

最終更新: 2026-07-10 / 更新者: Engineer(Phase 1完了報告)

---

## 1. チーム編成

| 役割 | 担当 | 連携方法 |
|------|------|----------|
| **Owner** | Eiichi | 重要判断のみ。橋渡し作業はしない |
| **PM** | Claude(Web/App版・tanren-pmスキル) | 要件・WBS・レビュー・指示書作成。コードは書かない |
| **Engineer** | Claude Code | 実装・テスト。`docs/engineering/` 経由で指示を受ける |
| **Designer** | Claude(Web版デザイン機能/Artifacts) | Phase 4で本格参加。`docs/design/` 経由 |
| **QA** | Claude Code(実装とは別セッション) | Phase完了ごとにレビュー観点書ベースで検証 |

**最優先原則: Eiichi工数最小化**。Eiichiの担当は (1)意思決定 (2)実機ドッグフーディング(=トレすること💪) (3)Vercel/GitHubアカウント操作のみ。

## 2. 現在フェーズ

**Phase 1(実装完了・ドッグフーディング待ち)** — 次アクション: EiichiがPRマージ→実機ドッグフーディング#1(WBS 1-7)。PMは種目マスタと決定事項をレビュー(`docs/engineering/handoffs/2026-07-10_phase1.md`)

## 3. WBS

### Phase 0: 基盤(目安: Claude Code 1セッション)
- [x] 0-1 GitHubリポジトリ作成(Eiichi・5分)
- [x] 0-2 Vite+React+TS+Tailwind+PWA scaffold(Engineer)→ handoff: `2026-07-10_phase0.md`
- [x] 0-3 Dexie.js セットアップ+データモデル定義(Engineer)→ 同上
- [ ] 0-4 Vercel連携・デプロイ確認(Eiichi 10分+Engineer)

### Phase 1: MVP「今日から使える」(目安: 2-3セッション)🔴
- [x] 1-1 種目マスタ37種目シード(Engineer→PMレビュー)→ handoff: `2026-07-10_phase1.md`
- [x] 1-2 器具設定画面(F-02)→ 同上(DEC-002はウィザードで解決)
- [x] 1-3 メニュー生成エンジン v1(F-04: 回復モデル/重量提案/インターバル+ユニットテスト43本)
- [x] 1-4 その日のヒヤリング画面(3タップ入力)
- [x] 1-5 ワークアウト実行画面+インターバルタイマー(F-05)
- [x] 1-6 ログ保存(F-06全項目)
- [ ] 1-7 実機ドッグフーディング#1(Eiichi・実トレ1回)→フィードバック

### Phase 2: 分析と成長実感(目安: 2セッション)
- [ ] 2-1 初期セットアップウィザード+目標ボディ+写真登録(F-01)
- [ ] 2-2 ギャップ分析(F-03)
- [ ] 2-3 セッション後サマリー+PR検出(F-07)
- [ ] 2-4 ダッシュボード(グラフ/フレッシュネスマップ)(F-07)
- [ ] 2-5 写真比較ビュー(F-07)
- [ ] 2-6 JSONエクスポート/インポート(F-08)

### Phase 3: AIモード(オプション・目安: 1セッション)
- [ ] 3-1 APIキー設定+写真コメント+自然言語ヒヤリング(F-09)

### Phase 4: デザイン磨き込み(Designer参加)
- [ ] 4-1 デザイン方針策定(PM→Designer仕様書)
- [ ] 4-2 UIリファイン適用(Engineer)
- [x] 4-3 正式名称決定(DEC-001)→ TANREN に決定(前倒しで完了)

## 4. 意思決定記録

| DEC# | 内容 | 決定者 | 日付 |
|------|------|--------|------|
| DEC-000 | PWA+ローカル保存+ルールベースエンジン(API回避)で構築 | Eiichi | 2026-07-10 |
| DEC-001 | 正式プロダクト名を **TANREN(鍛錬)** に決定(旧仮称: TETSU)。docs含め全置換済み | Eiichi | 2026-07-10 |

## 5. オープン課題

| ISS# | 内容 | 優先度 | 状態 |
|------|------|--------|------|
| — | まだなし | — | — |

## 6. 運用ルール(要約)

- 本ファイルがSSOT。全セッションの開始時にPMが必読
- 指示書: `docs/engineering/instructions/YYYY-MM-DD_<topic>.md`
- 完了報告: `docs/engineering/handoffs/YYYY-MM-DD_<topic>.md`
- セッションログ: `docs/pm/session-logs/YYYY-MM-DD_session-N.md`
- 微修正は ISS-XXX として本ファイルに起票→PMが指示書化→Engineerが対応(Eiichiは「ここ微妙」と言うだけでOK)
- 詳細は `docs/skills/tanren-pm/SKILL.md` 参照
