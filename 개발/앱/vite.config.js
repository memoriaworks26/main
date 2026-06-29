import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // strictPort: 5173이 점유돼 있으면 조용히 5174로 밀려나는 대신 즉시 에러로 멈춘다.
  // (브라우저는 localhost:5173만 보는데 서버가 다른 포트로 옮겨가 "연결 거부" 뜨는 현상 방지)
  server: { port: 5173, strictPort: true, open: false },
  // 무거운 의존성을 미리 사전번들에 고정 → 새로고침 중 "새 의존성 발견 → 재최적화 → 서버 재시작/포트밀림"으로
  // 개발서버가 죽는 현상 방지.
  optimizeDeps: {
    include: ["@supabase/supabase-js", "react", "react-dom", "lucide-react"],
  },
  // 벤더 분할 — 단일 번들(821KB)을 react/supabase/icons로 쪼개 초기 파싱·캐시 효율↑.
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom"],
          supabase: ["@supabase/supabase-js"],
          icons: ["lucide-react"],
        },
      },
    },
  },
});
