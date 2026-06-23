-- ─────────────────────────────────────────────────────────────
-- 0027_reservation_intake_manager.sql — 파트너 예약담당 ≠ HQ 작업자 분리
--   intake(예약접수)의 담당자명을 reservation.assignee(HQ 작업자 칸)에 넣어 충돌
--   (작업자 칩이 떠서 편집·컨펌의 '받기'가 숨겨짐) → 파트너측 담당자는 별 칸으로.
--   assignee_name = HQ 작업자(받기로 배정), intake_manager = 파트너 예약담당.
-- ─────────────────────────────────────────────────────────────
alter table memoria.reservations add column if not exists intake_manager text;
