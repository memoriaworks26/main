// 더미 데이터 — 영상 템플릿(요소 정의·기본 템플릿·파트너사별 배치).
// 관리자가 파트너사별로 구성: 요소 순서 변경 · BGM 선택 · 각 클립의 콘텐츠 허브 자산 선택.

// 기본 요소: 타이틀·추억 슬라이드·추억 영상·편지(각 1개) / AI 영상(A·B 딱 2개까지)·클립(n개)
//  · 타이틀(20초): 독사진 → AI 초상화 + 시스템문구·반려동물명 → 10초에 톤변경 오버랩 → 페이드아웃
//  · AI 영상(8초): 독사진 1장 → AI 영상. A(추억 슬라이드 앞)·B(추억 영상 뒤) 딱 2개까지 — 유저 소스를 감싼다.
//  · 추억 슬라이드(2분30초): 보호자 사진 최대 20장(장당 7~10초) · 사진에만 BGM.
//  · 추억 영상(1분30초): 보호자 영상 묶음(개수 제한 없음) · 원본 사운드 유지(BGM 없음) · 최종 렌더 시 합성.
//  · 편지(3분30초).
export const TEMPLATE_ELEMENTS = [
  { type: "title", label: "타이틀", source: "독사진 → AI 초상화·톤변경", dur: 20, repeatable: false },
  { type: "ai", label: "AI 영상", source: "독사진 1장 → AI 영상", dur: 8, repeatable: true, max: 2 }, // A·B 딱 2개까지
  { type: "slide", label: "추억 슬라이드", source: "보호자 사진 자동 구성 (최대 20장)", dur: 150, repeatable: false },
  { type: "video", label: "추억 영상", source: "보호자 영상 묶음", dur: 90, repeatable: false },
  { type: "letter", label: "편지", source: "보호자 작성 편지", dur: 210, repeatable: false },
  { type: "clip", label: "클립", source: "콘텐츠 허브 (영상/이미지)", dur: 90, repeatable: true, pickAsset: true },
];
export const elementDef = (type) => TEMPLATE_ELEMENTS.find((e) => e.type === type);

// 기본 템플릿 — 신규 파트너 생성 시 이 구성을 복제해서 시작(이후 파트너별로 수정).
// 클립은 파트너 콘텐츠 허브 자산에 연결되므로 기본 템플릿엔 두지 않음(기본 요소 + AI 영상 2개 + BGM만).
// 순서: 타이틀 → AI 영상(A) → 추억 슬라이드 → 추억 영상 → AI 영상(B) → 편지
export const DEFAULT_TEMPLATE_ID = "__default__";
export const DEFAULT_TEMPLATE = {
  bgm: "b-1",
  blocks: [
    { id: "d-title", type: "title" },
    { id: "d-ai-a", type: "ai" },
    { id: "d-slide", type: "slide" },
    { id: "d-video", type: "video" },
    { id: "d-ai-b", type: "ai" },
    { id: "d-letter", type: "letter" },
  ],
};

// 파트너사별 템플릿 = { bgm: BGM 곡 id, blocks: [{ id, type, assetId? }] }. blocks 순서가 곧 영상 순서.
// clip 블록만 assetId(콘텐츠 허브 자산 영상/이미지)를 가진다.
// AI 영상은 보통 2개 — 추억 슬라이드 앞(A), 추억 영상 뒤(B)로 유저 소스를 감싼다.
export const TEMPLATE_ASSIGN = {
  "P-001": { bgm: "b-1", blocks: [ // 무지개동산 → 클립 2개(영상+이미지)
    { id: "e-101", type: "title" },
    { id: "e-102", type: "ai" },                       // A — 추억 슬라이드 앞
    { id: "e-103", type: "slide" },
    { id: "e-104", type: "video" },
    { id: "e-105", type: "ai" },                       // B — 추억 영상 뒤
    { id: "e-106", type: "clip", assetId: "ct-1" },
    { id: "e-107", type: "clip", assetId: "ct-4" },
    { id: "e-108", type: "letter" },
  ] },
  "P-002": { bgm: "b-3", blocks: [ // 펫포레스트 → 클립 1개(영상)
    { id: "e-201", type: "title" },
    { id: "e-202", type: "ai" },                       // A
    { id: "e-203", type: "slide" },
    { id: "e-204", type: "video" },
    { id: "e-205", type: "ai" },                       // B
    { id: "e-206", type: "clip", assetId: "ct-6" },
    { id: "e-207", type: "letter" },
  ] },
  "P-003": { bgm: "b-1", blocks: [ // 하늘소풍 → 클립 미지정(허브 비어있음)
    { id: "e-301", type: "title" },
    { id: "e-302", type: "ai" },                       // A
    { id: "e-303", type: "slide" },
    { id: "e-304", type: "video" },
    { id: "e-305", type: "ai" },                       // B
    { id: "e-306", type: "clip", assetId: null },
    { id: "e-307", type: "letter" },
  ] },
};
