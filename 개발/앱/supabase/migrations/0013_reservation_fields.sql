-- ─────────────────────────────────────────────────────────────
-- 0013_reservation_fields.sql — 예약 배선용 denormalized 컬럼
--   mockup 예약은 room(텍스트)·assignee(이름)를 쓰는데 DB는 room_id/assignee_id(FK).
--   rooms·staff가 아직 채워지지 않은 단계라, 우선 텍스트로 보관하고
--   FK(room_id/assignee_id)는 rooms·계정 배선 후 정규화(백필).
-- ─────────────────────────────────────────────────────────────
alter table memoria.reservations add column if not exists room_label    text;  -- '1호실' / '특1호실'
alter table memoria.reservations add column if not exists assignee_name text;  -- 작업자 이름(정규화 전)
