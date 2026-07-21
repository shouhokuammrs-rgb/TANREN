# INS: 回復優先のメニュー短縮ロジック(DEC-006)

- 作成者: PM (Claude web)
- 日付: 2026-07-20
- 対象: `src/engine/selection.ts` / `src/engine/menu.ts` / `src/constants/engine.ts` / `src/pages/WorkoutPage.tsx`
- 関連: DEC-006(下記)、SSOT更新要
- 備考: PMが実コード確認済み(リポジトリはパブリック化された)

---

## 0. 背景と決定事項(DEC-006)

現行の `selectMuscles`(おまかせモード)は `FRESHNESS_WARN_THRESHOLD = 50` 以上の部位を選択対象とし、`MUSCLES_BY_TIME` が要求する部位数(60分→3部位)を満たすためにフレッシュネス50〜99%の部位を繰り上げて選んでいる。これは「時間希望を満たすために回復途中の部位を使う」挙動であり、回復モデルを尊重する設計思想と矛盾する。

**決定(Eiichi承認済み):**
時間希望より回復を優先する。おまかせモードでは回復未完了(フレッシュネス100%未満)の部位を選ばない。その結果メニューが希望時間に満たない場合は短縮し、理由を明示する。

表示文言の基本形:
> 「今日は◯分のメニューになります。理由:△△と□□が回復中のため」

### 検討したが不採用の代替案
- **A. 回復済み部位の種目/セットを増やして時間を埋める** → 不採用。`MAX_EXERCISES_PER_MUSCLE` / `DEFAULT_SETS` の上限を超えるジャンクボリュームになる。
- **B. 現状維持(閾値50で繰り上げ)** → 不採用。回復モデルの意味がなくなる。

---

## 1. 仕様

### 1-1. 定数(`src/constants/engine.ts`)
- `FRESHNESS_READY_THRESHOLD = 100` を新設。「おまかせ選択の対象になる下限」。体感フィードバックで調整する前提のコメントを付ける(このファイルの他定数と同様)。
- 既存の `FRESHNESS_WARN_THRESHOLD = 50` は**指定モードの警告用として存続**(用途コメントを更新)。
- `SHORTENED_NOTICE_RATIO = 0.8` を新設。「推定時間が希望時間×この係数を下回ったら短縮通知を出す」。

### 1-2. 部位選択(`src/engine/selection.ts` の `selectMuscles`)
1. **おまかせモード**: `fresh` の抽出条件を `freshness[m] >= FRESHNESS_READY_THRESHOLD` に変更。100%の部位が `muscleCountForTime` の要求数に満たなくても、**繰り上げ補充しない**(あるだけで構成)。
2. **全部位が100%未満の場合**: 現行の「最もフレッシュな部位を1つ選ぶ」フォールバックを廃止し、**空の選択結果 + 休養日フラグ**を返す(戻り値に `isRestDay: boolean` を追加するなど、型はEngineer裁量)。
3. **指定モード(targetMusclesあり)**: 変更なし。ユーザーの明示的な選択を尊重し、既存の50%未満警告(ISS-011の状態語)を維持する。
4. 除外した回復中部位のリスト(部位名とフレッシュネス%)を戻り値に含める → UI理由表示に使う。

### 1-3. 生成結果メタ情報(`src/engine/menu.ts` の `GeneratedMenu`)
以下を追加:
- `requestedMinutes`(希望時間)
- `isShortened`: `estimatedMinutes < requestedMinutes * SHORTENED_NOTICE_RATIO` かつ回復中部位の除外が短縮の原因である場合に true
- `excludedRecoveringMuscles`: 除外部位の `{ muscle, freshness }` リスト
- `isRestDay`: 全部位回復中フラグ

`rationale` 文字列は現行の組み立てを流用しつつ、短縮時は指定文言を優先する。

### 1-4. UI(`src/pages/WorkoutPage.tsx`)
1. `isShortened === true` のとき、メニュー上部に短縮通知:
   - 「今日は◯分のメニューになります。理由:△△と□□が回復中のため」
   - 部位名は `MUSCLE_GROUP_LABELS` を使用。列挙は最大3つ、4つ以上は「△△、□□ほか」。
   - トーンは中立〜ポジティブ。回復は計画の一部なので、エラー風の見た目(赤・警告アイコン)にしない。既存のFreshness系トーンに合わせる。
2. `isRestDay === true` のとき、メニューの代わりに休養日提案ビュー:
   - 「今日は休養日がおすすめです。全部位が回復中のため」
   - 詳細レイアウトはEngineer裁量。`FreshnessBodyMap` の再利用を検討してよい。迷う点はハンドオフに質問として残すこと。
3. 短縮でない場合は通知なし(通常表示)。

### 1-5. テスト
1. 100%部位が要求数未満(例: 60分希望・100%が1部位のみ)→ 回復中部位が含まれず `isShortened: true`、除外リスト正しい
2. 全部位100%未満 → `isRestDay: true`、items空
3. 100%部位のみで時間充足 → 短縮通知なし(回帰)
4. 指定モードで50%未満部位 → 従来どおり警告付きで生成(回帰)
5. 部位名列挙の上限(3件+ほか)
6. `SHORTENED_NOTICE_RATIO` 境界(推定=希望×0.8前後)

既存の `selection.test.ts` / `menu.test.ts` の該当ケース(繰り上げ・フォールバック前提のもの)は新仕様に合わせて更新すること。

---

## 2. SSOT更新指示

`docs/pm/tanren_project_state.md` に以下を追記:

- **DEC-006**: メニュー生成(おまかせ)は回復優先。フレッシュネス100%未満の部位は選択せず、希望時間に満たない場合は理由明示の上で短縮する。全部位回復中の場合は休養日を提案する。手動指定時はユーザー判断を優先(警告のみ)。閾値・通知係数は定数化し体感調整可能とする。(2026-07-20, Eiichi承認)

実装完了後、ハンドオフを `docs/engineering/handoffs/` に作成すること。
