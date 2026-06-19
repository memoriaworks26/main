# 메모리아웍스 목업 — 소스 구조 안내

권한별(관리자 · 파트너 · 유저) 인터페이스를 한 앱에서 전환하며 보는 **목업**입니다.
실데이터 없이 `data.js`의 더미 데이터로 동작하며, 본개발에서 API 연결로 교체합니다.

## 진입점 = 배럴(re-export) 패턴

`admin.jsx · partner.jsx · user.jsx · editor.jsx · ui.jsx · data.js`는 모두 **얇은 배럴**입니다.
실제 구현은 같은 이름의 폴더(`admin/ · partner/ · user/ · editor/ · ui/ · data/`)에 도메인별로
나뉘어 있고, 배럴이 이를 재노출합니다. 덕분에 외부 import 경로(`./ui.jsx`, `../data.js` 등)는
바뀌지 않은 채 내부만 모듈화됩니다. **새 import도 배럴 경로(`./ui.jsx` 등)를 그대로 쓰세요.**

## 레이어 개요

```
App.jsx                 최상위 — 권한 전환(관리자/파트너/유저) + 영상 편집기 오버레이
├─ admin.jsx            → admin/  (셸 AdminConsole + 도메인 화면들)
├─ partner.jsx          → partner/ (셸 PartnerConsole + 도메인 화면들)
├─ user.jsx             → user/   (셸 UserMobile + wizard 훅 + steps + parts)
└─ editor.jsx           → editor/ (셸 VideoEditor + blocks + timeline + preview + props)

공유 레이어 (모든 화면이 의존, 단방향)
├─ theme.js             디자인 토큰(색·폰트·radius) — 단일 출처
├─ ui.jsx               → ui/     공용 컴포넌트(controls·table·data-display·layout·overlays)
├─ store.js             상태/액션
├─ toast.jsx            토스트
├─ confirm.jsx          확인 다이얼로그(Promise 기반)
├─ docs.jsx             거래명세서 등 문서
├─ roomcard.jsx         호실 카드
├─ data.js              → data/   더미 데이터·도메인 상수 — 로직 없음
└─ lib/media.js         미디어 순수 유틸(swatch 썸네일, grabVideoFrame 영상 첫 프레임)
```

## 화면 모듈 (도메인별 분리)

각 콘솔/화면 폴더는 **셸 + 도메인별 파일**로 나뉩니다. 폴더 안의 `shared.jsx`는
그 콘솔 안에서만 공유하는 헬퍼입니다.

- `admin/AdminConsole.jsx` — 내비 + 권한(perms) 기반 라우팅. 화면들을 import해 조립.
  - `overview · partners · customers · forms · production · templates · content · settlement · settings · system`
  - `admin/shared.jsx` — SaveBar(미저장 경고), SearchSelect(검색 드롭다운)
- `partner/PartnerConsole.jsx` — 내비 + 라우팅 + `PartnerCtx` Provider + 비밀번호 변경
  - `dashboard · intake · reservations · live`
  - `partner/shared.jsx` — PartnerCtx/usePartner + 호실·시간 슬롯 계산(parseSlot/overlaps/hasRoomConflict)
- `user/UserMobile.jsx` — 위저드 셸 · `user/wizard.js`(useUserWizard 상태/업로드/제출 훅) · `user/steps.jsx`(단계 본문) · `user/parts.jsx`(Stepper·Title·문의처·가이드·처리방침 모달)
- `editor/VideoEditor.jsx` — 편집기 셸 · `editor/blocks.js`(블록 상수·순수 로직) · `editor/timeline.jsx` · `editor/preview.jsx` · `editor/props.jsx`

`ui/`는 컴포넌트군별로: `controls`(버튼·태그·체크박스 등) · `table` · `data-display`(카드·메트릭) ·
`layout`(헤더·내비) · `overlays`(모달·달력). `data/`는 도메인별(rooms·partners·content·templates·
signage·settlement·editor·user·forms·company·accounts)로 나뉩니다.

> 컴포넌트를 옮기거나 새로 만들 때: **공용은 ui/(배럴 ui.jsx)**, **콘솔 내 공용은 각 shared.jsx**,
> **디자인 값은 theme.js**, **더미 데이터·상수는 data/(배럴 data.js)**에 둡니다. (중복 정의 금지)

## 레이아웃 규칙 (중요 · 디자인 의도)

**콘텐츠는 최대한 왼쪽으로 몰아 배치한다.** 화면을 가운데 정렬하거나 폭을 꽉 채워
오른쪽까지 늘리지 않는다. (오른쪽으로 시선이 가면 목이 아프다는 사용자 피드백)

- 일부 화면/섹션이 **왼쪽에 치우쳐 보이는 것은 의도된 것** — "가운데로 맞춰달라",
  "남는 오른쪽 공간을 채워달라"는 식으로 **고치지 말 것**.
- 새 화면·섹션도 같은 원칙: 좌측 정렬, 콘텐츠 폭은 필요한 만큼만(예: `maxWidth`),
  남는 공간은 오른쪽에 비워둔다.
- 기존 메인 영역 폭 제한(예: `AdminConsole`의 `maxWidth: 1000`)은 이 의도의 일부.
  넓혀서 오른쪽을 채우는 변경은 하지 않는다.

## 검증 도구

이 프로젝트엔 ESLint가 없고 `vite build`는 import 누락(런타임 ReferenceError)을 못 잡습니다.
그래서 정적 참조 검사기를 둡니다 — **파일을 옮기거나 import를 손댄 뒤 꼭 실행**하세요.

```bash
npm run check     # check-refs + check-scope 연속 실행
npm run build     # 모듈 그래프·named export 해석 검증
```

- `scripts/check-refs.mjs` — 모듈 단위 참조 검사(import 누락·미해결 JSX 태그)
- `scripts/check-scope.mjs` — **스코프 인식** undefined 참조 검사. 한 컴포넌트에서 정의한
  헬퍼를 다른 컴포넌트에서 쓰는 류(check-refs가 못 잡는 함수 스코프 오류 → 흰화면)를 탐지.
- `scripts/gen-imports.mjs` — 코드 조각이 필요로 하는 import 헤더 자동 생성(분리 작업 보조)
