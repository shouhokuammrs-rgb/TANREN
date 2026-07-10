# TANREN デザイン仕様書 v1(実装用)

- 発行: PM / 2026-07-10
- 原本: Claude Design ハンドオフ(DEC-005「炉心」+「スパークバースト」確定版)
- 本書 = PM補記(§0)+ デザイナー原文(§1以降そのまま)

## §0 PM補記 — 実装時の整合ルール(原文より優先)

デザインモックは「1種目・5セット固定」の想定で作られている。実アプリ仕様との統合は以下に従う:

1. **セット数・種目遷移の一般化**: 「SET n/5」「ドット5個」のnは現在種目のセット数に置換。種目の最終セット完了→次種目のLOGGINGではなく、既存仕様通り種目間インターバル(RESTING)を挟む。ワークアウト全体の最終セットのみタイマーなしでサマリーへ(ISS-006維持)
2. **タイマー操作は既存機能を維持**: 原文の「+30秒(上限=設定値)」は採用せず、既存の「±15秒(上限なし)+スキップ」を炉心のビジュアルスタイルで実装。「+30秒」ボタンの見た目仕様は「+15秒」に流用
3. **ステッパー刻み**: 重量±2.5kg固定は採用せず、既存仕様通り器具の重量配列にスナップ(ダンベルなら前後のステップへ)。レップ±1は原文通り
4. **ISS-004の機能を維持**: LOGGINGには「記録」(原文の「セット完了」に相当)に加え「🔥限界でした」導線と達成=緑/調整中=黄のフィードバックを残す。緑/黄/赤/青のセマンティック4色はPhase 4 Part 1で定義済みのトークンを使用し、炉心パレット(暖色系)と併存させる(ステータス表示にのみ使用)
5. **フォントはセルフホスト**: Anton / IBM Plex Mono / Noto Sans JP はGoogle Fonts CDNではなくnpmパッケージ(fontsource等)で同梱し、オフライン動作(非機能要件)を守る。Noto Sans JPはサブセット化で容量配慮
6. タブバーのラベルは既存(ホーム/今日のトレ/ログ/設定)を維持。スタイルのみ原文§5に従う

---

# TANREN 実装ハンドオフ仕様

世界観「鍛冶場」= ダーク基調・溶鉄オレンジ・数字がヒーロー。
**世界観は文言ではなくUIで表現する**(グロー・グラデーション・ヒーロー数字・リング)。鍛冶メタファーの文言は使用しない。

- 画面幅基準: 390px
- フォント: Anton(数字専用)/ IBM Plex Mono(英字ラベル)/ Noto Sans JP(和文)— すべて Google Fonts

---

## 1. カラートークン(12色)

| Hex | トークン名 | 用途 |
|---|---|---|
| `#0B0907` | forge-black | 基本背景 |
| `#2A1006` | ember-glow | 背景ラジアル(熱だまり・画面下部) |
| `#3A2213` | line-ember | 罫線・カード枠 |
| `#FF5C1A` | molten | プライマリ(CTA・進捗・完了ドット) |
| `#FF7A33` | molten-bright | hover・強調ラベル |
| `#FFB300` | gold | グラデ起点。**PR演出のみ** |
| `#D8321A` | deep-red | グラデ終点 |
| `#FFE3CC` | text-hot | ヒーロー数字 |
| `#F5EFE8` | text | 見出し |
| `#D9CFC6` | text-mid | 本文・副ボタン |
| `#B06A3E` | accent-dim | 単位・サブ数値ラベル |
| `#8A5A3C` | text-dim | キャプション・メタ情報 |

### 定番グラデーション
- **溶鉄(リング・PR数字)**: `linear-gradient(#FFB300 0%, #FF5C1A 60%, #D8321A 100%)`(リングは45°方向)
- **PRテキスト**: `linear-gradient(180deg, #FFD98A 0%, #FF7A33 46%, #D8321A 100%)` + background-clip: text
- **画面背景**: `radial-gradient(120% 60% at 50% 108%, #2A1006 0%, #140B06 42%, #0B0907 100%)`

### グロー
- リング: `drop-shadow(0 0 12px rgba(255,92,26,.65))`
- ヒーロー数字: `text-shadow: 0 0 32px rgba(255,92,26,.55)`
- プライマリCTA: `box-shadow: 0 0 32〜36px rgba(255,92,26,.35〜.4)`

## 2. 角丸(4段階)

| 値 | 用途 |
|---|---|
| 6px | チップ・小要素 |
| 14px | カード |
| 999px | ボタン(ピル) |
| 28px | 画面コンテナ |

