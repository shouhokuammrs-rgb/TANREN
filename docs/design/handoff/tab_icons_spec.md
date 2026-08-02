# タブアイコンセット仕様 — 6b仕様 §1 差分

ISS-028 / Phase 8。`handoff/6b_ia_handoff.md` **§1 タブバー**を上書きする差分仕様。
対象コンポーネント: `src/components/TabBar.tsx`(main @67c1d16 時点を確認済み)
プレビュー: `docs/design/タブアイコン仕様.dc.html`

**変更点:** 「アイコンは追加しない」を撤回し、**アイコン24px + ラベル併記**とする。バー高さ・セーフエリア・ラベル文字列は現行のまま。**アクティブの位置ドットは廃止**し、ドットは通知専用バッジに作り替える。

> **提供物について:** 5個すべて**本仕様で新規に描き起こしたもの**です。リポジトリを確認したところ、旧4タブ時代のアイコン資産は存在しません(`public/icons/` にあるのはアプリアイコン `tanren-icon-sparkburst.svg` と PWA用PNGのみ、`src/` 配下にSVG・アイコンコンポーネントなし)。流用元はないため、下記パスをそのまま実装してください。

---

## 1. タブバー(現行コードとの差分)

現行 `TabBar.tsx` の構造・クラスは維持し、`<span>`(ドット)を `<svg>`(アイコン)+ 通知バッジに置き換える。

### 変えないもの

| 箇所 | 現行の指定 |
|---|---|
| nav | `fixed inset-x-0 bottom-0 border-t border-line-ember bg-forge-black/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur` |
| 内側 | `mx-auto flex max-w-md py-3` |
| 各タブ | `flex min-h-11 flex-1 flex-col items-center justify-center gap-[5px] whitespace-nowrap text-[11px]` |
| ラベル文字列 | `TAB_LABELS`(`src/constants/copy.ts`)。**再定義しない** |
| ラベル太さ | アクティブ `font-bold` / 非アクティブ `font-medium` |

`gap-[5px]` はドット↔ラベル間として設定済みのもので、アイコン↔ラベル間としてそのまま流用できる。`py-3` / `min-h-11` / セーフエリアも変更不要。

### 変えるもの

| 箇所 | 変更内容 |
|---|---|
| ドット `<span>` | **削除**。アイコン `<svg>` に置換(§2) |
| 通知 | 同じ `<span>` に相乗りしていたものを、アイコンに重ねる独立バッジへ分離(§4) |
| ラベル色 | `text-[#FFE3CC]` / `text-[#6B5A4C]` のリテラル指定を、トークンクラス `text-text-hot` / `text-tab-idle` に置き換える(`src/index.css @theme` に定義済み) |

高さの増分: ドット5px → アイコン24px で +19px。`min-h-11`(44px)の下限は既に超えているため、`min-h-11` はタップ領域の保証としてそのまま残す。

---

## 2. アイコン5種

すべて **`viewBox="0 0 24 24"` / `fill="none"` / `stroke="currentColor"` / `stroke-width="1.75"` / `stroke-linecap="round"` / `stroke-linejoin="round"`**。
色は親の `text-*` クラスで決まる(§4)。以下は `<path>` のみ記載。

### 2-1. ホーム(家)

```svg
<path d="M3.4 10.3 L12 3.7 L20.6 10.3"/>
<path d="M5.7 9.2 V20.3 H18.3 V9.2"/>
<path d="M9.9 20.3 V14.6 H14.1 V20.3"/>
```

### 2-2. 今日(ダンベル)

```svg
<path d="M8.4 12 H15.6"/>
<path d="M6.6 8.3 V15.7"/>
<path d="M17.4 8.3 V15.7"/>
<path d="M3.6 10.1 V13.9"/>
<path d="M20.4 10.1 V13.9"/>
```

### 2-3. 成長(炎 + 上向きの矢)

```svg
<path d="M12 21.7 C8.4 21.7 5.7 19.1 5.7 15.7 C5.7 11.4 9.5 9.7 9.1 4.3 C13.4 6.7 18.3 10.3 18.3 15.7 C18.3 19.1 15.6 21.7 12 21.7 Z"/>
<path d="M12 18.5 V11.5"/>
<path d="M9.5 14 L12 11.4 L14.5 14"/>
```

**モチーフ選定理由:** 炎は既存の意味体系(熱 = 成長)と直結し、内側の上向き矢が「伸び」の方向を示す。検討した他案は不採用:
- **人体図** — 成長ビュー本体と一致するが、24pxでは部位の分節が潰れて識別できない
- **上向き折れ線** — 汎用の分析アイコンに見え、鍛冶場の語彙から外れる

### 2-4. ログ(記録の行)

```svg
<path d="M10.2 7.3 H18.6"/>
<path d="M10.2 12 H18.6"/>
<path d="M10.2 16.7 H15.4"/>
<path d="M6.3 6.2 a1.1 1.1 0 1 0 0.01 0 Z" fill="currentColor"/>
<path d="M6.3 10.9 a1.1 1.1 0 1 0 0.01 0 Z" fill="currentColor"/>
<path d="M6.3 15.6 a1.1 1.1 0 1 0 0.01 0 Z" fill="currentColor"/>
```

行頭ドット3つのみ塗りを持つ。`fill="currentColor"` とすることで stroke と同じ色に自動追従する。

### 2-5. 設定(スライダー)

