// 더미 데이터 — 정산(파트너사별 요약·예약 건별·거래명세서·입금 내역).
//   billed = count × 건당 단가 = SETTLEMENT_ITEMS 합계 · paid = SETTLEMENT_DEPOSITS 합계 · unpaid = billed − paid

// 파트너사별 요약 (상세 화면의 청구=Σ매출건, 입금=Σ입금내역, 미수금=청구−입금과 일치)
export const SETTLEMENT_PARTNERS = [
  { partner: "무지개동산 반려동물장례식장", region: "전남 영광군", count: 6, billed: 450000, paid: 450000, unpaid: 0, status: "done" },
  { partner: "펫포레스트 추모관", region: "서울 서초구", count: 5, billed: 450000, paid: 270000, unpaid: 180000, status: "waiting" },
  { partner: "하늘소풍 반려동물장례식장", region: "경기 안산시", count: 0, billed: 0, paid: 0, unpaid: 0, status: "done" },
];

// 예약 건별 (단가 스냅샷 고정) · ymd: 기간 필터용 전체 날짜 · amount = 해당 파트너 건당 단가
//   무지개동산 6건×75,000 = 450,000 · 펫포레스트 5건×90,000 = 450,000 (하늘소풍은 비활성 — 매출 없음)
export const SETTLEMENT_ITEMS = [
  // 무지개동산 반려동물장례식장 (75,000/건)
  { deceased: "봄이", chief: "한도윤", partner: "무지개동산 반려동물장례식장", ymd: "2026-05-22", date: "05.22", amount: 75000, status: "done" },
  { deceased: "달이", chief: "노유진", partner: "무지개동산 반려동물장례식장", ymd: "2026-05-30", date: "05.30", amount: 75000, status: "done" },
  { deceased: "가을", chief: "서동현", partner: "무지개동산 반려동물장례식장", ymd: "2026-06-14", date: "06.14", amount: 75000, status: "billed" },
  { deceased: "콩이", chief: "홍성호", partner: "무지개동산 반려동물장례식장", ymd: "2026-06-15", date: "06.15", amount: 75000, status: "billed" },
  { deceased: "보리", chief: "김민재", partner: "무지개동산 반려동물장례식장", ymd: "2026-06-16", date: "06.16", amount: 75000, status: "waiting" },
  { deceased: "단지", chief: "강민서", partner: "무지개동산 반려동물장례식장", ymd: "2026-06-17", date: "06.17", amount: 75000, status: "waiting" },
  // 펫포레스트 추모관 (90,000/건)
  { deceased: "별이", chief: "윤상호", partner: "펫포레스트 추모관", ymd: "2026-05-18", date: "05.18", amount: 90000, status: "done" },
  { deceased: "모카", chief: "정우성", partner: "펫포레스트 추모관", ymd: "2026-05-28", date: "05.28", amount: 90000, status: "done" },
  { deceased: "초코", chief: "이정훈", partner: "펫포레스트 추모관", ymd: "2026-06-12", date: "06.12", amount: 90000, status: "billed" },
  { deceased: "나비", chief: "박은영", partner: "펫포레스트 추모관", ymd: "2026-06-14", date: "06.14", amount: 90000, status: "billed" },
  { deceased: "두부", chief: "최지우", partner: "펫포레스트 추모관", ymd: "2026-06-17", date: "06.17", amount: 90000, status: "waiting" },
];

// 발행된 거래명세서 내역 (파트너사별) — 발행 시 동결된 스냅샷
export const STATEMENTS = [
  { id: "TS-2026-05-001", partner: "무지개동산 반려동물장례식장", period: "2026.05.01 ~ 05.31", issuedAt: "2026.06.01", count: 10, amount: 750000, status: "sent" },
  { id: "TS-2026-04-001", partner: "무지개동산 반려동물장례식장", period: "2026.04.01 ~ 04.30", issuedAt: "2026.05.02", count: 8, amount: 600000, status: "sent" },
  { id: "TS-2026-05-002", partner: "펫포레스트 추모관", period: "2026.05.01 ~ 05.31", issuedAt: "2026.06.01", count: 7, amount: 630000, status: "sent" },
];

// 입금 내역 (파트너사 수금 기록) — 청구 − 입금 = 미수금. 파트너사별 합계는 SETTLEMENT_PARTNERS.paid와 일치.
export const SETTLEMENT_DEPOSITS = [
  // 무지개동산 (청구 450,000 · 입금 450,000 · 미수금 0)
  { id: "DP-2606-01", partner: "무지개동산 반려동물장례식장", date: "2026-06-01", amount: 150000, method: "계좌이체", memo: "5월분 정산금" },
  { id: "DP-2606-04", partner: "무지개동산 반려동물장례식장", date: "2026-06-17", amount: 300000, method: "계좌이체", memo: "6월분 정산금" },
  // 펫포레스트 (청구 450,000 · 입금 270,000 · 미수금 180,000)
  { id: "DP-2606-02", partner: "펫포레스트 추모관", date: "2026-06-02", amount: 180000, method: "계좌이체", memo: "5월분 정산금" },
  { id: "DP-2606-05", partner: "펫포레스트 추모관", date: "2026-06-16", amount: 90000, method: "계좌이체", memo: "6월 1차" },
];
