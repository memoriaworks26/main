-- ─────────────────────────────────────────────────────────────
-- 기본 템플릿(__default__) 전 staff 읽기 허용.
--   배경: 0004의 tmpl_staff_rw는 staff_can_partner(partner_id)를 요구하는데,
--   __default__는 partners에 없어 staff_can_partner=is_master()만 통과 → master만 읽힘.
--   그 결과 worker 세션은 fetchTemplates에 __default__가 안 들어와, 신규 파트너 등록 시
--   복제 원본이 비어 빈 템플릿이 생성됨(빈 복제 버그).
--   기본 템플릿은 민감정보 없는 전역 골격이므로 전 staff에게 SELECT만 개방.
--   쓰기(편집)는 기존 tmpl_staff_rw(master/templates perm) 그대로 유지.
-- ─────────────────────────────────────────────────────────────
drop policy if exists tmpl_default_read on memoria.templates;
create policy tmpl_default_read on memoria.templates
  for select to authenticated
  using (partner_id = '__default__' and memoria.is_staff());
