-- ─────────────────────────────────────────────────────────────
-- 0024_signage_partner_storage.sql — 파트너 사이니지 소스 업로드 권한
--   memoria-content는 콘텐츠허브(staff 쓰기)·파트너 읽기 전용이라 파트너가
--   사이니지 소스를 못 올렸음. 파트너가 자기 폴더의 'signage' 하위에만
--   쓰기/수정/삭제할 수 있도록 스코프 좁힌 정책 추가(다른 콘텐츠 경로엔 못 씀).
--   경로 규칙: <partner_id>/signage/<id>.<ext>
-- ─────────────────────────────────────────────────────────────
drop policy if exists "content partner signage write" on storage.objects;
create policy "content partner signage write" on storage.objects for all to authenticated
  using (
    bucket_id = 'memoria-content'
    and (storage.foldername(name))[1] = memoria.current_partner_id()
    and (storage.foldername(name))[2] = 'signage'
  )
  with check (
    bucket_id = 'memoria-content'
    and (storage.foldername(name))[1] = memoria.current_partner_id()
    and (storage.foldername(name))[2] = 'signage'
  );
