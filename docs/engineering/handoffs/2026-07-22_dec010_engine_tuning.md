# Handoff: DEC-010 — エンジン上級者設定+回復予測+短縮通知の対象行復活

- 日付: 2026-07-22
- 担当: Engineer(Claude Code)
- 対応指示書: `docs/engineering/instructions/ins_engine_tuning_settings.md`
- ブランチ: `claude/dec-010-engine-tuning`(DEC-007ブランチに積み)

【Eiichiアクション】PRマージのみ。**マージ順: #10(DEC-006)→ #11(DEC-007)→ 本PR**(前段がマージされるとbaseは自動でmainに切り替わります)

## 実装内容

### §2 上級者設定(エンジン純粋性維持が最重要)

- `EngineTuning` 型を新設し `EngineContext.tuning?` に追加(全フィールドoptional)。**エンジン関数はlocalStorageを一切読まず**、各所で `ctx.tuning?.x ?? デフォルト定数` で解決:
  - freshness: `effectiveRecoveryHours(muscle, setCount, tuning?)` — 大/小筋群それぞれのオーバーライドを`MUSCLE_SIZE`で振り分け(ボリューム補正係数はその上に掛かる)
  - selection: おまかせ回復下限 `freshnessReadyThreshold`
  - progression: `suggestWeightReps` に第7引数 `tuning?` を追加(ctxを受けない関数のため引数経由・指示書§2-2の裁量)。増量ステップと連続ジャンプ検知の両方に反映
  - menu: 基本セット数 `defaultSets`
- 許容範囲とデフォルトは `ENGINE_TUNING_RANGES`(constants/engine.ts)に集約。対象5項目のみ・他の定数は設定化しない
- 保存: `useLocalSetting` の1キー `engineTuning`。`loadEngineContext` が `loadEngineTuning()`(utils/engineTuning.ts)で読み込んで注入。保存時は `sanitizeEngineTuning` で**範囲外clamp+数値以外/未知キー除去+丸め**
- SettingsPage「🔧 上級者設定(エンジン調整)」: **折りたたみデフォルト閉**、各項目に範囲・デフォルト表示+1行説明、デフォルトから変更した値はmolten色で強調、**「↺ デフォルトに戻す」で全項目一括リセット**。クラウドバックアップ(DEC-008)対象外の注記あり

### §3-1 回復予測表示

- `hoursUntilRecovered(freshness, effectiveRecoveryHours)` を freshness.ts に追加(線形モデルの逆算・0未満クリップ)
- `GeneratedMenu.soonestRecovery`(除外部位のうち最短で回復する1部位+残り時間)をエンジンで算出。**tuningの回復時間オーバーライドを反映**
- 休養日ビューと短縮通知に1行表示: 24h未満「◯◯はあと約△時間で回復します」(時間は切り上げ・最小1時間)/24h以上「◯◯は明日以降に回復します」。達成グリーンのポジティブトーン

### §3-2 短縮通知時の対象行復活

- `GeneratedMenu.muscleSummary`(「今日の対象: 胸(回復100%)」)を `rationale` から分離して追加。短縮時はUIが通知チップの下に対象行を併記。通常時のrationaleは従来文のまま(回帰なし)

## §4 テスト(全142本green・tsc/oxlint/本番ビルドすべてクリーン)

1. tuning未指定→従来と同一挙動: 既存126本green維持+回帰ケース(sets=3)追加
2. 回復下限95 → freshness96%の部位がおまかせに含まれる(デフォルトでは休養日になる状況で対比)
3. 増量ステップ1 → 最終セット余裕でも1ステップ(+ステップ3 → 3段のケースも追加)
4. 基本セット数4 → 生成メニュー全種目sets=4
5. 回復時間オーバーライド → `muscleFreshnessMap`(36h設定で36h経過=100%)と `soonestRecovery`(48h設定で残り12h)の両方に反映
6. `hoursUntilRecovered` 境界: 0%→全時間/100%→0/50%×48h→24h(表示分岐の境界)/100%超→0
- 追加: `sanitizeEngineTuning` のclamp・丸め・不正値除去、`muscleSummary` 分離の検証
- E2E(Chromium 390px)9チェック全パス: 折りたたみデフォルト閉/5項目+説明表示/範囲外500→120にclamp保存/localStorage永続化・リロード後保持/リセットで全デフォルト+ストレージ空

## SSOT

- DEC-009(成長可視化の主指標=e1RM)・DEC-010を追記し、決定表をDEC番号順に整列

## 備考

- 回復予測の丸めは「時間単位に切り上げ・最小1時間」とした(裁量。「あと約0時間」を出さないため)
- `slackJumpSteps` 変更時は連続ジャンプ検知(暴走防止)の判定幅も同じ値を使う(検知条件の一貫性を優先)
- DEC-009はデザイン選定後のINS待ちのため、本PRではSSOT追記のみ(実装なし)
