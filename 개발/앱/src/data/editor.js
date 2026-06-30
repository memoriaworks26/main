// 더미 데이터 — 영상 편집기(예약·EDL 블록·편지·타임라인) + 장면 전환 라벨셋.

// 영상 편집기 — EDL 블록 (예약 1건: 콩이)
export const EDITOR_RESERVATION = {
  id: "R-240615-01",
  deceased: "콩이",
  chief: "홍성호",
  file: "콩이_추모영상.mp4",
  bgm: "추모_잔잔한_피아노.mp3",
};

export const EDITOR_BLOCKS = [
  { id: "blk-1", type: "title", label: "타이틀", source: "콩이 독사진 → AI 초상화·톤변경", detail: "AI 초상화+자막 → 10초 톤변경 오버랩 → 페이드아웃", dur: 20, status: "done", provider: "OpenAI" },
  { id: "blk-2", type: "ai", label: "AI 영상", source: "독사진 1장 → AI 영상", detail: "Kling 이미지→영상 (A · 추억 슬라이드 앞)", dur: 8, status: "done", provider: "Kling" },
  { id: "blk-3", type: "slide", label: "추억 슬라이드", source: "보호자 사진 20장", detail: "FFmpeg 합성 (장당 7~10초, 총 2:30)", dur: 150, status: "rendering" },
  { id: "blk-4", type: "video", label: "추억 영상", source: "보호자 영상 묶음", detail: "원본 사운드 · 최종 렌더 시 합성 (총 1:30)", dur: 90, status: "done" },
  { id: "blk-5", type: "ai", label: "AI 영상", source: "독사진 1장 → AI 영상", detail: "Kling 이미지→영상 (B · 추억 영상 뒤)", dur: 8, status: "done", provider: "Kling" },
  { id: "blk-6", type: "letter", label: "편지", source: "보호자 작성 편지", detail: "FFmpeg + 텍스트 (배경음만, 최대 3:30)", dur: 210, status: "done" },
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
  // 자막 트랙 — 기본 없음. 편집기에서 「자막 추가」로 넣고 미리보기에서 실시간 배치.
  subtitles: [],
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

// 장면 전환 효과 목록 — 전환 효과 명칭은 여기서 단일 관리.
// TRANSITION_TYPES: 관리자 영상 편집기(editor/)용 — 정밀 편집 기준 명칭.
// USER_TRANSITIONS: 유저 모바일 위저드(user/)용 — 보호자 친화적 명칭.
// (두 화면의 노출 수준이 달라 라벨셋을 분리하되, 하드코딩 없이 이 파일에서 함께 관리)
export const TRANSITION_TYPES = ["페이드", "슬라이드", "와이프", "없음"];
// USER_TRANSITIONS — 대표 전환 10개. ko=화면 표시(한글), x=ffmpeg xfade transition 값.
//   (실제 렌더: ffmpeg -filter_complex xfade=transition=<x>. x:"none"은 전환 없음.)
export const USER_TRANSITIONS = [
  { ko: "전환 없음", x: "none" },
  { ko: "페이드", x: "fade" },
  { ko: "디졸브", x: "dissolve" },
  { ko: "검정 페이드", x: "fadeblack" },
  { ko: "흰색 페이드", x: "fadewhite" },
  { ko: "왼쪽 와이프", x: "wipeleft" },
  { ko: "왼쪽 슬라이드", x: "slideleft" },
  { ko: "원형 열기", x: "circleopen" },
  { ko: "방사형", x: "radial" },
  { ko: "줌인", x: "zoomin" },
];
export const SUBTITLE_POS = ["상단", "중앙", "하단"];
// 자막 폰트 — key(저장값·앱↔워커 공유) + 표시명 + CSS family(미리보기) + file(워커 fontfile).
//   워커 assets/에 같은 파일이 번들돼 있어야 렌더에 반영됨(없으면 본고딕으로 폴백).
export const SUBTITLE_FONTS = [
  { key: "myeongjo", name: "명조", css: "'Nanum Myeongjo', serif", file: "NanumMyeongjo-Regular.ttf" },
  { key: "gothic", name: "고딕", css: "'Noto Sans KR', system-ui, sans-serif", file: "NotoSansKR-Regular.otf" },
  { key: "pen", name: "손글씨", css: "'Nanum Pen Script', cursive", file: "NanumPenScript-Regular.ttf" },
];
export const SUBTITLE_FONT_DEFAULT = "myeongjo"; // 추모 영상 기본은 명조(serif)
// 저장된 폰트값(key) → 미리보기 CSS. 레거시(css 문자열로 저장된 옛 자막)도 흡수.
export function subtitleFontCss(font) {
  const f = SUBTITLE_FONTS.find((x) => x.key === font) || SUBTITLE_FONTS.find((x) => x.css === font);
  if (f) return f.css;
  return typeof font === "string" && /['",]/.test(font) ? font : SUBTITLE_FONTS[0].css;
}

// 자막 효과(배경/그림자/외곽선) — 미리보기 CSS와 워커 drawtext가 같은 key를 공유. 기본 박스(기존 모양 유지).
export const SUBTITLE_EFFECTS = ["박스", "그림자", "외곽선", "없음"];
export const SUBTITLE_EFFECT_DEFAULT = "박스";
// 효과 key → 미리보기 CSS 조각(텍스트 그림자/박스 배경/외곽선). 워커는 ffmpeg drawtext로 동일 의미 재현.
export function subtitleEffectStyle(effect) {
  switch (effect) {
    case "그림자":
      return { textShadow: "1px 2px 5px rgba(0,0,0,.8), 0 0 3px rgba(0,0,0,.7)" };
    case "외곽선":
      return { textShadow: "-1.5px -1.5px 0 #000, 1.5px -1.5px 0 #000, -1.5px 1.5px 0 #000, 1.5px 1.5px 0 #000" };
    case "없음":
      return {};
    case "박스":
    default:
      return { background: "rgba(0,0,0,.4)", padding: "2px 10px", textShadow: "0 1px 3px rgba(0,0,0,.5)" };
  }
}

// 자막 글자색 프리셋 스와치(직접 선택기도 함께 제공). 첫 값이 기본.
export const SUBTITLE_COLORS = ["#f3e9c8", "#ffffff", "#f2d98d", "#e8c4c4", "#cfe0d8", "#1c232c"];
