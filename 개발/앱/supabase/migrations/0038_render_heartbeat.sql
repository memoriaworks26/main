-- ─────────────────────────────────────────────────────────────
-- 렌더 하트비트 — 긴 합성/생성이 reaper(기본 15분)에 'stale'로 오판돼
--   중복 compose·상태 튐이 나는 것을 방지. 워커가 작업 도중 주기적으로
--   render_heartbeat_at = now() 를 갱신하고, reaper는 이 하트비트를 우선 기준으로 멈춤 판정.
--   (claim 시 한 번만 찍히는 render_started_at 만으로는 긴 작업을 멈춘 것으로 오인)
-- ─────────────────────────────────────────────────────────────
alter table memoria.submissions add column if not exists render_heartbeat_at timestamptz;

-- 하트비트 터치 — 진행 중(rendering/composing)일 때만 갱신. 완료/실패 후 호출은 무시.
create or replace function memoria.touch_render_heartbeat(p_id uuid)
returns void language sql security definer set search_path = memoria, public, pg_temp as $$
  update memoria.submissions set render_heartbeat_at = now()
   where id = p_id and status in ('rendering', 'composing');
$$;
revoke all on function memoria.touch_render_heartbeat(uuid) from public;
grant execute on function memoria.touch_render_heartbeat(uuid) to service_role;

-- reaper: stale 기준을 하트비트 우선(없으면 시작시각→생성시각)으로. rendering·composing 동일.
create or replace function memoria.requeue_stale_renders(p_minutes int default 15, p_max_attempts int default 3)
returns int language plpgsql security definer set search_path = memoria, public, pg_temp as $$
declare n int; m int;
begin
  with stale as (
    update memoria.submissions
       set status = case when render_attempts >= p_max_attempts then 'failed' else 'queued' end,
           render_error = case when render_attempts >= p_max_attempts then 'stale render timeout (워커 중단 추정)' else render_error end
     where status = 'rendering'
       and coalesce(render_heartbeat_at, render_started_at, created_at) < now() - make_interval(mins => p_minutes)
     returning 1
  ) select count(*) into n from stale;
  with stale2 as (
    update memoria.submissions set status = 'compose_queued'
     where status = 'composing'
       and coalesce(render_heartbeat_at, render_started_at, created_at) < now() - make_interval(mins => p_minutes)
     returning 1
  ) select count(*) into m from stale2;
  return n + m;
end;
$$;
revoke all on function memoria.requeue_stale_renders(int, int) from public;
grant execute on function memoria.requeue_stale_renders(int, int) to service_role;
