-- ─────────────────────────────────────────────────────────────
-- 0033_signage_device_enroll.sql — 사이니지 디바이스 등록·인증·명령 채널
--   라즈베리파이는 콘솔 RLS를 거치지 않고 자기 토큰으로 device-sync(service_role)에
--   붙는다. 그래서 디바이스 인증은 토큰 해시 1컬럼으로 끝(파이는 Supabase 유저 아님).
--     · enroll_code        : 콘솔이 발급, 파이가 device-enroll에서 토큰과 교환(1회용)
--     · device_token_hash  : sha256(토큰). 평문 미저장. 분실 시 NULL로 폐기(revoke)
--     · pending_cmd        : 라이브 컨트롤의 '일회성 명령'(restart/reboot/refresh/redownload).
--                            파이가 읽고 실행 → device-sync가 비움. (모드·음량은 기존 컬럼 폴링)
--     · orientation        : 모니터 방향(가로/세로 사이니지)
--     · current_video_id   : 파이가 보고하는 현재 재생 영상(콘솔 표시용)
--   room_id 정규화: 0016에서 임시로 쓰던 room_label(텍스트)을 room_id(uuid)로 백필.
--   RLS: 디바이스는 service_role 엣지함수로만 붙음 → 새 접근정책 불필요(기존 staff/partner 유지).
-- ─────────────────────────────────────────────────────────────

alter table memoria.signage_devices
  add column if not exists device_token_hash text,
  add column if not exists enroll_code       text,
  add column if not exists enroll_expires_at timestamptz,
  add column if not exists pending_cmd        text,
  add column if not exists pending_cmd_at     timestamptz,
  add column if not exists current_video_id   text,
  add column if not exists orientation        text not null default 'landscape';

alter table memoria.signage_devices drop constraint if exists signage_devices_pending_cmd_check;
alter table memoria.signage_devices add constraint signage_devices_pending_cmd_check
  check (pending_cmd is null or pending_cmd in ('restart','reboot','refresh','redownload'));
alter table memoria.signage_devices drop constraint if exists signage_devices_orientation_check;
alter table memoria.signage_devices add constraint signage_devices_orientation_check
  check (orientation in ('landscape','portrait'));

-- 토큰·등록코드는 디바이스당 고유(NULL 다수 허용 → 부분 유니크 인덱스)
create unique index if not exists uq_dev_token  on memoria.signage_devices(device_token_hash)
  where device_token_hash is not null;
create unique index if not exists uq_dev_enroll on memoria.signage_devices(enroll_code)
  where enroll_code is not null;

-- room_label(텍스트) → room_id(uuid) 백필: 같은 파트너 내 호실명 일치로 연결
update memoria.signage_devices d
   set room_id = r.id
  from memoria.rooms r
 where d.room_id is null
   and d.room_label is not null
   and r.partner_id = d.partner_id
   and r.name = d.room_label;

-- ── 콘솔용 RPC: 등록코드 발급(=재프로비저닝 — 기존 토큰도 폐기) ──
--   master 또는 staff(signage)+사업부 격리. 8자리 코드, 24시간 유효.
create or replace function memoria.signage_issue_enroll(p_device text)
returns text language plpgsql security definer set search_path = memoria, public, pg_temp as $$
declare v_code text; v_partner text;
begin
  select partner_id into v_partner from memoria.signage_devices where id = p_device;
  if v_partner is null then raise exception 'device not found'; end if;
  if not (memoria.is_master() or (memoria.staff_has_perm('signage') and memoria.staff_can_partner(v_partner))) then
    raise exception 'forbidden';
  end if;
  v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  update memoria.signage_devices
     set enroll_code = v_code, enroll_expires_at = now() + interval '24 hours',
         device_token_hash = null, status = 'pending'
   where id = p_device;
  return v_code;
end $$;
grant execute on function memoria.signage_issue_enroll(text) to authenticated;

-- ── 콘솔용 RPC: 디바이스 폐기(분실·교체 — 토큰/코드 무효화) ──
create or replace function memoria.signage_revoke(p_device text)
returns void language plpgsql security definer set search_path = memoria, public, pg_temp as $$
declare v_partner text;
begin
  select partner_id into v_partner from memoria.signage_devices where id = p_device;
  if v_partner is null then raise exception 'device not found'; end if;
  if not (memoria.is_master() or (memoria.staff_has_perm('signage') and memoria.staff_can_partner(v_partner))) then
    raise exception 'forbidden';
  end if;
  update memoria.signage_devices
     set device_token_hash = null, enroll_code = null, enroll_expires_at = null, status = 'offline'
   where id = p_device;
end $$;
grant execute on function memoria.signage_revoke(text) to authenticated;
