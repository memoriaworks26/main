// [추모영상 제작] 편집·컨펌(Production) + 2차 가공(SecondEdit).
import React, { useState, useEffect } from "react";
import {
  ChevronRight, Clock, FolderOpen, Plus, Search, UserPlus, X,
  Check, PlayCircle, RefreshCw, Film, Loader2, SlidersHorizontal,
} from "lucide-react";
import { SERIF, SURFACE, LINE, LINE2, GOLD, GOLD_D, GOLD_SOFT, INK, MUTE, FAINT, RADIUS, SUB_LABEL, SUB_LOADING } from "../theme.js";
import { Tag, Btn, PageHeader } from "../ui.jsx";
import { useStore, actions, bizPartners, bizReservations, submissionFor, videoFor } from "../store.js";
import { confirm } from "../confirm.jsx";
import { matchQuery } from "../lib/util.js";
import * as D from "../data.js";
import { SearchSelect } from "./shared.jsx";
import { PromptModal } from "../editor/props.jsx"; // 기본 프롬프트 관리(타깃별 활성=보호자 자동 생성에 사용)

const CONFIRM_C = "#6d5aa6"; // 컨펌 대기(렌더·검수) 강조색 — theme STATUS.confirm와 동일

// 컨펌 대기 = 최종 렌더 진행. renderAt(ms)/renderDur(초)로 진행률 산출 — 값 없으면 완료로 간주.
function renderInfo(item) {
  if (!item || !item.renderAt) return { pct: 100, remain: 0, done: true };
  const dur = item.renderDur || 150;
  const elapsed = (Date.now() - item.renderAt) / 1000;
  const pct = Math.min(100, (elapsed / dur) * 100);
  return { pct, remain: Math.max(0, Math.ceil(dur - elapsed)), done: pct >= 100 };
}
const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

// 컨펌 대기 셀 — 렌더 진행 중이면 진행률·남은시간, 완료되면 「검수」 버튼(렌더 결과물 보기 → 컨펌/재제작)
function ConfirmCell({ item, onReview }) {
  const [, force] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => { force((x) => x + 1); if (renderInfo(item).done) clearInterval(iv); }, 1000);
    if (renderInfo(item).done) clearInterval(iv);
    return () => clearInterval(iv);
  }, [item.renderAt, item.renderDur]);
  const { pct, remain, done } = renderInfo(item);
  if (done) return <Btn size="sm" variant="ghost" onClick={onReview}><PlayCircle className="h-3.5 w-3.5" /> 검수</Btn>;
  return (
    <div className="flex items-center gap-2" title="최종 렌더링 진행 중">
      <div style={{ width: 72, height: 5, background: LINE2, borderRadius: 99, overflow: "hidden" }}>
        <div style={{ width: pct + "%", height: "100%", background: CONFIRM_C, borderRadius: 99, transition: "width .9s linear" }} />
      </div>
      <span className="text-[11px] font-semibold tabular-nums" style={{ color: CONFIRM_C }}>렌더 {Math.floor(pct)}% · {mmss(remain)} 남음</span>
    </div>
  );
}

