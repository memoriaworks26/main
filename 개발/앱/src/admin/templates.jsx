// [추모영상 제작] 영상 템플릿 — 파트너별 요소 구성·순서 편집 + 배경음악(제작 링크 노출) 최대 3곡 선택.
import React, { useState } from "react";
import {
  AlertTriangle, Check, ChevronDown, ChevronRight, ChevronUp, Clapperboard, Film, GripVertical, Image, LayoutTemplate, Loader2, Mail, Music, Plus, Search, Sparkles, Trash2, Type, Upload,
} from "lucide-react";
import { SURFACE, LINE, LINE2, GOLD, GOLD_D, GOLD_SOFT, INK, MUTE, FAINT, STATUS, RADIUS } from "../theme.js";
import { Btn, PageHeader } from "../ui.jsx";
import { useStore, actions, bizPartners } from "../store.js";
import { confirm } from "../confirm.jsx";
import * as D from "../data.js";
import { matchQuery } from "../lib/util.js";
import { grabAudioMeta } from "../lib/media.js";
import { SaveBar, SearchSelect } from "./shared.jsx";

const BGM_MAX = 3; // 제작 링크에 노출할 배경음악 최대 곡 수

const TPL_EL = {
  title: { icon: Type, color: GOLD },
  ai: { icon: Sparkles, color: "#51607a" },
  slide: { icon: Image, color: "#2f4763" },
  video: { icon: Film, color: "#3a5a52" },
  letter: { icon: Mail, color: "#5a6470" },
  clip: { icon: Clapperboard, color: "#3f5e87" },
};
// 요소 길이가 분 단위라 mm:ss로 표기
const mmss = (s) => Math.floor(s / 60) + ":" + String(Math.round(s % 60)).padStart(2, "0");

// 섹션 소제목
function SectionLabel({ icon: Icon, children, right }) {
  return (
    <div className="mb-2 flex items-center gap-1.5">
      <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: MUTE }} strokeWidth={2} />
      <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: MUTE, letterSpacing: ".04em" }}>{children}</span>
      {right && <span className="ml-auto text-[11px] tabular-nums" style={{ color: FAINT }}>{right}</span>}
    </div>
  );
}

