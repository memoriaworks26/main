-- 0015_content_shared.sql — 콘텐츠 허브 배선: 공통(shared) 자산 + 표시용 size_label.
--   공통 자산(파트너 무관·공용 프레임 등)은 partner_id NULL + shared=true.
--   공통 자산은 모든 로그인 사용자(스태프·파트너)가 읽기 가능. 쓰기는 content perm.
alter table memoria.content_assets alter column partner_id drop not null;
alter table memoria.content_assets add column if not exists shared    boolean not null default false;
alter table memoria.content_assets add column if not exists size_label text;

create policy content_shared_read on memoria.content_assets
  for select to authenticated using (shared = true);

drop policy if exists content_staff_rw on memoria.content_assets;
create policy content_staff_rw on memoria.content_assets
  for all to authenticated
  using (memoria.staff_has_perm('content') and (shared or memoria.staff_can_partner(partner_id)))
  with check (memoria.staff_has_perm('content') and (shared or memoria.staff_can_partner(partner_id)));
