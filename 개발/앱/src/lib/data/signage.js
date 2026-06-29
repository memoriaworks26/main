// ─────────────────────────────────────────────────────────────
// 사이니지 데이터 계층 — devices(파트너별). memoria(RLS: 파트너 자기것·staff signage perm).
//   store device: { id, partner(이름), room, status, playing, mode, volume, muted, ip, lastComm }
//   ↔ DB signage_devices(partner_id, room_label, last_comm …). play(재생/정지)은 전송제어 — DB 미저장(Phase8).
//   sources/notice는 다음 슬라이스.
// ─────────────────────────────────────────────────────────────
import { db } from "../supabase.js";

const need = () => { const d = db(); if (!d) throw new Error("백엔드 미연결"); return d; };
const mapDevice = (r) => ({
  // 호실명: room_id(uuid) 조인 우선, 없으면 옛 room_label(텍스트) 폴백.
  id: r.id, partnerId: r.partner_id, partner: r.partner?.name, roomId: r.room_id, room: r.room?.name ?? r.room_label ?? null,
  status: r.status, playing: r.playing, mode: r.mode,
  paused: r.paused, play: r.paused ? "stopped" : "playing",   // 정지/재생 상태(DB paused 기준)
  volume: r.volume, muted: r.muted, ip: r.ip, lastComm: r.last_comm,
  enrolled: !!r.device_token_hash, enrollCode: r.enroll_code,    // 토큰해시 값은 노출 X(불리언만)
  pendingCmd: r.pending_cmd, orientation: r.orientation, currentVideoId: r.current_video_id,
  hwSerial: r.hw_serial, model: r.model, mac: r.mac,             // 파이가 보고한 하드웨어 식별값
});

export async function fetchDevices() {
  const d = need();
  const { data, error } = await d.from("signage_devices").select("*, partner:partners(name), room:rooms(name)").order("id");
  if (error) throw new Error("디바이스 조회 실패: " + error.message);
  return (data || []).map(mapDevice);
}

// ── 디바이스 등록·인증·명령(라즈베리파이 프로비저닝) ──
//   등록: 행 insert → 등록코드 발급(RPC). 코드는 SD provision.json에 넣어 첫 부팅 자동등록.
export async function registerDevice({ id, partnerId, roomId }) {
  const d = need();
  const { error } = await d.from("signage_devices").insert({
    id, partner_id: partnerId, room_id: roomId || null, status: "pending", mode: "대기",
  });
  if (error) throw new Error("등록 실패: " + error.message);
  return issueEnroll(id);   // 발급된 등록코드 반환
}
export async function issueEnroll(id) {
  const d = need();
  const { data, error } = await d.rpc("signage_issue_enroll", { p_device: id });
  if (error) throw new Error("코드 발급 실패: " + error.message);
  return data;   // 8자리 등록코드
}
export async function revokeDevice(id) {
  const d = need();
  const { error } = await d.rpc("signage_revoke", { p_device: id });
  if (error) throw new Error("폐기 실패: " + error.message);
}

// ── 웹 사이니지 디스플레이(브라우저를 호실 TV로) ──
//   파이의 등록코드 교환(staff 전용 RPC) 대신, 콘솔이 직접 토큰을 만들어 sha256 해시만
//   디바이스 행에 저장한다. RLS dev_partner_rw/dev_staff_rw 로 파트너·관리자 모두 동작.
//   평문 토큰은 저장하지 않고 1회 반환 → 콘솔이 /s/<token> 링크로 사용.
const randHex = (n = 24) =>
  [...crypto.getRandomValues(new Uint8Array(n))].map((b) => b.toString(16).padStart(2, "0")).join("");
