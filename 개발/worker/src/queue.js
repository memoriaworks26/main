import { db } from "./supabase.js";
import { loadConfig } from "./config.js";

const cfg = loadConfig();

// 가장 오래된 queued 1건을 원자적으로 claim(→rendering). 없으면 null.
export async function claimJob() {
  const { data, error } = await db.rpc("claim_render_job");
  if (error) throw new Error("claim 실패: " + error.message);
  // 빈 큐면 PostgREST가 all-null 합성행을 줄 수 있어 id로 실재 여부 판정.
  return data && data.id ? data : null;
}

// 제출물의 업로드 자산(사진·영상) — sort_order 순.
export async function fetchAssets(job) {
  const { data, error } = await db
    .from("submission_assets").select("*").eq("submission_id", job.id).order("sort_order");
  if (error) throw new Error("assets 조회 실패: " + error.message);
  return data || [];
}

// 렌더 성공 → submission done + 영상 아카이브(best-effort).
export async function completeJob(job, result) {
  const videoUrl = result?.videoUrl || null;
  const { error } = await db.from("submissions")
    .update({ status: "done", video_url: videoUrl, render_error: null }).eq("id", job.id);
  if (error) throw new Error("complete 실패: " + error.message);

  try {
    let partnerId = null;
    if (job.reservation_id) {
      const { data: r } = await db.from("reservations").select("partner_id").eq("id", job.reservation_id).maybeSingle();
      partnerId = r?.partner_id || null;
    }
    if (partnerId) {
      await db.from("videos").upsert({
        id: `vid_${job.id}`, partner_id: partnerId, reservation_id: job.reservation_id,
        deceased: job.pet_name, status: "published",
        final_path: result?.finalPath || videoUrl, final_mb: result?.finalMB ?? null,
        storage_provider: "supabase", issued_at: new Date().toISOString(),
      });
    }
  } catch { /* 아카이브 실패는 치명 아님 */ }
}

// 렌더 실패 → 재시도 한도 미만이면 queued로 되돌림, 초과면 failed.
export async function failJob(job, err) {
  const status = (job.render_attempts || 0) >= cfg.maxAttempts ? "failed" : "queued";
  await db.from("submissions")
    .update({ status, render_error: String(err?.message || err).slice(0, 500) }).eq("id", job.id);
  return status;
}
