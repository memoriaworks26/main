// 편집기 — 블록 상수·순수 로직(컴포넌트 없음).
// 템플릿→블록 변환, 타임라인 세그먼트 계산, 결과물(gen) 시드/프레임. 화면 3패널(timeline·preview·props)이 공유.
import { Type, Clapperboard, Image as ImageIcon, Sparkles, Mail } from "lucide-react";
import { GOLD } from "../theme.js";
import { genFrame, photoThumb } from "../lib/media.js";
import * as D from "../data.js";

export const SCALE = 12; // px/초
export const BLOCK_ICON = { title: Type, clip: Clapperboard, slide: ImageIcon, ai: Sparkles, letter: Mail };
export const KIND_LABEL = { title: "타이틀", clip: "클립", slide: "추억 슬라이드", ai: "추억 영상", letter: "편지", audio: "음악", transition: "장면 전환", subtitle: "자막" };
export const BLOCK_COLOR = { title: GOLD, clip: "#3f5e87", slide: "#2f4763", ai: "#51607a", letter: "#5a6470" };

// 장면전환은 블록 경계에 매핑. 모든 블록 사이(경계)에 장면 전환. 명시되지 않은 경계는 기본값(페이드).
const BLOCK_TRANS_OVERRIDE = { "blk-2": "슬라이드", "blk-4": "슬라이드" };
export const blockTrans = (id) => BLOCK_TRANS_OVERRIDE[id] || "페이드";

// 예약 → 그 파트너 템플릿(store.templates) → 편집기 블록.
// 템플릿 blocks({ type, assetId? })를 elementDef(라벨·소스·길이) + clip은 콘텐츠 허브 자산명으로 보강.
// (편집기가 EDITOR_BLOCKS 고정 더미 대신 이걸 쓰면 템플릿 수정이 제작에 즉시 반영된다)
export function buildBlocks(tpl, content, reservation) {
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
    return {
      id: b.id, type: b.type, label: def.label, source: def.source, detail: def.source,
      dur: def.dur || 0, status: "done",
      ...(b.type === "title" ? { text: reservation?.deceased } : {}),
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
export const SLIDE_PHOTOS = [0, 1, 2, 3, 4, 5].map((i) => photoThumb(i));
export const genDefault = (id) => ({ list: [{ id: id + "-v0", auto: true }], sel: id + "-v0" });

// 미리보기 프레임 — 블록 종류별 결과물 이미지. useAuto면 자동본(v0), 아니면 선택한 버전.
export function blockFrame(block, gen, name, useAuto) {
  if (!block) return null;
  const t = block.type;
  if (t !== "title" && t !== "slide" && t !== "ai") return t === "clip" ? photoThumb(3) : null; // 편지/음악/전환은 슬레이트(이름)
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
