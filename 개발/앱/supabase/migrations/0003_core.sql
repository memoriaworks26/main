-- ─────────────────────────────────────────────────────────────
-- 0003_core.sql — 운영 코어(PII 중심): rooms · reservations · second_edit_jobs
--   · 예약↔파트너를 이름 문자열 → partner_id FK로 교정
--   · 0001 submissions.reservation_id(text)를 reservations.id FK로 승격
--   · reservations는 보호자 PII(chief/phone)의 중심 → anon 정책 0개
-- ─────────────────────────────────────────────────────────────

-- ── 호실(파트너별) ──
create table if not exists memoria.rooms (
  id          uuid primary key default gen_random_uuid(),
  partner_id  text not null references memoria.partners(id) on delete cascade,
  name        text not null,                  -- '1호실' / '특1호실'
  floor       text,
  type        text,
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now(),
  unique (partner_id, name)
);
create index if not exists idx_rooms_partner on memoria.rooms(partner_id);

-- ── 예약(=고객/PII 중심) ──
create table if not exists memoria.reservations (
  id            text primary key,                        -- 'R-240615-01'
  partner_id    text not null references memoria.partners(id) on delete restrict,
  room_id       uuid references memoria.rooms(id) on delete set null,
  deceased      text,                                    -- 펫명
  chief         text,                                    -- 보호자명 (PII)
  phone         text,                                    -- (PII)
  reserve_date  date,
  end_date      date,                                    -- 자정 넘김(익일 종료)
  slot          text,                                    -- '14:00~17:20'
  requested_at  timestamptz,                             -- 컨펌 요청 시각
  status        text not null default 'review'
                check (status in ('review','rendering','confirm','published')),
  assignee_id   uuid references memoria.staff(auth_user_id) on delete set null,
  render_at     timestamptz,
  render_dur    int,
  created_at    timestamptz not null default now()
);
create index if not exists idx_reserv_partner on memoria.reservations(partner_id);
create index if not exists idx_reserv_status  on memoria.reservations(status);

-- ── 0001 submissions.reservation_id 를 진짜 FK로 승격 (reservations 생성 후) ──
alter table memoria.submissions drop constraint if exists submissions_reservation_fk;
alter table memoria.submissions
  add constraint submissions_reservation_fk
  foreign key (reservation_id) references memoria.reservations(id) on delete set null;
create unique index if not exists uq_submission_reservation
  on memoria.submissions(reservation_id) where reservation_id is not null;

-- ── 2차 가공 큐(내부 작업 — 파트너 접근 없음) ──
create table if not exists memoria.second_edit_jobs (
  id             text primary key,
  reservation_id text not null references memoria.reservations(id) on delete cascade,
  status         text not null default 'pending'
                 check (status in ('pending','rendering','confirm','published')),
  reason         text,
  assignee_id    uuid references memoria.staff(auth_user_id) on delete set null,
  render_at      timestamptz,
  render_dur     int,
  created_at     timestamptz not null default now()
);
create index if not exists idx_se_reserv on memoria.second_edit_jobs(reservation_id);

-- 예약 → partner_id 조회(2차가공 등 reservation_id만 가진 테이블의 사업부 격리용)
create or replace function memoria.reservation_partner_id(p_reserv text)
returns text language sql stable security definer set search_path = memoria, public, pg_temp as $$
  select partner_id from memoria.reservations where id = p_reserv;
$$;
grant execute on function memoria.reservation_partner_id(text) to authenticated;

-- ─────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────
alter table memoria.rooms            enable row level security;
alter table memoria.reservations     enable row level security;
alter table memoria.second_edit_jobs enable row level security;

-- rooms: 파트너 자기것 R/자기수정 + staff(partners|overview) + 사업부 격리
create policy rooms_partner_read on memoria.rooms
  for select to authenticated using (partner_id = memoria.current_partner_id());
create policy rooms_partner_update on memoria.rooms
  for update to authenticated
  using (partner_id = memoria.current_partner_id())
  with check (partner_id = memoria.current_partner_id());
create policy rooms_staff_rw on memoria.rooms
  for all to authenticated
  using ((memoria.staff_has_perm('partners') or memoria.staff_has_perm('overview'))
         and memoria.staff_can_partner(partner_id))
  with check (memoria.staff_has_perm('partners') and memoria.staff_can_partner(partner_id));

-- ★ reservations (PII) — anon 정책 절대 없음.
--   파트너: 자기 partner_id 만(R/W). staff: customers|production|secondedit(읽기) + 사업부 격리.
create policy reserv_partner_read on memoria.reservations
  for select to authenticated using (partner_id = memoria.current_partner_id());
create policy reserv_partner_insert on memoria.reservations
  for insert to authenticated with check (partner_id = memoria.current_partner_id());
create policy reserv_partner_update on memoria.reservations
  for update to authenticated
  using (partner_id = memoria.current_partner_id())
  with check (partner_id = memoria.current_partner_id());
create policy reserv_staff_read on memoria.reservations
  for select to authenticated
  using ((memoria.staff_has_perm('customers')
       or memoria.staff_has_perm('production')
       or memoria.staff_has_perm('secondedit'))
       and memoria.staff_can_partner(partner_id));
create policy reserv_staff_write on memoria.reservations
  for all to authenticated
  using ((memoria.staff_has_perm('customers') or memoria.staff_has_perm('production'))
         and memoria.staff_can_partner(partner_id))
  with check ((memoria.staff_has_perm('customers') or memoria.staff_has_perm('production'))
         and memoria.staff_can_partner(partner_id));

-- second_edit_jobs: staff(secondedit|production)만 + 사업부 격리. 파트너·anon 차단.
create policy se_staff_rw on memoria.second_edit_jobs
  for all to authenticated
  using ((memoria.staff_has_perm('secondedit') or memoria.staff_has_perm('production'))
         and memoria.staff_can_partner(memoria.reservation_partner_id(reservation_id)))
  with check ((memoria.staff_has_perm('secondedit') or memoria.staff_has_perm('production'))
         and memoria.staff_can_partner(memoria.reservation_partner_id(reservation_id)));

grant select, insert, update, delete on
  memoria.rooms, memoria.reservations, memoria.second_edit_jobs
  to authenticated;
