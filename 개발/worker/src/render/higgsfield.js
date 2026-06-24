// ─────────────────────────────────────────────────────────────
// Higgsfield 클라이언트 — 타이틀 이미지(Soul) + 추억영상(DoP). 한 키로 둘 다(OpenAI 불필요).
//   계약(2026-06 실측 검증, platform.higgsfield.ai, Authorization: Key {API_KEY}:{SECRET}):
//   · 추억영상: POST /v1/image2video/dop  { params:{ model:"dop-turbo"|"dop-lite", prompt,
//                input_images:[{type:"image_url",image_url}] } }
//   · 타이틀이미지: POST /v1/text2image/soul { params:{ prompt,
//                width_and_height: '2048x1152'(16:9 등 enum), quality:'1080p',
//                image_reference?:{type:"image_url",image_url}, seed?, enhance_prompt? } }
//   둘 다 request_id 반환 → 상태 폴링(completed|failed|nsfw) → 결과 url.
//   ※ 계정 크레딧 필요(없으면 403 "Not enough credits"). 결과 응답 정확 형태는 크레딧 충전 후 1건으로 확정.
// ─────────────────────────────────────────────────────────────
import { loadConfig } from "../config.js";

const cfg = loadConfig();
const BASE = "https://platform.higgsfield.ai";
const headers = () => ({
  Authorization: `Key ${cfg.higgsfield.key}:${cfg.higgsfield.secret}`,
  "Content-Type": "application/json",
});

// 생성요청 → job_set id. 응답형태(실측): { id, jobs:[{id,status,results}], input_params }.
async function submit(path, params) {
  if (!cfg.higgsfield.key || !cfg.higgsfield.secret) throw new Error("HIGGSFIELD 키 미설정");
  const res = await fetch(`${BASE}${path}`, { method: "POST", headers: headers(), body: JSON.stringify({ params }) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { const det = typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail ?? data); throw new Error(`higgsfield ${path} 실패(${res.status}): ${det}`); }
  const id = data.id;
  if (!id) throw new Error("higgsfield: job_set id 없음 — " + JSON.stringify(data).slice(0, 200));
  return id;
}

// 폴링(실측): GET /v1/job-sets/{id} → jobs[0].status, jobs[0].results.raw.url. 완료 시 결과 URL 반환.
async function poll(id, { timeoutMs = 300000, intervalMs = 5000 } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await fetch(`${BASE}/v1/job-sets/${id}`, { headers: headers() });
    const d = await res.json().catch(() => ({}));
    const job = (d.jobs && d.jobs[0]) || {};
    if (job.status === "completed") {
      const url = job.results?.raw?.url || job.results?.min?.url;
      if (!url) throw new Error("higgsfield: 완료됐으나 결과 URL 없음 — " + JSON.stringify(job).slice(0, 200));
      return url;
    }
    if (job.status === "failed" || job.status === "nsfw") throw new Error("higgsfield 생성 실패: " + job.status);
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error("higgsfield 폴링 타임아웃");
}

// 타이틀 이미지(Seedream i2i). imageRefUrl: 원본 독사진 서명URL → 영정 초상으로 변환. 반환: 이미지 URL.
//   /v1/text2image/seedream { params:{ prompt, input_images:[{type:"image_url",image_url}] } } (실측 검증).
export async function generateTitleImage({ prompt, imageRefUrl }) {
  if (!imageRefUrl) throw new Error("Seedream: 입력 사진(독사진) 필요");
  const params = { prompt, input_images: [{ type: "image_url", image_url: imageRefUrl }] };
  return poll(await submit("/v1/text2image/seedream", params));
}

// AI영상(Kling i2v). imageUrl: 독사진 1장 서명URL → 영상. 반환: 영상 URL.
//   /v1/image2video/kling { params:{ prompt, input_image:{type:"image_url",image_url} } } (실측 검증, input_image 단수).
export async function generateMemoryVideo({ prompt, imageUrl, imageUrls }) {
  const url = imageUrl || (imageUrls && imageUrls[0]);
  if (!url) throw new Error("Kling: 입력 사진(독사진) 필요");
  const params = { prompt, input_image: { type: "image_url", image_url: url } };
  // Kling 영상생성은 수 분 소요 — 폴링 타임아웃 길게(기본 12분, 리퍼 15분보다 짧게). env로 조정.
  const timeoutMs = Number(process.env.HIGGSFIELD_POLL_MS) || 720000;
  return poll(await submit("/v1/image2video/kling", params), { timeoutMs });
}
