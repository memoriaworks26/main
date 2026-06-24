-- 2단계 렌더(블록 생성 / 합성) — 결과물 자산 role + 제출 상태 확장.
-- 블록 생성: 타이틀(Seedream i2i)·AI영상(Kling i2v) 결과를 submission_assets에 저장 → 편집기 표시.
alter table memoria.submission_assets drop constraint if exists submission_assets_role_check;
alter table memoria.submission_assets add constraint submission_assets_role_check
  check (role = any (array[
    'source','title','ai_video','slide_photo','memory_video',
    'title_result','ai_video_result','slide_video'
  ]));

-- 상태 흐름: draft → queued(블록 생성) → blocks_ready → compose_queued(관리자 최종렌더) → composing → done
alter table memoria.submissions drop constraint if exists submissions_status_check;
alter table memoria.submissions add constraint submissions_status_check
  check (status in ('draft','queued','rendering','blocks_ready','compose_queued','composing','done','failed','expired'));

-- 합성 잡 클레임 — compose_queued 1건을 composing으로 원자적 잠금(service_role 전용).
create or replace function memoria.claim_compose_job()
returns memoria.submissions
language plpgsql security definer set search_path = memoria, public, pg_temp as $$
declare r memoria.submissions;
begin
  select * into r from memoria.submissions
   where status = 'compose_queued'
   order by submitted_at nulls first, created_at
   for update skip locked limit 1;
  if not found then return null; end if;
  update memoria.submissions
     set status = 'composing', render_started_at = now(), render_error = null
   where id = r.id returning * into r;
  return r;
end;
$$;
revoke all on function memoria.claim_compose_job() from public;
grant execute on function memoria.claim_compose_job() to service_role;
