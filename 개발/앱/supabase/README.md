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

## 6) 편집기 동시편집 잠금 (Editor Lock) — 본개발 과제 · 결정 완료

**왜 백엔드 필수:** 현재 store는 브라우저 탭별 인메모리라 목업으로는 "동작하는 척"만 가능(실제 다른 사용자 차단 0). 진짜 차단은 서버 잠금 레코드가 있어야 함. → **목업 단계에서 만들지 않고 본개발로 미룸.**

**확정 정책 (2026-06-20 결정):**
- **완전 차단**: 한 건을 누군가 편집기로 열면, 다른 작업자에게는 「편집기 열기」 버튼 비활성 + "OOO 편집 중" 표시. 아예 못 들어감(읽기전용·경고 아님).
- **해제**: ①편집기 닫기(뒤로/발행) 시 자동 해제 ②마스터 권한 "강제 해제" 버튼 ③**N분 무활동 자동 만료**(하트비트) — 탭 닫힘·브라우저 강제종료로 영구 잠김 방지. (목업 근사치였던 자동만료는 서버 하트비트로 정식 구현)

**대상:** 1차(예약 `reservations`)와 2차 가공(`secondJobs`) 모두. 편집기 진입 단위 = 그 건(reservId / secondJobId).

**구현 seam (목업→실운영 패턴, `userLink.js` 참고):**
- 락 레코드: `editing_by`(작업자) · `locked_at` · `last_heartbeat`(또는 `expires_at`).
- 획득: 편집기 open 시 원자적 acquire RPC(이미 다른 사람이 잡고 있으면 실패 → 차단 UI). 본인 재진입은 허용.
- 갱신: 편집 중 주기적 heartbeat. 해제: close 시 release RPC + 마스터 force-release.
- 프론트 seam: `actions.acquireEditLock(kind,id)` / `releaseEditLock` / `forceReleaseEditLock` — 목업에선 store 필드, 라이브에선 Supabase RPC로 교체.
- 진입점 배선은 이미 존재: `onOpenEditor`(admin/production.jsx의 Production·SecondEdit) → App.openEditor → VideoEditor. open/close 훅에 acquire/release만 끼우면 됨.
