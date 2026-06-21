-- ─────────────────────────────────────────────────────────────
-- 0009_privacy_audit.sql — 개인정보보호법 이행 안전장치
--   ① access_log : PII 조회/다운로드 감사기록(추기전용 append-only, master만 조회)
--   ② purge_reservation : 예약·제출·자산·영상·정산 완전 파기(master만, 보호자 삭제요청 이행)
--   ③ expires_at + 만료건 식별 뷰 : 퇴실 시 만료 → 워커/스케줄이 purge 호출
-- ─────────────────────────────────────────────────────────────

-- ① 감사 로그 (추기전용)
create table if not exists memoria.access_log (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid,                 -- auth.uid (null=시스템/anon)
  actor_role  text,                 -- master|worker|collab|partner|anon|system
  action      text not null check (action in ('view','download','purge','export')),
  target_type text not null,        -- submission|video|source|reservation|settlement|...
  target_id   text,
  partner_id  text,
  detail      jsonb not null default '{}'::jsonb,
  at          timestamptz not null default now()
);
create index if not exists idx_audit_at on memoria.access_log(at);
create index if not exists idx_audit_actor on memoria.access_log(actor_id);

alter table memoria.access_log enable row level security;
-- master만 조회. insert/update/delete 정책 없음 → 직접 변경 불가(오직 log_access 정의자 RPC로만 적재 = 추기전용).
create policy audit_master_read on memoria.access_log
  for select to authenticated using (memoria.is_master());
grant select on memoria.access_log to authenticated;  -- 행 통제는 RLS(master만)

-- 감사 기록 RPC(정의자 권한으로 적재 → 호출자는 행을 수정/삭제 불가)
create or replace function memoria.log_access(
  p_action text, p_target_type text, p_target_id text,
  p_partner_id text default null, p_detail jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path = memoria, public, pg_temp as $$
begin
  insert into memoria.access_log(actor_id, actor_role, action, target_type, target_id, partner_id, detail)
  values (
    auth.uid(),
    coalesce(
      (select role from memoria.staff where auth_user_id = auth.uid() and status='active'),
      case when memoria.current_partner_id() is not null then 'partner' else 'anon' end
    ),
    p_action, p_target_type, p_target_id, p_partner_id, p_detail
  );
end;
$$;
grant execute on function memoria.log_access(text,text,text,text,jsonb) to authenticated;

-- ② 만료 컬럼 (videos엔 0006에 이미 존재)
alter table memoria.reservations add column if not exists expires_at timestamptz;

-- ③ 완전 파기 — master만(내부 체크). submissions/videos/settlement는 FK가 set null이라 명시 삭제.
create or replace function memoria.purge_reservation(p_reserv text)
returns json language plpgsql security definer set search_path = memoria, public, pg_temp as $$
declare
  v_paths text[];
begin
  if not memoria.is_master() then
    raise exception 'forbidden: purge_reservation is master-only';
  end if;

  -- 삭제 전 스토리지 경로 수집(객체 실삭제는 provider 확정 후 워커가 수행)
  select coalesce(array_agg(x), '{}') into v_paths from (
    select storage_path as x from memoria.submission_assets
      where submission_id in (select id from memoria.submissions where reservation_id = p_reserv)
        and storage_path is not null
    union all
    select final_path  from memoria.videos where reservation_id = p_reserv and final_path  is not null
    union all
    select source_path from memoria.videos where reservation_id = p_reserv and source_path is not null
  ) q;

  delete from memoria.submission_assets
    where submission_id in (select id from memoria.submissions where reservation_id = p_reserv);
  delete from memoria.submissions     where reservation_id = p_reserv;
  delete from memoria.videos          where reservation_id = p_reserv;
  delete from memoria.settlement_items where reservation_id = p_reserv;
  delete from memoria.second_edit_jobs where reservation_id = p_reserv;
  delete from memoria.reservations    where id = p_reserv;

  insert into memoria.access_log(actor_id, actor_role, action, target_type, target_id, detail)
  values (auth.uid(), 'master', 'purge', 'reservation', p_reserv,
          json_build_object('storage_paths', v_paths));

  return json_build_object('purged', p_reserv, 'storage_paths', to_json(v_paths));
end;
$$;
grant execute on function memoria.purge_reservation(text) to authenticated;

-- 만료건 식별 뷰(security_invoker → 호출자 RLS 적용: 자기 스코프 만료건만)
create or replace view memoria.expired_reservations with (security_invoker = on) as
  select id, partner_id, expires_at from memoria.reservations
   where expires_at is not null and expires_at < now();
grant select on memoria.expired_reservations to authenticated;
