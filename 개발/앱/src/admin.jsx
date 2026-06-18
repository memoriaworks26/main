import React, { useState, useEffect } from "react";
import {
  LayoutGrid, Users2, UserCircle, FileText, Clapperboard, FolderOpen, LayoutTemplate,
  Link2, Wallet, Settings, Search, Server, Plus,
  Image, Music, Music2, ChevronUp, GripVertical, MonitorPlay, HardDrive, RefreshCw, ChevronRight, ChevronLeft,
  Clock, AlertTriangle, ClipboardList, Lock, Target, Eye, EyeOff, Phone, PawPrint, User, X, Check,
  Bell, Shield, ChevronDown, UserPlus, ShieldCheck, Trash2, KeyRound, RotateCcw, Scissors, Download,
  Type, Sparkles, Mail, CheckSquare, Square, Upload,
} from "lucide-react";
import {
  NAVY, BG, SURFACE, LINE, LINE2, GOLD, GOLD_SOFT, GOLD_D, INK, MUTE, FAINT,
  NAV_LINE, STATUS, SERIF, RADIUS,
} from "./theme.js";
import {
  Tag, Btn, Card, MetricRow, Summary, Table, PageHeader, NavItem,
  NavSection, Deceased, Logo, DateField, Modal,
} from "./ui.jsx";
import { TradeStatement } from "./docs.jsx";
import * as D from "./data.js";
import { useStore, actions } from "./store.js";

// ════════════════════════════════════════════════════════════
// 관리자(HQ · 사업부) = 파트너사(반려동물 장례식장)들을 관리.
// 개별 추모실 운영 현황은 파트너 콘솔. 관리자는 파트너사 통합현황 + 드릴다운.
// ════════════════════════════════════════════════════════════

