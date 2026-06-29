// 더미 데이터 — 콘텐츠 허브 자산·BGM 라이브러리·AI 프롬프트.

// 콘텐츠 허브 자산 (선업로드 클립·사진) — 파트너사별 매칭
export const CONTENT = [
  { id: "ct-1", kind: "clip", partner: "무지개동산 반려동물장례식장", name: "오프닝_무지개.mp4", meta: "0:10 · 1920×1080", size: "12MB" },
  { id: "ct-2", kind: "clip", partner: "무지개동산 반려동물장례식장", name: "배경_들판.mp4", meta: "0:15 · 1920×1080", size: "18MB" },
  { id: "ct-3", kind: "clip", partner: "무지개동산 반려동물장례식장", name: "엔딩_페이드.mp4", meta: "0:08 · 1920×1080", size: "9MB" },
  { id: "ct-4", kind: "photo", partner: "무지개동산 반려동물장례식장", name: "추모액자_전통.png", meta: "투명 PNG", size: "1.2MB" },
  { id: "ct-5", kind: "photo", partner: "펫포레스트 추모관", name: "추모액자_모던.png", meta: "투명 PNG", size: "0.9MB" },
  { id: "ct-6", kind: "clip", partner: "펫포레스트 추모관", name: "오프닝_숲속.mp4", meta: "0:12 · 1920×1080", size: "14MB" },
  { id: "ct-7", kind: "photo", partner: "펫포레스트 추모관", name: "추모액자_내추럴.png", meta: "투명 PNG", size: "1.0MB" },
];

// BGM 라이브러리 — 실제 음원. 미리듣기=웹 번들(public/bgm/*.mp3, src), 최종 렌더=memoria-content 동일본(bgm 테이블 storage_path). 관리자는 곡 교체 가능.
export const BGM = [
  { id: "b-1", name: "추모 · 잔잔한 패드", meta: "1:02 · 루프", src: "/bgm/calm.mp3", current: true },
  { id: "b-2", name: "고요한 현악 패드", meta: "1:02 · 루프", src: "/bgm/strings.mp3", current: false },
  { id: "b-3", name: "따뜻한 패드", meta: "1:02 · 루프", src: "/bgm/warm.mp3", current: false },
];

// AI 프롬프트 (리스트 선택형 — 타이틀/AI영상)
export const PROMPTS = [
  { id: "pr-1", target: "타이틀", name: "은은한 보케 + 따뜻한 황금빛", body: "A peaceful memorial scene with soft bokeh, warm golden light, gentle flowers" },
  { id: "pr-2", target: "타이틀", name: "전통 한지 결 + 절제된 먹색", body: "Traditional hanji paper texture, restrained ink tone, calm and dignified" },
  { id: "pr-3", target: "AI영상", name: "벚꽃이 천천히 지는 인트로", body: "Soft fade in with cherry blossoms falling gently, slow cinematic motion" },
];
