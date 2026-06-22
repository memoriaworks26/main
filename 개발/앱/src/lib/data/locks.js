// ─────────────────────────────────────────────────────────────
// 편집기 동시편집 잠금 데이터 계층 — staff(production|secondedit). memoria(RLS·RPC).
//   kind: 'reservation'(1차) | 'second'(2차). id: 그 건 id.
// ─────────────────────────────────────────────────────────────
import { getClient, db } from "../supabase.js";

const need = () => { const d = db(); if (!d) throw new Error("백엔드 미연결"); return d; };
const mapLock = (l) => ({ targetKind: l.target_kind, targetId: l.target_id, lockedBy: l.locked_by, lockedByName: l.locked_by_name, lockedAt: l.locked_at, lastHeartbeat: l.last_heartbeat });

export async function fetchLocks() {
  const d = need();
  const { data, error } = await d.from("edit_locks").select("*");
  if (error) throw new Error("락 조회 실패: " + error.message);
  return (data || []).map(mapLock);
}
export async function acquireLock(kind, id) {
  const sb = getClient();
  const { data, error } = await sb.schema("memoria").rpc("acquire_edit_lock", { p_kind: kind, p_id: id });
  if (error) throw new Error(error.message);
  return data; // { ok, holder?, lockedAt? }
}
export async function heartbeatLock(kind, id) {
  const sb = getClient();
  await sb.schema("memoria").rpc("heartbeat_edit_lock", { p_kind: kind, p_id: id });
}
export async function releaseLock(kind, id) {
  const sb = getClient();
  await sb.schema("memoria").rpc("release_edit_lock", { p_kind: kind, p_id: id });
}
