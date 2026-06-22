-- 0014_secondjob_fields.sql — 2차 가공 배선용 denormalized 담당자명(정규화 전).
alter table memoria.second_edit_jobs add column if not exists assignee_name text;
