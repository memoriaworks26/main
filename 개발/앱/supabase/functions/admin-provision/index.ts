// ─────────────────────────────────────────────────────────────
// admin-provision — 마스터 전용 계정 관리(서버, service_role).
//   로그인은 id 기반(앱이 합성이메일로 매핑). 임시비번 = id. id는 최소 6자.
//     staff:   {kind:"staff",   name, loginId, role:"worker"|"collab", perms[]}
//              → auth(email=<loginId>@staff.memoriaworks.kr, pw=loginId) + memoria.staff
//     partner: {kind:"partner", partnerId}
//              → auth(email=<idCode>@ptn.memoriaworks.kr, pw=idCode) + memoria.partner_members
//     delete:  {kind:"delete",  authUserId}  → auth 유저 삭제(staff/partner_members CASCADE)
//   임시비번=id라 id≥6 강제(비번 정책 최소 6자 충족). 첫 로그인 후 본인/마스터가 변경.
// ─────────────────────────────────────────────────────────────
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const STAFF_DOMAIN = "staff.memoriaworks.kr";
const PARTNER_DOMAIN = "ptn.memoriaworks.kr";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const validId = (v: unknown) => typeof v === "string" && v.trim().length >= 6;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json(405, { error: "method not allowed" });

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const mem = admin.schema("memoria");

  // 호출자 검증: 활성 master
  const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
  if (!token) return json(401, { error: "no token" });
  const { data: who, error: whoErr } = await admin.auth.getUser(token);
  if (whoErr || !who?.user) return json(401, { error: "unauthorized" });
  const { data: caller } = await mem.from("staff")
    .select("role, status, biz_unit_id").eq("auth_user_id", who.user.id).maybeSingle();
  if (!caller || caller.status !== "active" || caller.role !== "master")
    return json(403, { error: "forbidden: master only" });

  let body: any;
  try { body = await req.json(); } catch { return json(400, { error: "bad json" }); }

  // ── staff(worker|collab) 생성 ──
  if (body.kind === "staff") {
    const { name, loginId, perms } = body;
    const role = body.role === "collab" ? "collab" : "worker";
    if (!name || !validId(loginId)) return json(400, { error: "이름 필요 · 아이디는 6자 이상" });
    const email = `${String(loginId).trim()}@${STAFF_DOMAIN}`;
    const { data: created, error } = await admin.auth.admin.createUser({
      email, password: String(loginId).trim(), email_confirm: true,
    });
    if (error) return json(400, { error: error.message });
    const { error: e2 } = await mem.from("staff").insert({
      auth_user_id: created.user.id, biz_unit_id: body.bizUnit || caller.biz_unit_id,
      name, login_id: String(loginId).trim(), email, role, status: "active",
      perms: role === "worker" ? (perms || []) : [],
    });
    if (e2) { await admin.auth.admin.deleteUser(created.user.id); return json(400, { error: e2.message }); }
    return json(200, { ok: true, authUserId: created.user.id, tempPassword: String(loginId).trim() });
  }

  // ── partner 계정 발급(파트너 행 존재 전제) ──
  if (body.kind === "partner") {
    const { data: p } = await mem.from("partners").select("id, id_code").eq("id", body.partnerId).maybeSingle();
    if (!p) return json(400, { error: "partner not found" });
    if (!validId(p.id_code)) return json(400, { error: "파트너 ID코드는 6자 이상이어야 합니다" });
    const email = `${String(p.id_code).trim()}@${PARTNER_DOMAIN}`;
    const { data: created, error } = await admin.auth.admin.createUser({
      email, password: String(p.id_code).trim(), email_confirm: true,
    });
    if (error) return json(400, { error: error.message });
    const { error: e2 } = await mem.from("partner_members").insert({
      auth_user_id: created.user.id, partner_id: p.id,
    });
    if (e2) { await admin.auth.admin.deleteUser(created.user.id); return json(400, { error: e2.message }); }
    return json(200, { ok: true, authUserId: created.user.id, tempPassword: String(p.id_code).trim() });
  }

  // ── 계정 삭제(auth 유저 삭제 → staff/partner_members CASCADE) ──
  if (body.kind === "delete") {
    if (!body.authUserId) return json(400, { error: "authUserId 필요" });
    if (body.authUserId === who.user.id) return json(400, { error: "본인 계정은 삭제할 수 없습니다" });
    const { error } = await admin.auth.admin.deleteUser(body.authUserId);
    if (error) return json(400, { error: error.message });
    return json(200, { ok: true });
  }

  return json(400, { error: "unknown kind" });
});
