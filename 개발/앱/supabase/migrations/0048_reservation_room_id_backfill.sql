-- 0048_reservation_room_id_backfill.sql — 예약↔호실을 텍스트(room_label) → room_id(uuid) 기준으로.
--   배경: 예약은 room_label(텍스트 스냅샷)만 들고 있어, 호실명을 바꾸면 기존 예약이 그 호실과 어긋남(staleness).
--         스키마엔 reservations.room_id(uuid FK, 0003)가 있으나 앱이 채우지 않아 대부분 NULL.
--   해결: 기존 예약의 room_id를 room_label로 1회 백필(파트너 내 호실명은 unique 제약이라 1:1 안전).
--         이후 앱은 호실 지정 시 room_id를 함께 쓰고, 조회 시 room_id의 '현재 이름'으로 호실명을 도출 → 이름 변경 즉시 반영.
update memoria.reservations rv
   set room_id = r.id
  from memoria.rooms r
 where rv.room_id is null
   and rv.room_label is not null
   and r.partner_id = rv.partner_id
   and r.name = rv.room_label;
