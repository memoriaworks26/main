// ─────────────────────────────────────────────────────────────
// 콘텐츠 허브 자산 데이터 계층 — 파트너별 + 공통(shared). memoria(RLS).
//   store asset: { id, kind, name, meta, size, partner(이름)|shared } ↔ DB(content_assets)
// ─────────────────────────────────────────────────────────────
import { db } from "../supabase.js";

const need = () => { const d = db(); if (!d) throw new Error("백엔드 미연결"); return d; };
const mapAsset = (r) => ({
  id: r.id, kind: r.kind, name: r.name, meta: r.meta, size: r.size_label,
  storagePath: r.storage_path, thumbPath: r.thumb_path,
  ...(r.shared ? { shared: true } : { partner: r.partner?.name }),
});

export async function fetchContent() {
  const d = need();
  const { data, error } = await d.from("content_assets").select("*, partner:partners(name)").order("created_at", { ascending: false });
  if (error) throw new Error("콘텐츠 조회 실패: " + error.message);
  return (data || []).map(mapAsset);
}

export async function addContent(asset, partnerId) {
  const d = need();
  const row = {
    id: asset.id, kind: asset.kind, name: asset.name, meta: asset.meta,
    size_label: asset.size ?? null, shared: !!asset.shared,
    partner_id: asset.shared ? null : partnerId,
    storage_path: asset.storagePath ?? null,
    thumb_path: asset.thumbPath ?? null,
  };
  const { data, error } = await d.from("content_assets").insert(row).select("*, partner:partners(name)").single();
  if (error) throw new Error(error.message);
  return mapAsset(data);
}

export async function deleteContent(id) {
  const d = need();
  const { error } = await d.from("content_assets").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
