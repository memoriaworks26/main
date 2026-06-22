-- ─────────────────────────────────────────────────────────────
-- 0010_render_queue.sql — 렌더 큐 기반(Phase 7 워커용)
--   · submissions에 재시도/오류/시작시각 컬럼 + 'failed' 상태
--   · claim_render_job(): 가장 오래된 queued 1건을 원자적으로 rendering 잠금
--     (FOR UPDATE SKIP LOCKED — 워커 다중 실행 시 중복 처리 방지). 서버(service_role)만.
-- 워커의 완료/실패 기록은 service_role이 RLS 우회로 직접 update/insert.
-- ─────────────────────────────────────────────────────────────

alter table memoria.submissions add column if not exists render_attempts   int not null default 0;
alter table memoria.submissions add column if not exists render_error       text;
alter table memoria.submissions add column if not exists render_started_at  timestamptz;

alter table memoria.submissions drop constraint if exists submissions_status_check;
alter table memoria.submissions add constraint submissions_status_check
  check (status in ('draft','queued','rendering','done','failed','expired'));

create or replace function memoria.claim_render_job()
returns memoria.submissions
language plpgsql security definer set search_path = memoria, public, pg_temp as $$
declare r memoria.submissions;
begin
  select * into r from memoria.submissions
   where status = 'queued'
   order by submitted_at nulls first, created_at
   for update skip locked
   limit 1;
  if not found then return null; end if;

  update memoria.submissions
     set status = 'rendering',
         render_started_at = now(),
         render_attempts = render_attempts + 1,
         render_error = null
   where id = r.id
   returning * into r;
  return r;
end;
$$;

-- 렌더 제어 함수는 서버(service_role) 전용. anon/authenticated 접근 차단.
revoke all on function memoria.claim_render_job() from public;
grant execute on function memoria.claim_render_job() to service_role;
