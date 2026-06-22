// ─────────────────────────────────────────────────────────────
// 조직 데이터 계층 (사업부·파트너) — store가 라이브일 때 호출.
//   memoria 스키마 직접 접근(RLS 적용). camelCase(앱) ↔ snake_case(DB) 매핑 단일화.
//   reservThisMonth·revenue는 파생값 — 저장 안 하고 읽을 때 0 기본(집계는 후속 슬라이스).
// ─────────────────────────────────────────────────────────────
import { db } from "../supabase.js";

const need = () => {
  const d = db();
  if (!d) throw new Error("백엔드 미연결");
  return d;
};

// ── 매핑 ──
const mapBiz = (b) => ({ id: b.id, name: b.name });

const mapPartner = (p) => ({
  id: p.id, idCode: p.id_code, bizUnit: p.biz_unit_id,
  name: p.name, region: p.region, manager: p.manager, phone: p.phone,
  csPhone: p.cs_phone, csHours: p.cs_hours, rooms: p.rooms ?? 0,
  active: p.active, unitPrice: p.unit_price ?? 0, contractDate: p.contract_date,
  memo: p.memo, email: p.email, logo: p.logo, address: p.address,
  ceo: p.ceo, bizNo: p.biz_no, bizType: p.biz_type, bizItem: p.biz_item,
  reservThisMonth: 0, revenue: 0, // 파생(집계는 예약/정산 배선 후)
});

// app→DB. 정의된 키만 포함(부분 update 지원).
const toPartnerRow = (p) => {
  const m = {
    id: p.id, id_code: p.idCode, biz_unit_id: p.bizUnit,
    name: p.name, region: p.region, manager: p.manager, phone: p.phone,
    cs_phone: p.csPhone, cs_hours: p.csHours, rooms: p.rooms,
    active: p.active, unit_price: p.unitPrice, contract_date: p.contractDate,
    memo: p.memo, email: p.email, logo: p.logo, address: p.address,
    ceo: p.ceo, biz_no: p.bizNo, biz_type: p.bizType, biz_item: p.bizItem,
  };
  Object.keys(m).forEach((k) => m[k] === undefined && delete m[k]);
  return m;
};

// ── 읽기(hydrate) ──
export async function fetchOrgs() {
  const d = need();
  const [bz, pt] = await Promise.all([
    d.from("biz_units").select("*").order("created_at"),
    d.from("partners").select("*").order("id"),
  ]);
  if (bz.error) throw new Error("사업부 조회 실패: " + bz.error.message);
  if (pt.error) throw new Error("파트너 조회 실패: " + pt.error.message);
  return { bizUnits: (bz.data || []).map(mapBiz), partners: (pt.data || []).map(mapPartner) };
}

// ── 쓰기 ──
export async function createPartner(partner) {
  const d = need();
  const { data, error } = await d.from("partners").insert(toPartnerRow(partner)).select().single();
  if (error) throw new Error(error.message);
  return mapPartner(data);
}

export async function updatePartner(id, patch) {
  const d = need();
  const { data, error } = await d.from("partners").update(toPartnerRow(patch)).eq("id", id).select().single();
  if (error) throw new Error(error.message);
  return mapPartner(data);
}

export async function createBizUnit(name) {
  const d = need();
  const { data, error } = await d.from("biz_units").insert({ name }).select().single();
  if (error) throw new Error(error.message);
  return mapBiz(data);
}
