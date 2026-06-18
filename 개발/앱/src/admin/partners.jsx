// [총괄] 파트너사 관리 — 목록·상세·신규 등록 모달.
import React, { useState, useEffect } from "react";
import {
  Check, ChevronRight, Plus, Search, X,
} from "lucide-react";
import { SURFACE, LINE, LINE2, GOLD, GOLD_D, GOLD_SOFT, INK, MUTE, FAINT, STATUS, RADIUS } from "../theme.js";
import { Tag, Btn, Card, Summary, Table, PageHeader, Modal, CopyBtn } from "../ui.jsx";
import { useStore, actions } from "../store.js";
import * as D from "../data.js";

const won = (v) => (v || 0).toLocaleString() + "원"; // 금액 포맷 — 상세/목록 공용

function PartnerRegisterModal({ open, onClose }) {
  const { partners } = useStore();
  const blank = { bizUnit: D.BIZ_UNITS.find((b) => b.active)?.name || "", idCode: "", name: "", region: "", rooms: "", bizNo: "", ceo: "", address: "", bizType: "", bizItem: "", manager: "", phone: "", email: "" };
  const [f, setF] = useState(blank);
  useEffect(() => { if (open) setF(blank); /* eslint-disable-next-line */ }, [open]);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const num = (v) => Number(String(v).replace(/[^\d]/g, "")) || 0;
  const idCode = f.idCode.trim();
  const dupCode = !!idCode && partners.some((p) => String(p.idCode || "").toLowerCase() === idCode.toLowerCase());
  const canSubmit = !!f.name.trim() && !!idCode && !dupCode;
  const nextId = () => {
    const nums = partners.map((p) => parseInt(String(p.id).replace(/\D/g, ""), 10)).filter((n) => !isNaN(n));
    return "P-" + String((nums.length ? Math.max(...nums) : 0) + 1).padStart(3, "0");
  };
  const submit = () => {
    if (!canSubmit) return;
    actions.addPartner({
      id: nextId(), idCode,
      bizUnit: f.bizUnit, name: f.name.trim(), region: f.region.trim(), rooms: num(f.rooms),
      bizNo: f.bizNo.trim(), ceo: f.ceo.trim(), address: f.address.trim(), bizType: f.bizType.trim(), bizItem: f.bizItem.trim(),
      manager: f.manager.trim(), phone: f.phone.trim(), email: f.email.trim(),
      active: true, reservThisMonth: 0, revenue: 0, unitPrice: 0,
    });
    onClose();
  };
  const field = (label, key, extra = {}) => (
    <label className="block">
      <span className="text-[12px] font-semibold" style={{ color: MUTE }}>{label}</span>
      <input value={f[key]} onChange={set(key)} {...extra}
        className="mt-1 w-full px-3 text-[13px] outline-none" style={{ height: 34, background: "#fff", border: "1px solid " + LINE2, borderRadius: RADIUS, color: INK }} />
    </label>
  );
  const section = (title, children) => (
    <div>
      <div className="mb-2 text-[11px] font-bold uppercase tracking-wide" style={{ color: MUTE, letterSpacing: ".04em" }}>{title}</div>
      <div className="grid grid-cols-2 gap-3">{children}</div>
    </div>
  );
  return (
    <Modal open={open} onClose={onClose} width={560}>
      <div className="flex items-center justify-between px-5" style={{ height: 50, borderBottom: "1px solid " + LINE }}>
        <span className="text-[14px] font-semibold" style={{ color: INK }}>파트너사 신규 등록</span>
        <button onClick={onClose} className="transition hover:opacity-70" style={{ color: MUTE }}><X className="h-4 w-4" /></button>
      </div>
      <div className="space-y-5 overflow-y-auto px-5 py-4" style={{ maxHeight: "70vh" }}>
        {section("기본 정보", <>
          <label className="block">
            <span className="text-[12px] font-semibold" style={{ color: MUTE }}>사업부</span>
            <select value={f.bizUnit} onChange={set("bizUnit")} className="mt-1 w-full px-3 text-[13px] outline-none" style={{ height: 34, background: "#fff", border: "1px solid " + LINE2, borderRadius: RADIUS, color: INK }}>
              {D.BIZ_UNITS.filter((b) => b.active).map((b) => <option key={b.id}>{b.name}</option>)}
            </select>
          </label>
          {field("파트너사명 *", "name")}
          <label className="block">
            <span className="text-[12px] font-semibold" style={{ color: MUTE }}>ID 코드(로그인 ID) *</span>
            <input value={f.idCode} onChange={set("idCode")} placeholder="예: greenfield"
              className="mt-1 w-full px-3 text-[13px] outline-none" style={{ height: 34, background: "#fff", border: "1px solid " + (dupCode ? "#8a4b1c" : LINE2), borderRadius: RADIUS, color: INK }} />
            <span className="mt-1 block text-[10.5px]" style={{ color: dupCode ? "#8a4b1c" : FAINT }}>{dupCode ? "이미 사용 중인 ID 코드입니다" : "파트너사 로그인 ID로 사용 · 고유 코드(내부 식별자)는 자동 부여"}</span>
          </label>
          {field("지역", "region")}
          {field("호실 수", "rooms", { inputMode: "numeric" })}
        </>)}
        {section("사업자 정보", <>
          {field("사업자등록번호", "bizNo", { inputMode: "numeric", placeholder: "000-00-00000" })}
          {field("대표자명", "ceo")}
          <div className="col-span-2">{field("사업장 주소", "address")}</div>
          {field("업태", "bizType")}
          {field("업종", "bizItem")}
        </>)}
        {section("담당자 정보", <>
          {field("담당자명", "manager")}
          {field("전화번호", "phone", { inputMode: "tel", placeholder: "010-0000-0000" })}
          <div className="col-span-2">{field("이메일", "email", { type: "email", placeholder: "name@example.com" })}</div>
        </>)}
      </div>
      <div className="flex items-center justify-end gap-2 px-5" style={{ height: 56, borderTop: "1px solid " + LINE }}>
        <Btn size="sm" variant="neutral" onClick={onClose}>취소</Btn>
        <Btn size="sm" onClick={submit} disabled={!canSubmit}><Check className="h-3.5 w-3.5" /> 등록</Btn>
      </div>
    </Modal>
  );
}

