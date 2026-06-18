// ─────────────────────────────────────────────────────────────
// 더미 데이터 (실데이터 아님) — 도메인: 반려동물(펫) 장례 (추모실·반려동물·보호자)
// 본개발에서 API 연결로 교체.
// ─────────────────────────────────────────────────────────────

// 추모실 현황 (현황판 그리드)
export const ROOMS = [
  { id: 1, name: "1추모실", floor: "1층", type: "case", status: "published", deceased: "콩이", species: "말티즈", age: 15, chief: "홍성호", in: "06.15", out: "06.17" },
  { id: 2, name: "2추모실", floor: "1층", type: "case", status: "review", deceased: "보리", species: "포메라니안", age: 13, chief: "김민재", in: "06.16", out: "06.18" },
  { id: 3, name: "3추모실", floor: "2층", type: "case", status: "rendering", deceased: "초코", species: "푸들", age: 11, chief: "이정훈", in: "06.16", out: "06.18" },
  { id: 4, name: "4추모실", floor: "2층", type: "case", status: "published", deceased: "나비", species: "코리안숏헤어", age: 16, chief: "박은영", in: "06.14", out: "06.16" },
  { id: 5, name: "예비", floor: "", type: "standby", status: "standby" },
  { id: 6, name: "종합안내 로비", floor: "", type: "info", status: "info" },
  { id: 7, name: "종합안내 현관", floor: "", type: "info", status: "info" },
];

export const NAV_ROOMS = [
  "1추모실 (1층)", "2추모실 (1층)", "3추모실 (2층)", "4추모실 (2층)",
  "예비", "종합안내 로비", "종합안내 현관",
];

// 두 번째 파트너사(펫포레스트 추모관) 추모실 — 관리자 통합현황 드릴다운용
export const ROOMS_P2 = [
  { id: 21, name: "특1추모실", floor: "1층", type: "case", status: "rendering", deceased: "모카", species: "골든리트리버", age: 12, chief: "정우성", in: "06.16", out: "06.18" },
  { id: 22, name: "1추모실", floor: "1층", type: "case", status: "published", deceased: "두부", species: "시츄", age: 14, chief: "최지우", in: "06.15", out: "06.17" },
  { id: 23, name: "2추모실", floor: "2층", type: "case", status: "review", deceased: "별이", species: "페르시안", age: 17, chief: "윤상호", in: "06.16", out: "06.18" },
  { id: 24, name: "예비", floor: "", type: "standby", status: "standby" },
  { id: 25, name: "종합안내 로비", floor: "", type: "info", status: "info" },
];

// 파트너사(반려동물 장례식장) ↔ 추모실 매핑 — 현황판/추모실은 장례식장별
export const PARTNER_ROOMS = {
  "P-001": ROOMS, // 무지개동산 반려동물장례식장
  "P-002": ROOMS_P2, // 펫포레스트 추모관
  "P-003": [], // 하늘소풍 반려동물장례식장 (비활성)
};

// 파트너사별 추모실 요약 통계
export function roomStats(partnerId) {
  const rs = (PARTNER_ROOMS[partnerId] || []).filter((r) => r.type === "case");
  const n = (s) => rs.filter((r) => r.status === s).length;
  return { total: rs.length, rendering: n("rendering"), review: n("review"), published: n("published") };
}

// 예약·접수 목록 — partner(테넌트), requestedAt(컨펌 요청 시각 · 분단위), alert(예외) 포함.
// 컨펌 대기 정렬 기준은 requestedAt 오름차순(먼저 요청된 순).
export const RESERVATIONS = [
  // 무지개동산 반려동물장례식장 (P-001)
  { id: "R-240615-01", partner: "무지개동산 반려동물장례식장", deceased: "콩이", chief: "홍성호", phone: "010-4082-0444", room: "1추모실", time: "06.15 안치 · 06.17 화장", requestedAt: "06.17 08:24", video: "컨펌대기", status: "review", alert: null, assignee: null },
  { id: "R-240617-02", partner: "무지개동산 반려동물장례식장", deceased: "보리", chief: "김민재", phone: "010-9181-3047", room: "2추모실", time: "06.16 안치 · 06.18 화장", requestedAt: "06.18 09:10", video: "제작중", status: "rendering", alert: null, assignee: "정다은" },
  { id: "R-240617-05", partner: "무지개동산 반려동물장례식장", deceased: "단지", chief: "강민서", phone: "010-7741-2230", room: "3추모실", time: "06.17 안치 · 06.18 화장", requestedAt: "06.17 22:05", video: "재작업", status: "rework", alert: null, assignee: "김도현" },
  { id: "R-240617-06", partner: "무지개동산 반려동물장례식장", deceased: "나비", chief: "박은영", phone: "010-5521-7788", room: "4추모실", time: "06.17 안치 · 06.18 화장", requestedAt: "06.18 07:48", video: "제작중", status: "rendering", alert: null, assignee: "정다은" },
  { id: "R-240614-09", partner: "무지개동산 반려동물장례식장", deceased: "가을", chief: "서동현", phone: "010-3092-6612", room: "1추모실", time: "06.14 안치 · 06.16 화장", requestedAt: "06.16 15:30", video: "발행완료", status: "published", alert: null, assignee: "김도현" },
  // 펫포레스트 추모관 (P-002)
  { id: "R-240617-03", partner: "펫포레스트 추모관", deceased: "초코", chief: "이정훈", phone: "010-2274-1188", room: "특1추모실", time: "06.17 안치 · 06.18 화장", requestedAt: "06.18 10:02", video: "컨펌대기", status: "review", alert: null, assignee: null },
  { id: "R-240617-07", partner: "펫포레스트 추모관", deceased: "모카", chief: "정우성", phone: "010-8845-1190", room: "1추모실", time: "06.17 안치 · 06.18 화장", requestedAt: "06.18 11:15", video: "제작중", status: "rendering", alert: null, assignee: "이수아" },
  { id: "R-240617-08", partner: "펫포레스트 추모관", deceased: "두부", chief: "최지우", phone: "010-6610-7782", room: "2추모실", time: "06.17 안치 · 06.19 화장", requestedAt: "06.18 06:33", video: "제작중", status: "rendering", alert: "render-fail", assignee: "김도현" },
  { id: "R-240616-10", partner: "펫포레스트 추모관", deceased: "루이", chief: "한가람", phone: "010-4471-9920", room: "특1추모실", time: "06.16 안치 · 06.17 화장", requestedAt: "06.16 18:20", video: "발행완료", status: "published", alert: null, assignee: "정다은" },
];

