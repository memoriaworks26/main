// 더미 데이터 — 유저(보호자) 모바일 위저드 단계·업로드 예시.
import { swatch } from "../lib/media.js";

// 유저 모바일 — 7단계 위저드
export const USER_STEPS = [
  "개인정보 동의", "AI 변환", "소스 업로드·장면 전환", "배경 음악", "편지 작성", "미리보기", "영상 완료",
];

// 유저 링크 텍스트 사전(기본값) — 사업부별 세팅에서 실시간 오버라이드(store.userText).
// 구조·레이아웃은 그대로, 표시되는 모든 도메인 텍스트만 사업부별로 바뀐다.
export const USER_TEXT = {
  headerTitle: "추모영상 제작",
  step0: "개인정보 동의", step1: "AI 변환", step2: "소스 업로드·장면 전환", step3: "배경 음악", step4: "편지 작성", step5: "미리보기", step6: "영상 완료",
  sub0: "소중한 기억을 영상으로 담기 위해 아래 동의가 필요합니다.",
  sub1: "추모영상에 쓸 독사진 3장을 올려주세요. 한 장은 타이틀(AI 초상화·톤변경), 나머지 2장은 AI 영상이 됩니다.",
  sub2: "추억 사진과 영상을 따로 올려주세요. 사진은 슬라이드(최대 20장)로, 영상은 그 뒤에 묶음으로 이어집니다. (최대 100MB)",
  sub3: "배경 음악을 고르면 미리듣기가 재생됩니다.",
  sub4: "떠나보낸 아이에게 전하고 싶은 마음을 담아 주세요. 편지는 배경음과 함께 영상에 표시됩니다.",
  sub5: "제작될 추모영상을 미리 확인합니다. (서버 렌더 영상 재생)",
  title1: "AI 변환 · 독사진 3장",
  petNameLabel: "반려동물 이름",
  petNameHint: "타이틀(영정) 자막에 그대로 표시됩니다.",
  titleSystemText: "사랑하는", // 타이틀 자막에서 반려동물명 앞에 붙는 시스템 문구(중앙 하단)
  aiGuide: "잘 나온 독사진일수록 결과가 좋아요 — 아이만 또렷하게, 얼굴이 정면.",
  photoGoodCap: "정면 · 또렷한 전신 · 한 마리",   // 예시사진 하단 문구(좋은 예)
  photoBadCap: "흐릿함 · 여러 마리",              // 예시사진 하단 문구(피해주세요)
  metDateLabel: "우리 처음 만난 날",
  partDateLabel: "무지개다리 건넌 날",
  letterPlaceholder: "받는이 (예: 내 사랑 몽이에게)\n\n전하고 싶은 마음을 적어주세요.\n\n글쓴이 (예: 엄마가)",
  btnAgree: "동의하고 시작", btnNext: "다음", btnMake: "영상 만들기",
};

// 사업부별 세팅 편집기 노출 항목 — 단계별 매핑 + "펫↔사람 등 도메인 바뀌면 달라질" 텍스트만.
// (버튼·단계명·일반 안내 같은 공통 텍스트는 편집기에서 제외 — USER_TEXT 기본값으로만 동작)
// step: 유저 위저드 단계 인덱스(미리보기 동기화). hint: 다른 도메인 예시.
export const USER_TEXT_FIELDS = [
  { step: 1, group: "AI 변환 단계", items: [
    ["petNameLabel", "이름 입력 라벨", "예: 고인 성함"],
    ["titleSystemText", "타이틀 시스템 문구", "이름 앞 문구 · 예: 그리운 / 사랑하는"],
    ["aiGuide", "사진 가이드 문구", "‘아이’ 등 대상 표현"],
    ["photoGoodCap", "예시사진 하단 문구(좋은 예)", "예: 정면 · 또렷한 전신 · 한 마리"],
    ["photoBadCap", "예시사진 하단 문구(피해주세요)", "예: 흐릿함 · 여러 마리"],
  ]},
  { step: 4, group: "편지 단계", items: [
    ["sub4", "안내문", "‘떠나보낸 아이’ 등 표현"],
    ["metDateLabel", "처음 만난 날 라벨", "예: 함께한 첫날"],
    ["partDateLabel", "떠난 날 라벨", "‘무지개다리’ 대신 별세일 등"],
    ["letterPlaceholder", "편지 입력 예시", "받는이·글쓴이 예시"],
  ]},
];

export const USER_UPLOADS = [
  { id: "u-1", name: "산책_봄날.jpg", kind: "photo", size: "3.2MB", thumb: swatch("#cfe0c3", "#9bbf86", "#6f9a57") },
  { id: "u-2", name: "가족나들이_2019.jpg", kind: "photo", size: "4.1MB", thumb: swatch("#f3d9bf", "#e0ad7e", "#c98a52") },
  { id: "u-3", name: "산책영상.mp4", kind: "video", size: "82MB" },
  { id: "u-4", name: "대표사진.jpg", kind: "photo", size: "2.8MB", thumb: swatch("#d6cfe6", "#a99bc8", "#8472ad") },
];
