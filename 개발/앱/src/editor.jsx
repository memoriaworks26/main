import React, { useState, useMemo, useEffect } from "react";
import {
  ChevronLeft, Undo2, Redo2, Save, Check, Upload, Image as ImageIcon,
  Music, Play, Type, Sparkles, ArrowRightLeft, Trash2, RotateCcw,
  Volume2, Clapperboard, Mail, RefreshCw, Plus, SplitSquareHorizontal,
} from "lucide-react";
import { SERIF, NAVY, MASTER, BG, SURFACE, LINE, LINE2, GOLD, GOLD_D, GOLD_SOFT, INK, MUTE, FAINT, STATUS, RADIUS } from "./theme.js";
import { Btn } from "./ui.jsx";
import { toast } from "./toast.jsx";
import { genFrame, photoThumb } from "./lib/media.js";
import * as D from "./data.js";
import { useStore, actions } from "./store.js";

const SCALE = 12; // px/초
const BLOCK_ICON = { title: Type, clip: Clapperboard, slide: ImageIcon, ai: Sparkles, letter: Mail };
const KIND_LABEL = { title: "타이틀", clip: "클립", slide: "추억 슬라이드", ai: "추억 영상", letter: "편지", audio: "음악", transition: "장면 전환" };
const BLOCK_COLOR = { title: GOLD, clip: "#3f5e87", slide: "#2f4763", ai: "#51607a", letter: "#5a6470" };

// 장면전환은 블록 경계에 매핑. 모든 블록 사이(경계)에 장면 전환. 명시되지 않은 경계는 기본값(페이드).
const BLOCK_TRANS_OVERRIDE = { "blk-2": "슬라이드", "blk-4": "슬라이드" };
const blockTrans = (id) => BLOCK_TRANS_OVERRIDE[id] || "페이드";


