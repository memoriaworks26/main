// 관리자 콘솔 진입점 — 실제 구현은 admin/ 폴더에 도메인별로 분리되어 있다.
// (App.jsx의 import 경로 호환을 위해 default export를 그대로 재노출)
//
// 화면 구조:
//   admin/AdminConsole.jsx  — 셸(내비 + 권한 라우팅)
//   admin/shared.jsx        — 화면 공용 헬퍼(SaveBar, SearchSelect)
//   admin/overview.jsx      — 대시보드
//   admin/partners.jsx      — 파트너사 관리
//   admin/customers.jsx     — 고객관리
//   admin/forms.jsx         — 유저 입력 폼 빌더
//   admin/production.jsx    — 편집·컨펌 / 2차 가공
//   admin/templates.jsx     — 영상 템플릿
//   admin/content.jsx       — 콘텐츠 허브
//   admin/settlement.jsx    — 정산
//   admin/settings.jsx      — 환경설정(내 설정·계정/권한)
//   admin/system.jsx        — 사이니지 / 스토리지
export { default } from "./admin/AdminConsole.jsx";
