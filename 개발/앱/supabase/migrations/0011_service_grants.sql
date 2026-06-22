-- ─────────────────────────────────────────────────────────────
-- 0011_service_grants.sql — 백엔드(service_role) 권한
--   렌더 워커는 service_role로 memoria 스키마에 직접 접근(RLS 우회)한다.
--   service_role은 BYPASSRLS지만 스키마 USAGE·객체 권한은 별도 부여 필요.
--   (anon/authenticated는 0002~에서 이미 부여 — 여기선 service_role만)
-- ─────────────────────────────────────────────────────────────
grant usage on schema memoria to service_role;
grant all privileges on all tables in schema memoria to service_role;
grant all privileges on all sequences in schema memoria to service_role;
grant execute on all functions in schema memoria to service_role;

-- 이후 생성되는 객체에도 자동 적용(향후 마이그레이션 편의)
alter default privileges in schema memoria grant all on tables to service_role;
alter default privileges in schema memoria grant all on sequences to service_role;
alter default privileges in schema memoria grant execute on functions to service_role;
