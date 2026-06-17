// ─────────────────────────────────────────────────────────────
// 더미 데이터 (실데이터 아님) — 도메인: 장례식장(빈소·故 고인·상주)
// 시뮬레이터의 펫 도메인을 인간 장례로 재해석. 본개발에서 API 연결로 교체.
// ─────────────────────────────────────────────────────────────

// 빈소·호실 현황 (현황판 그리드)
export const ROOMS = [
  { id: 1, name: "1호실", floor: "1층", type: "case", status: "published", deceased: "故 홍길동", age: 79, chief: "홍성호", in: "06.15", out: "06.17" },
  { id: 2, name: "2호실", floor: "1층", type: "case", status: "review", deceased: "故 김영수", age: 82, chief: "김민재", in: "06.16", out: "06.18" },
  { id: 3, name: "3호실", floor: "2층", type: "case", status: "rendering", deceased: "故 이순자", age: 75, chief: "이정훈", in: "06.16", out: "06.18" },
  { id: 4, name: "4호실", floor: "2층", type: "case", status: "published", deceased: "故 박철호", age: 88, chief: "박은영", in: "06.14", out: "06.16" },
  { id: 5, name: "예비", floor: "", type: "standby", status: "standby" },
  { id: 6, name: "종합안내 로비", floor: "", type: "info", status: "info" },
  { id: 7, name: "종합안내 현관", floor: "", type: "info", status: "info" },
];

export const NAV_ROOMS = [
  "1호실 (1층)", "2호실 (1층)", "3호실 (2층)", "4호실 (2층)",
  "예비", "종합안내 로비", "종합안내 현관",
];

// 예약·접수 목록
export const RESERVATIONS = [
  { id: "R-240615-01", deceased: "故 홍길동", chief: "홍성호", phone: "010-4082-0444", room: "1호실", time: "06.15 입실 · 06.17 발인", video: "발행완료", status: "published" },
  { id: "R-240616-02", deceased: "故 김영수", chief: "김민재", phone: "010-9181-3047", room: "2호실", time: "06.16 입실 · 06.18 발인", video: "컨펌대기", status: "review" },
  { id: "R-240616-03", deceased: "故 이순자", chief: "이정훈", phone: "010-2274-1188", room: "3호실", time: "06.16 입실 · 06.18 발인", video: "제작중", status: "rendering" },
  { id: "R-240614-04", deceased: "故 박철호", chief: "박은영", phone: "010-5521-7788", room: "4호실", time: "06.14 입실 · 06.16 발인", video: "발행완료", status: "published" },
];

// 파트너사(장례식장)
export const PARTNERS = [
  { id: "P-001", name: "영광농협장례식장", region: "전남 영광군", manager: "정대현", rooms: 7, active: true, reservThisMonth: 24, revenue: 1800000 },
  { id: "P-002", name: "서울추모공원", region: "서울 서초구", manager: "한지수", rooms: 12, active: true, reservThisMonth: 41, revenue: 3075000 },
  { id: "P-003", name: "안산하늘장례식장", region: "경기 안산시", manager: "오세영", rooms: 5, active: false, reservThisMonth: 0, revenue: 0 },
];

// 고객(상주) 관리
export const CUSTOMERS = [
  { id: "C-01", chief: "홍성호", phone: "010-4082-0444", deceased: "故 홍길동", partner: "영광농협장례식장", date: "06.15", status: "published" },
  { id: "C-02", chief: "김민재", phone: "010-9181-3047", deceased: "故 김영수", partner: "영광농협장례식장", date: "06.16", status: "review" },
  { id: "C-03", chief: "이정훈", phone: "010-2274-1188", deceased: "故 이순자", partner: "서울추모공원", date: "06.16", status: "rendering" },
  { id: "C-04", chief: "박은영", phone: "010-5521-7788", deceased: "故 박철호", partner: "서울추모공원", date: "06.14", status: "published" },
];

