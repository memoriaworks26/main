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
        assetId: b.assetId || null,                 // 렌더 플랜이 콘텐츠 허브 자산을 참조할 수 있게(워커가 id로 조회)
        clipKind: asset ? asset.kind : null,        // photo=이미지 / clip=영상
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

// 편집기 편집본 → 워커 compose용 정규화 렌더 플랜.
//   orderedVisible = 순서·숨김 반영된(보이는) 블록들. edits = 편집값(전환·편지·소리), subs = 자막 트랙.
//   결과 { plan:[{kind,i?,fade?}], letter, memVol, subs } 를 submissions.edit_doc.render 에 저장 → 워커가 그대로 합성.
//   타입 기준이라 워커가 블록 id를 몰라도 됨. clip 등 워커 미지원 타입은 플랜에서 제외.
export function buildRenderPlan({ orderedVisible, edits = {}, subs = [] }) {
  const trans = (id) => (edits["trans-" + id] && edits["trans-" + id].effect) || blockTrans(id);
  const plan = [];
  orderedVisible.forEach((b, idx) => {
    const fade = idx > 0 && trans(b.id) !== "없음"; // 첫 블록·「없음」 전환은 페이드 없음
    if (b.type === "title") plan.push({ kind: "title" });            // 타이틀은 자체 인트로 페이드
    else if (b.type === "ai") plan.push({ kind: "ai", i: (b.aiIndex || 1) - 1, fade });
    else if (b.type === "slide") plan.push({ kind: "slide", fade });
    else if (b.type === "video") plan.push({ kind: "video", fade, vols: edits[b.id]?.vols || null }); // 영상별 음량(없으면 memVol 폴백)
    else if (b.type === "letter") plan.push({ kind: "letter", fade });
    else if (b.type === "clip" && b.assetId) plan.push({ kind: "clip", assetId: b.assetId, fade, vol: edits[b.id]?.volume }); // 콘텐츠 허브 클립(영상이면 음량 적용; 자산 미지정은 건너뜀)
  });
  // 편지 오버라이드(관리자 편집본) — 편지 블록에 편집값이 있을 때만.
  const letterBlk = orderedVisible.find((b) => b.type === "letter");
  const le = letterBlk ? edits[letterBlk.id] : null;
  const letter = le && (le.text != null || le.metDate != null || le.partDate != null)
    ? { text: le.text ?? null, metDate: le.metDate ?? null, partDate: le.partDate ?? null } : null;
  // 추억 영상 음량 — 영상별 vols(plan.video.vols)가 우선. memVol은 구버전 단일 volume 호환용 전역 폴백.
  const videoBlk = orderedVisible.find((b) => b.type === "video");
  const memVol = videoBlk && edits[videoBlk.id] && edits[videoBlk.id].volume != null ? edits[videoBlk.id].volume : null;
  // 자막 — 빈 텍스트 제외, 워커가 쓰는 필드만.
  const subsOut = (subs || []).filter((s) => (s.text || "").trim()).map((s) => ({
    text: s.text, start: s.start ?? 0, end: s.end ?? 3, pos: s.pos || "하단",
    size: s.size ?? 48, color: s.color || "#f3e9c8",
    font: s.font || "myeongjo", effect: s.effect || "박스",
    xPct: s.xPct ?? null, yPct: s.yPct ?? null,
  }));
  return { plan, letter, memVol, subs: subsOut };
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