async function sha256hex(s) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
// 기존 디바이스에 새 웹 토큰 발급(기존 토큰/등록코드 폐기) → 평문 토큰 반환.
export async function issueWebToken(id) {
  const d = need();
  const token = randHex();
  const { error } = await d.from("signage_devices")
    .update({ device_token_hash: await sha256hex(token), enroll_code: null, enroll_expires_at: null, status: "online" })
    .eq("id", id);
  if (error) throw new Error("웹 토큰 발급 실패: " + error.message);
  return token;
}
// 호실용 웹 디스플레이 디바이스 신규 생성 + 토큰 발급 → { id, token }.
export async function createWebDisplay({ partnerId, roomId }) {
  const d = need();
  const id = "WEB-" + Date.now().toString(36).toUpperCase();
  const { error } = await d.from("signage_devices").insert({
    id, partner_id: partnerId, room_id: roomId || null, status: "pending", mode: "대기", orientation: "landscape",
  });
  if (error) throw new Error("디스플레이 생성 실패: " + error.message);
  const token = await issueWebToken(id);
  return { id, token };
}
// 일회성 명령(restart/reboot/refresh/redownload) — 파이가 다음 폴에서 읽고 실행 후 비워짐.
export async function sendCommand(id, cmd) {
  const d = need();
  const { error } = await d.from("signage_devices")
    .update({ pending_cmd: cmd, pending_cmd_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error("명령 실패: " + error.message);
}

// mode/volume/muted/playing/status/paused만 DB 반영(파이가 device-sync로 받아 적용).
export async function updateDevice(id, patch) {
  const d = need();
  const row = {};
  for (const k of ["mode", "volume", "muted", "playing", "status", "paused"]) if (patch[k] !== undefined) row[k] = patch[k];
  if (!Object.keys(row).length) return;
  const { error } = await d.from("signage_devices").update(row).eq("id", id);
  if (error) throw new Error(error.message);
}

// ── 표출 소스(광고·대기·알림) — 파트너별 ──
const mapSource = (r) => ({ id: r.id, cat: r.cat, name: r.name, kind: r.kind, file: r.file, storagePath: r.storage_path, active: r.active });

export async function fetchSources(partnerId) {
  const d = need();
  let q = d.from("signage_sources").select("*").order("id");
  if (partnerId) q = q.eq("partner_id", partnerId);
  const { data, error } = await q;
  if (error) throw new Error("소스 조회 실패: " + error.message);
  return (data || []).map(mapSource);
}
export async function addSource(partnerId, src) {
  const d = need();
  const { data, error } = await d.from("signage_sources")
    .insert({ id: src.id, partner_id: partnerId, cat: src.cat, name: src.name, kind: src.kind, file: src.file, storage_path: src.storagePath ?? null, active: !!src.active })
    .select().single();
  if (error) throw new Error(error.message);
  return mapSource(data);
}
export async function removeSource(id) {
  const d = need();
  const { error } = await d.from("signage_sources").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
// 카테고리당 1개만 활성: cat 전체 끄고, on이면 대상만 켬.
export async function selectSource(partnerId, id, cat, on) {
  const d = need();
  let r = await d.from("signage_sources").update({ active: false }).eq("partner_id", partnerId).eq("cat", cat);
  if (r.error) throw new Error(r.error.message);
  if (on) { r = await d.from("signage_sources").update({ active: true }).eq("id", id); if (r.error) throw new Error(r.error.message); }
}

// ── 알림 문구(파트너별 1행) ──
export async function fetchNotice(partnerId) {
  const d = need();
  let q = d.from("signage_notice").select("*");
  if (partnerId) q = q.eq("partner_id", partnerId);
  const { data, error } = await q.maybeSingle();
  if (error) throw new Error("알림 조회 실패: " + error.message);
  return data ? { enabled: data.enabled, template: data.template } : null;
}
export async function upsertNotice(partnerId, notice) {
  const d = need();
  const { error } = await d.from("signage_notice").upsert({ partner_id: partnerId, enabled: notice.enabled, template: notice.template });
  if (error) throw new Error(error.message);
}
