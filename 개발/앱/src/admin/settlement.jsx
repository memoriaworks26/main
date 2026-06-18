// [정산] 정산 내역 — 파트너별 청구/입금/미수금, 거래명세서 발행.
import React, { useState, useEffect } from "react";
import {
  Check, FileText, Plus, Trash2, X,
} from "lucide-react";
import { SERIF, SURFACE, LINE, LINE2, GOLD, GOLD_D, GOLD_SOFT, INK, MUTE, FAINT, STATUS, RADIUS } from "../theme.js";
import { Tag, Btn, MetricRow, Table, PageHeader, Modal } from "../ui.jsx";
import { toast } from "../toast.jsx";
import { TradeStatement } from "../docs.jsx";
import { useStore, actions } from "../store.js";
import * as D from "../data.js";
import { SaveBar } from "./shared.jsx";

const won = (v) => v.toLocaleString() + "원";
const fmtYmd = (s) => s.replaceAll("-", ".");
const itemKey = (it) => it.ymd + "·" + it.deceased;

const DEPOSIT_METHODS = ["계좌이체", "카드", "현금", "기타"];
// 입금 등록 모달 — 파트너사 입금 1건 추가 (미수금 즉시 반영)
function DepositModal({ open, onClose, partner, unpaid, onAdd }) {
  const blank = { date: "2026-06-18", amount: "", method: "계좌이체", memo: "" };
  const [f, setF] = useState(blank);
  useEffect(() => { if (open) setF(blank); /* eslint-disable-next-line */ }, [open]);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const num = (v) => Number(String(v).replace(/[^\d]/g, "")) || 0;
  const amount = num(f.amount);
  const canSubmit = !!f.date && amount > 0;
  const submit = () => {
    if (!canSubmit) return;
    onAdd({ id: "DP-" + Date.now(), partner, date: f.date, amount, method: f.method, memo: f.memo.trim() || "—" });
    onClose();
  };
  const inputStyle = { height: 36, background: "#fff", border: "1px solid " + LINE2, borderRadius: RADIUS, color: INK };
  return (
    <Modal open={open} onClose={onClose} width={420}>
      <div className="flex items-center justify-between px-5" style={{ height: 50, borderBottom: "1px solid " + LINE }}>
        <span className="text-[14px] font-semibold" style={{ color: INK }}>입금 등록 · {partner}</span>
        <button onClick={onClose} className="transition hover:opacity-70" style={{ color: MUTE }}><X className="h-4 w-4" /></button>
      </div>
      <div className="space-y-4 px-5 py-4">
        {unpaid > 0 && (
          <button onClick={() => setF((s) => ({ ...s, amount: String(unpaid) }))} className="flex w-full items-center justify-between px-3 py-2 text-[12px] outline-none" style={{ background: "#faf8f3", border: "1px solid " + LINE, borderRadius: RADIUS, color: MUTE }}>
            <span>현재 미수금</span><span className="tabular-nums font-semibold" style={{ color: STATUS.waiting.c }}>{won(unpaid)} · 눌러서 채우기</span>
          </button>
        )}
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-[12px] font-semibold" style={{ color: MUTE }}>입금일 *</span>
            <input type="date" value={f.date} onChange={set("date")} className="mt-1 w-full px-3 text-[13px] outline-none" style={inputStyle} />
          </label>
          <label className="block">
            <span className="text-[12px] font-semibold" style={{ color: MUTE }}>금액(원) *</span>
            <input value={f.amount} onChange={set("amount")} inputMode="numeric" placeholder="0" className="mt-1 w-full px-3 text-right text-[13px] tabular-nums outline-none" style={inputStyle} />
          </label>
        </div>
        <div>
          <div className="mb-1.5 text-[12px] font-semibold" style={{ color: MUTE }}>수단</div>
          <div className="grid grid-cols-4 gap-1.5">
            {DEPOSIT_METHODS.map((m) => {
              const on = f.method === m;
              return <button key={m} onClick={() => setF((s) => ({ ...s, method: m }))} className="py-2 text-[12px] font-semibold outline-none" style={{ borderRadius: RADIUS, background: on ? GOLD_SOFT : "#fff", color: on ? GOLD_D : MUTE, border: "1.5px solid " + (on ? GOLD : LINE2) }}>{m}</button>;
            })}
          </div>
        </div>
        <label className="block">
          <span className="text-[12px] font-semibold" style={{ color: MUTE }}>메모</span>
          <input value={f.memo} onChange={set("memo")} placeholder="예: 6월 2차 정산금" className="mt-1 w-full px-3 text-[13px] outline-none" style={inputStyle} />
        </label>
        {amount > 0 && <p className="text-[11px]" style={{ color: FAINT }}>등록 시 미수금이 {won(Math.max(0, unpaid - amount))}(으)로 갱신됩니다.</p>}
      </div>
      <div className="flex items-center justify-end gap-2 px-5" style={{ height: 56, borderTop: "1px solid " + LINE }}>
        <Btn size="sm" variant="neutral" onClick={onClose}>취소</Btn>
        <Btn size="sm" onClick={submit} disabled={!canSubmit}><Check className="h-3.5 w-3.5" /> 등록</Btn>
      </div>
    </Modal>
  );
}

