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
  reservationId: r.reservation_id,
  partner: r.partner?.name ?? r.partner_id,
  deceased: r.deceased,
  room: r.room_no,
  datetime: r.funeral_at,
  date: r.funeral_date,
  sizeMB: r.final_mb != null ? Number(r.final_mb) : 0,
  srcMB: r.source_mb != null ? Number(r.source_mb) : 0,
  finalPath: r.final_path, sourcePath: r.source_path,  // 다운로드 서명URL 대상
  status: r.status,
});

export async function fetchVideos() {
  const d = need();
  const { data, error } = await d.from("videos").select("*, partner:partners(name)").order("created_at", { ascending: false });
  if (error) throw new Error("발행 영상 조회 실패: " + error.message);
  return (data || []).map(mapVideo);
}

// 발행 영상 행 삭제(staff RLS — videos_staff_rw). 스토리지 파일 정리는 store 액션이 best-effort로 처리.
export async function deleteVideos(ids) {
  if (!ids?.length) return [];
  const d = need();
  const { error } = await d.from("videos").delete().in("id", ids);
  if (error) throw new Error("영상 삭제 실패: " + error.message);
  return ids;
}
