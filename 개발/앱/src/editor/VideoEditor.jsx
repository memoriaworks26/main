// 편집기 — 메인 셸. 예약→템플릿→블록 구성, 편집 문서(edits+gens)·되돌리기/다시 히스토리, 발행 단계 제어.
// 3패널(왼쪽 BlockList · 가운데 Preview+Timeline · 오른쪽 PropPanel)을 묶는다.
import React, { useState, useMemo, useEffect } from "react";
import { ChevronLeft, Undo2, Redo2, Save, Check, Volume2, RotateCcw, Send } from "lucide-react";
import { SERIF, MASTER, BG, SURFACE, LINE, GOLD, INK, MUTE, FAINT } from "../theme.js";
import { Btn } from "../ui.jsx";
import { toast } from "../toast.jsx";
import { confirm } from "../confirm.jsx";
import * as D from "../data.js";
import { useStore, actions } from "../store.js";
import { buildBlocks, seedGens, genDefault } from "./blocks.js";
import { BlockList, Timeline } from "./timeline.jsx";
import { Preview } from "./preview.jsx";
import { PropPanel } from "./props.jsx";

const EMPTY = []; // 안정 참조(미노출 없음 기본값) — useMemo 의존성 흔들림 방지

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
  // 자막 트랙 — 편집값(텍스트·위치) 병합. 자막 id로 edits 보관(블록 id와 충돌 없음).
  const editedSubs = useMemo(() => (D.EDITOR_TIMELINE.subtitles || []).map((s) => ({ ...s, ...(edits[s.id] || {}) })), [edits]);
  const name = (reservation && (reservation.deceased || reservation.name)) || D.EDITOR_RESERVATION.deceased;

  // ── 블록 순서변경·미노출 ───────────────────────────────────────
  // 편집·컨펌(1차)·2차 가공 편집기 모두 블록 재구성 허용(실제 예약/잡을 연 경우).
  const secondMode = !!reservation?.secondJobId;             // 헤더 라벨 구분용(2차 가공 표기)
  const canArrange = !!(reservation?.id || reservation?.secondJobId); // 재구성 가능 여부
  const baseOrder = useMemo(() => blocks.map((b) => b.id), [blocks]);
  // doc.layout에 저장된 순서를 현재 블록과 정합화(템플릿이 바뀌어도 깨지지 않게: 사라진 id 제거 + 새 id는 뒤에 추가)
  const order = useMemo(() => {
    const stored = canArrange ? doc.layout?.order : null;
    if (!stored) return baseOrder;
    const kept = stored.filter((id) => baseOrder.includes(id));
    return [...kept, ...baseOrder.filter((id) => !kept.includes(id))];
  }, [canArrange, doc.layout, baseOrder]);
  const hidden = (canArrange && doc.layout?.hidden) || EMPTY;
  const orderedBlocks = useMemo(() => order.map((id) => editedBlocks.find((b) => b.id === id)).filter(Boolean), [order, editedBlocks]);
  const visibleBlocks = useMemo(() => orderedBlocks.filter((b) => !hidden.includes(b.id)), [orderedBlocks, hidden]);

  // 순서/미노출 변경 → 편집 문서에 커밋(undo/redo·저장과 연동)
  const setLayout = (patch) => commit({ ...doc, layout: { order, hidden, ...patch } });
  const moveBlock = (id, dir) => {
    const o = [...order]; const i = o.indexOf(id); const j = i + dir;
    if (i < 0 || j < 0 || j >= o.length) return;
    [o[i], o[j]] = [o[j], o[i]];
    setLayout({ order: o });
  };
  const toggleHide = (id) => setLayout({ hidden: hidden.includes(id) ? hidden.filter((x) => x !== id) : [...hidden, id] });
  // 패널에 넘길 블록: 재구성 가능하면 재정렬본(전체) / 타임라인은 노출본만
  const panelBlocks = canArrange ? orderedBlocks : editedBlocks;
  const timelineBlocks = canArrange ? visibleBlocks : editedBlocks;
  // 타임라인 음악 트랙 클릭 → 추억 슬라이드 블록 선택(거기서 BGM 편집)
  const selectSlide = () => { const s = editedBlocks.find((b) => b.type === "slide"); if (s) setSel({ scope: "block", kind: "slide", id: s.id }); };

  // "만들기" → 새 결과물 추가(최신 선택) · 썸네일은 버튼 하단 히스토리에 누적
  const generate = (blockId) => {
    const cur = gens[blockId] || genDefault(blockId);
    const v = { id: blockId + "-v" + Date.now() };
    commit({ ...doc, gens: { ...gens, [blockId]: { list: [...cur.list, v], sel: v.id } } });
    toast("새 결과물을 만들었습니다");
  };
  const selectGen = (blockId, vid) => commit({ ...doc, gens: { ...gens, [blockId]: { ...(gens[blockId] || genDefault(blockId)), sel: vid } } });
  // 만든 결과물 삭제 — 자동본은 제외. 선택본을 지우면 마지막 남은 버전으로 선택 이동.
  const deleteGen = (blockId, vid) => {
    const cur = gens[blockId] || genDefault(blockId);
    const list = cur.list.filter((v) => v.id !== vid);
    if (!list.length) return;
    const selId = cur.sel === vid ? list[list.length - 1].id : cur.sel;
    commit({ ...doc, gens: { ...gens, [blockId]: { list, sel: selId } } });
    toast("결과물을 삭제했습니다");
  };
  // 자동본으로 — 편집값 비우고 모든 결과물 선택을 자동본(v0)으로
  const resetAuto = async () => {
    if (!(await confirm({ title: "자동본으로 되돌리기", message: "편집한 내용을 모두 비우고 자동 생성본으로 되돌립니다.", danger: true, confirmLabel: "되돌리기" }))) return;
    const g0 = {};
    Object.keys(gens).forEach((id) => { g0[id] = { ...gens[id], sel: gens[id].list[0]?.id }; });
    commit({ edits: {}, gens: g0 });
    toast("자동 생성본으로 되돌렸습니다");
  };
  const save = async () => { if (!(await confirm({ title: "저장", message: "편집한 내용을 저장합니다." }))) return; setSavedDoc(doc); toast("저장되었습니다"); };

  // 템플릿 변경 등으로 선택한 블록이 사라지면 첫 블록으로 복귀
  useEffect(() => {
    if (sel.scope === "block" && !blocks.find((b) => b.id === sel.id)) setSel(firstBlockSel());
  }, [blocks]); // eslint-disable-line react-hooks/exhaustive-deps

  // 토스트는 전역 toast()(App 루트의 <ToastHost/>)로 통일 — editor 자체 토스트 미보유.
  // 단계 인식: 2차 가공이면 secondJob, 아니면 예약(1차)의 상태로 동작 분기.
  const seJob = reservation?.secondJobId || null;
  const stage = seJob ? reservation?.secondJobStatus : reservation?.status;
  const setStage = (next) => {
    if (seJob) actions.setSecondJobStatus(seJob, next);
    else if (reservation && reservation.id) actions.setReservationStatus(reservation.id, next); // 목 DB 전파 → 큐·파트너·대시보드
  };

  // 작업 중 → 최종 렌더 시작 + 컨펌 대기로 보냄(렌더 완료 후 검수)
  const requestConfirm = async () => {
    if (!(await confirm({ title: "최종 렌더 · 컨펌 요청", message: "최종 렌더링을 시작하고 컨펌 대기로 보냅니다.\n렌더 완료 후 검수 → 확인·컨펌하면 발행됩니다." }))) return;
    const patch = { status: "confirm", renderAt: Date.now(), renderDur: 90 + Math.floor(Math.random() * 120) }; // 렌더 예상 90~210초
    if (seJob) actions.updateSecondJob(seJob, patch);
    else if (reservation && reservation.id) actions.updateReservation(reservation.id, patch);
    toast("최종 렌더링을 시작했습니다 — 컨펌 대기");
    setTimeout(() => onClose && onClose(), 1000);
  };
  // 컨펌 대기 → 검수 확인 후 컨펌·발행
  const confirmPublish = async () => {
    if (!(await confirm({ title: "확인·컨펌", message: "최종 렌더링 결과물을 확인하고 컨펌·발행합니다.\n발행 후에는 고객에게 노출됩니다." }))) return;
    setStage("published");
    toast("확인·컨펌되어 발행되었습니다");
    setTimeout(() => onClose && onClose(), 1000);
  };
  // 단계 외(룸 편집 등) 폴백 — 바로 확정·발행
  const publish = async () => {
    if (!(await confirm({ title: "확정·발행", message: "이 추모영상을 확정하고 발행합니다.\n발행 후에는 고객에게 노출됩니다." }))) return;
    setStage("published");
    toast("확정·발행되었습니다");
    setTimeout(() => onClose && onClose(), 1000);
  };

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 44px)", background: BG }}>
      <div className="flex items-center justify-between px-4" style={{ background: MASTER, height: 52 }}>
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="flex items-center gap-1 text-[13px] font-semibold" style={{ color: "#aab2bf" }}><ChevronLeft className="h-4 w-4" /> 뒤로</button>
          <span className="h-4 w-px" style={{ background: "#2c3744" }} />
          <span className="text-[14px] font-bold" style={{ color: "#eef0f3", fontFamily: SERIF }}>{name}</span>
          <span className="text-[12px]" style={{ color: "#5a6472" }}>{secondMode ? "추모영상 편집 · 2차 가공" : "추모영상 편집"}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={undo} disabled={!hist.past.length} className="flex items-center gap-1 px-2 py-1.5 text-[12px] disabled:opacity-35" style={{ color: "#aab2bf" }}><Undo2 className="h-3.5 w-3.5" /> 되돌리기</button>
          <button onClick={redo} disabled={!hist.future.length} className="flex items-center gap-1 px-2 py-1.5 text-[12px] disabled:opacity-35" style={{ color: "#aab2bf" }}><Redo2 className="h-3.5 w-3.5" /> 다시</button>
          <span className="h-4 w-px" style={{ background: "#2c3744" }} />
          <button onClick={resetAuto} className="flex items-center gap-1 px-2.5 py-1.5 text-[12px] font-semibold" style={{ color: "#aab2bf" }}><RotateCcw className="h-3.5 w-3.5" /> 자동본으로</button>
          <Btn size="sm" variant="neutral" onClick={save}>
            <Save className="h-3.5 w-3.5" /> 저장{dirty && <span className="ml-0.5" style={{ color: GOLD }}>•</span>}
          </Btn>
          {stage === "rendering"
            ? <Btn size="sm" onClick={requestConfirm}><Send className="h-3.5 w-3.5" strokeWidth={2.4} /> 최종 렌더 · 컨펌 요청</Btn>
            : stage === "confirm"
            ? <Btn size="sm" onClick={confirmPublish}><Check className="h-4 w-4" strokeWidth={2.4} /> 확인 · 컨펌(발행)</Btn>
            : <Btn size="sm" onClick={publish}><Check className="h-4 w-4" strokeWidth={2.4} /> 확정·발행</Btn>}
        </div>
      </div>

      <div className="flex items-center gap-2 px-5 py-1.5 text-[12px]" style={{ background: "#faf7f1", borderBottom: "1px solid " + LINE, color: MUTE }}>
        <span className="flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: GOLD }}>?</span>
        왼쪽에서 <b style={{ color: INK }}>블록</b>을 고르거나 아래 <b style={{ color: INK }}>타임라인</b>에서 블록·자막을 눌러 편집하세요. 배경 음악은 <b style={{ color: INK }}>추억 슬라이드</b> 블록에서 설정합니다.
      </div>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-64 shrink-0 overflow-y-auto px-3.5 py-4" style={{ background: SURFACE, borderRight: "1px solid " + LINE }}>
          <BlockList blocks={panelBlocks} sel={sel} onSel={setSel} arrange={canArrange} hidden={hidden} onMove={moveBlock} onToggleHide={toggleHide} />
        </aside>
        <div className="flex flex-1 flex-col overflow-y-auto px-6 py-5">
          <Preview sel={sel} blocks={panelBlocks} gens={gens} name={name} />
          <Timeline blocks={timelineBlocks} edits={edits} bgmName={bgmName} subtitles={editedSubs} onSubChange={setEdit} onPickBgm={selectSlide} sel={sel} onSel={setSel} />
        </div>
        <aside className="w-80 shrink-0 overflow-y-auto" style={{ background: SURFACE, borderLeft: "1px solid " + LINE }}>
          <PropPanel key={sel.scope + sel.id} blocks={panelBlocks} subtitles={editedSubs} edits={edits} onEdit={setEdit} reservation={reservation} bgmName={bgmName} gens={gens} onGenerate={generate} onSelectGen={selectGen} onDeleteGen={deleteGen} sel={sel} />
        </aside>
      </div>

      <div className="flex items-center gap-3 px-5 py-2 text-[11.5px]" style={{ background: SURFACE, borderTop: "1px solid " + LINE, color: FAINT }}>
        <Volume2 className="h-3.5 w-3.5" /> 배경 음악: {bgmName}
        <span className="ml-auto">{stage === "rendering" ? "최종 렌더 후 「컨펌 요청」하면 검수(컨펌 대기) 단계로 넘어갑니다." : stage === "confirm" ? "결과물을 확인하고 「확인·컨펌」하면 발행됩니다." : "확정하면 전체가 하나로 합쳐져 발행됩니다."}</span>
      </div>
    </div>
  );
}
