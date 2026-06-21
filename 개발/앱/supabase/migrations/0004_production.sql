-- ─────────────────────────────────────────────────────────────
-- 0004_production.sql — 제출물 정책(0001 테이블에 staff·파트너 얹기) + 콘텐츠/템플릿/BGM/프롬프트
--   · submissions/submission_assets: anon은 0001 RPC 유지, 여기서 staff·파트너 접근만 추가
--   · content_assets·templates: 파트너 자기것 읽기 + staff(perm) + 사업부 격리
-- ─────────────────────────────────────────────────────────────

-- ── 제출물 가시성 헬퍼 (SECURITY DEFINER) ──
create or replace function memoria.reservation_belongs_to_current_partner(p_reserv text)
returns boolean language sql stable security definer set search_path = memoria, public, pg_temp as $$
  select p_reserv is not null and exists (
    select 1 from memoria.reservations r
    where r.id = p_reserv and r.partner_id = memoria.current_partner_id()
  );
$$;

create or replace function memoria.submission_reservation_id(p_sid uuid)
returns text language sql stable security definer set search_path = memoria, public, pg_temp as $$
  select reservation_id from memoria.submissions where id = p_sid;
$$;

-- 제출물 1건이 현재 세션에 보이는가(staff perm+사업부 격리 OR 파트너 자기예약)
create or replace function memoria.submission_visible(p_sid uuid)
returns boolean language sql stable security definer set search_path = memoria, public, pg_temp as $$
  select exists (
    select 1 from memoria.submissions s
    where s.id = p_sid
      and (
        ( (memoria.staff_has_perm('production')
           or memoria.staff_has_perm('customers')
           or memoria.staff_has_perm('secondedit'))
          and memoria.staff_can_partner(memoria.reservation_partner_id(s.reservation_id)) )
        or memoria.reservation_belongs_to_current_partner(s.reservation_id)
      )
  );
$$;

grant execute on function
  memoria.reservation_belongs_to_current_partner(text),
  memoria.submission_reservation_id(uuid),
  memoria.submission_visible(uuid)
  to authenticated;

-- ── submissions (0001, RLS 이미 enable) — staff·파트너 정책 추가. anon은 RPC만. ──
create policy subm_staff_read on memoria.submissions
  for select to authenticated
  using ((memoria.staff_has_perm('production')
       or memoria.staff_has_perm('customers')
       or memoria.staff_has_perm('secondedit'))
       and memoria.staff_can_partner(memoria.reservation_partner_id(reservation_id)));
create policy subm_staff_insert on memoria.submissions   -- 예약 생성 시 토큰 발급(관리자)
  for insert to authenticated
  with check ((memoria.staff_has_perm('production') or memoria.staff_has_perm('customers'))
       and memoria.staff_can_partner(memoria.reservation_partner_id(reservation_id)));
create policy subm_staff_update on memoria.submissions    -- 워커 video_url/status 갱신
  for update to authenticated
  using (memoria.staff_has_perm('production')
       and memoria.staff_can_partner(memoria.reservation_partner_id(reservation_id)))
  with check (memoria.staff_has_perm('production')
       and memoria.staff_can_partner(memoria.reservation_partner_id(reservation_id)));
create policy subm_partner_read on memoria.submissions
  for select to authenticated
  using (memoria.reservation_belongs_to_current_partner(reservation_id));

-- ── submission_assets (0001, RLS 이미 enable) ──
create policy sa_visible_read on memoria.submission_assets
  for select to authenticated using (memoria.submission_visible(submission_id));
create policy sa_staff_write on memoria.submission_assets
  for all to authenticated
  using (memoria.staff_has_perm('production')
       and memoria.staff_can_partner(memoria.reservation_partner_id(memoria.submission_reservation_id(submission_id))))
  with check (memoria.staff_has_perm('production')
       and memoria.staff_can_partner(memoria.reservation_partner_id(memoria.submission_reservation_id(submission_id))));

grant select, insert, update on memoria.submissions to authenticated;
grant select, insert, update, delete on memoria.submission_assets to authenticated;

-- ── 콘텐츠 허브 자산(파트너별) ──
create table if not exists memoria.content_assets (
  id           text primary key,
  partner_id   text not null references memoria.partners(id) on delete cascade,
  kind         text not null check (kind in ('clip','photo')),
  name         text not null,
  meta         text,
  size_mb      numeric,
  storage_path text,
  created_at   timestamptz not null default now()
);
create index if not exists idx_content_partner on memoria.content_assets(partner_id);

-- ── 영상 템플릿(파트너별 1행 + __default__) ──
create table if not exists memoria.templates (
  partner_id  text primary key,                 -- 'P-001' 또는 '__default__'
  bgm_id      text,
  blocks      jsonb not null default '[]'::jsonb,
  updated_at  timestamptz not null default now(),
  constraint templates_pid_chk check (partner_id = '__default__' or partner_id ~ '^P-')
);

-- ── BGM 라이브러리 / AI 프롬프트 프리셋(전역 운영 자산) ──
create table if not exists memoria.bgm (
  id text primary key, name text not null, meta text,
  is_current boolean not null default false, created_at timestamptz not null default now()
);
create table if not exists memoria.ai_prompts (
  id text primary key, target text, name text, body text,
  created_at timestamptz not null default now()
);

alter table memoria.content_assets enable row level security;
alter table memoria.templates      enable row level security;
alter table memoria.bgm            enable row level security;
alter table memoria.ai_prompts     enable row level security;

-- content_assets: 파트너 자기것 읽기 + staff(content) + 사업부 격리(쓰기=관리자)
create policy content_partner_read on memoria.content_assets
  for select to authenticated using (partner_id = memoria.current_partner_id());
create policy content_staff_rw on memoria.content_assets
  for all to authenticated
  using (memoria.staff_has_perm('content') and memoria.staff_can_partner(partner_id))
  with check (memoria.staff_has_perm('content') and memoria.staff_can_partner(partner_id));

-- templates: 파트너 자기것 읽기 + staff(templates). __default__는 staff_can_partner=is_master()로 자동 master 전용.
create policy tmpl_partner_read on memoria.templates
  for select to authenticated using (partner_id = memoria.current_partner_id());
create policy tmpl_staff_rw on memoria.templates
  for all to authenticated
  using (memoria.staff_has_perm('templates') and memoria.staff_can_partner(partner_id))
  with check (memoria.staff_has_perm('templates') and memoria.staff_can_partner(partner_id));

-- bgm/ai_prompts: 전역. staff(templates|content) 읽기, content 쓰기. 파트너 노출 없음.
create policy bgm_staff_read on memoria.bgm for select to authenticated
  using (memoria.staff_has_perm('templates') or memoria.staff_has_perm('content'));
create policy bgm_staff_write on memoria.bgm for all to authenticated
  using (memoria.staff_has_perm('content')) with check (memoria.staff_has_perm('content'));
create policy prompt_staff_read on memoria.ai_prompts for select to authenticated
  using (memoria.staff_has_perm('templates') or memoria.staff_has_perm('content'));
create policy prompt_staff_write on memoria.ai_prompts for all to authenticated
  using (memoria.staff_has_perm('content')) with check (memoria.staff_has_perm('content'));

grant select, insert, update, delete on
  memoria.content_assets, memoria.templates, memoria.bgm, memoria.ai_prompts
  to authenticated;