function AddSalesModal({ open, onClose, onAdd }) {
  const blank = { nm: "", ymd: "2026-06-18", amt: "" };
  const [f, setF] = useState(blank);
  useEffect(() => { if (open) setF(blank); /* eslint-disable-next-line */ }, [open]);
  const num = (v) => Number(String(v).replace(/[^\d]/g, "")) || 0;
  const canSubmit = f.nm.trim() && num(f.amt) > 0;
  const inputStyle = { height: 36, background: "#fff", border: "1px solid " + LINE2, borderRadius: RADIUS, color: INK };
  return (
    <Modal open={open} onClose={onClose} width={400}>
      <div className="flex items-center justify-between px-5" style={{ height: 50, borderBottom: "1px solid " + LINE }}>
        <span className="text-[14px] font-semibold" style={{ color: INK }}>매출 추가</span>
        <button onClick={onClose} className="transition hover:opacity-70" style={{ color: MUTE }}><X className="h-4 w-4" /></button>
      </div>
      <div className="space-y-4 px-5 py-4">
        <label className="block">
          <span className="text-[12px] font-semibold" style={{ color: MUTE }}>항목명 *</span>
          <input value={f.nm} onChange={(e) => setF((s) => ({ ...s, nm: e.target.value }))} placeholder="예: 추모영상 추가 제작 / 액자 인쇄" className="mt-1 w-full px-3 text-[13px] outline-none" style={inputStyle} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-[12px] font-semibold" style={{ color: MUTE }}>날짜 *</span>
            <input type="date" value={f.ymd} onChange={(e) => setF((s) => ({ ...s, ymd: e.target.value }))} className="mt-1 w-full px-2 text-[13px] outline-none" style={inputStyle} />
          </label>
          <label className="block">
            <span className="text-[12px] font-semibold" style={{ color: MUTE }}>금액(원) *</span>
            <input value={f.amt} onChange={(e) => setF((s) => ({ ...s, amt: e.target.value }))} inputMode="numeric" placeholder="0" className="mt-1 w-full px-3 text-right text-[13px] tabular-nums outline-none" style={inputStyle} />
          </label>
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 px-5" style={{ height: 56, borderTop: "1px solid " + LINE }}>
        <Btn size="sm" variant="neutral" onClick={onClose}>취소</Btn>
        <Btn size="sm" onClick={() => { if (canSubmit) { onAdd(f); onClose(); } }} disabled={!canSubmit}><Check className="h-3.5 w-3.5" /> 추가</Btn>
      </div>
    </Modal>
  );
}