// 2차 가공 사유 (재가공 트랙)
export const SECOND_EDIT_REASONS = [
  "보호자 요청 수정", "사진·영상 교체", "편지 내용 수정", "BGM 변경", "오타·오인식 수정",
];

// 2차 가공 큐 — 1차 완료(발행) 건을 불러온 재가공 작업. status: pending|rendering|published
export const SECOND_EDIT_JOBS = [
  { id: "SE-001", reservId: "R-240614-09", status: "pending", reason: "보호자 요청 수정" },
  { id: "SE-002", reservId: "R-240616-10", status: "rendering", reason: "사진·영상 교체" },
];

// 예외 라벨(컨펌 큐 상단 노출)
export const RESERV_ALERT = {
  "render-fail": { label: "렌더 실패", hint: "FFmpeg 잡 실패 — 재처리 필요" },
};

// 파트너사(반려동물 장례식장)
//  - id: 고유 코드 — 내부 고정 식별자(매핑 키 · 추모실·템플릿·정산·디바이스 연결, 변경 불가)
//  - idCode: ID 코드 — 파트너 로그인 ID(관리자가 부여·수정 가능)
//  - unitPrice: 건당 단가(영상 1건, VAT 포함)
export const PARTNERS = [
  { id: "P-001", idCode: "rainbow", name: "무지개동산 반려동물장례식장", region: "전남 영광군", manager: "정대현", rooms: 7, active: true, reservThisMonth: 24, revenue: 1800000, unitPrice: 75000 },
  { id: "P-002", idCode: "petforest", name: "펫포레스트 추모관", region: "서울 서초구", manager: "한지수", rooms: 12, active: true, reservThisMonth: 41, revenue: 3075000, unitPrice: 90000 },
  { id: "P-003", idCode: "skypicnic", name: "하늘소풍 반려동물장례식장", region: "경기 안산시", manager: "오세영", rooms: 5, active: false, reservThisMonth: 0, revenue: 0, unitPrice: 75000 },
];

// 고객(보호자) 관리
export const CUSTOMERS = [
  { id: "C-01", chief: "홍성호", phone: "010-4082-0444", deceased: "콩이", partner: "무지개동산 반려동물장례식장", date: "06.15", status: "published" },
  { id: "C-02", chief: "김민재", phone: "010-9181-3047", deceased: "보리", partner: "무지개동산 반려동물장례식장", date: "06.16", status: "review" },
  { id: "C-03", chief: "이정훈", phone: "010-2274-1188", deceased: "초코", partner: "펫포레스트 추모관", date: "06.16", status: "rendering" },
  { id: "C-04", chief: "박은영", phone: "010-5521-7788", deceased: "나비", partner: "펫포레스트 추모관", date: "06.14", status: "published" },
];

// 콘텐츠 허브 자산 (선업로드 클립·사진) — 파트너사별 매칭
export const CONTENT = [
  { id: "ct-1", kind: "clip", partner: "무지개동산 반려동물장례식장", name: "오프닝_무지개.mp4", meta: "0:10 · 1920×1080", size: "12MB" },
  { id: "ct-2", kind: "clip", partner: "무지개동산 반려동물장례식장", name: "배경_들판.mp4", meta: "0:15 · 1920×1080", size: "18MB" },
  { id: "ct-3", kind: "clip", partner: "무지개동산 반려동물장례식장", name: "엔딩_페이드.mp4", meta: "0:08 · 1920×1080", size: "9MB" },
  { id: "ct-4", kind: "photo", partner: "무지개동산 반려동물장례식장", name: "추모액자_전통.png", meta: "투명 PNG", size: "1.2MB" },
  { id: "ct-5", kind: "photo", partner: "펫포레스트 추모관", name: "추모액자_모던.png", meta: "투명 PNG", size: "0.9MB" },
  { id: "ct-6", kind: "clip", partner: "펫포레스트 추모관", name: "오프닝_숲속.mp4", meta: "0:12 · 1920×1080", size: "14MB" },
  { id: "ct-7", kind: "photo", partner: "펫포레스트 추모관", name: "추모액자_내추럴.png", meta: "투명 PNG", size: "1.0MB" },
];

