// 편집기 — 블록 상수·순수 로직(컴포넌트 없음).
// 템플릿→블록 변환, 타임라인 세그먼트 계산, 결과물(gen) 시드/프레임. 화면 3패널(timeline·preview·props)이 공유.
import { Type, Clapperboard, Image as ImageIcon, Sparkles, Mail, Film } from "lucide-react";
import { GOLD } from "../theme.js";
import { genFrame, photoThumb } from "../lib/media.js";
import * as D from "../data.js";

export const SCALE = 4; // px/초 (블록 길이가 실제 길이(분 단위)라 축척을 낮춰 타임라인이 과하게 길어지지 않게)
export const BLOCK_ICON = { title: Type, clip: Clapperboard, slide: ImageIcon, video: Film, ai: Sparkles, letter: Mail };
export const KIND_LABEL = { title: "타이틀", clip: "클립", slide: "추억 슬라이드", video: "추억 영상", ai: "AI 영상", letter: "편지", audio: "음악", transition: "장면 전환", subtitle: "자막" };
export const BLOCK_COLOR = { title: GOLD, clip: "#3f5e87", slide: "#2f4763", video: "#3a5a52", ai: "#51607a", letter: "#5a6470" };
// 타이틀 시스템 문구(반려동물명 앞에 붙는 기본 문구) — 사업부별 USER_TEXT(titleSystemText)로 오버라이드 가능.
export const TITLE_SYSTEM_TEXT = "사랑하는";

// 장면전환은 블록 경계에 매핑. 모든 블록 사이(경계)에 장면 전환. 명시되지 않은 경계는 기본값(페이드).
const BLOCK_TRANS_OVERRIDE = { "blk-2": "슬라이드", "blk-4": "슬라이드" };
export const blockTrans = (id) => BLOCK_TRANS_OVERRIDE[id] || "페이드";

// 예약 → 그 파트너 템플릿(store.templates) → 편집기 블록.
// 템플릿 blocks({ type, assetId? })를 elementDef(라벨·소스·길이) + clip은 콘텐츠 허브 자산명으로 보강.
// (편집기가 EDITOR_BLOCKS 고정 더미 대신 이걸 쓰면 템플릿 수정이 제작에 즉시 반영된다)
export function buildBlocks(tpl, content, reservation) {
  // AI 영상이 2개 이상이면 A·B…로 구분 라벨(독사진 1장당 1영상 → 보통 A·B 2개).
  const aiTotal = (tpl?.blocks || []).filter((b) => b.type === "ai").length;
  let aiN = 0;
  return (tpl?.blocks || []).map((b) => {
    const def = D.elementDef(b.type) || {};
    if (b.type === "clip") {
      const asset = content.find((a) => a.id === b.assetId);
      return {
        id: b.id, type: "clip", label: def.label || "클립",
        source: asset ? asset.name : "자산 미지정",
        detail: "콘텐츠 허브 · " + (asset && asset.kind === "photo" ? "이미지" : "영상"),
        dur: def.dur || 10, status: asset ? "done" : "standby",
      };
    }
    let label = def.label;
    if (b.type === "ai") { aiN += 1; label = aiTotal > 1 ? `AI 영상 ${String.fromCharCode(64 + aiN)}` : "AI 영상"; }
    return {
      id: b.id, type: b.type, label, source: def.source, detail: def.source,
      dur: def.dur || 0, status: "done",
      ...(b.type === "ai" ? { aiIndex: aiN } : {}),                 // 1=A, 2=B … (렌더에서 ai_video 사진 매핑)
      ...(b.type === "title" ? { text: reservation?.deceased, prefix: TITLE_SYSTEM_TEXT } : {}),
      // 추억 슬라이드 = 사진만 / 추억 영상 = 보호자 영상(슬라이드 뒤, 각 영상=개별 클립) · 원본 사운드 · 최종 렌더 시 합성
      ...(b.type === "slide" ? { detail: "보호자 사진 (최대 20장)" } : {}),
      ...(b.type === "video" ? { detail: "보호자 영상 · 슬라이드 뒤 개별 클립 · 원본 사운드" } : {}),
    };
  });
}

// 블록 → 타임라인 세그먼트 (단일 시간축)
export function segments(blocks) {
  let acc = 0;
  const segs = blocks.map((b) => {
    const seg = { ...b, start: acc, left: acc * SCALE, w: b.dur * SCALE };
    acc += b.dur;
    return seg;
  });
  return { segs, total: acc, width: acc * SCALE };
}

// 예시 소스 — 편지(예약 이름 기반) + 추억 슬라이드에 들어간 사진 썸네일(실제 장면 SVG)
export const exampleLetter = (name) => `사랑하는 ${name}에게.\n늘 곁에서 함께해줘서 고마웠어.\n무지개다리 너머에서 아프지 말고 행복하게 지내.`;
// 추억 슬라이드 — 최대 20장(장당 7~10초, 총 2분30초 이내). 목업은 20장 채워서 보여줌.
export const SLIDE_PHOTOS = Array.from({ length: 20 }, (_, i) => photoThumb(i));
export const SLIDE_MAX = 20;
export const SLIDE_PER = 7.5; // 장당 평균 노출(초) — 20장 × 7.5초 = 150초(2분30초)
export const genDefault = (id) => ({ list: [{ id: id + "-v0", auto: true }], sel: id + "-v0" });

// 미리보기 프레임 — 블록 종류별 결과물 이미지. useAuto면 자동본(v0), 아니면 선택한 버전.
export function blockFrame(block, gen, name, useAuto) {
  if (!block) return null;
  const t = block.type;
  // 클립·추억 영상(유저 영상)은 결과물 버전이 없는 소스 — 대표 썸네일로 대체. 편지/음악/전환은 슬레이트(이름).
  if (t !== "title" && t !== "slide" && t !== "ai") return (t === "clip" || t === "video") ? photoThumb(3) : null;
  const g = gen || genDefault(block.id);
  const idx = useAuto ? 0 : Math.max(0, g.list.findIndex((v) => v.id === g.sel));
  return genFrame(t, idx, t === "title" ? (block.text || name) : name);
}
// 예시 시드 — 타이틀·슬라이드·AI 블록에 결과물 누적 상태를 미리 채움(자동본 + 생성본 몇 개, 최근본 선택)
export function seedGens(blocks) {
  const counts = { title: 3, slide: 4, ai: 2 };
  const out = {};
  blocks.forEach((b) => {
    const n = counts[b.type];
    if (!n) return;
    const list = Array.from({ length: n }, (_, i) => ({ id: b.id + "-v" + i, auto: i === 0 }));
    out[b.id] = { list, sel: list[list.length - 1].id };
  });
  return out;
}
