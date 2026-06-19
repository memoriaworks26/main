// 더미 데이터 — 사이니지(디바이스·표출 모드·소스·알림 문구)·스토리지 현황.

// 사이니지 디바이스 (라즈베리파이 ↔ 호실 매핑) — 파트너사별
// volume(음량 0~100, muted=음소거), mode(표출 콘텐츠: 광고|대기|알림|제작영상), lastComm(오프라인 마지막 통신)
export const DEVICES = [
  // 무지개동산 반려동물장례식장
  { id: "RPI-0441", partner: "무지개동산 반려동물장례식장", room: "1호실", status: "live", playing: "콩이 추모영상", mode: "제작영상", volume: 70, muted: false, ip: "10.0.0.41" },
  { id: "RPI-0442", partner: "무지개동산 반려동물장례식장", room: "2호실", status: "live", playing: "보리 추모영상", mode: "제작영상", volume: 65, muted: false, ip: "10.0.0.42" },
  { id: "RPI-0443", partner: "무지개동산 반려동물장례식장", room: "3호실", status: "offline", playing: "—", mode: "대기", volume: 0, muted: true, lastComm: "26.06.18 02:14", ip: "10.0.0.43" },
  { id: "RPI-0444", partner: "무지개동산 반려동물장례식장", room: "4호실", status: "online", playing: "대기화면", mode: "대기", volume: 50, muted: false, ip: "10.0.0.44" },
  // 펫포레스트 추모관
  { id: "RPI-S01", partner: "펫포레스트 추모관", room: "특1호실", status: "live", playing: "모카 추모영상", mode: "제작영상", volume: 80, muted: false, ip: "10.0.1.11" },
  { id: "RPI-S02", partner: "펫포레스트 추모관", room: "1호실", status: "live", playing: "두부 추모영상", mode: "제작영상", volume: 60, muted: false, ip: "10.0.1.12" },
  { id: "RPI-S03", partner: "펫포레스트 추모관", room: "2호실", status: "online", playing: "대기화면", mode: "대기", volume: 45, muted: false, ip: "10.0.1.13" },
];

// 사이니지 콘텐츠 모드 (표출 전환 선택지)
export const SIGNAGE_MODES = ["광고", "대기", "알림", "제작영상"];

// 사이니지 소스 — 호실 디스플레이에 표출하는 등록 콘텐츠. 이미지·영상 파일 업로드.
// cat(광고|대기|알림), kind(이미지|영상), file(업로드 파일), active(표출 사용 — 켜진 소스를 무한 반복)
export const SIGNAGE_SOURCE_CATS = ["광고", "대기", "알림"];
export const SIGNAGE_SOURCES = [
  { id: "src-ad1", cat: "광고", name: "반려동물 추모용품 안내", kind: "이미지", file: "추모용품_배너.jpg", active: true },
  { id: "src-ad2", cat: "광고", name: "펫 봉안당 분양 안내", kind: "영상", file: "봉안당_소개.mp4", active: false },
  { id: "src-wait1", cat: "대기", name: "무지개다리 대기화면", kind: "영상", file: "무지개다리_루프.mp4", active: true },
  { id: "src-wait2", cat: "대기", name: "꽃밭 슬라이드", kind: "이미지", file: "꽃밭_슬라이드.jpg", active: false },
  { id: "src-noti1", cat: "알림", name: "추모식 안내 배경", kind: "이미지", file: "알림_배경.jpg", active: true },
];

// 알림 모드 전용 — 소스 위에 겹쳐 띄우는 다음 예약 안내 문구.
// 자리표시자: {chief} 보호자명, {deceased} 반려동물명, {room} 호실, {slot} 시간, {date} 날짜
export const SIGNAGE_NOTICE = {
  enabled: true,
  template: "{chief}님 · {deceased} 추모식이 잠시 후 {room}에서 진행됩니다",
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
