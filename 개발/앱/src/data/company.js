// 더미 데이터 — 공급자 정보·발행 링크·다운로드(파일명 규칙·최종본 아카이브).

// 외부 링크 (발행 HLS · 토큰 · 만료)
export const LINKS = [
  { id: "lk-1", deceased: "콩이", url: "memoria.works/v/8fa2c1", issued: "06.15", expires: "퇴실 시 자동 만료", views: 142, status: "published" },
  { id: "lk-2", deceased: "나비", url: "memoria.works/v/2b7e90", issued: "06.14", expires: "퇴실 시 자동 만료", views: 88, status: "published" },
];

// 공급자(거래명세서·문서 자동 삽입)
export const COMPANY = {
  name: "메모리아웍스",
  ceo: "박용진",
  biz: "296-32-01391",
  type: "정보통신업 / 미디어콘텐츠창작업",
  addr: "경기도 시흥시 서울대학로59-59 시그니처타워 444호",
  bank: "기업은행",
  account: "000-000000-00-000",
  holder: "박용진 (메모리아웍스)",
  notifyEmail: "ops@memoriaworks.kr",
  notifyPhone: "010-0000-0000",
  // 고객센터 — 보호자(유저링크)에게 노출되는 문의 연락처. notifyPhone(내부 운영 알림)과 구분.
  csPhone: "1668-0000",
  csHours: "평일 09:00–18:00",
  // 유저폼 1단계 동의 안내 문구 — 관리자 환경설정에서 편집(필수 개인정보 / 선택 마케팅).
  // 처리·위탁·제3자·보호책임자 라인은 파트너사·고객센터 기준으로 자동 표기(여기서 편집 안 함).
  consentPrivacy: `수집 항목 · 반려동물·보호자 성함, 사진/영상, 연락처, 편지 내용
수집 목적 · 추모영상 제작 및 전달
보유 기간 · 보호자 삭제 요청 시까지 보관 (요청 시 즉시 파기)`,
  consentMarketing: `활용 항목 · 완성된 추모영상, 보호자 후기·문구
활용 목적 · 서비스 홍보 콘텐츠(공식 SNS·웹사이트·광고)에 영상·후기 게시 / 신규 서비스·이벤트·할인 혜택 안내(문자·알림톡 발송)
활용 기간 · 동의 철회 시까지 · 언제든 고객센터로 철회 가능`,
  // 개인정보 보호책임자 — 처리방침 전문에 표기(법적 필수). 동의란에는 노출 안 함.
  privacyOfficer: { name: "박용진", title: "개인정보 보호책임자", email: "privacy@memoriaworks.kr" },
  // 개인정보처리방침 전문 — 유저링크 동의란·푸터의 '전문 보기' 모달에 노출. 환경설정에서 편집 가능.
  privacyPolicy: `메모리아웍스(이하 '회사')는 「개인정보 보호법」에 따라 정보주체의 개인정보를 보호하고 관련 고충을 신속히 처리할 수 있도록 다음과 같이 개인정보처리방침을 수립·공개합니다.

제1조 (개인정보의 처리 목적)
회사는 다음의 목적을 위하여 개인정보를 처리하며, 목적 이외의 용도로는 이용하지 않습니다.
 - 반려동물 추모영상의 제작 및 보호자에게 전달
 - 영상 제작 관련 안내·확인 및 문의 응대
 - 서비스 이용 기록 관리 및 분쟁 처리

제2조 (처리하는 개인정보 항목)
회사는 추모영상 제작을 위해 다음 항목을 수집·처리합니다.
 - 필수: 반려동물·보호자 성함, 연락처, 사진·영상, 편지 내용
 - 자동수집: 서비스 이용 기록, 접속 일시(부정이용 방지·통계 목적)

제3조 (개인정보의 처리 및 보유 기간)
회사는 정보주체로부터 동의받은 보유·이용 기간 내에서 개인정보를 처리·보유합니다.
 - 추모영상 제작·전달 정보: 보호자의 삭제 요청 시까지 보관하며, 요청 시 지체 없이 파기합니다.
 - 관계 법령에 보존 의무가 있는 경우 해당 기간 동안 보관합니다.

제4조 (개인정보의 제3자 제공)
회사는 정보주체의 개인정보를 제1조의 목적 범위 내에서만 처리하며, 정보주체의 동의·법령의 규정 등에 해당하는 경우를 제외하고는 제3자에게 제공하지 않습니다.

제5조 (개인정보 처리의 위탁)
회사는 원활한 서비스 제공을 위해 개인정보 처리 업무를 위탁할 수 있습니다.
 - 수집·접수: 제휴 반려동물 장례식장(파트너사)
 - 영상 제작·저장: 메모리아웍스
회사는 위탁 시 수탁자가 개인정보를 안전하게 처리하도록 관리·감독합니다.

제6조 (정보주체의 권리·의무 및 행사 방법)
정보주체는 언제든지 개인정보 열람·정정·삭제·처리정지를 요구할 수 있으며, 회사는 지체 없이 조치합니다.
 - 권리 행사는 고객센터를 통해 요청할 수 있습니다.

제7조 (개인정보의 파기)
회사는 보유 기간의 경과, 처리 목적 달성 등 개인정보가 불필요하게 되었을 때 지체 없이 파기합니다.
 - 전자적 파일: 복구 불가능한 방법으로 영구 삭제
 - 출력물 등: 분쇄 또는 소각

제8조 (개인정보의 안전성 확보조치)
회사는 개인정보의 안전성 확보를 위해 접근 권한 관리, 접속 기록 보관, 전송·저장 구간 암호화 등 기술적·관리적 조치를 시행합니다.

제9조 (개인정보 보호책임자)
회사는 개인정보 처리에 관한 업무를 총괄하여 책임지는 개인정보 보호책임자를 다음과 같이 지정합니다.
 - 개인정보 보호책임자: 박용진
 - 문의: 메모리아웍스 고객센터

제10조 (권익침해 구제 방법)
정보주체는 개인정보침해신고센터(privacy.kr / 118), 개인정보분쟁조정위원회(kopico.go.kr / 1833-6972) 등에 분쟁 해결·상담을 신청할 수 있습니다.

부칙
본 방침은 공고일로부터 시행됩니다.`,
};

