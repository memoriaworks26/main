-- ─────────────────────────────────────────────────────────────
-- 0008_public_rpc.sql — 보호자(anon) 공개설정 RPC
--   company(처리방침·계좌 등)·term_configs는 RLS로 anon 직접 접근 차단됨.
--   보호자 화면에 필요한 처리방침/동의문구/용어/고객센터만 토큰 검증 후 화이트리스트로 반환.
--   (계좌·사업자번호·내부 알림 연락처 등은 절대 반환하지 않음)
-- ─────────────────────────────────────────────────────────────

create or replace function public.get_user_link_config(p_token text)
returns json language plpgsql security definer set search_path = memoria, public, pg_temp as $$
declare
  v_biz      uuid;
  v_company  memoria.company%rowtype;
  v_terms    json;
  v_usertext json;
begin
  -- 토큰 유효성 + 사업부 해석(submission → reservation → partner → biz)
  select pt.biz_unit_id into v_biz
    from memoria.submissions s
    left join memoria.reservations r on r.id = s.reservation_id
    left join memoria.partners pt on pt.id = r.partner_id
   where s.token = p_token;
  if not found then
    return null;   -- 유효하지 않은 토큰
  end if;

  select * into v_company from memoria.company where id = 1;

  select coalesce(json_object_agg(term_key, json_build_object('partner', partner_text, 'user', user_text)), '{}'::json)
    into v_terms
    from memoria.term_configs where biz_unit_id = v_biz;

  select coalesce(json_object_agg(key, value), '{}'::json)
    into v_usertext
    from memoria.user_text_overrides where biz_unit_id = v_biz;

  return json_build_object(
    'cs_phone',          v_company.cs_phone,
    'cs_hours',          v_company.cs_hours,
    'consent_privacy',   v_company.consent_privacy,
    'consent_marketing', v_company.consent_marketing,
    'privacy_policy',    v_company.privacy_policy,
    'privacy_officer',   v_company.privacy_officer,
    'terms',             v_terms,
    'user_text',         v_usertext
  );
end;
$$;

grant execute on function public.get_user_link_config(text) to anon, authenticated;
