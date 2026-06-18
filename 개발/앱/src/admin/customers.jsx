// [총괄] 고객관리 — 예약/영상 상태 목록과 1건 드릴다운 상세.
import React, { useState } from "react";
import {
  Search,
} from "lucide-react";
import { SERIF, SURFACE, LINE, GOLD_D, INK, MUTE, FAINT, RADIUS } from "../theme.js";
import { Tag, Card, Table, PageHeader, CopyBtn } from "../ui.jsx";
import { useStore } from "../store.js";
import * as D from "../data.js";
import { SearchSelect } from "./shared.jsx";

const videoTag = (st) =>
  st === "published" ? <Tag s="published" label="발행 완료" /> :
  st === "review" ? <Tag s="review" label="컨펌 대기" /> :
  <Tag s="rendering" label="작업중" />;
// 예약 상태 태그 — 접수 / 진행중 / 종료
const reservTag = (st) =>
  st === "published" ? <Tag s="done" label="종료" /> :
  st === "review" ? <Tag s="standby" label="접수" /> :
  <Tag s="rendering" label="진행중" />;

// ── 고객관리 상세 (예약 1건 드릴다운) ───────────────────────────
function CustomerDetail({ rid, onBack }) {
  const { reservations, partners } = useStore();
  const r = reservations.find((x) => x.id === rid);
  if (!r) return null;
  const partner = partners.find((p) => p.name === r.partner);
  const link = D.LINKS.find((l) => l.deceased === r.deceased);
  const won = (v) => (v || 0).toLocaleString() + "원";
  const row = (label, val) => (
    <div className="flex justify-between text-[13px]"><span style={{ color: MUTE }}>{label}</span><span style={{ color: INK }}>{val}</span></div>
  );
  return (
    <div>
      <PageHeader title={r.deceased} sub={r.partner + " · 보호자 " + r.chief} back={{ onClick: onBack, label: "고객관리" }}
        right={
          <div className="flex items-center gap-2">
            {videoTag(r.status)}
            {reservTag(r.status)}
          </div>
        } />
      <div className="grid grid-cols-2 gap-4">
        <Card title="예약 정보">
          <div className="space-y-2">
            {row("반려동물", <span style={{ fontFamily: SERIF, fontWeight: 700 }}>{r.deceased}</span>)}
            {row("보호자", r.chief)}
            {row("연락처", <span className="tabular-nums">{r.phone}</span>)}
            {row("파트너사", r.partner)}
            {row("예약일", r.date || "—")}
            {row("호실", r.room)}
            {row("시간", r.slot || "—")}
          </div>
        </Card>
        <Card title="영상 현황">
          <div className="space-y-2">
            {row("영상", videoTag(r.status))}
            {row("예약 상태", reservTag(r.status))}
            {row("담당자", r.assignee || "미배정")}
            {row("컨펌 요청", r.requestedAt || "—")}
            {row("건당 단가", partner ? won(partner.unitPrice) : "—")}
          </div>
        </Card>
      </div>
      <div className="mt-4">
        <Card title="발행 링크">
          {link ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex-1 truncate px-3 py-2 text-[12.5px] tabular-nums" style={{ background: "#faf8f3", border: "1px solid " + LINE, borderRadius: RADIUS, color: GOLD_D }}>{link.url}</div>
                <CopyBtn text={link.url} />
                <Tag s={link.status} />
              </div>
              <div className="flex gap-6 text-[12px]" style={{ color: MUTE }}>
                <span>발행일 <b style={{ color: INK }}>{link.issued}</b></span>
                <span>조회수 <b className="tabular-nums" style={{ color: INK }}>{link.views}</b></span>
                <span>만료 <b style={{ color: INK }}>{link.expires}</b></span>
              </div>
            </div>
          ) : <div className="text-[12.5px]" style={{ color: FAINT }}>아직 발행된 링크가 없습니다.</div>}
        </Card>
      </div>
      <p className="mt-3 text-[11px]" style={{ color: FAINT }}>※ 개인정보 수탁 — 보유기간·삭제 요청 워크플로(PIPA)는 메모리아웍스 확인 항목.</p>
    </div>
  );
}

export function Customers() {
  const cols = [
    { key: "deceased", label: "반려동물" }, { key: "chief", label: "보호자" }, { key: "phone", label: "연락처" },
    { key: "partner", label: "파트너사" }, { key: "date", label: "예약일" }, { key: "room", label: "호실" },
    { key: "slot", label: "시간" }, { key: "video", label: "영상" }, { key: "progress", label: "상태" },
  ];
  const { reservations, partners } = useStore(); // 목 DB — 고객관리 = 예약 spine 파생(발행·컨펌 상태 전파)
  const [partner, setPartner] = useState("전체");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(null); // 상세 보기 중인 예약 id
  const filters = ["전체", ...partners.map((p) => p.name)];
  const rows = reservations
    .map((r) => ({ id: r.id, deceased: r.deceased, chief: r.chief, phone: r.phone, partner: r.partner, date: r.date || (r.requestedAt || "").split(" ")[0], room: r.room, slot: r.slot, status: r.status }))
    .filter((c) => partner === "전체" || c.partner === partner)
    .filter((c) => { const s = q.trim().toLowerCase(); return !s || (c.chief + " " + c.deceased + " " + c.phone).toLowerCase().includes(s); });
  if (sel) return <CustomerDetail rid={sel} onBack={() => setSel(null)} />;
  return (
    <div>
      <PageHeader title="고객관리" sub="전 파트너사 보호자·반려동물 정보 · 예약 이력" right={
        <div className="flex items-center px-3" style={{ height: 36, width: 232, background: SURFACE, border: "1px solid " + LINE, borderRadius: RADIUS }}>
          <Search className="h-4 w-4" style={{ color: FAINT }} strokeWidth={1.9} />
          <input value={q} onChange={(e) => setQ(e.target.value)} className="ml-2 w-full bg-transparent text-[13px] outline-none" placeholder="보호자·반려동물·연락처 검색" style={{ color: INK }} />
        </div>
      } />
      <div className="mb-3 flex items-center gap-2">
        <SearchSelect value={partner} onChange={setPartner} placeholder="전체 파트너사"
          options={filters.map((x) => ({ value: x, label: x === "전체" ? "전체 파트너사" : x }))} />
        <span className="text-[12px]" style={{ color: FAINT }}>{rows.length}건</span>
      </div>
      <Table cols={cols} rows={rows} renderCell={(r, k) =>
        k === "deceased" ? <button onClick={() => setSel(r.id)} className="hover:underline" style={{ fontFamily: SERIF, fontWeight: 700, color: INK }}>{r.deceased}</button> :
        k === "video" ? videoTag(r.status) :
        k === "progress" ? reservTag(r.status) :
        r[k]
      } />
      <p className="mt-3 text-[11px]" style={{ color: FAINT }}>※ 개인정보 수탁 — 보유기간·삭제 요청 워크플로(PIPA)는 메모리아웍스 확인 항목.</p>
    </div>
  );
}

