-- 0019_submission_partner_insert.sql — 파트너가 자기 예약의 보호자 제작링크(submission) 발급 허용.
--   기존(0004): submissions insert는 staff만. 실무는 파트너가 접수 시 링크 발급 → 파트너 insert 추가.
--   자기 파트너 예약(reservation_belongs_to_current_partner)에 한정.
create policy subm_partner_insert on memoria.submissions
  for insert to authenticated
  with check (memoria.reservation_belongs_to_current_partner(reservation_id));
