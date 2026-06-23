-- ─────────────────────────────────────────────────────────────
-- 0026_submission_asset_roles.sql — submission_assets.role 허용값 확장
--   위저드(보호자 제출)가 보내는 role(ai_video·slide_photo·memory_video)이
--   기존 CHECK(role in 'source','title')에 막혀 submit_link가 23514로 전부 실패 → 제출 불가.
--   워커는 role='title'만 사용(나머진 위치로 판별)하나, 의미보존 위해 위저드 role 전부 허용.
-- ─────────────────────────────────────────────────────────────
alter table memoria.submission_assets drop constraint if exists submission_assets_role_check;
alter table memoria.submission_assets add constraint submission_assets_role_check
  check (role = any (array['source','title','ai_video','slide_photo','memory_video']));
