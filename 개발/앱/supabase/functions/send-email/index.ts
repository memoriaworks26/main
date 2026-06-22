// ─────────────────────────────────────────────────────────────
// send-email — Resend 이메일 발송(서버, 키는 RESEND_API_KEY 시크릿).
//   호출자: 활성 staff(관리자)만. body: { to, subject, html?, text?, from?, replyTo? }
//   from 기본값 = onboarding@resend.dev(Resend 미검증 도메인 — 계정 소유 메일로만 발송 가능).
//   memoria.works 도메인 검증 후 from을 noreply@memoria.works 등으로 교체하면 임의 수신자 발송 가능.
//   ⚠️ 키는 코드/레포에 없음. `supabase secrets set RESEND_API_KEY=...` 로 주입.
// ─────────────────────────────────────────────────────────────
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const isEmail = (v: unknown) => typeof v === "string" && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);
const DEFAULT_FROM = Deno.env.get("RESEND_FROM") || "메모리아웍스 <onboarding@resend.dev>";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json(405, { error: "method not allowed" });

  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) return json(500, { error: "RESEND_API_KEY 미설정" });

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  // 호출자 검증: 활성 staff(관리자)만 — 스팸/남용 방지.
  const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
  if (!token) return json(401, { error: "no token" });
  const { data: who, error: whoErr } = await admin.auth.getUser(token);
  if (whoErr || !who?.user) return json(401, { error: "unauthorized" });
  const { data: caller } = await admin.schema("memoria").from("staff")
    .select("status").eq("auth_user_id", who.user.id).maybeSingle();
  if (!caller || caller.status !== "active") return json(403, { error: "관리자만 발송할 수 있습니다." });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json(400, { error: "invalid json" }); }
  const { to, subject, html, text, from, replyTo } = body as Record<string, string>;
  if (!isEmail(to)) return json(400, { error: "수신자 이메일이 올바르지 않습니다." });
  if (!subject || typeof subject !== "string") return json(400, { error: "제목(subject)이 필요합니다." });
  if (!html && !text) return json(400, { error: "본문(html 또는 text)이 필요합니다." });

  const payload: Record<string, unknown> = { from: from || DEFAULT_FROM, to: [to], subject };
  if (html) payload.html = html;
  if (text) payload.text = text;
  if (replyTo) payload.reply_to = replyTo;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const out = await res.json().catch(() => ({}));
  if (!res.ok) return json(res.status, { error: out?.message || "발송 실패", detail: out });
  return json(200, { ok: true, id: out?.id });
});