// ── 파트너사 상세 (관리자 드릴다운 — 스토어 기반 실시간) ───────────
function PartnerDetail({ partner: p, unitPrice, onBack, go }) {
  const goLink = (page) => go && (
    <button onClick={() => go(page)} className="flex items-center gap-0.5 text-[12px] font-semibold outline-none hover:underline" style={{ color: GOLD }}>바로가기 <ChevronRight className="h-3.5 w-3.5" /></button>
  );
  const { partners, reservations, devices } = useStore();
  const [editing, setEditing] = useState(false);
  const seed = () => ({ idCode: p.idCode || "", name: p.name, region: p.region, manager: p.manager, unitPrice: String(p.unitPrice || ""), active: p.active });
  const [f, setF] = useState(seed);
  const startEdit = () => { setF(seed()); setEditing(true); };
  const cancelEdit = () => setEditing(false);
  const num = (v) => Number(String(v).replace(/[^\d]/g, "")) || 0;
  const idCode = f.idCode.trim();
  const dupCode = !!idCode && partners.some((x) => x.id !== p.id && String(x.idCode || "").toLowerCase() === idCode.toLowerCase());
  const canSave = !!f.name.trim() && !!idCode && !dupCode;
  const save = () => {
    if (!canSave) return;
    actions.updatePartner(p.id, { idCode, name: f.name.trim(), region: f.region.trim(), manager: f.manager.trim(), unitPrice: num(f.unitPrice), active: f.active });
    setEditing(false);
  };
  const rs = reservations.filter((r) => r.partner === p.name);
  const dv = devices.filter((d) => d.partner === p.name);
  const settle = D.SETTLEMENT_PARTNERS.find((x) => x.partner === p.name);
  const cnt = (s) => rs.filter((r) => r.status === s).length;
  const online = dv.filter((d) => d.status !== "offline").length;
  const row = (label, val) => (
    <div className="flex justify-between text-[13px]"><span style={{ color: MUTE }}>{label}</span><span style={{ color: INK }}>{val}</span></div>
  );
  // 인라인 편집 입력 행 (라벨 + 인풋) — 별도 모달 없이 이 페이지에서 수정
  const editRow = (label, key, extra = {}) => (
    <label className="flex items-center justify-between gap-3 text-[13px]">
      <span className="shrink-0" style={{ color: MUTE }}>{label}</span>
      <input value={f[key]} onChange={(e) => setF((s) => ({ ...s, [key]: e.target.value }))} {...extra}
        className={extra.className || "w-44 px-2.5 text-[13px] outline-none focus-visible:ring-1"} style={{ height: 32, background: SURFACE, border: "1px solid " + LINE, borderRadius: RADIUS, color: INK, ...(extra.style || {}) }} />
    </label>
  );
  return (
    <div>
      <PageHeader title={p.name} sub={p.region + " · 파트너사 상세"} back={{ onClick: onBack, label: "파트너사 관리" }}
        right={<div className="flex items-center gap-2">
          <Tag s={(editing ? f.active : p.active) ? "online" : "offline"} label={(editing ? f.active : p.active) ? "활성" : "비활성"} />
          {editing
            ? <><Btn size="sm" variant="neutral" onClick={cancelEdit}>취소</Btn><Btn size="sm" onClick={save} disabled={!canSave}><Check className="h-3.5 w-3.5" /> 저장</Btn></>
            : <Btn size="sm" variant="neutral" onClick={startEdit}>수정</Btn>}
        </div>} />
      <div className="mb-4">
        <Summary items={[["담당자", p.manager], ["호실", p.rooms + "실"], ["이번달 예약", p.reservThisMonth + "건"], ["건당 단가", won(unitPrice || p.unitPrice)]]} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Card title="기본 정보">
          {editing ? (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-[13px]"><span style={{ color: MUTE }}>고유 코드 <span style={{ color: FAINT }}>(고정)</span></span><span className="tabular-nums font-semibold" style={{ color: GOLD_D }}>{p.id}</span></div>
              <label className="flex items-center justify-between gap-3 text-[13px]">
                <span className="shrink-0" style={{ color: MUTE }}>ID 코드 <span style={{ color: FAINT }}>(로그인 ID)</span></span>
                <input value={f.idCode} onChange={(e) => setF((s) => ({ ...s, idCode: e.target.value }))} placeholder="예: greenfield"
                  className="w-44 px-2.5 text-[13px] outline-none focus-visible:ring-1" style={{ height: 32, background: SURFACE, border: "1px solid " + (dupCode ? "#8a4b1c" : LINE), borderRadius: RADIUS, color: INK }} />
              </label>
              {dupCode && <div className="text-right text-[10.5px]" style={{ color: "#8a4b1c" }}>이미 사용 중인 ID 코드입니다</div>}
              {editRow("상호", "name")}
              {editRow("지역", "region")}
              {editRow("담당자", "manager")}
              {row("호실 수", p.rooms + "실")}
              {editRow("건당 단가(원)", "unitPrice", { inputMode: "numeric", className: "w-44 px-2.5 text-right text-[13px] tabular-nums outline-none focus-visible:ring-1" })}
              <label className="flex items-center justify-between text-[13px]">
                <span style={{ color: MUTE }}>운영 상태</span>
                <button type="button" onClick={() => setF((s) => ({ ...s, active: !s.active }))}
                  className="px-3 py-1 text-[12px] font-semibold outline-none focus-visible:ring-1" style={{ borderRadius: RADIUS, background: f.active ? GOLD_SOFT : "transparent", color: f.active ? GOLD_D : FAINT, border: "1px solid " + (f.active ? GOLD_SOFT : LINE) }}>
                  {f.active ? "활성" : "비활성"}
                </button>
              </label>
            </div>
          ) : (
            <div className="space-y-2">
              {row("상호", p.name)}{row("지역", p.region)}{row("담당자", p.manager)}
              {row("고유 코드", p.id)}
              {row("ID 코드", <span className="flex items-center gap-1.5">{p.idCode || "—"}{p.idCode && <CopyBtn text={p.idCode} />}</span>)}
              {row("초기 비밀번호", <span className="flex items-center gap-1.5"><span style={{ color: GOLD_D }}>{p.idCode || "—"}</span>{p.idCode && <CopyBtn text={p.idCode} />}</span>)}
              {row("호실 수", p.rooms + "실")}{row("건당 단가", won(unitPrice || p.unitPrice))}
            </div>
          )}
        </Card>
        <Card title="영상 진행 현황" action={goLink("production")}>
          <div className="space-y-2">
            {row("컨펌 대기", cnt("review") + "건")}{row("작업 중", cnt("rendering") + "건")}{row("발행 완료", cnt("published") + "건")}
            {row("누적 예약", rs.length + "건")}
          </div>
        </Card>
        <Card title="사이니지" action={goLink("signage")}>
          <div className="mb-2 text-[12px]" style={{ color: MUTE }}>연결 <b style={{ color: STATUS.online.c }}>{online}</b> / {dv.length}대</div>
          <div className="space-y-1.5">
            {dv.length === 0 ? <div className="text-[12.5px]" style={{ color: FAINT }}>매핑된 디바이스가 없습니다.</div>
              : dv.map((d) => (
                <div key={d.id} className="flex items-center justify-between text-[12.5px]" style={{ color: INK }}>
                  <span>{d.room} <span style={{ color: FAINT }}>· {d.id}</span></span>
                  <Tag s={d.status} />
                </div>
              ))}
          </div>
        </Card>
        <Card title="정산" action={goLink("settlement")}>
          {settle ? (
            <div className="space-y-2">
              {row("이번달 건수", settle.count + "건")}{row("청구", won(settle.billed))}{row("입금", won(settle.paid))}
              <div className="flex items-center justify-between text-[13px]"><span style={{ color: MUTE }}>미수금</span><span style={{ color: settle.unpaid ? STATUS.review.c : INK }}>{won(settle.unpaid)}</span></div>
            </div>
          ) : <div className="text-[12.5px]" style={{ color: FAINT }}>정산 내역이 없습니다.</div>}
        </Card>
      </div>
    </div>
  );
}

