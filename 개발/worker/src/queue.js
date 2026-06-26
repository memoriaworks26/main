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

// 합성 잡 claim(compose_queued → composing). 없으면 null. (2단계 中 2단계)
export async function claimComposeJob() {
  const { data, error } = await db.rpc("claim_compose_job");
  if (error) throw new Error("compose claim 실패: " + error.message);
  return data && data.id ? data : null;
}

// 블록 생성 성공 → blocks_ready(편집 대기). 전체 합성은 관리자 「최종 렌더」에서.
export async function completeBlocks(job) {
  const { error } = await db.from("submissions")
    .update({ status: "blocks_ready", render_error: null, regen_target: null }).eq("id", job.id);
  if (error) throw new Error("blocks 완료 기록 실패: " + error.message);
}

// 합성 실패 → failed(관리자 재시도). render_error 기록.
export async function failCompose(job, err) {
  await db.from("submissions")
    .update({ status: "failed", render_error: String(err?.message || err).slice(0, 500) }).eq("id", job.id);
}

// 하트비트 — 진행 중 작업의 생존 신호(render_heartbeat_at 갱신). reaper 오발(중복/튐) 방지.
export async function touchHeartbeat(id) {
  const { error } = await db.rpc("touch_render_heartbeat", { p_id: id });
  if (error) throw new Error("하트비트 실패: " + error.message);
}

// 멈춘(rendering) 렌더 복구 — N분 이상 정지 시 재큐(또는 시도초과면 failed). 처리 건수 반환.
export async function requeueStale(minutes, maxAttempts) {
  const { data, error } = await db.rpc("requeue_stale_renders", { p_minutes: minutes, p_max_attempts: maxAttempts });
  if (error) throw new Error("리퍼 실패: " + error.message);
  return data || 0;
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
  const expiresAt = result?.expiresAt || null;          // 예약 종료일 기준 만료(서명URL·보호자 링크 동일 시점)
  const { error } = await db.from("submissions")
    .update({ status: "done", video_url: videoUrl, render_error: null, expires_at: expiresAt }).eq("id", job.id);
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
        storage_provider: "supabase", issued_at: new Date().toISOString(), expires_at: expiresAt,
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