// 검수 창 — 최종 렌더링된 결과물(실제 영상)을 재생해 보고 확인·컨펌(발행) 또는 재제작(반려).
//   videoUrl: 워커가 적재한 최종본 서명URL(submissions.video_url). 없으면 placeholder.
//   readOnly: 이미 발행된 건(발행 완료 탭)에서 다시보기 — 컨펌/재제작 숨김, 닫기만.
function ReviewModal({ r, reason, videoUrl, finalMB, readOnly, onConfirm, onRemake, onClose }) {
  const file = `${r.deceased}_추모영상.mp4`;
  const [dur, setDur] = useState(null);
  const fmtDur = (s) => (s == null ? "—" : `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`);
  const meta = [
    ["해상도", "1920 × 1080 (FHD)"],
    ["길이", fmtDur(dur)],
    ["용량", finalMB != null ? `${finalMB} MB` : "—"],
    ["상태", videoUrl ? "렌더 완료" : "준비 중"],
  ];
  return (
    <div className="mw-fade fixed inset-0 z-[55] flex items-center justify-center p-4" style={{ background: "rgba(20,24,30,.55)" }} onClick={onClose}>
      <div className="mw-pop w-full overflow-hidden" style={{ maxWidth: 560, background: SURFACE, borderRadius: RADIUS, border: "1px solid " + LINE }} onClick={(e) => e.stopPropagation()}>
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: "1px solid " + LINE }}>
          <div className="flex items-baseline gap-2">
            <span style={{ fontFamily: SERIF, fontSize: 17, fontWeight: 700, color: INK }}>{r.deceased}</span>
            <span className="text-[12px]" style={{ color: MUTE }}>{r.partner} · {r.room}</span>
            {reason && <span className="px-1.5 py-[1px] text-[11px] font-semibold" style={{ background: GOLD_SOFT, color: GOLD_D, borderRadius: 3 }}>{reason}</span>}
          </div>
          <button onClick={onClose} className="p-1" style={{ color: FAINT }}><X className="h-4 w-4" /></button>
        </div>
        {/* 렌더 결과물 미리보기 — 실제 영상 재생 */}
        <div className="px-5 pt-4">
          <div className="relative flex items-center justify-center" style={{ aspectRatio: "16/9", background: "#1d242e", borderRadius: RADIUS, overflow: "hidden" }}>
            <span className="absolute left-2.5 top-2.5 z-10 inline-flex items-center gap-1 px-2 py-[3px] text-[10.5px] font-semibold" style={{ background: "rgba(0,0,0,.45)", color: "#dfe4ea", borderRadius: 3 }}>
              <Film className="h-3 w-3" /> 최종 렌더 결과물
            </span>
            {videoUrl ? (
              <video src={videoUrl} controls playsInline preload="metadata"
                className="absolute inset-0 h-full w-full" style={{ background: "#000" }}
                onLoadedMetadata={(e) => setDur(e.currentTarget.duration)} />
            ) : (
              <span className="text-[12px]" style={{ color: "#aab2bf" }}>렌더 결과물이 아직 없습니다</span>
            )}
          </div>
          {/* 메타 */}
          <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5">
            {meta.map(([k, v]) => (
              <div key={k} className="flex items-center justify-between text-[12.5px]">
                <span style={{ color: MUTE }}>{k}</span><span className="tabular-nums" style={{ color: INK }}>{v}</span>
              </div>
            ))}
          </div>
          <div className="mt-1.5 truncate text-[11px]" style={{ color: FAINT, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{file}</div>
        </div>
        {/* 액션 */}
        <div className="mt-4 px-5 py-3" style={{ borderTop: "1px solid " + LINE, background: "#faf8f3" }}>
          {readOnly ? (
            <div className="flex items-center justify-between">
              <p className="text-[11.5px]" style={{ color: FAINT }}>이미 발행된 결과물입니다.</p>
              <Btn size="sm" variant="neutral" onClick={onClose}>닫기</Btn>
            </div>
          ) : (
            <>
              <p className="text-[11.5px]" style={{ color: FAINT }}>결과물을 확인하고 컨펌하거나, 수정이 필요하면 재제작으로 반려합니다.</p>
              <div className="mt-2.5 flex items-center justify-end gap-2">
                <Btn size="sm" variant="neutral" onClick={onRemake}><RefreshCw className="h-3.5 w-3.5" /> 재제작</Btn>
                <Btn size="sm" onClick={onConfirm}><Check className="h-4 w-4" strokeWidth={2.4} /> 확인 · 컨펌(발행)</Btn>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const PROD_TABS = [
  { key: "review", label: "접수 대기", match: (s) => s === "review" },
  { key: "work", label: "작업 중", match: (s) => s === "rendering" },
  { key: "confirm", label: "컨펌 대기", match: (s) => s === "confirm" },
  { key: "published", label: "발행 완료", match: (s) => s === "published" },
];

// [Phase9] 편집기 열기 버튼 — 다른 작업자가 잠금 중이면 비활성 + "OOO 편집 중"(+master 강제해제).
function EditorOpenBtn({ kind, id, account, editLocks, onOpen, label = "편집기 열기" }) {
  const lock = (editLocks || []).find((l) => l.targetKind === kind && l.targetId === id);
  const mine = lock && account && lock.lockedBy === account.id;
  if (lock && !mine) {
    return (
      <span className="inline-flex items-center gap-2">
        <span className="inline-flex items-center gap-1 text-[12px] font-semibold" style={{ color: MUTE }}>🔒 {lock.lockedByName || "다른 작업자"} 편집 중</span>
        {account?.role === "master" && <Btn size="sm" variant="ghost" onClick={() => actions.forceReleaseEditLock(kind, id)}>강제해제</Btn>}
      </span>
    );
  }
  return <Btn size="sm" variant="ghost" onClick={onOpen}>{label} <ChevronRight className="h-3.5 w-3.5" /></Btn>;
}

// 편집기 잠금 현황 주기 폴링(라이브). 다른 작업자 잠금이 화면에 반영되도록.
function useLockPoll() {
  useEffect(() => { actions.refreshLocks(); const t = setInterval(() => actions.refreshLocks(), 15000); return () => clearInterval(t); }, []);
}

// 큐(예약·제출·영상) 주기 폴링 — 워커 렌더 완료가 컨펌 대기→발행/검수에 자동 반영되도록.
function useProductionPoll() {
  useEffect(() => { actions.refreshProduction(); const t = setInterval(() => actions.refreshProduction(), 12000); return () => clearInterval(t); }, []);
}

export function Production({ onOpenEditor, account }) {
  const s = useStore(); // 목 DB — 상태·담당자 전 화면 공유
  useLockPoll(); useProductionPoll();
  const reservations = bizReservations(s); // 현재 사업부 예약만
  const partners = bizPartners(s);
  const [tab, setTab] = useState("review");
  const [pf, setPf] = useState("all");
  const [review, setReview] = useState(null); // 검수 창에 띄운 예약(컨펌 대기 · 렌더 완료 건)
  const [promptModal, setPromptModal] = useState(false); // 기본 프롬프트 관리 모달
  const st = (r) => r.status;
  const me = account?.name;
  const claim = (id) => { actions.setReservationAssignee(id, me); actions.setReservationStatus(id, "rendering"); }; // 받기 → 작업 중
  const release = (id) => { actions.setReservationAssignee(id, null); actions.setReservationStatus(id, "review"); };
  // 검수 → 확인·컨펌(발행) / 재제작(작업 중으로 반려 · 렌더 정보 초기화)
  const doConfirm = async (r) => {
    if (!(await confirm({ title: "확인·컨펌", message: "최종 렌더 결과물을 컨펌하고 발행합니다.\n발행 후에는 고객에게 노출됩니다." }))) return;
    actions.setReservationStatus(r.id, "published"); setReview(null);
  };
  const doRemake = async (r) => {
    if (!(await confirm({ title: "재제작", message: "결과물을 반려하고 작업 중으로 되돌립니다.\n담당자가 다시 편집·렌더합니다.", danger: true, confirmLabel: "재제작" }))) return;
    actions.updateReservation(r.id, { status: "rendering", renderAt: null, renderDur: null }); setReview(null);
  };
  // 접수 대기 = 예약 생성이 아니라 "보호자(유저)가 제작 요청을 제출"한 건만 큐에 노출.
  // 예약만 발급되고 보호자가 아직 작성 중(submission 없음 or status=draft)인 건은 큐에 올리지 않는다.
  const requested = (r) => { const sub = submissionFor(s, r.id); return !!sub && sub.status !== "draft"; };
  const inTab = (r, t) => t.match(r.status) && (t.key !== "review" || requested(r));
  const tabDef = PROD_TABS.find((t) => t.key === tab);
  const rows = reservations
    .filter((r) => inTab(r, tabDef))
    .filter((r) => pf === "all" || r.partner === pf)
    .sort((a, b) => String(a.requestedAt ?? "").localeCompare(String(b.requestedAt ?? ""))); // 먼저 요청된 순(null 안전)

  const count = (t) => reservations.filter((r) => inTab(r, t)).length;

  return (
    <div style={{ maxWidth: 700 }}>
      <PageHeader title="편집·컨펌" sub="전 파트너사 유입 영상 — 먼저 요청된 순 처리 큐" right={
        <div className="flex items-center gap-2">
          <Btn size="sm" variant="neutral" onClick={() => setPromptModal(true)}><SlidersHorizontal className="h-3.5 w-3.5" /> 기본 프롬프트</Btn>
          <SearchSelect value={pf} onChange={setPf} placeholder="전체 파트너사"
            options={[{ value: "all", label: "전체 파트너사" }, ...partners.filter((p) => p.active).map((p) => ({ value: p.name, label: p.name }))]} />
        </div>
      } />

      {/* 상태 탭 */}
      <div className="mb-3 flex items-center gap-1.5">
        {PROD_TABS.map((t) => {
          const on = tab === t.key;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="px-3 py-1.5 text-[12.5px] font-semibold outline-none transition focus-visible:ring-1"
              style={{ borderRadius: RADIUS, background: on ? GOLD_SOFT : "transparent", color: on ? GOLD_D : MUTE, border: "1px solid " + (on ? GOLD_SOFT : LINE) }}>
              {t.label} <span className="tabular-nums" style={{ color: on ? GOLD_D : FAINT }}>{count(t)}</span>
            </button>
          );
        })}
      </div>

      {/* 처리 큐 (조밀한 행) */}
      <div className="overflow-hidden" style={{ border: "1px solid " + LINE, borderRadius: RADIUS, background: SURFACE }}>
        {rows.length === 0 && (
          <div className="px-4 py-8 text-center text-[13px]" style={{ color: FAINT }}>
            {tab === "review" ? "보호자가 제작 요청을 제출하면 여기에 표시됩니다." : "해당 상태의 예약이 없습니다."}
          </div>
        )}
        {rows.map((r, i) => {
          const cur = st(r);
          const who = r.assignee;
          const mine = who && who === me; // 담당자 표시용(작업자 칩). 편집기 진입은 누구나 가능
          return (
            <div key={r.id} className="flex items-center gap-3 px-3 py-2.5"
              style={{ borderTop: i ? "1px solid " + LINE : "none" }}>
              {/* 요청 시각 (정렬 기준 · 가장 왼쪽 고정폭 · 분단위) */}
              <div className="flex w-28 shrink-0 items-center gap-1">
                <Clock className="h-3.5 w-3.5 shrink-0" style={{ color: FAINT }} strokeWidth={2} />
                <span className="text-[12px] font-semibold tabular-nums" style={{ color: MUTE }}>{r.requestedAt}</span>
              </div>
              {/* 반려동물 · 파트너/호실/보호자 + 보호자 제출상태 */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span style={{ fontFamily: SERIF, fontSize: 15, fontWeight: 700, color: INK }}>{r.deceased}</span>
                  {(() => {
                    const sub = submissionFor(s, r.id);
                    const done = sub?.status === "done";
                    const submitted = sub && sub.status !== "draft";
                    const loading = sub && SUB_LOADING.includes(sub.status);
                    const failed = sub?.status === "failed";
                    return (
                      <span className="inline-flex shrink-0 items-center gap-1 px-1.5 py-0.5 text-[10.5px] font-bold" style={{ borderRadius: RADIUS,
                        background: failed ? "#f7ecec" : loading ? "#fff4e0" : done ? "#e9f1ee" : submitted ? "#e9eef5" : "#f4ead7",
                        color: failed ? "#a23b3b" : loading ? "#9a6a1c" : done ? "#3a7468" : submitted ? "#3f5e87" : "#9a6a1c" }}>
                        {loading && <Loader2 className="h-3 w-3 animate-spin" />}
                        보호자 {sub ? (SUB_LABEL[sub.status] || sub.status) : "미발급"}
                      </span>
                    );
                  })()}
                </div>
                <div className="mt-0.5 truncate text-[11.5px]" style={{ color: MUTE }}>{r.partner} · {r.room} · 보호자 {r.chief}</div>
              </div>
              {/* 우측 묶음 — 상태별 요소만 오른쪽에 붙여 표시(중간 공백 없이)
                  · 접수대기: 상태 + 받기
                  · 작업 중: 상태 + 편집기 열기 + 작업자(해제 가능)
                  · 컨펌대기: 상태 + 편집기 열기(검수·컨펌) + 작업자
                  · 발행완료: 상태 + 편집기 열기 + 작업자 */}
              <div className="ml-auto flex shrink-0 items-center gap-2">
                <Tag s={cur} />
                {cur === "confirm" ? (
                  <ConfirmCell item={r} onReview={() => setReview(r)} />
                ) : (
                  <>
                    {cur === "published" && submissionFor(s, r.id)?.videoUrl && (
                      <Btn size="sm" variant="ghost" onClick={() => setReview(r)}><PlayCircle className="h-3.5 w-3.5" /> 미리보기</Btn>
                    )}
                    <EditorOpenBtn kind="reservation" id={r.id} account={account} editLocks={s.editLocks} onOpen={() => onOpenEditor(r)} />
                  </>
                )}
                {who ? (
                  <span className="inline-flex items-center gap-1.5 group" title={mine ? "내가 받음 — 클릭 시 해제" : "담당: " + who}>
                    <span className="flex h-5 w-5 items-center justify-center rounded-full text-[9.5px] font-bold text-white" style={{ background: mine ? GOLD : "#3f5e87" }}>{who.slice(0, 1)}</span>
                    <span className="text-[12px] font-semibold" style={{ color: INK }}>{who}{mine && <span className="ml-0.5 text-[10.5px]" style={{ color: GOLD_D }}>·나</span>}</span>
                    {mine && cur === "rendering" && <button onClick={() => release(r.id)} className="ml-0.5 opacity-0 transition group-hover:opacity-100" style={{ color: FAINT }}><X className="h-3.5 w-3.5" /></button>}
                  </span>
                ) : (
                  <Btn size="sm" onClick={() => claim(r.id)}><UserPlus className="h-3.5 w-3.5" /> 받기</Btn>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[11px] leading-relaxed" style={{ color: FAINT }}>
        ※ 흐름: 보호자가 제작 요청 제출 → 접수 대기 →「받기」작업 중 → 편집기에서 「최종 렌더·컨펌 요청」→ 컨펌 대기(렌더 진행률 표시) → 렌더 완료 후 「검수」로 결과물 확인 → 「확인·컨펌」발행 / 수정 필요 시 「재제작」으로 작업 중 반려.
        정렬은 요청 시각 오름차순(먼저 요청된 건이 상단) — 가장 왼쪽에 요청 시각을 분단위로 표시.
        담당자 = 해당 건을 받은 작업자(미배정은 「받기」로 본인 배정 · 작업 중인 본인 건은 ✕로 해제). 누가 처리 중인지 한눈에 확인.
      </p>

      {review && <ReviewModal r={review} videoUrl={submissionFor(s, review.id)?.videoUrl} finalMB={videoFor(s, review.id)?.finalMB}
        readOnly={review.status === "published"} onConfirm={() => doConfirm(review)} onRemake={() => doRemake(review)} onClose={() => setReview(null)} />}
      <PromptModal open={promptModal} onClose={() => setPromptModal(false)} />
    </div>
  );
}

// ── 2차 가공 (별도 큐 — 1차 완료 건 불러오기 → 2차 가공 대기·제작중·발행) ──
const SE_STATUS = {
  pending: { label: "2차 가공 대기", c: "#9a6a1c", bg: "#f4ead7" },
  rendering: { label: "작업 중", c: "#3f5e87", bg: "#e9eef5" },
  confirm: { label: "컨펌 대기", c: "#6d5aa6", bg: "#ece8f4" },
  published: { label: "발행 완료", c: "#3a7468", bg: "#e9f1ee" },
};
const SE_TABS = [
  { key: "pending", label: "2차 가공 대기" },
  { key: "rendering", label: "작업 중" },
  { key: "confirm", label: "컨펌 대기" },
  { key: "published", label: "발행 완료" },
];

export function SecondEdit({ onOpenEditor, account }) {
  const s = useStore(); // 목 DB — 1차 발행 건이 후보로 전파
  useLockPoll(); useProductionPoll();
  const reservations = bizReservations(s); // 현재 사업부 예약만
  const partners = bizPartners(s);
  const resvIds = new Set(reservations.map((r) => r.id));
  const jobs = s.secondJobs.filter((j) => resvIds.has(j.reservId)); // 사업부 예약의 2차 가공 잡만
  const [tab, setTab] = useState("pending");
  const [picking, setPicking] = useState(false);
  const [q, setQ] = useState("");
  const [lf, setLf] = useState("전체"); // 불러오기 파트너사 필터
  const [review, setReview] = useState(null); // { r, job } — 검수 창
  const me = account?.name;

  const reservOf = (id) => reservations.find((r) => r.id === id);
  // 「받기」 — 본인 배정 + 2차 가공 대기 → 작업 중 전환
  const claim = (id) => { actions.setSecondJobAssignee(id, me); actions.setSecondJobStatus(id, "rendering"); };
  const release = (id) => { actions.setSecondJobAssignee(id, null); actions.setSecondJobStatus(id, "pending"); };
  // 검수 → 확인·컨펌(발행) / 재제작(작업 중으로 반려 · 렌더 정보 초기화)
  const doConfirm = async (job) => {
    if (!(await confirm({ title: "확인·컨펌", message: "최종 렌더 결과물을 컨펌하고 발행합니다.\n발행 시 기존 링크가 갱신됩니다." }))) return;
    actions.setSecondJobStatus(job.id, "published"); setReview(null);
  };
  const doRemake = async (job) => {
    if (!(await confirm({ title: "재제작", message: "결과물을 반려하고 작업 중으로 되돌립니다.\n담당자가 다시 편집·렌더합니다.", danger: true, confirmLabel: "재제작" }))) return;
    actions.updateSecondJob(job.id, { status: "rendering", renderAt: null, renderDur: null }); setReview(null);
  };
  const removeJob = async (id) => { if (await confirm({ title: "불러오기 취소", message: "이 건을 2차 가공 큐에서 제거합니다.", danger: true, confirmLabel: "제거" })) actions.removeSecondJob(id); };
  const loadReserv = (r) => {
    actions.addSecondJob({ id: "SE-" + Date.now(), reservId: r.id, status: "pending", reason: D.SECOND_EDIT_REASONS[0], assignee: null });
    setPicking(false); setQ("");
  };

  const count = (k) => jobs.filter((j) => j.status === k).length;
  const rows = jobs.filter((j) => j.status === tab);

  // 불러오기 후보: 1차 완료(발행) 건 중 아직 큐에 없는 것
  const loadedIds = jobs.map((j) => j.reservId);
  const candidates = reservations
    .filter((r) => r.status === "published" && !loadedIds.includes(r.id))
    .filter((r) => lf === "전체" || r.partner === lf)
    .filter((r) => matchQuery(q, r.deceased, r.chief, r.partner, r.phone));

  const pill = (st) => { const s = SE_STATUS[st]; return <span className="inline-flex shrink-0 whitespace-nowrap px-2 py-[3px] text-[11px] font-semibold" style={{ borderRadius: 3, color: s.c, background: s.bg }}>{s.label}</span>; };

  return (
    <div style={{ maxWidth: 700 }}>
      <PageHeader title="2차 가공" sub="1차 완료(발행) 건을 불러와 재가공 — 2차 가공 대기·제작중·발행 완료" right={
        <Btn size="sm" onClick={() => setPicking((v) => !v)}><FolderOpen className="h-4 w-4" /> 1차 완료 건 불러오기</Btn>
      } />

      {/* 불러오기 패널 — 1차 완료(발행) 예약 검색·선택 */}
      {picking && (
        <div className="mb-3 overflow-hidden" style={{ border: "1px solid " + GOLD_SOFT, borderRadius: RADIUS, background: SURFACE }}>
          <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: "1px solid " + LINE, background: "#faf8f3" }}>
            <span className="text-[12.5px] font-bold" style={{ color: INK }}>1차 완료 건 불러오기</span>
            <div className="flex items-center gap-2">
              <SearchSelect value={lf} onChange={setLf} placeholder="전체 파트너사" width={200}
                options={[{ value: "전체", label: "전체 파트너사" }, ...partners.map((p) => ({ value: p.name, label: p.name }))]} />
              <div className="flex items-center px-2.5" style={{ height: 30, width: 240, background: "#fff", border: "1px solid " + LINE2, borderRadius: RADIUS }}>
                <Search className="h-3.5 w-3.5" style={{ color: FAINT }} strokeWidth={1.9} />
                <input value={q} onChange={(e) => setQ(e.target.value)} className="ml-2 w-full bg-transparent text-[12.5px] outline-none" placeholder="반려동물·보호자 검색" style={{ color: INK }} />
              </div>
              <button onClick={() => setPicking(false)} className="p-1" style={{ color: FAINT }}><X className="h-4 w-4" /></button>
            </div>
          </div>
          {candidates.length === 0 ? (
            <div className="px-4 py-6 text-center text-[12.5px]" style={{ color: FAINT }}>불러올 수 있는 1차 완료 건이 없습니다.</div>
          ) : candidates.map((r, i) => (
            <div key={r.id} className="flex items-center gap-4 px-4 py-2.5" style={{ borderTop: i ? "1px solid " + LINE : "none" }}>
              <div className="min-w-0 flex-1">
                <span style={{ fontFamily: SERIF, fontSize: 14, fontWeight: 700, color: INK }}>{r.deceased}</span>
                <span className="ml-2 truncate text-[11.5px]" style={{ color: MUTE }}>{r.partner} · {r.room} · 보호자 {r.chief}</span>
              </div>
              <Btn size="sm" variant="ghost" onClick={() => loadReserv(r)}><Plus className="h-3.5 w-3.5" /> 불러오기</Btn>
            </div>
          ))}
        </div>
      )}

      {/* 상태 탭 (자체 프로세스) */}
      <div className="mb-3 flex items-center gap-1.5">
        {SE_TABS.map((t) => {
          const on = tab === t.key;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="whitespace-nowrap px-3 py-1.5 text-[12.5px] font-semibold outline-none transition focus-visible:ring-1"
              style={{ borderRadius: RADIUS, background: on ? GOLD_SOFT : "transparent", color: on ? GOLD_D : MUTE, border: "1px solid " + (on ? GOLD_SOFT : LINE) }}>
              {t.label} <span className="tabular-nums" style={{ color: on ? GOLD_D : FAINT }}>{count(t.key)}</span>
            </button>
          );
        })}
      </div>

      {/* 큐 */}
      <div className="overflow-hidden" style={{ border: "1px solid " + LINE, borderRadius: RADIUS, background: SURFACE }}>
        {rows.length === 0 && <div className="px-4 py-8 text-center text-[13px]" style={{ color: FAINT }}>해당 단계의 2차 가공 건이 없습니다.</div>}
        {rows.map((j, i) => {
          const r = reservOf(j.reservId);
          if (!r) return null;
          const mine = j.assignee === me; // 담당자 표시용. 편집기 진입은 누구나 가능
          return (
            <div key={j.id} className="flex items-center gap-3 px-3 py-2.5" style={{ borderTop: i ? "1px solid " + LINE : "none" }}>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span style={{ fontFamily: SERIF, fontSize: 15, fontWeight: 700, color: INK }}>{r.deceased}</span>
                  <span className="px-1.5 py-[1px] text-[11px] font-semibold" style={{ background: GOLD_SOFT, color: GOLD_D, borderRadius: 3 }}>{j.reason}</span>
                </div>
                <div className="mt-0.5 truncate text-[11.5px]" style={{ color: MUTE }}>{r.partner} · {r.room} · 보호자 {r.chief}</div>
              </div>
              {/* 우측 묶음 — 상태별 요소만 오른쪽에 붙여 표시(중간 공백 없이)
                  · 2차 가공 대기: 상태 + 받기 + 취소(x)
                  · 작업 중: 상태 + 편집기 열기 + 작업자
                  · 발행 완료: 상태 + 편집기 열기 + 작업자 */}
              <div className="ml-auto flex shrink-0 items-center gap-2">
                {pill(j.status)}
                {j.status === "pending" ? (
                  <>
                    <Btn size="sm" onClick={() => claim(j.id)}><UserPlus className="h-3.5 w-3.5" /> 받기</Btn>
                    <button onClick={() => removeJob(j.id)} className="p-1 outline-none" style={{ color: FAINT }} title="불러오기 취소"><X className="h-4 w-4" /></button>
                  </>
                ) : (
                  <>
                    {j.status === "confirm" ? (
                      <ConfirmCell item={j} onReview={() => setReview({ r, job: j })} />
                    ) : (
                      <EditorOpenBtn kind="second" id={j.id} account={account} editLocks={s.editLocks} onOpen={() => onOpenEditor({ ...r, secondJobId: j.id, secondJobStatus: j.status })} />
                    )}
                    {j.assignee && (
                      <span className="inline-flex items-center gap-1.5 group" title={mine ? "내가 받음 — 클릭 시 해제" : "담당: " + j.assignee}>
                        <span className="flex h-5 w-5 items-center justify-center rounded-full text-[9.5px] font-bold text-white" style={{ background: mine ? GOLD : "#3f5e87" }}>{j.assignee.slice(0, 1)}</span>
                        <span className="text-[12px] font-semibold" style={{ color: INK }}>{j.assignee}{mine && <span className="ml-0.5 text-[10.5px]" style={{ color: GOLD_D }}>·나</span>}</span>
                        {mine && j.status === "rendering" && <button onClick={() => release(j.id)} className="ml-0.5 opacity-0 transition group-hover:opacity-100" style={{ color: FAINT }}><X className="h-3.5 w-3.5" /></button>}
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[11px] leading-relaxed" style={{ color: FAINT }}>
        ※ 2차 가공은 1차 컨펌·발행이 끝난 건을 「불러오기」로 큐에 올려, 2차 가공 대기 →「받기」작업 중 → 「최종 렌더·컨펌 요청」→ 컨펌 대기(렌더 진행률) → 「검수」로 결과물 확인 → 「확인·컨펌」발행 / 「재제작」 반려로 처리하는 별도 트랙입니다. 발행 시 기존 링크가 갱신됩니다.
      </p>

      {review && <ReviewModal r={review.r} reason={review.job.reason} videoUrl={submissionFor(s, review.r.id)?.videoUrl} finalMB={videoFor(s, review.r.id)?.finalMB}
        onConfirm={() => doConfirm(review.job)} onRemake={() => doRemake(review.job)} onClose={() => setReview(null)} />}
    </div>
  );
}

