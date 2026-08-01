# QAレポート: 部位別ゴールモデル 前半+後半(DEC-013 / Phase 7-5a・7-5b)

- 日付: 2026-08-01
- 担当: QAエンジニア(Claude Code・レビュー専任)
- 対象コミット: `6a2de19`(前半)/ `86b668d`(後半)@ main
- 検証基準: SSOT DEC-013 / `ins_goal_model_part1.md` / `ins_goal_model_part2.md` / `5b_goal_model_handoff.md`(2026-08-01 PM修正版)
- 実施内容: 仕様突き合わせ+コードレビュー+テスト追加5本(プロダクトコードは無変更)。全217テスト・tsc・lint green

【Eiichiアクション】なし(🟡1件はEngineerセッションでの1行修正を推奨)

## 総合判定

**出荷可**。係数・数式・境界・マイグレーション・バックアップは仕様と一致し、状態遷移の主要パスはすべて実装+イベント記録されている。🔴なし・🟡1件(状態4マーカーの消失経路)・🟢5件(防御的・稀ケース)。

## 指摘事項

### 🟡 QA-1: 設定画面の保存で `reachedAt`(状態4)が黙って消える

- **箇所**: `src/db/queries.ts` `saveMuscleGoal`(Dexie `put`=全置換)× `GoalGaugeSection.onSave`(ドラフト全部位を再保存)
- **再現**: 部位Aが状態4(到達・判定待ち)の状態で設定画面を開き、**体重や他部位Bだけを変更して「ゴールを保存」**→ 部位Aも `{muscle, level, coef, mode}` でputされ、`reachedAt` がドロップ
- **影響**: ①状態4表示とサマリー到達カードが判定なしで消滅(`goal_events`に判定記録が残らない) ②次の該当部位セッション保存で再検知され `reached` イベントが重複記録(重複抑止は`reachedAt`残存が前提のため)
- **修正案**(1行): `saveMuscleGoal` で既存レコードを取得し `reachedAt` を引き継ぐ(`const prev = await db.muscle_goals.get(goal.muscle); put({ ...prev, ...goal, updatedAt })`)。なお状態4中にレベル・目標を変更した場合に状態4を維持すべきかクリアすべきかは仕様未定義のため、修正時にPM裁定を推奨
- **テスト**: 修正と同時にリグレッションテストを追加すること(現状は誤挙動のため追加せず)

### 🟢 QA-2: `judgeGoal('raise')` をbigレベルで `directEditKg` なしに呼ぶと `reachedAt` が残る

`nextGoalLevel`がnull・直接編集kgなしの分岐では何も更新されない。UIからは到達不能(bigは必ずkg付きで呼ぶ)だが、防御的には早期returnより明示的なno-op+クリアの検討余地。QAテストで未設定部位のno-op(イベント非記録)は固定済み。

### 🟢 QA-3: 維持モード×データ不足部位の人体図が鋼色フラットになる

`growthPaint`はmaintain判定を`hasEnoughData`より先に評価するため、データ不足の破線表現(冷えた鉄)を上書きする。維持部位は通常データ十分のため実害は僅少だが、5b §5の「熱スケールから外す」と「データ不足=破線」の優先順位は未定義。

### 🟢 QA-4: 新バックアップを旧ビルドに取り込むと `reachedAt` がISO文字列のまま残る

旧ビルドの`DATE_FIELDS`に`reachedAt`がないため。単一端末運用では発生せず(バックアップ→復元は同ビルド)、旧ビルド→新ビルドへのアップグレード後に文字列`reachedAt`が真値扱いされ状態4が誤表示される可能性のみ。クロスバージョン復元は運用上想定外のため記録に留める。

### 🟢 QA-5: 進捗軸はグラフがデータ不足(期間内3セッション未満)でも表示される

進捗は全期間導出・グラフは期間(30/90日)集計のため、カード内で時間軸の異なる情報が併存しうる。INS §1「グラフ下または部位カードに進捗軸表記」の裁量内と判断。

### 🟢 QA-6: 設定画面経由の鏡チェックで、big+10%提案値が未保存の体重ドラフトから計算される

`MirrorCheckModal`へ渡る`bodyWeightKg`は`weightDraft ?? profile`だが、`judgeGoal`内の係数化は保存済みprofile体重で行う。提案表示と保存結果に僅かな差が出うる(0.5kg刻みでほぼ吸収)。

## 検証済み項目(仕様一致を確認)

