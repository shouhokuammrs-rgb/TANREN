# INS: タブアイコン実装(ISS-028)

- 発行: PM / 2026-08-02 / 対象: Engineer / 運用: DEC-014準拠
- 仕様の正: `docs/design/handoff/tab_icons_spec.md`(実コード接地済み・そのまま実装可能な粒度)

## スコープ
1. 仕様書§1〜§5どおり: アイコン24px+ラベル併記・位置ドット廃止・通知バッジ分離(span分離必須・§4の実装注意参照)・SVGパスは仕様の値をそのまま使用(独自調整禁止)
2. 仕様書§6の関連ドキュメント反映: `6b_ia_handoff.md` §1/§5の差し替え・`copy.ts`コメント更新・`TabBar.tsx`冒頭コメント更新
3. アイコンは `src/components/icons/TabIcons.tsx` 方式を採用(仕様§5の選択肢のうち後者)

## テスト
状態遷移(非アクティブ/アクティブ/通知共存)・aria-hidden・通知発火条件の回帰なし。E2E: 5タブのアイコン描画+成長タブ通知バッジ

## 完了条件
handoff+SSOT(ISS-028対応済み)+main push
