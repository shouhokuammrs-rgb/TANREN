# INS: 部位別ゴールモデル 前半(DEC-013 / Phase 7-5a)

- 発行: PM / 2026-08-01
- 対象: Engineer(Claude Code)
- スコープ: **データモデル+進捗計算+動的優先度エンジン+維持モード生成調整+ゴール設定UI(5b)**
- スコープ外(後半INSで実施): 成長ビューへのゴールライン+進捗軸統合、鏡チェックフロー、セッション後サマリーの到達演出
- 必読: SSOT DEC-013 / `docs/pm/phase7_goal_model_concept.md` / `docs/pm/phase7_strength_standards_research.md` §3 / `docs/design/handoff/5b_goal_model_handoff.md`(寸法・状態・トークンの正) / `docs/design/handoff/TANREN-handoff.md`(鋼色トークン)
- 運用: DEC-014(main直push・テスト/tsc/lint/ビルド全green必須)

## 1. データモデル(Dexie)

新テーブル `muscleGoals`(部位PK・5部位のみ: chest/back/shoulders/arms/legs):

```ts
{
  muscle: MuscleGroup            // PK
  level: 'toned' | 'solid' | 'big'   // 引き締め/しっかり/がっつり
  coef: number                   // 体重比係数。プリセット選択時は係数表の値、直接編集時は 編集kg÷編集時点体重 を保存
  mode: 'growth' | 'maintain'    // 前半では常に 'growth'(maintainへの遷移は後半の鏡チェック)
  updatedAt: Date
}
```

- **直接編集も係数化して保存する**(固定kg保存禁止)。体重連動の原則(DEC-013)を編集値にも適用するため
- ゴール未設定の部位はレコードなし(=未設定状態)

## 2. 定数(constants/goals.ts 新設)

```ts
GOAL_COEF: { chest: {toned:0.35, solid:0.50, big:0.70}, back: {…0.35/0.55/0.75}, shoulders: {…0.25/0.40/0.55}, arms: {…0.15/0.30/0.50}, legs: {…0.25/0.40/0.60} }
```

- 器具上限はハードコードせず導出: `equipmentE1RmCap = maxDumbbellKg × (1 + E1RM_REP_CLAMP / 30)`(現24kg→33.6kg。将来の器具拡張に自動追従)
- 年齢係数はv1=1.0固定(定数として置くだけでよい)

## 3. 進捗計算(engine/goal.ts 新設・純関数のみ)

- `targetE1Rm(coef, bodyWeightKg)` — 最新body_stats体重で都度計算
- `startE1Rm` — **保存しない導出値**: 現行基準種目(growth.tsの選定ロジック再利用)の全期間最古の実ログe1RM。実ログゼロの部位は `undefined`(進捗未表示・ゴールのみ)
- `goalProgress(start, current, target)` → `{ ratio, remainingKg }`。ratio = clamp((current−start)/(target−start), 0, 1)。start≧target は即1.0。表示形式「N% ・ あとNkg」
- `isCapped(target)` = target > equipmentE1RmCap
- 腹・尻はゴール対象外(関数に渡さない)。腹のレップ指標(ISS-018)とは接続しない

## 4. 動的優先度(F-03置き換え)

- 現行の固定係数(WANT_BOOST / AVOID_FACTOR)を **優先度 = f(ギャップ)** に置き換える:
  - `gapRatio = max(0, (target − current) / target)`
  - `goalPriority = clamp(0.4 + 1.2 × gapRatio, 0.4, 1.6)`(定数はconstants/goals.tsで定数化)
  - `mode === 'maintain'` → 固定 0.4
  - ゴール未設定の部位・対象外部位(尻・腹)→ 中立 1.0
- 選択式 `フレッシュネス × 優先度` の構造・injuryハード除外は不変(selection.tsのインターフェース維持)
- 既存のwant/avoidタグUI・データは**削除せず読み捨て**(後方互換。削除判断は実機確認後にISS)
- スケール感が既存選択ロジックと噛み合わない場合は勝手に式を変えず、係数調整案をPM確認事項としてhandoffへ

## 5. 維持モードの生成調整(menu.ts)

- `mode === 'maintain'` の部位: 種目数1・セット数−1(下限1)
- 増量提案は継続するが**2ステップジャンプ(DEC-007「余裕あり」)は不適用**
- 前半ではmaintainに入る導線がない(後半の鏡チェックで遷移)ため、ユニットテストでのみ検証されればよい

## 6. ゴール設定UI(設定画面・5b「目盛」)

- 視覚仕様の正は `5b_goal_model_handoff.md`。寸法・座標・トークンは仕様書どおり(独自判断で変えない)。鋼色トークン2色(#C9B79C/#57503F)をテーマに追加
- 5部位×ゲージ一望+体重ステッパー(±0.5kg・タップ領域44pxに拡張・body_statsへ保存)。体重変更でノッチ/目標kg/進捗/capped連動、上限帯33.6kg固定
- 状態1〜3(未設定/選択中/capped)は完全実装。**状態4(到達)は表示のみ**(行タップの鏡チェック遷移は後半)、状態5(維持)はスタイル定義のみ実装し到達経路なしでよい
- レベル選択でゲージ直下に生活言語キャプション1行(文言は仕様書§3の表を使用)。体脂肪率注記はフッター1回
- 直接編集: 数値キーボード・0.5kg刻み丸め・保存は係数化(§1)。前面に出しすぎない(仕様書の配置どおり)
- 尻・腹はUIに出さない

## 7. テスト

- goal.ts全関数(進捗クランプ・start未定義・capped境界33.6・直接編集の係数化)
- 動的優先度(gapRatio→係数マッピング・maintain固定値・未設定中立)
- menu維持モード調整(種目1・セット−1下限・2ステップ不適用)
- 既存全テスト回帰なし

## 8. 完了条件

- 設定画面でゴール設定→おまかせ生成の頻度・ボリュームがギャップ連動で変わることを確認できる
- handoff作成+SSOT更新(WBS 7-5を前半/後半に分割し前半✔)+main push
- 判断に迷った点はPM確認事項としてhandoffへ(実装で勝手に解決しない)
