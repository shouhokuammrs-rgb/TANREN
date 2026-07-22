# Handoff: DEC-007 — 「余裕あり」判定を最終セット基準に変更

- 日付: 2026-07-20
- 担当: Engineer(Claude Code)
- 対応指示書: `docs/engineering/instructions/ins_slack_final_set.md`
- ブランチ: `claude/dec-007-slack-final-set`(DEC-006とは別PR)

【Eiichiアクション】PRマージのみ(DEC-006のPR #10 → 本PRの順でマージ推奨)

## 実装内容(仕様§1どおり)

- `suggestWeightReps`(`src/engine/progression.ts`)の2ステップ増量判定を変更:
  - 変更前: `const anySlack = recordedSets.some((s) => s.hadSlack === true)`(どのセットの余裕でも発火)
  - 変更後: `const lastSetSlack = recordedSets[recordedSets.length - 1].hadSlack === true`(**最終記録セットのみ**)
  - `recordedSets` は `reps !== undefined` でフィルタ済みのため、末尾要素=最後に記録されたセット(仕様§1-2)
- 関数ドキュメンテーションコメントを「最終記録セットの余裕のみが信号(途中セットの余裕は疲労が乗っていないため不採用)」に更新
- **変更しないもの(仕様の補足どおり)**: `atFailure` の `some` 判定(途中セットの限界も増量保留の正当な信号・非対称のまま)/データモデル(`hadSlack` セット単位)/UI(セットごとのワンタップ)/レップ先行の原則

## テスト(§2・全126本green)

1. 最終セット余裕+全セット上限到達 → 2ステップ増量(11.5→14.5kg)※既存ケースを最終セット基準に更新
2. **新規**: 1セット目のみ余裕(最終セットなし)+上限到達 → 通常の1ステップ(11.5→13kg)
3. 最終セット余裕でも上限未達 → 増量しない(レップ先行の回帰)※最終セット基準に更新
4. 連続2回の2ステップ後の3回目 → 1ステップ(既存・単一セット履歴のため変更不要)

tsc・oxlintクリーン。エンジンのみの変更でUI・DBへの影響なし。

## 備考

- 本ブランチはDEC-006ブランチの上に積んでいます(SSOTの決定表が両方で更新されるため)。PRのbaseは `claude/dec-006-recovery-first` になっており、**PR #10がマージされると自動的にbaseがmainに切り替わります**。マージ順は #10 → 本PR で
- SSOTにDEC-007を追記済み