// BGM 라이브러리 (관리자는 곡 교체만 가능)
export const BGM = [
  { id: "b-1", name: "추모_잔잔한_피아노.mp3", meta: "3:45 · 128kbps", current: true },
  { id: "b-2", name: "고요한_현악.mp3", meta: "2:58 · 128kbps", current: false },
  { id: "b-3", name: "따뜻한_어쿠스틱.mp3", meta: "4:12 · 128kbps", current: false },
];

// AI 프롬프트 (리스트 선택형 — 타이틀/AI영상)
export const PROMPTS = [
  { id: "pr-1", target: "타이틀", name: "은은한 보케 + 따뜻한 황금빛", body: "A peaceful memorial scene with soft bokeh, warm golden light, gentle flowers" },
  { id: "pr-2", target: "타이틀", name: "전통 한지 결 + 절제된 먹색", body: "Traditional hanji paper texture, restrained ink tone, calm and dignified" },
  { id: "pr-3", target: "AI영상", name: "벚꽃이 천천히 지는 인트로", body: "Soft fade in with cherry blossoms falling gently, slow cinematic motion" },
];

// 영상 템플릿 — 관리자가 파트너사별로 구성.
// 기본 요소(각 1개만): 타이틀·추억 슬라이드·추억 영상·편지 / 추가 요소(n개): 클립
// 관리자가 할 수 있는 것: 요소 순서 변경 · BGM 선택 · 각 클립의 콘텐츠 허브 자산(영상/이미지) 선택.
export const TEMPLATE_ELEMENTS = [
  { type: "title", label: "타이틀", source: "AI 생성 이미지 + 영정틀", dur: 6, repeatable: false },
  { type: "slide", label: "추억 슬라이드", source: "보호자 사진 자동 구성", dur: 24, repeatable: false },
  { type: "ai", label: "추억 영상", source: "Kling 이미지→영상", dur: 8, repeatable: false },
  { type: "letter", label: "편지", source: "보호자 작성 편지", dur: 18, repeatable: false },
  { type: "clip", label: "클립", source: "콘텐츠 허브 (영상/이미지)", dur: 10, repeatable: true, pickAsset: true },
];
export const elementDef = (type) => TEMPLATE_ELEMENTS.find((e) => e.type === type);

// 파트너사별 템플릿 = { bgm: BGM 곡 id, blocks: [{ id, type, assetId? }] }. blocks 순서가 곧 영상 순서.
// clip 블록만 assetId(콘텐츠 허브 자산 영상/이미지)를 가진다.
export const TEMPLATE_ASSIGN = {
  "P-001": { bgm: "b-1", blocks: [ // 무지개동산 → 클립 2개(영상+이미지)
    { id: "e-101", type: "title" },
    { id: "e-102", type: "clip", assetId: "ct-1" },
    { id: "e-103", type: "slide" },
    { id: "e-104", type: "clip", assetId: "ct-4" },
    { id: "e-105", type: "ai" },
    { id: "e-106", type: "letter" },
  ] },
  "P-002": { bgm: "b-3", blocks: [ // 펫포레스트 → 클립 1개(영상)
    { id: "e-201", type: "title" },
    { id: "e-202", type: "clip", assetId: "ct-6" },
    { id: "e-203", type: "slide" },
    { id: "e-204", type: "ai" },
    { id: "e-205", type: "letter" },
  ] },
  "P-003": { bgm: "b-1", blocks: [ // 하늘소풍 → 클립 미지정(허브 비어있음)
    { id: "e-301", type: "title" },
    { id: "e-302", type: "clip", assetId: null },
    { id: "e-303", type: "slide" },
    { id: "e-304", type: "ai" },
    { id: "e-305", type: "letter" },
  ] },
};

