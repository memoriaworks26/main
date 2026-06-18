import React, { useState } from "react";
import {
  ChevronLeft, Undo2, Redo2, Save, Film, Check, Upload, Image as ImageIcon,
  Music, Play, Type, Sparkles, ArrowRightLeft, Captions, Trash2, RotateCcw,
  Volume2, Clapperboard, Mail, RefreshCw, Plus, SplitSquareHorizontal,
} from "lucide-react";
import { SERIF, NAVY, MASTER, BG, SURFACE, LINE, LINE2, GOLD, GOLD_D, GOLD_SOFT, INK, MUTE, FAINT, STATUS, RADIUS } from "./theme.js";
import { Btn } from "./ui.jsx";
import * as D from "./data.js";
import { actions } from "./store.js";

const SCALE = 12; // px/초
const BLOCK_ICON = { title: Type, clip: Clapperboard, slide: ImageIcon, ai: Sparkles, letter: Mail };
const KIND_LABEL = { title: "타이틀", clip: "클립", slide: "추억 슬라이드", ai: "추억 영상", letter: "편지", subtitle: "자막", audio: "음악", transition: "장면 전환" };
const BLOCK_COLOR = { title: GOLD, clip: "#3f5e87", slide: "#2f4763", ai: "#51607a", letter: "#5a6470" };

// 장면전환은 블록 경계에 매핑. 자막은 시간축 자유배치 — VideoEditor state가 소유(추가·이동·길이조절).
const BLOCK_TRANS = { "blk-1": "페이드", "blk-2": "슬라이드", "blk-3": "페이드" };

// 자막 드래그 스냅(초) + 초기 자막 시드(data.js 자막을 start/dur로 변환)
const SUB_SNAP = 0.5;
const snap = (v) => Math.round(v / SUB_SNAP) * SUB_SNAP;
function seedSubs() {
  return (D.EDITOR_TIMELINE.subtitles || []).map((s, i) => ({
    id: s.id || "sub" + (i + 1),
    text: s.text,
    start: s.start ?? 0,
    dur: Math.max(1, (s.end ?? (s.start ?? 0) + 3) - (s.start ?? 0)),
    pos: s.pos || "하단",
    size: s.size || 48,
    color: s.color || "#f3e9c8",
  }));
}

// 블록 → 타임라인 세그먼트 (단일 시간축)
function segments() {
  let acc = 0;
  const segs = D.EDITOR_BLOCKS.map((b) => {
    const seg = { ...b, start: acc, left: acc * SCALE, w: b.dur * SCALE };
    acc += b.dur;
    return seg;
  });
  return { segs, total: acc, width: acc * SCALE };
}

// ════════════════════════════════════════════════════════════
// 블록이 곧 타임라인의 칸. 자막·전환은 블록 안/경계에, 음악은 전체 1트랙.
// ════════════════════════════════════════════════════════════

