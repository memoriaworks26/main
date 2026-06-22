# 메모리아웍스 렌더 워커

큐(`memoria.submissions.status='queued'`)를 소비해 추모영상을 렌더하고 `done`으로 갱신하는 **서버 컴포넌트**. 프론트/DB와는 큐로만 통신하므로 **로컬에서 돌리든 Render에 올리든 동일**하게 동작한다(위치 독립). → 로컬에서 만들어 검증하고, 출시 때 같은 코드를 Render에 배포(.env만 한 번 붙여넣기).

## 실행 (로컬)
```bash
cd 개발/worker
cp .env.example .env        # 값 채우기(SUPABASE_SERVICE_KEY 등)
npm install
npm run once                # 큐에서 1건만 처리하고 종료(테스트)
npm start                   # 상시 폴링
```

> ⚠️ `.env`의 `SUPABASE_SERVICE_KEY`는 RLS를 우회하는 마스터 키 — **절대 커밋·브라우저 노출 금지**(gitignore됨).

## 동작
1. `claim_render_job()` RPC로 가장 오래된 queued 1건을 원자적으로 `rendering` 잠금(다중 워커 안전, SKIP LOCKED).
2. `submission_assets`(보호자 업로드) 로드 → `renderJob()` → 성공 시 `done`+`video_url`(+`videos` 아카이브), 실패 시 재시도(`MAX_ATTEMPTS` 초과면 `failed`).
3. `--once`는 1건 처리 후 종료(테스트/CI용).

## 현재 상태 (Phase 7-1: 스캐폴드)
- 큐 루프·claim·상태전이·재시도 = **동작**.
- 실제 렌더는 **스텁**(`WORKER_STUB=1`) — 자산·BGM·편지 유무만 로그하고 placeholder 반환.
- 다음(미구현): `src/render/index.js`의 7-2 OpenAI 타이틀 / 7-3 Higgsfield 추억영상 / 7-4 FFmpeg 합성 + 업로드. **FFmpeg 로컬 설치 필요**(`brew install ffmpeg`).

## 구조
```
worker/
  .env.example        # 키 1:1 (로컬·Render 동일)
  src/
    index.js          # 메인 루프(--once 지원)
    config.js         # env 로드·검증
    supabase.js       # service_role 클라이언트(memoria 스키마)
    queue.js          # claim/fetchAssets/complete/fail
    log.js
    render/index.js    # 렌더 파이프라인(현재 스텁)
```
