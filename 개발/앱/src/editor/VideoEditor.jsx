// 편집기 — 메인 셸. 예약→템플릿→블록 구성, 편집 문서(edits+gens)·되돌리기/다시 히스토리, 발행 단계 제어.
// 3패널(왼쪽 BlockList · 가운데 Preview+Timeline · 오른쪽 PropPanel)을 묶는다.
import React, { useState, useMemo, useEffect, useRef } from "react";
import { ChevronLeft, Undo2, Redo2, Save, Check, Volume2, RotateCcw, Send } from "lucide-react";
import { SERIF, MASTER, BG, SURFACE, LINE, GOLD, INK, MUTE, FAINT } from "../theme.js";
import { Btn } from "../ui.jsx";
import { toast } from "../toast.jsx";
import { confirm } from "../confirm.jsx";
import * as D from "../data.js";
import { useStore, actions, submissionFor } from "../store.js";
import { BACKEND_LIVE } from "../lib/supabase.js";
import * as storage from "../lib/storage.js";
import { DEV_PREVIEW } from "../lib/auth.js";
import { buildBlocks, buildRenderPlan } from "./blocks.js";
import { BlockList, Timeline } from "./timeline.jsx";
import { Preview } from "./preview.jsx";
import { PropPanel } from "./props.jsx";

const EMPTY = []; // 안정 참조(미노출 없음 기본값) — useMemo 의존성 흔들림 방지
const LIVE = BACKEND_LIVE && !DEV_PREVIEW; // store와 동일 기준 — 라이브에서만 DB 영속