// 사이니지 디바이스 (라즈베리파이 ↔ 추모실 매핑) — 파트너사별
// 사이니지 디바이스 — signal(신호세기 0~100), mode(표출 콘텐츠: 광고|대기|알림|제작영상), lastComm(오프라인 마지막 통신)
export const DEVICES = [
  // 무지개동산 반려동물장례식장
  { id: "RPI-0441", partner: "무지개동산 반려동물장례식장", room: "1추모실", status: "live", playing: "콩이 추모영상", mode: "제작영상", signal: 80, ip: "10.0.0.41" },
  { id: "RPI-0442", partner: "무지개동산 반려동물장례식장", room: "2추모실", status: "live", playing: "보리 추모영상", mode: "제작영상", signal: 90, ip: "10.0.0.42" },
  { id: "RPI-0443", partner: "무지개동산 반려동물장례식장", room: "3추모실", status: "offline", playing: "—", mode: "대기", signal: 0, lastComm: "26.06.18 02:14", ip: "10.0.0.43" },
  { id: "RPI-0444", partner: "무지개동산 반려동물장례식장", room: "4추모실", status: "online", playing: "대기화면", mode: "대기", signal: 60, ip: "10.0.0.44" },
  { id: "RPI-L01", partner: "무지개동산 반려동물장례식장", room: "종합안내 로비", status: "online", playing: "종합안내", mode: "알림", signal: 95, ip: "10.0.0.51" },
  // 펫포레스트 추모관
  { id: "RPI-S01", partner: "펫포레스트 추모관", room: "특1추모실", status: "live", playing: "모카 추모영상", mode: "제작영상", signal: 86, ip: "10.0.1.11" },
  { id: "RPI-S02", partner: "펫포레스트 추모관", room: "1추모실", status: "live", playing: "두부 추모영상", mode: "제작영상", signal: 78, ip: "10.0.1.12" },
  { id: "RPI-S03", partner: "펫포레스트 추모관", room: "2추모실", status: "online", playing: "대기화면", mode: "대기", signal: 64, ip: "10.0.1.13" },
  { id: "RPI-SL01", partner: "펫포레스트 추모관", room: "종합안내 로비", status: "online", playing: "종합안내", mode: "알림", signal: 92, ip: "10.0.1.21" },
];

// 사이니지 콘텐츠 모드 (표출 전환 선택지)
export const SIGNAGE_MODES = ["광고", "대기", "알림", "제작영상"];

// 외부 링크 (발행 HLS · 토큰 · 만료)
export const LINKS = [
  { id: "lk-1", deceased: "콩이", url: "memoria.works/v/8fa2c1", issued: "06.15", expires: "06.17 화장 후", views: 142, status: "published" },
  { id: "lk-2", deceased: "나비", url: "memoria.works/v/2b7e90", issued: "06.14", expires: "06.16 화장 후", views: 88, status: "published" },
];

// 정산 — 파트너사별
export const SETTLEMENT_PARTNERS = [
  { partner: "무지개동산 반려동물장례식장", region: "전남 영광군", count: 12, billed: 900000, paid: 900000, unpaid: 0, status: "done" },
  { partner: "펫포레스트 추모관", region: "서울 서초구", count: 8, billed: 620000, paid: 620000, unpaid: 0, status: "done" },
  { partner: "하늘소풍 반려동물장례식장", region: "경기 안산시", count: 4, billed: 450000, paid: 300000, unpaid: 150000, status: "waiting" },
];

// 정산 — 예약 건별 (단가 스냅샷 고정) · ymd: 기간 필터용 전체 날짜
export const SETTLEMENT_ITEMS = [
  // 무지개동산 반려동물장례식장
  { deceased: "가을", chief: "서동현", partner: "무지개동산 반려동물장례식장", ymd: "2026-05-22", date: "05.22", amount: 75000, status: "billed" },
  { deceased: "달이", chief: "노유진", partner: "무지개동산 반려동물장례식장", ymd: "2026-05-30", date: "05.30", amount: 75000, status: "billed" },
  { deceased: "콩이", chief: "홍성호", partner: "무지개동산 반려동물장례식장", ymd: "2026-06-12", date: "06.12", amount: 75000, status: "done" },
  { deceased: "보리", chief: "김민재", partner: "무지개동산 반려동물장례식장", ymd: "2026-06-15", date: "06.15", amount: 75000, status: "done" },
  { deceased: "단지", chief: "강민서", partner: "무지개동산 반려동물장례식장", ymd: "2026-06-17", date: "06.17", amount: 75000, status: "waiting" },
  // 펫포레스트 추모관
  { deceased: "별이", chief: "윤상호", partner: "펫포레스트 추모관", ymd: "2026-05-28", date: "05.28", amount: 90000, status: "billed" },
  { deceased: "초코", chief: "이정훈", partner: "펫포레스트 추모관", ymd: "2026-06-12", date: "06.12", amount: 90000, status: "done" },
  { deceased: "나비", chief: "박은영", partner: "펫포레스트 추모관", ymd: "2026-06-14", date: "06.14", amount: 90000, status: "waiting" },
];

// 발행된 거래명세서 내역 (파트너사별) — 발행 시 동결된 스냅샷
export const STATEMENTS = [
  { id: "TS-2026-05-001", partner: "무지개동산 반려동물장례식장", period: "2026.05.01 ~ 05.31", issuedAt: "2026.06.01", count: 10, amount: 750000, status: "sent" },
  { id: "TS-2026-04-001", partner: "무지개동산 반려동물장례식장", period: "2026.04.01 ~ 04.30", issuedAt: "2026.05.02", count: 8, amount: 600000, status: "sent" },
  { id: "TS-2026-05-002", partner: "펫포레스트 추모관", period: "2026.05.01 ~ 05.31", issuedAt: "2026.06.01", count: 7, amount: 630000, status: "sent" },
];

