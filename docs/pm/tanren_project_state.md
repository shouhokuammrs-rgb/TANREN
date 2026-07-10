# TANREN Project State(Single Source of Truth)

最終更新: 2026-07-10 / 更新者: Engineer(Phase 4 Part 1完了報告)

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

**v1.0リリース済み・定常運転(ドッグフーディング駆動)** — ISS-010対応のPRマージ+**正式ドメインの投入(`.env.production` の `VITE_PROD_HOST` 1行・Eiichi確認値が未伝達のため保留中)**が最後の作業。以降はEiichiの実トレ→ISS起票→PM指示書→Engineer対応のループで運用。リリースは `vX.Y.Z` タグ(手順: README)

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
- [x] 1-7 実機ドッグフーディング#1(Eiichi・実トレ1回)→フィードバック4件(ISS-004〜008)

### Phase 1.x: 改善スプリント(ドッグフーディングと並走)
- [x] 1.5 種目詳細シート+筋力キャリブレーション(ISS-001/002・PR #2)
- [x] 1.6 YouTube動画連携(ISS-003・PR #3)
- [x] 1.7 フィードバック#1対応(ISS-004〜008)→ handoff: `2026-07-10_phase1-7.md`

### Phase 2: 分析と成長実感(目安: 2セッション)
- [x] 2-1 初期セットアップウィザード+目標ボディ+写真登録(F-01)→ handoff: `2026-07-10_phase2.md`
- [x] 2-2 ギャップ分析(F-03)→ おまかせ生成に優先度スコア接続済み
- [x] 2-3 セッション後サマリー+PR検出(F-07)
- [x] 2-4 ダッシュボード(グラフ/フレッシュネスマップ)(F-07)
- [x] 2-5 写真比較ビュー(F-07)
- [x] 2-6 JSONエクスポート/インポート(F-08)+全データ削除

### Phase 3: AIモード(オプション・目安: 1セッション)
- [ ] 3-1 APIキー設定+写真コメント+自然言語ヒヤリング(F-09)

### Phase 4: デザイン磨き込み(Designer参加)
- [x] 4-1 デザイン方針策定(PM→Designer仕様書)→ 方針書+仕様書v1(DEC-005「炉心/スパークバースト」)
- [x] 4-2 UIリファイン適用(Engineer)→ handoff: `2026-07-10_phase4_part2.md`(実機レビュー待ち)
- [x] 4-3 正式名称決定(DEC-001)→ TANREN に決定(前倒しで完了)

## 4. 意思決定記録

| DEC# | 内容 | 決定者 | 日付 |
|------|------|--------|------|
| DEC-000 | PWA+ローカル保存+ルールベースエンジン(API回避)で構築 | Eiichi | 2026-07-10 |
| DEC-001 | 正式プロダクト名を **TANREN(鍛錬)** に決定(旧仮称: TETSU)。docs含め全置換済み | Eiichi | 2026-07-10 |
| DEC-002 | ダンベル刻みはアプリ内ウィザードで生成+タップ修正(実物確認タスク廃止) | Eiichi/PM | 2026-07-10 |
| DEC-003 | 種目動画は自前作成せずYouTube活用(検索導線+公式embed登録)。DL・再ホストなし | Eiichi/PM | 2026-07-10 |
| DEC-004 | Phase 3(AIモード)は保留。Phase 4(データ保全+デザイン)を先行 | Eiichi/PM | 2026-07-10 |

## 5. オープン課題

| ISS# | 内容 | 優先度 | 状態 |
|------|------|--------|------|
| ISS-001 | 種目名だけでは何の運動かわからない→種目詳細シート | 🔴 | 対応済み(Phase 1.5・PR #2) |
| ISS-002 | 初期筋力の入力手段がなく初期重量提案がズレる→筋力キャリブレーション | 🔴 | 対応済み(Phase 1.5・PR #2) |
| ISS-003 | 種目の動画解説が欲しい→YouTube連携(検索導線+登録・埋め込み) | 🟡 | 対応済み(Phase 1.6) |
| ISS-004 | セット記録UIの意味明確化(記録/限界でした/達成・調整中の色分け) | 🟡 | 対応済み(Phase 1.7) |
| ISS-005 | 2種目以降でタイマー音が鳴らない(iOS AudioContext) | 🔴 | 実装済み・**実機確認待ち**(Phase 1.7) |
| ISS-006 | 最終セット後のインターバル廃止(終了フォームへ直行) | 🟡 | 対応済み(Phase 1.7) |
| ISS-007 | 睡眠・食事のコンディション入力(ヒヤリング側・折りたたみ) | 🟡 | 対応済み(Phase 1.7)※生成ロジック反映は将来ISS |
| ISS-008 | ログ削除機能 | 🟢 | 対応済み(Phase 1.7) |
| ISS-009 | データ保全(storage.persist/プレビューURL警告/エクスポートリマインダー) | 🔴 | 対応済み(Phase 4 Part 1) |
| ISS-010 | 本番URLで警告バナーが常時表示(本番ホストのハードコード) | 🔴 | 対応済み(VITE_PROD_HOST環境変数化)。**正式ドメイン値の投入待ち**(.env.production 1行・Eiichi/PM) |

## 6. 運用ルール(要約)

- 本ファイルがSSOT。全セッションの開始時にPMが必読
- 指示書: `docs/engineering/instructions/YYYY-MM-DD_<topic>.md`
- 完了報告: `docs/engineering/handoffs/YYYY-MM-DD_<topic>.md`
- セッションログ: `docs/pm/session-logs/YYYY-MM-DD_session-N.md`
- 微修正は ISS-XXX として本ファイルに起票→PMが指示書化→Engineerが対応(Eiichiは「ここ微妙」と言うだけでOK)
- 詳細は `docs/skills/tanren-pm/SKILL.md` 参照
