// ─────────────────────────────────────────────────────────────
// Memoria Works — 디자인 토큰 (디자인_가이드.md 기준)
// 따뜻한 아이보리 + 네이비/골드 · 반려동물 이름 명조 · 빨강·버건디 배제 · 색은 상태에만
// ─────────────────────────────────────────────────────────────

export const SANS =
  "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, system-ui, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif";
export const SERIF =
  "'Nanum Myeongjo', 'Apple Myungjo', Batang, 'Times New Roman', serif"; // 반려동물 이름 시그니처

// 따뜻한 팔레트 (제한·일관)
export const NAVY = "#182230"; // 사이드바
export const MASTER = "#0e1620"; // 마스터바(최상위)
export const BG = "#efece5"; // 따뜻한 스톤 배경
export const SURFACE = "#fcfbf8"; // 카드 표면(웜 화이트)
export const LINE = "#e4dfd5"; // 헤어라인
export const LINE2 = "#d8d2c5";
export const GOLD = "#a8782e"; // 절제된 골드 (의미·액션 한정)
export const GOLD_D = "#8f6526";
export const GOLD_SOFT = "#f1e8d8";
export const INK = "#2a2622"; // 웜 잉크
export const MUTE = "#726c63"; // 보조
export const FAINT = "#9c968c"; // 약한

// 사이드바 보조 톤(네이비 위)
export const NAV_TEXT = "#a7afbb";
export const NAV_FAINT = "#5a6577";
export const NAV_LINE = "#28323f";

// 상태색: 의미 전용, 채도 절제, 빨강 없음. (색 + 라벨 + 점 → 색약 대응)
export const STATUS = {
  published: { label: "발행완료", c: "#3a7468", bg: "#e9f1ee" },
  review: { label: "컨펌대기", c: "#9a6a1c", bg: "#f4ead7" },
  rendering: { label: "제작중", c: "#3f5e87", bg: "#e9eef5" },
  rework: { label: "재작업", c: "#8a6f5a", bg: "#efe7df" }, // 컨펌 반려 → 재생성 (빨강 배제, 웜 브라운)
  standby: { label: "예비", c: "#8a857b", bg: "#eeece6" },
  info: { label: "안내화면", c: "#5a6470", bg: "#eceef0" },
  // 운영 상태(파트너 라이브/사이니지/정산)
  online: { label: "연결됨", c: "#3a7468", bg: "#e9f1ee" },
  live: { label: "재생중", c: "#3f5e87", bg: "#e9eef5" },
  offline: { label: "오프라인", c: "#8a857b", bg: "#eeece6" },
  done: { label: "완료", c: "#3a7468", bg: "#e9f1ee" },
  waiting: { label: "대기", c: "#9a6a1c", bg: "#f4ead7" },
  unpaid: { label: "미수금", c: "#5a6470", bg: "#eceef0" },
  billed: { label: "청구완료", c: "#3f5e87", bg: "#e9eef5" },
};

export const RADIUS = 4;