```svg
<path d="M3.8 7.6 H20.2"/>
<path d="M3.8 16.4 H20.2"/>
<path d="M9.6 5.2 a2.4 2.4 0 1 0 0.01 0 Z"/>
<path d="M15 14 a2.4 2.4 0 1 0 0.01 0 Z"/>
```

歯車ではなくスライダーを採る。設定の中身が **5b ゴールゲージ(目盛にノッチを置く操作)**である以上、目盛のメタファーの方が実態に合い、24pxでの識別性も歯車より高い。

---

## 3. トーン統一ルール

| 項目 | 規則 |
|---|---|
| グリッド | 24×24。実描画は 3.4–20.6 の範囲に収め、上下左右に約3.4pxの余白を残す |
| 線の太さ | `stroke-width: 1.75` で全5個統一。太さでの階層表現はしない |
| 線端・角 | `stroke-linecap` / `stroke-linejoin` ともに `round`。鋭角の尖りを作らない |
| 塗り | 原則 `fill: none` の線画。例外はログの行頭ドット3つのみ(視認性のため) |
| 角の丸み | 外形に角丸を付けない。家の屋根・ダンベルの端は round cap で自然に丸まる |
| 光学サイズ | 面積の重い炎(成長)は他より約4%小さく描き、並べた時の視覚的な重さを揃える |
| 色 | `currentColor` の単色のみ。アイコン内のグラデーション・多色は禁止 |
| 禁止 | 45°未満の細い角度 / 1px以下のディテール / 閉じた小さな穴 |

---

## 4. 状態定義(アクティブ表現の再定義)

**位置ドットは廃止。** アイコンの色とグローがその役割を引き継ぐ。

| 状態 | アイコン色 | グロー | ラベル |
|---|---|---|---|
| **非アクティブ** | `text-tab-idle`(`#6b5a4c`) | なし | `font-medium text-tab-idle` |
| **アクティブ** | `text-molten`(`#ff5c1a`) | `drop-shadow(0 0 7px rgb(255 92 26 / .55))` | `font-bold text-text-hot` |
| **押下中** | `text-molten-bright` | なし | `active:opacity-70`(100ms) |

`stroke="currentColor"` / `fill="currentColor"`(ログのドット)としているため、`text-*` クラスの切り替えだけで塗り・線の両方が追従する。**パスを状態ごとに複製しないこと。**

### 通知バッジ(実装上の要注意点)

現行コードでは、位置ドットと通知ドットが**同一の `<span>`** で表現されている:

```tsx
background: notify ? '#FFB300' : isActive ? '#FF5C1A' : 'transparent'
```

新設計では位置ドットを消して通知だけを残すため、**この span は分離が必要**。アイコンを `relative` なラッパーで包み、バッジを絶対配置する。

| 項目 | 値 |
|---|---|
| ラッパー | `relative h-6 w-6`(アイコン24pxボックス) |
| バッジ | `absolute -top-px -right-0.5 h-[7px] w-[7px] rounded-pill` |
| 色 | `bg-gold`(`#ffb300`) |
| 縁 | `border-[1.5px] border-forge-black`(背景から浮かせ、アイコンの線と混ざらないように) |
| アニメーション | `anim-pulse`(`src/index.css` の `emberPulse 2.4s`。`prefers-reduced-motion` 対応済み) |

**発火条件は変更しない。** 現行の `useLiveQuery` をそのまま使う:

```ts
const goals = await db.muscle_goals.toArray()
return goals.some((g) => g.reachedAt !== undefined && g.mode === 'growth')
```

`notify = tab.to === '/growth' && hasPendingMirror === true` も現行どおり。

- **アクティブと通知は共存する** — molten のアイコンに gold のバッジが重なる形。色が違うため衝突しない
- 数値バッジは使わない。件数は遷移先(ホームの鏡チェックバナー、`HOME_COPY.mirrorOthers`)で示す

---

## 5. 実装メモ

- 5個を1つのスプライト(`<symbol id="tab-home">` …)にまとめ `<use>` で参照するか、`src/components/icons/TabIcons.tsx` に5つの小コンポーネントとして置く。個別SVGファイルにはしない(`src/` にSVG読み込みの設定がないため)
- アイコンは装飾なので `aria-hidden="true"`。読み上げは `TAB_LABELS` のテキストが担う
- タップ領域は現行どおり `min-h-11` + `flex-1`(アイコン・ラベルの実寸ではなくタブ全体)
- 色遷移は 150ms ease-out。点滅するのは通知バッジのみ
- `TabBar.tsx` 冒頭のコメント2行(「アイコンなし・2〜3字ラベル+アクティブドット」「通知は…ドットを#FFB300に変える方式」)も本仕様に合わせて更新すること

---

## 6. 関連ドキュメントへの反映

### `handoff/6b_ia_handoff.md`

§1 の以下2行を差し替え:

- ~~「アイコンは追加しない(2字ラベルの方が可読性が高く、鍛冶場のトーンにも合う)」~~ → 本書 §2
- ~~「バッジは『成長』タブのドットを `#FFB300` に変える方式」~~ → 本書 §4(独立したバッジをアイコン右上に置く方式に変更)

§1 の寸法表に「アイコン 24×24px」を追加し、「アクティブドット 5×5px」の行を削除。

§5 状態一覧 #1「タブ」行を更新:
`非アクティブ` = `text-tab-idle` / `アクティブ` = `text-molten` + グロー + `text-text-hot` ラベル / `通知あり` = アイコン右上に `bg-gold` バッジ

### `src/constants/copy.ts`

`TAB_LABELS` 直上のコメント「アイコンなし」を削除。ラベル文字列自体の変更はなし。