function PartnerSettleDetail({ partner, onBack, onIssue, onViewStatement }) {
  const p = D.SETTLEMENT_PARTNERS.find((x) => x.partner === partner);
  const { settlementItems } = useStore();
  const storeItems = settlementItems.filter((i) => i.partner === partner);
  const [draft, setDraft] = useState(() => storeItems.map((i) => ({ ...i })));
  const items = draft;
  const dirty = JSON.stringify(draft) !== JSON.stringify(storeItems);
  const saveItems = () => actions.replacePartnerSettlement(partner, draft);
  const resetItems = () => setDraft(storeItems.map((i) => ({ ...i })));
  const statements = D.STATEMENTS.filter((s) => s.partner === partner);
  const [deposits, setDeposits] = useState(() => D.SETTLEMENT_DEPOSITS.filter((d) => d.partner === partner));
  const [depositOpen, setDepositOpen] = useState(false);
  const [addingModal, setAddingModal] = useState(false);
  const [editDepId, setEditDepId] = useState(null);
  const [editDepForm, setEditDepForm] = useState({});
  const num = (v) => Number(String(v).replace(/[^\d]/g, "")) || 0;
  const addDeposit = (dp) => setDeposits((prev) => [...prev, dp].sort((a, b) => a.date.localeCompare(b.date)));
  const startEditDep = (dep) => { setEditDepId(dep.id); setEditDepForm({ ...dep }); };
  const cancelEditDep = () => { setEditDepId(null); setEditDepForm({}); };
  const saveDep = () => { setDeposits((prev) => prev.map((d) => d.id === editDepId ? { ...editDepForm, amount: num(String(editDepForm.amount)) } : d)); cancelEditDep(); };
  const removeDep = (id) => setDeposits((prev) => prev.filter((d) => d.id !== id));
  const depositTotal = deposits.reduce((s, d) => s + d.amount, 0);
  const billed = items.reduce((s, i) => s + i.amount, 0);
  const [sub, setSub] = useState("main");
  const [from, setFrom] = useState("2026-06-01");
  const [to, setTo] = useState("2026-06-30");
  const [sel, setSel] = useState([]);

  const rows = items.filter((i) => i.ymd >= from && i.ymd <= to);
  const selItems = rows.filter((r) => sel.includes(itemKey(r)));
  const selAmount = selItems.reduce((s, r) => s + r.amount, 0);
  const allSelected = rows.length > 0 && rows.every((r) => sel.includes(itemKey(r)));
  const toggle = (k) => setSel((s) => s.includes(k) ? s.filter((x) => x !== k) : [...s, k]);
  const toggleAll = () => setSel(allSelected ? [] : rows.map(itemKey));
  const addItem = ({ nm, ymd, amt }) => {
    if (!nm.trim() || !num(amt)) return;
    setDraft((d) => [...d, { partner, deceased: nm.trim(), chief: "—", ymd, date: fmtYmd(ymd).slice(5), amount: num(amt), status: "waiting", manual: true }]);
  };
  const setAmount = (key, v) => setDraft((d) => d.map((i) => (itemKey(i) === key ? { ...i, amount: num(v) } : i)));
  const removeItem = (key) => { setDraft((d) => d.filter((i) => itemKey(i) !== key)); setSel((s) => s.filter((x) => x !== key)); };

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
        back={{ onClick: onBack, label: "정산" }} right={<Btn size="sm" variant="neutral" onClick={() => toast("엑셀로 내보냈습니다")}>엑셀</Btn>} />
      <DepositModal open={depositOpen} onClose={() => setDepositOpen(false)} partner={partner} unpaid={Math.max(0, billed - depositTotal)} onAdd={addDeposit} />
      <AddSalesModal open={addingModal} onClose={() => setAddingModal(false)} onAdd={addItem} />
      <div className="mb-4"><MetricRow fit items={[
        { label: "청구", value: won(billed) }, { label: "입금", value: won(depositTotal), accent: STATUS.done.c },
        { label: "미수금", value: won(billed - depositTotal), accent: (billed - depositTotal) ? STATUS.waiting.c : FAINT, sub: "청구 − 입금" },
      ]} /></div>

      <div className="mb-3 flex gap-1.5">
        {[["main", "매출·입금"], ["history", "거래명세서 내역"]].map(([k, l]) => {
          const badge = k === "history" && statements.length ? ` · ${statements.length}` : "";
          return (
            <button key={k} onClick={() => setSub(k)} className="px-3 py-1.5 text-[12px] font-semibold" style={{ borderRadius: RADIUS, background: sub === k ? GOLD_SOFT : SURFACE, color: sub === k ? GOLD_D : MUTE, border: "1px solid " + (sub === k ? GOLD_SOFT : LINE) }}>{l}{badge}</button>
          );
        })}
      </div>

      {sub === "main" ? (
        <>
          <SaveBar dirty={dirty} onSave={saveItems} onReset={resetItems} label="저장하지 않은 매출 변경이 있습니다 — 화면을 벗어나면 사라집니다." />
          {/* 기간 필터: 두 컬럼 공통 */}
          <div className="mb-3 flex items-center gap-2 text-[12.5px]" style={{ color: MUTE }}>
            <span className="font-semibold">기간</span>
            <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setSel([]); }} className="px-2 py-1.5 text-[12.5px] outline-none" style={{ background: SURFACE, border: "1px solid " + LINE, borderRadius: RADIUS, color: INK }} />
            <span>~</span>
            <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setSel([]); }} className="px-2 py-1.5 text-[12.5px] outline-none" style={{ background: SURFACE, border: "1px solid " + LINE, borderRadius: RADIUS, color: INK }} />
          </div>
          <div className="grid grid-cols-2 gap-5">
            {/* 왼쪽: 매출 상세 */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[12.5px]" style={{ color: MUTE }}>매출 <b style={{ color: INK }}>{rows.length}</b>건 · <span className="tabular-nums font-semibold" style={{ color: INK }}>{won(rows.reduce((s, r) => s + r.amount, 0))}</span></span>
                <div className="flex items-center gap-2">
                  <Btn size="sm" variant="neutral" onClick={() => setAddingModal(true)}><Plus className="h-3.5 w-3.5" /> 매출 추가</Btn>
                  <Btn size="sm" onClick={issue} {...(selItems.length ? {} : { disabled: true, style: { opacity: 0.5 } })}><FileText className="h-3.5 w-3.5" /> 발행 ({selItems.length})</Btn>
                </div>
              </div>
              <Table
                cols={[
                  { key: "sel", label: <button onClick={toggleAll}>{ckbox(allSelected)}</button> },
                  { key: "deceased", label: "항목" }, { key: "date", label: "예약일" },
                  { key: "amount", label: "금액", align: "right" }, { key: "status", label: "정산" }, { key: "act", label: "", align: "right" },
                ]}
                rows={rows}
                renderCell={(r, k) =>
                  k === "sel" ? <button onClick={() => toggle(itemKey(r))}>{ckbox(sel.includes(itemKey(r)))}</button> :
                  k === "deceased" ? <span style={{ fontFamily: SERIF, fontWeight: 700 }}>{r.deceased}{r.manual && <span className="ml-1.5 text-[10px] font-semibold" style={{ color: GOLD_D }}>추가</span>}</span> :
                  k === "status" ? <Tag s={r.status} /> :
                  k === "amount" ? <input value={r.amount.toLocaleString()} onChange={(e) => setAmount(itemKey(r), e.target.value)} inputMode="numeric" className="w-24 px-2 py-1 text-right text-[12.5px] tabular-nums outline-none focus-visible:ring-1" style={{ background: "#fff", border: "1px solid " + LINE2, borderRadius: RADIUS, color: INK }} /> :
                  k === "act" ? (r.manual ? <button onClick={() => removeItem(itemKey(r))} className="p-0.5" style={{ color: FAINT }} title="삭제"><Trash2 className="h-3.5 w-3.5" /></button> : null) : r[k]}
              />
              {!rows.length && <p className="mt-3 text-[12px]" style={{ color: FAINT }}>선택한 기간에 정산 건이 없습니다.</p>}
            </div>

            {/* 오른쪽: 입금 내역 */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[12.5px]" style={{ color: MUTE }}>입금 <b style={{ color: INK }}>{deposits.length}</b>건 · <span className="tabular-nums font-semibold" style={{ color: INK }}>{won(depositTotal)}</span></span>
                <Btn size="sm" variant="neutral" onClick={() => setDepositOpen(true)}><Plus className="h-3.5 w-3.5" /> 입금 등록</Btn>
              </div>
              <Table
                cols={[
                  { key: "date", label: "입금일" }, { key: "method", label: "수단" }, { key: "memo", label: "메모" },
                  { key: "amount", label: "금액", align: "right" }, { key: "act", label: "", align: "right" },
                ]}
                rows={deposits}
                renderCell={(r, k) => {
                  const isEditing = editDepId === r.id;
                  if (isEditing) {
                    if (k === "date") return <input type="date" value={editDepForm.date} onChange={(e) => setEditDepForm((s) => ({ ...s, date: e.target.value }))} className="px-2 py-1 text-[12px] outline-none" style={{ background: "#fff", border: "1px solid " + LINE2, borderRadius: RADIUS, color: INK, width: 130 }} />;
                    if (k === "method") return <select value={editDepForm.method} onChange={(e) => setEditDepForm((s) => ({ ...s, method: e.target.value }))} className="px-2 py-1 text-[12px] outline-none" style={{ background: "#fff", border: "1px solid " + LINE2, borderRadius: RADIUS, color: INK }}>{DEPOSIT_METHODS.map((m) => <option key={m}>{m}</option>)}</select>;
                    if (k === "memo") return <input value={editDepForm.memo} onChange={(e) => setEditDepForm((s) => ({ ...s, memo: e.target.value }))} className="w-full px-2 py-1 text-[12px] outline-none" style={{ background: "#fff", border: "1px solid " + LINE2, borderRadius: RADIUS, color: INK }} />;
                    if (k === "amount") return <input value={editDepForm.amount} onChange={(e) => setEditDepForm((s) => ({ ...s, amount: e.target.value }))} inputMode="numeric" className="w-24 px-2 py-1 text-right text-[12px] tabular-nums outline-none" style={{ background: "#fff", border: "1px solid " + LINE2, borderRadius: RADIUS, color: INK }} />;
                    if (k === "act") return <div className="flex items-center gap-1"><button onClick={saveDep} className="px-2 py-0.5 text-[11px] font-semibold" style={{ color: GOLD_D, background: GOLD_SOFT, borderRadius: RADIUS }}>저장</button><button onClick={cancelEditDep} className="px-2 py-0.5 text-[11px] font-semibold" style={{ color: MUTE, background: "#f0f0f0", borderRadius: RADIUS }}>취소</button></div>;
                  }
                  return k === "date" ? <span className="tabular-nums">{fmtYmd(r.date)}</span> :
                    k === "amount" ? <span className="tabular-nums font-semibold" style={{ color: STATUS.done.c }}>{won(r.amount)}</span> :
                    k === "method" ? <Tag s="online" label={r.method} /> :
                    k === "act" ? <div className="flex items-center gap-1"><button onClick={() => startEditDep(r)} className="px-2 py-0.5 text-[11px] font-semibold" style={{ color: MUTE, background: "#f0f0f0", borderRadius: RADIUS }}>수정</button><button onClick={() => removeDep(r.id)} className="p-0.5" style={{ color: FAINT }} title="삭제"><Trash2 className="h-3 w-3" /></button></div> :
                    r[k];
                }}
              />
              {!deposits.length && <p className="mt-3 text-[12px]" style={{ color: FAINT }}>입금 내역이 없습니다.</p>}
            </div>
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
export function Settlement() {
  const { partners } = useStore(); // 목 DB — 신규 등록 파트너도 정산 목록에 노출
  const [detail, setDetail] = useState(null);   // 파트너사명
  const [view, setView] = useState(null);       // 발행/조회 중인 거래명세서 { partner, items, period, issuedAt }
  // 전 파트너사 기준으로 정산 데이터 병합(정산 이력 없으면 0원·대기)
  const settleRows = partners.map((p) =>
    D.SETTLEMENT_PARTNERS.find((x) => x.partner === p.name)
    || { partner: p.name, region: p.region, count: 0, billed: 0, paid: 0, unpaid: 0, status: "waiting" });
  const total = settleRows.reduce((s, p) => s + p.billed, 0);
  const paid = settleRows.reduce((s, p) => s + p.paid, 0);
  const unpaid = settleRows.reduce((s, p) => s + p.unpaid, 0);

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
      <PageHeader title="정산 내역" sub="파트너사별 단가 스냅샷 · 거래명세서(발행 시 동결) · 메일 발송" />
      <div className="mb-4">
        <MetricRow fit items={[
          { label: "이번달 총 청구", value: won(total), sub: "VAT 별도" },
          { label: "정산 완료", value: won(paid), accent: STATUS.done.c },
          { label: "미수금", value: won(unpaid), accent: STATUS.waiting.c, sub: "확인 필요" },
        ]} />
      </div>
      <Table cols={pCols} rows={settleRows} renderCell={(r, k) =>
        k === "status" ? <Tag s={r.status} /> :
        k === "act" ? <button onClick={() => setDetail(r.partner)} className="text-[12px] font-semibold" style={{ color: GOLD }}>상세 →</button> :
        ["billed", "paid", "unpaid"].includes(k) ? <span className="tabular-nums">{r[k] ? won(r[k]) : "—"}</span> :
        k === "count" ? <span className="tabular-nums">{r.count}건</span> : r[k]
      } />
    </div>
  );
}

