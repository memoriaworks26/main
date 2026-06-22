// ─────────────────────────────────────────────────────────────
// 보호자 제출(제작링크) 데이터 계층 — staff/파트너. memoria.submissions(RLS).
//   예약→submission 발급(토큰 자동) → 보호자 /u/<token>. 상태(draft→queued→rendering→done) 표시.
// ─────────────────────────────────────────────────────────────
import { db } from "../supabase.js";

const need = () => { const d = db(); if (!d) throw new Error("백엔드 미연결"); return d; };
const COLS = "id,token,reservation_id,pet_name,partner_name,status,video_url,created_at,expires_at";
const mapSub = (r) => ({ id: r.id, token: r.token, reservationId: r.reservation_id, petName: r.pet_name, partnerName: r.partner_name, status: r.status, videoUrl: r.video_url, createdAt: r.created_at, expiresAt: r.expires_at });

export async function fetchSubmissions() {
  const d = need();
  const { data, error } = await d.from("submissions").select(COLS).order("created_at");
  if (error) throw new Error("제출 조회 실패: " + error.message);
  return (data || []).map(mapSub);
}

// 예약에 대한 보호자 제작링크 발급(토큰 자동). 예약당 1건(unique).
export async function issueSubmission({ reservationId, petName, partnerName }) {
  const d = need();
  const { data, error } = await d.from("submissions")
    .insert({ reservation_id: reservationId, pet_name: petName, partner_name: partnerName, status: "draft" })
    .select(COLS).single();
  if (error) throw new Error(error.message);
  return mapSub(data);
}
