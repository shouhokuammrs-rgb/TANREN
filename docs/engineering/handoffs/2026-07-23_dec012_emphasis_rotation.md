# Handoff: DEC-012 — 部位内強調ローテーション

- 日付: 2026-07-23
- 担当: Engineer(Claude Code)
- 対応指示書: `docs/engineering/instructions/ins_emphasis_rotation.md`
- ブランチ: `claude/dec-012-emphasis-rotation`(main直分岐・PR作成済み)

【Eiichiアクション】PRマージ+マージ後のDelete branchのみ。下記「中立に残した種目」の判断に違和感があれば一言ください

## §1 データモデル

- `ExerciseEmphasis` 型を新設(upper/mid/lower・front/side/rear・biceps/triceps・quad/ham_glute の1つのunion)。`Exercise.emphasis?`(undefined=中立)
- マスタ **23種目にタグ付け**。既存DBへの反映は名前突合のマスタ同期の既存機構どおり(ユーザーのisActive・youtubeVideoIdsは無傷)

### 中立に残した種目(指示書「迷う種目は中立に残しハンドオフに列挙」)

| 種目 | 迷った理由 |
|---|---|
| デクラインプッシュアップ | 指示書ルールでは「デクライン系=lower」だが、プッシュアップは足上げ(デクライン)でインクラインプレスに近い角度になり**生理学的にはupper寄り**。ルールと実態が逆転するためタグ付けを保留。PM判断でupperに振るならワンライナーで対応可能 |
| ダンベルカーフレイズ | 脚のquad/ham_gluteのどちらでもない(カーフ)。区分の追加はDEC-012スコープ外のため中立 |
| 背中7種目・尻2種目・腹3種目 | 指示書どおりv1では部位ごと中立のまま |

## §2 エンジン

- `EngineContext.recentEmphasis?: Map<MuscleGroup, ExerciseEmphasis[]>`(新しい順)。DB層(`loadEngineContext`)が**部位を扱った直近3セッション**(`EMPHASIS_HISTORY_SESSIONS=3`・定数化)から組み立てる。エンジン純粋性は維持(ストレージ読み出しなし)
- 共通コンパレータ `compareCandidates` を新設し、優先順位を「①コンパウンド(現行維持・最上位)→ ②強調ローテーション → ③実績あり → ④ID(決定性)」に統一
- ローテーションスコア `emphasisRotationScore`: 未出現=0(最優先)、出現済みは古いほど優先(LRU)。**中立(undefined)は未出現と同順位**=この層で差を付けず次層(実績→ID)で決まる → 背中・腹・尻の並びは現行と完全一致(回帰テストで固定)
- `alternativesFor`(入れ替え候補)にも同一コンパレータを適用。※従来のalternativesForは「コンパウンド→ID」のみで実績層がなかったため、統一により**実績あり種目が入れ替え候補でも上に来る**ようになった(生成との一貫性を優先。指示書§2-3の趣旨どおり)

## §3 UI

- `MenuItem.emphasis` を追加し、WorkoutPageの種目行(部位・種別の行)に小さなチップで表示(「上部」「サイド」「三頭」等。`EMPHASIS_LABELS` をcopy.tsに集約)。中立種目はチップなし
- 強調カバレッジの可視化は**ISS-017として起票のみ**(実装なし)

## §4 テスト(全169本green・tsc/oxlint/本番ビルドクリーン)

1. LRU: 前回midなら未出現(upper/lower)が上位/新しい順[upper,mid]ならlower→mid→upperの順
2. 未出現の強調が最優先(スコア境界値も固定)
3. コンパウンド優先がローテーションより上位: 実マスタで「インクラインダンベルフライ(isolation・未出現)がダンベルベンチプレス(compound・出現済み)を追い越さない」を固定
4. 中立種目の回帰: recentEmphasisの有無で背中の並びが不変(実績→ID)
5. `alternativesFor`と`candidatesByMuscle`の並びの一貫性(先頭N件一致)
6. 既存158本の回帰維持+DB層テスト2本(直近3セッション窓・新しい順・中立部位はundefined)
- E2E(Chromium 390px)4チェック全パス: 前回フラットプレス(mid)→次回生成の先頭がインクラインダンベルプレス+「上部」チップ、2番目デクライン(lower)、入れ替え候補でもcompound優先維持

## SSOT

- DEC-012追記/ISS-017起票/WBSに定常#4追加+**採番注記: Phase 7ゴールモデル構想はDEC-013候補に繰り下げ**(衝突回避)

## 備考

- 実装済みログ(過去セッション)の種目にも同期後の`emphasis`が名前突合で付くため、**マージ直後の生成から即ローテーションが効きます**(履歴の書き換えは不要)
