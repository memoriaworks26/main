# 보호자 유저링크 백엔드 (Supabase)

DB 연결 전이라도 앱은 **목업 모드**로 돈다. 아래 env를 주입하면 자동으로 **라이브**로 전환된다.
(`src/lib/supabase.js`의 `BACKEND_LIVE` = URL·KEY 둘 다 있을 때만 true)

## 1) env 주입

`개발/앱/.env.local` (gitignore됨):

```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon public key>
```

## 2) 마이그레이션 적용

```bash
supabase link --project-ref <project-ref>
supabase db push          # supabase/migrations/0001_user_link.sql 적용
```

또는 Supabase 대시보드 SQL Editor / MCP `apply_migration`으로 `0001_user_link.sql` 실행.

## 3) 보안 모델 (요지)

- **토큰 = 비로그인 접근 권한.** 테이블은 RLS로 잠겨 anon 직접 접근 불가.
- anon은 `resolve_link(token)` / `submit_link(token, payload)` **SECURITY DEFINER RPC**로만 접근.
- 스토리지 업로드는 `memoria-uploads` 버킷의 **유효한 draft 토큰 폴더**(`<token>/...`)에만 허용. 조회 불가.

## 4) 운영 데이터 흐름

1. 예약 생성 시 `memoria.submissions`에 row 1건(`token` 자동 생성) → 보호자에게 `/u/<token>` 발송.
2. 보호자가 위저드 진행: 사진·영상은 토큰 폴더로 업로드, 마지막에 `submit_link`로 일괄 제출.
3. 제출 시 `status='queued'` — **여기까지가 이번 범위.**
4. (후속) Render 워커가 queued 건을 집어 OpenAI 타이틀·Kling·FFmpeg 렌더 → `video_url`·`status='done'` 갱신.

## 5) 남은 작업 (이번 범위 밖)

- 예약↔submission 발급 연동(관리자/파트너 콘솔에서 토큰 생성·발송).
- Render 워커(큐 소비 → 렌더 → done).
- `expires_at` 만료 스케줄(퇴실 시 만료/파기).