// 입금 내역 (파트너사 수금 기록) — 청구 − 입금 = 미수금. 파트너사별 합계는 SETTLEMENT_PARTNERS.paid와 일치.
export const SETTLEMENT_DEPOSITS = [
  // 무지개동산 (청구 900,000 · 입금 900,000 · 미수금 0)
  { id: "DP-2606-01", partner: "무지개동산 반려동물장례식장", date: "2026-06-01", amount: 450000, method: "계좌이체", memo: "5월분 정산금" },
  { id: "DP-2606-04", partner: "무지개동산 반려동물장례식장", date: "2026-06-16", amount: 450000, method: "계좌이체", memo: "6월 1차" },
  // 펫포레스트 (청구 620,000 · 입금 620,000 · 미수금 0)
  { id: "DP-2606-02", partner: "펫포레스트 추모관", date: "2026-06-02", amount: 620000, method: "계좌이체", memo: "5월분 정산금" },
  // 하늘소풍 (청구 450,000 · 입금 300,000 · 미수금 150,000)
  { id: "DP-2606-03", partner: "하늘소풍 반려동물장례식장", date: "2026-06-05", amount: 300000, method: "계좌이체", memo: "부분 입금" },
];

// 간편장부 (수입/지출)
export const LEDGER = [
  { date: "05-31", who: "무지개동산 반려동물장례식장", memo: "5월 정산금 잔금", income: 450000, expense: 0, kind: "수입" },
  { date: "05-31", who: "펫포레스트 추모관", memo: "5월 정산금", income: 620000, expense: 0, kind: "수입" },
  { date: "05-28", who: "OpenAI", memo: "AI 타이틀 생성 사용료", income: 0, expense: 120000, kind: "지출" },
  { date: "05-28", who: "솔라피", memo: "알림톡·SMS 발송", income: 0, expense: 80000, kind: "지출" },
  { date: "05-20", who: "Cloudflare", memo: "R2 스토리지·CDN", income: 0, expense: 120000, kind: "지출" },
];

// 시스템 — 렌더 큐 3종 (BullBoard)
export const JOB_QUEUES = [
  { id: "q-ai", name: "AI 외부호출", waiting: 1, active: 2, completed: 318, failed: 3 },
  { id: "q-ffmpeg", name: "FFmpeg 합성", waiting: 0, active: 1, completed: 642, failed: 0 },
  { id: "q-proxy", name: "프록시 생성", waiting: 4, active: 3, completed: 1204, failed: 1 },
];

// 시스템 — 에러·외부 의존성 업타임 (Sentry)
export const UPTIME = [
  { name: "OpenAI (타이틀)", status: "online", latency: "1.8s", uptime: "99.94%" },
  { name: "Kling (AI영상)", status: "online", latency: "12.4s", uptime: "99.2%" },
  { name: "솔라피 (알림톡)", status: "online", latency: "0.4s", uptime: "99.99%" },
  { name: "Supabase (서울)", status: "online", latency: "38ms", uptime: "100%" },
];

// 영상 편집기 — EDL 블록 (예약 1건: 콩이)
export const EDITOR_RESERVATION = {
  id: "R-240615-01",
  deceased: "콩이",
  chief: "홍성호",
  file: "콩이_추모영상.mp4",
  bgm: "추모_잔잔한_피아노.mp3",
};

export const EDITOR_BLOCKS = [
  { id: "blk-1", type: "title", label: "타이틀", source: "콩이 대표사진", detail: "GPT 이미지 + 추모 액자 오버레이", dur: 6, status: "done", provider: "OpenAI" },
  { id: "blk-2", type: "clip", label: "오프닝 클립", source: "오프닝_무지개.mp4", detail: "콘텐츠 허브 · 영상", dur: 10, status: "done" },
  { id: "blk-2b", type: "clip", label: "추모 액자", source: "추모액자_전통.png", detail: "콘텐츠 허브 · 이미지", dur: 5, status: "done" },
  { id: "blk-3", type: "slide", label: "추억 슬라이드", source: "보호자 사진 8장", detail: "FFmpeg 합성", dur: 24, status: "rendering" },
  { id: "blk-4", type: "ai", label: "추억 영상", source: "독사진 2장", detail: "Kling 이미지→영상", dur: 8, status: "done", provider: "Kling" },
  { id: "blk-5", type: "letter", label: "편지", source: "보호자 작성 편지", detail: "FFmpeg + 텍스트 (배경음만)", dur: 18, status: "done" },
];

export const EDITOR_LETTER =
  "사랑하는 콩이에게.\n15년 동안 우리 가족의 가장 큰 행복이었어.\n무지개다리 너머에서 아프지 말고 행복하게 뛰어놀아.";

