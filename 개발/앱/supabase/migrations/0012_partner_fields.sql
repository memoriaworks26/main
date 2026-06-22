-- ─────────────────────────────────────────────────────────────
-- 0012_partner_fields.sql — 파트너 등록 UI가 수집하는 사업자/연락 필드 보강
--   (거래명세서·세금계산서용 사업자정보 + 이메일 + 로고). 배선 시 드러난 UI↔DB 불일치 교정.
--   reservThisMonth·revenue는 파생값이라 저장하지 않음(예약·정산에서 집계).
-- ─────────────────────────────────────────────────────────────
alter table memoria.partners add column if not exists biz_no    text;
alter table memoria.partners add column if not exists ceo       text;
alter table memoria.partners add column if not exists address   text;
alter table memoria.partners add column if not exists biz_type  text;
alter table memoria.partners add column if not exists biz_item  text;
alter table memoria.partners add column if not exists email     text;
alter table memoria.partners add column if not exists logo      text;
