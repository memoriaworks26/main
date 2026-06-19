// 더미 데이터 — 영상 템플릿(요소 정의·기본 템플릿·파트너사별 배치).
// 관리자가 파트너사별로 구성: 요소 순서 변경 · BGM 선택 · 각 클립의 콘텐츠 허브 자산 선택.

// 기본 요소(각 1개만): 타이틀·추억 슬라이드·추억 영상·편지 / 추가 요소(n개): 클립
export const TEMPLATE_ELEMENTS = [
  { type: "title", label: "타이틀", source: "AI 생성 이미지 + 영정틀", dur: 6, repeatable: false },
  { type: "slide", label: "추억 슬라이드", source: "보호자 사진 자동 구성", dur: 24, repeatable: false },
  { type: "ai", label: "추억 영상", source: "Kling 이미지→영상", dur: 8, repeatable: false },
  { type: "letter", label: "편지", source: "보호자 작성 편지", dur: 18, repeatable: false },
  { type: "clip", label: "클립", source: "콘텐츠 허브 (영상/이미지)", dur: 10, repeatable: true, pickAsset: true },
];
export const elementDef = (type) => TEMPLATE_ELEMENTS.find((e) => e.type === type);

// 기본 템플릿 — 신규 파트너 생성 시 이 구성을 복제해서 시작(이후 파트너별로 수정).
// 클립은 파트너 콘텐츠 허브 자산에 연결되므로 기본 템플릿엔 두지 않음(기본 요소 4종 + BGM만).
export const DEFAULT_TEMPLATE_ID = "__default__";
export const DEFAULT_TEMPLATE = {
  bgm: "b-1",
  blocks: [
    { id: "d-title", type: "title" },
    { id: "d-slide", type: "slide" },
    { id: "d-ai", type: "ai" },
    { id: "d-letter", type: "letter" },
  ],
};

// 파트너사별 템플릿 = { bgm: BGM 곡 id, blocks: [{ id, type, assetId? }] }. blocks 순서가 곧 영상 순서.
// clip 블록만 assetId(콘텐츠 허브 자산 영상/이미지)를 가진다.
export const TEMPLATE_ASSIGN = {
  "P-001": { bgm: "b-1", blocks: [ // 무지개동산 → 클립 2개(영상+이미지)
    { id: "e-101", type: "title" },
    { id: "e-102", type: "clip", assetId: "ct-1" },
    { id: "e-103", type: "slide" },
    { id: "e-104", type: "clip", assetId: "ct-4" },
    { id: "e-105", type: "ai" },
    { id: "e-106", type: "letter" },
  ] },
  "P-002": { bgm: "b-3", blocks: [ // 펫포레스트 → 클립 1개(영상)
    { id: "e-201", type: "title" },
    { id: "e-202", type: "clip", assetId: "ct-6" },
    { id: "e-203", type: "slide" },
    { id: "e-204", type: "ai" },
    { id: "e-205", type: "letter" },
  ] },
  "P-003": { bgm: "b-1", blocks: [ // 하늘소풍 → 클립 미지정(허브 비어있음)
    { id: "e-301", type: "title" },
    { id: "e-302", type: "clip", assetId: null },
    { id: "e-303", type: "slide" },
    { id: "e-304", type: "ai" },
    { id: "e-305", type: "letter" },
  ] },
};