// 영상 편집기 — 타임라인 멀티트랙 모델 (참고 편집기 기능 반영)
export const EDITOR_TIMELINE = {
  total: 25, // 초
  // 영상·이미지 트랙 (클립 + 클립 사이 트랜지션)
  visual: [
    { id: "s1", kind: "title", label: "타이틀", text: "콩이", dur: 3, start: 0 },
    { id: "tr1", kind: "transition", effect: "페이드", dur: 0.5 },
    { id: "s2", kind: "photo", label: "사진", file: "users/user_001/대표사진.jpg", dur: 3, start: 3 },
    { id: "tr2", kind: "transition", effect: "슬라이드", dur: 0.5 },
    { id: "s3", kind: "photo", label: "사진", file: "users/user_001/공원산책.jpg", dur: 3, start: 6 },
    { id: "tr3", kind: "transition", effect: "페이드", dur: 0.5 },
    { id: "s4", kind: "video", label: "영상", file: "users/user_001/산책영상.mp4", dur: 6, start: 9 },
    { id: "s5", kind: "ai", label: "AI 영상", file: "Kling · 독사진 2장", dur: 8, start: 15 },
  ],
  // 자막 트랙
  subtitles: [
    { id: "sub1", text: "사랑하는 콩이에게", start: 2, end: 6, pos: "하단", font: "Nanum Myeongjo", size: 48, color: "#f3e9c8" },
    { id: "sub2", text: "늘 곁에 있어줘서 고마웠어", start: 8, end: 14, pos: "하단", font: "Nanum Myeongjo", size: 48, color: "#f3e9c8" },
    { id: "sub3", text: "무지개다리 너머에서 행복하길", start: 18, end: 24, pos: "하단", font: "Nanum Myeongjo", size: 48, color: "#f3e9c8" },
  ],
  // 오디오(BGM) 트랙
  audio: [
    { id: "a1", file: "_shared/추모_잔잔한_피아노.mp3", start: 0, dur: 25, volume: 100, fadeIn: 1, fadeOut: 2 },
  ],
  // 소스 라이브러리
  sources: {
    images: [
      { id: "im1", name: "대표사진.jpg", meta: "1920×1080" },
      { id: "im2", name: "공원산책.jpg", meta: "1920×1080" },
      { id: "im3", name: "가족나들이.jpg", meta: "1920×1080" },
      { id: "im4", name: "아기때.jpg", meta: "1920×1080" },
    ],
    videos: [{ id: "vd1", name: "산책영상.mp4", meta: "0:06 · 1920×1080" }],
    audio: [
      { id: "au1", name: "추모_잔잔한_피아노.mp3", meta: "3:45 · 적용 중" },
      { id: "au2", name: "고요한_현악.mp3", meta: "2:58" },
      { id: "au3", name: "따뜻한_어쿠스틱.mp3", meta: "4:12" },
    ],
  },
};

export const TRANSITION_TYPES = ["페이드", "슬라이드", "와이프", "없음"];
export const SUBTITLE_POS = ["상단", "중앙", "하단"];

// 유저 모바일 — 7단계 위저드
export const USER_STEPS = [
  "개인정보 동의", "소스 업로드", "AI 변환", "장면 전환", "배경 음악", "편지 작성", "미리보기", "영상 완료",
];

export const USER_UPLOADS = [
  { id: "u-1", name: "산책_봄날.jpg", kind: "photo", size: "3.2MB" },
  { id: "u-2", name: "가족나들이_2019.jpg", kind: "photo", size: "4.1MB" },
  { id: "u-3", name: "산책영상.mp4", kind: "video", size: "82MB" },
  { id: "u-4", name: "대표사진.jpg", kind: "photo", size: "2.8MB" },
];

// 상단 공통 알림(Bell)
export const NOTIFICATIONS = [
  { id: "n-1", kind: "review", text: "2추모실 보리 — 컨펌 요청" },
  { id: "n-2", kind: "rendering", text: "3추모실 초코 — 슬라이드 블록 렌더링 중" },
  { id: "n-3", kind: "info", text: "AI 외부호출 큐 실패 잡 3건 — 재처리 필요" },
];

// 공급자(거래명세서·문서 자동 삽입)
export const COMPANY = {
  name: "메모리아웍스",
  ceo: "한성용",
  biz: "296-32-01391",
  type: "정보통신업 / 미디어콘텐츠창작업",
  addr: "경기도 시흥시 서울대학로59-59 시그니처타워 444호",
  bank: "기업은행",
  account: "000-000000-00-000",
  holder: "한성용 (메모리아웍스)",
  notifyEmail: "ops@memoriaworks.kr",
  notifyPhone: "010-0000-0000",
};

// 스토리지 현황 (Cloudflare R2)
export const STORAGE = {
  used: 412,
  total: 1024,
  unit: "GB",
  // 자산 클래스별 보존 정책(관리자 편집 대상) — retention: "permanent" | 일수(number)
  classes: [
    { key: "source", name: "원본 소스", desc: "보호자 업로드 사진·영상 (개인정보)", sizeGB: 210, files: 1840, retention: "permanent" },
    { key: "final", name: "최종본", desc: "발행된 추모영상", sizeGB: 180, files: 312, retention: 365 },
    { key: "temp", name: "중간 산출물", desc: "프록시·렌더 임시본", sizeGB: 22, files: 96, retention: 7 },
  ],
};