// 요소 추가 드롭다운 — 기본 요소는 미사용 시에만, 클립(repeatable)은 항상
function AddElementMenu({ addable, onAdd }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null); // 부모 overflow에 안 잘리게 fixed로 띄움
  const ref = React.useRef(null);
  const btnRef = React.useRef(null);
  const W = 208; // w-52
  const place = React.useCallback(() => {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    const left = Math.max(8, Math.min(r.left, window.innerWidth - W - 8)); // 버튼 왼쪽 끝에 맞춤
    const maxH = Math.min(8 + addable.length * 37, Math.max(140, window.innerHeight - r.bottom - 12));
    setPos({ left, width: W, top: r.bottom + 4, maxH }); // 항상 트리거 바로 아래
  }, [addable.length]);
  React.useEffect(() => {
    if (!open) return;
    place();
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onScroll = () => setOpen(false);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => { window.removeEventListener("mousedown", onDown); window.removeEventListener("scroll", onScroll, true); window.removeEventListener("resize", onScroll); };
  }, [open, place]);
  return (
    <div ref={ref} className="relative">
      <button ref={btnRef} onClick={() => setOpen((v) => !v)} disabled={!addable.length}
        className="flex w-full items-center justify-center gap-1.5 rounded py-2 text-[12px] font-semibold outline-none hover:bg-black/[.02] disabled:opacity-40"
        style={{ border: "1.5px dashed " + LINE2, color: GOLD_D, borderRadius: RADIUS }}>
        <Plus className="h-3.5 w-3.5" /> 요소 추가
      </button>
      {open && pos && addable.length > 0 && (
        <div className="fixed z-50 overflow-y-auto py-1" style={{ left: pos.left, top: pos.top, width: pos.width, maxHeight: pos.maxH, background: SURFACE, border: "1px solid " + LINE, borderRadius: RADIUS, boxShadow: "0 8px 24px rgba(0,0,0,.14)" }}>
          {addable.map((d) => {
            const E = TPL_EL[d.type] || {}; const Icon = E.icon || Sparkles;
            return (
              <button key={d.type} onClick={() => { onAdd(d.type); setOpen(false); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12.5px] outline-none hover:bg-black/[.03]" style={{ color: INK }}>
                <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: E.color }} />
                <span className="flex-1">{d.label}</span>
                <span className="text-[10px]" style={{ color: FAINT }}>{d.tag ?? (d.repeatable ? "여러 개" : "1개")}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// 즉시 추가 — 파일을 그 자리에서 골라 콘텐츠 허브에 등록하고 해당 클립에 바로 지정.
// (목업: 실제 파일을 선택해 이름·크기를 읽어 자산을 만든다. 본개발 시 업로드 → 자산 URL로 교체)
function InstantAddClip({ partner, onAdded }) {
  const ref = React.useRef(null);
  const onPick = (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = ""; // 같은 파일 다시 선택 가능하도록 초기화
    if (!f) return;
    const isVideo = f.type.startsWith("video") || /\.(mp4|mov|webm|m4v)$/i.test(f.name);
    const mb = f.size / (1024 * 1024);
    const asset = {
      id: "ct-" + Date.now(),
      kind: isVideo ? "clip" : "photo",
      partner,
      name: f.name,
      meta: isVideo ? "방금 추가됨 · 영상" : "방금 추가됨 · 이미지",
      size: mb >= 1 ? mb.toFixed(1) + "MB" : Math.max(1, Math.round(f.size / 1024)) + "KB",
    };
    actions.addContent(asset);
    onAdded(asset.id);
  };
  return (
    <>
      <button onClick={() => ref.current?.click()}
        className="flex shrink-0 items-center gap-1 rounded px-2 py-1.5 text-[11.5px] font-semibold outline-none hover:bg-black/[.02]"
        style={{ border: "1px solid " + LINE2, color: GOLD_D, borderRadius: RADIUS }} title="파일을 골라 허브에 바로 추가하고 이 클립에 지정">
        <Upload className="h-3.5 w-3.5" /> 즉시 추가
      </button>
      <input ref={ref} type="file" accept="video/*,image/*" className="hidden" onChange={onPick} />
    </>
  );
}

// 배경 음악 선택 — 공용 라이브러리에서 이 파트너 제작 링크에 노출할 곡을 최대 3개까지.
//   '음악 추가'로 그 자리에서 새 음원을 라이브러리에 올려 바로 선택할 수 있다.
//   미선택이면 제작 링크엔 공용 음악 전체가 노출된다(무중단 폴백).
function BgmPicker({ bgm, selected, onToggle, onAdd }) {
  const ref = React.useRef(null);
  const [busy, setBusy] = useState(false);
  const onPick = async (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = ""; // 같은 파일 다시 선택 가능하도록 초기화
    if (!f) return;
    setBusy(true);
    let meta = null;
    try { const m = await grabAudioMeta(f); const t = Math.round(m?.duration || 0); if (t) meta = Math.floor(t / 60) + ":" + String(t % 60).padStart(2, "0"); } catch { /* 메타 실패해도 업로드는 진행 */ }
    onAdd(f, meta, () => setBusy(false));
  };
  return (
    <div>
      <div className="space-y-1.5">
        {bgm.length === 0 && (
          <div className="rounded px-3 py-2.5 text-[12px]" style={{ background: "#faf8f3", color: FAINT, border: "1px dashed " + LINE2, borderRadius: RADIUS }}>
            등록된 음악이 없습니다. 아래 ‘음악 추가’로 음원을 올려 시작하세요.
          </div>
        )}
        {bgm.map((b) => {
          const on = selected.includes(b.id);
          const full = !on && selected.length >= BGM_MAX; // 3개 찼으면 미선택 곡은 비활성
          return (
            <button key={b.id} onClick={() => onToggle(b.id)} disabled={full}
              className="flex w-full items-center gap-2.5 rounded px-2.5 py-2 text-left outline-none transition hover:bg-black/[.02] disabled:cursor-not-allowed disabled:opacity-40"
              style={{ background: on ? GOLD_SOFT : "#faf8f3", border: "1px solid " + (on ? GOLD : LINE), borderRadius: RADIUS }}
              title={full ? "최대 3곡까지 선택할 수 있습니다" : (on ? "선택 해제" : "제작 링크에 노출")}>
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded" style={{ border: "1.5px solid " + (on ? GOLD_D : LINE2), background: on ? GOLD_D : "transparent" }}>
                {on && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
              </span>
              <Music className="h-4 w-4 shrink-0" style={{ color: "#3f5e87" }} />
              <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold" style={{ color: INK }}>{b.name}</span>
              {b.meta && <span className="shrink-0 text-[11px] tabular-nums" style={{ color: FAINT }}>{b.meta}</span>}
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <button onClick={() => ref.current?.click()} disabled={busy}
          className="flex shrink-0 items-center gap-1.5 rounded px-2.5 py-2 text-[12px] font-semibold outline-none hover:bg-black/[.02] disabled:opacity-50"
          style={{ border: "1.5px dashed " + LINE2, color: GOLD_D, borderRadius: RADIUS }} title="음원을 골라 라이브러리에 올리고 바로 선택">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} 음악 추가
        </button>
        <span className="text-[11px]" style={{ color: FAINT }}>{selected.length}/{BGM_MAX} 선택 · 미선택 시 공용 음악 전체 노출</span>
      </div>
      <input ref={ref} type="file" accept="audio/*" className="hidden" onChange={onPick} />
    </div>
  );
}

export function Templates() {
  const s = useStore();
  const { templates: storeTpls, content, bgm } = s;
  const allPartners = bizPartners(s); // 현재 사업부 파트너만
  const [tpls, setTpls] = useState(storeTpls); // 저장 전 초안 (전체 템플릿 맵)
  const dirty = JSON.stringify(tpls) !== JSON.stringify(storeTpls);
  const saveTpls = () => actions.replaceTemplates(tpls);
  const resetTpls = () => setTpls(storeTpls);
  const [drag, setDrag] = useState(null);     // 끌고 있는 블록 id
  const [dragOver, setDragOver] = useState(null); // 현재 hover 중인 블록 id
  // 목록(요약)만 보이고, 행을 누르면 그 파트너사 편집기가 펼쳐짐(아코디언) — 파트너사 증가 대비
  const partners = allPartners.filter((p) => p.active);
  const [open, setOpen] = useState(null); // 펼친 파트너사 id (1곳)
  const [q, setQ] = useState(""); // 파트너사 검색어
  const filtered = partners.filter((p) => matchQuery(q, p.name, p.region, p.manager));

  // 맨 위 기본 템플릿(신규 파트너 복제 원본) + 파트너사 목록 (검색 중에는 기본 템플릿 행 숨김)
  const defaultRow = { id: D.DEFAULT_TEMPLATE_ID, name: "기본 템플릿", isDefault: true };
  const rows = q.trim() ? filtered : [defaultRow, ...filtered];

  return (
    <div>
      <PageHeader title="영상 템플릿" sub="파트너사별 요소 구성·순서 편집 · 기본 요소(타이틀·추억 슬라이드·추억 영상·편지)는 각 1개, AI 영상은 A·B 딱 2개까지, 클립은 여러 개 · 클립 콘텐츠 선택 · 배경음악은 제작 링크에 노출할 곡 최대 3개 선택"
        right={
          <div className="flex items-center gap-2">
            <div className="flex items-center px-3" style={{ height: 36, width: 220, background: SURFACE, border: "1px solid " + LINE, borderRadius: RADIUS }}>
              <Search className="h-4 w-4 shrink-0" style={{ color: FAINT }} strokeWidth={1.9} />
              <input value={q} onChange={(e) => setQ(e.target.value)} className="ml-2 w-full bg-transparent text-[13px] outline-none" placeholder="파트너사·지역·담당자 검색" style={{ color: INK }} />
            </div>
            <Btn size="sm" variant="neutral" className="whitespace-nowrap" onClick={() => setOpen(D.DEFAULT_TEMPLATE_ID)}><LayoutTemplate className="h-4 w-4" /> 기본 템플릿 편집</Btn>
          </div>
        } />
      <SaveBar dirty={dirty} onSave={saveTpls} onReset={resetTpls} label="저장하지 않은 템플릿 변경이 있습니다 — 화면을 벗어나면 사라집니다." />
      <div className="space-y-2">
        {rows.map((p) => {
          const tpl = tpls[p.id] || { bgm: null, blocks: [] };
          const blocks = tpl.blocks || [];
          const total = blocks.reduce((s, b) => s + (D.elementDef(b.type)?.dur || 0), 0);
          const clipCount = blocks.filter((b) => b.type === "clip").length;
          // 콘텐츠 허브: 해당 파트너 영상(clip) + 이미지(photo) + 공용(shared) 자산(모든 파트너 공통)
          const assetOpts = content
            .filter((c) => (c.kind === "clip" || c.kind === "photo") && (c.partnerId === p.id || c.shared))
            .map((c) => ({ value: c.id, label: (c.kind === "clip" ? "🎬 영상 · " : "🖼 이미지 · ") + c.name + (c.shared ? " (공용)" : "") }));
          const noHub = assetOpts.length === 0;
          // AI 영상은 A·B 딱 2개까지 — 순서대로 A·B 라벨 부여
          const aiMax = D.elementDef("ai")?.max || 2;
          const aiCount = blocks.filter((b) => b.type === "ai").length;
          const aiLabelOf = (() => { let n = 0; const m = {}; blocks.forEach((b) => { if (b.type === "ai") m[b.id] = "AI 영상 " + String.fromCharCode(64 + (n += 1)); }); return (id) => m[id]; })();
          // 추가 가능한 요소: 기본 요소는 미사용 시에만, 클립은 항상, AI 영상은 2개 미만일 때만
          const usedBase = new Set(blocks.filter((b) => b.type !== "clip").map((b) => b.type));
          const addable = D.TEMPLATE_ELEMENTS
            .filter((e) => (e.type === "ai" ? aiCount < aiMax : e.repeatable || !usedBase.has(e.type)))
            .map((e) => (e.type === "ai" ? { ...e, label: "AI 영상 " + String.fromCharCode(64 + aiCount + 1), tag: "A·B 2개" } : e));

          const setBlocks = (fn) => setTpls((m) => ({ ...m, [p.id]: { ...(m[p.id] || { bgm: null, blocks: [] }), blocks: fn((m[p.id] && m[p.id].blocks) || []) } }));
          const addBlock = (type) => setBlocks((bs) => [...bs, { id: "e-" + Date.now(), type, ...(type === "clip" ? { assetId: null } : {}) }]);
          const removeBlock = async (id) => { if (await confirm({ title: "요소 삭제", message: "이 템플릿 요소를 삭제합니다.", danger: true })) setBlocks((bs) => bs.filter((b) => b.id !== id)); };
          const setAsset = (id, assetId) => setBlocks((bs) => bs.map((b) => (b.id === id ? { ...b, assetId } : b)));
          const move = (id, dir) => setBlocks((bs) => {
            const i = bs.findIndex((b) => b.id === id); const j = i + dir;
            if (j < 0 || j >= bs.length) return bs;
            const next = bs.slice(); [next[i], next[j]] = [next[j], next[i]]; return next;
          });
          // 드래그: 끌던 블록(fromId)을 대상 블록(toId) 위치로 이동
          const reorder = (fromId, toId) => setBlocks((bs) => {
            const from = bs.findIndex((b) => b.id === fromId); const to = bs.findIndex((b) => b.id === toId);
            if (from < 0 || to < 0 || from === to) return bs;
            const next = bs.slice(); const [m] = next.splice(from, 1); next.splice(to, 0, m); return next;
          });

          // 배경 음악 — 제작 링크에 노출할 곡(최대 3, 선택 순서 유지). 라이브러리에 아직 있는 id만 표시.
          //   이 파트너가 고를 수 있는 곡: 공용 + 이 파트너 전용(대상 지정). 다른 파트너 전용곡은 숨김.
          const partnerBgm = bgm.filter((b) => !b.partnerId || b.partnerId === p.id);
          const linkBgmIds = (tpl.linkBgmIds || []).filter((id) => partnerBgm.some((b) => b.id === id));
          const setLinkBgm = (fn) => setTpls((m) => ({ ...m, [p.id]: { ...(m[p.id] || { bgm: null, blocks: [], linkBgmIds: [] }), linkBgmIds: fn((m[p.id] && m[p.id].linkBgmIds) || []) } }));
          const toggleBgm = (id) => setLinkBgm((ids) => ids.includes(id) ? ids.filter((x) => x !== id) : (ids.length >= BGM_MAX ? ids : [...ids, id]));
          const addBgm = (file, meta, onFinish) => actions.addLibraryBgm(file, meta, (b) => {
            if (b) setLinkBgm((ids) => (ids.includes(b.id) || ids.length >= BGM_MAX ? ids : [...ids, b.id])); // 새 곡을 바로 선택(3개 미만일 때)
            onFinish?.();
          });

          const isOpen = open === p.id;
          return (
            <div key={p.id} className="overflow-hidden" style={{ background: SURFACE, border: "1px solid " + (p.isDefault ? GOLD_SOFT : LINE), borderRadius: RADIUS }}>
              {/* 요약 행 — 클릭 시 편집기 펼침 */}
              <button onClick={() => setOpen(isOpen ? null : p.id)}
                className="flex w-full items-center justify-between gap-3 px-4 text-left outline-none transition hover:bg-black/[.015] focus-visible:ring-1"
                style={{ height: 52, background: p.isDefault ? "#faf6ec" : undefined }}>
                <span className="flex min-w-0 items-center gap-2">
                  <ChevronRight className="h-4 w-4 shrink-0 transition-transform" style={{ color: FAINT, transform: isOpen ? "rotate(90deg)" : "none" }} />
                  <span className="truncate text-[13px] font-bold" style={{ color: INK }}>{p.name}</span>
                  {p.isDefault && <span className="shrink-0 px-1.5 py-0.5 text-[10.5px] font-bold" style={{ borderRadius: RADIUS, background: GOLD_SOFT, color: GOLD_D }}>신규 파트너 기본값</span>}
                </span>
                <span className="shrink-0 text-[11.5px] tabular-nums" style={{ color: FAINT }}>약 {mmss(total)} · {blocks.length}요소{p.isDefault ? "" : ` · 클립 ${clipCount}개`}{linkBgmIds.length ? ` · 음악 ${linkBgmIds.length}곡` : ""}</span>
              </button>

              {isOpen && (
              <div className="border-t p-4" style={{ borderColor: LINE }}>
              {p.isDefault && (
                <p className="mb-4 rounded px-3 py-2 text-[11.5px]" style={{ background: "#faf6ec", color: GOLD_D, border: "1px solid " + GOLD_SOFT, borderRadius: RADIUS }}>
                  신규 파트너사를 등록하면 이 구성·순서가 그대로 복제되어 시작됩니다. 클립은 파트너별 콘텐츠 허브 자산에 연결되므로 기본 템플릿에는 두지 않는 것을 권장합니다.
                </p>
              )}
              {/* 요소 구성 · 순서 — 기본 요소(각 1개) + 클립(n개), ▲▼로 순서변경. */}
              <div>
                <SectionLabel icon={LayoutTemplate} right={`${blocks.length}요소`}>요소 구성 · 순서</SectionLabel>
                <div className="space-y-1.5">
                  {blocks.length === 0 && (
                    <div className="rounded px-3 py-2.5 text-[12px]" style={{ background: "#faf8f3", color: FAINT, border: "1px dashed " + LINE2, borderRadius: RADIUS }}>
                      요소가 없습니다. 아래 ‘요소 추가’로 시작하세요.
                    </div>
                  )}
                  {blocks.map((b, i) => {
                    const def = D.elementDef(b.type) || {};
                    const E = TPL_EL[b.type] || {}; const Icon = E.icon || Sparkles;
                    const isClip = b.type === "clip";
                    const asset = isClip ? content.find((a) => a.id === b.assetId) : null;
                    const isDragging = drag === b.id;
                    const isTarget = dragOver === b.id && drag && drag !== b.id;
                    return (
                      <div key={b.id}
                        onDragEnter={(e) => { e.preventDefault(); if (drag && drag !== b.id) setDragOver(b.id); }}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => { if (drag && drag !== b.id) { reorder(drag, b.id); } setDrag(null); setDragOver(null); }}
                        onDragEnd={() => { setDrag(null); setDragOver(null); }}
                        className="flex items-center gap-2.5 rounded px-2.5 py-2"
                        style={{
                          background: "#faf8f3",
                          border: "1px solid " + (isDragging ? GOLD : isTarget ? GOLD_D : LINE),
                          borderLeft: "3px solid " + E.color,
                          borderRadius: RADIUS,
                          opacity: isDragging ? 0.45 : 1,
                          transform: isTarget ? "scale(1.012)" : "none", // scale(1)도 fixed 자식의 기준이 돼 드롭다운이 어긋남 → 평소엔 none

                          boxShadow: isTarget ? "0 2px 10px rgba(0,0,0,.08)" : "none",
                          transition: "transform 0.12s ease, box-shadow 0.12s ease, opacity 0.12s ease, border-color 0.1s ease",
                        }}>
                        <span draggable onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; setDrag(b.id); }} className="shrink-0 cursor-grab rounded p-0.5 active:cursor-grabbing" style={{ color: FAINT }} title="끌어서 순서 변경"><GripVertical className="h-3.5 w-3.5" /></span>
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold tabular-nums" style={{ background: "#e7e2d8", color: MUTE }}>{i + 1}</span>
                        <Icon className="h-4 w-4 shrink-0" style={{ color: E.color }} />
                        <span className="shrink-0 text-[12.5px] font-bold" style={{ color: INK, width: 84 }}>{b.type === "ai" ? aiLabelOf(b.id) : def.label}</span>
                        {isClip ? (
                          p.isDefault ? (
                            <span className="min-w-0 flex-1 truncate text-[11.5px]" style={{ color: FAINT }}>· 자산은 파트너별로 연결 (기본 템플릿은 구조만)</span>
                          ) : (
                          <>
                            <SearchSelect value={b.assetId || ""} onChange={(id) => setAsset(b.id, id)} width={260} placeholder={noHub ? "콘텐츠 허브 비어있음 — 먼저 업로드" : "콘텐츠 허브에서 영상/이미지 선택"} options={assetOpts} />
                            <InstantAddClip partner={p.name} onAdded={(id) => setAsset(b.id, id)} />
                            <span className="min-w-0 flex-1 truncate text-[11.5px]" style={{ color: asset ? FAINT : STATUS.review.c }}>{asset ? "· 발행 시 스냅샷 고정" : "· 자산 미지정"}</span>
                          </>
                          )
                        ) : (
                          <span className="min-w-0 flex-1 truncate text-[11.5px]" style={{ color: FAINT }}>{def.source} · {def.dur >= 60 ? mmss(def.dur) : def.dur + "초"}</span>
                        )}
                        <div className="flex shrink-0 items-center gap-0.5">
                          <button onClick={() => move(b.id, -1)} disabled={i === 0} className="rounded p-1 disabled:opacity-25" style={{ color: MUTE }} title="위로"><ChevronUp className="h-3.5 w-3.5" /></button>
                          <button onClick={() => move(b.id, 1)} disabled={i === blocks.length - 1} className="rounded p-1 disabled:opacity-25" style={{ color: MUTE }} title="아래로"><ChevronDown className="h-3.5 w-3.5" /></button>
                          <button onClick={() => removeBlock(b.id)} className="rounded p-1" style={{ color: STATUS.review.c }} title="요소 삭제"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      </div>
                    );
                  })}
                  <AddElementMenu addable={addable} onAdd={addBlock} />
                </div>
                {!p.isDefault && noHub && clipCount > 0 && (
                  <p className="mt-2 flex items-center gap-1 text-[11px]" style={{ color: STATUS.review.c }}>
                    <AlertTriangle className="h-3.5 w-3.5" /> 콘텐츠 허브에 자산이 없어 클립을 지정할 수 없습니다 — 콘텐츠 허브에서 먼저 업로드하세요.
                  </p>
                )}
              </div>
              {/* 배경 음악 — 이 파트너 제작 링크(보호자 화면)에 노출할 곡을 최대 3개까지. '음악 추가'로 바로 업로드. */}
              <div className="mt-4">
                <SectionLabel icon={Music} right={`${linkBgmIds.length}/${BGM_MAX}`}>배경 음악 · 제작 링크 노출</SectionLabel>
                <BgmPicker bgm={partnerBgm} selected={linkBgmIds} onToggle={toggleBgm} onAdd={addBgm} />
              </div>
              </div>
              )}
            </div>
          );
        })}
        {q.trim() && filtered.length === 0 && (
          <div className="px-4 py-10 text-center text-[12.5px]" style={{ color: FAINT, background: SURFACE, border: "1px solid " + LINE, borderRadius: RADIUS }}>
            ‘{q.trim()}’에 해당하는 파트너사가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}

