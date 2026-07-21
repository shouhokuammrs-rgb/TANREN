# INS: エンジン上級者設定(DEC-010)+ 回復予測 + 短縮通知の改善

- 作成者: PM (Claude web)
- 日付: 2026-07-22
- 対象: `src/constants/engine.ts` / `src/constants/recovery.ts` / `src/engine/*` / `src/pages/SettingsPage.tsx` / `src/pages/WorkoutPage.tsx`
- 関連: DEC-010、DEC-006フォローアップ2件、SSOT更新要

---

## 0. 決定事項(DEC-010)

エンジン調整定数のうち、体感調整の価値が高い4種を「上級者設定」としてアプリ内で変更可能にする。埋め込み定数はデフォルト値に降格する。

**設計原則: エンジンの純粋性を守る。** エンジン関数内でlocalStorageを読まないこと。オーバーライドは `EngineContext` に `tuning` として渡し、エンジンは `ctx.tuning?.x ?? DEFAULT_X` で解決する。

## 1. 対象の設定項目と許容範囲

| 項目 | デフォルト | 許容範囲 | 対応する現行定数 |
|---|---|---|---|
| 大筋群の基準回復時間(h) | 72 | 24〜120 | `RECOVERY_HOURS`(大) |
| 小筋群の基準回復時間(h) | 48 | 24〜120 | `RECOVERY_HOURS`(小) |
| おまかせ選択の回復下限(%) | 100 | 50〜100 | `FRESHNESS_READY_THRESHOLD` |
| 「余裕あり」時の増量ステップ数 | 2 | 1〜3 | `SLACK_JUMP_STEPS` |
| 基本セット数 | 3 | 2〜5 | `DEFAULT_SETS` |

- 範囲外の値は保存させない(UI側でclamp)
- **「デフォルトに戻す」ボタン必須**(全項目一括リセット)
- これ以外の定数(時間見積り・部位数テーブル等)は設定化しない

## 2. 実装方針

1. `EngineTuning` 型を新設し `EngineContext` に `tuning?: EngineTuning` を追加。全フィールドoptional
2. エンジン各所(freshness / selection / progression / menu)の定数参照を `ctx.tuning?.x ?? 定数` に変更。`suggestWeightReps` など `ctx` を受けない関数は引数経由で渡す(シグネチャ変更はEngineer裁量)
3. 保存は `useLocalSetting`(localStorage)で1キー(`engineTuning`)にまとめる。クラウドバックアップ(DEC-008)の対象外である旨をSettingsPage内に小さく注記
4. SettingsPage内に「上級者設定」セクションを追加。折りたたみ(デフォルト閉)とし、誤操作を防ぐ。各項目に1行の説明を付ける(例:「回復下限を95%にすると、ほぼ回復した部位もおまかせに含まれます」)
5. `EngineContext` を組む箇所で localStorage から tuning を読み込んで注入する

## 3. 小改善(DEC-006フォローアップ・ISS扱い)

### 3-1. 回復予測表示
- 線形回復モデルから「100%到達までの残り時間」を算出する純関数 `hoursUntilRecovered(freshness, effectiveRecoveryHours)` を `freshness.ts` に追加
- 休養日ビューと短縮通知に、**最短で回復する部位1つ**の予測を1行追加:
  - 24h未満: 「◯◯はあと約△時間で回復します」
  - 24h以上: 「◯◯は明日以降に回復します」
- 文言・丸め(時間単位)はEngineer裁量。tuningの回復時間オーバーライドを反映すること

### 3-2. 短縮通知時の対象行復活
- 現状、短縮時は `rationale` が通知文に置き換わり「今日の対象: 胸(回復100%)」が消える
- 短縮時も対象行を通知の下に併記する(`GeneratedMenu` に `muscleSummary` を分離するなど、構造はEngineer裁量)

## 4. テスト

1. tuning未指定 → 全デフォルトで従来と同一挙動(回帰・既存126本green維持)
2. 回復下限を95に緩和 → freshness 96%の部位がおまかせ選択に含まれる
3. 増量ステップ1 → 最終セット余裕ありでも1ステップ増量
4. 基本セット数4 → 生成メニューのsetsが4
5. 回復時間オーバーライドがfreshness計算と回復予測の両方に反映される
6. `hoursUntilRecovered` の境界(0%、100%、24h前後)

## 5. SSOT更新指示

- **DEC-009**: 成長可視化の主指標はe1RM(double progressionと整合)。総ボリュームは補助。デザインはClaude Design探索→選定後にINS化(2026-07-22, Eiichi承認)
- **DEC-010**: エンジン調整定数のうち回復時間(大/小)・おまかせ回復下限・増量ステップ・基本セット数を上級者設定としてアプリ内設定化。EngineContext経由のオーバーライド方式でエンジン純粋性を維持。デフォルト復帰ボタン付き(2026-07-22, Eiichi承認)

実装完了後、ハンドオフを `docs/engineering/handoffs/` に作成すること。
