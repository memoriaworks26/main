// 편집기 — 왼쪽 블록 목록(BlockList) + 가운데 블록 기준 타임라인(Timeline).
// 블록이 곧 타임라인의 칸. 전환은 블록 경계에, 음악은 전체 1트랙.
import React from "react";
import { Music, ArrowRightLeft, Check, ArrowUp, ArrowDown, Eye, EyeOff, Plus } from "lucide-react";
import { INK, MUTE, FAINT, GOLD, GOLD_D, GOLD_SOFT, SURFACE, LINE, STATUS } from "../theme.js";
import { BLOCK_ICON, BLOCK_COLOR, SCALE, segments, blockTrans } from "./blocks.js";

// 블록 컨트롤(순서·미노출) 아이콘 버튼 — 편집·컨펌/2차 가공 편집기 공용
function CtrlBtn({ icon, onClick, disabled, title, active }) {
  const Ico = icon;
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={title} aria-label={title}
      className="flex h-6 w-6 items-center justify-center outline-none transition disabled:opacity-30 focus-visible:ring-1"
      style={{ background: active ? GOLD_SOFT : SURFACE, border: "1px solid " + (active ? GOLD : LINE), borderRadius: 5, color: active ? GOLD_D : MUTE }}>
      <Ico className="h-3.5 w-3.5" strokeWidth={2} />
    </button>
  );
}

