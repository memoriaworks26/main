-- 0053_bgm_partner_scope.sql — 콘텐츠 허브 음악(BGM) 대상(귀속) 지정.
--   지금까지 음악은 항상 공용(전체 파트너 공통)이라 콘텐츠 허브에서 '대상' 수정이 막혀 있었다.
--   클립·사진(content_assets)처럼 파트너 지정이 가능하도록 bgm에 partner_id 추가.
--   진실의 출처 하나: partner_id IS NULL = 공용(전체 노출), partner_id = P = 그 파트너 전용.
--   (별도 shared 불린을 두지 않아 파트너 삭제 시 set null → 자동 공용화, 불일치 없음)
--   기존 곡은 partner_id NULL → 전부 공용으로 그대로 유지(무중단).
alter table memoria.bgm
  add column if not exists partner_id text references memoria.partners(id) on delete set null;
create index if not exists idx_bgm_partner on memoria.bgm(partner_id);

-- get_user_link_config(0051) 확장 — 유저링크 BGM은 '공용 + 이 링크 파트너 전용'만 노출.
--   선택(link_bgm_ids)/미선택 두 경로 모두에 대상 스코프 필터 적용(다른 파트너 전용곡 유출 차단).
--   0051 본문 그대로 + bgm 두 갈래에 (partner_id is null or partner_id = v_partner.id)만 추가.
create or replace function public.get_user_link_config(p_token text)
returns json language plpgsql security definer set search_path = memoria, public, pg_temp as $$
declare
  v_biz      uuid;
  v_partner  memoria.partners%rowtype;
  v_company  memoria.company%rowtype;
  v_terms    json;
  v_usertext json;
  v_photos   json;
  v_bgm      json;
  v_bgm_ids  jsonb;
begin
  select pt.* into v_partner
    from memoria.submissions s
    left join memoria.reservations r on r.id = s.reservation_id
    left join memoria.partners pt on pt.id = r.partner_id
   where s.token = p_token;
  if not found then
    return null;
  end if;
  v_biz := v_partner.biz_unit_id;

  select * into v_company from memoria.company where id = 1;

  select coalesce(json_object_agg(term_key, json_build_object('partner', partner_text, 'user', user_text)), '{}'::json)
    into v_terms
    from memoria.term_configs where biz_unit_id = v_biz;

  select coalesce(json_object_agg(key, value), '{}'::json)
    into v_usertext
    from memoria.user_text_overrides where biz_unit_id = v_biz;

  select coalesce(json_object_agg(key, data_url), '{}'::json)
    into v_photos
    from memoria.user_photos where biz_unit_id = v_biz;

  -- 이 파트너 템플릿이 고른 링크 노출 BGM(최대 3곡).
  select link_bgm_ids into v_bgm_ids
    from memoria.templates where partner_id = v_partner.id;

  if v_bgm_ids is not null and jsonb_array_length(v_bgm_ids) > 0 then
    -- 선택된 곡만, 선택 순서대로. 공용 또는 이 파트너 전용 곡만(다른 파트너 전용곡은 자동 제외).
    select coalesce(json_agg(json_build_object('id', b.id, 'name', b.name, 'meta', b.meta, 'storage_path', b.storage_path) order by sel.ord), '[]'::json)
      into v_bgm
      from jsonb_array_elements_text(v_bgm_ids) with ordinality as sel(bgm_id, ord)
      join memoria.bgm b on b.id = sel.bgm_id
     where b.storage_path is not null
       and (b.partner_id is null or b.partner_id = v_partner.id);
  else
    -- 미선택 파트너 — 공용 + 이 파트너 전용 곡 전체(무중단 폴백).
    select coalesce(json_agg(json_build_object('id', id, 'name', name, 'meta', meta, 'storage_path', storage_path) order by created_at), '[]'::json)
      into v_bgm
      from memoria.bgm
     where storage_path is not null
       and (partner_id is null or partner_id = v_partner.id);
  end if;

  return json_build_object(
    'cs_phone',          v_company.cs_phone,
    'cs_hours',          v_company.cs_hours,
    'consent_privacy',   v_company.consent_privacy,
    'consent_marketing', v_company.consent_marketing,
    'privacy_policy',    v_company.privacy_policy,
    'privacy_officer',   v_company.privacy_officer,
    'terms',             v_terms,
    'user_text',         v_usertext,
    'user_photos',       v_photos,
    'bgm',               v_bgm,
    'partner_name',      v_partner.name,
    'partner_cs_phone',  v_partner.cs_phone,
    'partner_cs_hours',  v_partner.cs_hours
  );
end;
$$;

grant execute on function public.get_user_link_config(text) to anon, authenticated;
