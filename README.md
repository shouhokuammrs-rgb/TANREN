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

## 本番URLとリリース手順

- **本番URL**: Vercelが割り当てたドメイン(`.env.production` の `VITE_PROD_HOST` に設定した値)。この値はプレビューURL警告(ISS-009/010)の判定にも使われる
  - 未設定の間はプレビュー警告が無効になる(偽陽性防止)。ドメイン確定後に `VITE_PROD_HOST=<正式ドメイン>` を1行設定すること
- **デプロイ**: `main` へのマージでVercelが自動デプロイ(プレビューはPRごと)
- **リリース(タグ運用)**: 節目のリリースは `main` 上で注釈付きタグを打つ

```bash
git tag -a v1.0.0 -m "v1.0.0: 初回リリース"
git push origin v1.0.0
```

- タグは `vX.Y.Z`(小さな修正はpatch、機能追加はminor)。障害時は直前タグをVercelの「Redeploy」で切り戻す
