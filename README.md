# TANREN(鍛錬)

手持ち器具(可変ダンベル・アジャスタブルベンチ)と過去ログから、その日の最適メニューを生成するEiichi専用の家トレコーチPWA。

- 要件定義: `docs/pm/01_requirements.md`
- プロジェクト状態(SSOT): `docs/pm/tanren_project_state.md`
- 開発運用ルール: `CLAUDE.md`

## 開発

```bash
npm install
npm run dev      # 開発サーバー
npm run test     # ユニットテスト(Vitest)
npm run build    # 型チェック+本番ビルド
npm run preview  # ビルド結果のプレビュー(PWA確認用)
```

## スタック

Vite + React + TypeScript + Tailwind CSS / Dexie.js(IndexedDB)/ vite-plugin-pwa / Vitest。デプロイはVercel(バックエンドなし)。
