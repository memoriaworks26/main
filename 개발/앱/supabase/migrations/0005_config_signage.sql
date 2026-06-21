-- ─────────────────────────────────────────────────────────────
-- 0005_config_signage.sql — 폼/용어/회사정보/사이니지/스토리지정책
--   · company = 운영사 1행(싱글톤). 사업부는 한 법인의 부서.
--   · term/user_text = 사업부별. 파트너는 자기 사업부 표시텍스트만 읽기.
--   · signage = 파트너별. storage_classes = 운영사 단위.
-- ─────────────────────────────────────────────────────────────

-- 현재 파트너의 사업부(표시텍스트 읽기용)
create or replace function memoria.current_partner_biz()
returns uuid language sql stable security definer set search_path = memoria, public, pg_temp as $$
  select p.biz_unit_id from memoria.partners p where p.id = memoria.current_partner_id();
$$;
grant execute on function memoria.current_partner_biz() to authenticated;

-- ── 파트너별 폼 오버라이드(선택항목) ──
create table if not exists memoria.form_configs (
  partner_id text not null references memoria.partners(id) on delete cascade,
  field_key  text not null,
  hidden     boolean not null default false,
  label      text,
  primary key (partner_id, field_key)
);

-- ── 사업부별 용어 / 유저링크 텍스트 오버라이드 ──
create table if not exists memoria.term_configs (
  biz_unit_id  uuid not null references memoria.biz_units(id) on delete cascade,
  term_key     text not null,
  partner_text text,
  user_text    text,
  primary key (biz_unit_id, term_key)
);
create table if not exists memoria.user_text_overrides (
  biz_unit_id uuid not null references memoria.biz_units(id) on delete cascade,
  key         text not null,
  value       text,
  primary key (biz_unit_id, key)
);

-- ── 회사정보(운영사 1행 싱글톤 · 처리방침·계좌·동의문구) ──
create table if not exists memoria.company (
  id                smallint primary key default 1 check (id = 1),  -- 싱글톤 강제
  name text, ceo text, biz_no text, biz_type text, addr text,
  bank text, account text, holder text,
  notify_email text, notify_phone text, cs_phone text, cs_hours text,
  consent_privacy text, consent_marketing text,
  privacy_policy text, privacy_officer jsonb,
  updated_at timestamptz not null default now()
);

-- ── 사이니지(파트너별) ──
create table if not exists memoria.signage_devices (
  id text primary key,                       -- 'RPI-0441'
  partner_id text not null references memoria.partners(id) on delete cascade,
  room_id uuid references memoria.rooms(id) on delete set null,
  status text, playing text,
  mode text check (mode in ('광고','대기','알림','제작영상')),
  volume int not null default 50 check (volume between 0 and 100),
  muted boolean not null default false,
  ip text, last_comm timestamptz
);
create index if not exists idx_dev_partner on memoria.signage_devices(partner_id);

create table if not exists memoria.signage_sources (
  id text primary key,
  partner_id text not null references memoria.partners(id) on delete cascade,
  cat text check (cat in ('광고','대기','알림')),
  name text, kind text, file text, active boolean not null default false
);
create index if not exists idx_src_partner on memoria.signage_sources(partner_id);

create table if not exists memoria.signage_notice (
  partner_id text primary key references memoria.partners(id) on delete cascade,
  enabled boolean not null default true,
  template text
);

-- ── 스토리지 보존정책(운영사 단위) ──
create table if not exists memoria.storage_classes (
  key       text primary key check (key in ('source','final','temp')),
  name      text,
  descr     text,
  retention text   -- 'permanent' | 일수(문자)
);

-- ─────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────
alter table memoria.form_configs        enable row level security;
alter table memoria.term_configs        enable row level security;
alter table memoria.user_text_overrides enable row level security;
alter table memoria.company             enable row level security;
alter table memoria.signage_devices     enable row level security;
alter table memoria.signage_sources     enable row level security;
alter table memoria.signage_notice      enable row level security;
alter table memoria.storage_classes     enable row level security;

