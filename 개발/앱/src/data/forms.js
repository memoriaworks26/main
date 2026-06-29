// 더미 데이터 — 유저 입력 폼(시스템 고정 필드·파트너별 설정)·사업부·예약 상세.
// 단일 폼 = 고유 링크 URL(접수 시 생성)에서 보호자가 작성하는 폼. forms.jsx=설계도, user/=실제 화면.

// 사업부 (최상위 테넌트) — 모든 데이터(파트너사·고객·폼…)가 사업부로 묶인다.
// 현재 시드 = 메모리아웍스 사업부. 추가 사업부는 store.addBizUnit로 동적 생성.
export const BIZ_UNITS = [
  { id: "biz-1", name: "메모리아웍스" },
];

// 사업부별 용어 — 파트너 콘솔·유저 링크에 노출되는 표현을 1:1로 매칭(사업부마다 다를 수 있음).
// 구조·레이아웃은 그대로, 표시 텍스트만 사업부 설정(termConfigs)을 따른다. 기본값은 반려동물 도메인.
export const TERMS = [
  { key: "subject",  concept: "대상(고인)",     partner: "반려동물",   user: "반려동물 이름" },
  { key: "guardian", concept: "보호자",         partner: "보호자",     user: "보호자" },
  { key: "room",     concept: "빈소/호실",      partner: "호실",       user: "빈소" },
  { key: "breed",    concept: "품종",           partner: "품종",       user: "품종" },
  { key: "checkout", concept: "퇴실",           partner: "퇴실",       user: "퇴실" },
];

// 시스템 고정 필드 정의 — 파트너사는 선택 항목만 표시/숨김 + 라벨명 변경 가능.
// locked: true → 항상 표시, 파트너 수정 불가. section은 소분류(태그).
export const FORM_FIELDS = [
  // 영상 제작 필수 (잠금)
  { key: "petName",    section: "영상 기본",   label: "반려동물 이름",  type: "텍스트",   required: true,  locked: true,  hint: "타이틀 자막 직접 사용" },
  { key: "photos",     section: "영상 기본",   label: "사진 업로드",    type: "사진",     required: true,  locked: true,  hint: "슬라이드 세그먼트 (최소 1장 필수)" },
  // 운영 필수 (잠금)
  { key: "ownerName",  section: "운영",        label: "보호자 성함",    type: "텍스트",   required: true,  locked: true,  hint: "알림톡 수신자명 · 발행 링크 발송" },
  { key: "phone",      section: "운영",        label: "연락처",         type: "전화번호", required: true,  locked: true,  hint: "URL · 발행 알림 발송" },
  // 영상 상세 선택
  { key: "species",    section: "영상 상세",   label: "품종",           type: "텍스트",   required: false, locked: false, hint: "자막 세부 정보" },
  { key: "age",        section: "영상 상세",   label: "나이",           type: "숫자",     required: false, locked: false, hint: "자막 세부 정보" },
  { key: "yearsWith",  section: "영상 상세",   label: "함께한 기간",    type: "텍스트",   required: false, locked: false, hint: "예: 13년" },
  // 추모 콘텐츠 선택
  { key: "letter",     section: "추모 콘텐츠", label: "추모 편지",      type: "장문",     required: false, locked: false, hint: "편지 씬 활성화 (없으면 씬 생략)" },
  { key: "videoClips", section: "추모 콘텐츠", label: "추가 영상 클립", type: "동영상",   required: false, locked: false, hint: "슬라이드 보강" },
  { key: "editMemo",   section: "추모 콘텐츠", label: "편집 요청 메모", type: "장문",     required: false, locked: false, hint: "작업자 전달 · 보호자에게 비노출" },
];

// 파트너사별 폼 설정 — 선택 항목만 { hidden, label? } 오버라이드 가능
export const FORM_CONFIGS = {
  "P-001": {
    species:    { hidden: false },
    age:        { hidden: false },
    yearsWith:  { hidden: true },
    letter:     { hidden: false },
    videoClips: { hidden: true },
    editMemo:   { hidden: false },
  },
  "P-002": {
    species:    { hidden: false },
    age:        { hidden: true },
    yearsWith:  { hidden: false },
    letter:     { hidden: false },
    videoClips: { hidden: false },
    editMemo:   { hidden: false },
  },
  "P-003": {
    species:    { hidden: true },
    age:        { hidden: true },
    yearsWith:  { hidden: true },
    letter:     { hidden: false },
    videoClips: { hidden: true },
    editMemo:   { hidden: true },
  },
};

// 파트너 예약 상세 — 보호자 영상제작 URL
export const RESERV_DETAIL = {
  id: "R-240617-02",
  deceased: "보리",
  species: "포메라니안",
  age: 13,
  chief: "김민재",
  phone: "010-9181-3047",
  room: "2호실",
  in: "06.16 09:00",
  out: "06.18 07:00",
  status: "review",
  formUrl: "memoria.works/f/k7p2x9",
  code: "MK-240616-02",
  smsSentAt: "06.16 10:24",
  // 유저가 URL에서 입력 → 예약정보에 붙는 데이터
  form: [
    { key: "ownerName",  label: "보호자 성함",    value: "김민재" },
    { key: "phone",      label: "연락처",         value: "010-9181-3047" },
    { key: "petName",    label: "반려동물 이름",   value: "보리" },
    { key: "photos",     label: "사진 업로드",     value: "3장 업로드됨" },
    { key: "species",    label: "품종",            value: "포메라니안" },
    { key: "age",        label: "나이",            value: "13" },
    { key: "letter",     label: "추모 편지",       value: "보리야, 늘 곁에 있어줘서 고마웠어. 무지개다리 건너서도 행복하길." },
  ],
};
