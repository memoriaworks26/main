import { createClient } from "@supabase/supabase-js";
import { loadConfig } from "./config.js";

const cfg = loadConfig();
// service_role 클라이언트 — RLS 우회(서버 전용). memoria 스키마 접근은 db 사용.
export const sb = createClient(cfg.url, cfg.serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
export const db = sb.schema("memoria");
