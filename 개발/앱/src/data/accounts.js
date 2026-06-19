// ─────────────────────────────────────────────────────────────
// 더미 데이터 — 관리자 계정 권한체계 (마스터 관리자 / 작업자).
// (파트너·유저는 1:1이라 권한 없음)
// ─────────────────────────────────────────────────────────────
export const ADMIN_ROLES = {
  master: { label: "마스터 관리자", desc: "전체 권한 · 계정/권한 관리 (풀 액세스)" },
  worker: { label: "작업자", desc: "마스터가 선택한 권한만 접근" },
};

// 관리자 페이지 키 → 라벨 (사이드바·권한 토글 공용). accounts(계정·권한)는 마스터 고유라 위임 불가.
export const ADMIN_PAGES = {
  overview: "대시보드",
  partners: "파트너사 관리",
  customers: "고객관리",
  production: "편집·컨펌",
  secondedit: "2차 가공",
  templates: "영상 템플릿",
  content: "콘텐츠 허브",
  settlement: "정산 내역",
  forms: "유저 입력 폼",
  settings: "설정",
  storage: "스토리지",
  signage: "사이니지",
};

// 마스터가 작업자에게 부여할 수 있는 권한(=accounts 제외 전체)
export const GRANTABLE_PERMS = Object.keys(ADMIN_PAGES);

// 마스터 풀 액세스 = 모든 페이지 + 계정관리
export const MASTER_PERMS = [...GRANTABLE_PERMS, "accounts"];

// 작업자 신규 추가 시 기본 권한
export const DEFAULT_WORKER_PERMS = ["overview", "customers", "production", "secondedit", "templates", "content"];

// 관리자 계정 목록 (마스터가 작업자 추가·권한 선택) — status: active | invited | disabled
// worker.perms = 마스터가 부여한 권한 배열. master는 perms 무시(항상 풀 액세스).
// loginId = 로그인 아이디(고유). 비밀번호는 목업이라 저장 안 함 — 마스터가 초기 비번 발급 후 재설정만 노출.
// status invited = 계정 발급됨 · 첫 로그인(비번 변경) 전.
export const ADMIN_ACCOUNTS = [
  { id: "u-master", name: "박용진", role: "master", loginId: "master", email: "ceo@memoriaworks.kr", phone: "010-2841-7700", status: "active", lastLogin: "방금 전", perms: [] },
  { id: "u-w1", name: "정다은", role: "worker", loginId: "daeun", email: "daeun@memoriaworks.kr", phone: "010-3372-1185", status: "active", lastLogin: "오늘 09:12", perms: ["overview", "customers", "production", "secondedit", "templates", "content"] },
  { id: "u-w2", name: "김도현", role: "worker", loginId: "dohyun", email: "dohyun@memoriaworks.kr", phone: "010-8810-4426", status: "active", lastLogin: "어제 18:40", perms: ["overview", "production", "secondedit", "templates", "content"] },
  { id: "u-w3", name: "이수아", role: "worker", loginId: "sua", email: "sua@memoriaworks.kr", phone: "—", status: "invited", lastLogin: "—", perms: ["production"] },
];
