// 더미 데이터 — 파트너사(반려동물 장례식장).
//  - id: 고유 코드 — 내부 고정 식별자(매핑 키 · 호실·템플릿·정산·디바이스 연결, 변경 불가)
//  - idCode: ID 코드 — 파트너 로그인 ID(관리자가 부여·수정 가능)
//  - unitPrice: 건당 단가(영상 1건, VAT 포함)
export const PARTNERS = [
  { id: "P-001", idCode: "rainbow", name: "무지개동산 반려동물장례식장", region: "전남 영광군", manager: "정대현", phone: "061-352-0444", csPhone: "061-352-0444", csHours: "연중무휴 09:00–20:00", rooms: 7, active: true, reservThisMonth: 24, revenue: 1800000, unitPrice: 75000, contractDate: "2025-11-03", memo: "사이니지 7대 설치 완료. 정산일 매월 말일." },
  { id: "P-002", idCode: "petforest", name: "펫포레스트 추모관", region: "서울 서초구", manager: "한지수", phone: "02-577-1190", csPhone: "02-577-1190", csHours: "연중무휴 09:00–20:00", rooms: 12, active: true, reservThisMonth: 41, revenue: 3690000, unitPrice: 90000, contractDate: "2026-01-15", memo: "특1호실 별도 단가 협의 예정." },
  { id: "P-003", idCode: "skypicnic", name: "하늘소풍 반려동물장례식장", region: "경기 안산시", manager: "오세영", phone: "031-481-7782", csPhone: "031-481-7782", csHours: "연중무휴 09:00–20:00", rooms: 5, active: false, reservThisMonth: 0, revenue: 0, unitPrice: 75000, contractDate: "2026-03-22", memo: "오픈 준비 중 · 디바이스 미설치." },
];
