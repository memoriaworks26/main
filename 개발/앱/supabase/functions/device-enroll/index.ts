// ─────────────────────────────────────────────────────────────
// device-enroll — 라즈베리파이 최초 등록(등록코드 → 디바이스 토큰 교환). service_role.
//   파이는 Supabase 유저가 아니다. SD에 구워둔 provision.json의 등록코드(enroll_code)를
//   딱 1번 토큰과 바꾼다. 서버는 토큰 평문을 저장하지 않고 sha256 해시만 보관.
//     요청  POST { code, ip? }
//     응답  200 { ok, device, token }   ← 파이는 token을 저장하고 code는 폐기
//   이후 모든 통신은 device-sync에 token으로. (인증 헤더 불필요 = 코드 소지가 자격)
// ─────────────────────────────────────────────────────────────
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const randToken = (n = 32) =>
  [...crypto.getRandomValues(new Uint8Array(n))].map((b) => b.toString(16).padStart(2, "0")).join("");
async function sha256hex(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json(405, { error: "method not allowed" });

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
  const mem = admin.schema("memoria");

  let body: any;
  try { body = await req.json(); } catch { return json(400, { error: "bad json" }); }
  const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
  if (!code) return json(400, { error: "code 필요" });

  // 코드로 디바이스 찾기(미만료 + 아직 미등록)
  const { data: dev } = await mem.from("signage_devices")
    .select("id, enroll_code, enroll_expires_at")
    .eq("enroll_code", code).maybeSingle();
  if (!dev) return json(401, { error: "유효하지 않은 등록코드" });
  if (dev.enroll_expires_at && new Date(dev.enroll_expires_at) < new Date())
    return json(401, { error: "등록코드 만료 — 콘솔에서 재발급" });

  // 토큰 발급 → 해시만 저장, 코드 폐기. 하드웨어 식별값(시리얼·모델·MAC)도 1회 보고받아 저장.
  const token = randToken();
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  const { error } = await mem.from("signage_devices").update({
    device_token_hash: await sha256hex(token),
    enroll_code: null, enroll_expires_at: null,
    status: "online", last_comm: new Date().toISOString(), ip: str(body.ip),
    hw_serial: str(body.serial), model: str(body.model), mac: str(body.mac),
  }).eq("id", dev.id);
  if (error) return json(400, { error: error.message });

  return json(200, { ok: true, device: dev.id, token });
});
