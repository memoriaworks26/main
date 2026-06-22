// ─────────────────────────────────────────────────────────────
// 시스템 설정 데이터 계층 — 스토리지 보존정책(storage_classes). memoria(RLS, storage perm).
//   용량 통계(sizeGB/files/used/total)는 실스토리지 연동(Phase 6) 전까지 placeholder.
// ─────────────────────────────────────────────────────────────
import { db } from "../supabase.js";

const need = () => { const d = db(); if (!d) throw new Error("백엔드 미연결"); return d; };
const mapSC = (r) => ({
  key: r.key, name: r.name, desc: r.descr,
  retention: r.retention === "permanent" ? "permanent" : (isNaN(+r.retention) ? r.retention : +r.retention),
  sizeGB: 0, files: 0,  // 실통계는 Phase 6
});

export async function fetchStorageClasses() {
  const d = need();
  const { data, error } = await d.from("storage_classes").select("*").order("key");
  if (error) throw new Error("스토리지 정책 조회 실패: " + error.message);
  return (data || []).map(mapSC);
}

export async function setRetention(key, retention) {
  const d = need();
  const { error } = await d.from("storage_classes").update({ retention: String(retention) }).eq("key", key);
  if (error) throw new Error(error.message);
}
