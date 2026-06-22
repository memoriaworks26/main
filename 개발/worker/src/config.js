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
    stub: process.env.WORKER_STUB !== "0",
    higgsfield: { key: process.env.HIGGSFIELD_API_KEY, secret: process.env.HIGGSFIELD_SECRET },
  };
  return _cfg;
}
