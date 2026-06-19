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