// 예약 → 그 파트너 템플릿(store.templates) → 편집기 블록.
// 템플릿 blocks({ type, assetId? })를 elementDef(라벨·소스·길이) + clip은 콘텐츠 허브 자산명으로 보강.
// (편집기가 EDITOR_BLOCKS 고정 더미 대신 이걸 쓰면 템플릿 수정이 제작에 즉시 반영된다)
function buildBlocks(tpl, content, reservation) {
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
function segments(blocks) {
  let acc = 0;
  const segs = blocks.map((b) => {
    const seg = { ...b, start: acc, left: acc * SCALE, w: b.dur * SCALE };
    acc += b.dur;
    return seg;
  });
  return { segs, total: acc, width: acc * SCALE };
}

// ════════════════════════════════════════════════════════════
// 블록이 곧 타임라인의 칸. 전환은 블록 경계에, 음악은 전체 1트랙.
// ════════════════════════════════════════════════════════════

// ── 왼쪽: 편집할 블록 ──────────────────────────────────────────
function BlockList({ blocks, sel, onSel }) {
  return (
    <div>
      <div className="mb-2.5 text-[13px] font-bold" style={{ color: INK }}>편집할 블록 <span className="font-normal" style={{ color: FAINT }}>· 순서 고정</span></div>
      <div className="space-y-2">
        {blocks.map((b, i) => {
          const Icon = BLOCK_ICON[b.type];
          const on = sel.scope === "block" && sel.id === b.id;
          return (
            <button key={b.id} onClick={() => onSel({ scope: "block", kind: b.type, id: b.id })}
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left outline-none transition focus-visible:ring-1"
              style={{ background: on ? GOLD_SOFT : SURFACE, border: "1.5px solid " + (on ? GOLD : LINE), borderRadius: 6 }}>
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold" style={{ background: on ? GOLD : "#e7e2d8", color: on ? "#fff" : MUTE }}>{i + 1}</span>
              <Icon className="h-4 w-4 shrink-0" style={{ color: on ? GOLD_D : MUTE }} strokeWidth={1.9} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13.5px] font-bold" style={{ color: INK }}>{b.label}</div>
                <div className="truncate text-[11.5px]" style={{ color: FAINT }}>{b.source}</div>
              </div>
              {b.status === "rendering"
                ? <span className="shrink-0 text-[11px] font-semibold" style={{ color: STATUS.rendering.c }}>제작중</span>
                : <Check className="h-4 w-4 shrink-0" style={{ color: STATUS.done.c }} strokeWidth={2.6} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── 가운데: 미리보기 ───────────────────────────────────────────
function PreviewBox({ label, badge, badgeColor, big, name, src }) {
  return (
    <div className="flex flex-col">
      <div className="mb-1.5 flex items-center gap-2">
        <span className="text-[12.5px] font-semibold" style={{ color: MUTE }}>{label}</span>
        {badge && <span className="px-2 py-[2px] text-[10.5px] font-bold" style={{ background: badgeColor.bg, color: badgeColor.c, borderRadius: 3 }}>{badge}</span>}
      </div>
      <div className="relative w-full" style={{ aspectRatio: "16/9", background: "#1c232c", borderRadius: 6, overflow: "hidden" }}>
        {src ? (
          <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span style={{ fontFamily: SERIF, fontSize: big ? 30 : 20, fontWeight: 700, color: "#f3efe6", textShadow: "0 2px 12px rgba(0,0,0,.5)" }}>{name}</span>
          </div>
        )}
        <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full" style={{ background: "rgba(255,255,255,.9)" }}><Play className="h-3.5 w-3.5" style={{ color: NAVY }} fill={NAVY} /></span>
          <div className="h-1.5 flex-1 rounded-full" style={{ background: "rgba(255,255,255,.25)" }}><div className="h-full rounded-full" style={{ width: "32%", background: "#fff" }} /></div>
          <span className="text-[11px] tabular-nums text-white">진행 중</span>
        </div>
      </div>
    </div>
  );
}

function Preview({ sel, blocks, gens, name }) {
  // 선택한 블록(없으면 첫 블록) 기준 — 원본=자동본(v0), 작업본=선택한 결과물 버전
  const block = (sel.scope === "block" ? blocks.find((b) => b.id === sel.id) : null) || blocks[0] || null;
  const gen = block ? gens[block.id] : null;
  const origSrc = blockFrame(block, gen, name, true);
  const editedSrc = blockFrame(block, gen, name, false);
  const label = block ? (KIND_LABEL[block.type] || "") : "";
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <SplitSquareHorizontal className="h-4 w-4" style={{ color: GOLD_D }} />
        <span className="text-[13px] font-bold" style={{ color: INK }}>미리보기 · 원본과 비교</span>
        {label && <span className="text-[11.5px]" style={{ color: FAINT }}>· 지금 보는 블록: <b style={{ color: MUTE }}>{label}</b></span>}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <PreviewBox label="유저가 만든 원본" badge="원본 · 수정불가" badgeColor={{ bg: "rgba(90,100,112,.15)", c: "#5a6470" }} name={name} src={origSrc} />
        <PreviewBox label="내가 편집 중" badge="작업본" badgeColor={{ bg: GOLD_SOFT, c: GOLD_D }} big name={name} src={editedSrc} />
      </div>
      <div className="mt-1.5 text-[11.5px]" style={{ color: FAINT }}>선택한 블록의 결과물을 보여줍니다. 왼쪽에서 블록을, 오른쪽 ‘결과물’에서 버전을 고르면 작업본이 바뀝니다.</div>
    </div>
  );
}

// ── 가운데: 블록 기준 타임라인 ────────────────────────────────
function RowLabel({ name, color }) {
  return (
    <div className="flex w-16 shrink-0 items-center gap-1.5">
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      <span className="text-[11.5px] font-semibold" style={{ color: MUTE }}>{name}</span>
    </div>
  );
}

function Timeline({ blocks, edits = {}, bgmName, sel, onSel }) {
  const { segs, total, width } = segments(blocks);
  const on = (scope, id) => sel.scope === scope && sel.id === id;
  const transOf = (id) => edits["trans-" + id]?.effect || blockTrans(id);
  const ticks = []; for (let s = 0; s <= total; s += 10) ticks.push(s);

  return (
    <div className="mt-5">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-[13px] font-bold" style={{ color: INK }}>타임라인 <span className="font-normal" style={{ color: FAINT }}>· 블록·음악을 눌러 편집</span></div>
      </div>
      <div className="overflow-x-auto pb-1">
        <div style={{ minWidth: width + 72 }}>
          {/* 눈금자 */}
          <div className="mb-1 flex gap-2">
            <div className="w-16 shrink-0" />
            <div className="relative flex-1" style={{ height: 14 }}>
              {ticks.map((s) => <span key={s} className="absolute text-[10px] tabular-nums" style={{ left: s * SCALE, color: FAINT }}>{s}s</span>)}
              <span className="absolute right-0 text-[10.5px] font-semibold tabular-nums" style={{ color: MUTE }}>총 {total}초</span>
            </div>
          </div>

          {/* 블록 · 영상 (블록이 곧 칸) */}
          <div className="mb-1.5 flex items-stretch gap-2">
            <RowLabel name="블록·영상" color={GOLD} />
            <div className="relative flex-1" style={{ height: 50 }}>
              {segs.map((b, i) => {
                const Icon = BLOCK_ICON[b.type];
                const sb = on("block", b.id);
                return (
                  <button key={b.id} onClick={() => onSel({ scope: "block", kind: b.type, id: b.id })}
                    className="absolute top-0 flex h-full flex-col justify-center overflow-hidden px-2 text-left outline-none"
                    style={{ left: b.left, width: b.w - 3, background: BLOCK_COLOR[b.type], borderRadius: 5, border: sb ? "2.5px solid " + GOLD : "1px solid rgba(0,0,0,.15)" }}>
                    <div className="flex items-center gap-1 text-white">
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold" style={{ background: "rgba(255,255,255,.25)" }}>{i + 1}</span>
                      <Icon className="h-3 w-3 shrink-0" />
                      <span className="truncate text-[11px] font-bold">{b.label}</span>
                    </div>
                    <span className="mt-0.5 truncate text-[10px] text-white" style={{ opacity: 0.85 }}>{b.source} · {b.dur}초</span>
                  </button>
                );
              })}
              {/* 블록 경계 장면전환 — 모든 블록 사이에 표시(마지막 블록 제외) */}
              {segs.map((b) => (b.left + b.w) < width ? (
                <button key={"tr-" + b.id} onClick={() => onSel({ scope: "trans", kind: "transition", id: b.id })}
                  className="absolute top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center outline-none"
                  style={{ left: b.left + b.w, height: 22, width: 22, background: on("trans", b.id) ? GOLD : "#fff", border: "1.5px solid " + GOLD, borderRadius: 999 }}
                  title={"장면 전환 · " + transOf(b.id)}>
                  <ArrowRightLeft className="h-3 w-3" style={{ color: on("trans", b.id) ? "#fff" : GOLD_D }} />
                </button>
              ) : null)}
            </div>
          </div>

          {/* 음악 (전체 1트랙) */}
          <div className="flex items-stretch gap-2">
            <RowLabel name="음악" color="#3a7468" />
            <div className="relative flex-1" style={{ height: 28 }}>
              <button onClick={() => onSel({ scope: "audio", kind: "audio", id: "bgm" })}
                className="absolute top-0 flex h-full items-center gap-1.5 overflow-hidden px-2.5 text-left outline-none"
                style={{ left: 0, width: width - 3, background: "#3a7468", borderRadius: 4, border: on("audio", "bgm") ? "2.5px solid " + GOLD : "1px solid rgba(0,0,0,.12)" }}>
                <Music className="h-3.5 w-3.5 shrink-0 text-white" style={{ opacity: 0.9 }} />
                <span className="truncate text-[11px] text-white">{bgmName} · 전체</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 오른쪽: 편집 패널 ──────────────────────────────────────────
function L({ children }) { return <div className="mb-1.5 text-[12.5px] font-semibold" style={{ color: INK }}>{children}</div>; }
const inputCls = "w-full px-3 text-[13.5px] outline-none";
const inputStyle = { height: 38, background: "#fff", border: "1px solid " + LINE2, borderRadius: RADIUS, color: INK };
function Field({ label, children }) { return <div className="mb-4"><L>{label}</L>{children}</div>; }

function PromptManager() {
  return (
    <div className="mt-5 border-t pt-4" style={{ borderColor: LINE }}>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[12.5px] font-bold" style={{ color: INK }}>AI 문구(프롬프트) 관리</span>
        <button onClick={() => toast("새 프롬프트를 추가합니다")} className="flex items-center gap-1 text-[12px] font-semibold" style={{ color: GOLD }}><Plus className="h-3.5 w-3.5" /> 새로 추가</button>
      </div>
      <div className="space-y-2">
        {D.PROMPTS.map((p) => (
          <div key={p.id} className="px-3 py-2.5" style={{ background: "#f6f3ec", border: "1px solid " + LINE, borderRadius: RADIUS }}>
            <div className="flex items-center gap-2">
              <span className="px-1.5 py-[1px] text-[10.5px] font-bold" style={{ background: "#e9eef5", color: "#3f5e87", borderRadius: 3 }}>{p.target}</span>
              <span className="text-[12.5px] font-semibold" style={{ color: INK }}>{p.name}</span>
              <button onClick={() => toast(p.name + " 프롬프트를 편집합니다")} className="ml-auto text-[11.5px] font-semibold" style={{ color: GOLD }}>편집</button>
            </div>
            <div className="mt-1 text-[11.5px] leading-relaxed" style={{ color: MUTE }}>{p.body}</div>
            <div className="mt-2 flex items-center gap-2 border-t pt-2" style={{ borderColor: LINE }}>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center" style={{ background: "#fff", border: "1px dashed " + LINE2, borderRadius: RADIUS }}><ImageIcon className="h-4 w-4" style={{ color: FAINT }} /></span>
              <button onClick={() => toast("사진 선택 창을 엽니다")} className="flex items-center gap-1 text-[11.5px] font-semibold" style={{ color: GOLD }}><Upload className="h-3.5 w-3.5" /> 사진 추가</button>
              <span className="text-[10.5px]" style={{ color: FAINT }}>사진 + 문구를 함께 전송</span>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11.5px] leading-relaxed" style={{ color: FAINT }}>프롬프트에 참고 사진을 함께 넣어 더 정확하게 생성합니다(사진·문구 둘 다 지원).</p>
    </div>
  );
}

// 예시 소스 — 편지(예약 이름 기반) + 추억 슬라이드에 들어간 사진 썸네일(실제 장면 SVG)
const exampleLetter = (name) => `사랑하는 ${name}에게.\n늘 곁에서 함께해줘서 고마웠어.\n무지개다리 너머에서 아프지 말고 행복하게 지내.`;
const SLIDE_PHOTOS = [0, 1, 2, 3, 4, 5].map((i) => photoThumb(i));
const genDefault = (id) => ({ list: [{ id: id + "-v0", auto: true }], sel: id + "-v0" });

// 미리보기 프레임 — 블록 종류별 결과물 이미지. useAuto면 자동본(v0), 아니면 선택한 버전.
function blockFrame(block, gen, name, useAuto) {
  if (!block) return null;
  const t = block.type;
  if (t !== "title" && t !== "slide" && t !== "ai") return t === "clip" ? photoThumb(3) : null; // 편지/음악/전환은 슬레이트(이름)
  const g = gen || genDefault(block.id);
  const idx = useAuto ? 0 : Math.max(0, g.list.findIndex((v) => v.id === g.sel));
  return genFrame(t, idx, t === "title" ? (block.text || name) : name);
}
// 예시 시드 — 타이틀·슬라이드·AI 블록에 결과물 누적 상태를 미리 채움(자동본 + 생성본 몇 개, 최근본 선택)
function seedGens(blocks) {
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

// 만든 결과물 누적 — 선택한 버전이 영상에 들어간다. "만들기"를 누를 때마다 아래에 쌓임.
function GenHistory({ kind, name, gen, onSelect }) {
  return (
    <div className="mt-3">
      <div className="mb-1.5 text-[11.5px] font-semibold" style={{ color: MUTE }}>
        만든 결과물 <span className="font-normal" style={{ color: FAINT }}>· 선택한 버전이 영상에 들어갑니다 ({gen.list.length})</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {gen.list.map((v, i) => {
          const on = v.id === gen.sel;
          return (
            <button key={v.id} onClick={() => onSelect(v.id)} className="relative overflow-hidden text-left outline-none transition focus-visible:ring-1"
              style={{ borderRadius: 6, border: "2px solid " + (on ? GOLD : LINE2) }} title={on ? "영상에 적용됨" : "이 버전을 적용"}>
              <img src={genFrame(kind, i, name)} alt="" className="block w-full" style={{ aspectRatio: "16/9", objectFit: "cover" }} />
              <div className="px-1.5 py-1 text-[10.5px] font-semibold" style={{ color: on ? GOLD_D : MUTE, background: on ? GOLD_SOFT : "#faf8f3" }}>{v.auto ? "자동본" : "버전 " + i}</div>
              {on && <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full" style={{ background: GOLD }}><Check className="h-2.5 w-2.5 text-white" strokeWidth={3} /></span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PropPanel({ blocks, edits, onEdit, reservation, bgmName, gens, onGenerate, onSelectGen, sel }) {
  let item;
  if (sel.scope === "block") item = blocks.find((b) => b.id === sel.id);
  else if (sel.scope === "audio") item = D.EDITOR_TIMELINE.audio[0];
  else if (sel.scope === "trans") item = { effect: blockTrans(sel.id) };
  const k = sel.kind;
  if (!item) return null;
  const gen = sel.scope === "block" ? (gens[item.id] || genDefault(item.id)) : null; // 타이틀·슬라이드·AI 결과물 히스토리
  const name = reservation?.deceased || D.EDITOR_RESERVATION.deceased;
  // 편집값(컨트롤드) — 전환은 "trans-"+id, 음악은 "audio" 키로 보관
  const transKey = "trans-" + sel.id;
  const effect = (edits[transKey] && edits[transKey].effect) || blockTrans(sel.id);
  const au = edits.audio || {};
  const vol = au.volume != null ? au.volume : (item.volume != null ? item.volume : 100);
  // 추억 슬라이드 — 사진 조합 + 사진 사이 전환(기본 페이드). 편집값에 보관.
  const slideTrans = item.slideTrans || SLIDE_PHOTOS.slice(1).map(() => "페이드");
  const setSlideTrans = (i, v) => { const n = slideTrans.slice(); n[i] = v; onEdit(item.id, { slideTrans: n }); };
  const Icon = BLOCK_ICON[k] || (k === "audio" ? Music : k === "transition" ? ArrowRightLeft : ImageIcon);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-4 py-4" style={{ borderBottom: "1px solid " + LINE }}>
        <Icon className="h-5 w-5" style={{ color: GOLD_D }} />
        <span className="text-[14px] font-bold" style={{ color: INK }}>{KIND_LABEL[k]} 편집</span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {/* 소스 파일 (영상/클립/슬라이드/AI/음악) */}
        {(k === "video" || k === "audio" || k === "clip" || k === "slide" || k === "ai") && (
          <Field label={k === "audio" ? "지금 음악" : "지금 들어간 파일"}>
            <div className="px-3 py-2.5 text-[12.5px]" style={{ background: "#f6f3ec", border: "1px solid " + LINE, borderRadius: RADIUS, color: INK, wordBreak: "break-all" }}>{k === "audio" ? bgmName : (item.file || item.source || "").split("/").pop()}</div>
            <button onClick={() => toast(k === "audio" ? "음악 파일 선택 창을 엽니다" : "파일 선택 창을 엽니다")} className="mt-2 flex w-full items-center justify-center gap-1.5 py-2.5 text-[13px] font-bold text-white" style={{ background: GOLD, borderRadius: RADIUS }}><Upload className="h-4 w-4" /> {k === "audio" ? "다른 음악으로 바꾸기" : "다른 파일로 바꾸기"}</button>
          </Field>
        )}

        {k === "title" && (
          <>
            <Field label="화면에 보일 글자"><input className={inputCls} style={{ ...inputStyle, fontFamily: SERIF }} value={item.text ?? name} onChange={(e) => onEdit(item.id, { text: e.target.value })} /></Field>
            <Field label="보이는 시간 (초)"><input type="number" min="1" className={inputCls} style={inputStyle} value={item.dur} onChange={(e) => onEdit(item.id, { dur: Math.max(1, +e.target.value || 0) })} /></Field>
            <Field label="AI 문구 (타이틀)"><select className={inputCls} style={inputStyle}>{D.PROMPTS.filter((p) => p.target === "타이틀").map((p) => <option key={p.id}>{p.name}</option>)}</select></Field>
            <button onClick={() => onGenerate(item.id)} className="flex w-full items-center justify-center gap-1.5 py-2.5 text-[13px] font-bold text-white" style={{ background: GOLD, borderRadius: RADIUS }}><RefreshCw className="h-4 w-4" /> AI로 만들기</button>
            <GenHistory kind="title" name={name} gen={gen} onSelect={(vid) => onSelectGen(item.id, vid)} />
            <PromptManager />
          </>
        )}

        {(k === "clip" || k === "slide") && <Field label="보이는 시간 (초)"><input type="number" min="1" className={inputCls} style={inputStyle} value={item.dur} onChange={(e) => onEdit(item.id, { dur: Math.max(1, +e.target.value || 0) })} /></Field>}
        {k === "slide" && (
          <>
            <Field label={`사진 조합 · 사이 전환 (${SLIDE_PHOTOS.length}장)`}>
              <div className="px-2.5 py-2.5" style={{ background: "#f6f3ec", border: "1px solid " + LINE, borderRadius: RADIUS }}>
                {SLIDE_PHOTOS.map((src, i) => (
                  <React.Fragment key={i}>
                    {/* 사진 */}
                    <div className="flex items-center gap-2.5">
                      <img src={src} alt="" className="shrink-0" style={{ width: 64, aspectRatio: "16/9", objectFit: "cover", borderRadius: 4, border: "1px solid " + LINE2 }} />
                      <span className="text-[12px] font-semibold" style={{ color: INK }}>사진 {i + 1}</span>
                      <span className="ml-auto text-[10.5px]" style={{ color: FAINT }}>2.5초</span>
                    </div>
                    {/* 사진 사이 전환 */}
                    {i < SLIDE_PHOTOS.length - 1 && (
                      <div className="flex items-center gap-1.5 py-1" style={{ paddingLeft: 26 }}>
                        <span className="h-3.5 w-px" style={{ background: LINE2 }} />
                        <ArrowRightLeft className="h-3 w-3 shrink-0" style={{ color: GOLD_D }} />
                        <select value={slideTrans[i]} onChange={(e) => setSlideTrans(i, e.target.value)}
                          className="text-[11.5px] outline-none" style={{ height: 26, background: "#fff", border: "1px solid " + LINE2, borderRadius: RADIUS, color: INK, padding: "0 6px" }}>
                          {D.TRANSITION_TYPES.map((t) => <option key={t}>{t}</option>)}
                        </select>
                        <span className="h-3.5 w-px" style={{ background: LINE2 }} />
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
              <button onClick={() => toast("사진 추가/순서 변경은 유저 업로드 기준으로 구성됩니다")} className="mt-2 flex w-full items-center justify-center gap-1.5 py-2 text-[12.5px] font-semibold" style={{ border: "1px dashed " + LINE2, borderRadius: RADIUS, color: GOLD_D }}><Plus className="h-3.5 w-3.5" /> 사진 추가 · 순서 변경</button>
            </Field>
            <button onClick={() => onGenerate(item.id)} className="flex w-full items-center justify-center gap-1.5 py-2.5 text-[13px] font-bold text-white" style={{ background: GOLD, borderRadius: RADIUS }}><RefreshCw className="h-4 w-4" /> 사진으로 만들기</button>
            <GenHistory kind="slide" name={name} gen={gen} onSelect={(vid) => onSelectGen(item.id, vid)} />
          </>
        )}

        {k === "ai" && (
          <>
            <Field label="보이는 시간 (초)"><input type="number" min="1" className={inputCls} style={inputStyle} value={item.dur} onChange={(e) => onEdit(item.id, { dur: Math.max(1, +e.target.value || 0) })} /></Field>
            <Field label="AI 문구 (영상)"><select className={inputCls} style={inputStyle}>{D.PROMPTS.filter((p) => p.target === "AI영상").map((p) => <option key={p.id}>{p.name}</option>)}</select></Field>
            <button onClick={() => onGenerate(item.id)} className="flex w-full items-center justify-center gap-1.5 py-2.5 text-[13px] font-bold text-white" style={{ background: GOLD, borderRadius: RADIUS }}><RefreshCw className="h-4 w-4" /> AI로 만들기</button>
            <GenHistory kind="ai" name={name} gen={gen} onSelect={(vid) => onSelectGen(item.id, vid)} />
            <PromptManager />
          </>
        )}

        {k === "letter" && (
          <Field label="편지 내용"><textarea rows={7} value={item.text ?? exampleLetter(name)} onChange={(e) => onEdit(item.id, { text: e.target.value })} className="w-full resize-none p-3 text-[13.5px] leading-relaxed outline-none" style={{ ...inputStyle, height: "auto", fontFamily: SERIF }} /></Field>
        )}

        {k === "transition" && (
          <>
            <Field label="장면이 바뀌는 효과">
              <div className="grid grid-cols-2 gap-2">
                {D.TRANSITION_TYPES.map((t) => (
                  <button key={t} onClick={() => onEdit(transKey, { effect: t })} className="flex h-16 flex-col items-center justify-center gap-1 text-[13px] font-bold" style={{ background: effect === t ? GOLD_SOFT : "#fff", border: "1.5px solid " + (effect === t ? GOLD : LINE2), borderRadius: 6, color: effect === t ? GOLD_D : MUTE }}>
                    <ArrowRightLeft className="h-4 w-4" /> {t}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="효과 길이"><select className={inputCls} style={inputStyle} value={(edits[transKey] && edits[transKey].len) || "0.5초 (기본)"} onChange={(e) => onEdit(transKey, { len: e.target.value })}><option>0.3초</option><option>0.5초 (기본)</option><option>1.0초</option></select></Field>
            <button onClick={() => { onEdit(transKey, { effect: "없음" }); toast("장면 전환 효과를 뺐습니다"); }} className="flex w-full items-center justify-center gap-1.5 py-2.5 text-[13px] font-semibold" style={{ border: "1px solid " + LINE2, borderRadius: RADIUS, color: MUTE }}><Trash2 className="h-4 w-4" /> 효과 빼기</button>
          </>
        )}

        {k === "audio" && (
          <>
            <Field label={`소리 크기 (${vol}%)`}><input type="range" min="0" max="100" value={vol} onChange={(e) => onEdit("audio", { volume: +e.target.value })} className="w-full" style={{ accentColor: GOLD }} /></Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="서서히 커지기 (초)"><input type="number" min="0" step="0.5" className={inputCls} style={inputStyle} value={au.fadeIn != null ? au.fadeIn : item.fadeIn} onChange={(e) => onEdit("audio", { fadeIn: +e.target.value })} /></Field>
              <Field label="서서히 작아지기 (초)"><input type="number" min="0" step="0.5" className={inputCls} style={inputStyle} value={au.fadeOut != null ? au.fadeOut : item.fadeOut} onChange={(e) => onEdit("audio", { fadeOut: +e.target.value })} /></Field>
            </div>
            <p className="text-[11.5px]" style={{ color: FAINT }}>배경 음악은 영상 전체에 1트랙으로 깔립니다.</p>
          </>
        )}
      </div>
    </div>
  );
}

// ── 메인 ───────────────────────────────────────────────────────
export default function VideoEditor({ reservation, onClose }) {
  const store = useStore(); // 템플릿·콘텐츠·파트너 구독 → 템플릿 변경이 제작에 즉시 반영
  // 열린 예약의 파트너 → 그 파트너 템플릿(없으면 기본 템플릿) → 편집기 블록·BGM
  const { blocks, bgmName } = useMemo(() => {
    const partner = store.partners.find((p) => p.name === reservation?.partner);
    const tpl = (partner && store.templates[partner.id]) || store.templates[D.DEFAULT_TEMPLATE_ID] || { bgm: null, blocks: [] };
    return {
      blocks: buildBlocks(tpl, store.content, reservation),
      bgmName: (D.BGM.find((b) => b.id === tpl.bgm) || {}).name || "배경 음악",
    };
  }, [store.partners, store.templates, store.content, reservation]);

  const firstBlockSel = () => ({ scope: "block", kind: blocks[0]?.type || "title", id: blocks[0]?.id });
  const [sel, setSel] = useState(firstBlockSel);

  // 편집 문서(편집값 edits + 결과물 gens) + 되돌리기/다시 히스토리(past/present/future)
  const initialDoc = useMemo(() => ({ edits: {}, gens: seedGens(blocks) }), [blocks]);
  const [hist, setHist] = useState(() => ({ past: [], present: initialDoc, future: [] }));
  const [savedDoc, setSavedDoc] = useState(initialDoc);
  const doc = hist.present;
  const { edits, gens } = doc;
  const dirty = doc !== savedDoc;
  const commit = (next) => setHist((h) => ({ past: [...h.past, h.present], present: next, future: [] }));
  const undo = () => setHist((h) => (h.past.length ? { past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future] } : h));
  const redo = () => setHist((h) => (h.future.length ? { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1) } : h));

  const setEdit = (id, patch) => commit({ ...doc, edits: { ...doc.edits, [id]: { ...doc.edits[id], ...patch } } });
  // 템플릿 블록에 편집값 병합 → 타임라인·미리보기·속성패널이 같은 편집본을 본다
  const editedBlocks = useMemo(() => blocks.map((b) => ({ ...b, ...(edits[b.id] || {}) })), [blocks, edits]);
  const name = (reservation && (reservation.deceased || reservation.name)) || D.EDITOR_RESERVATION.deceased;

  // "만들기" → 새 결과물 추가(최신 선택) · 썸네일은 버튼 하단 히스토리에 누적
  const generate = (blockId) => {
    const cur = gens[blockId] || genDefault(blockId);
    const v = { id: blockId + "-v" + Date.now() };
    commit({ ...doc, gens: { ...gens, [blockId]: { list: [...cur.list, v], sel: v.id } } });
    toast("새 결과물을 만들었습니다");
  };
  const selectGen = (blockId, vid) => commit({ ...doc, gens: { ...gens, [blockId]: { ...(gens[blockId] || genDefault(blockId)), sel: vid } } });
  // 자동본으로 — 편집값 비우고 모든 결과물 선택을 자동본(v0)으로
  const resetAuto = () => {
    const g0 = {};
    Object.keys(gens).forEach((id) => { g0[id] = { ...gens[id], sel: gens[id].list[0]?.id }; });
    commit({ edits: {}, gens: g0 });
    toast("자동 생성본으로 되돌렸습니다");
  };
  const save = () => { setSavedDoc(doc); toast("저장되었습니다"); };

  // 템플릿 변경 등으로 선택한 블록이 사라지면 첫 블록으로 복귀
  useEffect(() => {
    if (sel.scope === "block" && !blocks.find((b) => b.id === sel.id)) setSel(firstBlockSel());
  }, [blocks]); // eslint-disable-line react-hooks/exhaustive-deps

  // 토스트는 전역 toast()(App 루트의 <ToastHost/>)로 통일 — editor 자체 토스트 미보유.
  const publish = () => {
    if (reservation && reservation.id) actions.setReservationStatus(reservation.id, "published"); // 목 DB 전파 → 큐·파트너·대시보드
    toast("확정·발행되었습니다");
    setTimeout(() => onClose && onClose(), 1000);
  };

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 44px)", background: BG }}>
      <div className="flex items-center justify-between px-4" style={{ background: MASTER, height: 52 }}>
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="flex items-center gap-1 text-[13px] font-semibold" style={{ color: "#aab2bf" }}><ChevronLeft className="h-4 w-4" /> 닫기</button>
          <span className="h-4 w-px" style={{ background: "#2c3744" }} />
          <span className="text-[14px] font-bold" style={{ color: "#eef0f3", fontFamily: SERIF }}>{name}</span>
          <span className="text-[12px]" style={{ color: "#5a6472" }}>추모영상 편집</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={undo} disabled={!hist.past.length} className="flex items-center gap-1 px-2 py-1.5 text-[12px] disabled:opacity-35" style={{ color: "#aab2bf" }}><Undo2 className="h-3.5 w-3.5" /> 되돌리기</button>
          <button onClick={redo} disabled={!hist.future.length} className="flex items-center gap-1 px-2 py-1.5 text-[12px] disabled:opacity-35" style={{ color: "#aab2bf" }}><Redo2 className="h-3.5 w-3.5" /> 다시</button>
          <span className="h-4 w-px" style={{ background: "#2c3744" }} />
          <button onClick={resetAuto} className="flex items-center gap-1 px-2.5 py-1.5 text-[12px] font-semibold" style={{ color: "#aab2bf" }}><RotateCcw className="h-3.5 w-3.5" /> 자동본으로</button>
          <Btn size="sm" variant="neutral" onClick={save}>
            <Save className="h-3.5 w-3.5" /> 저장{dirty && <span className="ml-0.5" style={{ color: GOLD }}>•</span>}
          </Btn>
          <Btn size="sm" onClick={publish}><Check className="h-4 w-4" strokeWidth={2.4} /> 확정·발행</Btn>
        </div>
      </div>

      <div className="flex items-center gap-2 px-5 py-1.5 text-[12px]" style={{ background: "#faf7f1", borderBottom: "1px solid " + LINE, color: MUTE }}>
        <span className="flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: GOLD }}>?</span>
        왼쪽에서 <b style={{ color: INK }}>블록</b>을 고르거나 아래 <b style={{ color: INK }}>타임라인</b>에서 블록·음악을 눌러 편집하세요.
      </div>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-64 shrink-0 overflow-y-auto px-3.5 py-4" style={{ background: SURFACE, borderRight: "1px solid " + LINE }}>
          <BlockList blocks={editedBlocks} sel={sel} onSel={setSel} />
        </aside>
        <div className="flex flex-1 flex-col overflow-y-auto px-6 py-5">
          <Preview sel={sel} blocks={editedBlocks} gens={gens} name={name} />
          <Timeline blocks={editedBlocks} edits={edits} bgmName={bgmName} sel={sel} onSel={setSel} />
        </div>
        <aside className="w-80 shrink-0 overflow-y-auto" style={{ background: SURFACE, borderLeft: "1px solid " + LINE }}>
          <PropPanel key={sel.scope + sel.id} blocks={editedBlocks} edits={edits} onEdit={setEdit} reservation={reservation} bgmName={bgmName} gens={gens} onGenerate={generate} onSelectGen={selectGen} sel={sel} />
        </aside>
      </div>

      <div className="flex items-center gap-3 px-5 py-2 text-[11.5px]" style={{ background: SURFACE, borderTop: "1px solid " + LINE, color: FAINT }}>
        <Volume2 className="h-3.5 w-3.5" /> 배경 음악: {bgmName}
        <span className="ml-auto">확정하면 전체가 하나로 합쳐져 발행됩니다.</span>
      </div>
    </div>
  );
}
