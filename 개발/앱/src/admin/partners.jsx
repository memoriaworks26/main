// [총괄] 파트너사 관리 — 목록·상세·신규 등록 모달.
import React, { useState, useEffect } from "react";
import {
  Check, ChevronRight, Plus, Search, X, Upload, Image as ImageIcon,
} from "lucide-react";
import { SURFACE, LINE, LINE2, GOLD, GOLD_D, GOLD_SOFT, INK, MUTE, FAINT, STATUS, RADIUS } from "../theme.js";
import { Tag, Btn, Card, Summary, Table, PageHeader, Modal, CopyBtn, useTableSort } from "../ui.jsx";
import { useStore, actions, partnerSettle, ymKST, countReservInMonth } from "../store.js";
import { confirm } from "../confirm.jsx";
import { won, parseNum as num } from "../lib/format.js";
import { matchQuery } from "../lib/util.js";
const today = () => new Date().toISOString().slice(0, 10); // 계약일 자동 기입용 (YYYY-MM-DD)

// 파트너사 로고 입력 — 파일 선택 → data URL. 등록 모달·상세 편집 공용.
function LogoInput({ value, onChange }) {
  const ref = React.useRef(null);
  const onPick = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result);
    reader.readAsDataURL(file);
    e.target.value = ""; // 같은 파일 재선택 허용
  };
  return (
    <div className="flex items-center gap-3">
      <div className="flex shrink-0 items-center justify-center overflow-hidden" style={{ width: 56, height: 56, background: SURFACE, border: "1px solid " + LINE2, borderRadius: RADIUS }}>
        {value ? <img src={value} alt="로고" className="h-full w-full object-contain" /> : <ImageIcon className="h-5 w-5" style={{ color: FAINT }} strokeWidth={1.8} />}
      </div>
      <div className="flex items-center gap-1.5">
        <button type="button" onClick={() => ref.current?.click()}
          className="flex items-center gap-1 px-2.5 py-1.5 text-[12px] font-semibold outline-none hover:bg-black/[.02]"
          style={{ border: "1px solid " + LINE2, color: GOLD_D, borderRadius: RADIUS }}>
          <Upload className="h-3.5 w-3.5" /> {value ? "변경" : "로고 업로드"}
        </button>
        {value && <button type="button" onClick={() => onChange("")} className="px-2 py-1.5 text-[12px] outline-none hover:opacity-70" style={{ color: FAINT }}>제거</button>}
      </div>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={onPick} />
    </div>
  );
}

