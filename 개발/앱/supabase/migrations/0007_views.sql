-- ─────────────────────────────────────────────────────────────
-- 0007_views.sql — 정산 요약 뷰
--   security_invoker=on 필수: base 테이블(settlement_*)의 RLS를 "호출자" 기준으로 적용.
--   (빼면 뷰 정의자 권한으로 RLS 우회 → 유출)
-- ─────────────────────────────────────────────────────────────

create or replace view memoria.settlement_partner_summary
  with (security_invoker = on) as
select
  p.id                                  as partner_id,
  p.name,
  p.region,
  count(si.id)                          as cnt,
  coalesce(sum(si.amount), 0)           as billed,
  (select coalesce(sum(d.amount), 0)
     from memoria.settlement_deposits d
    where d.partner_id = p.id)          as paid,
  coalesce(sum(si.amount), 0)
    - (select coalesce(sum(d.amount), 0)
         from memoria.settlement_deposits d
        where d.partner_id = p.id)      as unpaid
from memoria.partners p
left join memoria.settlement_items si on si.partner_id = p.id
group by p.id, p.name, p.region;

grant select on memoria.settlement_partner_summary to authenticated;
