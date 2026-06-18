# Phase A 인벤토리 — 프론트 목업 완성 → 동결 게이트

> 이 프로젝트는 **목업이 곧 스펙·스키마 원천**이다. 화면이 굳기 전엔 `data.js`(스키마)·
> `store.js`(API 계약)가 흔들린다. 그래서 백엔드보다 **프론트 목업 완성이 먼저**다.
> 작업은 **플로우 단위 수직 슬라이스**로: 한 플로우마다 ① data.js 모양 확정 → ② 화면 완성
> → ③ store 액션 연결을 묶어서 끝낸다. 모듈 경계는 [src/README.md](src/README.md) 규칙을 따른다.

상태 기준(2026-06-19 스캔): 빈 화면 없음(모든 화면 존재), 대부분 store에 쓰기 연결됨.
남은 건 **인터랙션 깊이 · 추가 플로우 · 데이터 모델 보강** 3종.

---

## 슬라이스별 갭

### 1. 예약·접수 (앵커 — 먼저) · [partner/intake.jsx](src/partner/intake.jsx)
- [ ] **확정이 저장 안 됨**: `doConfirm`이 URL만 생성, 예약을 store에 추가 안 함
      → `store.js`에 `addReservation` 신설 필요 (현재 없음)
- [ ] **입력칸 uncontrolled**: `field()` 헬퍼가 value/onChange 없음 (성함·연락처·이름·품종·나이 미수집)
- [ ] **데이터 모델 보강**: 수집하는 `품종(species)`·`나이(age)`가 `RESERVATIONS` 모델에 없음
- [ ] 생성 URL ↔ `RESERV_DETAIL.formUrl`/`code` 연결 규칙 확정

### 2. 유저 입력 폼 ↔ 제출 · [user.jsx](src/user.jsx) · [admin/forms.jsx](src/admin/forms.jsx)
- 위저드 자체는 완성도 높음(컨트롤드 입력·업로드·썸네일). 단:
- [ ] **store 미연결**: 8단계 제출 결과가 어디에도 저장 안 됨 — 예약(reservation)과 연결 키 없음
- [ ] forms(파트너 폼 설정 `FORM_CONFIGS`) ↔ user 위저드 노출 항목 왕복 확정
- [ ] ⚠️ **미확정 결정**: 유저 주체(보호자 직접 / 직원 대행) — IA §4. 직원 대행이면 이 트랙 **재생 전용**으로 축소 (user.jsx 하단 플래그)

### 3. 편집기 · [editor.jsx](src/editor.jsx)
- [ ] **입력 8개 uncontrolled(`defaultValue`)**: 타이틀 글자·시간·편지·효과 길이·페이드 등 편집이 저장 안 됨 → 컴포넌트 state/스토어 연결
- [ ] **EDL이 예약별이 아님**: `EDITOR_BLOCKS`가 모듈 고정 더미 — `reservation` prop과 무관. 예약별 EDL 데이터 모델 필요
- [ ] 미연결 버튼(파일 교체·AI 재생성·슬라이드 재생성 등) — 목업 자리, 동작 범위 확정

### 4. 제작·컨펌 → 2차 가공 · [admin/production.jsx](src/admin/production.jsx)
- store 쓰기 연결됨(상태·담당자). `status`(review/rendering/published) 전파 체인 점검만.

### 5. 정산 · 사이니지 · 스토리지 · [admin/settlement.jsx](src/admin/settlement.jsx) · [admin/system.jsx](src/admin/system.jsx)
- 비교적 깊음. 다운로드·내보내기·새로고침은 **백엔드 의존**이라 목업에선 toast 정상.

### 6. 설정/계정/호실·기타
- [ ] [roomcard.jsx](src/roomcard.jsx) 비-case 호실 **"설정" 버튼 onClick 없음** (line ~114)
- [ ] [admin/customers.jsx](src/admin/customers.jsx) 읽기 전용(의도로 판단) · 발행링크 `D.LINKS` 직접 참조. 편집 요구 확정
- [ ] dead 코드 정리: `Placeholder`·`ProgressBar`([ui.jsx](src/ui.jsx)) 미사용, `MASTER_PERMS`([data.js](src/data.js)) 미사용

---

## 결정 필요 (제품) — UI에 이미 플래그됨
- **유저 주체**: 보호자 직접 vs 직원 대행 (IA §4) — Phase A 슬라이스 2·3 범위를 가름
- **개인정보(PIPA)**: 보유기간·삭제 요청 워크플로 — customers/CustomerDetail 주석

## store.js 추가 예정 액션 (동결 전 확정 = API 계약 초안)
- `addReservation` (접수) · 퇴실/체크아웃 (`roomcard onCheckout` → 상태·호실 비우기) · 유저 제출 반영(폼→예약)

## data.js 모델 보강 후보 (동결 전 확정 = 테이블 스키마)
- `RESERVATIONS` ← `species`·`age`·`formUrl`·`code` 통합(`RESERV_DETAIL`엔 있고 목록 모델엔 없음)
- 연결 키: 예약 ↔ 유저 제출 데이터 ↔ EDL

---

## 동결 게이트 (Phase B 진입 기준)
- [ ] 모든 화면 인터랙션이 store 액션에 연결 (읽기전용 의도 화면은 명시)
- [ ] `data.js` 엔티티 필드·관계 확정 → 테이블 스키마로 1:1 전환 가능
- [ ] `store.js` actions 시그니처 확정 → 이게 곧 API 계약
- [ ] 제품 결정 2건(유저 주체·PIPA) 해소
- [ ] dead export 정리
- [ ] `npm run check` · `npm run build` 통과

> 게이트 통과 후에야 백엔드(인증 → 도메인 CRUD → 미디어 파이프라인 → 사이니지 → 정산/문서) 착수.
