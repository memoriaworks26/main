-- BGM 음원 합성 — 실제 음원 파일 경로 + 볼륨·페이드(파트너 템플릿). 추억영상 구간 BGM 덕킹은 워커 compose에서.
alter table memoria.bgm add column if not exists storage_path text;
alter table memoria.templates
  add column if not exists bgm_volume   int     not null default 70,
  add column if not exists bgm_fade_in  numeric not null default 1,
  add column if not exists bgm_fade_out numeric not null default 2;

-- staff가 보호자 업로드 버킷에 쓰기(소스 사진/영상 교체·추가).
drop policy if exists "uploads staff write" on storage.objects;
create policy "uploads staff write" on storage.objects for all to authenticated
  using (bucket_id='memoria-uploads' and (memoria.staff_has_perm('production') or memoria.staff_has_perm('customers') or memoria.staff_has_perm('secondedit') or memoria.staff_has_perm('storage')))
  with check (bucket_id='memoria-uploads' and (memoria.staff_has_perm('production') or memoria.staff_has_perm('customers') or memoria.staff_has_perm('secondedit') or memoria.staff_has_perm('storage')));
