// [파트너] 예약 목록(PList) + 예약 상세 드릴다운(ReservDetail).
import React, { useState } from "react";
import {
  Check, Download, Pencil, Plus, Search, Send,
} from "lucide-react";
import { SERIF, SURFACE, LINE, GOLD, GOLD_D, GOLD_SOFT, INK, MUTE, FAINT, RADIUS } from "../theme.js";
import { Tag, Btn, Card, Table, PageHeader, CopyBtn, DateField, useTableSort } from "../ui.jsx";
import { useStore, actions } from "../store.js";
import { confirm } from "../confirm.jsx";
import { toast } from "../toast.jsx";
import * as D from "../data.js";
import { CUSTOMER_COLS, customerSortValue, toCustomerRow, renderCustomerCell } from "../admin/customers.jsx";
import { matchQuery } from "../lib/util.js";
import { usePartner, pad2, CASE_ROOMS, parseSlot, overlaps } from "./shared.jsx";
import { TimeStepper, DragTimeline } from "./intake.jsx";

export function PList({ onDetail, onNew }) {
  const PARTNER = usePartner();
  const { reservations } = useStore(); // 목 DB — 관리자 컨펌·발행이 자사 목록에 전파
  const [q, setQ] = useState("");
  const [sf, setSf] = useState("all"); // all | review | rendering | published
  const [from, setFrom] = useState("2026-06-01");
  const [to, setTo] = useState("2026-06-30");
  const reservState = (st) => st === "published" ? "published" : (st === "review" ? "review" : "rendering");

  const base = reservations.filter((r) => r.partner === PARTNER.name);
  const ranged = base.filter((r) => (!from || r.date >= from) && (!to || r.date <= to));
  const filtered = ranged
    .filter((r) => sf === "all" || reservState(r.status) === sf)
    .filter((r) => matchQuery(q, r.deceased, r.chief, r.phone))
    .map(toCustomerRow); // 관리자 고객관리와 동일한 행 형태·컬럼 사용
  const { rows, sort, onSortChange } = useTableSort(filtered, { key: "date", dir: "desc", value: customerSortValue });
  const cAll = ranged.length;
  const cReview = ranged.filter((r) => reservState(r.status) === "review").length;
  const cRendering = ranged.filter((r) => reservState(r.status) === "rendering").length;
  const cPublished = ranged.filter((r) => reservState(r.status) === "published").length;
  const thisMonth = () => { setFrom("2026-06-01"); setTo("2026-06-30"); };

  const dateInput = (v, set) => (
    <div style={{ width: 150 }}><DateField value={v} onChange={set} /></div>
  );
  const filterChip = (k, label, n, c) => {
    const on = sf === k;
    return (
      <button onClick={() => setSf(k)} className="px-2.5 py-1.5 text-[12.5px] font-bold outline-none" style={{ borderRadius: RADIUS, color: c, background: on ? GOLD_SOFT : "transparent", border: "1px solid " + (on ? GOLD : "transparent") }}>
        {label} <span className="tabular-nums">{n}</span>
      </button>
    );
  };

  // 관리자 고객관리와 동일 컬럼 — 자사 화면이므로 '파트너사' 컬럼만 제외
  const cols = CUSTOMER_COLS.filter((c) => c.key !== "partner");
  const empty = base.length === 0
    ? "아직 접수된 예약이 없습니다. ‘신규 접수’에서 예약을 등록하세요."
    : "검색·필터 조건에 맞는 예약이 없습니다.";
  return (
    <div>
      <PageHeader title="예약 목록" sub="접수된 모든 예약을 관리합니다." right={
        <div className="flex items-center gap-2">
          <Btn size="sm" variant="neutral"><Download className="h-3.5 w-3.5" /> 엑셀</Btn>
          <Btn size="sm" onClick={onNew}><Plus className="h-4 w-4" /> 신규 접수</Btn>
        </div>
      } />
      {/* 검색 + 기간 + 필터 (한 줄) */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex flex-1 items-center px-3" style={{ minWidth: 240, height: 36, background: SURFACE, border: "1px solid " + LINE, borderRadius: RADIUS }}>
          <Search className="h-4 w-4 shrink-0" style={{ color: FAINT }} strokeWidth={1.9} />
          <input value={q} onChange={(e) => setQ(e.target.value)} className="ml-2 w-full bg-transparent text-[13px] outline-none" placeholder="반려동물명, 보호자, 연락처 검색" style={{ color: INK }} />
        </div>
        {dateInput(from, setFrom)}
        <span style={{ color: FAINT }}>~</span>
        {dateInput(to, setTo)}
        <Btn size="sm" onClick={thisMonth}>이번달</Btn>
        {filterChip("all", "전체", cAll, MUTE)}
        {filterChip("review", "접수", cReview, "#8a857b")}
        {filterChip("rendering", "진행중", cRendering, "#3f5e87")}
        {filterChip("published", "종료", cPublished, "#5a6470")}
      </div>
      <Table cols={cols} empty={empty} rows={rows} sort={sort} onSortChange={onSortChange} onRowClick={(r) => onDetail(r)} renderCell={(r, k) =>
        k === "deceased" ? <span style={{ fontFamily: SERIF, fontWeight: 700, color: INK }} className="hover:underline">{r.deceased}</span> :
        renderCustomerCell(r, k)
      } />
      <div className="mt-2 px-1 text-[12px]" style={{ color: FAINT }}>총 {rows.length}건</div>
    </div>
  );
}

// 예약 상세 — 수정은 모달 없이 이 페이지 인라인으로 진행
export function ReservDetail({ reserv, onBack }) {
  const { reservations } = useStore();
  const r = reservations.find((x) => x.id === (reserv && reserv.id)) || reserv || reservations[1];
  const d = D.RESERV_DETAIL;
  // 발행 최종본 파일명 — 발행 데이터와 매칭, 없으면 파일명 규칙으로 대체 표기
  const fv = D.FINAL_VIDEOS.find((v) => v.deceased === r.deceased && v.partner === r.partner);
  const videoFile = fv ? D.videoFileName(fv) : `${r.deceased}_추모영상.mp4`;
  const [sent, setSent] = useState(false);
  const [editing, setEditing] = useState(false);
  const seed = () => ({ deceased: r.deceased || "", chief: r.chief || "", phone: r.phone || "", room: r.room || "", date: r.date || "", slot: r.slot || "" });
  const [f, setF] = useState(seed);
  const startEdit = () => { setF(seed()); setEditing(true); };
  const cancelEdit = () => setEditing(false);

  // 시간·호실 충돌 검사 (자기 자신 제외)
  const { start: ns, end: ne } = parseSlot(f.slot);
  // 예약 추가와 동일한 시간 스테퍼용 — 슬롯 문자열 ↔ 시/분 동기화
  const sH = Math.floor(ns / 60), sM = ns % 60, eH = Math.floor(ne / 60), eM = ne % 60;
  const setSlot = (sh, sm, eh, em) => setF((s) => ({ ...s, slot: pad2(sh) + ":" + pad2(sm) + "~" + pad2(eh) + ":" + pad2(em) }));
  // 드래그 타임라인용 — 분 범위 ↔ 슬롯 동기화 + 같은 날·호실의 다른 예약(블락)
  const setRange = (lo, hi) => setF((s) => ({ ...s, slot: pad2(Math.floor(lo / 60)) + ":" + pad2(lo % 60) + "~" + pad2(Math.floor(hi / 60)) + ":" + pad2(hi % 60) }));
  const blocked = reservations.filter((x) => x.id !== r.id && x.room === f.room && x.date === f.date).map((x) => parseSlot(x.slot));
  const timeInvalid = editing && ns >= ne && f.slot.includes("~");
  const slotConflict = editing && !timeInvalid && reservations.some(
    (x) => x.id !== r.id && x.room === f.room && x.date === f.date && overlaps({ id: r.id, slot: f.slot }, x)
  );
  const canSave = !!f.deceased.trim() && !timeInvalid && !slotConflict;

  const save = async () => {
    if (!canSave) return;
    if (!(await confirm({ title: "예약 정보 저장", message: "변경한 예약 정보를 저장합니다." }))) return;
    actions.updateReservation(r.id, { deceased: f.deceased.trim(), chief: f.chief.trim(), phone: f.phone.trim(), room: f.room, date: f.date, slot: f.slot.trim() });
    setEditing(false);
  };
  const resend = () => { setSent(true); setTimeout(() => setSent(false), 1500); };

  const inField = (label, key, extra = {}) => (
    <label className="flex items-center justify-between gap-3 text-[13px]">
      <span className="shrink-0" style={{ color: MUTE }}>{label}</span>
      <input value={f[key]} onChange={(e) => setF((s) => ({ ...s, [key]: e.target.value }))} {...extra}
        className="w-44 px-2.5 text-[13px] outline-none focus-visible:ring-1"
        style={{ height: 32, background: SURFACE, border: "1px solid " + LINE, borderRadius: RADIUS, color: INK }} />
    </label>
  );

  return (
    <div>
      <PageHeader title={r.deceased} sub={r.room + " · 보호자 " + r.chief} back={{ onClick: onBack, label: "뒤로" }}
        right={<div className="flex items-center gap-2">
          {editing
            ? <><Btn size="sm" variant="neutral" onClick={cancelEdit}>취소</Btn><Btn size="sm" onClick={save} disabled={!canSave}><Check className="h-3.5 w-3.5" /> 저장</Btn></>
            : <Btn size="sm" variant="neutral" onClick={startEdit}><Pencil className="h-3.5 w-3.5" /> 수정</Btn>}
        </div>} />

      <div className="grid grid-cols-2 gap-4">
        <Card title="예약 정보">
          {editing ? (
            <div className="space-y-2.5">
              {inField("반려동물", "deceased")}
              {inField("보호자", "chief")}
              {inField("연락처", "phone", { inputMode: "tel" })}
              <label className="flex items-center justify-between gap-3 text-[13px]">
                <span className="shrink-0" style={{ color: MUTE }}>호실</span>
                <select value={f.room} onChange={(e) => setF((s) => ({ ...s, room: e.target.value }))}
                  className="w-44 px-2.5 text-[13px] outline-none focus-visible:ring-1"
                  style={{ height: 32, background: SURFACE, border: "1px solid " + LINE, borderRadius: RADIUS, color: INK }}>
                  {CASE_ROOMS.map((n) => {
                    const blocked = n !== r.room && reservations.some(
                      (x) => x.id !== r.id && x.room === n && x.date === f.date && overlaps({ id: r.id, slot: f.slot }, x)
                    );
                    return <option key={n} value={n} disabled={blocked}>{n}{blocked ? " (사용중)" : ""}</option>;
                  })}
                </select>
              </label>
              <label className="flex items-center justify-between gap-3 text-[13px]">
                <span className="shrink-0" style={{ color: MUTE }}>예약일</span>
                <div className="w-44"><DateField value={f.date} onChange={(d) => setF((s) => ({ ...s, date: d }))} /></div>
              </label>
              <div className="text-[13px]">
                <span className="shrink-0" style={{ color: MUTE }}>시간대 선택</span>
                <div className="mt-1.5">
                  <DragTimeline startMin={ns} endMin={ne} blocked={blocked} onChange={setRange} />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
                  <TimeStepper h={sH} m={sM} onH={(v) => setSlot(v, sM, eH, eM)} onM={(v) => setSlot(sH, v, eH, eM)} />
                  <span className="text-[15px] font-bold" style={{ color: FAINT }}>~</span>
                  <TimeStepper h={eH} m={eM} onH={(v) => setSlot(sH, sM, v, eM)} onM={(v) => setSlot(sH, sM, eH, v)} />
                </div>
              </div>
              {(timeInvalid || slotConflict) && (
                <div className="text-right text-[11px]" style={{ color: "#8a4b1c" }}>
                  {timeInvalid ? "시작이 종료보다 늦습니다" : "해당 호실·일시에 이미 예약이 있습니다"}
                </div>
              )}
              <div className="flex items-center justify-between text-[13px]"><span style={{ color: MUTE }}>영상</span><Tag s={r.status} /></div>
            </div>
          ) : (
            <div className="space-y-2 text-[13px]" style={{ color: INK }}>
              <div className="flex justify-between"><span style={{ color: MUTE }}>반려동물</span><span style={{ fontFamily: SERIF, fontWeight: 700 }}>{r.deceased}</span></div>
              <div className="flex justify-between"><span style={{ color: MUTE }}>보호자</span><span>{r.chief}</span></div>
              <div className="flex justify-between"><span style={{ color: MUTE }}>연락처</span><span className="tabular-nums">{r.phone}</span></div>
              <div className="flex justify-between"><span style={{ color: MUTE }}>호실·일정</span><span>{r.room} · {r.date} {r.slot}</span></div>
              <div className="flex justify-between"><span style={{ color: MUTE }}>담당자</span><span>{r.assignee || "미배정"}</span></div>
              <div className="flex items-center justify-between"><span style={{ color: MUTE }}>영상</span><Tag s={r.status} /></div>
            </div>
          )}
        </Card>
        <Card title="추모영상">
          <div className="relative flex items-center justify-center" style={{ aspectRatio: "16/9", background: "#2a323d", borderRadius: RADIUS }}>
            <span className="text-[12px]" style={{ color: "#aab2bf" }}>{r.status === "published" ? "발행 완료" : r.status === "review" ? "접수 대기" : "제작 중"}</span>
          </div>
          {r.status === "published" ? (
            <div className="mt-2.5 flex items-center justify-between gap-2">
              <span className="min-w-0 truncate text-[11.5px] tabular-nums" style={{ color: MUTE, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{videoFile}</span>
              <Btn size="sm" onClick={() => toast(videoFile + " 다운로드를 시작합니다")}><Download className="h-3.5 w-3.5" /> 다운로드</Btn>
            </div>
          ) : (
            <div className="mt-2.5 flex items-center justify-between gap-2">
              <span className="text-[11.5px]" style={{ color: FAINT }}>발행 완료 후 다운로드할 수 있습니다.</span>
              <Btn size="sm" variant="neutral" disabled><Download className="h-3.5 w-3.5" /> 다운로드</Btn>
            </div>
          )}
          <p className="mt-2 text-[11px]" style={{ color: FAINT }}>※ 영상 편집·컨펌은 관리자(HQ)에서 진행됩니다.</p>
        </Card>
      </div>

      <div className="mt-4">
        <Card title="🔗 보호자 영상제작 URL">
          <div className="flex items-center gap-2">
            <div className="flex-1 px-3 py-2 text-[13px] tabular-nums" style={{ background: "#f6f3ec", border: "1px solid " + LINE, borderRadius: RADIUS, color: GOLD_D }}>{d.formUrl}</div>
            <CopyBtn text={d.formUrl} />
            <Btn size="sm" onClick={resend}>{sent ? <><Check className="h-3.5 w-3.5" /> 발송됨</> : <><Send className="h-3.5 w-3.5" /> 문자 재발송</>}</Btn>
          </div>
          <div className="mt-2 flex items-center gap-4 text-[11px]" style={{ color: FAINT }}>
            <span>URL 코드: <b style={{ color: MUTE }}>{d.code}</b></span>
            <span>최근 발송: {d.smsSentAt}</span>
            <span>퇴실 시 자동 무효화</span>
          </div>
        </Card>
      </div>

      <div className="mt-4">
        <Card title="📝 보호자 입력 정보 (유저 입력 폼 수신)">
          <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-[13px]" style={{ color: INK }}>
            {d.form.map((item, i) => (
              <div key={i} className="flex justify-between gap-3" style={{ gridColumn: item.value && item.value.length > 18 ? "span 2" : undefined }}>
                <span className="shrink-0" style={{ color: MUTE }}>{item.label}</span>
                <span className="text-right">{item.value}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px]" style={{ color: FAINT }}>※ 보호자가 URL에서 직접 입력한 정보입니다.</p>
        </Card>
      </div>
    </div>
  );
}

