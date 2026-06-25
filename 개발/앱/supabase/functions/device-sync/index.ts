// ─────────────────────────────────────────────────────────────
// device-sync — 라즈베리파이가 3초마다 호출하는 단일 동기화 엔드포인트. service_role.
//   "나 살아있다(하트비트)" + "지금 뭘 틀까(콘텐츠)" + "할 명령 있나" 를 한 번에.
//     요청  POST { token, ip?, current_video_id? }
//     응답  200 {
//             ok, device, mode, volume, muted, orientation,
//             cmd,                       // 'restart'|'refresh'|'redownload'|null (읽으면 비워짐)
//             content: { kind, id, url, expires_at },   // kind: 'video'|'image'|'none'
//             notice:  { enabled, text } // 알림 모드일 때만
//           }
//   모드별 콘텐츠 해석:
//     제작영상 → 호실→오늘 예약→발행영상(미만료) → memoria-final 서명URL
//     광고/대기/알림 → 파트너 활성 소스 → memoria-content 서명URL (알림은 예약 안내문구 동봉)
//   영상 없음/예약 없음 → kind:'none' → 파이는 대기화면 폴백(검은화면 금지).
// ─────────────────────────────────────────────────────────────
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

async function sha256hex(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
// 한국시간 기준 오늘(YYYY-MM-DD) — 예약 날짜는 tz 없는 date라 KST로 맞춘다.
const todayKST = () => new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
// 알림 문구 치환: {chief} {deceased} {room} {slot} {date}
const fillNotice = (tpl: string, r: any) =>
  (tpl || "").replace(/\{chief\}/g, r?.chief ?? "").replace(/\{deceased\}/g, r?.deceased ?? "")
    .replace(/\{room\}/g, r?.room?.name ?? "").replace(/\{slot\}/g, r?.slot ?? "")
    .replace(/\{date\}/g, r?.reserve_date ?? "");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json(405, { error: "method not allowed" });

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
  const mem = admin.schema("memoria");

  let body: any;
  try { body = await req.json(); } catch { return json(400, { error: "bad json" }); }
  const token = typeof body.token === "string" ? body.token.trim() : "";
  if (!token) return json(401, { error: "no token" });

  // 토큰 해시로 디바이스 조회
  const { data: dev } = await mem.from("signage_devices")
    .select("id, partner_id, room_id, mode, volume, muted, orientation, pending_cmd")
    .eq("device_token_hash", await sha256hex(token)).maybeSingle();
  if (!dev) return json(401, { error: "unauthorized device" });

  const mode = dev.mode || "대기";
  const today = todayKST();
  const sign = (bucket: string, path: string) =>
    admin.storage.from(bucket).createSignedUrl(path, 3600).then((r) => r.data?.signedUrl ?? null);

  // ── 콘텐츠 해석 ──
  let content: any = { kind: "none" };
  let notice: any = undefined;

  if (mode === "제작영상" && dev.room_id) {
    // 호실 → 오늘 진행중 예약 → 발행영상(미만료)
    const { data: resv } = await mem.from("reservations")
      .select("id").eq("room_id", dev.room_id)
      .lte("reserve_date", today).gte("end_date", today)
      .order("reserve_date", { ascending: false }).limit(1).maybeSingle();
    if (resv) {
      const { data: vid } = await mem.from("videos")
        .select("id, final_path, storage_provider, expires_at, status")
        .eq("reservation_id", resv.id).eq("status", "published")
        .order("issued_at", { ascending: false }).limit(1).maybeSingle();
      const live = vid && vid.final_path && (!vid.expires_at || new Date(vid.expires_at) > new Date());
      // v1: supabase 저장분만 서명. (r2 전환분은 추후 분기)
      if (live && (vid.storage_provider ?? "supabase") === "supabase") {
        const url = await sign("memoria-final", vid.final_path);
        if (url) content = { kind: "video", id: vid.id, url, expires_at: vid.expires_at ?? null };
      }
    }
  } else if (mode === "광고" || mode === "대기" || mode === "알림") {
    const { data: src } = await mem.from("signage_sources")
      .select("id, kind, storage_path, active")
      .eq("partner_id", dev.partner_id).eq("cat", mode).eq("active", true)
      .not("storage_path", "is", null).limit(1).maybeSingle();
    if (src?.storage_path) {
      const url = await sign("memoria-content", src.storage_path);
      if (url) content = { kind: src.kind === "영상" ? "video" : "image", id: src.id, url, expires_at: null };
    }
    if (mode === "알림") {
      const { data: n } = await mem.from("signage_notice")
        .select("enabled, template").eq("partner_id", dev.partner_id).maybeSingle();
      let text = "";
      if (n?.enabled) {
        // 파트너의 다음(임박) 예약 — 발행 완료건 제외
        const { data: nextR } = await mem.from("reservations")
          .select("chief, deceased, slot, reserve_date, room:rooms(name)")
          .eq("partner_id", dev.partner_id).neq("status", "published")
          .gte("end_date", today).order("reserve_date", { ascending: true }).limit(1).maybeSingle();
        text = fillNotice(n.template, nextR);
      }
      notice = { enabled: !!n?.enabled, text };
    }
  }

  // ── 하트비트 + 명령 소비(읽고 비움) ──
  const ip = typeof body.ip === "string" ? body.ip : undefined;
  const patch: any = { last_comm: new Date().toISOString(), status: "online", pending_cmd: null };
  if (ip !== undefined) patch.ip = ip;
  if (typeof body.current_video_id === "string") patch.current_video_id = body.current_video_id;
  await mem.from("signage_devices").update(patch).eq("id", dev.id);

  return json(200, {
    ok: true, device: dev.id, mode,
    volume: dev.volume, muted: dev.muted, orientation: dev.orientation || "landscape",
    cmd: dev.pending_cmd ?? null,
    content, ...(notice ? { notice } : {}),
  });
});
