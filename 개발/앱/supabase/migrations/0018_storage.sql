-- ─────────────────────────────────────────────────────────────
-- 0018_storage.sql — 스토리지 버킷 + 다운로드 권한(Phase 6, Supabase Storage).
--   memoria-uploads(0001): 보호자 원본(anon 토큰폴더 업로드) + staff 다운로드 추가.
--   memoria-final: 발행 최종본/원본아카이브 — staff·파트너자기·collab.
--   memoria-content: 콘텐츠 허브 자산 — staff(content)·파트너 자기폴더/shared.
--   provider 무관 설계 유지(추후 R2 전환 가능). 비공개 버킷 + 서명URL로만 접근.
-- ─────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public) values
  ('memoria-final', 'memoria-final', false),
  ('memoria-content', 'memoria-content', false)
on conflict (id) do nothing;

-- memoria-uploads: staff 다운로드(원본 작업용). anon 업로드 정책은 0001 유지.
drop policy if exists "uploads staff read" on storage.objects;
create policy "uploads staff read" on storage.objects for select to authenticated
  using (bucket_id = 'memoria-uploads' and (
    memoria.staff_has_perm('production') or memoria.staff_has_perm('customers')
    or memoria.staff_has_perm('secondedit') or memoria.staff_has_perm('storage')));

-- memoria-content: staff(content) 읽기·쓰기 + 파트너 자기폴더/shared 읽기.
drop policy if exists "content staff rw" on storage.objects;
create policy "content staff rw" on storage.objects for all to authenticated
  using (bucket_id = 'memoria-content' and memoria.staff_has_perm('content'))
  with check (bucket_id = 'memoria-content' and memoria.staff_has_perm('content'));
drop policy if exists "content partner read" on storage.objects;
create policy "content partner read" on storage.objects for select to authenticated
  using (bucket_id = 'memoria-content' and (
    (storage.foldername(name))[1] = memoria.current_partner_id()
    or (storage.foldername(name))[1] = 'shared'));

-- memoria-final: staff(production|storage) 읽기·쓰기 + 파트너 자기폴더 읽기 + collab 읽기.
drop policy if exists "final staff rw" on storage.objects;
create policy "final staff rw" on storage.objects for all to authenticated
  using (bucket_id = 'memoria-final' and (memoria.staff_has_perm('production') or memoria.staff_has_perm('storage')))
  with check (bucket_id = 'memoria-final' and (memoria.staff_has_perm('production') or memoria.staff_has_perm('storage')));
drop policy if exists "final partner read" on storage.objects;
create policy "final partner read" on storage.objects for select to authenticated
  using (bucket_id = 'memoria-final' and (storage.foldername(name))[1] = memoria.current_partner_id());
drop policy if exists "final collab read" on storage.objects;
create policy "final collab read" on storage.objects for select to authenticated
  using (bucket_id = 'memoria-final' and memoria.is_collab());
