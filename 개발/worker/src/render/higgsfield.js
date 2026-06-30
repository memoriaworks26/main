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
// 타이틀 이미지 16:9 고정 — Seedream 출력 비율을 가로 16:9로 강제(편집기·최종 렌더가 1920×1080).
//   env로 조정. 모델이 해당 옵션 키를 거부(400/422)하면 옵션을 빼고 1회 폴백 → 비율 강제는 best-effort, 생성 자체는 막지 않음.
//   ※ Seedream은 aspect_ratio+resolution(width_and_height는 Soul 전용 — 실측: width_and_height는 무시돼 4:3로 나옴).
//   ※ DoP 영상은 aspect_ratio 옵션 없음(입력사진 비율 기반) — 비율 정규화는 최종 compose(1920×1080)에서 처리.
const IMG_ASPECT = process.env.HIGGSFIELD_IMG_ASPECT || "16:9"; // seedream aspect_ratio
const IMG_RES = process.env.HIGGSFIELD_IMG_RES || "2K";         // seedream resolution
const authHeader = (c) => ({
  Authorization: `Key ${c.key}:${c.secret}`,
  "Content-Type": "application/json",
});

// 생성요청 → { id, cred }(첫 성공 키). 응답형태(실측): { id, jobs:[{id,status,results}], input_params }.
//   429(레이트리밋): 같은 키로 지수 백오프 재시도(한 키 병렬 푸시 대비) → 소진되면 다음 키로.
//   크레딧소진(403)·결제(402)·인증(401)·서버오류(5xx)면 바로 다음 키로 폴백. 그 외(422 등 요청오류)는 즉시 중단.
const MAX_429_RETRY = Number(process.env.HIGGSFIELD_429_RETRY) || 4; // 같은 키 429 재시도 횟수(1·2·4·8초 백오프)
async function submit(path, params) {
  if (!CREDS.length) throw new Error("HIGGSFIELD 키 미설정");
  let lastErr;
  for (const cred of CREDS) {
    for (let attempt = 0; attempt <= MAX_429_RETRY; attempt++) {
      const res = await fetch(`${BASE}${path}`, { method: "POST", headers: authHeader(cred), body: JSON.stringify({ params }) });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.id) return { id: data.id, cred };
      const det = typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail ?? data);
      lastErr = new Error(`higgsfield ${path} 실패(${res.status}): ${det}`);
      if (res.status === 429 && attempt < MAX_429_RETRY) {
        await new Promise((r) => setTimeout(r, Math.min(1000 * 2 ** attempt, 8000))); // 지수 백오프 후 같은 키 재시도
        continue;
      }
      const transient = res.status === 401 || res.status === 402 || res.status === 403 || res.status === 429 || res.status >= 500;
      if (!transient) throw lastErr; // 422 등 요청 자체 오류는 키 바꿔도 동일 → 즉시 중단
      break; // 다음 키로 폴백(429는 재시도 소진, 그 외 transient는 즉시)
    }
  }
  throw lastErr; // 모든 키 소진/오류
}

// 출력옵션(16:9 등)을 붙여 제출하되, 모델이 옵션 키를 거부(400/422)하면 옵션을 빼고 1회 폴백.
//   → 비율 강제는 best-effort. 옵션 비호환이 생성 실패로 번지지 않도록 안전장치(라이브 파라미터 미검증 대비).
async function submitWithOpts(path, baseParams, opts) {
  try {
    return await submit(path, { ...baseParams, ...opts });
  } catch (e) {
    if (/실패\(4(00|22)\)/.test(e.message)) return await submit(path, baseParams);
    throw e;
  }
}

