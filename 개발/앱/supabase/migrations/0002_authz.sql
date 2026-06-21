-- ─────────────────────────────────────────────────────────────
-- 0002_authz.sql — 인증·테넌시 코어 + RLS 권한 헬퍼
--   주체: staff(관리자 master|worker|collab) / partner_members(파트너 로그인) / 보호자(anon, 0001)
--   원칙: 테넌시 판정은 전부 SECURITY DEFINER 헬퍼로만(정책 본문 서브쿼리 금지 → 재귀 차단).
--         모든 헬퍼 status='active' 결합 + NULL/미존재 시 false/NULL(anon=default-deny).
--         모든 함수 search_path 고정. 정책은 전부 to authenticated.
-- ─────────────────────────────────────────────────────────────

create schema if not exists memoria;
grant usage on schema memoria to anon, authenticated;

-- ── 사업부(최상위 스코핑 단위 · 한 법인의 부서) ──
create table if not exists memoria.biz_units (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_at timestamptz not null default now()
);

-- ── 파트너사(장례식장) ── 예약·정산·사이니지가 partner_id FK로 매달림
create table if not exists memoria.partners (
  id            text primary key,                 -- 'P-001' 내부 고정 식별자
  biz_unit_id   uuid not null references memoria.biz_units(id),
  id_code       text unique not null,             -- 로그인/표시용(수정가능)
  name          text not null,
  region        text,
  manager       text,
  phone         text,
  cs_phone      text,
  cs_hours      text,
  rooms         int  not null default 0,
  active        boolean not null default true,
  unit_price    integer not null default 0,       -- 건당단가(원, VAT 포함)
  contract_date date,
  memo          text,
  created_at    timestamptz not null default now()
);
create index if not exists idx_partners_biz on memoria.partners(biz_unit_id);

-- ── 관리자(staff) 프로필 : auth.users 1:1 ──
create table if not exists memoria.staff (
  auth_user_id uuid primary key references auth.users(id) on delete cascade,
  biz_unit_id  uuid not null references memoria.biz_units(id),  -- worker 소속 사업부(격리 기준)
  name         text not null,
  login_id     text unique not null,
  email        text,
  phone        text,
  role         text not null check (role in ('master','worker','collab')),
  status       text not null default 'invited' check (status in ('active','invited','disabled')),
  perms        text[] not null default '{}',      -- worker 전용. master/collab 무시.
  last_login   timestamptz,
  created_at   timestamptz not null default now()
);

-- ── 파트너 로그인 계정 ↔ partner_id (한 계정 = 한 파트너) ──
create table if not exists memoria.partner_members (
  auth_user_id uuid primary key references auth.users(id) on delete cascade,
  partner_id   text not null references memoria.partners(id) on delete cascade,
  status       text not null default 'active' check (status in ('active','disabled')),
  created_at   timestamptz not null default now()
);
create index if not exists idx_partner_members_partner on memoria.partner_members(partner_id);

-- ─────────────────────────────────────────────────────────────
-- RLS 헬퍼 (전부 stable · SECURITY DEFINER · search_path 고정 → RLS 우회 조회, boolean/uuid만 반환)
-- ─────────────────────────────────────────────────────────────
create or replace function memoria.is_staff()
returns boolean language sql stable security definer set search_path = memoria, public, pg_temp as $$
  select exists (select 1 from memoria.staff where auth_user_id = auth.uid() and status = 'active');
$$;

create or replace function memoria.is_master()
returns boolean language sql stable security definer set search_path = memoria, public, pg_temp as $$
  select exists (select 1 from memoria.staff where auth_user_id = auth.uid() and status = 'active' and role = 'master');
$$;

create or replace function memoria.is_collab()
returns boolean language sql stable security definer set search_path = memoria, public, pg_temp as $$
  select exists (select 1 from memoria.staff where auth_user_id = auth.uid() and status = 'active' and role = 'collab');
$$;

-- worker/master perm 게이트. master=항상 true. collab=항상 false. worker=perms[] 포함 여부.
create or replace function memoria.staff_has_perm(p_perm text)
returns boolean language sql stable security definer set search_path = memoria, public, pg_temp as $$
  select exists (
    select 1 from memoria.staff
    where auth_user_id = auth.uid() and status = 'active'
      and (role = 'master' or (role = 'worker' and p_perm = any(perms)))
  );