// 파트너사 코드 — 등록순 4자리 (P-001 → 0001). 파일명 규칙에 사용.
export const PARTNER_CODE = { "P-001": "0001", "P-002": "0002", "P-003": "0003" };

// 다운로드 대상 종류 — 발행 최종본(mp4) · 원본 소스(보호자 업로드 사진·영상 묶음)
export const DOWNLOAD_TARGETS = [
  { key: "final", label: "발행 최종본", ext: "mp4" },
  { key: "source", label: "원본 소스", ext: "zip" },
  { key: "both", label: "최종본+원본", ext: "" },
];

// 파일명 스템: {파트너코드4}_{호실2}_{장례일시YYMMDDHHmm} — 예: 0001_01_2606171030
//   호실·장례일시 미상(워커 메타 누락)이면 자리표시자(00 / video id)로 대체해 파일명이 깨지지 않게 함.
const fileStem = (v) => {
  const code = PARTNER_CODE[v.partnerId] || "0000";
  const room = (v.room != null && v.room !== "") ? String(v.room).padStart(2, "0") : "00";
  const dt = v.datetime || String(v.id || "").replace(/[^0-9a-z]/gi, "").slice(0, 10) || "unknown";
  return `${code}_${room}_${dt}`;
};
// 발행 최종본 파일명 규칙: 스템.mp4 — 예: 0001_01_2606171030.mp4
export const videoFileName = (v) => `${fileStem(v)}.mp4`;
// 원본 소스 묶음 파일명 — 보호자 업로드 원본(사진·영상) 일체 zip
export const sourceFileName = (v) => `${fileStem(v)}_src.zip`;
// 다운로드 대상별 용량(MB) — final | source | both
export const assetSize = (v, target) =>
  target === "source" ? (v.srcMB || 0) : target === "both" ? (v.sizeMB || 0) + (v.srcMB || 0) : (v.sizeMB || 0);
export const assetFileName = (v, target) => target === "source" ? sourceFileName(v) : videoFileName(v);

// 발행 최종본 + 원본 소스 아카이브 — 스토리지 기간별 선택 다운로드 대상.
//   sizeMB: 발행 최종본(mp4) 용량 · srcMB: 원본 소스(보호자 업로드 사진·영상) 묶음 용량
//   date: 화장일 YYYY-MM-DD · datetime: YYMMDDHHmm
export const FINAL_VIDEOS = [
  // 무지개동산 (0001)
  { id: "fv-01", partnerId: "P-001", partner: "무지개동산 반려동물장례식장", deceased: "콩이", room: 1, datetime: "2606171030", date: "2026-06-17", sizeMB: 148, srcMB: 540 },
  { id: "fv-02", partnerId: "P-001", partner: "무지개동산 반려동물장례식장", deceased: "가을", room: 1, datetime: "2606160930", date: "2026-06-16", sizeMB: 132, srcMB: 472 },
  { id: "fv-03", partnerId: "P-001", partner: "무지개동산 반려동물장례식장", deceased: "보리", room: 2, datetime: "2606151610", date: "2026-06-15", sizeMB: 155, srcMB: 610 },
  { id: "fv-04", partnerId: "P-001", partner: "무지개동산 반려동물장례식장", deceased: "달이", room: 2, datetime: "2605301345", date: "2026-05-30", sizeMB: 121, srcMB: 388 },
  { id: "fv-05", partnerId: "P-001", partner: "무지개동산 반려동물장례식장", deceased: "봄이", room: 3, datetime: "2605221100", date: "2026-05-22", sizeMB: 118, srcMB: 415 },
  { id: "fv-06", partnerId: "P-001", partner: "무지개동산 반려동물장례식장", deceased: "별이", room: 4, datetime: "2604281500", date: "2026-04-28", sizeMB: 109, srcMB: 352 },
  // 펫포레스트 (0002)
  { id: "fv-07", partnerId: "P-002", partner: "펫포레스트 추모관", deceased: "루이", room: 1, datetime: "2606171820", date: "2026-06-17", sizeMB: 162, srcMB: 688 },
  { id: "fv-08", partnerId: "P-002", partner: "펫포레스트 추모관", deceased: "초코", room: 1, datetime: "2606121130", date: "2026-06-12", sizeMB: 144, srcMB: 503 },
  { id: "fv-09", partnerId: "P-002", partner: "펫포레스트 추모관", deceased: "나비", room: 2, datetime: "2606141600", date: "2026-06-14", sizeMB: 138, srcMB: 459 },
  { id: "fv-10", partnerId: "P-002", partner: "펫포레스트 추모관", deceased: "모카", room: 1, datetime: "2605281000", date: "2026-05-28", sizeMB: 151, srcMB: 576 },
  { id: "fv-11", partnerId: "P-002", partner: "펫포레스트 추모관", deceased: "두부", room: 2, datetime: "2604201330", date: "2026-04-20", sizeMB: 127, srcMB: 421 },
];