// 파트너사 코드 — 등록순 4자리 (P-001 → 0001). 파일명 규칙에 사용.
export const PARTNER_CODE = { "P-001": "0001", "P-002": "0002", "P-003": "0003" };

// 발행 최종본 파일명 규칙: {파트너코드4}_{호실2}_{장례일시YYMMDDHHmm}.mp4
//   파트너코드 = 등록순 4자리, 호실 = 숫자 2자리, 장례일시 = 년월일시분(24시간) — 예: 0001_01_2606171030.mp4
export const videoFileName = (v) =>
  `${PARTNER_CODE[v.partnerId] || "0000"}_${String(v.room).padStart(2, "0")}_${v.datetime}.mp4`;

// 발행 최종본 아카이브 — 스토리지 기간별 선택 다운로드 대상 (date: 화장일 YYYY-MM-DD · datetime: YYMMDDHHmm).
export const FINAL_VIDEOS = [
  // 무지개동산 (0001)
  { id: "fv-01", partnerId: "P-001", partner: "무지개동산 반려동물장례식장", deceased: "콩이", room: 1, datetime: "2606171030", date: "2026-06-17", sizeMB: 148 },
  { id: "fv-02", partnerId: "P-001", partner: "무지개동산 반려동물장례식장", deceased: "가을", room: 1, datetime: "2606160930", date: "2026-06-16", sizeMB: 132 },
  { id: "fv-03", partnerId: "P-001", partner: "무지개동산 반려동물장례식장", deceased: "보리", room: 2, datetime: "2606151610", date: "2026-06-15", sizeMB: 155 },
  { id: "fv-04", partnerId: "P-001", partner: "무지개동산 반려동물장례식장", deceased: "달이", room: 2, datetime: "2605301345", date: "2026-05-30", sizeMB: 121 },
  { id: "fv-05", partnerId: "P-001", partner: "무지개동산 반려동물장례식장", deceased: "봄이", room: 3, datetime: "2605221100", date: "2026-05-22", sizeMB: 118 },
  { id: "fv-06", partnerId: "P-001", partner: "무지개동산 반려동물장례식장", deceased: "별이", room: 4, datetime: "2604281500", date: "2026-04-28", sizeMB: 109 },
  // 펫포레스트 (0002)
  { id: "fv-07", partnerId: "P-002", partner: "펫포레스트 추모관", deceased: "루이", room: 1, datetime: "2606171820", date: "2026-06-17", sizeMB: 162 },
  { id: "fv-08", partnerId: "P-002", partner: "펫포레스트 추모관", deceased: "초코", room: 1, datetime: "2606121130", date: "2026-06-12", sizeMB: 144 },
  { id: "fv-09", partnerId: "P-002", partner: "펫포레스트 추모관", deceased: "나비", room: 2, datetime: "2606141600", date: "2026-06-14", sizeMB: 138 },
  { id: "fv-10", partnerId: "P-002", partner: "펫포레스트 추모관", deceased: "모카", room: 1, datetime: "2605281000", date: "2026-05-28", sizeMB: 151 },
  { id: "fv-11", partnerId: "P-002", partner: "펫포레스트 추모관", deceased: "두부", room: 2, datetime: "2604201330", date: "2026-04-20", sizeMB: 127 },
];

// 사업부 (멀티 비즈니스 — 시뮬레이터 차용)
export const BIZ_UNITS = [
  { id: "biz-1", name: "반려동물 장례식장", partners: 3, active: true },
  { id: "biz-2", name: "+ 사업부 추가 예정", partners: 0, active: false },
];

// ── 유저 입력 폼 빌더 ──────────────────────────────────────────
// 공통 항목은 모든 폼에 고정(잠금). 파트너사별로 전용 항목만 커스텀.
export const FORM_COMMON_FIELDS = [
  { key: "ownerName", icon: "user", label: "고객 이름", required: true },
  { key: "petName", icon: "paw", label: "반려동물 이름", required: true },
  { key: "phone", icon: "phone", label: "연락처", required: true },
];

// 항목 추가 시 선택하는 입력 타입
export const FORM_FIELD_TYPES = ["텍스트", "장문", "숫자", "날짜", "선택", "사진"];

// 파트너사별 유저 입력 폼 — 파트너사당 1개 템플릿
export const FORM_TEMPLATES = {
  "P-001": [
    { id: "ff-1", label: "반려동물 품종", type: "텍스트", required: false },
    { id: "ff-2", label: "나이(향년)", type: "숫자", required: false },
    { id: "ff-3", label: "추모 한마디", type: "장문", required: false },
  ],
  "P-002": [
    { id: "ff-4", label: "반려동물 품종", type: "텍스트", required: true },
    { id: "ff-5", label: "함께한 기간", type: "텍스트", required: false },
  ],
  "P-003": [],
};

