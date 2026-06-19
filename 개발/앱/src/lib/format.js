// ─────────────────────────────────────────────────────────────
// 숫자·금액 표시 포맷 공용 헬퍼 — 화면마다 따로 정의하던 won/man/num 정리.
// 출력은 기존 각 화면 정의와 동일하게 보존(behavior-preserving).
// ─────────────────────────────────────────────────────────────

// 천단위 콤마만 (접미사 없음) — 거래명세서 표 등 단위를 따로 붙이는 곳.
export const comma = (v) => (v || 0).toLocaleString();

// 금액 + "원" — 정산·파트너사 등 대부분의 금액 표시.
export const won = (v) => (v || 0).toLocaleString() + "원";

// 만원 단위 반올림 + "만" — 대시보드 요약 지표.
export const man = (v) => Math.round((v || 0) / 10000).toLocaleString() + "만";

// 문자열 입력에서 숫자만 추출 (금액 입력칸 파싱). 빈 값/비숫자는 0.
export const parseNum = (v) => Number(String(v).replace(/[^\d]/g, "")) || 0;
