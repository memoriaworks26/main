// 더미 데이터 — 호실·예약/접수·2차 가공 큐. 본개발에서 API 연결로 교체.
// 반려동물(펫) 장례: 호실을 시간대(slot)로 예약, 영상 진행상태는 status 단일 출처.

// 호실 현황 (현황판 그리드)
export const ROOMS = [
  { id: 1, name: "1호실", floor: "1층", type: "case", status: "published", deceased: "콩이", species: "말티즈", age: 15, chief: "홍성호", in: "06.15", out: "06.17" },
  { id: 2, name: "2호실", floor: "1층", type: "case", status: "review", deceased: "보리", species: "포메라니안", age: 13, chief: "김민재", in: "06.16", out: "06.18" },
  { id: 3, name: "3호실", floor: "2층", type: "case", status: "rendering", deceased: "초코", species: "푸들", age: 11, chief: "이정훈", in: "06.16", out: "06.18" },
  { id: 4, name: "4호실", floor: "2층", type: "case", status: "published", deceased: "나비", species: "코리안숏헤어", age: 16, chief: "박은영", in: "06.14", out: "06.16" },
];

// 예약·접수 목록 — partner(테넌트), slot(호실 예약 시간대), requestedAt(컨펌 요청 시각 · 분단위) 포함.
// 반려동물 추모는 호실을 시간대(slot)로 예약 — 안치/화장 일정 개념 없음. 영상 진행상태는 status 단일 출처.
// 컨펌 대기 정렬 기준은 requestedAt 오름차순(먼저 요청된 순).
export const RESERVATIONS = [
  // 무지개동산 반려동물장례식장 (P-001)
  { id: "R-240615-01", partner: "무지개동산 반려동물장례식장", deceased: "콩이", chief: "홍성호", phone: "010-4082-0444", room: "1호실", date: "2026-06-15", slot: "14:00~17:20", requestedAt: "06.17 08:24", status: "review", assignee: null },
  { id: "R-240617-02", partner: "무지개동산 반려동물장례식장", deceased: "보리", chief: "김민재", phone: "010-9181-3047", room: "2호실", date: "2026-06-16", slot: "20:00~23:50", requestedAt: "06.18 09:10", status: "rendering", assignee: "정다은" },
  { id: "R-240617-05", partner: "무지개동산 반려동물장례식장", deceased: "단지", chief: "강민서", phone: "010-7741-2230", room: "3호실", date: "2026-06-17", slot: "09:00~12:30", requestedAt: "06.17 22:05", status: "confirm", assignee: "김도현", renderAt: Date.now() - 35000, renderDur: 150 },
  { id: "R-240617-06", partner: "무지개동산 반려동물장례식장", deceased: "나비", chief: "박은영", phone: "010-5521-7788", room: "4호실", date: "2026-06-17", slot: "13:00~16:00", requestedAt: "06.18 07:48", status: "rendering", assignee: "정다은" },
  { id: "R-240614-09", partner: "무지개동산 반려동물장례식장", deceased: "가을", chief: "서동현", phone: "010-3092-6612", room: "1호실", date: "2026-06-14", slot: "10:00~13:40", requestedAt: "06.16 15:30", status: "published", assignee: "김도현" },
  // 자정 넘김(익일 종료) 예약 — endDate가 예약일 +1. 22:00 시작 → 익일 02:00 종료(대시보드 '오늘' 타임라인에서 이어짐 표시 확인용).
  { id: "R-240617-12", partner: "무지개동산 반려동물장례식장", deceased: "밤톨", chief: "윤서진", phone: "010-3322-7788", room: "2호실", date: "2026-06-17", slot: "22:00~02:00", endDate: "2026-06-18", requestedAt: "06.17 21:40", status: "rendering", assignee: "김도현" },
  // 펫포레스트 추모관 (P-002)
  { id: "R-240617-03", partner: "펫포레스트 추모관", deceased: "초코", chief: "이정훈", phone: "010-2274-1188", room: "특1호실", date: "2026-06-17", slot: "11:00~14:30", requestedAt: "06.18 10:02", status: "review", assignee: null },
  { id: "R-240617-07", partner: "펫포레스트 추모관", deceased: "모카", chief: "정우성", phone: "010-8845-1190", room: "1호실", date: "2026-06-17", slot: "15:00~18:20", requestedAt: "06.18 11:15", status: "rendering", assignee: "이수아" },
  { id: "R-240617-08", partner: "펫포레스트 추모관", deceased: "두부", chief: "최지우", phone: "010-6610-7782", room: "2호실", date: "2026-06-17", slot: "18:00~21:10", requestedAt: "06.18 06:33", status: "confirm", assignee: "이수아", renderAt: Date.now() - 100000, renderDur: 115 },
  { id: "R-240616-10", partner: "펫포레스트 추모관", deceased: "루이", chief: "한가람", phone: "010-4471-9920", room: "특1호실", date: "2026-06-16", slot: "09:30~12:00", requestedAt: "06.16 18:20", status: "published", assignee: "정다은" },
];

// 2차 가공 사유 (재가공 트랙)
export const SECOND_EDIT_REASONS = [
  "보호자 요청 수정", "사진·영상 교체", "편지 내용 수정", "BGM 변경", "오타·오인식 수정",
];

// 2차 가공 큐 — 1차 완료(발행) 건을 불러온 재가공 작업. status: pending|rendering|confirm|published
export const SECOND_EDIT_JOBS = [
  { id: "SE-001", reservId: "R-240614-09", status: "pending", reason: "보호자 요청 수정", assignee: null },
  { id: "SE-002", reservId: "R-240616-10", status: "rendering", reason: "사진·영상 교체", assignee: "정다은" },
  { id: "SE-004", reservId: "R-240616-10", status: "confirm", reason: "편지 내용 수정", assignee: "정다은", renderAt: Date.now() - 200000, renderDur: 150 },
  { id: "SE-003", reservId: "R-240614-09", status: "published", reason: "BGM 변경", assignee: "김도현" },
];
