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
// 인증키 우선순위: main(오늘 추가) … → sub(기존). 앞 키가 크레딧소진/인증오류면 다음 키로 폴백.
const CREDS = cfg.higgsfield.keys;
const authHeader = (c) => ({
  Authorization: `Key ${c.key}:${c.secret}`,
  "Content-Type": "application/json",
});

// 생성요청 → { id, cred }(첫 성공 키). 응답형태(실측): { id, jobs:[{id,status,results}], input_params }.
//   크레딧소진(403)·결제(402)·인증(401)·서버오류(5xx)면 다음 키로 폴백. 그 외(422 등 요청오류)는 즉시 중단.
async function submit(path, params) {
  if (!CREDS.length) throw new Error("HIGGSFIELD 키 미설정");
  let lastErr;
  for (const cred of CREDS) {
    const res = await fetch(`${BASE}${path}`, { method: "POST", headers: authHeader(cred), body: JSON.stringify({ params }) });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.id) return { id: data.id, cred };
    const det = typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail ?? data);
    lastErr = new Error(`higgsfield ${path} 실패(${res.status}): ${det}`);
    const transient = res.status === 401 || res.status === 402 || res.status === 403 || res.status >= 500;
    if (!transient) throw lastErr; // 422 등 요청 자체 오류는 키 바꿔도 동일 → 즉시 중단
  }
  throw lastErr; // 모든 키 소진/오류
}

// 폴링(실측): GET /v1/job-sets/{id} → jobs[0].status, jobs[0].results.raw.url. submit가 쓴 키로 조회.
async function poll(id, cred, { timeoutMs = 300000, intervalMs = 5000 } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await fetch(`${BASE}/v1/job-sets/${id}`, { headers: authHeader(cred) });
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
  const { id, cred } = await submit("/v1/text2image/seedream", params);
  return poll(id, cred);
}

// AI영상(Kling i2v). imageUrl: 독사진 1장 서명URL → 영상. 반환: 영상 URL.
//   /v1/image2video/kling { params:{ prompt, input_image:{type:"image_url",image_url} } } (실측 검증, input_image 단수).
export async function generateMemoryVideo({ prompt, imageUrl, imageUrls }) {
  const url = imageUrl || (imageUrls && imageUrls[0]);
  if (!url) throw new Error("Kling: 입력 사진(독사진) 필요");
  const params = { prompt, input_image: { type: "image_url", image_url: url } };
  // Kling 영상생성은 수 분 소요 — 폴링 타임아웃 길게(기본 12분, 리퍼 15분보다 짧게). env로 조정.
  const timeoutMs = Number(process.env.HIGGSFIELD_POLL_MS) || 720000;
  const { id, cred } = await submit("/v1/image2video/kling", params);
  return poll(id, cred, { timeoutMs });
}
