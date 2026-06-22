import dotenv from "dotenv";
dotenv.config();

let _cfg = null;
export function loadConfig() {
  if (_cfg) return _cfg;
  const miss = ["SUPABASE_URL", "SUPABASE_SERVICE_KEY"].filter((k) => !process.env[k]);
  if (miss.length) {
    console.error("환경변수 누락:", miss.join(", "), "— worker/.env.example 참고");
    process.exit(2);
  }
  _cfg = {
    url: process.env.SUPABASE_URL,
    serviceKey: process.env.SUPABASE_SERVICE_KEY,
    uploadBucket: process.env.UPLOAD_BUCKET || "memoria-uploads",
    finalBucket: process.env.FINAL_BUCKET || "memoria-final",
    pollMs: +(process.env.POLL_INTERVAL_MS || 5000),
    maxAttempts: +(process.env.MAX_ATTEMPTS || 3),
    concurrency: Math.max(1, +(process.env.CONCURRENCY || 2)),    // 동시 렌더 수(피크 흡수). 레플리카 병행도 안전(claim=SKIP LOCKED)
    staleMinutes: +(process.env.STALE_RENDER_MIN || 15),          // rendering이 이만큼 멈추면 리퍼가 재큐/실패
    reaperMs: +(process.env.REAPER_INTERVAL_MS || 60000),         // 리퍼 점검 주기
    stub: process.env.WORKER_STUB !== "0",
    higgsfield: { key: process.env.HIGGSFIELD_API_KEY, secret: process.env.HIGGSFIELD_SECRET },
  };
  return _cfg;
}
