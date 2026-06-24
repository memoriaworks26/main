-- AI 프롬프트 활성 플래그 — 타깃별 1개 활성이 실제 생성(Seedream·Kling)에 사용.
alter table memoria.ai_prompts add column if not exists active boolean not null default false;

-- 타깃별 활성 없으면 가장 오래된 1개를 활성으로.
update memoria.ai_prompts a set active = true
  where a.id = (select id from memoria.ai_prompts b where b.target = a.target order by created_at limit 1)
  and not exists (select 1 from memoria.ai_prompts c where c.target = a.target and c.active);