// ── 메인 ───────────────────────────────────────────────────────
export default function VideoEditor({ reservation, onClose }) {
  const store = useStore(); // 템플릿·콘텐츠·파트너 구독 → 템플릿 변경이 제작에 즉시 반영
  // 열린 예약의 파트너 → 그 파트너 템플릿(없으면 기본 템플릿) → 편집기 블록·BGM
  const { blocks, bgmName, partnerId } = useMemo(() => {
    // 파트너 스코프 통일 — 예약의 partnerId 기준(동명이인 방지). 템플릿·BGM 쓰기에 이 값 사용.
    const pid = reservation?.partnerId || null;
    const tpl = (pid && store.templates[pid]) || store.templates[D.DEFAULT_TEMPLATE_ID] || { bgm: null, blocks: [] };
    return {
      blocks: buildBlocks(tpl, store.content, reservation),
      bgmName: (store.bgm.find((b) => b.id === tpl.bgm) || {}).name || "배경 음악", // 실 공용 BGM 라이브러리 기준
      partnerId: pid,
    };
  }, [store.partners, store.templates, store.content, store.bgm, reservation]);

  const firstBlockSel = () => ({ scope: "block", kind: blocks[0]?.type || "title", id: blocks[0]?.id });
  const [sel, setSel] = useState(firstBlockSel);

  // 편집 문서(편집값 edits + 결과물 gens) + 되돌리기/다시 히스토리(past/present/future)
  const initialDoc = useMemo(() => ({ edits: {}, gens: {}, subs: [] }), [blocks]); // gens: 실제 결과물은 reservationMedia로 표시(가짜 버전 시드 제거)
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
  // 자막 트랙 — 기본 없음(doc.subs). 편집값(텍스트·시간·위치)은 edits[자막id]로 병합(블록 id와 충돌 없음).
  const subsBase = doc.subs || EMPTY;
  const editedSubs = useMemo(() => subsBase.map((s) => ({ ...s, ...(edits[s.id] || {}) })), [subsBase, edits]);
  const name = (reservation && (reservation.deceased || reservation.name)) || D.EDITOR_RESERVATION.deceased;
  // 유저(보호자)가 완성한 실제 추모영상 — 워커가 적재한 최종본 서명URL. 미리보기 「원본」에서 재생.
  const sourceVideoUrl = (reservation?.id && submissionFor(store, reservation.id)?.videoUrl) || null;

  // 보호자 업로드 실제 자산(강아지 사진·영상·편지) 로드. 진입 시 1회.
  const media = store.reservationMedia?.[reservation?.id];
  const mediaLoading = ["queued", "rendering", "composing"].includes(media?.status); // 생성/합성 진행 중
  useEffect(() => { if (reservation?.id) actions.loadReservationMedia(reservation.id); }, [reservation?.id]);
  // 폴링은 "생성 중"일 때만 — 유휴 시엔 서명URL 재발급이 없어 미리보기 영상이 끊기지 않음(20초 클립 정상 재생).
  //   상한 200회(6s×200≈20분, reaper 15분보다 김) — 워커 중단 등으로 queued/composing 고착 시 무한 폴링 방지.
  const pollCount = useRef(0);
  useEffect(() => {
    if (!reservation?.id || !mediaLoading) return;
    pollCount.current = 0;
    const t = setInterval(() => {
      if (++pollCount.current > 200) { clearInterval(t); return; }
      actions.loadReservationMedia(reservation.id);
    }, 6000);
    return () => clearInterval(t);
  }, [reservation?.id, mediaLoading]);
  // 저장된 편집본(submissions.edit_doc.doc) 복원 — 미디어 로드 후 1회(아직 편집 전일 때만).
  const restoredRef = useRef(false);
  useEffect(() => {
    if (restoredRef.current) return;
    const saved = media?.editDoc?.doc;
    if (!saved) return;
    restoredRef.current = true;
    if (hist.past.length || hist.present !== savedDoc) return; // 이미 편집 중이면 덮어쓰지 않음
    const restored = { edits: saved.edits || {}, gens: {}, subs: saved.subs || [], ...(saved.layout ? { layout: saved.layout } : {}) };
    setHist({ past: [], present: restored, future: [] });
    setSavedDoc(restored);
  }, [media?.editDoc]); // eslint-disable-line react-hooks/exhaustive-deps
  // 클립(콘텐츠 허브 자산) 미리보기 — 클립 블록의 assetId → storage_path 서명URL.
  //   보호자 미디어와 무관(템플릿 고정 자산)이라 별도 맵으로 관리 → 목업 대신 실제 영상/이미지 재생.
  const [clipUrls, setClipUrls] = useState({}); // blockId → { kind:"videos"|"image", url, label }
  useEffect(() => {
    let alive = true;
    const clips = blocks.filter((b) => b.type === "clip" && b.assetId);
    if (!clips.length) { setClipUrls({}); return; }
    Promise.all(clips.map(async (b) => {
      const a = store.content.find((c) => c.id === b.assetId);
      if (!a?.storagePath) return null;                       // 미연결·미업로드 자산은 폴백(목업) 유지
      try {
        const url = await storage.signedUrl(storage.BUCKETS.content, a.storagePath);
        return [b.id, { kind: a.kind === "photo" ? "image" : "videos", url, label: "콘텐츠 허브 클립" + (a.name ? " · " + a.name : "") }];
      } catch { return null; }
    })).then((rows) => { if (alive) setClipUrls(Object.fromEntries(rows.filter(Boolean))); });
    return () => { alive = false; };
  }, [blocks, store.content]);

  // 블록 id → { source(보호자 원본), result(AI 생성 결과) }. 미리보기 좌=원본 / 우=작업본.
  const blockMedia = useMemo(() => {
    const m = {};
    if (!media) return m;
    const a = media.assets || [];
    const bySort = (p, q) => (p.sortOrder ?? 0) - (q.sortOrder ?? 0);
    const titleSrc = a.find((x) => x.role === "title" && x.url && x.selected) || a.find((x) => x.role === "title" && x.url);
    const titleVid = a.find((x) => x.role === "title_video" && x.url && x.selected);   // 활성 완성 타이틀 클립
    const titleRes = a.filter((x) => x.role === "title_result" && x.url && x.selected).sort(bySort); // 활성 버전만
    const aiSrc = a.filter((x) => x.role === "ai_video" && x.url && x.selected).sort(bySort); // 활성 소스만
    const aiRes = a.filter((x) => x.role === "ai_video_result" && x.url && x.selected).sort(bySort); // 활성 버전만
    const slideSrc = a.filter((x) => x.role === "slide_photo" && x.url).sort(bySort).map((x) => x.url);
    const slideRes = a.find((x) => x.role === "slide_video" && x.url && x.selected) || a.find((x) => x.role === "slide_video" && x.url);
    // 추억영상 미리보기(1·2 버튼) 순서를 sortOrder로 — 워커 합성 순서·props 음량 슬라이더와 동일 인덱스.
    const vidSrc = a.filter((x) => x.role === "memory_video" && x.url).sort(bySort).map((x) => x.url);
    editedBlocks.forEach((b) => {
      if (b.type === "title") m[b.id] = {
        source: titleSrc && { kind: "image", url: titleSrc.url, label: "보호자 독사진" },
        // 작업본 = ffmpeg 완성 타이틀 클립(20초). 없으면(생성 중) Seedream 이미지 폴백.
        result: titleVid ? { kind: "videos", urls: [titleVid.url], label: "타이틀 영상(완성 클립)" }
          : titleRes.length ? { kind: titleRes.length > 1 ? "images" : "image", url: titleRes[0].url, urls: titleRes.map((r) => r.url), label: `Seedream ${titleRes.length}장(합성 중)` } : null,
      };
      else if (b.type === "ai") { const i = (b.aiIndex || 1) - 1; const r = aiRes.find((x) => (x.sortOrder ?? 0) === i); m[b.id] = {
        source: aiSrc[i] && { kind: "image", url: aiSrc[i].url, label: "AI영상 소스 사진" },
        result: r && { kind: "videos", urls: [r.url], label: "AI 영상" },
      }; }
      else if (b.type === "slide") m[b.id] = {
        source: slideSrc.length && { kind: "images", urls: slideSrc, label: `보호자 사진 ${slideSrc.length}장` },
        result: slideRes && { kind: "videos", urls: [slideRes.url], label: "슬라이드 영상" },
      };
      else if (b.type === "video" && vidSrc.length) { const mv = { kind: "videos", urls: vidSrc, label: `보호자 영상 ${vidSrc.length}개` }; m[b.id] = { source: mv, result: mv }; } // 좌=원본·우=편집 중 동일(영상 2개↑면 미리보기 1/2 버튼으로 개별 재생)
      else if (b.type === "letter" && (b.text != null || media.letter)) m[b.id] = {
        // 좌(원본)=보호자 원본 그대로 / 우(작업본)=관리자 편집본(실시간 반영)
        source: media.letter ? { kind: "letter", text: media.letter, metDate: media.metDate ?? null, partDate: media.partDate ?? null } : null,
        result: { kind: "letter", text: b.text != null ? b.text : (media.letter || ""), metDate: b.metDate ?? media.metDate ?? null, partDate: b.partDate ?? media.partDate ?? null },
      };
    });
    return m;
  }, [media, editedBlocks]);

  // 클립 블록 미디어(보호자 미디어와 독립) → 좌·우 동일하게 실제 클립 표시. blockMedia에 머지(클립 키는 겹치지 않음).
  const clipMedia = useMemo(() => {
    const m = {};
    editedBlocks.forEach((b) => {
      if (b.type !== "clip") return;
      const cu = clipUrls[b.id];
      if (!cu) return;
      const mv = cu.kind === "image" ? { kind: "image", url: cu.url, label: cu.label } : { kind: "videos", urls: [cu.url], label: cu.label };
      m[b.id] = { source: mv, result: mv };
    });
    return m;
  }, [editedBlocks, clipUrls]);
  const blockMediaAll = useMemo(() => ({ ...clipMedia, ...blockMedia }), [clipMedia, blockMedia]);

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

  // 「AI로 만들기」 → 해당 블록만 실제 재생성(타이틀 Seedream / AI영상 Kling). 워커가 처리 후 미디어 폴링으로 갱신.
  const generate = (blockId) => {
    const blk = editedBlocks.find((b) => b.id === blockId);
    if (!blk) return;
    let target = null;
    if (blk.type === "title") target = "title";
    else if (blk.type === "ai") target = "ai:" + ((blk.aiIndex || 1) - 1);
    else if (blk.type === "slide") target = "slides";       // 보호자 사진 + 전환 → 슬라이드 영상(ffmpeg, 크레딧 없음)
    else { toast("편지는 최종 렌더에서 구성됩니다(개별 생성 대상 아님)"); return; }
    if (!reservation?.id) { toast("실제 예약에서만 생성이 동작합니다"); return; }
    actions.regenBlock(reservation.id, target);
    toast(blk.type === "slide" ? "슬라이드 영상을 만들고 있습니다 — 1~2분 후 자동 갱신됩니다" : "AI 재생성을 요청했습니다 — 1~2분 후 결과가 자동 갱신됩니다");
  };
  // 자막 추가/삭제 — 기본 없음에서 「자막 추가」로 넣고 미리보기/타임라인에서 배치. 텍스트·시간·위치는 edits로.
  const addSub = () => {
    const id = "sub-" + Date.now();
    const s = { id, text: "자막을 입력하세요", start: 0, end: 3, pos: "하단", font: D.SUBTITLE_FONT_DEFAULT, size: 48, color: "#f3e9c8", effect: D.SUBTITLE_EFFECT_DEFAULT };
    commit({ ...doc, subs: [...subsBase, s] });
    setSel({ scope: "subtitle", kind: "subtitle", id });
    toast("자막을 추가했습니다 — 미리보기에서 위치를 잡으세요");
  };
  const removeSub = (id) => {
    const nextEdits = { ...edits }; delete nextEdits[id];
    commit({ ...doc, subs: subsBase.filter((s) => s.id !== id), edits: nextEdits });
    if (sel.scope === "subtitle" && sel.id === id) setSel(firstBlockSel());
    toast("자막을 삭제했습니다");
  };
  // 자동본으로 — 편집값 비우고 모든 결과물 선택을 자동본(v0)으로
  const resetAuto = async () => {
    if (!(await confirm({ title: "자동본으로 되돌리기", message: "편집한 내용을 모두 비우고 자동 생성본으로 되돌립니다.", danger: true, confirmLabel: "되돌리기" }))) return;
    commit({ ...doc, edits: {} });
    toast("편집을 초기화했습니다");
  };
  const save = async () => {
    if (!(await confirm({ title: "저장", message: "편집한 내용을 저장합니다.\n다음 「최종 렌더」부터 합성에 반영됩니다." }))) return;
    const subId = media?.submissionId;
    // 2차 가공·목업(미연결)은 영속 대상이 없어 메모리 저장만.
    if (reservation?.secondJobId || !LIVE) { setSavedDoc(doc); toast("저장되었습니다"); return; }
    // 1차 예약인데 제작 자료(submission)가 아직 안 떴으면 = 저장 불가(거짓 성공 방지).
    if (!subId) { toast("저장할 수 없습니다 — 보호자 제작 자료를 아직 불러오지 못했습니다. 잠시 후 다시 시도해 주세요."); return; }
    const render = buildRenderPlan({ orderedVisible: visibleBlocks, edits, subs: editedSubs });
    try { await actions.saveEditDoc(reservation.id, subId, { v: 1, doc, render }); setSavedDoc(doc); toast("저장되었습니다 — 다음 최종 렌더부터 반영됩니다"); }
    catch (e) { toast("저장 실패: " + (e.message || e)); }
  };
  // 미저장 가드 — 자막·편집을 저장하지 않고 「뒤로」 나가면 사라지므로, dirty면 확인 후 닫기.
  const closeGuarded = async () => {
    if (dirty && !(await confirm({ title: "저장하지 않고 나가기", message: "저장하지 않은 편집 내용이 있습니다.\n저장하지 않고 나가면 사라집니다.", danger: true, confirmLabel: "나가기" }))) return;
    onClose && onClose();
  };

  // 템플릿 변경 등으로 선택한 블록이 사라지면 첫 블록으로 복귀
  useEffect(() => {
    if (sel.scope === "block" && !blocks.find((b) => b.id === sel.id)) setSel(firstBlockSel());
  }, [blocks]); // eslint-disable-line react-hooks/exhaustive-deps

  // 토스트는 전역 toast()(App 루트의 <ToastHost/>)로 통일 — editor 자체 토스트 미보유.
  // 단계 인식: 2차 가공이면 secondJob, 아니면 예약(1차)의 상태로 동작 분기.
  const seJob = reservation?.secondJobId || null;
  const stage = seJob ? reservation?.secondJobStatus : reservation?.status;
  // 블록(AI) 생성 진행 중 여부 — 진행 중이면 최종 렌더 요청 버튼을 잠근다(미완성 블록 compose 방지).
  const subStatus = (!seJob && reservation?.id) ? (media?.status || submissionFor(store, reservation.id)?.status) : null;
  const blockRendering = subStatus === "queued" || subStatus === "rendering";
  const setStage = (next) => {
    if (seJob) actions.setSecondJobStatus(seJob, next);
    else if (reservation && reservation.id) actions.setReservationStatus(reservation.id, next); // 목 DB 전파 → 큐·파트너·대시보드
  };

  // 작업 중 → 최종 렌더 시작 + 컨펌 대기로 보냄(렌더 완료 후 검수)
  const requestConfirm = async () => {
    // 블록 렌더 가드 — 블록(AI) 생성이 아직 도는 중이면 최종 합성을 트리거하지 않는다.
    //   미완성 블록으로 compose를 걸면 진행 중이던 블록 렌더가 compose_queued로 덮여 버려지고 워커가 실패한다.
    if (!seJob && reservation?.id) {
      // 편집기가 6초 폴링으로 갱신하는 media.status를 우선(가장 최신) — 없으면 큐 폴링(store) 폴백.
      const st = media?.status || submissionFor(store, reservation.id)?.status;
      if (st === "queued" || st === "rendering") { toast("블록 생성이 아직 진행 중입니다 — 완료 후 최종 렌더를 요청해 주세요"); return; }
      if (st === "compose_queued" || st === "composing") { toast("이미 최종 렌더가 진행 중입니다"); return; }
    }
    if (!(await confirm({ title: "최종 렌더 · 컨펌 요청", message: "최종 렌더링을 시작하고 컨펌 대기로 보냅니다.\n렌더 완료 후 검수 → 확인·컨펌하면 발행됩니다." }))) return;
    const patch = { status: "confirm", renderAt: Date.now(), renderDur: 90 + Math.floor(Math.random() * 120) }; // 렌더 예상 90~210초
    if (seJob) actions.updateSecondJob(seJob, patch);
    else if (reservation && reservation.id) {
      // 합성 트리거가 성공해야 예약을 컨펌 대기로 넘긴다 — 서버 가드가 진행 중 렌더를 거부하면 예약을 옮기지 않는다.
      try { await actions.requestCompose(reservation.id); }
      catch (e) { toast("최종 렌더를 시작할 수 없습니다 — " + (e.message || e)); return; }
      actions.updateReservation(reservation.id, patch);
    }
    toast("최종 렌더링을 시작했습니다 — 컨펌 대기");
    setTimeout(() => onClose && onClose(), 1000);
  };
  // 컨펌 대기 → 검수 확인 후 컨펌·발행. 단, 최종 합성(submission done)이 끝나야 발행 가능.
  const confirmPublish = async () => {
    if (!seJob && reservation?.id) {
      const sub = submissionFor(store, reservation.id);
      if (sub && sub.status !== "done") { toast("최종 렌더가 아직 진행 중입니다 — 완료 후 발행해 주세요"); return; }
    }
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
          <button onClick={closeGuarded} className="flex items-center gap-1 text-[13px] font-semibold" style={{ color: "#aab2bf" }}><ChevronLeft className="h-4 w-4" /> 뒤로</button>
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
            ? <Btn size="sm" onClick={requestConfirm} disabled={blockRendering}><Send className="h-3.5 w-3.5" strokeWidth={2.4} /> {blockRendering ? "블록 생성 중…" : "최종 렌더 · 컨펌 요청"}</Btn>
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
          <Preview sel={sel} blocks={panelBlocks} gens={gens} name={name} sourceVideoUrl={sourceVideoUrl} blockMedia={blockMediaAll} subtitles={editedSubs} onSubEdit={setEdit} onSelSub={(id) => setSel({ scope: "subtitle", kind: "subtitle", id })} />
          <Timeline blocks={timelineBlocks} edits={edits} bgmName={bgmName} subtitles={editedSubs} onSubChange={setEdit} onAddSub={addSub} onPickBgm={selectSlide} sel={sel} onSel={setSel} />
        </div>
        <aside className="w-80 shrink-0 overflow-y-auto" style={{ background: SURFACE, borderLeft: "1px solid " + LINE }}>
          <PropPanel key={sel.scope + sel.id} blocks={panelBlocks} subtitles={editedSubs} edits={edits} onEdit={setEdit} onRemoveSub={removeSub} reservation={reservation} partnerId={partnerId} bgmName={bgmName} media={media} blockMedia={blockMediaAll} onGenerate={generate} sel={sel} />
        </aside>
      </div>

      <div className="flex items-center gap-3 px-5 py-2 text-[11.5px]" style={{ background: SURFACE, borderTop: "1px solid " + LINE, color: FAINT }}>
        <Volume2 className="h-3.5 w-3.5" /> 배경 음악: {bgmName}
        <span className="ml-auto">{stage === "rendering" ? (blockRendering ? "블록(AI) 생성이 진행 중입니다 — 완료 후 「컨펌 요청」할 수 있습니다." : "최종 렌더 후 「컨펌 요청」하면 검수(컨펌 대기) 단계로 넘어갑니다.") : stage === "confirm" ? "결과물을 확인하고 「확인·컨펌」하면 발행됩니다." : "확정하면 전체가 하나로 합쳐져 발행됩니다."}</span>
      </div>
    </div>
  );
}
