import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, open: false },
  // 무거운 의존성을 미리 사전번들에 고정 → 새로고침 중 "새 의존성 발견 → 재최적화 → 서버 재시작/포트밀림"으로
  // 개발서버가 죽는 현상 방지.
  optimizeDeps: {
    include: ["@supabase/supabase-js", "react", "react-dom", "lucide-react"],
  },
});
