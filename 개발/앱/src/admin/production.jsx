// [추모영상 제작] 편집·컨펌(Producing) + 2차 가공(SecondEdit).
import React, { useState } from "react";
import {
  ChevronRight, Clock, FolderOpen, Plus, Search, UserPlus, X,
} from "lucide-react";
import { SERIF, SURFACE, LINE, LINE2, GOLD, GOLD_D, GOLD_SOFT, INK, MUTE, FAINT, RADIUS } from "../theme.js";
import { Tag, Btn, PageHeader } from "../ui.jsx";
import { useStore, actions } from "../store.js";
import * as D from "../data.js";
import { SearchSelect } from "./shared.jsx";

const PROD_TABS = [
  { key: "review", label: "컨펌 대기", match: (s) => s === "review" },
  { key: "work", label: "작업 중", match: (s) => s === "rendering" },
  { key: "published", label: "발행 완료", match: (s) => s === "published" },
];

export function Producing({ onOpenEditor, account }) {
  const { reservations, partners } = useStore(); // 목 DB — 상태·담당자 전 화면 공유
  const [tab, setTab] = useState("review");
  const [pf, setPf] = useState("all");
  const st = (r) => r.status;
  const me = account?.name;
  const claim = (id) => { actions.setReservationAssignee(id, me); actions.setReservationStatus(id, "rendering"); }; // 받기 → 작업 중
  const release = (id) => { actions.setReservationAssignee(id, null); actions.setReservationStatus(id, "review"); };
  const tabDef = PROD_TABS.find((t) => t.key === tab);
  const rows = reservations
    .filter((r) => tabDef.match(r.status))
    .filter((r) => pf === "all" || r.partner === pf)
    .sort((a, b) => a.requestedAt.localeCompare(b.requestedAt)); // 먼저 요청된 순

  const count = (t) => reservations.filter((r) => t.match(r.status)).length;

  return (
    <div style={{ maxWidth: 700 }}>
      <PageHeader title="편집·컨펌" sub="전 파트너사 유입 영상 — 먼저 요청된 순 처리 큐" right={
        <SearchSelect value={pf} onChange={setPf} placeholder="전체 파트너사"
          options={[{ value: "all", label: "전체 파트너사" }, ...partners.filter((p) => p.active).map((p) => ({ value: p.name, label: p.name }))]} />
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
          <div className="px-4 py-8 text-center text-[13px]" style={{ color: FAINT }}>해당 상태의 예약이 없습니다.</div>
        )}
        {rows.map((r, i) => {
          const cur = st(r);
          const who = r.assignee;
          const mine = who && who === me;
          return (
            <div key={r.id} className="flex items-center gap-3 px-3 py-2.5"
              style={{ borderTop: i ? "1px solid " + LINE : "none" }}>
              {/* 요청 시각 (정렬 기준 · 가장 왼쪽 고정폭 · 분단위) */}
              <div className="flex w-28 shrink-0 items-center gap-1">
                <Clock className="h-3.5 w-3.5 shrink-0" style={{ color: FAINT }} strokeWidth={2} />
                <span className="text-[12px] font-semibold tabular-nums" style={{ color: MUTE }}>{r.requestedAt}</span>
              </div>
              {/* 반려동물 · 파트너/호실/보호자 */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span style={{ fontFamily: SERIF, fontSize: 15, fontWeight: 700, color: INK }}>{r.deceased}</span>
                </div>
                <div className="mt-0.5 truncate text-[11.5px]" style={{ color: MUTE }}>{r.partner} · {r.room} · 보호자 {r.chief}</div>
              </div>
              {/* 우측 묶음 — 상태별 요소만 오른쪽에 붙여 표시(중간 공백 없이)
                  · 컨펌대기: 상태 + 받기
                  · 작업 중: 상태 + 편집기 열기 + 작업자
                  · 발행완료: 상태 + 편집기 열기 + 작업자 */}
              <div className="ml-auto flex shrink-0 items-center gap-2">
                <Tag s={cur} />
                {cur !== "review" && (
                  <Btn size="sm" variant="ghost" onClick={() => onOpenEditor(r)}>
                    편집기 열기 <ChevronRight className="h-3.5 w-3.5" />
                  </Btn>
                )}
                {who ? (
                  <span className="inline-flex items-center gap-1.5 group" title={mine ? "내가 받음 — 클릭 시 해제" : "담당: " + who}>
                    <span className="flex h-5 w-5 items-center justify-center rounded-full text-[9.5px] font-bold text-white" style={{ background: mine ? GOLD : "#3f5e87" }}>{who.slice(0, 1)}</span>
                    <span className="text-[12px] font-semibold" style={{ color: INK }}>{who}{mine && <span className="ml-0.5 text-[10.5px]" style={{ color: GOLD_D }}>·나</span>}</span>
                    {mine && <button onClick={() => release(r.id)} className="ml-0.5 opacity-0 transition group-hover:opacity-100" style={{ color: FAINT }}><X className="h-3.5 w-3.5" /></button>}
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
        ※ 자동생성 영상은 건별 육안 검수 후 컨펌. 정렬은 요청 시각 오름차순(먼저 요청된 건이 상단) — 가장 왼쪽에 컨펌 요청 시각을 분단위로 표시.
        담당자 = 해당 건을 받은 작업자(미배정은 「받기」로 본인 배정 · 본인 건은 ✕로 해제). 누가 처리 중인지 한눈에 확인.
      </p>
    </div>
  );
}

// ── 2차 가공 (별도 큐 — 1차 완료 건 불러오기 → 2차 가공 대기·제작중·발행) ──
const SE_STATUS = {
  pending: { label: "2차 가공 대기", c: "#9a6a1c", bg: "#f4ead7" },
  rendering: { label: "작업 중", c: "#3f5e87", bg: "#e9eef5" },
  published: { label: "발행 완료", c: "#3a7468", bg: "#e9f1ee" },
};
const SE_TABS = [
  { key: "pending", label: "2차 가공 대기" },
  { key: "rendering", label: "작업 중" },
  { key: "published", label: "발행 완료" },
];

export function SecondEdit({ onOpenEditor, account }) {
  const { reservations, secondJobs: jobs, partners } = useStore(); // 목 DB — 1차 발행 건이 후보로 전파
  const [tab, setTab] = useState("pending");
  const [picking, setPicking] = useState(false);
  const [q, setQ] = useState("");
  const [lf, setLf] = useState("전체"); // 불러오기 파트너사 필터
  const me = account?.name;

  const reservOf = (id) => reservations.find((r) => r.id === id);
  // 「받기」 — 본인 배정 + 2차 가공 대기 → 작업 중 전환
  const claim = (id) => { actions.setSecondJobAssignee(id, me); actions.setSecondJobStatus(id, "rendering"); };
  const release = (id) => { actions.setSecondJobAssignee(id, null); actions.setSecondJobStatus(id, "pending"); };
  const removeJob = (id) => actions.removeSecondJob(id);
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
    .filter((r) => { const s = q.trim().toLowerCase(); return !s || (r.deceased + " " + r.chief + " " + r.partner + " " + r.phone).toLowerCase().includes(s); });

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
          const mine = j.assignee === me;
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
                    <Btn size="sm" variant="ghost" onClick={() => onOpenEditor(r)}>편집기 열기 <ChevronRight className="h-3.5 w-3.5" /></Btn>
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
        ※ 2차 가공은 1차 컨펌·발행이 끝난 건을 「불러오기」로 큐에 올려, 2차 가공 대기 → 제작중 → 발행 완료로 처리하는 별도 트랙입니다. 발행 시 기존 링크가 갱신됩니다.
      </p>
    </div>
  );
}