| 観点 | 結果 |
|---|---|
| 係数表 | `GOAL_COEF` はINS §2・5b §1承認表と完全一致(5部位×3レベル全15値)。70kg時のcapped例(胸/背しっかり以上・肩腕脚がっつり)も式で再現一致 |
| 進捗計算の境界 | ratio clamp 0–1 / start≧target→即1.0 / start・current未導出→undefined(進捗未表示)/ 残り=max(0,目標−現在)0.1丸め — 全てテストで固定済み |
| capped境界 33.6 | capはハードコードせず導出 `24×(1+12/30)=33.6`(浮動小数点対策の0.1丸めは注記あり・妥当)。`isCapped`は「>」で33.6ちょうどは届く扱い=5b §0と一致 |
| 動的優先度 | `clamp(0.4+1.2×gapRatio, 0.4, 1.6)`・maintain固定0.4・未設定/尻腹=中立1.0 — INS §4と一致。current未導出→gap=1(優先度1.6)はPM承認済み裁量。want/avoidは読み捨て(削除なし)を確認 |
| 維持モード生成調整 | 種目数1(`selection.ts`)・セット−1下限1・2ステップジャンプ抑止(`suppressSlackJump`)— INS §5と一致 |
| Dexie v4→v5 | v5はテーブル追加のみ(`goal_events '++id, muscle, at'`)・既存データ変換なし・`reachedAt`は非インデックス任意フィールド → 移行安全。旧レコードは`reachedAt: undefined`のまま |
| バックアップ網羅 | `TABLES`=DB全14テーブルと一致(`goal_events`含む)。`DATE_FIELDS`で`updatedAt`/`reachedAt`/`at`をDate復元。クラウド(`cloudBackup`)・全削除も同`TABLES`共用。旧形式(ゴール系キーなし)の後方互換もOK → いずれもQAテストで固定 |
| 指標乖離ルール | `chartGoalLineKg`(reps→undefined)でレップ指標グラフにkg線を描かず、進捗軸に「基準: ◯◯」併記(`goalTrendByMuscle.anchorExerciseName`)— INS §1どおり |
| 状態遷移 | 5b遷移図の全パス実装: 未設定→選択中→到達→{維持/引き上げ(big+10%直接編集・Elite不採用)/あとで}、維持→再開(確認ダイアログ)。`goal_events` 4種(reached/maintain/raise/resume)記録。例外はQA-1の消失経路のみ |
| 到達検知の順序 | `finishSession`は`status='completed'`更新**後**に`recordReachedGoals`実行 → 当日セッションが現在e1RMに反映された上で判定される(正しい順序)。境界`current==target`到達・判定未消化中の重複抑止はテスト済み |

## 追加したテスト(5本・全パス)

- `backup.test.ts`: ①muscle_goals(reachedAt含む)+goal_eventsのDate復元込み往復 ②reachedAt未設定はインポート後もundefined(状態4誤遷移なし) ③旧形式バックアップ(ゴール系キーなし)の後方互換
- `queries.test.ts`: ④`judgeGoal`未設定部位no-op(イベント非記録) ⑤`resumeMuscleGoal` patch省略時のレベル・係数維持

## 次アクション提案

1. QA-1の1行修正+リグレッションテスト(Engineerセッション・要PM裁定1点: 状態4中のゴール変更時に`reachedAt`を維持かクリアか)
2. QA-2〜6は対応不要(記録のみ)。気になる場合はISS起票を

## PM裁定(QA-1 / ISS-019・2026-08-01)

reachedAtは**導出条件を満たす限り引き継ぐ**: 保存時に部位ごとに `現在e1RM ≥ 新目標` を再評価し、真なら維持(状態4継続)・偽ならクリア。クリア時のgoal_eventsは記録しない(鏡チェックループ外の自発編集)。クリア後の再到達は新目標への正規`reached`として記録する。修正時にQAが用意したリグレッションテスト方針で同時にテスト追加すること。🟢5件はv1対応不要(将来の関連改修時に拾う)。

## 対応記録(Engineer・2026-08-01・ISS-019修正)

裁定どおり修正済み(全221テスト・tsc・lint・本番ビルドgreen・main直接push):

- `saveMuscleGoal`(`src/db/queries.ts`): 既存レコードの`reachedAt`が立っている場合のみ、`goalTrendByMuscle`の現在e1RMと新係数×最新体重の目標を比較して再評価。`現在 ≥ 新目標`なら引き継ぎ・未満(現在値が導出不能の場合も含む)はクリア。クリア時のイベント記録なし。シグネチャを`Omit<MuscleGoal, 'updatedAt' | 'reachedAt'>`に狭め、呼び出し側から`reachedAt`を直接注入できないよう硬化
- `GoalGaugeSection.onSave`: 体重→ゴールの順に保存順を入れ替え(再評価の「新目標」が画面表示と同じ最新体重で計算されるように)
- リグレッションテスト4本追加(`queries.test.ts`): ①条件充足で引き継ぎ+イベントなし ②目標引き上げでクリア+イベントなし ③現在値導出不能はクリア側 ④クリア後は保存で復活せず、次のセッション保存で新目標への正規`reached`が記録される