// 콘텐츠 허브 자산 (선업로드 클립·사진)
export const CONTENT = [
  { id: "ct-1", kind: "clip", name: "오프닝_연꽃.mp4", meta: "0:10 · 1920×1080", size: "12MB" },
  { id: "ct-2", kind: "clip", name: "배경_은하수.mp4", meta: "0:15 · 1920×1080", size: "18MB" },
  { id: "ct-3", kind: "clip", name: "엔딩_페이드.mp4", meta: "0:08 · 1920×1080", size: "9MB" },
  { id: "ct-4", kind: "photo", name: "영정틀_전통.png", meta: "투명 PNG", size: "1.2MB" },
  { id: "ct-5", kind: "photo", name: "영정틀_모던.png", meta: "투명 PNG", size: "0.9MB" },
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

// 영상 템플릿 (파트너사별 블록 순서·구성 — 순서 고정)
export const TEMPLATES = [
  { id: "tpl-1", partner: "영광농협장례식장", name: "기본 추모 5블록", blocks: ["타이틀", "클립", "슬라이드", "AI영상", "편지"] },
  { id: "tpl-2", partner: "서울추모공원", name: "간결형 4블록", blocks: ["타이틀", "슬라이드", "AI영상", "편지"] },
];

// 사이니지 디바이스 (라즈베리파이 ↔ 호실 매핑)
export const DEVICES = [
  { id: "RPI-0441", room: "1호실", status: "live", playing: "故 홍길동 추모영상", ip: "10.0.0.41" },
  { id: "RPI-0442", room: "2호실", status: "online", playing: "대기화면", ip: "10.0.0.42" },
  { id: "RPI-0443", room: "3호실", status: "offline", playing: "—", ip: "10.0.0.43" },
  { id: "RPI-0444", room: "4호실", status: "live", playing: "故 박철호 추모영상", ip: "10.0.0.44" },
  { id: "RPI-L01", room: "종합안내 로비", status: "online", playing: "종합안내", ip: "10.0.0.51" },
];

// 외부 링크 (발행 HLS · 토큰 · 만료)
export const LINKS = [
  { id: "lk-1", deceased: "故 홍길동", url: "memoria.works/v/8fa2c1", issued: "06.15", expires: "06.17 발인 후", views: 142, status: "published" },
  { id: "lk-2", deceased: "故 박철호", url: "memoria.works/v/2b7e90", issued: "06.14", expires: "06.16 발인 후", views: 88, status: "published" },
];

// 정산 — 파트너사별
export const SETTLEMENT_PARTNERS = [
  { partner: "영광농협장례식장", region: "전남 영광군", count: 12, billed: 900000, paid: 900000, unpaid: 0, status: "done" },
  { partner: "서울추모공원", region: "서울 서초구", count: 8, billed: 620000, paid: 620000, unpaid: 0, status: "done" },
  { partner: "안산하늘장례식장", region: "경기 안산시", count: 4, billed: 450000, paid: 300000, unpaid: 150000, status: "waiting" },
];

// 정산 — 예약 건별 (단가 스냅샷 고정)
export const SETTLEMENT_ITEMS = [
  { deceased: "故 홍길동", chief: "홍성호", partner: "영광농협장례식장", date: "06.12", amount: 75000, status: "done" },
  { deceased: "故 김영수", chief: "김민재", partner: "영광농협장례식장", date: "06.15", amount: 75000, status: "done" },
  { deceased: "故 이순자", chief: "이정훈", partner: "서울추모공원", date: "06.12", amount: 75000, status: "done" },
  { deceased: "故 박철호", chief: "박은영", partner: "서울추모공원", date: "06.14", amount: 75000, status: "waiting" },
];

// 간편장부 (수입/지출)
export const LEDGER = [
  { date: "05-31", who: "영광농협장례식장", memo: "5월 정산금 잔금", income: 450000, expense: 0, kind: "수입" },
  { date: "05-31", who: "서울추모공원", memo: "5월 정산금", income: 620000, expense: 0, kind: "수입" },
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

// 영상 편집기 — EDL 블록 (예약 1건: 故 홍길동)
export const EDITOR_RESERVATION = {
  id: "R-240615-01",
  deceased: "故 홍길동",
  chief: "홍성호",
  file: "故홍길동_추모영상.mp4",
  bgm: "추모_잔잔한_피아노.mp3",
};

export const EDITOR_BLOCKS = [
  { id: "blk-1", type: "title", label: "타이틀", source: "故 홍길동 영정", detail: "GPT 이미지 + 영정틀 오버레이", dur: 6, status: "done", provider: "OpenAI" },
  { id: "blk-2", type: "clip", label: "오프닝 클립", source: "오프닝_연꽃.mp4", detail: "콘텐츠 허브 선업로드", dur: 10, status: "done" },
  { id: "blk-3", type: "slide", label: "추억 슬라이드", source: "유족 사진 8장", detail: "FFmpeg 합성", dur: 24, status: "rendering" },
  { id: "blk-4", type: "ai", label: "AI 영상", source: "독사진 2장", detail: "Kling 이미지→영상", dur: 8, status: "done", provider: "Kling" },
  { id: "blk-5", type: "letter", label: "편지", source: "유족 작성 편지", detail: "FFmpeg + 텍스트 (배경음만)", dur: 18, status: "done" },
];

export const EDITOR_LETTER =
  "사랑하는 아버지께.\n늘 든든한 버팀목이 되어주셔서 감사했습니다.\n편안히 영면하소서.";

// 유저 모바일 — 7단계 위저드
export const USER_STEPS = [
  "개인정보 동의", "소스 업로드", "장면 전환", "배경 음악", "편지 작성", "미리보기", "영상 완료",
];

export const USER_UPLOADS = [
  { id: "u-1", name: "아버지_생신.jpg", kind: "photo", size: "3.2MB" },
  { id: "u-2", name: "가족여행_2019.jpg", kind: "photo", size: "4.1MB" },
  { id: "u-3", name: "환갑잔치.mp4", kind: "video", size: "82MB" },
  { id: "u-4", name: "영정사진.jpg", kind: "photo", size: "2.8MB" },
];

// 상단 공통 알림(Bell)
export const NOTIFICATIONS = [
  { id: "n-1", kind: "review", text: "2호실 故 김영수 — 컨펌 요청" },
  { id: "n-2", kind: "rendering", text: "3호실 故 이순자 — 슬라이드 블록 렌더링 중" },
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
};

// 스토리지 현황 (Cloudflare R2)
export const STORAGE = {
  used: 412,
  total: 1024,
  unit: "GB",
  buckets: [
    { name: "최종본 (final)", size: "180 GB", files: 312, policy: "영구 보관" },
    { name: "원본 소스 (source)", size: "210 GB", files: 1840, policy: "영구 보관" },
    { name: "중간 산출물 (proxy·temp)", size: "22 GB", files: 96, policy: "N일(7~14) 후 자동 삭제" },
  ],
};

// 사업부 (멀티 비즈니스 — 시뮬레이터 차용)
export const BIZ_UNITS = [
  { id: "biz-1", name: "장례식장", partners: 3, active: true },
  { id: "biz-2", name: "+ 사업부 추가 예정", partners: 0, active: false },
];

// 파트너 예약 상세 — 보호자 영상제작 URL
export const RESERV_DETAIL = {
  id: "R-240616-02",
  deceased: "故 김영수",
  age: 82,
  chief: "김민재",
  phone: "010-9181-3047",
  room: "2호실",
  in: "06.16 09:00",
  out: "06.18 07:00",
  status: "review",
  formUrl: "memoria.works/f/k7p2x9",
  code: "MK-240616-02",
  smsSentAt: "06.16 10:24",
};