## 3. タイポスケール

### Anton(数字専用・weight 400固定・tabular-nums)
| サイズ | 用途 |
|---|---|
| 88px | タイマーヒーロー |
| 84px | サマリー総ボリューム |
| 64px | 記録入力値(重量・レップ) |
| 40px | ホーム統計 |
| 34px | 次セットプレビュー |

### IBM Plex Mono(英字ラベル)
- 10–12px / weight 500 / letter-spacing .24–.32em / 大文字
- 数値サブ表示: 12–14px / weight 700

### Noto Sans JP(和文)
| スタイル | 用途 |
|---|---|
| 900 / 22–30px | 見出し |
| 900 / 16–17px | プライマリボタン |
| 700 / 13–15px | 強調・リスト項目 |
| 400 / 12–14px | 本文・キャプション |

---

## 4. 実行画面 — 状態遷移仕様

### ステートマシン

```
RESTING(休憩=タイマー主役)
  ├─ +30秒 タップ → sec += 30(上限 = インターバル設定値、デフォルト90s)
  ├─ スキップ タップ → LOGGING へ
  └─ sec == 0 → LOGGING へ自動遷移

LOGGING(記録=入力主役)
  └─ セット完了 タップ → セットを記録・done += 1・sec = 設定値 → RESTING へ
       └─ ただし最終セット(5/5)完了時 → サマリー画面へ遷移
```

### RESTING レイアウト(上から)
1. **ヘッダー**(共通): 左=「TANREN / 実行中」ラベル+種目名(Noto 900 22px)、右=「SET n/5」チップ(Mono 700 14px・枠 line-ember・角丸6px)
2. **残時間リング**(中央・ヒーロー): 300×300px、半径132・線幅10・溶鉄グラデ・round cap・グロー。中に INTERVAL ラベル+残時間(Anton 88px, text-hot)+「/ 設定秒」。リング進行は `stroke-dashoffset` を 1s linear で遷移。全体に emberPulse(opacity .85⇄1, 2.4s)
3. **操作**: 「+30秒」(ゴーストピル・枠 line-ember)+「スキップ」(molten ピル)
4. **NEXTカード**(下部): 次セットの 重量×レップ(Anton 34px)+ セット進捗ドット5個(完了= molten / 未= line-ember)。背景 `rgba(255,92,26,.06)`・枠 line-ember・角丸14px

### LOGGING レイアウト(上から)
1. **ヘッダー**: RESTING と共通
2. **「NOW — 第nセット」ラベル**(Mono・molten-bright・中央・emberPulse)
3. **重量カード**: WEIGHT/KG ラベル+値(Anton 64px, text-hot, グロー)+左右に −/+ ステッパー(56px円形・枠 line-ember・hover で molten)。刻み ±2.5kg
4. **レップカード**: 同構成。刻み ±1
5. **「セット完了」CTA**(molten ピル・Noto 900 16px・グロー)+ 進捗ドット

### 遷移演出
- 状態切替時: **riseIn** = translateY(12px)→0 + fade、.35s ease-out
- emberPulse は常時、**heatShimmer(brightness 1⇄1.25, 2.8s)は PR 演出のみに限定使用**

---

## 5. ホーム / サマリー / PR演出

### ホーム
1. ヘッダー: 「TANREN」ワードマーク(Mono・molten)+日付
2. 挨拶見出し(Noto 900 30px・2行)※鍛冶メタファー文言は使わない
3. 統計カード×2(横並びグリッド gap 12px): 連続記録(日)/ 今週ボリューム(t)。数字 Anton 40px + グロー
4. 今日のメニューカード: ラベル(molten-bright)+所要時間、種目リスト(名前+セット数)。背景 `rgba(255,92,26,.06)`
5. **「今日のトレを始める」CTA**(molten ピル・グロー)— 画面下部固定気味に配置
6. タブバー: ホーム/記録/履歴/設定。アクティブ= text-hot + molten ドット、非アクティブ= 700 → 500 / #6B5A4C

### 終了サマリー
1. 日付+所要時間(Mono キャプション)+「ワークアウト完了。」見出し
2. **総ボリューム**(ヒーロー): Anton 84px・text-hot・グロー+単位ラベル
3. **PRカード**(該当時のみ表示 — 下記)
4. 種目リスト: 種目名+「n/n セット」、罫線 #241812 区切り
5. 「記録を保存する」CTA(molten ピル)+「共有」テキストボタン

