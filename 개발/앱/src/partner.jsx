// 파트너 콘솔 진입점 — 실제 구현은 partner/ 폴더에 도메인별로 분리되어 있다.
// (App.jsx의 import 경로 호환을 위해 default export를 그대로 재노출)
//
// 화면 구조:
//   partner/PartnerConsole.jsx — 셸(내비 + 라우팅 + PartnerCtx Provider + 비밀번호 변경)
//   partner/shared.jsx         — 공용(파트너 컨텍스트 + 호실/시간 슬롯 헬퍼)
//   partner/dashboard.jsx      — 오늘 현황 타임라인
//   partner/intake.jsx         — 예약 접수
//   partner/reservations.jsx   — 예약 목록 + 상세
//   partner/live.jsx           — 사이니지 라이브(장비 상태·제어)
export { default } from "./partner/PartnerConsole.jsx";
