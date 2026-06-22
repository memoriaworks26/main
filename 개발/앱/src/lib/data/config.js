// ─────────────────────────────────────────────────────────────
// 설정 데이터 계층 — company(싱글톤)·term_configs·user_text_overrides·form_configs.
//   staff(settings/forms) 전용. memoria(RLS). 중첩 객체 ↔ 행 매핑.
// ─────────────────────────────────────────────────────────────
import { db } from "../supabase.js";

const need = () => { const d = db(); if (!d) throw new Error("백엔드 미연결"); return d; };

// company: 앱(D.COMPANY 카멜) ↔ DB(snake)
const C_D2DB = { name: "name", ceo: "ceo", biz: "biz_no", type: "biz_type", addr: "addr",
  bank: "bank", account: "account", holder: "holder", notifyEmail: "notify_email",
  notifyPhone: "notify_phone", csPhone: "cs_phone", csHours: "cs_hours",
  consentPrivacy: "consent_privacy", consentMarketing: "consent_marketing",
  privacyPolicy: "privacy_policy", privacyOfficer: "privacy_officer" };
const C_DB2D = Object.fromEntries(Object.entries(C_D2DB).map(([k, v]) => [v, k]));
const mapCompany = (r) => { const o = {}; if (r) for (const [db, d] of Object.entries(C_DB2D)) if (r[db] != null) o[d] = r[db]; return o; };
const companyToRow = (patch) => { const o = {}; for (const [d, dbk] of Object.entries(C_D2DB)) if (patch[d] !== undefined) o[dbk] = patch[d]; return o; };

export async function fetchConfig() {
  const d = need();
  const [co, tc, ut, fc, up] = await Promise.all([
    d.from("company").select("*").eq("id", 1).maybeSingle(),
    d.from("term_configs").select("*"),
    d.from("user_text_overrides").select("*"),
    d.from("form_configs").select("*"),
    d.from("user_photos").select("*"),
  ]);
  for (const r of [co, tc, ut, fc, up]) if (r.error) throw new Error("설정 조회 실패: " + r.error.message);

  const termConfigs = {};
  (tc.data || []).forEach((r) => {
    (termConfigs[r.biz_unit_id] ||= {})[r.term_key] = { partner: r.partner_text, user: r.user_text };
  });
  const userText = {};
  (ut.data || []).forEach((r) => { (userText[r.biz_unit_id] ||= {})[r.key] = r.value; });
  const formConfigs = {};
  (fc.data || []).forEach((r) => { (formConfigs[r.partner_id] ||= {})[r.field_key] = { hidden: r.hidden, label: r.label }; });
  const userPhotos = {};
  (up.data || []).forEach((r) => { (userPhotos[r.biz_unit_id] ||= {})[r.key] = r.data_url; });

  return { company: mapCompany(co.data), termConfigs, userText, formConfigs, userPhotos };
}

// 사업부 예시사진 저장/초기화(data_url). key='good'|'bad'.
export async function upsertUserPhoto(bizId, key, dataUrl) {
  const d = need();
  const { error } = await d.from("user_photos").upsert({ biz_unit_id: bizId, key, data_url: dataUrl, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}
export async function deleteUserPhoto(bizId, key) {
  const d = need();
  const { error } = await d.from("user_photos").delete().eq("biz_unit_id", bizId).eq("key", key);
  if (error) throw new Error(error.message);
}

export async function updateCompany(patch) {
  const d = need();
  const { data, error } = await d.from("company").update(companyToRow(patch)).eq("id", 1).select().single();
  if (error) throw new Error(error.message);
  return mapCompany(data);
}

// 병합된 값({partner,user})을 받아 upsert.
export async function upsertTerm(bizId, termKey, merged) {
  const d = need();
  const { error } = await d.from("term_configs")
    .upsert({ biz_unit_id: bizId, term_key: termKey, partner_text: merged.partner ?? null, user_text: merged.user ?? null });
  if (error) throw new Error(error.message);
}

export async function upsertUserText(bizId, key, value) {
  const d = need();
  const { error } = await d.from("user_text_overrides").upsert({ biz_unit_id: bizId, key, value });
  if (error) throw new Error(error.message);
}
export async function deleteUserText(bizId, key) {
  const d = need();
  const { error } = await d.from("user_text_overrides").delete().eq("biz_unit_id", bizId).eq("key", key);
  if (error) throw new Error(error.message);
}

export async function upsertForm(partnerId, fieldKey, merged) {
  const d = need();
  const { error } = await d.from("form_configs")
    .upsert({ partner_id: partnerId, field_key: fieldKey, hidden: merged.hidden ?? false, label: merged.label ?? null });
  if (error) throw new Error(error.message);
}
