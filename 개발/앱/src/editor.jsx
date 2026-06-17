import React, { useState } from "react";
import {
  ChevronLeft, Undo2, Redo2, Upload, Play, RefreshCw, Check, Lock,
  Type, Image, Clapperboard, Sparkles, Mail, GripVertical, Music,
} from "lucide-react";
import { SANS, SERIF, NAVY, MASTER, BG, SURFACE, LINE, LINE2, GOLD, GOLD_D, GOLD_SOFT, INK, MUTE, FAINT, STATUS, RADIUS } from "./theme.js";
import { Tag, Btn, ProgressBar } from "./ui.jsx";
import * as D from "./data.js";

const BLOCK_ICON = {
  title: Type, clip: Clapperboard, slide: Image, ai: Sparkles, letter: Mail,
};

// 좌측 블록 리스트 (순서 고정)
function BlockList({ blocks, sel, onSel }) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide" style={{ color: FAINT }}>
        <Lock className="h-3 w-3" /> 블록 (순서 고정)
      </div>
      <div className="space-y-1.5">
        {blocks.map((b, i) => {
          const Icon = BLOCK_ICON[b.type];
          const on = sel.id === b.id;
          return (
            <button key={b.id} onClick={() => onSel(b)}
              className="flex w-full items-center gap-2.5 px-2.5 py-2 text-left outline-none transition"
              style={{ background: on ? GOLD_SOFT : SURFACE, border: "1px solid " + (on ? GOLD : LINE), borderRadius: RADIUS }}>
              <GripVertical className="h-3.5 w-3.5 shrink-0" style={{ color: FAINT, opacity: 0.5 }} />
              <Icon className="h-4 w-4 shrink-0" style={{ color: on ? GOLD_D : MUTE }} strokeWidth={1.9} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12.5px] font-semibold" style={{ color: INK }}>{i + 1}. {b.label}</div>
                <div className="truncate text-[11px]" style={{ color: FAINT }}>{b.source} · {b.dur}s</div>
              </div>
              {b.status === "rendering"
                ? <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: STATUS.rendering.c }} />
                : <Check className="h-3.5 w-3.5 shrink-0" style={{ color: STATUS.done.c }} strokeWidth={2.4} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// 소스 라이브러리 (좌측 하단)
function SourceLib() {
  return (
    <div className="mt-5">
      <div className="mb-2 text-[11px] font-bold uppercase tracking-wide" style={{ color: FAINT }}>소스</div>
      <div className="space-y-1">
        {D.CONTENT.concat([]).slice(0, 4).map((c) => (
          <div key={c.id} className="flex items-center gap-2 px-2 py-1.5 text-[12px]" style={{ color: INK }}>
            {c.kind === "clip" ? <Clapperboard className="h-3.5 w-3.5" style={{ color: MUTE }} /> : <Image className="h-3.5 w-3.5" style={{ color: MUTE }} />}
            <span className="truncate flex-1">{c.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// 중앙 미리보기 + 트림 + 타임라인
function Preview({ block, blocks }) {
  const rendering = block.status === "rendering";
  return (
    <div className="flex flex-1 flex-col items-center px-8 py-6">
      {/* 16:9 서버 렌더 영상 재생 */}
      <div className="relative w-full" style={{ maxWidth: 720, aspectRatio: "16/9", background: "#1c232c", borderRadius: RADIUS, overflow: "hidden" }}>
        {rendering ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <span className="text-[12px]" style={{ color: "#aab2bf" }}>블록 렌더링 중…</span>
            <div className="w-40"><ProgressBar /></div>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Play className="h-12 w-12 text-white" fill="#fff" style={{ opacity: 0.9 }} />
          </div>
        )}
        {block.type === "title" && !rendering && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span style={{ fontFamily: SERIF, fontSize: 30, fontWeight: 700, color: "#f3efe6", textShadow: "0 2px 12px rgba(0,0,0,.5)" }}>故 홍길동</span>
          </div>
        )}
        <span className="absolute bottom-2 left-2 px-1.5 py-[2px] text-[9px] font-bold tracking-wider text-white" style={{ background: "rgba(0,0,0,.45)", borderRadius: 2 }}>16:9 · 480p 프록시</span>
      </div>

      <div className="mt-1.5 text-[11px]" style={{ color: FAINT }}>미리보기 = 서버 렌더 영상 재생 (Canvas 불필요)</div>

      {/* 트림 슬라이더 */}
      <div className="mt-5 w-full" style={{ maxWidth: 720 }}>
        <div className="mb-1.5 flex items-center justify-between text-[11px]" style={{ color: MUTE }}>
          <span>트림</span><span className="tabular-nums">0:00 — 0:{String(block.dur).padStart(2, "0")}</span>
        </div>
        <div className="relative h-7 w-full" style={{ background: "#e7e2d8", borderRadius: RADIUS }}>
          <div className="absolute inset-y-0" style={{ left: "8%", right: "12%", background: GOLD_SOFT, border: "1px solid " + GOLD, borderRadius: RADIUS }} />
          <div className="absolute inset-y-0 flex w-2.5 items-center justify-center" style={{ left: "8%", background: GOLD, borderRadius: "3px 0 0 3px", cursor: "ew-resize" }} />
          <div className="absolute inset-y-0 flex w-2.5 items-center justify-center" style={{ right: "12%", background: GOLD, borderRadius: "0 3px 3px 0", cursor: "ew-resize" }} />
        </div>
      </div>

      {/* 블록 타임라인 */}
      <div className="mt-5 flex w-full items-center gap-1" style={{ maxWidth: 720 }}>
        {blocks.map((b) => (
          <div key={b.id} className="flex h-8 items-center justify-center text-[10px] font-semibold"
            style={{ flex: b.dur, background: b.id === block.id ? GOLD : "#d9d6cd", color: b.id === block.id ? "#fff" : MUTE, borderRadius: 2 }}>
            {b.label}
          </div>
        ))}
      </div>
    </div>
  );
}

// 우측 블록 타입별 편집 패널
function EditPanel({ block }) {
  const [letter, setLetter] = useState(D.EDITOR_LETTER);
  const Icon = BLOCK_ICON[block.type];
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-4 py-3.5" style={{ borderBottom: "1px solid " + LINE }}>
        <Icon className="h-4 w-4" style={{ color: GOLD_D }} />
        <span className="text-[13px] font-bold" style={{ color: INK }}>{block.label}</span>
        <span className="ml-auto"><Tag s={block.status === "rendering" ? "rendering" : "done"} label={block.status === "rendering" ? "렌더링 중" : "렌더 완료"} /></span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="mb-3 text-[12px] leading-relaxed" style={{ color: MUTE }}>{block.detail}</div>

        {/* 소스 */}
        <div className="mb-4">
          <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide" style={{ color: FAINT }}>현재 소스</div>
          <div className="flex items-center gap-2 px-3 py-2.5" style={{ background: "#f6f3ec", border: "1px solid " + LINE, borderRadius: RADIUS }}>
            <Image className="h-4 w-4" style={{ color: MUTE }} />
            <span className="flex-1 truncate text-[12.5px]" style={{ color: INK }}>{block.source}</span>
          </div>
        </div>

        {/* 타입별 액션 */}
        {(block.type === "title" || block.type === "ai") && (
          <>
            <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide" style={{ color: FAINT }}>AI 프롬프트 (리스트 선택형)</div>
            <select className="mb-3 w-full px-3 text-[12.5px] outline-none" style={{ height: 34, background: SURFACE, border: "1px solid " + LINE, borderRadius: RADIUS, color: INK }}>
              {D.PROMPTS.filter((p) => p.target === (block.type === "title" ? "타이틀" : "AI영상")).map((p) => <option key={p.id}>{p.name}</option>)}
            </select>
            <Btn size="sm" variant="ghost"><Upload className="h-3.5 w-3.5" /> 사진 교체</Btn>
            <div className="mt-2"><Btn size="sm"><RefreshCw className="h-3.5 w-3.5" /> AI 재생성 ({block.provider})</Btn></div>
          </>
        )}
        {block.type === "clip" && (
          <>
            <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide" style={{ color: FAINT }}>콘텐츠 허브에서 교체</div>
            <select className="w-full px-3 text-[12.5px] outline-none" style={{ height: 34, background: SURFACE, border: "1px solid " + LINE, borderRadius: RADIUS, color: INK }}>
              {D.CONTENT.filter((c) => c.kind === "clip").map((c) => <option key={c.id}>{c.name}</option>)}
            </select>
          </>
        )}
        {block.type === "slide" && (
          <>
            <Btn size="sm" variant="ghost"><Upload className="h-3.5 w-3.5" /> 사진 교체·추가</Btn>
            <div className="mt-2"><Btn size="sm"><RefreshCw className="h-3.5 w-3.5" /> FFmpeg 재합성</Btn></div>
          </>
        )}
        {block.type === "letter" && (
          <>
            <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide" style={{ color: FAINT }}>편지 텍스트</div>
            <textarea value={letter} onChange={(e) => setLetter(e.target.value)} rows={6}
              className="w-full resize-none p-2.5 text-[13px] leading-relaxed outline-none"
              style={{ background: SURFACE, border: "1px solid " + LINE, borderRadius: RADIUS, color: INK, fontFamily: SERIF }} />
            <p className="mt-1.5 text-[11px]" style={{ color: FAINT }}>배경음만 · BGM 제외</p>
          </>
        )}
      </div>
    </div>
  );
}

export default function VideoEditor({ reservation, onClose }) {
  const blocks = D.EDITOR_BLOCKS;
  const [sel, setSel] = useState(blocks[0]);
  const totalDur = blocks.reduce((s, b) => s + b.dur, 0);
  const name = (reservation && (reservation.deceased || reservation.name)) || D.EDITOR_RESERVATION.deceased;

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 44px)", background: BG }}>
      {/* 편집기 상단바 */}
      <div className="flex items-center justify-between px-4" style={{ background: MASTER, height: 50 }}>
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="flex items-center gap-1 text-[13px] font-semibold" style={{ color: "#aab2bf" }}>
            <ChevronLeft className="h-4 w-4" /> 닫기
          </button>
          <span className="h-4 w-px" style={{ background: "#2c3744" }} />
          <span className="text-[13px] font-bold" style={{ color: "#eef0f3", fontFamily: SERIF }}>{name}</span>
          <span className="text-[12px]" style={{ color: "#5a6472" }}>추모영상 · 총 {totalDur}s</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1 px-2 py-1.5 text-[12px]" style={{ color: "#aab2bf" }}><Undo2 className="h-3.5 w-3.5" /> 실행취소</button>
          <button className="flex items-center gap-1 px-2 py-1.5 text-[12px]" style={{ color: "#aab2bf" }}><Redo2 className="h-3.5 w-3.5" /> 다시실행</button>
          <span className="h-4 w-px" style={{ background: "#2c3744" }} />
          <Btn size="sm" variant="neutral"><Upload className="h-3.5 w-3.5" /> 내보내기(USB MP4)</Btn>
          <Btn size="sm"><Check className="h-4 w-4" strokeWidth={2.4} /> 컨펌 · 발행</Btn>
        </div>
      </div>

      {/* 3분할 */}
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-64 shrink-0 overflow-y-auto px-3 py-4" style={{ background: SURFACE, borderRight: "1px solid " + LINE }}>
          <BlockList blocks={blocks} sel={sel} onSel={setSel} />
          <SourceLib />
        </aside>
        <Preview block={sel} blocks={blocks} />
        <aside className="w-80 shrink-0 overflow-y-auto" style={{ background: SURFACE, borderLeft: "1px solid " + LINE }}>
          <EditPanel block={sel} />
        </aside>
      </div>

      <div className="flex items-center gap-3 px-4 py-2 text-[11px]" style={{ background: SURFACE, borderTop: "1px solid " + LINE, color: FAINT }}>
        <Music className="h-3.5 w-3.5" /> BGM: {D.EDITOR_RESERVATION.bgm} (전체 1트랙)
        <span className="ml-auto">편집기 PC 전용 · 컨펌 시 섹션별 렌더 → 컨펌 후 통합 렌더</span>
      </div>
    </div>
  );
}