// 파트너 예약 상세 — 보호자 영상제작 URL
export const RESERV_DETAIL = {
  id: "R-240616-02",
  deceased: "보리",
  species: "포메라니안",
  age: 13,
  chief: "김민재",
  phone: "010-9181-3047",
  room: "2추모실",
  in: "06.16 09:00",
  out: "06.18 07:00",
  status: "review",
  formUrl: "memoria.works/f/k7p2x9",
  code: "MK-240616-02",
  smsSentAt: "06.16 10:24",
  // 유저가 URL에서 입력 → 예약정보에 붙는 데이터 (폼 템플릿 기준)
  form: [
    { label: "고객 이름", value: "김민재", common: true },
    { label: "반려동물 이름", value: "보리", common: true },
    { label: "연락처", value: "010-9181-3047", common: true },
    { label: "반려동물 품종", value: "포메라니안" },
    { label: "나이(향년)", value: "13살" },
    { label: "추모 한마디", value: "보리야, 늘 곁에 있어줘서 고마웠어." },
  ],
};


// 알림톡 — 발신번호 + 템플릿 관리 (솔라피, 운영사 선행작업·임계경로)
export const SENDER_NO = { number: "1668-0000", status: "pending" }; // approved | pending
export const ALIMTALK = [
  { id: "at-1", name: "예약 접수 완료", to: "보호자", status: "approved", body: "[메모리아웍스] {보호자}님, {반려동물} 추모영상 제작이 접수되었습니다. 링크에서 사진·영상을 올려주세요." },
  { id: "at-2", name: "영상 제작 완료", to: "보호자", status: "approved", body: "[메모리아웍스] {반려동물}의 추모영상이 완성되었습니다. 아래 링크에서 확인하실 수 있어요." },
  { id: "at-3", name: "컨펌 요청", to: "운영자", status: "pending", body: "[메모리아웍스] {추모실} {반려동물} 영상 컨펌 요청이 도착했습니다." },
  { id: "at-4", name: "발행 완료", to: "보호자", status: "pending", body: "[메모리아웍스] {반려동물} 추모영상이 발행되었습니다. 링크는 퇴실 시 만료됩니다." },
];

// ─────────────────────────────────────────────────────────────
// 관리자 계정 권한체계 — 마스터 관리자 / 작업자 (파트너·유저는 1:1이라 권한 없음)
// ─────────────────────────────────────────────────────────────
export const ADMIN_ROLES = {
  master: { label: "마스터 관리자", desc: "전체 권한 · 계정/권한 관리 (풀 액세스)" },
  worker: { label: "작업자", desc: "마스터가 선택한 권한만 접근" },
};

// 관리자 페이지 키 → 라벨 (사이드바·권한 토글 공용). accounts(계정·권한)는 마스터 고유라 위임 불가.
export const ADMIN_PAGES = {
  overview: "대시보드",
  partners: "파트너사 관리",
  customer: "고객관리",
  producing: "편집·컨펌",
  secondedit: "2차 가공",
  templates: "영상 템플릿",
  content: "콘텐츠 허브",
  settlement: "정산 내역",
  formbuilder: "유저 입력 폼",
  settings: "설정",
  storage: "스토리지",
  signage: "사이니지",
};

// 마스터가 작업자에게 부여할 수 있는 권한(=accounts 제외 전체)
export const GRANTABLE_PERMS = Object.keys(ADMIN_PAGES);

// 마스터 풀 액세스 = 모든 페이지 + 계정관리
export const MASTER_PERMS = [...GRANTABLE_PERMS, "accounts"];

// 작업자 신규 추가 시 기본 권한
export const DEFAULT_WORKER_PERMS = ["overview", "customer", "producing", "secondedit", "templates", "content"];

// 관리자 계정 목록 (마스터가 작업자 추가·권한 선택) — status: active | invited | disabled
// worker.perms = 마스터가 부여한 권한 배열. master는 perms 무시(항상 풀 액세스).
// loginId = 로그인 아이디(고유). 비밀번호는 목업이라 저장 안 함 — 마스터가 초기 비번 발급 후 재설정만 노출.
// status invited = 계정 발급됨 · 첫 로그인(비번 변경) 전.
export const ADMIN_ACCOUNTS = [
  { id: "u-master", name: "한성용", role: "master", loginId: "master", email: "ceo@memoriaworks.kr", status: "active", lastLogin: "방금 전", perms: [] },
  { id: "u-w1", name: "정다은", role: "worker", loginId: "daeun", email: "daeun@memoriaworks.kr", status: "active", lastLogin: "오늘 09:12", perms: ["overview", "customer", "producing", "secondedit", "templates", "content"] },
  { id: "u-w2", name: "김도현", role: "worker", loginId: "dohyun", email: "dohyun@memoriaworks.kr", status: "active", lastLogin: "어제 18:40", perms: ["overview", "producing", "secondedit", "templates", "content"] },
  { id: "u-w3", name: "이수아", role: "worker", loginId: "sua", email: "sua@memoriaworks.kr", status: "invited", lastLogin: "—", perms: ["producing"] },
];