-- form_configs: 파트너 자기것 R/W + staff(forms) + 사업부 격리
create policy fc_partner_rw on memoria.form_configs for all to authenticated
  using (partner_id = memoria.current_partner_id())
  with check (partner_id = memoria.current_partner_id());
create policy fc_staff_rw on memoria.form_configs for all to authenticated
  using (memoria.staff_has_perm('forms') and memoria.staff_can_partner(partner_id))
  with check (memoria.staff_has_perm('forms') and memoria.staff_can_partner(partner_id));

-- term/user_text: 파트너=자기 사업부 표시텍스트 읽기 + staff(forms) R/W + 사업부 격리
create policy term_partner_read on memoria.term_configs for select to authenticated
  using (biz_unit_id = memoria.current_partner_biz());
create policy term_staff_rw on memoria.term_configs for all to authenticated
  using (memoria.staff_has_perm('forms') and memoria.staff_can_biz(biz_unit_id))
  with check (memoria.staff_has_perm('forms') and memoria.staff_can_biz(biz_unit_id));
create policy ut_partner_read on memoria.user_text_overrides for select to authenticated
  using (biz_unit_id = memoria.current_partner_biz());
create policy ut_staff_rw on memoria.user_text_overrides for all to authenticated
  using (memoria.staff_has_perm('forms') and memoria.staff_can_biz(biz_unit_id))
  with check (memoria.staff_has_perm('forms') and memoria.staff_can_biz(biz_unit_id));

-- company(싱글톤): staff 읽기(고객센터 등), settings perm 쓰기. 파트너/anon 차단.
create policy company_staff_read on memoria.company for select to authenticated
  using (memoria.is_staff());
create policy company_staff_write on memoria.company for all to authenticated
  using (memoria.staff_has_perm('settings')) with check (memoria.staff_has_perm('settings'));

-- signage: 파트너 자기것 R/W(라이브 컨트롤) + staff(signage) + 사업부 격리
create policy dev_partner_rw on memoria.signage_devices for all to authenticated
  using (partner_id = memoria.current_partner_id())
  with check (partner_id = memoria.current_partner_id());
create policy dev_staff_rw on memoria.signage_devices for all to authenticated
  using (memoria.staff_has_perm('signage') and memoria.staff_can_partner(partner_id))
  with check (memoria.staff_has_perm('signage') and memoria.staff_can_partner(partner_id));
create policy src_partner_rw on memoria.signage_sources for all to authenticated
  using (partner_id = memoria.current_partner_id())
  with check (partner_id = memoria.current_partner_id());
create policy src_staff_rw on memoria.signage_sources for all to authenticated
  using (memoria.staff_has_perm('signage') and memoria.staff_can_partner(partner_id))
  with check (memoria.staff_has_perm('signage') and memoria.staff_can_partner(partner_id));
create policy notice_partner_rw on memoria.signage_notice for all to authenticated
  using (partner_id = memoria.current_partner_id())
  with check (partner_id = memoria.current_partner_id());
create policy notice_staff_rw on memoria.signage_notice for all to authenticated
  using (memoria.staff_has_perm('signage') and memoria.staff_can_partner(partner_id))
  with check (memoria.staff_has_perm('signage') and memoria.staff_can_partner(partner_id));

-- storage_classes(운영사 단위): staff(storage) R/W
create policy sc_staff_rw on memoria.storage_classes for all to authenticated
  using (memoria.staff_has_perm('storage')) with check (memoria.staff_has_perm('storage'));

grant select, insert, update, delete on
  memoria.form_configs, memoria.term_configs, memoria.user_text_overrides,
  memoria.company, memoria.signage_devices, memoria.signage_sources,
  memoria.signage_notice, memoria.storage_classes
  to authenticated;
