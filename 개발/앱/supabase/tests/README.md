# 백엔드 검증 하네스 (RLS · 개인정보 안전장치)

스키마/RLS를 바꿀 때마다 **재실행하는 회귀 테스트**. 실제 PostgREST 세션을 역할별로 띄워
"남의 데이터·권한 밖 데이터에 닿는 경로가 0인지"를 적대적으로 확인한다. 통과 못하면 비정상 종료(게이트).

## 실행

```bash
# 1) 시크릿 준비 — supabase/tests/.env (gitignore됨) 작성하거나 export
cp .env.example .env   # 값 채우기
# 2) 실행
bash supabase/tests/run.sh
```

필요 환경변수(.env):
- `SB_REF` — 프로젝트 ref (예: lvrirxtfjeuwionjluxf)
- `SB_PAT` — Supabase Management API Personal Access Token
- `SB_SERVICE_KEY` — service_role 키 (테스트 유저 생성/삭제·소유자 SQL용)
- `SB_ANON_KEY` — anon 키
- `SB_JWT_SECRET` — 레거시 JWT 시크릿(역할 세션 토큰 발급용)

> ⚠️ `.env`에는 강력한 시크릿이 들어간다. **절대 커밋 금지**(gitignore 처리됨).

## 무엇을 검증하나

**rls_verify.py (RLS 교차접근, 13)**
- 파트너: 자기 partner_id 데이터만 / 타 파트너 0
- anon: 운영 테이블·company 직접 접근 0 (통로는 화이트리스트 RPC뿐)
- worker: 보유 perm 페이지만 / 권한 밖 0
- 사업부 격리: worker는 자기 사업부만, 타 사업부 0
- collab: 발행 영상만, 그 외 0, 쓰기 거부

**purge_audit_verify.py (개인정보 안전장치, 8)**
- purge_reservation: master 전용, 예약·제출·자산·영상·정산 완전 삭제
- access_log: master만 조회, update·delete 거부(추기전용·행 보존)

## 동작 방식
- 임시 픽스처(테스트 사업부·파트너·예약·영상·정산 + auth 유저)를 만들고 검증 후 **전량 삭제**(멱등 — 재실행 안전).
- 역할 시뮬레이션은 `SB_JWT_SECRET`으로 HS256 세션 토큰을 발급해 PostgREST에 직접 호출(실제 RLS 적용 경로).
- 공용 유틸은 `_harness.py`.
