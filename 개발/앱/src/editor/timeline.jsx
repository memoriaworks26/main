// 편집기 — 왼쪽 블록 목록(BlockList) + 가운데 블록 기준 타임라인(Timeline).
// 블록이 곧 타임라인의 칸. 전환은 블록 경계에, 음악은 전체 1트랙.
import React from "react";
import { Music, ArrowRightLeft, Check } from "lucide-react";
import { INK, MUTE, FAINT, GOLD, GOLD_D, GOLD_SOFT, SURFACE, LINE, STATUS } from "../theme.js";
import { BLOCK_ICON, BLOCK_COLOR, SCALE, segments, blockTrans } from "./blocks.js";

// ── 왼쪽: 편집할 블록 ──────────────────────────────────────────
export function BlockList({ blocks, sel, onSel }) {
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

// ── 가운데: 블록 기준 타임라인 ────────────────────────────────
function RowLabel({ name, color }) {
  return (
    <div className="flex w-16 shrink-0 items-center gap-1.5">
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      <span className="text-[11.5px] font-semibold" style={{ color: MUTE }}>{name}</span>
    </div>
  );
}

export function Timeline({ blocks, edits = {}, bgmName, sel, onSel }) {
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
