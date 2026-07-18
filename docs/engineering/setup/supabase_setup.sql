-- TANREN クラウドバックアップ(Phase 5 / DEC-006)セットアップSQL
-- 使い方: Supabaseダッシュボード → SQL Editor → 全文貼り付け → Run(1回だけ)
-- 内容: プライベートバケット backups を作成し、本人(auth.uid())のフォルダのみ
--       読み書きできるRLSポリシーを storage.objects に張る。
--       publishableキーが漏れても、他人のバックアップには一切アクセスできない

-- 1) バケット作成(非公開)。既にあれば何もしない
insert into storage.buckets (id, name, public)
values ('backups', 'backups', false)
on conflict (id) do nothing;

-- 2) RLSポリシー: パスの先頭フォルダ名(= backups/{user_id}/latest.json の {user_id})が
--    ログイン中ユーザーのIDと一致する場合のみ許可
--    ※storage.objectsのRLS自体はSupabaseが既定で有効化済み

drop policy if exists "tanren_backup_select_own" on storage.objects;
create policy "tanren_backup_select_own"
  on storage.objects for select to authenticated
  using (bucket_id = 'backups' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "tanren_backup_insert_own" on storage.objects;
create policy "tanren_backup_insert_own"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'backups' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "tanren_backup_update_own" on storage.objects;
create policy "tanren_backup_update_own"
  on storage.objects for update to authenticated
  using (bucket_id = 'backups' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'backups' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "tanren_backup_delete_own" on storage.objects;
create policy "tanren_backup_delete_own"
  on storage.objects for delete to authenticated
  using (bucket_id = 'backups' and (storage.foldername(name))[1] = auth.uid()::text);