$$;

-- 로그인 파트너의 partner_id. staff/anon/미매핑이면 NULL → 파트너 정책 자동 차단.
create or replace function memoria.current_partner_id()
returns text language sql stable security definer set search_path = memoria, public, pg_temp as $$
  select partner_id from memoria.partner_members where auth_user_id = auth.uid() and status = 'active';
$$;

-- 현재 staff 소속 사업부.
create or replace function memoria.current_biz_unit_id()
returns uuid language sql stable security definer set search_path = memoria, public, pg_temp as $$
  select biz_unit_id from memoria.staff where auth_user_id = auth.uid() and status = 'active';
$$;

-- 사업부 격리: master=전체, worker=자기 사업부만.
create or replace function memoria.staff_can_biz(p_biz uuid)
returns boolean language sql stable security definer set search_path = memoria, public, pg_temp as $$
  select memoria.is_master() or (p_biz is not null and p_biz = memoria.current_biz_unit_id());
$$;

-- 파트너 행(partner_id)이 현재 staff 사업부 소속인지. master=전체.
create or replace function memoria.staff_can_partner(p_pid text)
returns boolean language sql stable security definer set search_path = memoria, public, pg_temp as $$
  select memoria.is_master()
      or exists (select 1 from memoria.partners p
                 where p.id = p_pid and p.biz_unit_id = memoria.current_biz_unit_id());
$$;

grant execute on function
  memoria.is_staff(), memoria.is_master(), memoria.is_collab(),
  memoria.staff_has_perm(text), memoria.current_partner_id(), memoria.current_biz_unit_id(),
  memoria.staff_can_biz(uuid), memoria.staff_can_partner(text)
  to authenticated;

-- ─────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────
alter table memoria.biz_units       enable row level security;
alter table memoria.partners        enable row level security;
alter table memoria.staff           enable row level security;
alter table memoria.partner_members enable row level security;

-- biz_units: staff는 자기(또는 전체 master) 사업부 읽기, master만 쓰기.
create policy bu_staff_read on memoria.biz_units
  for select to authenticated using (memoria.is_staff() and memoria.staff_can_biz(id));
create policy bu_master_write on memoria.biz_units
  for all to authenticated using (memoria.is_master()) with check (memoria.is_master());

-- partners: 파트너=자기행 읽기/자기수정(cs). staff=partners|overview perm + 사업부 격리. 쓰기=partners perm.
create policy partners_self_read on memoria.partners
  for select to authenticated using (id = memoria.current_partner_id());
create policy partners_self_update on memoria.partners
  for update to authenticated
  using (id = memoria.current_partner_id()) with check (id = memoria.current_partner_id());
create policy partners_staff_read on memoria.partners
  for select to authenticated
  using ((memoria.staff_has_perm('partners') or memoria.staff_has_perm('overview'))
         and memoria.staff_can_biz(biz_unit_id));
create policy partners_staff_write on memoria.partners
  for all to authenticated
  using (memoria.staff_has_perm('partners') and memoria.staff_can_biz(biz_unit_id))
  with check (memoria.staff_has_perm('partners') and memoria.staff_can_biz(biz_unit_id));

-- staff: 본인행 읽기 + master 전체 관리(계정관리는 master 고유).
create policy staff_self_read on memoria.staff
  for select to authenticated using (auth_user_id = auth.uid() or memoria.is_master());
create policy staff_master_write on memoria.staff
  for all to authenticated using (memoria.is_master()) with check (memoria.is_master());

-- partner_members: 본인 매핑 읽기 + master 관리.
create policy pm_self_read on memoria.partner_members
  for select to authenticated using (auth_user_id = auth.uid() or memoria.is_master());
create policy pm_master_write on memoria.partner_members
  for all to authenticated using (memoria.is_master()) with check (memoria.is_master());

-- 테이블 권한: authenticated만(행 통제는 RLS). anon은 테이블 권한 0 — RPC만.
grant select, insert, update, delete on
  memoria.biz_units, memoria.partners, memoria.staff, memoria.partner_members
  to authenticated;