export function PartnersManage({ go, onLoginAsPartner }) {
  const { partners } = useStore();
  const [sel, setSel] = useState(null);
  const [adding, setAdding] = useState(false);
  const [statusF, setStatusF] = useState("all"); // all | active | inactive
  const [q, setQ] = useState("");
  const rows = partners
    .filter((p) => statusF === "all" || (statusF === "active" ? p.active : !p.active))
    .filter((p) => { const s = q.trim().toLowerCase(); return !s || (p.name + " " + (p.idCode || "") + " " + p.region + " " + p.manager).toLowerCase().includes(s); });
  const cnt = { all: partners.length, active: partners.filter((p) => p.active).length, inactive: partners.filter((p) => !p.active).length };
  if (sel) return <PartnerDetail partner={partners.find((x) => x.id === sel.id) || sel} unitPrice={(partners.find((x) => x.id === sel.id) || {}).unitPrice} onBack={() => setSel(null)} go={go} />;
  return (
    <div>
      <PageHeader title="파트너사 관리" sub="반려동물 장례식장(파트너사) 등록 · 건당 단가 · 사업부 · 계정·권한 (테넌트)" right={
        <div className="flex items-center gap-2">
          <div className="flex items-center px-3" style={{ height: 36, width: 220, background: SURFACE, border: "1px solid " + LINE, borderRadius: RADIUS }}>
            <Search className="h-4 w-4 shrink-0" style={{ color: FAINT }} strokeWidth={1.9} />
            <input value={q} onChange={(e) => setQ(e.target.value)} className="ml-2 w-full bg-transparent text-[13px] outline-none" placeholder="파트너사·지역·담당자 검색" style={{ color: INK }} />
          </div>
          <Btn size="sm" onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> 파트너사 신규 등록</Btn>
        </div>
      } />

      <PartnerRegisterModal open={adding} onClose={() => setAdding(false)} />

      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {D.BIZ_UNITS.map((b) => (
            <span key={b.id} className="px-2.5 py-1 text-[12px] font-semibold" style={{ borderRadius: RADIUS, background: b.active ? GOLD_SOFT : "transparent", color: b.active ? GOLD_D : FAINT, border: "1px solid " + (b.active ? GOLD_SOFT : LINE) }}>{b.name}{b.active ? ` · ${b.partners}개` : ""}</span>
          ))}
        </div>
        {/* 활성/비활성 필터 */}
        <div className="flex items-center gap-1.5">
          {[["all", "전체"], ["active", "활성"], ["inactive", "비활성"]].map(([k, l]) => {
            const on = statusF === k;
            return (
              <button key={k} onClick={() => setStatusF(k)} className="px-2.5 py-1 text-[12px] font-semibold outline-none transition focus-visible:ring-1"
                style={{ borderRadius: RADIUS, background: on ? GOLD_SOFT : SURFACE, color: on ? GOLD_D : MUTE, border: "1px solid " + (on ? GOLD_SOFT : LINE) }}>
                {l} <span className="tabular-nums" style={{ color: on ? GOLD_D : FAINT }}>{cnt[k]}</span>
              </button>
            );
          })}
        </div>
      </div>
      <Table
        cols={[{ key: "idCode", label: "ID 코드" }, { key: "name", label: "파트너사" }, { key: "region", label: "지역" }, { key: "manager", label: "담당자" }, { key: "rooms", label: "호실", align: "right" }, { key: "unitPrice", label: "건당 단가", align: "right" }, { key: "reservThisMonth", label: "이번달 예약", align: "right" }, { key: "active", label: "상태" }]}
        rows={rows}
        renderCell={(r, k) =>
          k === "idCode" ? (
            <button onClick={() => onLoginAsPartner && onLoginAsPartner(r)}
              className="tabular-nums font-semibold hover:underline" title="클릭하여 파트너 계정으로 접속"
              style={{ color: GOLD_D, letterSpacing: ".01em" }}>{r.idCode || "—"}</button>
          ) :
          k === "name" ? <button onClick={() => setSel(r)} className="font-semibold hover:underline" style={{ color: INK }}>{r.name}</button> :
          k === "active" ? (
            <button onClick={() => actions.updatePartner(r.id, { active: !r.active })} className="outline-none focus-visible:ring-1" title="클릭하여 활성/비활성 전환" style={{ borderRadius: RADIUS }}>
              <Tag s={r.active ? "online" : "offline"} label={r.active ? "활성" : "비활성"} />
            </button>
          ) :
          k === "rooms" ? <span className="tabular-nums">{r.rooms}실</span> :
          k === "reservThisMonth" ? <span className="tabular-nums">{r.reservThisMonth}건</span> :
          k === "unitPrice" ? (
            <button onClick={() => setSel(r)} className="tabular-nums hover:underline" style={{ color: INK }}>
              {won(r.unitPrice)}
            </button>
          ) : r[k]
        }
      />
      <p className="mt-3 text-[11px]" style={{ color: FAINT }}>※ ID 코드 클릭 시 해당 파트너 계정으로 접속합니다. 건당 단가 클릭 시 상세로 이동하여 수정할 수 있습니다.</p>
    </div>
  );
}