// 완료 상태/실패 상태 — 라이브 응답이 문서와 다를 수 있어 동의어를 관대하게 인정.
const DONE_STATES = new Set(["completed", "succeeded", "success", "done", "finished"]);
const FAIL_STATES = new Set(["failed", "error", "errored", "nsfw", "canceled", "cancelled", "rejected"]);
// 미디어 URL처럼 보이는 문자열(확장자 기준, 쿼리 허용).
const MEDIA_URL = /^https?:\/\/\S+\.(mp4|mov|webm|m4v|png|jpe?g|webp|gif)(\?|#|$)/i;
// 완료 잡에서 결과 URL 추출 — 응답 형태가 문서와 다를 수 있어 여러 후보 경로를 관대하게 탐색.
//   1) 알려진 키(results.raw/min/url, result, output[], url 등) → 2) 잡 객체 전체에서 미디어 URL 깊이 탐색.
function deepFindUrl(o, seen = new Set()) {
  if (!o || typeof o !== "object" || seen.has(o)) return null;
  seen.add(o);
  for (const v of Object.values(o)) if (typeof v === "string" && MEDIA_URL.test(v)) return v;
  for (const v of Object.values(o)) if (v && typeof v === "object") { const f = deepFindUrl(v, seen); if (f) return f; }
  return null;
}
function pickUrl(job) {
  const r = job?.results ?? job?.result ?? job?.output ?? null;
  const arr0 = (x) => Array.isArray(x) ? (x[0]?.url ?? (typeof x[0] === "string" ? x[0] : null)) : null;
  const cands = [
    r?.raw?.url, r?.min?.url, r?.url,
    typeof r?.raw === "string" ? r.raw : null,
    typeof r?.min === "string" ? r.min : null,
    arr0(r), arr0(job?.output), arr0(job?.results),
    job?.url, job?.video_url, job?.image_url,
  ].filter((u) => typeof u === "string" && /^https?:\/\//.test(u));
  return cands[0] || deepFindUrl(job);
}

// 폴링: GET /v1/job-sets/{id} → jobs[0].status + 결과 URL. submit가 쓴 키로 조회.
async function poll(id, cred, { timeoutMs = 300000, intervalMs = 5000 } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await fetch(`${BASE}/v1/job-sets/${id}`, { headers: authHeader(cred) });
    const d = await res.json().catch(() => ({}));
    const job = (d.jobs && d.jobs[0]) || d || {};
    const status = String(job.status || job.state || "").toLowerCase();
    if (DONE_STATES.has(status)) {
      const url = pickUrl(job);
      if (!url) throw new Error("higgsfield: 완료됐으나 결과 URL 없음 — " + JSON.stringify(job).slice(0, 400));
      return url;
    }
    if (FAIL_STATES.has(status)) throw new Error("higgsfield 생성 실패: " + status);
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error("higgsfield 폴링 타임아웃");
}

// 타이틀 이미지(Seedream i2i). imageRefUrl: 원본 독사진 서명URL → 영정 초상으로 변환. 반환: 이미지 URL.
//   /v1/text2image/seedream { params:{ prompt, input_images:[{type:"image_url",image_url}] } } (실측 검증).
export async function generateTitleImage({ prompt, imageRefUrl, imageRefUrls }) {
  // 독사진 1장 + (옵션) 영정 배경 스톡 등 다중 입력 이미지 + 텍스트 프롬프트 함께 전송.
  const urls = (imageRefUrls && imageRefUrls.length ? imageRefUrls : [imageRefUrl]).filter(Boolean);
  if (!urls.length) throw new Error("Seedream: 입력 사진 필요");
  const params = { prompt, input_images: urls.map((u) => ({ type: "image_url", image_url: u })) };
  const { id, cred } = await submitWithOpts("/v1/text2image/seedream", params, { aspect_ratio: IMG_ASPECT, resolution: IMG_RES }); // 16:9 강제
  return poll(id, cred);
}

// AI영상(DoP i2v). imageUrl: 독사진 1장 서명URL → 영상. 반환: 영상 URL.
//   /v1/image2video/dop { params:{ model:"dop-turbo", prompt, input_images:[{type:"image_url",image_url}] } } (실측 검증·운영 사용).
//   ※ Kling(/v1/image2video/kling, model kling-v2-1)은 이 계정들에서 잡이 즉시 'failed'로 떨어져 사용 불가(계정 모델접근/플랜 이슈,
//     API 스키마는 허용하나 실생성 거부). 영상은 정상 작동하는 DoP로 생성. (Kling 복귀하려면 Higgsfield 계정에 Kling 권한 필요)
export async function generateMemoryVideo({ prompt, imageUrl, imageUrls, model = "dop-turbo" }) {
  const url = imageUrl || (imageUrls && imageUrls[0]);
  if (!url) throw new Error("DoP: 입력 사진(독사진) 필요");
  // DoP는 input_images 최대 1장(2장 보내면 422) — 첫 독사진으로 생성. 서버가 motions·seed 자동 부여.
  const params = { model, prompt, input_images: [{ type: "image_url", image_url: url }] };
  // DoP 영상생성은 수 분 소요 — 폴링 타임아웃 길게(기본 12분, 리퍼 15분보다 짧게). env로 조정.
  const timeoutMs = Number(process.env.HIGGSFIELD_POLL_MS) || 720000;
  const { id, cred } = await submit("/v1/image2video/dop", params);
  return poll(id, cred, { timeoutMs });
}
