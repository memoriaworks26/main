// ─────────────────────────────────────────────────────────────
// 관리자 계정(staff) 데이터 계층 — master만. 조회/수정은 DB(RLS), 생성/삭제는 edge function.
//   임시비번 = loginId(=id). id는 6자 이상(비번 정책 충족).
// ─────────────────────────────────────────────────────────────
import { getClient, db } from "../supabase.js";

const need = () => { const d = db(); if (!d) throw new Error("백엔드 미연결"); return d; };
const mapAcct = (r) => ({
  id: r.auth_user_id, name: r.name, loginId: r.login_id, email: r.email,
  phone: r.phone || "—", role: r.role, status: r.status, perms: r.perms || [],
  lastLogin: r.last_login || "—",
});

async function invoke(body) {
  const sb = getClient();
  if (!sb) throw new Error("백엔드 미연결");
  const { data, error } = await sb.functions.invoke("admin-provision", { body });
  if (data && data.error) throw new Error(data.error);
  if (error) throw new Error(error.message);
  return data;
}

export async function fetchStaff() {
  const d = need();
  const { data, error } = await d.from("staff").select("*").order("created_at");
  if (error) throw new Error("계정 조회 실패: " + error.message);
  return (data || []).map(mapAcct);
}

export async function updateStaff(id, patch) {
  const d = need();
  const row = {};
  for (const k of ["name", "phone", "perms", "status"]) if (patch[k] !== undefined) row[k] = patch[k];
  const { data, error } = await d.from("staff").update(row).eq("auth_user_id", id).select().single();
  if (error) throw new Error(error.message);
  return mapAcct(data);
}

export const provisionStaff = ({ name, loginId, role, perms }) =>
  invoke({ kind: "staff", name, loginId, role, perms });
export const provisionPartner = (partnerId) => invoke({ kind: "partner", partnerId });
export const deleteAccount = (authUserId) => invoke({ kind: "delete", authUserId });
// 비밀번호 초기화(임시비번 = 아이디/ID코드) — 마스터만. 반환: { ok, tempPassword }.
export const resetPassword = (authUserId) => invoke({ kind: "reset", authUserId });

// 파트너 비밀번호 초기화 — partner_members에서 auth_user_id 해석 후 reset.
//   master는 RLS(pm_self_read: is_master)로 partner_members 조회 가능.
export async function resetPartnerPassword(partnerId) {
  const d = need();
  const { data, error } = await d.from("partner_members")
    .select("auth_user_id").eq("partner_id", partnerId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.auth_user_id) throw new Error("이 파트너의 로그인 계정을 찾을 수 없습니다");
  return resetPassword(data.auth_user_id);
}
