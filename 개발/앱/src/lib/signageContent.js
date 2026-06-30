// ─────────────────────────────────────────────────────────────
// 사이니지 표출 콘텐츠 해석(클라이언트) — device-sync 엣지함수와 '동일 규칙'을
// 프론트에서 미러링해, 통합 대시보드 호실 카드가 '지금 호실 TV에 나오는 화면'을
// 그대로 미리보기로 보여준다.
//   · 왜 미러링? 화면 토큰은 DB에 해시만 저장돼 /s/<token> 을 카드에 임베드할 수 없다.
//     그래서 device-sync 와 같은 근거(모드·오늘 예약·발행본·활성 소스)로 DB를 직접 해석한다.
//   · 연결 판정 : 하트비트(마지막 device-sync 폴 < 20s). 목업 시드는 status 폴백.
//   · 콘텐츠    : 제작영상 → 오늘 점유 예약의 발행본(memoria-final)
//                 광고·대기·알림 → 파트너 활성 소스(memoria-content)
//   실제 서명URL 발급은 카드(ScreenPreview)가 storage.signedUrl 로 수행.
// ─────────────────────────────────────────────────────────────
import { BUCKETS } from "./storage.js";

// live.jsx 와 동일 — 마지막 하트비트가 이 시간 내면 '연결됨'(웹/파이 모두 3초 폴).
export const HEARTBEAT_MS = 20000;

// device 연결/모드 상태. 실데이터=하트비트(발급 후 화면이 폴링해야 연결), 목업 시드=status 폴백.
export function signageState(dev) {
  if (!dev) return { exists: false, provisioned: false, onlineNow: false, waiting: false, offline: false, mode: "대기", play: "stopped" };
  const mode = dev.mode || "대기";
  const lastMs = dev.lastComm ? new Date(dev.lastComm).getTime() : 0;
  const validHb = Number.isFinite(lastMs) && lastMs > 0;
  if (dev.enrolled) {
    // 실데이터 — 토큰 발급(프로비저닝)됨. 실제 연결은 화면이 device-sync를 폴링(하트비트)할 때만.
    const onlineNow = validHb && Date.now() - lastMs < HEARTBEAT_MS;
    return { exists: true, provisioned: true, onlineNow, waiting: !onlineNow && !validHb, offline: !onlineNow && validHb, mode, play: dev.play || "stopped" };
  }
  // 목업 시드(enrolled 없음) — status 기반 폴백(데모 화면이 검게 죽지 않도록).
  const online = dev.status === "live" || dev.status === "online";
  return { exists: true, provisioned: true, onlineNow: online, waiting: dev.status === "pending", offline: dev.status === "offline", mode, play: dev.status === "live" ? "playing" : (dev.play || "stopped") };
}

const notExpired = (v) => !v.expiresAt || new Date(v.expiresAt).getTime() > Date.now();

// 지금 이 호실 화면이 표출할 콘텐츠 참조(버킷·경로). 없으면 null.
//   device-sync 의 모드별 해석과 동일하게 맞춘다:
//     제작영상    → 오늘(KST) 이 호실을 점유하는 예약의 발행본(published·미만료·supabase)
//     광고/대기/알림 → 그 카테고리의 활성 소스(파일 있는 것)
export function resolveSignageRef({ device, room, reservations = [], videos = [], sources = [], today }) {
  const mode = device?.mode || "대기";
  if (mode === "제작영상") {
    if (!room) return null;
    // device-sync: reserve_date <= today <= end_date 인 이 호실 예약(시간대 무관 — 하루 점유).
    const occ = reservations.filter((r) =>
      ((r.roomId && room.id && r.roomId === room.id) || r.room === room.name) &&
      r.date && r.date <= today && (r.endDate || r.date) >= today);
    for (const r of occ) {
      const v = videos.find((x) => x.reservationId === r.id && x.status === "published" && x.finalPath
        && notExpired(x) && (x.storageProvider ?? "supabase") === "supabase");
      if (v) return { kind: "video", bucket: BUCKETS.final, path: v.finalPath, key: "v:" + v.id };
    }
    return null;
  }
  if (mode === "광고" || mode === "대기" || mode === "알림") {
    const src = sources.find((s) => s.cat === mode && s.active && s.storagePath);
    if (src) return { kind: src.kind === "영상" ? "video" : "image", bucket: BUCKETS.content, path: src.storagePath, key: "s:" + src.id };
    return null;
  }
  return null;
}
