-- AI 변환 안함(보호자 선택) + 단일 블록 재생성 + 타이틀 완성 클립.
alter table memoria.submissions
  add column if not exists skip_ai      boolean not null default false,  -- 보호자가 AI 변환 안함 선택
  add column if not exists regen_target text;                            -- 단일 블록 재생성 대상("title"|"ai:i")

-- submission_assets role에 title_video(ffmpeg 완성 타이틀 클립) 추가.
alter table memoria.submission_assets drop constraint if exists submission_assets_role_check;
alter table memoria.submission_assets add constraint submission_assets_role_check
  check (role = any (array[
    'source','title','ai_video','slide_photo','memory_video',
    'title_result','ai_video_result','slide_video','title_video'
  ]));

-- submit_link: skipAi 저장(본문은 0028 + skip_ai 1줄). 운영엔 이미 적용됨(기록용).
