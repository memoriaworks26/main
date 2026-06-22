-- ─────────────────────────────────────────────────────────────
-- 0021_reservation_pet_fields.sql — 예약접수 폼이 수집하는 펫 부가정보 보존
--   intake(예약접수) 폼은 반려동물 품종·나이를 입력받는데 reservations에 컬럼이 없어
--   그대로 두면 입력값이 버려짐(QA HIGH). 무손실 위해 nullable 컬럼 2개 추가.
--   RLS/정책 변경 없음(기존 reservations 정책이 그대로 적용).
-- ─────────────────────────────────────────────────────────────
alter table memoria.reservations
  add column if not exists breed text,
  add column if not exists age   text;