// ── 왼쪽: 편집할 블록 ──────────────────────────────────────────
// arrange면 ↑↓ 순서변경 + 눈 아이콘 미노출 토글을 노출(편집·컨펌/2차 가공 공용). off면 순서 고정.
export function BlockList({ blocks, sel, onSel, arrange = false, hidden = [], onMove, onToggleHide }) {
  let visNo = 0; // 노출 블록 번호(최종 영상 순서) — 미노출은 건너뜀
  return (
    <div>
      <div className="mb-2.5 text-[13px] font-bold" style={{ color: INK }}>편집할 블록 <span className="font-normal" style={{ color: FAINT }}>· {arrange ? "순서변경·미노출 가능" : "순서 고정"}</span></div>
      <div className="space-y-2">
        {blocks.map((b, i) => {
          const Icon = BLOCK_ICON[b.type];
          const on = sel.scope === "block" && sel.id === b.id;
          const hid = arrange && hidden.includes(b.id);
          const no = hid ? "–" : ++visNo;
          return (
            <div key={b.id} className="flex items-stretch gap-1.5">
              <button onClick={() => onSel({ scope: "block", kind: b.type, id: b.id })}
                className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-left outline-none transition focus-visible:ring-1"
                style={{ background: on ? GOLD_SOFT : SURFACE, border: "1.5px solid " + (on ? GOLD : LINE), borderRadius: 6, opacity: hid ? 0.5 : 1 }}>
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold" style={{ background: on ? GOLD : "#e7e2d8", color: on ? "#fff" : MUTE }}>{no}</span>
                <Icon className="h-4 w-4 shrink-0" style={{ color: on ? GOLD_D : MUTE }} strokeWidth={1.9} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-bold" style={{ color: INK }}>{b.label}</div>
                  <div className="truncate text-[11.5px]" style={{ color: FAINT }}>{hid ? "미노출 — 최종 영상에서 제외" : b.source}</div>
                </div>
                {!arrange && (b.status === "rendering"
                  ? <span className="shrink-0 text-[11px] font-semibold" style={{ color: STATUS.rendering.c }}>제작중</span>
                  : <Check className="h-4 w-4 shrink-0" style={{ color: STATUS.done.c }} strokeWidth={2.6} />)}
              </button>
              {arrange && (
                <div className="flex shrink-0 items-center gap-1">
                  <CtrlBtn icon={ArrowUp} onClick={() => onMove(b.id, -1)} disabled={i === 0} title="위로" />
                  <CtrlBtn icon={ArrowDown} onClick={() => onMove(b.id, 1)} disabled={i === blocks.length - 1} title="아래로" />
                  <CtrlBtn icon={hid ? EyeOff : Eye} onClick={() => onToggleHide(b.id)} active={hid} title={hid ? "다시 노출" : "미노출(최종 영상 제외)"} />
                </div>
              )}
            </div>
          );
        })}
      </div>
      {arrange && <p className="mt-2.5 text-[11px] leading-relaxed" style={{ color: FAINT }}>↑↓로 순서를 바꾸고 눈 아이콘으로 블록을 미노출(최종 영상에서 제외)할 수 있어요. 되돌리기·저장이 적용됩니다.</p>}
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

// 자막 트랙 — 칸을 끌어 이동 / 양끝 손잡이로 길이 조절. 드래그 중엔 로컬 미리보기,
// 손을 떼는 순간 1회만 onSubChange로 커밋(undo/redo·저장과 연동).
function SubtitleTrack({ subtitles, tlMax, selId, onSel, onSubChange }) {
  const ref = React.useRef(null);
  const dragRef = React.useRef(null);
  const [drag, setDrag] = React.useState(null);
  const setBoth = (v) => { dragRef.current = v; setDrag(v); };
  const pxToSec = (clientX) => {
    const rect = ref.current.getBoundingClientRect();
    return Math.max(0, Math.min(tlMax, Math.round((clientX - rect.left) / SCALE)));
  };
  const begin = (sub, mode) => (e) => {
    e.preventDefault(); e.stopPropagation();
    onSel({ scope: "subtitle", kind: "subtitle", id: sub.id });
    const s0 = sub.start, e0 = sub.end, dur = e0 - s0, anchor = pxToSec(e.clientX);
    const move = (ev) => {
      const m = pxToSec(ev.clientX);
      let ns = s0, ne = e0;
      if (mode === "move") { ns = Math.max(0, Math.min(tlMax - dur, s0 + (m - anchor))); ne = ns + dur; }
      else if (mode === "left") { ns = Math.max(0, Math.min(e0 - 1, m)); }
      else { ne = Math.min(tlMax, Math.max(s0 + 1, m)); }
      setBoth({ id: sub.id, start: ns, end: ne });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      const d = dragRef.current;
      if (d && d.id === sub.id && (d.start !== s0 || d.end !== e0)) onSubChange(sub.id, { start: d.start, end: d.end });
      setBoth(null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  return (
    <div ref={ref} className="relative flex-1 touch-none select-none" style={{ height: 26 }}>
      {subtitles.length === 0
        ? <span className="absolute left-0 top-1/2 -translate-y-1/2 text-[10.5px]" style={{ color: FAINT }}>자막 없음</span>
        : subtitles.map((s) => {
          const eff = drag && drag.id === s.id ? { ...s, start: drag.start, end: drag.end } : s;
          const selOn = selId === s.id;
          return (
            <div key={s.id} onPointerDown={begin(s, "move")}
              className="absolute top-0 flex h-full cursor-grab items-center overflow-hidden px-2"
              style={{ left: eff.start * SCALE, width: Math.max(10, (eff.end - eff.start) * SCALE), background: "#f4ead7", borderRadius: 4, border: selOn ? "2.5px solid " + GOLD : "1px solid rgba(154,106,28,.3)" }}
              title={s.text}>
              <span className="pointer-events-none truncate text-[10.5px] font-semibold" style={{ color: "#7a5a1c" }}>{s.text}</span>
              <div onPointerDown={begin(s, "left")} className="absolute left-0 top-0 h-full w-1.5 cursor-ew-resize" style={{ background: "rgba(154,106,28,.55)", borderRadius: "4px 0 0 4px" }} title="시작 조절" />
              <div onPointerDown={begin(s, "right")} className="absolute right-0 top-0 h-full w-1.5 cursor-ew-resize" style={{ background: "rgba(154,106,28,.55)", borderRadius: "0 4px 4px 0" }} title="끝 조절" />
            </div>
          );
        })}
    </div>
  );
}

export function Timeline({ blocks, edits = {}, bgmName, subtitles = [], onSubChange, onAddSub, onPickBgm, sel, onSel }) {
  const { segs, total, width } = segments(blocks);
  const on = (scope, id) => sel.scope === scope && sel.id === id;
  const transOf = (id) => edits["trans-" + id]?.effect || blockTrans(id);
  // 자막이 블록 총길이보다 길게 깔릴 수 있어 타임라인 폭을 둘 중 큰 값으로 확장(드래그 한계도 이 값)
  const subEnd = subtitles.reduce((m, s) => Math.max(m, s.end || 0), 0);
  const tlMax = Math.max(total, subEnd);
  const innerW = Math.max(width, tlMax * SCALE);
  // 블록 길이가 분 단위라 눈금은 30초 간격 · mm:ss 표기
  const mmss = (s) => Math.floor(s / 60) + ":" + String(Math.round(s % 60)).padStart(2, "0");
  const ticks = []; for (let s = 0; s <= tlMax; s += 30) ticks.push(s);

  return (
    <div className="mt-5">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-[13px] font-bold" style={{ color: INK }}>타임라인 <span className="font-normal" style={{ color: FAINT }}>· 블록·자막을 눌러 편집</span></div>
        {onAddSub && (
          <div className="flex items-center gap-1.5">
            {[0, 1].map((tk) => (
              <button key={tk} type="button" onClick={() => onAddSub(tk)} title={`자막 ${tk + 1}(${tk === 0 ? "첫째" : "둘째"} 줄)에 추가`}
                className="flex items-center gap-1 px-2.5 py-1 text-[12px] font-semibold outline-none"
                style={{ color: GOLD_D, background: GOLD_SOFT, borderRadius: 6 }}>
                <Plus className="h-3.5 w-3.5" strokeWidth={2.4} /> 자막 {tk + 1}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="overflow-x-auto pb-1">
        <div style={{ minWidth: innerW + 72 }}>
          {/* 눈금자 */}
          <div className="mb-1 flex gap-2">
            <div className="w-16 shrink-0" />
            <div className="relative flex-1" style={{ height: 14 }}>
              {ticks.map((s) => <span key={s} className="absolute text-[10px] tabular-nums" style={{ left: s * SCALE, color: FAINT }}>{mmss(s)}</span>)}
              <span className="absolute right-0 text-[10.5px] font-semibold tabular-nums" style={{ color: MUTE }}>총 {mmss(total)}</span>
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
                    <span className="mt-0.5 truncate text-[10px] text-white" style={{ opacity: 0.85 }}>{b.source} · {b.dur >= 60 ? mmss(b.dur) : b.dur + "초"}</span>
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

          {/* 자막 트랙(2줄) — 같은 시각에 최대 2개 동시 노출. 칸을 끌어 이동 / 양끝으로 길이 조절 / 눌러 편집. */}
          {[0, 1].map((tk) => (
            <div key={tk} className="mb-1.5 flex items-stretch gap-2">
              <RowLabel name={`자막 ${tk + 1}`} color="#9a6a1c" />
              <SubtitleTrack subtitles={subtitles.filter((s) => (s.track ?? 0) === tk)} tlMax={tlMax} selId={sel.scope === "subtitle" ? sel.id : null} onSel={onSel} onSubChange={onSubChange} />
            </div>
          ))}

          {/* 음악 트랙(시각) — 추억 슬라이드 블록 구간을 따라감. 편집은 슬라이드 BGM 영역에서 */}
          <div className="flex items-stretch gap-2">
            <RowLabel name="음악" color="#3a7468" />
            <div className="relative flex-1" style={{ height: 28 }}>
              {(() => {
                const slideSeg = segs.find((s) => s.type === "slide");
                if (!slideSeg) return <span className="absolute left-0 top-1/2 -translate-y-1/2 text-[10.5px]" style={{ color: FAINT }}>추억 슬라이드 없음</span>;
                return (
                  <button onClick={onPickBgm} className="absolute top-0 flex h-full items-center gap-1.5 overflow-hidden px-2.5 text-left outline-none"
                    style={{ left: slideSeg.left, width: Math.max(40, slideSeg.w - 3), background: "#3a7468", borderRadius: 4, border: "1px solid rgba(0,0,0,.12)" }}
                    title="배경 음악 · 추억 슬라이드 블록에서 편집">
                    <Music className="h-3.5 w-3.5 shrink-0 text-white" style={{ opacity: 0.9 }} />
                    <span className="truncate text-[11px] text-white">{bgmName}</span>
                  </button>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