// ── 대시보드 (관리자 홈) ───────────────────────────────────────
function Dashboard() {
  const { reservations } = useStore();
  const total = D.PARTNERS.length;
  const active = D.PARTNERS.filter((p) => p.active).length;
  const resv = D.PARTNERS.reduce((s, p) => s + p.reservThisMonth, 0);
  const billed = D.SETTLEMENT_PARTNERS.reduce((s, p) => s + p.billed, 0);
  const unpaid = D.SETTLEMENT_PARTNERS.reduce((s, p) => s + p.unpaid, 0);
  const man = (v) => Math.round(v / 10000).toLocaleString() + "만";
  const recent = reservations.slice(0, 5);

  const pill = (txt, c, bg) => <span className="inline-flex px-2 py-[3px] text-[11px] font-semibold" style={{ borderRadius: 3, color: c, background: bg }}>{txt}</span>;
  const videoPill = (st) => (st === "published" || st === "review") ? pill("완성", "#3a7468", "#e9f1ee") : pill("미완성", "#9a6a1c", "#f4ead7");
  const statePill = (st) => st === "published" ? pill("완료", "#5a6470", "#eceef0") : pill("진행중", "#3f5e87", "#e9eef5");

  const cols = ["반려동물", "보호자", "파트너사", "예약일", "영상", "상태"];
  const th = { padding: "10px 16px", fontSize: 11, color: MUTE, borderBottom: "1px solid " + LINE, textAlign: "left", textTransform: "uppercase", letterSpacing: ".03em", fontWeight: 700 };
  const tdc = { padding: "10px 16px", fontSize: 13, color: INK };

  return (
    <div>
      <PageHeader title="대시보드" sub="전 파트너사 운영 요약" right={<Btn size="sm"><Plus className="h-4 w-4" /> 파트너사 등록</Btn>} />

      <div className="mb-4">
        <MetricRow items={[
          { label: "전체 파트너사", value: total, sub: `활성 ${active}개` },
          { label: "이번달 예약", value: resv + "건", sub: "전월 대비 +3" },
          { label: "이번달 매출", value: man(billed), sub: "VAT 포함" },
          { label: "미수금", value: man(unpaid), sub: "확인 필요", accent: "#9a6a1c" },
        ]} />
      </div>

      <div className="mb-4">
        <Card title="사업부별 현황">
          <div className="flex flex-wrap items-center gap-2">
            {D.BIZ_UNITS.map((b) => (
              <span key={b.id} className="px-3.5 py-1.5 text-[12.5px] font-semibold" style={{ borderRadius: 999, background: b.active ? GOLD : SURFACE, color: b.active ? "#fff" : FAINT, border: "1px solid " + (b.active ? GOLD : LINE2) }}>
                {b.name}{b.active ? ` · ${b.partners}개 파트너사` : ""}
              </span>
            ))}
          </div>
        </Card>
      </div>

      <Card title="최근 예약" pad={false}>
        <table className="w-full" style={{ borderCollapse: "collapse" }}>
          <thead><tr style={{ background: "#f6f3ec" }}>{cols.map((c) => <th key={c} style={th}>{c}</th>)}</tr></thead>
          <tbody>
            {recent.map((r, ri) => (
              <tr key={r.id} style={{ borderBottom: ri < recent.length - 1 ? "1px solid " + LINE : "none" }}>
                <td style={{ ...tdc, fontFamily: SERIF, fontWeight: 700 }}>{r.deceased}</td>
                <td style={tdc}>{r.chief}</td>
                <td style={tdc}>{r.partner}</td>
                <td style={{ ...tdc }} className="tabular-nums">{"2026." + r.time.slice(0, 5)}</td>
                <td style={tdc}>{videoPill(r.status)}</td>
                <td style={tdc}>{statePill(r.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ── 파트너사 관리 ──────────────────────────────────────────────
// 파트너사 정보 수정 모달 (상호·지역·담당자·단가·활성 · 고유코드는 식별자라 고정)
function PartnerEditModal({ open, partner: p, onClose }) {
  const [f, setF] = useState({ name: p.name, region: p.region, manager: p.manager, unitPrice: String(p.unitPrice || ""), active: p.active });
  useEffect(() => { if (open) setF({ name: p.name, region: p.region, manager: p.manager, unitPrice: String(p.unitPrice || ""), active: p.active }); }, [open, p]);
  const num = (v) => Number(String(v).replace(/[^\d]/g, "")) || 0;
  const save = () => {
    if (!f.name.trim()) return;
    actions.updatePartner(p.id, { name: f.name.trim(), region: f.region.trim(), manager: f.manager.trim(), unitPrice: num(f.unitPrice), active: f.active });
    onClose();
  };
  const field = (label, key, extra = {}) => (
    <label className="block">
      <span className="text-[12px] font-semibold" style={{ color: MUTE }}>{label}</span>
      <input value={f[key]} onChange={(e) => setF((s) => ({ ...s, [key]: e.target.value }))} {...extra}
        className="mt-1 w-full px-3 text-[13px] outline-none" style={{ height: 36, background: SURFACE, border: "1px solid " + LINE, borderRadius: RADIUS, color: INK }} />
    </label>
  );
  return (
    <Modal open={open} onClose={onClose} width={380}>
      <div className="flex items-center justify-between px-5" style={{ height: 50, borderBottom: "1px solid " + LINE }}>
        <span className="text-[14px] font-semibold" style={{ color: INK }}>파트너사 정보 수정</span>
        <button onClick={onClose} className="transition hover:opacity-70" style={{ color: MUTE }}><X className="h-4 w-4" /></button>
      </div>
      <div className="space-y-3 px-5 py-4">
        <div className="flex items-center justify-between text-[13px]">
          <span className="text-[12px] font-semibold" style={{ color: MUTE }}>고유 코드</span>
          <span className="tabular-nums font-semibold" style={{ color: GOLD_D }}>{p.id}</span>
        </div>
        {field("상호", "name")}
        {field("지역", "region")}
        {field("담당자", "manager")}
        {field("건당 단가(원)", "unitPrice", { inputMode: "numeric", className: "mt-1 w-full px-3 text-right text-[13px] tabular-nums outline-none", style: { height: 36, background: SURFACE, border: "1px solid " + LINE, borderRadius: RADIUS, color: INK } })}
        <label className="flex items-center justify-between">
          <span className="text-[12px] font-semibold" style={{ color: MUTE }}>운영 상태</span>
          <button type="button" onClick={() => setF((s) => ({ ...s, active: !s.active }))}
            className="px-3 py-1 text-[12px] font-semibold" style={{ borderRadius: RADIUS, background: f.active ? GOLD_SOFT : "transparent", color: f.active ? GOLD_D : FAINT, border: "1px solid " + (f.active ? GOLD_SOFT : LINE) }}>
            {f.active ? "활성" : "비활성"}
          </button>
        </label>
      </div>
      <div className="flex items-center justify-end gap-2 px-5" style={{ height: 56, borderTop: "1px solid " + LINE }}>
        <Btn size="sm" variant="neutral" onClick={onClose}>취소</Btn>
        <Btn size="sm" onClick={save} disabled={!f.name.trim()}><Check className="h-3.5 w-3.5" /> 저장</Btn>
      </div>
    </Modal>
  );
}

// ── 파트너사 신규 등록 (기본·사업자·담당자 정보) ───────────────────
function PartnerRegisterModal({ open, onClose }) {
  const { partners } = useStore();
  const blank = { bizUnit: D.BIZ_UNITS.find((b) => b.active)?.name || "", idCode: "", name: "", region: "", rooms: "", bizNo: "", ceo: "", address: "", bizType: "", bizItem: "", manager: "", phone: "", email: "" };
  const [f, setF] = useState(blank);
  useEffect(() => { if (open) setF(blank); /* eslint-disable-next-line */ }, [open]);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const num = (v) => Number(String(v).replace(/[^\d]/g, "")) || 0;
  const code = f.code.trim().toLowerCase();
  const dupCode = !!code && partners.some((p) => String(p.code || "").toLowerCase() === code);
  const canSubmit = !!f.name.trim() && !!code && !dupCode;
  const nextId = () => {
    const nums = partners.map((p) => parseInt(String(p.id).replace(/\D/g, ""), 10)).filter((n) => !isNaN(n));
    return "P-" + String((nums.length ? Math.max(...nums) : 0) + 1).padStart(3, "0");
  };
  const submit = () => {
    if (!canSubmit) return;
    actions.addPartner({
      id: nextId(), code,
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
            <span className="text-[12px] font-semibold" style={{ color: MUTE }}>고유 코드(로그인 ID) *</span>
            <input value={f.code} onChange={set("code")} placeholder="예: greenfield"
              className="mt-1 w-full px-3 text-[13px] outline-none" style={{ height: 34, background: "#fff", border: "1px solid " + (dupCode ? "#8a4b1c" : LINE2), borderRadius: RADIUS, color: INK }} />
            <span className="mt-1 block text-[10.5px]" style={{ color: dupCode ? "#8a4b1c" : FAINT }}>{dupCode ? "이미 사용 중인 코드입니다" : "파트너사 로그인 ID로 사용 · 내부 식별자는 자동 부여"}</span>
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
function PartnerDetail({ partner: p, unitPrice, onBack }) {
  const [editOpen, setEditOpen] = useState(false);
  const { reservations, devices, templates, formTemplates } = useStore();
  const rs = reservations.filter((r) => r.partner === p.name);
  const dv = devices.filter((d) => d.partner === p.name);
  const settle = D.SETTLEMENT_PARTNERS.find((x) => x.partner === p.name);
  const tpl = templates[p.id];
  const form = formTemplates[p.id] || [];
  const won = (v) => (v || 0).toLocaleString() + "원";
  const cnt = (s) => rs.filter((r) => r.status === s).length;
  const online = dv.filter((d) => d.status !== "offline").length;
  const row = (label, val) => (
    <div className="flex justify-between text-[13px]"><span style={{ color: MUTE }}>{label}</span><span style={{ color: INK }}>{val}</span></div>
  );
  return (
    <div>
      <PageHeader title={p.name} sub={p.region + " · 파트너사 상세"} back={{ onClick: onBack, label: "파트너사 관리" }}
        right={<div className="flex items-center gap-2"><Tag s={p.active ? "online" : "offline"} label={p.active ? "활성" : "비활성"} /><Btn size="sm" variant="neutral" onClick={() => setEditOpen(true)}>수정</Btn></div>} />
      <PartnerEditModal open={editOpen} partner={p} onClose={() => setEditOpen(false)} />
      <div className="mb-4">
        <Summary items={[["담당자", p.manager], ["추모실", p.rooms + "실"], ["이번달 예약", p.reservThisMonth + "건"], ["건당 단가", won(unitPrice || p.unitPrice)]]} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Card title="기본 정보">
          <div className="space-y-2">
            {row("상호", p.name)}{row("지역", p.region)}{row("담당자", p.manager)}
            {row("고유 코드", p.id)}{row("추모실 수", p.rooms + "실")}{row("건당 단가", won(unitPrice || p.unitPrice) + " (VAT 포함)")}
          </div>
        </Card>
        <Card title="영상 진행 현황">
          <div className="space-y-2">
            {row("컨펌 대기", cnt("review") + "건")}{row("작업 중", (cnt("rendering") + cnt("rework")) + "건")}{row("발행 완료", cnt("published") + "건")}
            {row("누적 예약", rs.length + "건")}
          </div>
        </Card>
        <Card title="사이니지">
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
        <Card title="정산">
          {settle ? (
            <div className="space-y-2">
              {row("이번달 건수", settle.count + "건")}{row("청구", won(settle.billed))}{row("입금", won(settle.paid))}
              <div className="flex items-center justify-between text-[13px]"><span style={{ color: MUTE }}>미수금</span><span style={{ color: settle.unpaid ? STATUS.review.c : INK }}>{won(settle.unpaid)}</span></div>
            </div>
          ) : <div className="text-[12.5px]" style={{ color: FAINT }}>정산 내역이 없습니다.</div>}
        </Card>
        <Card title="영상 템플릿">
          {tpl ? (
            <div className="space-y-2">
              {row("배경 음악", (D.BGM.find((b) => b.id === tpl.bgm) || {}).name || "미설정")}
              {row("요소", (tpl.blocks ? tpl.blocks.length : 0) + "개")}
              {row("클립", (tpl.blocks ? tpl.blocks.filter((b) => b.type === "clip").length : 0) + "개")}
              <p className="text-[11px]" style={{ color: FAINT }}>요소 구성·순서·BGM 편집은 ‘영상 템플릿’ 메뉴에서.</p>
            </div>
          ) : <div className="text-[12.5px]" style={{ color: FAINT }}>설정된 템플릿이 없습니다.</div>}
        </Card>
        <Card title="유저 입력 폼">
          <div className="space-y-2">
            {row("공통 항목", "고정 3종")}{row("전용 항목", form.length + "개")}
            <p className="text-[11px]" style={{ color: FAINT }}>항목 편집은 ‘유저 입력 폼’ 메뉴에서.</p>
          </div>
        </Card>
      </div>
      <div className="mt-4">
        <div className="mb-2 text-[13px] font-bold" style={{ color: INK }}>최근 예약</div>
        <Table
          cols={[{ key: "deceased", label: "반려동물" }, { key: "chief", label: "보호자" }, { key: "room", label: "추모실" }, { key: "requestedAt", label: "요청" }, { key: "status", label: "상태" }]}
          rows={rs.slice(0, 8)} empty="접수된 예약이 없습니다."
          renderCell={(r, k) =>
            k === "deceased" ? <span style={{ fontFamily: SERIF, fontWeight: 700 }}>{r.deceased}</span> :
            k === "status" ? <Tag s={r.status} /> : r[k]}
        />
      </div>
    </div>
  );
}

function PartnersManage() {
  const { partners } = useStore(); // 목 DB — 건당 단가 편집·신규 등록 전파
  const setPrice = (id, v) => actions.setPartnerPrice(id, Number(String(v).replace(/[^\d]/g, "")) || 0);
  const [sel, setSel] = useState(null);
  const [adding, setAdding] = useState(false);
  const [statusF, setStatusF] = useState("all"); // all | active | inactive
  const rows = partners.filter((p) => statusF === "all" || (statusF === "active" ? p.active : !p.active));
  const cnt = { all: partners.length, active: partners.filter((p) => p.active).length, inactive: partners.filter((p) => !p.active).length };
  if (sel) return <PartnerDetail partner={partners.find((x) => x.id === sel.id) || sel} unitPrice={(partners.find((x) => x.id === sel.id) || {}).unitPrice} onBack={() => setSel(null)} />;
  return (
    <div>
      <PageHeader title="파트너사 관리" sub="반려동물 장례식장(파트너사) 등록 · 건당 단가 · 사업부 · 계정·권한 (테넌트)" right={<Btn size="sm" onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> 파트너사 신규 등록</Btn>} />

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
        cols={[{ key: "name", label: "파트너사" }, { key: "region", label: "지역" }, { key: "manager", label: "담당자" }, { key: "rooms", label: "추모실", align: "right" }, { key: "unitPrice", label: "건당 단가", align: "right" }, { key: "reservThisMonth", label: "이번달 예약", align: "right" }, { key: "active", label: "상태" }]}
        rows={rows}
        renderCell={(r, k) =>
          k === "name" ? <button onClick={() => setSel(r)} className="font-semibold hover:underline" style={{ color: INK }}>{r.name}</button> :
          k === "active" ? <Tag s={r.active ? "online" : "offline"} label={r.active ? "활성" : "비활성"} /> :
          k === "rooms" ? <span className="tabular-nums">{r.rooms}실</span> :
          k === "reservThisMonth" ? <span className="tabular-nums">{r.reservThisMonth}건</span> :
          k === "unitPrice" ? (
            <div className="flex items-center justify-end gap-1">
              <input value={(r.unitPrice || 0).toLocaleString()} onChange={(e) => setPrice(r.id, e.target.value)} inputMode="numeric"
                className="w-24 px-2 py-1 text-right text-[12.5px] tabular-nums outline-none focus-visible:ring-1"
                style={{ background: SURFACE, border: "1px solid " + LINE, borderRadius: RADIUS, color: INK }} />
              <span className="text-[12px]" style={{ color: FAINT }}>원</span>
            </div>
          ) : r[k]
        }
      />
      <p className="mt-3 text-[11px]" style={{ color: FAINT }}>※ 건당 단가는 거래명세서 발행 시 단가 스냅샷으로 동결됩니다 (VAT 포함).</p>
    </div>
  );
}

// ── 검색형 드롭다운 (옵션 많을 때 타이핑으로 좁힘 — 100개+ 대응) ────
function SearchSelect({ value, options, onChange, placeholder = "전체", width = 240 }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = React.useRef(null);
  React.useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    if (open) window.addEventListener("mousedown", h);
    return () => window.removeEventListener("mousedown", h);
  }, [open]);
  const list = options.filter((o) => o.label.toLowerCase().includes(q.trim().toLowerCase()));
  const cur = options.find((o) => o.value === value);
  return (
    <div ref={ref} className="relative" style={{ width }}>
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-2 px-3 text-left text-[13px] outline-none focus-visible:ring-1" style={{ height: 36, background: SURFACE, border: "1px solid " + LINE, borderRadius: RADIUS, color: INK }}>
        <span className="flex-1 truncate">{cur ? cur.label : placeholder}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0" style={{ color: FAINT }} />
      </button>
      {open && (
        <div className="absolute left-0 right-0 z-20 mt-1 overflow-hidden" style={{ background: SURFACE, border: "1px solid " + LINE, borderRadius: RADIUS, boxShadow: "0 8px 24px rgba(0,0,0,.14)" }}>
          <div className="flex items-center gap-2 px-2.5 py-2" style={{ borderBottom: "1px solid " + LINE }}>
            <Search className="h-3.5 w-3.5 shrink-0" style={{ color: FAINT }} />
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="검색" className="w-full bg-transparent text-[12.5px] outline-none" style={{ color: INK }} />
          </div>
          <div className="max-h-60 overflow-y-auto py-1">
            {list.length === 0 && <div className="px-3 py-2 text-[12px]" style={{ color: FAINT }}>검색 결과 없음</div>}
            {list.map((o) => (
              <button key={o.value} onClick={() => { onChange(o.value); setOpen(false); setQ(""); }}
                className="flex w-full items-center px-3 py-2 text-left text-[12.5px] outline-none" style={{ background: o.value === value ? GOLD_SOFT : "transparent", color: o.value === value ? GOLD_D : INK }}>
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── 고객관리 ───────────────────────────────────────────────────
function Customers() {
  const cols = [
    { key: "chief", label: "보호자" }, { key: "phone", label: "연락처" },
    { key: "deceased", label: "반려동물" }, { key: "partner", label: "파트너사" },
    { key: "date", label: "예약일" }, { key: "status", label: "영상" },
  ];
  const { reservations } = useStore(); // 목 DB — 고객관리 = 예약 spine 파생(발행·컨펌 상태 전파)
  const [partner, setPartner] = useState("전체");
  const [q, setQ] = useState("");
  const filters = ["전체", ...D.PARTNERS.map((p) => p.name)];
  const rows = reservations
    .map((r) => ({ chief: r.chief, phone: r.phone, deceased: r.deceased, partner: r.partner, date: (r.requestedAt || "").split(" ")[0], status: r.status }))
    .filter((c) => partner === "전체" || c.partner === partner)
    .filter((c) => { const s = q.trim().toLowerCase(); return !s || (c.chief + " " + c.deceased + " " + c.phone).toLowerCase().includes(s); });
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
        k === "deceased" ? <span style={{ fontFamily: SERIF, fontWeight: 700 }}>{r.deceased}</span> :
        k === "status" ? <Tag s={r.status} /> : r[k]
      } />
      <p className="mt-3 text-[11px]" style={{ color: FAINT }}>※ 개인정보 수탁 — 보유기간·삭제 요청 워크플로(PIPA)는 메모리아웍스 확인 항목.</p>
    </div>
  );
}

// ── 편집·컨펌 (처리 큐 / triage) ────────────────────────────────
// 전 파트너사에서 실시간 유입 → "지금 행동할 건"을 먼저 요청된 순으로.
// 카탈로그 아님: 기본 탭=컨펌 대기, 정렬=요청 시각 오름차순(먼저 요청된 순), 예외(렌더실패) 칩 노출.

// 예외(렌더실패) 칩 색 — 빨강 배제, 번트앰버
const ALERT_C = { c: "#8a4b1c", bg: "#f1e0d0" };

// 프로세스 3단계 — 작업 중 = 제작중(rendering) + 재작업(rework) 통합
const PROD_TABS = [
  { key: "review", label: "컨펌 대기", match: (s) => s === "review" },
  { key: "work", label: "작업 중", match: (s) => s === "rendering" || s === "rework" },
  { key: "published", label: "발행 완료", match: (s) => s === "published" },
];

function Producing({ onOpenEditor, account }) {
  const { reservations } = useStore(); // 목 DB — 상태·담당자 전 화면 공유
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
    <div>
      <PageHeader title="편집·컨펌" sub="전 파트너사 유입 영상 — 먼저 요청된 순 처리 큐" right={
        <SearchSelect value={pf} onChange={setPf} placeholder="전체 파트너사"
          options={[{ value: "all", label: "전체 파트너사" }, ...D.PARTNERS.filter((p) => p.active).map((p) => ({ value: p.name, label: p.name }))]} />
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
          const al = r.alert && D.RESERV_ALERT[r.alert];
          const cur = st(r);
          const who = r.assignee;
          const mine = who && who === me;
          return (
            <div key={r.id} className="flex items-center gap-4 px-4 py-3"
              style={{ borderTop: i ? "1px solid " + LINE : "none" }}>
              {/* 요청 시각 (정렬 기준 · 가장 왼쪽 고정폭 · 분단위) */}
              <div className="flex w-32 shrink-0 items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 shrink-0" style={{ color: FAINT }} strokeWidth={2} />
                <span className="text-[12px] font-semibold tabular-nums" style={{ color: MUTE }}>{r.requestedAt}</span>
              </div>
              {/* 반려동물 · 파트너/추모실/보호자 */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span style={{ fontFamily: SERIF, fontSize: 15, fontWeight: 700, color: INK }}>{r.deceased}</span>
                  {al && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-[2px] text-[10.5px] font-bold" style={{ background: ALERT_C.bg, color: ALERT_C.c, borderRadius: 3 }} title={al.hint}>
                      <AlertTriangle className="h-3 w-3" strokeWidth={2.4} /> {al.label}
                    </span>
                  )}
                </div>
                <div className="mt-0.5 truncate text-[11.5px]" style={{ color: MUTE }}>{r.partner} · {r.room} · 보호자 {r.chief}</div>
              </div>
              {/* 담당자 (누가 받았는지) — 미배정이면 본인 배정(받기) */}
              <div className="flex w-28 shrink-0 items-center justify-end">
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
              {/* 상태 */}
              <div className="flex w-[72px] shrink-0 justify-end"><Tag s={cur} /></div>
              {/* 액션 */}
              <div className="flex w-32 shrink-0 items-center justify-end gap-2">
                {cur !== "review" && (
                  <Btn size="sm" variant={cur === "rework" ? "gold" : "ghost"} onClick={() => onOpenEditor(r)}>
                    {cur === "rework" ? "재작업" : "편집기 열기"} <ChevronRight className="h-3.5 w-3.5" />
                  </Btn>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[11px] leading-relaxed" style={{ color: FAINT }}>
        ※ 자동생성 영상은 건별 육안 검수 후 컨펌. 정렬은 요청 시각 오름차순(먼저 요청된 건이 상단) — 가장 왼쪽에 컨펌 요청 시각을 분단위로 표시. 렌더 실패 건은 예외 칩으로 표시.
        담당자 = 해당 건을 받은 작업자(미배정은 「받기」로 본인 배정 · 본인 건은 ✕로 해제). 누가 처리 중인지 한눈에 확인.
      </p>
    </div>
  );
}

// ── 2차 가공 (별도 큐 — 1차 완료 건 불러오기 → 2차 가공 대기·제작중·발행) ──
const SE_STATUS = {
  pending: { label: "2차 가공 대기", c: "#9a6a1c", bg: "#f4ead7" },
  rendering: { label: "제작중", c: "#3f5e87", bg: "#e9eef5" },
  published: { label: "발행 완료", c: "#3a7468", bg: "#e9f1ee" },
};
const SE_TABS = [
  { key: "pending", label: "2차 가공 대기" },
  { key: "rendering", label: "제작중" },
  { key: "published", label: "발행 완료" },
];

function SecondEdit({ onOpenEditor, account }) {
  const { reservations, secondJobs: jobs } = useStore(); // 목 DB — 1차 발행 건이 후보로 전파
  const [tab, setTab] = useState("pending");
  const [picking, setPicking] = useState(false);
  const [q, setQ] = useState("");
  const [lf, setLf] = useState("전체"); // 불러오기 파트너사 필터
  const me = account?.name;

  const reservOf = (id) => reservations.find((r) => r.id === id);
  const setStatus = (id, status) => actions.setSecondJobStatus(id, status);
  // 「받기」 — 본인 배정 + 2차 가공 대기 → 제작중 전환
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
    <div>
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
                options={[{ value: "전체", label: "전체 파트너사" }, ...D.PARTNERS.map((p) => ({ value: p.name, label: p.name }))]} />
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
            <div key={j.id} className="flex items-center gap-4 px-4 py-3" style={{ borderTop: i ? "1px solid " + LINE : "none" }}>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span style={{ fontFamily: SERIF, fontSize: 15, fontWeight: 700, color: INK }}>{r.deceased}</span>
                  <span className="px-1.5 py-[1px] text-[11px] font-semibold" style={{ background: GOLD_SOFT, color: GOLD_D, borderRadius: 3 }}>{j.reason}</span>
                </div>
                <div className="mt-0.5 truncate text-[11.5px]" style={{ color: MUTE }}>{r.partner} · {r.room} · 보호자 {r.chief}</div>
              </div>
              {/* 담당자 — 대기(미배정)면 받기, 배정되면 담당자 */}
              <div className="flex w-28 shrink-0 items-center justify-end">
                {j.assignee && j.status !== "published" ? (
                  <span className="inline-flex items-center gap-1.5 group" title={mine ? "내가 받음 — 클릭 시 해제" : "담당: " + j.assignee}>
                    <span className="flex h-5 w-5 items-center justify-center rounded-full text-[9.5px] font-bold text-white" style={{ background: mine ? GOLD : "#3f5e87" }}>{j.assignee.slice(0, 1)}</span>
                    <span className="text-[12px] font-semibold" style={{ color: INK }}>{j.assignee}{mine && <span className="ml-0.5 text-[10.5px]" style={{ color: GOLD_D }}>·나</span>}</span>
                    {mine && <button onClick={() => release(j.id)} className="ml-0.5 opacity-0 transition group-hover:opacity-100" style={{ color: FAINT }}><X className="h-3.5 w-3.5" /></button>}
                  </span>
                ) : j.status === "pending" ? (
                  <Btn size="sm" onClick={() => claim(j.id)}><UserPlus className="h-3.5 w-3.5" /> 받기</Btn>
                ) : null}
              </div>
              {/* 상태 */}
              <div className="flex w-[72px] shrink-0 justify-end">{pill(j.status)}</div>
              {/* 액션 */}
              <div className="flex w-32 shrink-0 items-center justify-end gap-2">
                {j.status === "pending" && <button onClick={() => removeJob(j.id)} className="p-1 outline-none" style={{ color: FAINT }} title="불러오기 취소"><X className="h-4 w-4" /></button>}
                {j.status === "rendering" && <Btn size="sm" onClick={() => setStatus(j.id, "published")}><RefreshCw className="h-3.5 w-3.5" /> 발행</Btn>}
                {j.status === "published" && <Btn size="sm" variant="ghost" onClick={() => onOpenEditor(r)}>보기 <ChevronRight className="h-3.5 w-3.5" /></Btn>}
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

// ── 콘텐츠 허브 ────────────────────────────────────────────────
function ContentHub() {
  const tabs = ["전체", "영상", "이미지", "음악"];
  const [partner, setPartner] = useState(D.PARTNERS.find((p) => p.active)?.name || D.PARTNERS[0].name);
  const [t, setT] = useState("전체");
  const [q, setQ] = useState("");
  const partners = D.PARTNERS.filter((p) => p.active);
  const { content } = useStore();
  // 음악(BGM)은 공용 라이브러리 → 모든 파트너사 공통. 클립·사진은 파트너사별.
  const items = content.concat(D.BGM.map((b) => ({ id: b.id, kind: "audio", name: b.name, meta: b.meta, size: "", shared: true })));
  const rows = items
    .filter((c) => partner === "공통" ? c.shared : (c.partner === partner || c.shared))
    .filter((c) => t === "전체" || (t === "영상" && c.kind === "clip") || (t === "이미지" && c.kind === "photo") || (t === "음악" && c.kind === "audio"))
    .filter((c) => { const s = q.trim().toLowerCase(); return !s || (c.name + " " + (c.meta || "")).toLowerCase().includes(s); });
  return (
    <div>
      <PageHeader title="콘텐츠 허브" sub="파트너사별 선업로드 자산(클립·사진) + 공용 음악 라이브러리" right={
        <div className="flex items-center gap-2">
          <div className="flex items-center px-3" style={{ height: 36, width: 232, background: SURFACE, border: "1px solid " + LINE, borderRadius: RADIUS }}>
            <Search className="h-4 w-4" style={{ color: FAINT }} strokeWidth={1.9} />
            <input value={q} onChange={(e) => setQ(e.target.value)} className="ml-2 w-full bg-transparent text-[13px] outline-none" placeholder="자산명·정보 검색" style={{ color: INK }} />
          </div>
          <Btn size="sm"><Plus className="h-4 w-4" /> 자산 업로드</Btn>
        </div>
      } />
      {/* 파트너사 베이스 (+ 공통 공용 자산) */}
      <div className="mb-3 flex items-center gap-2">
        <SearchSelect value={partner} onChange={setPartner} placeholder="파트너사"
          options={[{ value: "공통", label: "공통 (공용 자산)" }, ...partners.map((p) => ({ value: p.name, label: p.name }))]} />
        <span className="text-[12px]" style={{ color: FAINT }}>{rows.length}개</span>
      </div>
      <div className="mb-3 flex gap-1.5">
        {tabs.map((x) => (
          <button key={x} onClick={() => setT(x)} className="px-3 py-1.5 text-[12px] font-semibold" style={{ borderRadius: RADIUS, background: t === x ? GOLD_SOFT : SURFACE, color: t === x ? GOLD_D : MUTE, border: "1px solid " + (t === x ? GOLD_SOFT : LINE) }}>{x}</button>
        ))}
      </div>
      <div className="grid grid-cols-4 gap-3">
        {rows.map((c) => (
          <div key={c.id} className="overflow-hidden" style={{ background: SURFACE, border: "1px solid " + LINE, borderRadius: RADIUS }}>
            <div className="flex h-28 items-center justify-center" style={{ background: c.kind === "clip" ? "#d9d6cd" : c.kind === "audio" ? "#e9eef5" : "#eef0f2" }}>
              {c.kind === "clip" ? <Clapperboard className="h-6 w-6" style={{ color: NAVY, opacity: 0.5 }} /> : c.kind === "audio" ? <Music className="h-6 w-6" style={{ color: "#3f5e87", opacity: 0.6 }} /> : <Image className="h-6 w-6" style={{ color: NAVY, opacity: 0.5 }} />}
            </div>
            <div className="px-3 py-2">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-[12.5px] font-semibold" style={{ color: INK }}>{c.name}</span>
                {c.shared && <span className="shrink-0 px-1.5 py-[1px] text-[10px] font-semibold" style={{ background: "#e9eef5", color: "#3f5e87", borderRadius: 3 }}>공용</span>}
              </div>
              <div className="mt-0.5 text-[11px]" style={{ color: FAINT }}>{c.meta}{c.size ? " · " + c.size : ""}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 영상 템플릿 (파트너사별 요소 구성·순서 + BGM 선택 + 클립 콘텐츠 선택) ──
const TPL_EL = {
  title: { icon: Type, color: GOLD },
  slide: { icon: Image, color: "#2f4763" },
  ai: { icon: Sparkles, color: "#51607a" },
  letter: { icon: Mail, color: "#5a6470" },
  clip: { icon: Clapperboard, color: "#3f5e87" },
};

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
  const ref = React.useRef(null);
  React.useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    if (open) window.addEventListener("mousedown", h);
    return () => window.removeEventListener("mousedown", h);
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((v) => !v)} disabled={!addable.length}
        className="flex w-full items-center justify-center gap-1.5 rounded py-2 text-[12px] font-semibold outline-none hover:bg-black/[.02] disabled:opacity-40"
        style={{ border: "1.5px dashed " + LINE2, color: GOLD_D, borderRadius: RADIUS }}>
        <Plus className="h-3.5 w-3.5" /> 요소 추가
      </button>
      {open && addable.length > 0 && (
        <div className="absolute left-1/2 top-full z-20 mt-1 w-52 -translate-x-1/2 overflow-hidden py-1" style={{ background: SURFACE, border: "1px solid " + LINE, borderRadius: RADIUS, boxShadow: "0 8px 24px rgba(0,0,0,.14)" }}>
          {addable.map((d) => {
            const E = TPL_EL[d.type] || {}; const Icon = E.icon || Sparkles;
            return (
              <button key={d.type} onClick={() => { onAdd(d.type); setOpen(false); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12.5px] outline-none hover:bg-black/[.03]" style={{ color: INK }}>
                <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: E.color }} />
                <span className="flex-1">{d.label}</span>
                <span className="text-[10px]" style={{ color: FAINT }}>{d.repeatable ? "여러 개" : "1개"}</span>
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

function Templates() {
  const { templates: tpls, content } = useStore();
  const [drag, setDrag] = useState(null); // 끌고 있는 블록 id (페이지 전체에서 1개)
  // 목록(요약)만 보이고, 행을 누르면 그 파트너사 편집기가 펼쳐짐(아코디언) — 파트너사 증가 대비
  const partners = D.PARTNERS.filter((p) => p.active);
  const [open, setOpen] = useState(null); // 펼친 파트너사 id (1곳)

  return (
    <div>
      <PageHeader title="영상 템플릿" sub="파트너사별 요소 구성·순서 편집 · 기본 요소(타이틀·추억 슬라이드·추억 영상·편지)는 각 1개, 클립은 여러 개 · BGM·클립 콘텐츠 선택" />
      <div className="space-y-2">
        {partners.map((p) => {
          const tpl = tpls[p.id] || { bgm: null, blocks: [] };
          const blocks = tpl.blocks || [];
          const total = blocks.reduce((s, b) => s + (D.elementDef(b.type)?.dur || 0), 0);
          const clipCount = blocks.filter((b) => b.type === "clip").length;
          const bgm = D.BGM.find((b) => b.id === tpl.bgm);
          // 콘텐츠 허브: 해당 파트너 영상(clip) + 이미지(photo)
          const assetOpts = content
            .filter((c) => (c.kind === "clip" || c.kind === "photo") && c.partner === p.name)
            .map((c) => ({ value: c.id, label: (c.kind === "clip" ? "🎬 영상 · " : "🖼 이미지 · ") + c.name }));
          const noHub = assetOpts.length === 0;
          const bgmOpts = D.BGM.map((b) => ({ value: b.id, label: b.name + (b.meta ? "  ·  " + b.meta : "") }));
          // 추가 가능한 요소: 기본 요소는 미사용 시에만, 클립은 항상
          const usedBase = new Set(blocks.filter((b) => b.type !== "clip").map((b) => b.type));
          const addable = D.TEMPLATE_ELEMENTS.filter((e) => e.repeatable || !usedBase.has(e.type));

          const setBlocks = (fn) => actions.setTemplateBlocks(p.id, fn(blocks));
          const addBlock = (type) => setBlocks((bs) => [...bs, { id: "e-" + Date.now(), type, ...(type === "clip" ? { assetId: null } : {}) }]);
          const removeBlock = (id) => setBlocks((bs) => bs.filter((b) => b.id !== id));
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

          const isOpen = open === p.id;
          return (
            <div key={p.id} className="overflow-hidden" style={{ background: SURFACE, border: "1px solid " + LINE, borderRadius: RADIUS }}>
              {/* 요약 행 — 클릭 시 편집기 펼침 */}
              <button onClick={() => setOpen(isOpen ? null : p.id)}
                className="flex w-full items-center justify-between gap-3 px-4 text-left outline-none transition hover:bg-black/[.015] focus-visible:ring-1"
                style={{ height: 52 }}>
                <span className="flex min-w-0 items-center gap-2">
                  <ChevronRight className="h-4 w-4 shrink-0 transition-transform" style={{ color: FAINT, transform: isOpen ? "rotate(90deg)" : "none" }} />
                  <span className="truncate text-[13px] font-bold" style={{ color: INK }}>{p.name}</span>
                  {!bgm && <span className="flex shrink-0 items-center gap-1 text-[11px]" style={{ color: STATUS.review.c }}><AlertTriangle className="h-3 w-3" /> BGM 미지정</span>}
                </span>
                <span className="shrink-0 text-[11.5px] tabular-nums" style={{ color: FAINT }}>약 {total}초 · {blocks.length}요소 · 클립 {clipCount}개</span>
              </button>

              {isOpen && (
              <div className="border-t p-4" style={{ borderColor: LINE }}>
              {/* BGM — 1곡 선택 */}
              <SectionLabel icon={Music2}>배경 음악 (BGM)</SectionLabel>
              <div className="flex items-center gap-3">
                <SearchSelect value={tpl.bgm || ""} onChange={(id) => actions.setTemplateBgm(p.id, id)} width={340} placeholder="BGM 라이브러리에서 선택" options={bgmOpts} />
                {bgm
                  ? <span className="flex items-center gap-1.5 text-[12px]" style={{ color: GOLD_D }}><Music className="h-3.5 w-3.5" /> {bgm.meta}</span>
                  : <span className="flex items-center gap-1 text-[12px]" style={{ color: STATUS.review.c }}><AlertTriangle className="h-3.5 w-3.5" /> 미지정</span>}
              </div>

              {/* 요소 구성 · 순서 — 기본 요소(각 1개) + 클립(n개), ▲▼로 순서변경 */}
              <div className="mt-5 border-t pt-4" style={{ borderColor: LINE }}>
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
                    return (
                      <div key={b.id}
                        onDragEnter={() => { if (drag && drag !== b.id) reorder(drag, b.id); }}
                        onDragOver={(e) => e.preventDefault()}
                        onDragEnd={() => setDrag(null)}
                        className="flex items-center gap-2.5 rounded px-2.5 py-2" style={{ background: "#faf8f3", border: "1px solid " + (drag === b.id ? GOLD : LINE), borderLeft: "3px solid " + E.color, borderRadius: RADIUS, opacity: drag === b.id ? 0.5 : 1 }}>
                        <span draggable onDragStart={() => setDrag(b.id)} className="shrink-0 cursor-grab rounded p-0.5 active:cursor-grabbing" style={{ color: FAINT }} title="끌어서 순서 변경"><GripVertical className="h-3.5 w-3.5" /></span>
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold tabular-nums" style={{ background: "#e7e2d8", color: MUTE }}>{i + 1}</span>
                        <Icon className="h-4 w-4 shrink-0" style={{ color: E.color }} />
                        <span className="shrink-0 text-[12.5px] font-bold" style={{ color: INK, width: 84 }}>{def.label}</span>
                        {isClip ? (
                          <>
                            <SearchSelect value={b.assetId || ""} onChange={(id) => setAsset(b.id, id)} width={260} placeholder={noHub ? "콘텐츠 허브 비어있음 — 먼저 업로드" : "콘텐츠 허브에서 영상/이미지 선택"} options={assetOpts} />
                            <InstantAddClip partner={p.name} onAdded={(id) => setAsset(b.id, id)} />
                            <span className="min-w-0 flex-1 truncate text-[11.5px]" style={{ color: asset ? FAINT : STATUS.review.c }}>{asset ? "· 발행 시 스냅샷 고정" : "· 자산 미지정"}</span>
                          </>
                        ) : (
                          <span className="min-w-0 flex-1 truncate text-[11.5px]" style={{ color: FAINT }}>{def.source} · {def.dur}초</span>
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
                {noHub && clipCount > 0 && (
                  <p className="mt-2 flex items-center gap-1 text-[11px]" style={{ color: STATUS.review.c }}>
                    <AlertTriangle className="h-3.5 w-3.5" /> 콘텐츠 허브에 자산이 없어 클립을 지정할 수 없습니다 — 콘텐츠 허브에서 먼저 업로드하세요.
                  </p>
                )}
              </div>
              </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── 사이니지 (파트너사별 관리) ─────────────────────────────────
function Signage() {
  const { devices } = useStore();
  const partners = [...new Set(devices.map((d) => d.partner))];
  const [pf, setPf] = useState("all");
  const rows = devices.filter((d) => pf === "all" || d.partner === pf);
  const online = rows.filter((d) => d.status !== "offline").length;
  const cols = [
    { key: "partner", label: "파트너사" }, { key: "id", label: "디바이스" }, { key: "room", label: "추모실" },
    { key: "status", label: "상태" }, { key: "playing", label: "표출 중" },
    { key: "ip", label: "IP" }, { key: "act", label: "", align: "right" },
  ];
  return (
    <div>
      <PageHeader title="사이니지" sub="파트너사별 라즈베리파이 디바이스 매핑·재생·온라인 (udev·systemd · 네트워크 독립)" right={<Btn size="sm" variant="ghost"><RefreshCw className="h-3.5 w-3.5" /> 상태 새로고침</Btn>} />
      <div className="mb-3 flex items-center justify-between">
        <SearchSelect value={pf} onChange={setPf} placeholder="전체 파트너사"
          options={[{ value: "all", label: "전체 파트너사" }, ...partners.map((p) => ({ value: p, label: p }))]} />
        <span className="text-[12px]" style={{ color: MUTE }}>온라인 <b style={{ color: STATUS.online.c }}>{online}</b> / {rows.length}</span>
      </div>
      <Table cols={cols} rows={rows} renderCell={(r, k) =>
        k === "status" ? <Tag s={r.status} /> :
        k === "act" ? <button className="text-[12px] font-semibold" style={{ color: GOLD }}>제어</button> :
        k === "partner" ? <span className="font-semibold" style={{ color: INK }}>{r.partner}</span> :
        k === "ip" ? <span className="tabular-nums">{r.ip}</span> : r[k]
      } />
      <p className="mt-3 text-[11px]" style={{ color: FAINT }}>※ 사이니지 범위(영상 루프만 / 정보안내 화면도)는 메모리아웍스 확인 항목(⚠️E).</p>
    </div>
  );
}

// ── 정산 — 파트너사 상세 (기간 필터 + 선택 발행 + 거래명세서 내역) ──
const won = (v) => v.toLocaleString() + "원";
const fmtYmd = (s) => s.replaceAll("-", ".");
const itemKey = (it) => it.ymd + "·" + it.deceased;

function PartnerSettleDetail({ partner, onBack, onIssue, onViewStatement }) {
  const p = D.SETTLEMENT_PARTNERS.find((x) => x.partner === partner);
  const { settlementItems } = useStore(); // 목 DB — 매출 추가·수정·삭제 전파
  const items = settlementItems.filter((i) => i.partner === partner);
  const statements = D.STATEMENTS.filter((s) => s.partner === partner);
  const deposits = D.SETTLEMENT_DEPOSITS.filter((d) => d.partner === partner);
  const depositTotal = deposits.reduce((s, d) => s + d.amount, 0);
  const billed = items.reduce((s, i) => s + i.amount, 0); // 청구 = 매출 합 (추가·수정 즉시 반영)
  const [sub, setSub] = useState("sales");
  const [from, setFrom] = useState("2026-06-01");
  const [to, setTo] = useState("2026-06-30");
  const [sel, setSel] = useState([]);
  const [adding, setAdding] = useState(false);
  const [nm, setNm] = useState(""); const [amt, setAmt] = useState(""); const [ymd, setYmd] = useState("2026-06-18");
  const num = (v) => Number(String(v).replace(/[^\d]/g, "")) || 0;

  const rows = items.filter((i) => i.ymd >= from && i.ymd <= to);
  const selItems = rows.filter((r) => sel.includes(itemKey(r)));
  const selAmount = selItems.reduce((s, r) => s + r.amount, 0);
  const allSelected = rows.length > 0 && rows.every((r) => sel.includes(itemKey(r)));
  const toggle = (k) => setSel((s) => s.includes(k) ? s.filter((x) => x !== k) : [...s, k]);
  const toggleAll = () => setSel(allSelected ? [] : rows.map(itemKey));
  const addItem = () => {
    if (!nm.trim() || !num(amt)) return;
    actions.addSettlementItem({ partner, deceased: nm.trim(), chief: "—", ymd, date: fmtYmd(ymd).slice(5), amount: num(amt), status: "waiting", manual: true });
    setNm(""); setAmt(""); setAdding(false);
  };
  const setAmount = (key, v) => actions.updateSettlementItem(key, { amount: num(v) });
  const removeItem = (key) => { actions.removeSettlementItem(key); setSel((s) => s.filter((x) => x !== key)); };

  const issue = () => {
    if (!selItems.length) return;
    onIssue({ partner, items: selItems, period: fmtYmd(from) + " ~ " + fmtYmd(to), issuedAt: "2026. 06. 18", amount: selAmount });
  };

  const ckbox = (on) => (
    <span className="inline-flex h-4 w-4 items-center justify-center rounded-sm align-middle" style={{ background: on ? GOLD : "transparent", border: on ? "none" : "1.5px solid " + LINE2 }}>
      {on && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
    </span>
  );

  return (
    <div>
      <PageHeader title={partner} sub="매출 상세 · 기간별 거래명세서 발행 · 입금/수금 현황"
        back={{ onClick: onBack, label: "정산" }} />
      <div className="mb-4"><MetricRow items={[
        { label: "청구", value: won(billed) }, { label: "입금", value: won(depositTotal), accent: STATUS.done.c },
        { label: "미수금", value: won(billed - depositTotal), accent: (billed - depositTotal) ? STATUS.waiting.c : FAINT, sub: "청구 − 입금" },
      ]} /></div>

      <div className="mb-3 flex gap-1.5">
        {[["sales", "매출 상세"], ["deposit", "입금 내역"], ["history", "거래명세서 내역"]].map(([k, l]) => {
          const badge = k === "deposit" && deposits.length ? ` · ${deposits.length}` : k === "history" && statements.length ? ` · ${statements.length}` : "";
          return (
            <button key={k} onClick={() => setSub(k)} className="px-3 py-1.5 text-[12px] font-semibold" style={{ borderRadius: RADIUS, background: sub === k ? GOLD_SOFT : SURFACE, color: sub === k ? GOLD_D : MUTE, border: "1px solid " + (sub === k ? GOLD_SOFT : LINE) }}>{l}{badge}</button>
          );
        })}
      </div>

      {sub === "sales" ? (
        <>
          {/* 기간 필터 + 선택 발행 */}
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-[12.5px]" style={{ color: MUTE }}>
              <span className="font-semibold">기간</span>
              <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setSel([]); }} className="px-2 py-1.5 text-[12.5px] outline-none" style={{ background: SURFACE, border: "1px solid " + LINE, borderRadius: RADIUS, color: INK }} />
              <span>~</span>
              <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setSel([]); }} className="px-2 py-1.5 text-[12.5px] outline-none" style={{ background: SURFACE, border: "1px solid " + LINE, borderRadius: RADIUS, color: INK }} />
            </div>
            <div className="flex items-center gap-2.5">
              <Btn size="sm" variant="neutral" onClick={() => setAdding((v) => !v)}><Plus className="h-3.5 w-3.5" /> 매출 추가</Btn>
              <span className="text-[12px]" style={{ color: MUTE }}>선택 <b style={{ color: INK }}>{selItems.length}</b>건 · <span className="tabular-nums">{won(selAmount)}</span></span>
              <Btn size="sm" onClick={issue} {...(selItems.length ? {} : { disabled: true, style: { opacity: 0.5 } })}><FileText className="h-3.5 w-3.5" /> 선택 거래명세서 발행</Btn>
            </div>
          </div>

          {/* 매출 수동 추가 폼 */}
          {adding && (
            <div className="mb-3 flex flex-wrap items-end gap-2 px-4 py-3" style={{ background: SURFACE, border: "1px solid " + LINE, borderRadius: RADIUS }}>
              <label className="flex-1"><div className="mb-1 text-[11.5px] font-semibold" style={{ color: MUTE }}>항목명</div>
                <input value={nm} onChange={(e) => setNm(e.target.value)} placeholder="예: 추모영상 추가 제작 / 액자 인쇄" className="w-full px-2.5 text-[12.5px] outline-none" style={{ height: 34, background: "#fff", border: "1px solid " + LINE2, borderRadius: RADIUS, color: INK }} /></label>
              <label><div className="mb-1 text-[11.5px] font-semibold" style={{ color: MUTE }}>날짜</div>
                <input type="date" value={ymd} onChange={(e) => setYmd(e.target.value)} className="px-2 text-[12.5px] outline-none" style={{ height: 34, background: "#fff", border: "1px solid " + LINE2, borderRadius: RADIUS, color: INK }} /></label>
              <label className="w-36"><div className="mb-1 text-[11.5px] font-semibold" style={{ color: MUTE }}>금액(원)</div>
                <input value={amt} onChange={(e) => setAmt(e.target.value)} inputMode="numeric" placeholder="0" className="w-full px-2.5 text-right text-[12.5px] tabular-nums outline-none" style={{ height: 34, background: "#fff", border: "1px solid " + LINE2, borderRadius: RADIUS, color: INK }} /></label>
              <Btn size="sm" onClick={addItem}><Check className="h-3.5 w-3.5" /> 추가</Btn>
              <Btn size="sm" variant="neutral" onClick={() => setAdding(false)}>취소</Btn>
            </div>
          )}

          <Table
            cols={[
              { key: "sel", label: <button onClick={toggleAll}>{ckbox(allSelected)}</button> },
              { key: "deceased", label: "항목" }, { key: "chief", label: "보호자" }, { key: "date", label: "예약일" },
              { key: "amount", label: "금액", align: "right" }, { key: "status", label: "정산" }, { key: "act", label: "", align: "right" },
            ]}
            rows={rows}
            renderCell={(r, k) =>
              k === "sel" ? <button onClick={() => toggle(itemKey(r))}>{ckbox(sel.includes(itemKey(r)))}</button> :
              k === "deceased" ? <span style={{ fontFamily: SERIF, fontWeight: 700 }}>{r.deceased}{r.manual && <span className="ml-1.5 text-[10px] font-sans font-semibold" style={{ color: GOLD_D }}>추가</span>}</span> :
              k === "status" ? <Tag s={r.status} /> :
              k === "amount" ? (r.manual
                ? <input value={r.amount.toLocaleString()} onChange={(e) => setAmount(itemKey(r), e.target.value)} inputMode="numeric" className="w-24 px-2 py-1 text-right text-[12.5px] tabular-nums outline-none focus-visible:ring-1" style={{ background: "#fff", border: "1px solid " + LINE2, borderRadius: RADIUS, color: INK }} />
                : <span className="tabular-nums">{won(r.amount)}</span>) :
              k === "act" ? (r.manual ? <button onClick={() => removeItem(itemKey(r))} className="p-0.5" style={{ color: FAINT }} title="삭제"><Trash2 className="h-3.5 w-3.5" /></button> : null) : r[k]}
          />
          {!rows.length && <p className="mt-3 text-[12px]" style={{ color: FAINT }}>선택한 기간에 정산 건이 없습니다.</p>}
          <p className="mt-3 text-[11px]" style={{ color: FAINT }}>※ 자동 적립 건은 단가 스냅샷으로 동결(읽기 전용)이며, 「매출 추가」로 넣은 건만 금액 수정·삭제할 수 있습니다. 발행 시 명세서에 스냅샷 기록.</p>
        </>
      ) : sub === "deposit" ? (
        <>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[12.5px]" style={{ color: MUTE }}>입금 <b style={{ color: INK }}>{deposits.length}</b>건 · 합계 <span className="tabular-nums font-semibold" style={{ color: INK }}>{won(depositTotal)}</span></span>
            <Btn size="sm" variant="neutral"><Plus className="h-3.5 w-3.5" /> 입금 등록</Btn>
          </div>
          <Table
            cols={[
              { key: "date", label: "입금일" }, { key: "method", label: "수단" }, { key: "memo", label: "메모" },
              { key: "amount", label: "금액", align: "right" },
            ]}
            rows={deposits}
            renderCell={(r, k) =>
              k === "date" ? <span className="tabular-nums">{fmtYmd(r.date)}</span> :
              k === "amount" ? <span className="tabular-nums font-semibold" style={{ color: STATUS.done.c }}>{won(r.amount)}</span> :
              k === "method" ? <Tag s="online" label={r.method} /> : r[k]}
          />
          {!deposits.length && <p className="mt-3 text-[12px]" style={{ color: FAINT }}>입금 내역이 없습니다.</p>}
          {/* 청구 − 입금 = 미수금 정합 */}
          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-1.5 px-4 py-3 text-[12.5px]" style={{ background: "#faf8f3", border: "1px solid " + LINE, borderRadius: RADIUS }}>
            <span style={{ color: MUTE }}>청구 <b className="tabular-nums" style={{ color: INK }}>{won(billed)}</b></span>
            <span style={{ color: FAINT }}>−</span>
            <span style={{ color: MUTE }}>입금 <b className="tabular-nums" style={{ color: STATUS.done.c }}>{won(depositTotal)}</b></span>
            <span style={{ color: FAINT }}>=</span>
            <span style={{ color: MUTE }}>미수금 <b className="tabular-nums" style={{ color: (billed - depositTotal) ? STATUS.waiting.c : FAINT }}>{won(billed - depositTotal)}</b></span>
          </div>
        </>
      ) : (
        <Table
          cols={[
            { key: "id", label: "명세서 번호" }, { key: "period", label: "거래기간" }, { key: "issuedAt", label: "발행일" },
            { key: "count", label: "건수", align: "right" }, { key: "amount", label: "합계", align: "right" },
            { key: "status", label: "상태" }, { key: "act", label: "", align: "right" },
          ]}
          rows={statements}
          renderCell={(r, k) =>
            k === "count" ? <span className="tabular-nums">{r.count}건</span> :
            k === "amount" ? <span className="tabular-nums">{won(r.amount)}</span> :
            k === "status" ? <Tag s={r.status === "sent" ? "online" : "review"} label={r.status === "sent" ? "발송완료" : "발행"} /> :
            k === "act" ? <button onClick={() => onViewStatement(r)} className="text-[12px] font-semibold" style={{ color: GOLD }}>보기 →</button> :
            k === "id" ? <span className="font-semibold tabular-nums" style={{ color: INK }}>{r.id}</span> : r[k]}
        />
      )}
    </div>
  );
}

// ── 정산 (목록 → 파트너사 상세 → 거래명세서) ───────────────────
function Settlement() {
  const [detail, setDetail] = useState(null);   // 파트너사명
  const [view, setView] = useState(null);       // 발행/조회 중인 거래명세서 { partner, items, period, issuedAt }
  const total = D.SETTLEMENT_PARTNERS.reduce((s, p) => s + p.billed, 0);
  const paid = D.SETTLEMENT_PARTNERS.reduce((s, p) => s + p.paid, 0);
  const unpaid = D.SETTLEMENT_PARTNERS.reduce((s, p) => s + p.unpaid, 0);

  if (view) {
    return (
      <div>
        <PageHeader title="거래명세서" sub={view.partner + " · " + view.period} back={{ onClick: () => setView(null), label: detail ? "상세" : "정산" }} />
        <TradeStatement partner={view.partner} items={view.items} period={view.period} issuedAt={view.issuedAt} />
      </div>
    );
  }

  if (detail !== null) {
    return (
      <PartnerSettleDetail
        partner={detail}
        onBack={() => setDetail(null)}
        onIssue={(v) => setView(v)}
        onViewStatement={(st) => setView({ partner: detail, items: undefined, period: st.period, issuedAt: st.issuedAt })}
      />
    );
  }

  const pCols = [
    { key: "partner", label: "파트너사" }, { key: "count", label: "건", align: "right" },
    { key: "billed", label: "청구", align: "right" }, { key: "paid", label: "입금", align: "right" },
    { key: "unpaid", label: "미수금", align: "right" }, { key: "status", label: "상태" }, { key: "act", label: "", align: "right" },
  ];
  return (
    <div>
      <PageHeader title="정산 내역" sub="파트너사별 단가 스냅샷 · 거래명세서(발행 시 동결) · 메일 발송" right={<Btn size="sm" variant="neutral">엑셀</Btn>} />
      <div className="mb-4">
        <MetricRow items={[
          { label: "이번달 총 청구", value: won(total), sub: "VAT 별도" },
          { label: "정산 완료", value: won(paid), accent: STATUS.done.c },
          { label: "미수금", value: won(unpaid), accent: STATUS.waiting.c, sub: "확인 필요" },
        ]} />
      </div>
      <Table cols={pCols} rows={D.SETTLEMENT_PARTNERS} renderCell={(r, k) =>
        k === "status" ? <Tag s={r.status} /> :
        k === "act" ? <button onClick={() => setDetail(r.partner)} className="text-[12px] font-semibold" style={{ color: GOLD }}>상세 →</button> :
        ["billed", "paid", "unpaid"].includes(k) ? <span className="tabular-nums">{r[k] ? won(r[k]) : "—"}</span> :
        k === "count" ? <span className="tabular-nums">{r.count}건</span> : r[k]
      } />
    </div>
  );
}

// ── 환경설정 (알림톡 · 회사 정보) ─────────────────────────────
function SettingsView() {
  const tabs = ["알림톡", "회사 정보"];
  const [t, setT] = useState(tabs[0]);
  return (
    <div>
      <PageHeader title="환경설정" sub="관리자 전용 — 알림톡 · 회사 정보" />
      <div className="mb-4 flex flex-wrap gap-1.5">
        {tabs.map((x) => (
          <button key={x} onClick={() => setT(x)} className="px-3 py-1.5 text-[12px] font-semibold" style={{ borderRadius: RADIUS, background: t === x ? GOLD_SOFT : SURFACE, color: t === x ? GOLD_D : MUTE, border: "1px solid " + (t === x ? GOLD_SOFT : LINE) }}>{x}</button>
        ))}
      </div>

      {t === "알림톡" && (
        <div className="space-y-4" style={{ maxWidth: 760 }}>
          <Card title="발신번호">
            <div className="flex items-center justify-between text-[13px]" style={{ color: INK }}>
              <div className="flex items-center gap-2"><span style={{ color: MUTE }}>등록 번호</span><span className="tabular-nums font-semibold">{D.SENDER_NO.number}</span></div>
              <div className="flex items-center gap-2">
                <Tag s={D.SENDER_NO.status === "approved" ? "online" : "review"} label={D.SENDER_NO.status === "approved" ? "승인됨" : "심사 대기"} />
                <Btn size="sm" variant="ghost">이용증명원 업로드</Btn>
              </div>
            </div>
            <p className="mt-2 text-[11px]" style={{ color: FAINT }}>⚠️ 발신번호 사전등록·알림톡 템플릿 심사는 운영사 선행작업(임계경로)입니다.</p>
          </Card>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[13px] font-bold" style={{ color: INK }}>알림톡 템플릿</span>
              <Btn size="sm"><Plus className="h-4 w-4" /> 템플릿 추가</Btn>
            </div>
            <div className="space-y-2">
              {D.ALIMTALK.map((m) => (
                <div key={m.id} className="px-4 py-3" style={{ background: SURFACE, border: "1px solid " + LINE, borderRadius: RADIUS }}>
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-semibold" style={{ color: INK }}>{m.name}</span>
                    <span className="px-1.5 py-[1px] text-[10.5px] font-bold" style={{ background: "#eceef0", color: "#5a6470", borderRadius: 3 }}>{m.to}</span>
                    <Tag s={m.status === "approved" ? "online" : "review"} label={m.status === "approved" ? "승인됨" : "심사 대기"} />
                    <div className="ml-auto flex gap-2">
                      <button className="text-[12px] font-semibold" style={{ color: GOLD }}>편집</button>
                      <button className="text-[12px] font-semibold" style={{ color: FAINT }}>미리보기</button>
                    </div>
                  </div>
                  <div className="mt-1.5 px-3 py-2 text-[12px] leading-relaxed" style={{ background: "#f6f3ec", borderRadius: RADIUS, color: MUTE }}>{m.body}</div>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[11px]" style={{ color: FAINT }}>※ {`{변수}`}는 발송 시 실제 값으로 치환됩니다. 알림톡 미승인 시 SMS로 폴백.</p>
          </div>
        </div>
      )}

      {t === "회사 정보" && (
        <div className="grid grid-cols-2 gap-4" style={{ maxWidth: 880 }}>
          <Card title="공급자 정보 (거래명세서 자동 삽입)">
            <div className="space-y-2 text-[13px]" style={{ color: INK }}>
              <div className="flex justify-between"><span style={{ color: MUTE }}>상호</span><span className="font-semibold">{D.COMPANY.name}</span></div>
              <div className="flex justify-between"><span style={{ color: MUTE }}>대표자</span><span>{D.COMPANY.ceo}</span></div>
              <div className="flex justify-between"><span style={{ color: MUTE }}>사업자번호</span><span className="tabular-nums">{D.COMPANY.biz}</span></div>
              <div className="flex justify-between"><span style={{ color: MUTE }}>업태/종목</span><span className="text-right">{D.COMPANY.type}</span></div>
            </div>
          </Card>
          <Card title="결제 계좌 · 도장">
            <div className="space-y-2 text-[13px]" style={{ color: INK }}>
              <div className="flex justify-between"><span style={{ color: MUTE }}>은행</span><span>{D.COMPANY.bank}</span></div>
              <div className="flex justify-between"><span style={{ color: MUTE }}>계좌</span><span className="tabular-nums">{D.COMPANY.account}</span></div>
              <div className="flex justify-between"><span style={{ color: MUTE }}>예금주</span><span>{D.COMPANY.holder}</span></div>
              <div className="flex items-center justify-between"><span style={{ color: MUTE }}>도장 등록</span><Btn size="sm" variant="ghost"><Plus className="h-3.5 w-3.5" /> 업로드</Btn></div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

// ── 내 설정 (모든 계정 공용 — 작업자도 본인 비밀번호 재설정 가능) ────
function PwField({ label, value, onChange, placeholder, autoFocus }) {
  const [show, setShow] = useState(false);
  return (
    <label className="block">
      <div className="mb-1 text-[12px] font-semibold" style={{ color: MUTE }}>{label}</div>
      <div className="relative">
        <input
          type={show ? "text" : "password"} value={value} autoFocus={autoFocus}
          onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          className="w-full pl-3 pr-10 text-[13px] outline-none focus-visible:ring-1"
          style={{ height: 38, background: "#fff", border: "1px solid " + LINE2, borderRadius: RADIUS, color: INK }} />
        <button type="button" onClick={() => setShow((v) => !v)} tabIndex={-1}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1" style={{ color: FAINT }} aria-label={show ? "숨기기" : "표시"}>
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </label>
  );
}

function PasswordResetModal({ account, onClose }) {
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);

  const tooShort = next.length > 0 && next.length < 8;
  const mismatch = confirm.length > 0 && next !== confirm;
  const canSubmit = cur.trim() && next.length >= 8 && next === confirm;
  const submit = () => { if (canSubmit) setDone(true); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(20,26,36,.46)" }} onClick={onClose}>
      <div className="w-full" style={{ maxWidth: 420, background: SURFACE, border: "1px solid " + LINE, borderRadius: 10, boxShadow: "0 24px 64px rgba(0,0,0,.28)" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5" style={{ height: 50, borderBottom: "1px solid " + LINE }}>
          <span className="flex items-center gap-2 text-[14px] font-bold" style={{ color: INK }}>
            <KeyRound className="h-4 w-4" style={{ color: GOLD_D }} /> 비밀번호 재설정
          </span>
          <button onClick={onClose} className="p-1" style={{ color: FAINT }} aria-label="닫기"><X className="h-4 w-4" /></button>
        </div>

        {done ? (
          <div className="px-5 py-7 text-center">
            <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full" style={{ background: GOLD_SOFT }}>
              <Check className="h-6 w-6" strokeWidth={2.4} style={{ color: GOLD_D }} />
            </span>
            <div className="text-[14px] font-bold" style={{ color: INK }}>비밀번호가 변경되었습니다</div>
            <p className="mt-1.5 text-[12px]" style={{ color: MUTE }}>다음 로그인부터 새 비밀번호를 사용하세요. (목업)</p>
            <div className="mt-5"><Btn size="sm" onClick={onClose}>확인</Btn></div>
          </div>
        ) : (
          <div className="px-5 py-4">
            <div className="mb-3 flex items-center gap-2 px-3 py-2 text-[12px]" style={{ background: "#f6f3ec", border: "1px solid " + LINE, borderRadius: RADIUS, color: MUTE }}>
              <User className="h-3.5 w-3.5" style={{ color: FAINT }} /> {account.name} · <span className="tabular-nums">{account.loginId}</span>
            </div>
            <div className="space-y-3">
              <PwField label="현재 비밀번호" value={cur} onChange={setCur} placeholder="현재 비밀번호" autoFocus />
              <div>
                <PwField label="새 비밀번호" value={next} onChange={setNext} placeholder="영문·숫자 포함 8자 이상" />
                {tooShort && <p className="mt-1 text-[11px]" style={{ color: "#8a4b1c" }}>※ 비밀번호는 8자 이상이어야 합니다.</p>}
              </div>
              <div>
                <PwField label="새 비밀번호 확인" value={confirm} onChange={setConfirm} placeholder="새 비밀번호 다시 입력" />
                {mismatch && <p className="mt-1 text-[11px]" style={{ color: "#8a4b1c" }}>※ 새 비밀번호가 일치하지 않습니다.</p>}
              </div>
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <Btn size="sm" variant="neutral" onClick={onClose}>취소</Btn>
              <Btn size="sm" onClick={submit} disabled={!canSubmit}><Check className="h-4 w-4" /> 변경</Btn>
            </div>
            <p className="mt-3 text-[11px]" style={{ color: FAINT }}>※ 보안을 위해 8자 이상 · 영문과 숫자를 섞어 설정하세요.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function MySettings({ account }) {
  const [pwOpen, setPwOpen] = useState(false);
  const role = D.ADMIN_ROLES[account.role];
  return (
    <div>
      <PageHeader title="내 설정" sub="내 계정 정보 · 비밀번호 관리" />
      <div className="space-y-4" style={{ maxWidth: 640 }}>
        <Card title="계정 정보">
          <div className="space-y-2.5 text-[13px]" style={{ color: INK }}>
            <div className="flex justify-between"><span style={{ color: MUTE }}>이름</span><span className="font-semibold">{account.name}</span></div>
            <div className="flex justify-between"><span style={{ color: MUTE }}>아이디</span><span className="tabular-nums">{account.loginId}</span></div>
            <div className="flex justify-between"><span style={{ color: MUTE }}>이메일</span><span>{account.email}</span></div>
            <div className="flex justify-between"><span style={{ color: MUTE }}>역할</span><span className="font-semibold" style={{ color: account.role === "master" ? GOLD_D : INK }}>{role.label}</span></div>
            <div className="flex justify-between"><span style={{ color: MUTE }}>최근 접속</span><span>{account.lastLogin}</span></div>
          </div>
        </Card>

        <Card title="보안">
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-2.5">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ background: GOLD_SOFT }}><KeyRound className="h-4 w-4" style={{ color: GOLD_D }} /></span>
              <div>
                <div className="text-[13px] font-semibold" style={{ color: INK }}>비밀번호</div>
                <div className="text-[12px]" style={{ color: MUTE }}>주기적으로 변경하면 계정을 더 안전하게 보호할 수 있어요.</div>
              </div>
            </div>
            <Btn size="sm" variant="ghost" onClick={() => setPwOpen(true)}><RotateCcw className="h-3.5 w-3.5" /> 비밀번호 재설정</Btn>
          </div>
        </Card>
      </div>

      {pwOpen && <PasswordResetModal account={account} onClose={() => setPwOpen(false)} />}
    </div>
  );
}

// ── 스토리지 ───────────────────────────────────────────────────
// 기간별 다운로드 — 발행 최종본 선택 다운로드 (파일명 규칙 자동 적용)
function PeriodDownload() {
  const [from, setFrom] = useState("2026-04-01");
  const [to, setTo] = useState("2026-06-18");
  const [partner, setPartner] = useState("all");
  const [sel, setSel] = useState(() => new Set());

  const partnerOpts = [{ value: "all", label: "전체 파트너사" }, ...D.PARTNERS.map((p) => ({ value: p.id, label: p.name }))];
  const rows = D.FINAL_VIDEOS
    .filter((v) => (partner === "all" || v.partnerId === partner) && (!from || v.date >= from) && (!to || v.date <= to))
    .sort((a, b) => b.datetime.localeCompare(a.datetime));

  const ids = rows.map((r) => r.id);
  const allOn = ids.length > 0 && ids.every((id) => sel.has(id));
  const toggle = (id) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSel((s) => { const n = new Set(s); allOn ? ids.forEach((id) => n.delete(id)) : ids.forEach((id) => n.add(id)); return n; });

  // 현재 필터 결과 중 선택된 것 (필터 밖 선택은 집계 제외)
  const selRows = rows.filter((r) => sel.has(r.id));
  const selSize = selRows.reduce((s, r) => s + r.sizeMB, 0);
  const fmtSize = (mb) => (mb >= 1024 ? (mb / 1024).toFixed(1) + " GB" : mb + " MB");
  const fmtDt = (dt) => `${dt.slice(0, 2)}.${dt.slice(2, 4)}.${dt.slice(4, 6)} ${dt.slice(6, 8)}:${dt.slice(8, 10)}`;

  return (
    <Card title="기간별 다운로드" action={<span className="text-[11.5px]" style={{ color: FAINT }}>발행 최종본 · 파일명 규칙 자동 적용</span>}>
      {/* 필터 */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-40"><DateField label="시작일" value={from} onChange={setFrom} /></div>
        <div className="w-40"><DateField label="종료일" value={to} onChange={setTo} /></div>
        <div>
          <span className="text-[12px] font-semibold" style={{ color: MUTE }}>파트너사</span>
          <div className="mt-1"><SearchSelect value={partner} onChange={(v) => setPartner(v)} width={240} options={partnerOpts} /></div>
        </div>
        <span className="ml-auto pb-2 text-[12px] tabular-nums" style={{ color: MUTE }}>
          {rows.length}개 · {fmtSize(rows.reduce((s, r) => s + r.sizeMB, 0))}
        </span>
      </div>

      {/* 파일 목록 */}
      <div className="mt-3 overflow-hidden" style={{ border: "1px solid " + LINE, borderRadius: RADIUS }}>
        <div className="flex items-center gap-3 px-3 py-2 text-[11px] font-bold uppercase tracking-wide" style={{ background: "#f6f4ef", borderBottom: "1px solid " + LINE, color: MUTE }}>
          <button onClick={toggleAll} className="flex items-center outline-none" style={{ color: allOn ? GOLD : FAINT }} title="전체 선택" disabled={ids.length === 0}>
            {allOn ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
          </button>
          <span className="flex-1">파일명</span>
          <span className="w-24">반려동물</span>
          <span className="w-32 text-right">화장일시</span>
          <span className="w-20 text-right">용량</span>
          <span className="w-8" />
        </div>
        {rows.length === 0 && <div className="px-3 py-6 text-center text-[12.5px]" style={{ color: FAINT }}>선택한 기간에 발행 최종본이 없습니다.</div>}
        {rows.map((v) => {
          const on = sel.has(v.id);
          return (
            <div key={v.id} className="flex items-center gap-3 px-3 py-2.5" style={{ borderTop: "1px solid " + LINE, background: on ? GOLD_SOFT : SURFACE }}>
              <button onClick={() => toggle(v.id)} className="flex items-center outline-none" style={{ color: on ? GOLD : FAINT }}>
                {on ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
              </button>
              <span className="flex min-w-0 flex-1 items-center gap-2">
                <Clapperboard className="h-3.5 w-3.5 shrink-0" style={{ color: "#3f5e87" }} />
                <span className="truncate text-[12.5px] tabular-nums" style={{ color: INK, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{D.videoFileName(v)}</span>
              </span>
              <span className="w-24 truncate text-[12.5px]" style={{ color: MUTE }}>{v.deceased}</span>
              <span className="w-32 text-right text-[12px] tabular-nums" style={{ color: MUTE }}>{fmtDt(v.datetime)}</span>
              <span className="w-20 text-right text-[12px] tabular-nums" style={{ color: MUTE }}>{fmtSize(v.sizeMB)}</span>
              <button className="flex w-8 items-center justify-center p-1 outline-none" style={{ color: GOLD_D }} title="개별 다운로드"><Download className="h-3.5 w-3.5" /></button>
            </div>
          );
        })}
      </div>

      {/* 액션 */}
      <div className="mt-3 flex items-center gap-2">
        <span className="text-[12px] tabular-nums" style={{ color: selRows.length ? INK : FAINT }}>
          선택 <b style={{ color: selRows.length ? GOLD_D : FAINT }}>{selRows.length}</b>개 · {fmtSize(selSize)}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <Btn size="sm" variant="ghost" disabled={selRows.length === 0}><Download className="h-3.5 w-3.5" /> 선택 다운로드</Btn>
          <Btn size="sm" disabled={rows.length === 0}><Download className="h-3.5 w-3.5" /> 전체 ZIP ({fmtSize(rows.reduce((s, r) => s + r.sizeMB, 0))})</Btn>
        </div>
      </div>
      <p className="mt-2.5 text-[11px] leading-relaxed" style={{ color: FAINT }}>
        ※ 파일명 규칙 <span className="tabular-nums" style={{ color: MUTE, fontFamily: "ui-monospace, monospace" }}>파트너코드(4)_호실(2)_장례일시(YYMMDDHHmm).mp4</span> — 파트너코드는 등록순, 장례일시는 24시간 기준. 다운로드는 egress 0 서명 URL로 제공됩니다.
      </p>
    </Card>
  );
}

function Storage() {
  const { storageClasses: classes } = useStore();
  const s = D.STORAGE;
  const pct = Math.round((s.used / s.total) * 100);
  const setRet = (key, retention) => actions.setRetention(key, retention);

  return (
    <div>
      <PageHeader title="스토리지" sub="Cloudflare R2 — 자산 보존 정책 · 기간별 선택 다운로드 (egress 0 · 서명 URL)" right={<Btn size="sm" variant="ghost"><RefreshCw className="h-3.5 w-3.5" /> 사용량 새로고침</Btn>} />

      {/* 총 사용량 */}
      <Card title={`총 사용량 ${s.used}${s.unit} / ${s.total}${s.unit} (${pct}%)`}>
        <div className="h-3 w-full overflow-hidden" style={{ background: "#e7e2d8", borderRadius: 99 }}>
          <div className="h-full" style={{ width: pct + "%", background: pct > 85 ? STATUS.review.c : GOLD, borderRadius: 99 }} />
        </div>
        {pct > 85
          ? <p className="mt-2 flex items-center gap-1.5 text-[11.5px]" style={{ color: STATUS.review.c }}><AlertTriangle className="h-3.5 w-3.5" /> 용량 85% 초과 — 임시본 정리 또는 증설 검토</p>
          : <p className="mt-2 text-[11px]" style={{ color: FAINT }}>임시본은 보존일 경과 시 라이프사이클로 자동 삭제 → 무한 증가 방지.</p>}
      </Card>

      {/* 자산 보존 정책 (편집 + 정책별 백업 다운로드) */}
      <div className="mb-2 mt-5 text-[13px] font-bold" style={{ color: INK }}>자산 보존 정책 <span className="font-normal" style={{ color: FAINT }}>· 클래스별 R2 라이프사이클 · 외부 백업 다운로드</span></div>
      <div className="grid grid-cols-3 gap-3">
        {classes.map((c) => {
          const isNum = typeof c.retention === "number";
          return (
            <div key={c.key} className="flex flex-col px-4 py-3.5" style={{ background: SURFACE, border: "1px solid " + LINE, borderRadius: RADIUS }}>
              <div className="text-[13px] font-bold" style={{ color: INK }}>{c.name}</div>
              <div className="mt-0.5 text-[11.5px]" style={{ color: FAINT }}>{c.desc}</div>
              <div className="mt-2 text-[12px]" style={{ color: MUTE }}>{c.sizeGB} GB · <span className="tabular-nums">{c.files.toLocaleString()}</span>개</div>
              <div className="mt-3 flex items-center gap-1.5 border-t pt-3" style={{ borderColor: LINE }}>
                <button onClick={() => setRet(c.key, "permanent")} className="px-2.5 py-1.5 text-[12px] font-semibold" style={{ borderRadius: RADIUS, background: !isNum ? GOLD_SOFT : "#fff", color: !isNum ? GOLD_D : MUTE, border: "1px solid " + (!isNum ? GOLD_SOFT : LINE2) }}>영구</button>
                <button onClick={() => setRet(c.key, isNum ? c.retention : 30)} className="px-2.5 py-1.5 text-[12px] font-semibold" style={{ borderRadius: RADIUS, background: isNum ? GOLD_SOFT : "#fff", color: isNum ? GOLD_D : MUTE, border: "1px solid " + (isNum ? GOLD_SOFT : LINE2) }}>기간</button>
                {isNum && (
                  <div className="flex items-center gap-1">
                    <input type="number" min="1" value={c.retention} onChange={(e) => setRet(c.key, Math.max(1, +e.target.value))} className="w-14 px-2 text-[12.5px] tabular-nums outline-none" style={{ height: 32, background: "#fff", border: "1px solid " + LINE2, borderRadius: RADIUS, color: INK }} />
                    <span className="text-[12px]" style={{ color: MUTE }}>일 후 삭제</span>
                  </div>
                )}
              </div>
              <button className="mt-2 flex w-full items-center justify-center gap-1.5 py-2 text-[12.5px] font-semibold" style={{ borderRadius: RADIUS, border: "1px solid " + LINE2, color: GOLD_D }}>
                <Download className="h-3.5 w-3.5" /> 백업 다운로드 ({c.sizeGB} GB)
              </button>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[11px] leading-relaxed" style={{ color: FAINT }}>
        ※ 「백업 다운로드」로 각 정책의 자산을 외부 백업 저장장치에 내려받을 수 있습니다. 원본은 영구보관(요청 시 삭제) 정책입니다.
      </p>

      {/* 기간별 다운로드 — 발행 최종본 선택 */}
      <div className="mb-2 mt-6 text-[13px] font-bold" style={{ color: INK }}>기간별 다운로드 <span className="font-normal" style={{ color: FAINT }}>· 발행 최종본을 기간·파트너사로 골라 선택 다운로드</span></div>
      <PeriodDownload />
    </div>
  );
}

// ── 유저 입력 폼 빌더 ──────────────────────────────────────────
// 파트너사별 1개 폼. 공통 항목은 고정(잠금), 파트너사 전용 항목만 커스텀.
const FIELD_ICON = { user: User, paw: PawPrint, phone: Phone };

function FormPreviewField({ label, type, required }) {
  return (
    <div>
      <div className="mb-1 text-[11px] font-semibold" style={{ color: MUTE }}>{label}{required && <span style={{ color: GOLD }}> *</span>}</div>
      {type === "장문" ? (
        <div className="h-12 w-full" style={{ background: "#f6f3ec", border: "1px solid " + LINE, borderRadius: 6 }} />
      ) : (
        <div className="flex h-8 w-full items-center px-2 text-[11px]" style={{ background: "#f6f3ec", border: "1px solid " + LINE, borderRadius: 6, color: FAINT }}>{type === "사진" ? "사진 업로드" : type === "날짜" ? "YYYY-MM-DD" : type === "선택" ? "선택…" : ""}</div>
      )}
    </div>
  );
}

function FormBuilder() {
  const { formTemplates } = useStore(); // 목 DB — 파트너별 입력폼 항목
  const partners = D.PARTNERS;
  const [pid, setPid] = useState(partners.find((p) => p.active)?.id || partners[0].id);
  const partner = partners.find((p) => p.id === pid) || partners[0];
  const fields = formTemplates[pid] || [];
  const [label, setLabel] = useState("");
  const [type, setType] = useState(D.FORM_FIELD_TYPES[0]);
  const [required, setRequired] = useState(false);

  const addField = () => {
    const l = label.trim();
    if (!l) return;
    const f = { id: "ff-" + Date.now(), label: l, type, required };
    actions.setFormFields(pid, [...(formTemplates[pid] || []), f]);
    setLabel(""); setType(D.FORM_FIELD_TYPES[0]); setRequired(false);
  };
  const removeField = (id) => actions.setFormFields(pid, (formTemplates[pid] || []).filter((f) => f.id !== id));

  return (
    <div>
      <PageHeader title="유저 입력 폼 빌더" sub="파트너사별 1개 폼 — 공통 항목은 고정, 전용 항목만 커스텀" right={
        <><Btn size="sm" variant="ghost"><Eye className="h-3.5 w-3.5" /> 미리보기</Btn><Btn size="sm"><Check className="h-3.5 w-3.5" /> 저장</Btn></>
      } />
      <div className="flex gap-4">
        {/* 파트너사 선택 */}
        <div className="flex w-56 shrink-0 flex-col gap-2">
          <div className="px-1 text-[12px] font-bold" style={{ color: INK }}>파트너사 선택</div>
          <SearchSelect value={pid} onChange={setPid} placeholder="파트너사" width="100%"
            options={partners.filter((p) => p.active).map((p) => ({ value: p.id, label: p.name }))} />
          <button className="px-3 py-2 text-[12.5px] font-semibold outline-none" style={{ borderRadius: RADIUS, background: "transparent", color: FAINT, border: "1px dashed " + LINE2 }}><Plus className="mr-1 inline h-3.5 w-3.5" /> 파트너사 추가</button>
        </div>

        {/* 빌더 본문 */}
        <div className="min-w-0 flex-1">
          <Card title={partner.name + " — 유저 입력 폼"}>
            {/* 공통 항목 (고정) */}
            <div className="mb-2 flex items-center gap-1.5 text-[12.5px] font-bold" style={{ color: INK }}>
              <Lock className="h-3.5 w-3.5" style={{ color: MUTE }} /> 공통 항목 (고정)
            </div>
            <div className="mb-5 overflow-hidden" style={{ background: "#faf8f3", border: "1px solid " + LINE, borderRadius: RADIUS }}>
              {D.FORM_COMMON_FIELDS.map((f, i) => {
                const Ico = FIELD_ICON[f.icon] || User;
                return (
                  <div key={f.key} className="flex items-center justify-between px-4 py-2.5" style={{ borderTop: i ? "1px solid " + LINE : "none" }}>
                    <span className="flex items-center gap-2 text-[13px]" style={{ color: INK }}><Ico className="h-4 w-4" style={{ color: MUTE }} strokeWidth={1.9} /> {f.label}</span>
                    {f.required && <span className="text-[11px] font-bold" style={{ color: GOLD_D }}>필수</span>}
                  </div>
                );
              })}
            </div>

            {/* 파트너사 전용 항목 */}
            <div className="mb-2 flex items-center gap-1.5 text-[12.5px] font-bold" style={{ color: INK }}>
              <Target className="h-3.5 w-3.5" style={{ color: GOLD_D }} /> 파트너사 전용 항목
            </div>
            <div className="px-4 py-3.5" style={{ background: "#faf8f3", border: "1px solid " + LINE, borderRadius: RADIUS }}>
              <div className="mb-2 text-[12px] font-bold" style={{ color: INK }}>항목 추가</div>
              <div className="flex gap-2">
                <input value={label} onChange={(e) => setLabel(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addField()} placeholder="항목명 (예: 반려동물 품종)" className="min-w-0 flex-1 px-3 text-[13px] outline-none" style={{ height: 36, background: SURFACE, border: "1px solid " + LINE, borderRadius: RADIUS, color: INK }} />
                <select value={type} onChange={(e) => setType(e.target.value)} className="px-2 text-[13px] outline-none" style={{ height: 36, background: SURFACE, border: "1px solid " + LINE, borderRadius: RADIUS, color: INK }}>
                  {D.FORM_FIELD_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="mt-2.5 flex items-center justify-between">
                <label className="flex cursor-pointer items-center gap-2 text-[13px] font-semibold" style={{ color: INK }}>
                  <input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} className="h-4 w-4" style={{ accentColor: GOLD }} /> 필수 항목
                </label>
                <Btn size="sm" onClick={addField}><Plus className="h-3.5 w-3.5" /> 추가</Btn>
              </div>
            </div>

            {/* 추가된 전용 항목 목록 */}
            {fields.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {fields.map((f) => (
                  <div key={f.id} className="flex items-center justify-between px-3.5 py-2.5" style={{ background: SURFACE, border: "1px solid " + LINE, borderRadius: RADIUS }}>
                    <span className="flex items-center gap-2 text-[13px]" style={{ color: INK }}>
                      {f.label}
                      <span className="px-1.5 py-[1px] text-[11px] font-semibold" style={{ background: "#e9eef5", color: "#3f5e87", borderRadius: 3 }}>{f.type}</span>
                      {f.required && <span className="text-[11px] font-bold" style={{ color: GOLD_D }}>필수</span>}
                    </span>
                    <button onClick={() => removeField(f.id)} className="p-1 outline-none" style={{ color: FAINT }} aria-label="삭제"><X className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* 유저에게 보이는 화면 (미리보기) */}
        <div className="w-72 shrink-0">
          <div className="px-1 pb-2 text-[12px] font-semibold" style={{ color: MUTE }}>유저에게 보이는 화면</div>
          <div className="overflow-hidden" style={{ background: SURFACE, border: "1px solid " + LINE, borderRadius: 14 }}>
            <div className="px-4 py-3 text-center text-[12.5px] font-bold" style={{ background: "#faf7f1", borderBottom: "1px solid " + LINE, color: INK }}>{partner.name}<div className="mt-0.5 text-[11px] font-normal" style={{ color: FAINT }}>정보 입력</div></div>
            <div className="space-y-3 px-4 py-4">
              {D.FORM_COMMON_FIELDS.map((f) => <FormPreviewField key={f.key} label={f.label} type="텍스트" required={f.required} />)}
              {fields.map((f) => <FormPreviewField key={f.id} label={f.label} type={f.type} required={f.required} />)}
              <button className="mt-1 w-full py-2 text-[12.5px] font-bold text-white" style={{ background: GOLD, borderRadius: RADIUS }}>제출</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 계정·권한 관리 (마스터 전용 — 작업자 추가 + 권한 선택) ─────────
function AccountsManage({ account }) {
  const { accounts } = useStore();
  const isMaster = account.role === "master";
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [loginId, setLoginId] = useState("");
  const [pw, setPw] = useState("");
  const [editId, setEditId] = useState(null); // 권한 편집 중인 작업자

  // 초기 비밀번호 자동생성 (목업 — 영문+숫자 8자리)
  const genPw = () => {
    const c = "abcdefghijkmnpqrstuvwxyz23456789";
    setPw(Array.from({ length: 8 }, () => c[Math.floor(Math.random() * c.length)]).join(""));
  };

  const stTag = { active: { s: "online", label: "활성" }, invited: { s: "waiting", label: "초대됨" }, disabled: { s: "offline", label: "비활성" } };
  const roleBadge = (role) => (
    <span className="inline-flex items-center gap-1 px-2 py-[3px] text-[11px] font-semibold" style={{ borderRadius: 3, background: role === "master" ? GOLD_SOFT : "#eceef0", color: role === "master" ? GOLD_D : "#5a6470" }}>
      {role === "master" ? <ShieldCheck className="h-3 w-3" /> : <User className="h-3 w-3" />} {D.ADMIN_ROLES[role].label}
    </span>
  );

  const idTaken = accounts.some((a) => a.loginId === loginId.trim());
  const canAdd = name.trim() && loginId.trim() && pw.trim() && !idTaken;
  const addWorker = () => {
    if (!canAdd) return;
    actions.addAccount({ id: "u-" + Date.now(), name: name.trim(), role: "worker", loginId: loginId.trim(), email: "—", status: "invited", lastLogin: "—", perms: [...D.DEFAULT_WORKER_PERMS] });
    setName(""); setLoginId(""); setPw(""); setAdding(false);
  };
  const removeAcct = (id) => { actions.removeAccount(id); if (editId === id) setEditId(null); };
  // 비밀번호 재설정 (목업) — 임시 비번 발급 → 첫 로그인 시 변경
  const resetPw = (r) => window.alert(`${r.name}(${r.loginId}) 계정의 임시 비밀번호가 발급되었습니다.\n첫 로그인 시 비밀번호 변경이 필요합니다. (목업)`);
  const togglePerm = (id, key) => actions.toggleAccountPerm(id, key);
  const setAllPerms = (id, on) => actions.setAccountPerms(id, on ? [...D.GRANTABLE_PERMS] : []);

  const editing = editId ? accounts.find((a) => a.id === editId) : null;

  const cols = [
    { key: "name", label: "이름" }, { key: "loginId", label: "아이디" }, { key: "role", label: "역할" }, { key: "perms", label: "권한" },
    { key: "status", label: "상태" }, { key: "lastLogin", label: "최근 접속" }, { key: "act", label: "", align: "right" },
  ];
  return (
    <div>
      <PageHeader title="계정·권한" sub="마스터 = 풀 액세스 · 작업자 = 마스터가 선택한 권한만"
        right={isMaster ? <Btn size="sm" onClick={() => setAdding((v) => !v)}><UserPlus className="h-4 w-4" /> 작업자 추가</Btn> : null} />

      {!isMaster && (
        <div className="mb-3 flex items-center gap-2 px-3 py-2.5 text-[12.5px]" style={{ background: "#f6f3ec", border: "1px solid " + LINE, borderRadius: RADIUS, color: MUTE }}>
          <Lock className="h-4 w-4" style={{ color: FAINT }} /> 계정·권한 관리는 마스터 관리자 전용입니다.
        </div>
      )}

      {isMaster && adding && (
        <div className="mb-3 px-4 py-3.5" style={{ background: SURFACE, border: "1px solid " + LINE, borderRadius: RADIUS }}>
          <div className="flex items-end gap-2">
            <label className="flex-1"><div className="mb-1 text-[12px] font-semibold" style={{ color: MUTE }}>이름</div>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="작업자 이름" className="w-full px-3 text-[13px] outline-none" style={{ height: 36, background: "#fff", border: "1px solid " + LINE2, borderRadius: RADIUS, color: INK }} /></label>
            <label className="flex-1"><div className="mb-1 text-[12px] font-semibold" style={{ color: MUTE }}>아이디</div>
              <input value={loginId} onChange={(e) => setLoginId(e.target.value)} placeholder="로그인 아이디" className="w-full px-3 text-[13px] outline-none" style={{ height: 36, background: "#fff", border: "1px solid " + (idTaken ? "#8a4b1c" : LINE2), borderRadius: RADIUS, color: INK }} /></label>
            <label className="flex-1"><div className="mb-1 text-[12px] font-semibold" style={{ color: MUTE }}>초기 비밀번호</div>
              <div className="flex items-center gap-1.5">
                <input value={pw} onChange={(e) => setPw(e.target.value)} placeholder="초기 비밀번호" className="w-full px-3 text-[13px] outline-none" style={{ height: 36, background: "#fff", border: "1px solid " + LINE2, borderRadius: RADIUS, color: INK }} />
                <button type="button" onClick={genPw} title="자동생성" className="flex shrink-0 items-center justify-center" style={{ height: 36, width: 36, background: "#f6f3ec", border: "1px solid " + LINE2, borderRadius: RADIUS, color: GOLD_D }}><RefreshCw className="h-4 w-4" /></button>
              </div></label>
            <label className="w-32"><div className="mb-1 text-[12px] font-semibold" style={{ color: MUTE }}>역할</div>
              <div className="flex items-center px-3 text-[13px]" style={{ height: 36, background: "#f6f3ec", border: "1px solid " + LINE2, borderRadius: RADIUS, color: MUTE }}>작업자 (고정)</div></label>
            <Btn size="sm" onClick={addWorker} disabled={!canAdd}><Check className="h-4 w-4" /> 계정 발급</Btn>
            <Btn size="sm" variant="neutral" onClick={() => setAdding(false)}>취소</Btn>
          </div>
          <p className="mt-2 text-[11px]" style={{ color: idTaken ? "#8a4b1c" : FAINT }}>
            {idTaken ? "※ 이미 사용 중인 아이디입니다." : "※ 아이디·초기 비밀번호 발급 후 작업자에게 전달 — 첫 로그인 시 비밀번호 변경. 권한은 발급 후 아래에서 지정."}
          </p>
        </div>
      )}

      <Table cols={cols} rows={accounts} renderCell={(r, k) =>
        k === "name" ? (
          <span className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: r.role === "master" ? GOLD : "#3f5e87" }}>{r.name.slice(0, 1)}</span>
            <span className="font-semibold" style={{ color: INK }}>{r.name}</span>
            {r.id === account.id && <span className="text-[10.5px] font-semibold" style={{ color: GOLD_D }}>· 나</span>}
          </span>
        ) :
        k === "loginId" ? <span className="inline-flex items-center gap-1.5 text-[12.5px] tabular-nums font-semibold" style={{ color: MUTE }}><KeyRound className="h-3.5 w-3.5" style={{ color: FAINT }} /> {r.loginId}</span> :
        k === "role" ? roleBadge(r.role) :
        k === "perms" ? (r.role === "master"
          ? <span className="text-[12px] font-semibold" style={{ color: GOLD_D }}>전체 (풀 액세스)</span>
          : <span className="text-[12px] tabular-nums" style={{ color: MUTE }}>{(r.perms || []).length} / {D.GRANTABLE_PERMS.length}개</span>) :
        k === "status" ? <Tag s={stTag[r.status].s} label={stTag[r.status].label} /> :
        k === "act" ? (isMaster && r.role !== "master"
          ? <span className="inline-flex items-center gap-3">
              <button onClick={() => setEditId(editId === r.id ? null : r.id)} className="inline-flex items-center gap-1 text-[12px] font-semibold" style={{ color: editId === r.id ? GOLD_D : GOLD }}><Settings className="h-3.5 w-3.5" /> 권한 편집</button>
              <button onClick={() => resetPw(r)} className="inline-flex items-center gap-1 text-[12px] font-semibold" style={{ color: MUTE }}><RotateCcw className="h-3.5 w-3.5" /> 비번 재설정</button>
              <button onClick={() => removeAcct(r.id)} className="inline-flex items-center gap-1 text-[12px] font-semibold" style={{ color: MUTE }}><Trash2 className="h-3.5 w-3.5" /> 삭제</button>
            </span>
          : <span className="text-[11px]" style={{ color: FAINT }}>{r.role === "master" ? "권한 고정" : ""}</span>) : r[k]
      } />

      {/* 권한 선택 패널 (마스터가 작업자별로 토글) */}
      {isMaster && editing && (
        <div className="mt-3 px-4 py-4" style={{ background: SURFACE, border: "1px solid " + GOLD_SOFT, borderRadius: RADIUS }}>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[13px] font-bold" style={{ color: INK }}>
              <ShieldCheck className="h-4 w-4" style={{ color: GOLD_D }} /> {editing.name} 권한 설정
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setAllPerms(editing.id, true)} className="text-[12px] font-semibold" style={{ color: GOLD }}>전체 허용</button>
              <span style={{ color: LINE2 }}>·</span>
              <button onClick={() => setAllPerms(editing.id, false)} className="text-[12px] font-semibold" style={{ color: MUTE }}>전체 해제</button>
              <button onClick={() => setEditId(null)} className="ml-1 p-0.5" style={{ color: FAINT }}><X className="h-4 w-4" /></button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {D.GRANTABLE_PERMS.map((key) => {
              const on = (editing.perms || []).includes(key);
              return (
                <button key={key} onClick={() => togglePerm(editing.id, key)}
                  className="flex items-center gap-2 px-3 py-2.5 text-left outline-none transition focus-visible:ring-1"
                  style={{ background: on ? GOLD_SOFT : "#fff", border: "1.5px solid " + (on ? GOLD : LINE2), borderRadius: RADIUS }}>
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-sm" style={{ background: on ? GOLD : "transparent", border: on ? "none" : "1.5px solid " + LINE2 }}>
                    {on && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                  </span>
                  <span className="text-[12.5px] font-semibold" style={{ color: on ? GOLD_D : MUTE }}>{D.ADMIN_PAGES[key]}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-[11px]" style={{ color: FAINT }}>※ 계정·권한 관리는 마스터 고유 권한이라 작업자에게 위임할 수 없습니다.</p>
        </div>
      )}

      <p className="mt-3 text-[11px] leading-relaxed" style={{ color: FAINT }}>
        ※ 마스터는 모든 페이지 + 계정관리(풀 액세스). 작업자는 위에서 켠 권한만 사이드바·접근에 노출 — 좌상단 계정 전환으로 바로 확인 가능. 파트너/유저 링크는 1:1이라 권한체계 없음.
      </p>
    </div>
  );
}

// ── 사이드바 + 라우팅 셸 ───────────────────────────────────────
const ICON = { size: "h-4 w-4", sw: 1.9 };

// ── 현재 로그인 계정 (사이드바 좌상단 · 계정 전환은 목업) ──────────
function UserChip({ account, accounts, onSwitch }) {
  const [open, setOpen] = useState(false);
  const role = D.ADMIN_ROLES[account.role];
  return (
    <div className="relative px-4 pb-3 pt-3.5">
      <button onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2.5 px-2.5 py-2 text-left outline-none focus-visible:ring-1"
        style={{ background: "#202b3a", border: "1px solid " + NAV_LINE, borderRadius: 8 }}>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white" style={{ background: account.role === "master" ? GOLD : "#3f5e87" }}>{account.name.slice(0, 1)}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[12.5px] font-bold" style={{ color: "#eef0f3" }}>{account.name}</span>
          <span className="block text-[11px]" style={{ color: account.role === "master" ? "#d8b06a" : "#9aa6b6" }}>{role.label}</span>
        </span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0" style={{ color: "#79828f" }} />
      </button>
      {open && (
        <div className="absolute left-4 right-4 z-20 mt-1 overflow-hidden" style={{ background: SURFACE, border: "1px solid " + LINE, borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,.18)" }}>
          <div className="px-3 py-1.5 text-[10.5px] font-bold uppercase tracking-wide" style={{ color: FAINT, borderBottom: "1px solid " + LINE }}>계정 전환 · 목업</div>
          {accounts.filter((a) => a.status === "active").map((a) => (
            <button key={a.id} onClick={() => { onSwitch(a); setOpen(false); }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left outline-none" style={{ background: a.id === account.id ? GOLD_SOFT : "transparent" }}>
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: a.role === "master" ? GOLD : "#3f5e87" }}>{a.name.slice(0, 1)}</span>
              <span className="flex-1 text-[12.5px]" style={{ color: INK }}>{a.name}</span>
              <span className="text-[11px]" style={{ color: MUTE }}>{D.ADMIN_ROLES[a.role].label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── 상단바 (전체 보기 + 알림) ──────────────────────────────────
function Topbar() {
  const [open, setOpen] = useState(false);
  return (
    <header className="relative flex items-center justify-between px-6" style={{ background: NAVY, height: 48 }}>
      <div className="flex items-center gap-2 text-[12px]" style={{ color: "#8b94a3" }}>
        <Shield className="h-3.5 w-3.5" /> {D.PARTNERS[0].name} 외 {D.PARTNERS.length - 1}개 파트너사 · 전체 보기
      </div>
      <button onClick={() => setOpen((v) => !v)} className="relative p-1.5 outline-none focus-visible:ring-1" style={{ color: "#8b94a3" }} aria-label="알림">
        <Bell className="h-4 w-4" strokeWidth={1.9} />
        <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full" style={{ background: GOLD }} />
      </button>
      {open && (
        <div className="absolute right-4 top-12 z-10 w-80 overflow-hidden" style={{ background: SURFACE, border: "1px solid " + LINE, borderRadius: RADIUS, boxShadow: "0 8px 24px rgba(0,0,0,.12)" }}>
          <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wide" style={{ color: MUTE, borderBottom: "1px solid " + LINE }}>알림</div>
          {D.NOTIFICATIONS.map((n) => (
            <div key={n.id} className="flex items-start gap-2 px-3 py-2.5" style={{ borderBottom: "1px solid " + LINE }}>
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: STATUS[n.kind] ? STATUS[n.kind].c : GOLD }} />
              <span className="text-[12.5px]" style={{ color: INK }}>{n.text}</span>
            </div>
          ))}
        </div>
      )}
    </header>
  );
}

export default function AdminConsole({ onOpenEditor }) {
  const { accounts } = useStore();
  const [accountId, setAccountId] = useState(D.ADMIN_ACCOUNTS[0].id); // 기본: 마스터 관리자
  const account = accounts.find((a) => a.id === accountId) || accounts[0];
  const [page, setPage] = useState("overview");
  const go = (p) => setPage(p);
  const canFor = (a, k) => k === "mysettings" || a.role === "master" || (a.perms || []).includes(k); // 마스터=풀 액세스 · 내 설정은 모두 접근
  const can = (k) => canFor(account, k);
  const NAV_ORDER = ["overview", "partners", "customer", "formbuilder", "producing", "secondedit", "templates", "content", "settlement", "mysettings", "accounts", "settings", "storage", "signage"];
  const switchAccount = (a) => { setAccountId(a.id); if (!canFor(a, page)) setPage(NAV_ORDER.find((k) => canFor(a, k)) || "mysettings"); };
  const activePage = can(page) ? page : (NAV_ORDER.find(can) || "mysettings"); // 권한 없는 페이지는 접근 가능한 첫 페이지로

  return (
    <div className="flex" style={{ minHeight: "calc(100vh - 44px)" }}>
      <aside className="flex w-60 flex-col" style={{ background: NAVY }}>
        <div className="flex items-center justify-center px-5" style={{ height: 76, background: NAVY, borderBottom: "1px solid " + NAV_LINE }}>
          <div className="flex items-center justify-center rounded-full bg-white px-5 py-2.5">
            <Logo height={30} />
          </div>
        </div>
        <UserChip account={account} accounts={accounts} onSwitch={switchAccount} />
        <nav className="flex-1 overflow-y-auto px-2.5 pb-4">
          {(can("overview") || can("partners") || can("customer") || can("formbuilder")) && <NavSection>총괄</NavSection>}
          {can("overview") && <NavItem icon={<LayoutGrid className={ICON.size} strokeWidth={ICON.sw} />} label="대시보드" active={activePage === "overview"} onClick={() => go("overview")} />}
          {can("partners") && <NavItem icon={<Users2 className={ICON.size} strokeWidth={ICON.sw} />} label="파트너사 관리" active={activePage === "partners"} onClick={() => go("partners")} />}
          {can("customer") && <NavItem icon={<UserCircle className={ICON.size} strokeWidth={ICON.sw} />} label="고객관리" active={activePage === "customer"} onClick={() => go("customer")} />}
          {can("formbuilder") && <NavItem icon={<ClipboardList className={ICON.size} strokeWidth={ICON.sw} />} label="유저 입력 폼" active={activePage === "formbuilder"} onClick={() => go("formbuilder")} />}

          {(can("producing") || can("secondedit") || can("templates") || can("content")) && <NavSection>추모영상 제작</NavSection>}
          {can("producing") && <NavItem icon={<Clapperboard className={ICON.size} strokeWidth={ICON.sw} />} label="편집·컨펌" active={activePage === "producing"} onClick={() => go("producing")} />}
          {can("secondedit") && <NavItem icon={<Scissors className={ICON.size} strokeWidth={ICON.sw} />} label="2차 가공" active={activePage === "secondedit"} onClick={() => go("secondedit")} />}
          {can("templates") && <NavItem icon={<LayoutTemplate className={ICON.size} strokeWidth={ICON.sw} />} label="영상 템플릿" active={activePage === "templates"} onClick={() => go("templates")} />}
          {can("content") && <NavItem icon={<FolderOpen className={ICON.size} strokeWidth={ICON.sw} />} label="콘텐츠 허브" active={activePage === "content"} onClick={() => go("content")} />}

          {can("settlement") && <>
            <NavSection>정산</NavSection>
            <NavItem icon={<Wallet className={ICON.size} strokeWidth={ICON.sw} />} label="정산 내역" active={activePage === "settlement"} onClick={() => go("settlement")} />
          </>}

          <NavSection>환경설정</NavSection>
          <NavItem icon={<KeyRound className={ICON.size} strokeWidth={ICON.sw} />} label="내 설정" active={activePage === "mysettings"} onClick={() => go("mysettings")} />
          {can("accounts") && <NavItem icon={<ShieldCheck className={ICON.size} strokeWidth={ICON.sw} />} label="계정·권한" active={activePage === "accounts"} onClick={() => go("accounts")} />}
          {can("settings") && <NavItem icon={<Settings className={ICON.size} strokeWidth={ICON.sw} />} label="설정" active={activePage === "settings"} onClick={() => go("settings")} />}

          {(can("storage") || can("signage")) && <>
            <div className="my-3 border-t" style={{ borderColor: NAV_LINE }} />
            <NavSection>시스템 · 총관리자</NavSection>
            {can("storage") && <NavItem icon={<HardDrive className={ICON.size} strokeWidth={ICON.sw} />} label="스토리지" active={activePage === "storage"} onClick={() => go("storage")} />}
            {can("signage") && <NavItem icon={<MonitorPlay className={ICON.size} strokeWidth={ICON.sw} />} label="사이니지" active={activePage === "signage"} onClick={() => go("signage")} />}
          </>}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col" style={{ background: BG }}>
        <Topbar />
        <main className="flex-1 px-6 py-5">
          {activePage === "overview" && <Dashboard />}
          {activePage === "partners" && <PartnersManage />}
          {activePage === "customer" && <Customers />}
          {activePage === "producing" && <Producing onOpenEditor={onOpenEditor} account={account} />}
          {activePage === "secondedit" && <SecondEdit onOpenEditor={onOpenEditor} account={account} />}
          {activePage === "templates" && <Templates />}
          {activePage === "content" && <ContentHub />}
          {activePage === "settlement" && <Settlement />}
          {activePage === "accounts" && <AccountsManage account={account} />}
          {activePage === "formbuilder" && <FormBuilder />}
          {activePage === "settings" && <SettingsView />}
          {activePage === "mysettings" && <MySettings account={account} />}
          {activePage === "storage" && <Storage />}
          {activePage === "signage" && <Signage />}
        </main>
        <footer className="px-6 py-3 text-[11px]" style={{ color: FAINT, borderTop: "1px solid " + LINE }}>
          Memoriaworks · 관리자({D.ADMIN_ROLES[account.role].label}) · 목업 (실데이터 아님)
        </footer>
      </div>
    </div>
  );
}