### PR演出(サマリー内・自己ベスト更新時のみ)
「火花」案から限定移植した特別演出。日常画面では使わない。
- カード: 枠 **molten**(通常カードより強い)+ `box-shadow: 0 0 40px rgba(255,92,26,.15)`
- ラベル「自己ベスト更新 — 種目名」+右上に「PR」(gold)
- 記録数字: Anton 58px・**PRグラデ text-clip**+ **heatShimmer** アニメーション
- ヒートゲージ: 14セグメント(flex gap 4px・高さ8px・角丸2px)。色は位置で gold → molten → deep-red、各セグメントに `0 0 8px rgba(255,92,26,.4)` グロー

---

## 6. アプリアイコン「スパークバースト」

白熱の一点(コア)から横方向へ吹き出す火花。52本のレイ+20個の飛沫を決定論的に配置(下記SVGに展開済み)。
PNGは実装側でこのSVGから生成(viewBox 84×84・width/height 属性で任意サイズに)。

ファイル: `handoff/tanren-icon-sparkburst.svg`(同内容を以下に全文掲載)

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 84 84" width="1024" height="1024">
  <defs>
    <radialGradient id="bg" cx="50%" cy="118%" r="130%">
      <stop offset="0%" stop-color="#1F0C04"/>
      <stop offset="55%" stop-color="#0E0805"/>
      <stop offset="100%" stop-color="#0B0907"/>
    </radialGradient>
    <radialGradient id="core">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="28%" stop-color="#FFF0C4"/>
      <stop offset="55%" stop-color="#FFB300" stop-opacity=".55"/>
      <stop offset="100%" stop-color="#FF5C1A" stop-opacity="0"/>
    </radialGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="0" stdDeviation="2" flood-color="#FF8C28" flood-opacity="0.5"/>
    </filter>
  </defs>
  <rect width="84" height="84" fill="url(#bg)"/>
  <g filter="url(#glow)">
    <line x1="43.5" y1="39.7" x2="55.3" y2="21.5" stroke="#FFF6E0" stroke-width="0.71" opacity="0.78" stroke-linecap="round"/>
    <line x1="37.2" y1="44.5" x2="21.4" y2="52.9" stroke="#FFB300" stroke-width="1.08" opacity="0.63" stroke-linecap="round"/>
    <line x1="48.8" y1="44.6" x2="77.9" y2="55.4" stroke="#FF5C1A" stroke-width="0.65" opacity="0.87" stroke-linecap="round"/>
    <line x1="34.7" y1="40.9" x2="10.0" y2="37.1" stroke="#FF7A33" stroke-width="1.03" opacity="0.73" stroke-linecap="round"/>
    <line x1="47.6" y1="43.9" x2="58.1" y2="47.6" stroke="#FF7A33" stroke-width="0.95" opacity="0.48" stroke-linecap="round"/>
    <line x1="33.9" y1="41.4" x2="20.7" y2="40.5" stroke="#FF5C1A" stroke-width="1.38" opacity="0.51" stroke-linecap="round"/>
    <line x1="48.8" y1="41.4" x2="78.5" y2="39.0" stroke="#FF7A33" stroke-width="1.72" opacity="0.82" stroke-linecap="round"/>
    <line x1="36.2" y1="38.7" x2="21.2" y2="30.2" stroke="#FF7A33" stroke-width="0.59" opacity="0.62" stroke-linecap="round"/>
    <line x1="47.7" y1="44.3" x2="67.3" y2="52.3" stroke="#FF7A33" stroke-width="1.46" opacity="0.68" stroke-linecap="round"/>
    <line x1="36.2" y1="38.3" x2="14.6" y2="24.8" stroke="#FF5C1A" stroke-width="1.58" opacity="0.79" stroke-linecap="round"/>
    <line x1="45.2" y1="43.0" x2="67.6" y2="49.8" stroke="#FFF6E0" stroke-width="0.97" opacity="0.71" stroke-linecap="round"/>
    <line x1="34.1" y1="40.6" x2="14.3" y2="37.1" stroke="#FF5C1A" stroke-width="1.67" opacity="0.64" stroke-linecap="round"/>
    <line x1="43.6" y1="46.0" x2="54.5" y2="73.6" stroke="#FFB300" stroke-width="1.35" opacity="1.00" stroke-linecap="round"/>
    <line x1="36.1" y1="38.5" x2="8.5" y2="21.8" stroke="#FF5C1A" stroke-width="0.82" opacity="0.93" stroke-linecap="round"/>
    <line x1="45.5" y1="40.3" x2="53.7" y2="36.2" stroke="#FFD98A" stroke-width="1.64" opacity="0.45" stroke-linecap="round"/>
    <line x1="39.4" y1="40.9" x2="15.8" y2="31.0" stroke="#FFF6E0" stroke-width="1.52" opacity="0.77" stroke-linecap="round"/>
    <line x1="47.8" y1="39.6" x2="75.2" y2="28.2" stroke="#FF7A33" stroke-width="1.41" opacity="0.84" stroke-linecap="round"/>
    <line x1="39.4" y1="43.5" x2="29.6" y2="49.4" stroke="#FFF6E0" stroke-width="1.66" opacity="0.50" stroke-linecap="round"/>
    <line x1="47.8" y1="40.5" x2="74.8" y2="33.5" stroke="#FF7A33" stroke-width="1.04" opacity="0.79" stroke-linecap="round"/>
    <line x1="34.2" y1="44.9" x2="8.2" y2="54.7" stroke="#D8321A" stroke-width="1.02" opacity="0.80" stroke-linecap="round"/>
    <line x1="47.4" y1="43.5" x2="83.3" y2="53.4" stroke="#FFB300" stroke-width="1.16" opacity="0.97" stroke-linecap="round"/>
    <line x1="35.5" y1="45.4" x2="8.8" y2="59.4" stroke="#FF5C1A" stroke-width="0.79" opacity="0.87" stroke-linecap="round"/>
    <line x1="47.1" y1="41.4" x2="82.9" y2="36.9" stroke="#FFB300" stroke-width="0.64" opacity="0.93" stroke-linecap="round"/>
    <line x1="35.9" y1="39.2" x2="5.5" y2="25.5" stroke="#FF7A33" stroke-width="0.97" opacity="0.92" stroke-linecap="round"/>
    <line x1="42.8" y1="45.9" x2="45.6" y2="60.6" stroke="#FFB300" stroke-width="0.57" opacity="0.64" stroke-linecap="round"/>
    <line x1="37.0" y1="41.8" x2="-1.2" y2="40.4" stroke="#FFB300" stroke-width="0.59" opacity="0.97" stroke-linecap="round"/>
    <line x1="45.6" y1="42.3" x2="81.9" y2="45.9" stroke="#FFF6E0" stroke-width="0.84" opacity="0.94" stroke-linecap="round"/>
    <line x1="34.1" y1="42.1" x2="4.5" y2="42.4" stroke="#FF5C1A" stroke-width="1.41" opacity="0.81" stroke-linecap="round"/>
    <line x1="46.0" y1="39.5" x2="60.3" y2="30.6" stroke="#FFB300" stroke-width="1.04" opacity="0.61" stroke-linecap="round"/>
    <line x1="38.2" y1="44.3" x2="22.7" y2="53.9" stroke="#FFB300" stroke-width="1.27" opacity="0.64" stroke-linecap="round"/>
    <line x1="40.6" y1="45.8" x2="34.6" y2="62.2" stroke="#FFB300" stroke-width="1.39" opacity="0.70" stroke-linecap="round"/>
    <line x1="33.6" y1="40.7" x2="-3.0" y2="35.0" stroke="#D8321A" stroke-width="1.08" opacity="0.95" stroke-linecap="round"/>
    <line x1="46.7" y1="38.9" x2="63.2" y2="28.2" stroke="#FF7A33" stroke-width="1.54" opacity="0.67" stroke-linecap="round"/>
    <line x1="35.6" y1="43.0" x2="1.0" y2="48.7" stroke="#FF7A33" stroke-width="1.59" opacity="0.92" stroke-linecap="round"/>
    <line x1="47.5" y1="43.6" x2="73.6" y2="51.4" stroke="#FFB300" stroke-width="0.84" opacity="0.78" stroke-linecap="round"/>
    <line x1="37.1" y1="45.2" x2="21.3" y2="55.6" stroke="#FF7A33" stroke-width="1.04" opacity="0.66" stroke-linecap="round"/>
    <line x1="46.4" y1="41.8" x2="61.1" y2="41.0" stroke="#FFD98A" stroke-width="1.30" opacity="0.54" stroke-linecap="round"/>
    <line x1="39.3" y1="43.7" x2="31.0" y2="48.9" stroke="#FFF6E0" stroke-width="1.37" opacity="0.47" stroke-linecap="round"/>
    <line x1="46.7" y1="40.9" x2="83.4" y2="32.5" stroke="#FFB300" stroke-width="0.64" opacity="0.97" stroke-linecap="round"/>
    <line x1="37.1" y1="39.5" x2="14.8" y2="28.1" stroke="#FF7A33" stroke-width="1.47" opacity="0.77" stroke-linecap="round"/>
    <line x1="46.2" y1="39.9" x2="62.5" y2="32.1" stroke="#FFB300" stroke-width="0.63" opacity="0.63" stroke-linecap="round"/>
    <line x1="35.5" y1="41.5" x2="12.2" y2="39.8" stroke="#FF7A33" stroke-width="1.50" opacity="0.70" stroke-linecap="round"/>
    <line x1="40.5" y1="46.1" x2="35.9" y2="58.7" stroke="#FFB300" stroke-width="0.73" opacity="0.60" stroke-linecap="round"/>
    <line x1="33.6" y1="41.5" x2="17.5" y2="40.4" stroke="#D8321A" stroke-width="1.70" opacity="0.56" stroke-linecap="round"/>
    <line x1="45.2" y1="41.9" x2="83.6" y2="40.8" stroke="#FFF6E0" stroke-width="1.72" opacity="0.97" stroke-linecap="round"/>
    <line x1="33.7" y1="39.7" x2="7.0" y2="32.3" stroke="#D8321A" stroke-width="1.65" opacity="0.79" stroke-linecap="round"/>
    <line x1="46.5" y1="42.7" x2="84.5" y2="48.9" stroke="#FFB300" stroke-width="1.12" opacity="0.98" stroke-linecap="round"/>
    <line x1="37.6" y1="42.2" x2="14.3" y2="43.5" stroke="#FFD98A" stroke-width="1.35" opacity="0.70" stroke-linecap="round"/>
    <line x1="42.6" y1="44.2" x2="45.2" y2="54.3" stroke="#FFF6E0" stroke-width="0.95" opacity="0.53" stroke-linecap="round"/>
    <line x1="36.6" y1="41.4" x2="19.3" y2="39.3" stroke="#FFB300" stroke-width="1.77" opacity="0.59" stroke-linecap="round"/>
    <line x1="47.7" y1="38.5" x2="75.5" y2="21.4" stroke="#FF7A33" stroke-width="1.06" opacity="0.94" stroke-linecap="round"/>
    <line x1="37.3" y1="42.2" x2="7.2" y2="43.4" stroke="#FFB300" stroke-width="1.18" opacity="0.82" stroke-linecap="round"/>
    <circle cx="78.0" cy="48.4" r="0.86" fill="#FF5C1A" opacity="0.62"/>
    <circle cx="10.5" cy="56.2" r="1.48" fill="#FF5C1A" opacity="0.90"/>
    <circle cx="69.8" cy="43.5" r="1.30" fill="#FFB300" opacity="0.82"/>
    <circle cx="20.1" cy="38.9" r="1.01" fill="#FFD98A" opacity="0.69"/>
    <circle cx="60.9" cy="24.6" r="1.70" fill="#FF7A33" opacity="1.00"/>
    <circle cx="14.4" cy="60.7" r="1.68" fill="#FF5C1A" opacity="0.99"/>
    <circle cx="57.0" cy="29.9" r="1.36" fill="#FFD98A" opacity="0.85"/>
    <circle cx="9.7" cy="58.1" r="0.79" fill="#FF5C1A" opacity="0.59"/>
    <circle cx="68.8" cy="61.4" r="1.62" fill="#FF5C1A" opacity="0.96"/>
    <circle cx="15.0" cy="47.4" r="1.24" fill="#FFB300" opacity="0.79"/>
    <circle cx="60.0" cy="33.3" r="1.51" fill="#FFD98A" opacity="0.91"/>
    <circle cx="8.1" cy="55.5" r="0.83" fill="#FF5C1A" opacity="0.61"/>
    <circle cx="63.8" cy="30.8" r="1.01" fill="#FFB300" opacity="0.69"/>
    <circle cx="5.5" cy="40.4" r="0.97" fill="#FF5C1A" opacity="0.67"/>
    <circle cx="79.8" cy="47.1" r="1.13" fill="#FF5C1A" opacity="0.74"/>
    <circle cx="12.3" cy="26.6" r="0.85" fill="#FF5C1A" opacity="0.61"/>
    <circle cx="67.3" cy="35.1" r="0.92" fill="#FFB300" opacity="0.65"/>
    <circle cx="14.9" cy="62.6" r="1.25" fill="#FF5C1A" opacity="0.79"/>
    <circle cx="69.6" cy="41.6" r="0.91" fill="#FFB300" opacity="0.64"/>
    <circle cx="20.7" cy="52.9" r="1.42" fill="#FFB300" opacity="0.87"/>
  </g>
  <circle cx="42" cy="42" r="16" fill="url(#core)"/>
</svg>
```
