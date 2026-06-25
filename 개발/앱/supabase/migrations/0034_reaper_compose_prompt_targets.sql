-- 리퍼 확장: 멈춘 'composing'(합성)도 compose_queued로 재시도(크레딧 없음). 'rendering'은 기존대로.
create or replace function memoria.requeue_stale_renders(p_minutes int default 15, p_max_attempts int default 3)
returns int language plpgsql security definer set search_path = memoria, public, pg_temp as $$
declare n int; m int;
begin
  with stale as (
    update memoria.submissions
       set status = case when render_attempts >= p_max_attempts then 'failed' else 'queued' end,
           render_error = case when render_attempts >= p_max_attempts then 'stale render timeout (워커 중단 추정)' else render_error end
     where status = 'rendering' and coalesce(render_started_at, created_at) < now() - make_interval(mins => p_minutes)
     returning 1
  ) select count(*) into n from stale;
  with stale2 as (
    update memoria.submissions set status = 'compose_queued'
     where status = 'composing' and coalesce(render_started_at, created_at) < now() - make_interval(mins => p_minutes)
     returning 1
  ) select count(*) into m from stale2;
  return n + m;
end;
$$;
revoke all on function memoria.requeue_stale_renders(int, int) from public;
grant execute on function memoria.requeue_stale_renders(int, int) to service_role;

-- 프롬프트 타깃: 타이틀 통합 → API 호출별(이미지1/이미지2/AI영상). 기존 '타이틀'은 '이미지1'로 이관.
update memoria.ai_prompts set target = '이미지1' where target = '타이틀';
