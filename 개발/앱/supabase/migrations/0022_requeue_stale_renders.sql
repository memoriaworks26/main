-- ─────────────────────────────────────────────────────────────
-- 0022_requeue_stale_renders.sql — 멈춘(rendering) 렌더 복구(리퍼)
--   문제: Railway 재배포/크래시로 워커가 렌더 도중 죽으면 그 건이 'rendering'에
--         영영 갇혀 재처리되지 않음(보호자가 영상을 못 받음).
--   해결: claim 시 기록되는 render_started_at 기준으로 N분 이상 멈춘 'rendering'을
--         재큐(queued)로 되돌림. 단 시도횟수(render_attempts)가 한도 이상이면 'failed'.
--   서버(service_role) 전용. 워커가 주기적으로 호출.
-- ─────────────────────────────────────────────────────────────

create or replace function memoria.requeue_stale_renders(p_minutes int default 15, p_max_attempts int default 3)
returns int
language plpgsql security definer set search_path = memoria, public, pg_temp as $$
declare n int;
begin
  with stale as (
    update memoria.submissions
       set status = case when render_attempts >= p_max_attempts then 'failed' else 'queued' end,
           render_error = case when render_attempts >= p_max_attempts
                               then 'stale render timeout (워커 중단 추정)' else render_error end
     where status = 'rendering'
       and coalesce(render_started_at, created_at) < now() - make_interval(mins => p_minutes)
     returning 1
  )
  select count(*) into n from stale;
  return n;
end;
$$;

revoke all on function memoria.requeue_stale_renders(int, int) from public;
grant execute on function memoria.requeue_stale_renders(int, int) to service_role;