// ── 왼쪽: 편집할 블록 ──────────────────────────────────────────
function BlockList({ sel, onSel }) {
  return (
    <div>
      <div className="mb-2.5 text-[13px] font-bold" style={{ color: INK }}>편집할 블록 <span className="font-normal" style={{ color: FAINT }}>· 순서 고정</span></div>
      <div className="space-y-2">
        {D.EDITOR_BLOCKS.map((b, i) => {
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
function PreviewBox({ label, badge, badgeColor, big }) {
  const name = D.EDITOR_RESERVATION.deceased;
  return (
    <div className="flex flex-col">
      <div className="mb-1.5 flex items-center gap-2">
        <span className="text-[12.5px] font-semibold" style={{ color: MUTE }}>{label}</span>
        {badge && <span className="px-2 py-[2px] text-[10.5px] font-bold" style={{ background: badgeColor.bg, color: badgeColor.c, borderRadius: 3 }}>{badge}</span>}
      </div>
      <div className="relative w-full" style={{ aspectRatio: "16/9", background: "#1c232c", borderRadius: 6, overflow: "hidden" }}>
        <div className="absolute inset-0 flex items-center justify-center">
          <span style={{ fontFamily: SERIF, fontSize: big ? 30 : 20, fontWeight: 700, color: "#f3efe6", textShadow: "0 2px 12px rgba(0,0,0,.5)" }}>{name}</span>
        </div>
        <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full" style={{ background: "rgba(255,255,255,.9)" }}><Play className="h-3.5 w-3.5" style={{ color: NAVY }} fill={NAVY} /></span>
          <div className="h-1.5 flex-1 rounded-full" style={{ background: "rgba(255,255,255,.25)" }}><div className="h-full rounded-full" style={{ width: "32%", background: "#fff" }} /></div>
          <span className="text-[11px] tabular-nums text-white">진행 중</span>
        </div>
      </div>
    </div>
  );
}

function Preview() {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <SplitSquareHorizontal className="h-4 w-4" style={{ color: GOLD_D }} />
        <span className="text-[13px] font-bold" style={{ color: INK }}>미리보기 · 원본과 비교</span>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <PreviewBox label="유저가 만든 원본" badge="원본 · 수정불가" badgeColor={{ bg: "rgba(90,100,112,.15)", c: "#5a6470" }} />
        <PreviewBox label="내가 편집 중" badge="작업본" badgeColor={{ bg: GOLD_SOFT, c: GOLD_D }} big />
      </div>
      <div className="mt-1.5 text-[11.5px]" style={{ color: FAINT }}>서버에서 렌더한 영상을 그대로 재생합니다. 수정하면 그 부분만 다시 만들어 보여줍니다.</div>
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

function Timeline({ sel, onSel, subs, setSubs, onAddSub }) {
  const { segs, total, width } = segments();
  const on = (scope, id) => sel.scope === scope && sel.id === id;
  const ticks = []; for (let s = 0; s <= total; s += 10) ticks.push(s);

  // 자막 드래그: move(이동) / left·right(양끝 길이조절). 안 움직였으면 클릭=선택.
  function startDrag(e, mode, sub) {
    e.preventDefault(); e.stopPropagation();
    const startX = e.clientX;
    const orig = { start: sub.start, dur: sub.dur };
    const MIN = 1;
    let moved = false;
    const onMove = (ev) => {
      if (Math.abs(ev.clientX - startX) > 3) moved = true;
      const d = (ev.clientX - startX) / SCALE;
      setSubs((prev) => prev.map((s) => {
        if (s.id !== sub.id) return s;
        if (mode === "move") return { ...s, start: snap(Math.max(0, Math.min(orig.start + d, total - s.dur))) };
        if (mode === "left") {
          const ns = snap(Math.max(0, Math.min(orig.start + d, orig.start + orig.dur - MIN)));
          return { ...s, start: ns, dur: snap(orig.start + orig.dur - ns) };
        }
        return { ...s, dur: snap(Math.max(MIN, Math.min(orig.dur + d, total - orig.start))) };
      }));
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      if (!moved) onSel({ scope: "cap", kind: "subtitle", id: sub.id });
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  return (
    <div className="mt-5">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-[13px] font-bold" style={{ color: INK }}>타임라인 <span className="font-normal" style={{ color: FAINT }}>· 자막은 끌어서 이동, 양끝을 끌어 길이 조절</span></div>
        <button onClick={onAddSub} className="flex items-center gap-1 px-2.5 py-1.5 text-[12px] font-semibold" style={{ borderRadius: RADIUS, color: GOLD_D, border: "1px solid " + LINE2, background: "#fff" }}><Plus className="h-3.5 w-3.5" /> 자막 추가</button>
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
              {/* 블록 경계 장면전환 */}
              {segs.map((b) => BLOCK_TRANS[b.id] && (b.left + b.w) < width ? (
                <button key={"tr-" + b.id} onClick={() => onSel({ scope: "trans", kind: "transition", id: b.id })}
                  className="absolute top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center outline-none"
                  style={{ left: b.left + b.w, height: 22, width: 22, background: on("trans", b.id) ? GOLD : "#fff", border: "1.5px solid " + GOLD, borderRadius: 999 }}
                  title={"장면 전환 · " + BLOCK_TRANS[b.id]}>
                  <ArrowRightLeft className="h-3 w-3" style={{ color: on("trans", b.id) ? "#fff" : GOLD_D }} />
                </button>
              ) : null)}
            </div>
          </div>

          {/* 자막 (시간축 자유 배치 · 끌어서 이동, 양끝으로 길이조절) */}
          <div className="mb-1.5 flex items-stretch gap-2">
            <RowLabel name="자막" color="#5a6470" />
            <div className="relative flex-1" style={{ height: 30 }}>
              {subs.length === 0 && <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[11px]" style={{ color: FAINT }}>자막 없음 — 오른쪽 위 ‘자막 추가’</span>}
              {subs.map((s) => {
                const sc = on("cap", s.id);
                return (
                  <div key={s.id} onPointerDown={(e) => startDrag(e, "move", s)}
                    className="absolute top-0 flex h-full items-center overflow-hidden text-left"
                    style={{ left: s.start * SCALE, width: Math.max(s.dur * SCALE, 18), background: "#5a6470", borderRadius: 4, border: sc ? "2.5px solid " + GOLD : "1px solid rgba(0,0,0,.12)", cursor: "grab", touchAction: "none" }}
                    title={"끌어서 이동 · 양끝을 끌어 길이 조절 (" + s.start + "s · " + s.dur + "s)"}>
                    <span onPointerDown={(e) => startDrag(e, "left", s)} className="absolute left-0 top-0 z-10 h-full" style={{ width: 6, cursor: "ew-resize", background: "rgba(255,255,255,.32)" }} />
                    <Captions className="pointer-events-none ml-2 h-3.5 w-3.5 shrink-0 text-white" style={{ opacity: 0.9 }} />
                    <span className="pointer-events-none truncate px-1 text-[11px] text-white">{s.text}</span>
                    <span onPointerDown={(e) => startDrag(e, "right", s)} className="absolute right-0 top-0 z-10 h-full" style={{ width: 6, cursor: "ew-resize", background: "rgba(255,255,255,.32)" }} />
                  </div>
                );
              })}
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
                <span className="truncate text-[11px] text-white">{(D.EDITOR_TIMELINE.audio[0] || {}).file?.split("/").pop() || "배경 음악"} · 전체</span>
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
        <button className="flex items-center gap-1 text-[12px] font-semibold" style={{ color: GOLD }}><Plus className="h-3.5 w-3.5" /> 새로 추가</button>
      </div>
      <div className="space-y-2">
        {D.PROMPTS.map((p) => (
          <div key={p.id} className="px-3 py-2.5" style={{ background: "#f6f3ec", border: "1px solid " + LINE, borderRadius: RADIUS }}>
            <div className="flex items-center gap-2">
              <span className="px-1.5 py-[1px] text-[10.5px] font-bold" style={{ background: "#e9eef5", color: "#3f5e87", borderRadius: 3 }}>{p.target}</span>
              <span className="text-[12.5px] font-semibold" style={{ color: INK }}>{p.name}</span>
              <button className="ml-auto text-[11.5px] font-semibold" style={{ color: GOLD }}>편집</button>
            </div>
            <div className="mt-1 text-[11.5px] leading-relaxed" style={{ color: MUTE }}>{p.body}</div>
            <div className="mt-2 flex items-center gap-2 border-t pt-2" style={{ borderColor: LINE }}>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center" style={{ background: "#fff", border: "1px dashed " + LINE2, borderRadius: RADIUS }}><ImageIcon className="h-4 w-4" style={{ color: FAINT }} /></span>
              <button className="flex items-center gap-1 text-[11.5px] font-semibold" style={{ color: GOLD }}><Upload className="h-3.5 w-3.5" /> 사진 추가</button>
              <span className="text-[10.5px]" style={{ color: FAINT }}>사진 + 문구를 함께 전송</span>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11.5px] leading-relaxed" style={{ color: FAINT }}>프롬프트에 참고 사진을 함께 넣어 더 정확하게 생성합니다(사진·문구 둘 다 지원).</p>
    </div>
  );
}

function PropPanel({ sel, subs, updateSub, deleteSub }) {
  let item;
  if (sel.scope === "block") item = D.EDITOR_BLOCKS.find((b) => b.id === sel.id);
  else if (sel.scope === "cap") item = subs.find((s) => s.id === sel.id);
  else if (sel.scope === "audio") item = D.EDITOR_TIMELINE.audio[0];
  else if (sel.scope === "trans") item = { effect: BLOCK_TRANS[sel.id] };
  const k = sel.kind;
  const [effect, setEffect] = useState(item && item.effect ? item.effect : "페이드");
  const [pos, setPos] = useState(item && item.pos ? item.pos : "하단");
  const [vol, setVol] = useState(item && item.volume != null ? item.volume : 100);
  if (!item) return null;
  const Icon = BLOCK_ICON[k] || (k === "subtitle" ? Captions : k === "audio" ? Music : k === "transition" ? ArrowRightLeft : ImageIcon);

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
            <div className="px-3 py-2.5 text-[12.5px]" style={{ background: "#f6f3ec", border: "1px solid " + LINE, borderRadius: RADIUS, color: INK, wordBreak: "break-all" }}>{(item.file || item.source || "").split("/").pop()}</div>
            <button className="mt-2 flex w-full items-center justify-center gap-1.5 py-2.5 text-[13px] font-bold text-white" style={{ background: GOLD, borderRadius: RADIUS }}><Upload className="h-4 w-4" /> {k === "audio" ? "다른 음악으로 바꾸기" : "다른 파일로 바꾸기"}</button>
          </Field>
        )}

        {k === "title" && (
          <>
            <Field label="화면에 보일 글자"><input className={inputCls} style={{ ...inputStyle, fontFamily: SERIF }} defaultValue={item.text || D.EDITOR_RESERVATION.deceased} /></Field>
            <Field label="보이는 시간 (초)"><input className={inputCls} style={inputStyle} defaultValue={item.dur} /></Field>
            <Field label="AI 문구 (타이틀)"><select className={inputCls} style={inputStyle}>{D.PROMPTS.filter((p) => p.target === "타이틀").map((p) => <option key={p.id}>{p.name}</option>)}</select></Field>
            <button className="flex w-full items-center justify-center gap-1.5 py-2.5 text-[13px] font-bold text-white" style={{ background: GOLD, borderRadius: RADIUS }}><RefreshCw className="h-4 w-4" /> AI로 다시 만들기</button>
            <PromptManager />
          </>
        )}

        {(k === "clip" || k === "slide") && <Field label="보이는 시간 (초)"><input className={inputCls} style={inputStyle} defaultValue={item.dur} /></Field>}
        {k === "slide" && <button className="flex w-full items-center justify-center gap-1.5 py-2.5 text-[13px] font-bold text-white" style={{ background: GOLD, borderRadius: RADIUS }}><RefreshCw className="h-4 w-4" /> 사진으로 다시 만들기</button>}

        {k === "ai" && (
          <>
            <Field label="보이는 시간 (초)"><input className={inputCls} style={inputStyle} defaultValue={item.dur} /></Field>
            <Field label="AI 문구 (영상)"><select className={inputCls} style={inputStyle}>{D.PROMPTS.filter((p) => p.target === "AI영상").map((p) => <option key={p.id}>{p.name}</option>)}</select></Field>
            <button className="flex w-full items-center justify-center gap-1.5 py-2.5 text-[13px] font-bold text-white" style={{ background: GOLD, borderRadius: RADIUS }}><RefreshCw className="h-4 w-4" /> AI로 다시 만들기</button>
            <PromptManager />
          </>
        )}

        {k === "letter" && (
          <Field label="편지 내용"><textarea rows={7} defaultValue={D.EDITOR_LETTER} className="w-full resize-none p-3 text-[13.5px] leading-relaxed outline-none" style={{ ...inputStyle, height: "auto", fontFamily: SERIF }} /></Field>
        )}

        {k === "transition" && (
          <>
            <Field label="장면이 바뀌는 효과">
              <div className="grid grid-cols-2 gap-2">
                {D.TRANSITION_TYPES.map((t) => (
                  <button key={t} onClick={() => setEffect(t)} className="flex h-16 flex-col items-center justify-center gap-1 text-[13px] font-bold" style={{ background: effect === t ? GOLD_SOFT : "#fff", border: "1.5px solid " + (effect === t ? GOLD : LINE2), borderRadius: 6, color: effect === t ? GOLD_D : MUTE }}>
                    <ArrowRightLeft className="h-4 w-4" /> {t}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="효과 길이"><select className={inputCls} style={inputStyle} defaultValue="0.5초 (기본)"><option>0.3초</option><option>0.5초 (기본)</option><option>1.0초</option></select></Field>
            <button className="flex w-full items-center justify-center gap-1.5 py-2.5 text-[13px] font-semibold" style={{ border: "1px solid " + LINE2, borderRadius: RADIUS, color: MUTE }}><Trash2 className="h-4 w-4" /> 효과 빼기</button>
          </>
        )}

        {k === "subtitle" && (
          <>
            <Field label="자막 글자"><textarea rows={3} value={item.text} onChange={(e) => updateSub(item.id, { text: e.target.value })} className="w-full resize-none p-3 text-[13.5px] leading-relaxed outline-none" style={{ ...inputStyle, height: "auto" }} /></Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="시작 (초)"><input type="number" step="0.5" min="0" value={item.start} onChange={(e) => updateSub(item.id, { start: Math.max(0, +e.target.value) })} className={inputCls} style={inputStyle} /></Field>
              <Field label="길이 (초)"><input type="number" step="0.5" min="1" value={item.dur} onChange={(e) => updateSub(item.id, { dur: Math.max(1, +e.target.value) })} className={inputCls} style={inputStyle} /></Field>
            </div>
            <Field label="위치">
              <div className="grid grid-cols-3 gap-1.5">
                {D.SUBTITLE_POS.map((p) => (
                  <button key={p} onClick={() => updateSub(item.id, { pos: p })} className="py-2 text-[13px] font-bold" style={{ background: item.pos === p ? GOLD_SOFT : "#fff", border: "1.5px solid " + (item.pos === p ? GOLD : LINE2), borderRadius: RADIUS, color: item.pos === p ? GOLD_D : MUTE }}>{p}</button>
                ))}
              </div>
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="글씨체"><select className={inputCls} style={inputStyle}><option>Nanum Myeongjo</option><option>Pretendard</option></select></Field>
              <Field label="크기"><input type="number" min="10" value={item.size} onChange={(e) => updateSub(item.id, { size: +e.target.value })} className={inputCls} style={inputStyle} /></Field>
            </div>
            <Field label="색상">
              <div className="flex items-center gap-2">
                <span className="h-9 w-11 shrink-0" style={{ background: item.color, border: "1px solid " + LINE2, borderRadius: RADIUS }} />
                <input value={item.color} onChange={(e) => updateSub(item.id, { color: e.target.value })} className={inputCls} style={inputStyle} />
              </div>
            </Field>
            <button onClick={() => deleteSub(item.id)} className="flex w-full items-center justify-center gap-1.5 py-2.5 text-[13px] font-semibold" style={{ border: "1px solid " + LINE2, borderRadius: RADIUS, color: MUTE }}><Trash2 className="h-4 w-4" /> 자막 지우기</button>
          </>
        )}

        {k === "audio" && (
          <>
            <Field label={`소리 크기 (${vol}%)`}><input type="range" min="0" max="100" value={vol} onChange={(e) => setVol(+e.target.value)} className="w-full" style={{ accentColor: GOLD }} /></Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="서서히 커지기 (초)"><input className={inputCls} style={inputStyle} defaultValue={item.fadeIn} /></Field>
              <Field label="서서히 작아지기 (초)"><input className={inputCls} style={inputStyle} defaultValue={item.fadeOut} /></Field>
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
  const [sel, setSel] = useState({ scope: "block", kind: "title", id: D.EDITOR_BLOCKS[0].id });
  const [subs, setSubs] = useState(seedSubs);
  const name = (reservation && (reservation.deceased || reservation.name)) || D.EDITOR_RESERVATION.deceased;

  const updateSub = (id, patch) => setSubs((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const deleteSub = (id) => {
    setSubs((prev) => prev.filter((s) => s.id !== id));
    setSel({ scope: "block", kind: "title", id: D.EDITOR_BLOCKS[0].id });
  };
  const addSub = () => {
    const id = "sub-" + Date.now();
    setSubs((prev) => {
      const start = prev.length ? Math.min(60, Math.max(...prev.map((s) => s.start + s.dur))) : 0;
      return [...prev, { id, text: "새 자막", start, dur: 4, pos: "하단", size: 48, color: "#f3e9c8" }];
    });
    setSel({ scope: "cap", kind: "subtitle", id });
  };

  const [toast, setToast] = useState(null);
  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(null), 1800); };
  const publish = () => {
    if (reservation && reservation.id) actions.setReservationStatus(reservation.id, "published"); // 목 DB 전파 → 큐·파트너·대시보드
    setToast("확정·발행되었습니다");
    setTimeout(() => onClose && onClose(), 1000);
  };

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 44px)", background: BG }}>
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 px-4 py-2.5 text-[13px] font-semibold text-white" style={{ background: "#2a2622", borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,.25)" }}>
          <Check className="h-4 w-4" style={{ color: "#9ec9b6" }} strokeWidth={2.6} /> {toast}
        </div>
      )}
      <div className="flex items-center justify-between px-4" style={{ background: MASTER, height: 52 }}>
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="flex items-center gap-1 text-[13px] font-semibold" style={{ color: "#aab2bf" }}><ChevronLeft className="h-4 w-4" /> 닫기</button>
          <span className="h-4 w-px" style={{ background: "#2c3744" }} />
          <span className="text-[14px] font-bold" style={{ color: "#eef0f3", fontFamily: SERIF }}>{name}</span>
          <span className="text-[12px]" style={{ color: "#5a6472" }}>추모영상 편집</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => flash("되돌렸습니다")} className="flex items-center gap-1 px-2 py-1.5 text-[12px]" style={{ color: "#aab2bf" }}><Undo2 className="h-3.5 w-3.5" /> 되돌리기</button>
          <button onClick={() => flash("다시 적용했습니다")} className="flex items-center gap-1 px-2 py-1.5 text-[12px]" style={{ color: "#aab2bf" }}><Redo2 className="h-3.5 w-3.5" /> 다시</button>
          <span className="h-4 w-px" style={{ background: "#2c3744" }} />
          <button onClick={() => flash("자동 생성본으로 되돌렸습니다")} className="flex items-center gap-1 px-2.5 py-1.5 text-[12px] font-semibold" style={{ color: "#aab2bf" }}><RotateCcw className="h-3.5 w-3.5" /> 자동본으로</button>
          <Btn size="sm" variant="neutral" onClick={() => flash("저장되었습니다")}><Save className="h-3.5 w-3.5" /> 저장</Btn>
          <Btn size="sm" onClick={() => flash("영상 재생성 요청됨 — 렌더 큐에 추가")}><Film className="h-3.5 w-3.5" /> 영상 다시 만들기</Btn>
          <Btn size="sm" onClick={publish}><Check className="h-4 w-4" strokeWidth={2.4} /> 확정·발행</Btn>
        </div>
      </div>

      <div className="flex items-center gap-2 px-5 py-1.5 text-[12px]" style={{ background: "#faf7f1", borderBottom: "1px solid " + LINE, color: MUTE }}>
        <span className="flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: GOLD }}>?</span>
        왼쪽에서 <b style={{ color: INK }}>블록</b>을 고르거나 아래 <b style={{ color: INK }}>타임라인</b>에서 블록·자막·음악을 눌러 편집하세요.
      </div>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-64 shrink-0 overflow-y-auto px-3.5 py-4" style={{ background: SURFACE, borderRight: "1px solid " + LINE }}>
          <BlockList sel={sel} onSel={setSel} />
        </aside>
        <div className="flex flex-1 flex-col overflow-y-auto px-6 py-5">
          <Preview />
          <Timeline sel={sel} onSel={setSel} subs={subs} setSubs={setSubs} onAddSub={addSub} />
        </div>
        <aside className="w-80 shrink-0 overflow-y-auto" style={{ background: SURFACE, borderLeft: "1px solid " + LINE }}>
          <PropPanel key={sel.scope + sel.id} sel={sel} subs={subs} updateSub={updateSub} deleteSub={deleteSub} />
        </aside>
      </div>

      <div className="flex items-center gap-3 px-5 py-2 text-[11.5px]" style={{ background: SURFACE, borderTop: "1px solid " + LINE, color: FAINT }}>
        <Volume2 className="h-3.5 w-3.5" /> 배경 음악: {D.EDITOR_RESERVATION.bgm}
        <span className="ml-auto">확정하면 전체가 하나로 합쳐져 발행됩니다.</span>
      </div>
    </div>
  );
}