function PartnerRegisterModal({ open, onClose }) {
  const { partners, bizUnits, bizUnit } = useStore();
  const bizName = bizUnits.find((b) => b.id === bizUnit)?.name || "";  // 신규 파트너는 현재 사업부로 등록됨
  const blank = { idCode: "", name: "", region: "", rooms: "", bizNo: "", ceo: "", address: "", bizType: "", bizItem: "", manager: "", phone: "", email: "", logo: "", memo: "" };
  const [f, setF] = useState(blank);
  useEffect(() => { if (open) setF(blank); /* eslint-disable-next-line */ }, [open]);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const idCode = f.idCode.trim();
  const dupCode = !!idCode && partners.some((p) => String(p.idCode || "").toLowerCase() === idCode.toLowerCase());
  // ID코드 = 로그인 아이디 = 초기 비밀번호 → 비번 정책(최소 6자) 위해 6자 이상.
  const canSubmit = !!f.name.trim() && idCode.length >= 6 && !dupCode;
  const nextId = () => {
    const nums = partners.map((p) => parseInt(String(p.id).replace(/\D/g, ""), 10)).filter((n) => !isNaN(n));
    return "P-" + String((nums.length ? Math.max(...nums) : 0) + 1).padStart(3, "0");
  };
  const submit = async () => {
    if (!canSubmit) return;
    if (!(await confirm({ title: "파트너사 등록", message: `${f.name.trim()} 파트너사를 신규 등록합니다.` }))) return;
    actions.addPartner({
      id: nextId(), idCode,
      bizUnit: f.bizUnit, name: f.name.trim(), region: f.region.trim(), rooms: num(f.rooms),
      bizNo: f.bizNo.trim(), ceo: f.ceo.trim(), address: f.address.trim(), bizType: f.bizType.trim(), bizItem: f.bizItem.trim(),
      manager: f.manager.trim(), phone: f.phone.trim(), email: f.email.trim(),
      logo: f.logo || "", memo: f.memo.trim(), contractDate: today(),
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
          <div className="col-span-2">
            <span className="text-[12px] font-semibold" style={{ color: MUTE }}>로고</span>
            <div className="mt-1"><LogoInput value={f.logo} onChange={(v) => setF((s) => ({ ...s, logo: v }))} /></div>
          </div>
          <label className="block">
            <span className="text-[12px] font-semibold" style={{ color: MUTE }}>사업부</span>
            <div className="mt-1 flex items-center px-3 text-[13px]" style={{ height: 34, background: "#f6f3ec", border: "1px solid " + LINE2, borderRadius: RADIUS, color: INK }}>{bizName}<span className="ml-1.5 text-[11.5px]" style={{ color: FAINT }}>· 현재 선택된 사업부로 등록</span></div>
          </label>
          {field("파트너사명 *", "name")}
          <label className="block">
            <span className="text-[12px] font-semibold" style={{ color: MUTE }}>ID 코드(로그인 ID) *</span>
            <input value={f.idCode} onChange={set("idCode")} placeholder="예: greenfield (6자 이상)"
              className="mt-1 w-full px-3 text-[13px] outline-none" style={{ height: 34, background: "#fff", border: "1px solid " + (dupCode ? "#8a4b1c" : LINE2), borderRadius: RADIUS, color: INK }} />
            <span className="mt-1 block text-[10.5px]" style={{ color: dupCode ? "#8a4b1c" : FAINT }}>{dupCode ? "이미 사용 중인 ID 코드입니다" : "파트너사 로그인 ID로 사용 · 고유 코드(내부 식별자)는 자동 부여"}</span>
          </label>
          {field("지역", "region")}
          {field("호실 수", "rooms", { inputMode: "numeric" })}
          <label className="block">
            <span className="text-[12px] font-semibold" style={{ color: MUTE }}>계약일</span>
            <input value={today()} disabled
              className="mt-1 w-full px-3 text-[13px] tabular-nums outline-none" style={{ height: 34, background: SURFACE, border: "1px solid " + LINE2, borderRadius: RADIUS, color: FAINT }} />
            <span className="mt-1 block text-[10.5px]" style={{ color: FAINT }}>등록일로 자동 기입됩니다</span>
          </label>
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
        {section("비고", <>
          <div className="col-span-2">
            <textarea value={f.memo} onChange={set("memo")} rows={3} placeholder="특이사항·메모를 자유롭게 적어주세요"
              className="w-full px-3 py-2 text-[13px] outline-none" style={{ background: "#fff", border: "1px solid " + LINE2, borderRadius: RADIUS, color: INK, resize: "vertical" }} />
          </div>
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
function PartnerDetail({ partner: p, onBack, go }) {
  const goLink = (page) => go && (
    <button onClick={() => go(page)} className="flex items-center gap-0.5 text-[12px] font-semibold outline-none hover:underline" style={{ color: GOLD }}>바로가기 <ChevronRight className="h-3.5 w-3.5" /></button>
  );
  const store = useStore();
  const { partners, reservations, devices } = store;
  const [editing, setEditing] = useState(false);
  // 건당 단가는 [정산 내역]에서 관리 — 파트너사 편집에서는 다루지 않음
  const seed = () => ({ idCode: p.idCode || "", name: p.name, region: p.region, manager: p.manager, phone: p.phone || "", logo: p.logo || "", memo: p.memo || "", active: p.active });
  const [f, setF] = useState(seed);
  const startEdit = () => { setF(seed()); setEditing(true); };
  const cancelEdit = () => setEditing(false);
  const idCode = f.idCode.trim();
  const dupCode = !!idCode && partners.some((x) => x.id !== p.id && String(x.idCode || "").toLowerCase() === idCode.toLowerCase());
  const canSave = !!f.name.trim() && idCode.length >= 6 && !dupCode;
  const save = async () => {
    if (!canSave) return;
    if (!(await confirm({ title: "파트너사 정보 저장", message: "변경한 파트너사 정보를 저장합니다." }))) return;
    actions.updatePartner(p.id, { idCode, name: f.name.trim(), region: f.region.trim(), manager: f.manager.trim(), phone: f.phone.trim(), logo: f.logo || "", memo: f.memo.trim(), active: f.active });
    setEditing(false);
  };
  const rs = reservations.filter((r) => r.partner === p.name);
  const dv = devices.filter((d) => d.partner === p.name);
  const settle = partnerSettle(store, p.name);  // [QA-P1] store 매출·입금에서 집계(목업 제거)
  const cnt = (s) => rs.filter((r) => r.status === s).length;
  const online = dv.filter((d) => d.status !== "offline").length;
  const row = (label, val) => (
    <div className="flex gap-2 text-[13px]"><span style={{ color: MUTE }}>{label}</span><span style={{ color: INK }}>{val}</span></div>
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
      <PageHeader title={p.name} sub={p.region + " · 파트너사 상세"} back={{ onClick: onBack, label: "뒤로" }}
        right={<div className="flex items-center gap-2">
          <Tag s={(editing ? f.active : p.active) ? "online" : "offline"} label={(editing ? f.active : p.active) ? "활성" : "비활성"} />
          {editing
            ? <><Btn size="sm" variant="neutral" onClick={cancelEdit}>취소</Btn><Btn size="sm" onClick={save} disabled={!canSave}><Check className="h-3.5 w-3.5" /> 저장</Btn></>
            : <Btn size="sm" variant="neutral" onClick={startEdit}>수정</Btn>}
        </div>} />
      <div className="mb-4">
        <Summary items={[["담당자", p.manager], ["호실", p.rooms + "실"], ["이번달 예약", p.reservThisMonth + "건"], ["계약일", p.contractDate || "—"]]} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Card title="기본 정보">
          {editing ? (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-3 text-[13px]"><span className="shrink-0" style={{ color: MUTE }}>로고</span><LogoInput value={f.logo} onChange={(v) => setF((s) => ({ ...s, logo: v }))} /></div>
              <div className="flex items-center justify-between text-[13px]"><span style={{ color: MUTE }}>고유 코드 <span style={{ color: FAINT }}>(고정)</span></span><span className="tabular-nums font-semibold" style={{ color: GOLD_D }}>{p.id}</span></div>
              <label className="flex items-center justify-between gap-3 text-[13px]">
                <span className="shrink-0" style={{ color: MUTE }}>ID 코드 <span style={{ color: FAINT }}>(로그인 ID)</span></span>
                <input value={f.idCode} onChange={(e) => setF((s) => ({ ...s, idCode: e.target.value }))} placeholder="예: greenfield (6자 이상)"
                  className="w-44 px-2.5 text-[13px] outline-none focus-visible:ring-1" style={{ height: 32, background: SURFACE, border: "1px solid " + (dupCode ? "#8a4b1c" : LINE), borderRadius: RADIUS, color: INK }} />
              </label>
              {dupCode && <div className="text-right text-[10.5px]" style={{ color: "#8a4b1c" }}>이미 사용 중인 ID 코드입니다</div>}
              {editRow("상호", "name")}
              {editRow("지역", "region")}
              {editRow("담당자", "manager")}
              {editRow("담당자 전화번호", "phone", { inputMode: "tel", placeholder: "010-0000-0000" })}
              {row("호실 수", p.rooms + "실")}
              <label className="flex items-center justify-between text-[13px]">
                <span style={{ color: MUTE }}>운영 상태</span>
                <button type="button" onClick={() => setF((s) => ({ ...s, active: !s.active }))}
                  className="px-3 py-1 text-[12px] font-semibold outline-none focus-visible:ring-1" style={{ borderRadius: RADIUS, background: f.active ? GOLD_SOFT : "transparent", color: f.active ? GOLD_D : FAINT, border: "1px solid " + (f.active ? GOLD_SOFT : LINE) }}>
                  {f.active ? "활성" : "비활성"}
                </button>
              </label>
              {row("계약일", <span className="tabular-nums">{p.contractDate || "—"}</span>)}
              <label className="block text-[13px]">
                <span style={{ color: MUTE }}>비고</span>
                <textarea value={f.memo} onChange={(e) => setF((s) => ({ ...s, memo: e.target.value }))} rows={3} placeholder="특이사항·메모"
                  className="mt-1 w-full px-2.5 py-2 text-[13px] outline-none focus-visible:ring-1" style={{ background: SURFACE, border: "1px solid " + LINE, borderRadius: RADIUS, color: INK, resize: "vertical" }} />
              </label>
            </div>
          ) : (
            <div className="space-y-2">
              {row("로고", p.logo
                ? <img src={p.logo} alt="로고" className="object-contain" style={{ height: 40, maxWidth: 120, border: "1px solid " + LINE2, borderRadius: RADIUS, background: SURFACE }} />
                : <span style={{ color: FAINT }}>미등록</span>)}
              {row("상호", p.name)}{row("지역", p.region)}{row("담당자", p.manager)}
              {row("담당자 전화번호", p.phone || "—")}
              {row("고유 코드", p.id)}
              {row("ID 코드", <span className="flex items-center gap-1.5">{p.idCode || "—"}{p.idCode && <CopyBtn text={p.idCode} />}</span>)}
              {row("초기 비밀번호", <span className="flex items-center gap-1.5"><span style={{ color: GOLD_D }}>{p.idCode || "—"}</span>{p.idCode && <CopyBtn text={p.idCode} />}</span>)}
              {row("호실 수", p.rooms + "실")}
              {row("계약일", <span className="tabular-nums">{p.contractDate || "—"}</span>)}
              <div className="pt-1 text-[13px]">
                <div className="mb-1" style={{ color: MUTE }}>비고</div>
                <div className="px-2.5 py-2 whitespace-pre-wrap" style={{ background: SURFACE, border: "1px solid " + LINE, borderRadius: RADIUS, color: p.memo ? INK : FAINT, minHeight: 36 }}>{p.memo || "메모 없음"}</div>
              </div>
            </div>
          )}
        </Card>
        <Card title="영상 진행 현황" action={goLink("production")}>
          <div className="space-y-2">
            {row("접수 대기", cnt("review") + "건")}{row("작업 중", cnt("rendering") + "건")}{row("컨펌 대기", cnt("confirm") + "건")}{row("발행 완료", cnt("published") + "건")}
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
          {settle.count > 0 ? (
            <div className="space-y-2">
              {row("이번달 건수", settle.count + "건")}{row("청구", won(settle.billed))}{row("입금", won(settle.paid))}
              <div className="flex items-center gap-2 text-[13px]"><span style={{ color: MUTE }}>미수금</span><span style={{ color: settle.unpaid ? STATUS.review.c : INK }}>{won(settle.unpaid)}</span></div>
            </div>
          ) : <div className="text-[12.5px]" style={{ color: FAINT }}>정산 내역이 없습니다.</div>}
        </Card>
      </div>
    </div>
  );
}

export function PartnersManage({ go, onLoginAsPartner }) {
  const { partners: allPartners, bizUnit, bizUnits, reservations } = useStore();
  const month = ymKST(0);
  // 현재 사업부 소속만 + [QA] 이번달 예약 수를 store 예약에서 계산해 주입(목업 reservThisMonth 제거).
  const partners = allPartners.filter((p) => p.bizUnit === bizUnit)
    .map((p) => ({ ...p, reservThisMonth: countReservInMonth(reservations, month, p.name) }));
  const [sel, setSel] = useState(null);
  const [adding, setAdding] = useState(false);
  const [statusF, setStatusF] = useState("all"); // all | active | inactive
  const [q, setQ] = useState("");
  const filtered = partners
    .filter((p) => statusF === "all" || (statusF === "active" ? p.active : !p.active))
    .filter((p) => matchQuery(q, p.name, p.idCode, p.region, p.manager));
  const { rows, sort, onSortChange } = useTableSort(filtered, { value: (r, k) => k === "active" ? (r.active ? 1 : 0) : r[k] });
  const cnt = { all: partners.length, active: partners.filter((p) => p.active).length, inactive: partners.filter((p) => !p.active).length };
  if (sel) return <PartnerDetail partner={partners.find((x) => x.id === sel.id) || sel} onBack={() => setSel(null)} go={go} />;
  return (
    <div>
      <PageHeader title="파트너사 관리" sub="반려동물 장례식장(파트너사) 등록 · 사업부 · 계정·권한 (테넌트)" right={
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
          {bizUnits.map((b) => {
            const on = b.id === bizUnit;
            const c = allPartners.filter((p) => p.bizUnit === b.id).length;
            return (
              <button key={b.id} onClick={() => actions.setBizUnit(b.id)} className="px-2.5 py-1 text-[12px] font-semibold outline-none transition focus-visible:ring-1" style={{ borderRadius: RADIUS, background: on ? GOLD_SOFT : "transparent", color: on ? GOLD_D : FAINT, border: "1px solid " + (on ? GOLD_SOFT : LINE) }}>{b.name} · {c}개</button>
            );
          })}
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
        cols={[{ key: "name", label: "파트너사", sortable: true }, { key: "idCode", label: "ID 코드", sortable: true }, { key: "region", label: "지역", sortable: true }, { key: "manager", label: "담당자", sortable: true }, { key: "phone", label: "전화번호", sortable: true }, { key: "rooms", label: "호실", align: "right", sortable: true }, { key: "reservThisMonth", label: "이번달 예약", align: "right", sortable: true }, { key: "contractDate", label: "계약일", sortable: true }, { key: "active", label: "상태", sortable: true }]}
        rows={rows}
        sort={sort}
        onSortChange={onSortChange}
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
          k === "phone" ? <span className="tabular-nums">{r.phone || "—"}</span> :
          k === "contractDate" ? <span className="tabular-nums">{r.contractDate || "—"}</span> :
          k === "rooms" ? <span className="tabular-nums">{r.rooms}실</span> :
          k === "reservThisMonth" ? <span className="tabular-nums">{r.reservThisMonth}건</span> : r[k]
        }
      />
      <p className="mt-3 text-[11px]" style={{ color: FAINT }}>※ ID 코드 클릭 시 해당 파트너 계정으로 접속합니다. 건당 단가는 <b style={{ color: MUTE }}>정산 내역</b>에서 관리합니다.</p>
    </div>
  );
}

