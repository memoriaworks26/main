// ─────────────────────────────────────────────────────────────
// 발행 영상(videos) 데이터 계층 — staff/collab/파트너(RLS). memoria.videos.
//   워커가 렌더 완료 시 적재(final_path/source_path/…). 기간별 다운로드·고객 발행본에서 사용.
//   store/UI shape: { id, partnerId, partner(이름), deceased, room, datetime(YYMMDDHHmm),
//                     date(YYYY-MM-DD), sizeMB(final), srcMB(source), status }
// ─────────────────────────────────────────────────────────────
import { db } from "../supabase.js";

const need = () => { const d = db(); if (!d) throw new Error("백엔드 미연결"); return d; };
const mapVideo = (r) => ({
  id: r.id,
  partnerId: r.partner_id,
  partner: r.partner?.name ?? r.partner_id,
  deceased: r.deceased,
  room: r.room_no,
  datetime: r.funeral_at,
  date: r.funeral_date,
  sizeMB: r.final_mb != null ? Number(r.final_mb) : 0,
  srcMB: r.source_mb != null ? Number(r.source_mb) : 0,
  status: r.status,
});

export async function fetchVideos() {
  const d = need();
  const { data, error } = await d.from("videos").select("*, partner:partners(name)").order("created_at", { ascending: false });
  if (error) throw new Error("발행 영상 조회 실패: " + error.message);
  return (data || []).map(mapVideo);
}
