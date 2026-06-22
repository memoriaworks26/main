// ─────────────────────────────────────────────────────────────
// 정산 매출 건(settlement_items) 데이터 계층 — staff(settlement) 전용. memoria(RLS).
//   store item: { partner(이름), deceased, chief, ymd, date, amount, status, id }
//   ↔ DB: { id, partner_id, reservation_id, deceased, chief, ymd, amount, status }
//   (deposits/statements/요약뷰는 4-5b)
// ─────────────────────────────────────────────────────────────
import { db } from "../supabase.js";

const need = () => { const d = db(); if (!d) throw new Error("백엔드 미연결"); return d; };
const dateOf = (ymd) => (ymd ? String(ymd).slice(5).replace("-", ".") : "");
const mapItem = (r) => ({
  id: r.id, partner: r.partner?.name ?? r.partner_id, partnerId: r.partner_id,
  reservationId: r.reservation_id, deceased: r.deceased, chief: r.chief,
  ymd: r.ymd, date: dateOf(r.ymd), amount: r.amount, status: r.status,
});
const toRow = (partnerId, it) => ({
  partner_id: partnerId, reservation_id: it.reservationId ?? null,
  deceased: it.deceased, chief: it.chief ?? null, ymd: it.ymd,
  amount: it.amount, status: it.status || "waiting",
});

export async function fetchSettlementItems() {
  const d = need();
  const { data, error } = await d.from("settlement_items").select("*, partner:partners(name)").order("ymd");
  if (error) throw new Error("정산 조회 실패: " + error.message);
  return (data || []).map(mapItem);
}

export async function addItem(partnerId, item) {
  const d = need();
  const { data, error } = await d.from("settlement_items").insert(toRow(partnerId, item)).select("*, partner:partners(name)").single();
  if (error) throw new Error(error.message);
  return mapItem(data);
}

export async function updateItem(id, patch) {
  const d = need();
  const row = {};
  if (patch.amount !== undefined) row.amount = patch.amount;
  if (patch.status !== undefined) row.status = patch.status;
  const { data, error } = await d.from("settlement_items").update(row).eq("id", id).select("*, partner:partners(name)").single();
  if (error) throw new Error(error.message);
  return mapItem(data);
}

export async function deleteItem(id) {
  const d = need();
  const { error } = await d.from("settlement_items").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ── 입금 내역(settlement_deposits) ──
const mapDeposit = (r) => ({ id: r.id, partner: r.partner?.name ?? r.partner_id, partnerId: r.partner_id, date: r.deposit_date, amount: r.amount, method: r.method, memo: r.memo });
export async function fetchDeposits() {
  const d = need();
  const { data, error } = await d.from("settlement_deposits").select("*, partner:partners(name)").order("deposit_date");
  if (error) throw new Error("입금 조회 실패: " + error.message);
  return (data || []).map(mapDeposit);
}
export async function addDeposit(partnerId, dp) {
  const d = need();
  const { data, error } = await d.from("settlement_deposits")
    .insert({ id: dp.id, partner_id: partnerId, deposit_date: dp.date, amount: dp.amount, method: dp.method, memo: dp.memo })
    .select("*, partner:partners(name)").single();
  if (error) throw new Error(error.message);
  return mapDeposit(data);
}
export async function updateDeposit(id, patch) {
  const d = need();
  const row = {};
  if (patch.date !== undefined) row.deposit_date = patch.date;
  for (const k of ["amount", "method", "memo"]) if (patch[k] !== undefined) row[k] = patch[k];
  const { data, error } = await d.from("settlement_deposits").update(row).eq("id", id).select("*, partner:partners(name)").single();
  if (error) throw new Error(error.message);
  return mapDeposit(data);
}
export async function deleteDeposit(id) {
  const d = need();
  const { error } = await d.from("settlement_deposits").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ── 거래명세서(statements) ──
const mapStatement = (r) => ({ id: r.id, partner: r.partner?.name ?? r.partner_id, partnerId: r.partner_id, period: r.period, issuedAt: r.issued_at, count: r.item_count, amount: r.amount, status: r.status });
export async function fetchStatements() {
  const d = need();
  const { data, error } = await d.from("statements").select("*, partner:partners(name)").order("issued_at", { ascending: false });
  if (error) throw new Error("명세서 조회 실패: " + error.message);
  return (data || []).map(mapStatement);
}
export async function addStatement(partnerId, st) {
  const d = need();
  const { data, error } = await d.from("statements")
    .insert({ id: st.id, partner_id: partnerId, period: st.period, issued_at: st.issuedAt, item_count: st.count, amount: st.amount, status: st.status || "sent" })
    .select("*, partner:partners(name)").single();
  if (error) throw new Error(error.message);
  return mapStatement(data);
}

// 파트너 매출 건 일괄 교체(삭제 후 삽입) — 저장 버튼.
export async function replacePartnerItems(partnerId, items) {
  const d = need();
  const del = await d.from("settlement_items").delete().eq("partner_id", partnerId);
  if (del.error) throw new Error(del.error.message);
  const rows = items.map((it) => toRow(partnerId, it));
  if (!rows.length) return [];
  const { data, error } = await d.from("settlement_items").insert(rows).select("*, partner:partners(name)");
  if (error) throw new Error(error.message);
  return (data || []).map(mapItem);
}
