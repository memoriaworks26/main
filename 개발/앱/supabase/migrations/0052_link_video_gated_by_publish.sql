-- ─────────────────────────────────────────────────────────────
-- 유저 링크 영상 노출을 '컨펌(발행)' 이후로 게이팅.
--   버그: resolve_link가 submission.status='done'+video_url을 예약 컨펌 여부와
--         무관하게 노출 → 컨펌 대기(reservations.status='confirm') 중에도 보호자
--         링크에 완성 영상이 떴다. (편집기 「최종 렌더·컨펌 요청」→ 예약 confirm +
--         렌더 시작 → 워커가 submission done+video_url → 관리자 「확인·컨펌」에서
--         예약 published. 그 사이 done이라 그대로 노출되던 것.)
--   수정: 연결된 예약이 published(=확인·컨펌/발행)일 때만 완료('done')+video_url 노출.
--         발행 전에는 'rendering'(제작 중)으로 표시하고 video_url은 숨긴다.
--         → 보호자 링크는 계속 폴링(status<>'done')하다 발행되는 즉시 영상 표출.
--   비고: submissions.status 자체는 워커가 done으로 두는 게 정상(재생 준비 완료).
--         노출 게이트만 예약 발행 기준으로 얹는다. 예약이 없으면 발행 불가 → 미노출.
-- ─────────────────────────────────────────────────────────────
create or replace function public.resolve_link(p_token text)
returns json language plpgsql security definer set search_path = memoria, public as $$
declare
  r         memoria.submissions;
  rv_status text;
  published boolean;
  expired   boolean;
begin
  select * into r from memoria.submissions where token = p_token;
  if not found then return null; end if;

  -- 연결된 예약의 발행(컨펌) 여부. 예약이 없으면(rv_status is null) 발행 불가 → 미노출.
  select status into rv_status from memoria.reservations where id = r.reservation_id;
  published := (rv_status = 'published');
  expired   := (r.expires_at is not null and r.expires_at < now());

  return json_build_object(
    'pet_name', r.pet_name,
    'partner_name', r.partner_name,
    -- 발행 전 완료본은 '제작 중'으로 감춘다(컨펌돼야 노출).
    'status', case
                when expired then 'expired'
                when r.status = 'done' and not published then 'rendering'
                else r.status
              end,
    -- 발행 + 미만료일 때만 실제 영상 URL 노출.
    'video_url', case when r.status = 'done' and published and not expired then r.video_url else null end,
    'expires_at', r.expires_at
  );
end;
$$;

-- anon이 토큰으로만 호출(0001과 동일).
grant execute on function public.resolve_link(text) to anon;
