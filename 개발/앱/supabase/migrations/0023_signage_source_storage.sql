-- ─────────────────────────────────────────────────────────────
-- 0023_signage_source_storage.sql — 사이니지 소스 실파일 저장
--   기존 signage_sources.file은 표시 파일명만 담던 목업. 실제 파일을 스토리지에
--   올리고 그 경로를 보관할 storage_path 추가(디바이스가 서명URL로 가져감).
--   RLS 변경 없음(기존 signage_sources 정책 그대로).
-- ─────────────────────────────────────────────────────────────
alter table memoria.signage_sources
  add column if not exists storage_path text;
