// ─────────────────────────────────────────────────────────────
// 렌더 파이프라인 — 보호자 업로드 → Higgsfield(타이틀 Soul + 추억영상 DoP) → FFmpeg 합성 → memoria-final 업로드.
//   AI=Higgsfield 단일(OpenAI 불필요). 합성=ffmpeg-static. 한글 자막=assets/NotoSansKR-Regular.otf.
//   ※ 실제 AI 생성엔 Higgsfield 크레딧 필요(없으면 generate*가 403 → 작업 failed로 재시도/표시).
//   v1 순서: 타이틀①②(Soul) → 추억 사진 슬라이드 → 추억영상(DoP) → 편지 장면. (템플릿 blocks 순서 반영=후속)
// ─────────────────────────────────────────────────────────────
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { loadConfig } from "../config.js";
import { log } from "../log.js";
import { db } from "../supabase.js";
import * as st from "../storage.js";
import { compose, makeSolid, makeTitleVideo, letterScrollSegment } from "./ffmpeg.js";

const cfg = loadConfig();
const FONT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../assets/NotoSansKR-Regular.otf");

// 완성본 서명URL 만료 — 예약 종료일(end_date) 자정(KST)까지. 보호자 링크(submissions.expires_at)와 동일 시점으로 묶임.
//   end_date 없으면 기본값, 임박/과거(재렌더 등)면 최소 floor로 보정해 즉시 만료 방지.
const MIN_EXPIRY_SEC = Number(process.env.VIDEO_MIN_EXPIRY_SEC) || 60 * 60 * 24 * 3;        // 최소 3일(검수·발인 당일 여유)
const DEFAULT_EXPIRY_SEC = Number(process.env.VIDEO_DEFAULT_EXPIRY_SEC) || 60 * 60 * 24 * 30; // end_date 없을 때 30일
function expiryFor(endDate) {
  const now = Date.now();
  let sec = DEFAULT_EXPIRY_SEC;
  if (endDate) {
    const target = new Date(`${endDate}T23:59:59+09:00`).getTime(); // 종료일 자정(KST)
    if (!Number.isNaN(target)) sec = Math.floor((target - now) / 1000);
  }
  if (sec < MIN_EXPIRY_SEC) sec = MIN_EXPIRY_SEC;
  return { sec, at: new Date(now + sec * 1000).toISOString() };
}

// ── 2단계: 최종 합성 ──────────────────────────────────────────────
// 저장된 블록 결과물(타이틀 Seedream·AI영상 Kling) + 보호자 소스(슬라이드·영상·편지)를 템플릿 순서로 합성.
//   순서: 타이틀①② → AI영상 A → 추억 슬라이드(사진) → 추억 영상(개별) → AI영상 B → 편지(+날짜)
const bySort = (p, q) => (p.sort_order ?? 0) - (q.sort_order ?? 0);
const fmtDate = (d) => (d ? String(d) : "");
export async function composeFinal(job, assets) {
  if (cfg.stub) return { videoUrl: `stub://${job.id}`, finalPath: `stub/${job.id}.mp4`, finalMB: 0, expiresAt: null };
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "mw-compose-"));
  try {
    const name = job.pet_name || "";
    // 활성(selected) 버전만 사용(버전 히스토리 중 선택본). slide_photo/memory_video는 selected 무관(모두 사용).
    const pick = (role) => assets.filter((a) => a.role === role && a.storage_path && a.selected !== false).sort(bySort);
    const titleVid = pick("title_video")[0];        // 완성 타이틀 클립(우선)
    const titleRes = pick("title_result");          // 이미지 2장(폴백)
    const aiRes = pick("ai_video_result");          // 영상 A·B
    const slidePhotos = pick("slide_photo");
    const memVideos = pick("memory_video");
    const sign = (a) => st.signedUrl(cfg.uploadBucket, a.storage_path, 3600);
    const dl = async (a, fn) => st.downloadTo(await sign(a), path.join(dir, fn));

    const segs = [];
    // 타이틀 — 완성 클립(title_video) 우선, 없으면 2장으로 영상화, 1장이면 정적, 없으면 텍스트
    if (titleVid) {
      await dl(titleVid, "title.mp4"); segs.push({ type: "video", path: path.join(dir, "title.mp4") });
    } else if (titleRes.length >= 2) {
      await dl(titleRes[0], "t0.png"); await dl(titleRes[1], "t1.png");
      const tv = path.join(dir, "title.mp4");
      await makeTitleVideo(path.join(dir, "t0.png"), path.join(dir, "t1.png"), `사랑하는 ${name}`, FONT, tv);
      segs.push({ type: "video", path: tv });
    } else if (titleRes.length === 1) {
      await dl(titleRes[0], "t0.png");
      segs.push({ type: "image", path: path.join(dir, "t0.png"), dur: 8, caption: `사랑하는 ${name}` });
    } else {
      // AI 변환 안함(타이틀 이미지 없음) — 텍스트 타이틀 카드
      const bg = await makeSolid("0x161310", path.join(dir, "tbg.png"));
      segs.push({ type: "image", path: bg, dur: 6, caption: `사랑하는 ${name}` });
    }
    // AI영상 A
    if (aiRes[0]) { await dl(aiRes[0], "aiA.mp4"); segs.push({ type: "video", path: path.join(dir, "aiA.mp4") }); }
    // 추억 슬라이드(사진)
    for (let i = 0; i < slidePhotos.length; i++) { await dl(slidePhotos[i], `s${i}.img`); segs.push({ type: "image", path: path.join(dir, `s${i}.img`), dur: 4 }); }
    // 추억 영상(개별 클립) — 원본 사운드 유지(mem)
    for (let i = 0; i < memVideos.length; i++) { await dl(memVideos[i], `m${i}.mp4`); segs.push({ type: "video", path: path.join(dir, `m${i}.mp4`), mem: true }); }
    // AI영상 B
    if (aiRes[1]) { await dl(aiRes[1], "aiB.mp4"); segs.push({ type: "video", path: path.join(dir, "aiB.mp4") }); }
    // 편지 — 아래→위 스크롤 영상(편집기 미리보기와 동일)
    if (job.letter) {
      const lv = path.join(dir, "letter.mp4");
      await letterScrollSegment(job.letter, FONT, lv);
      segs.push({ type: "video", path: lv });
    }
    if (job.met_date || job.part_date) {
      const bg = await makeSolid("0x161310", path.join(dir, "dbg.png"));
      const cap = [job.met_date ? `우리 처음 만난 날\n${fmtDate(job.met_date)}` : "", job.part_date ? `무지개다리 건넌 날\n${fmtDate(job.part_date)}` : ""].filter(Boolean).join("\n\n");
      segs.push({ type: "image", path: bg, dur: 6, caption: cap, letter: true });
    }
    if (!segs.length) throw new Error("합성할 세그먼트 없음(블록 결과물·소스 부재)");

    let partnerId = null, endDate = null;
    if (job.reservation_id) {
      const { data: r } = await db.from("reservations").select("partner_id, end_date").eq("id", job.reservation_id).maybeSingle();
      partnerId = r?.partner_id || null; endDate = r?.end_date || null;
    }
    // BGM — 파트너 템플릿의 bgm_id → bgm.storage_path(memoria-content) 있으면 다운로드 + 볼륨·페이드 설정.
    let bgmPath = null, bgmVol = 70, bgmFadeIn = 1, bgmFadeOut = 2;
    if (partnerId) {
      const { data: tpl } = await db.from("templates").select("bgm_id, bgm_volume, bgm_fade_in, bgm_fade_out").eq("partner_id", partnerId).maybeSingle();
      if (tpl) {
        bgmVol = tpl.bgm_volume ?? 70; bgmFadeIn = Number(tpl.bgm_fade_in ?? 1); bgmFadeOut = Number(tpl.bgm_fade_out ?? 2);
        if (tpl.bgm_id) {
          const { data: bgm } = await db.from("bgm").select("storage_path").eq("id", tpl.bgm_id).maybeSingle();
          if (bgm?.storage_path) {
            try { bgmPath = path.join(dir, "bgm.mp3"); await st.downloadTo(await st.signedUrl("memoria-content", bgm.storage_path, 3600), bgmPath); log.info(`  BGM 적용(vol ${bgmVol}) → ${bgm.storage_path}`); }
            catch (e) { bgmPath = null; log.warn("  BGM 다운로드 실패(무음 진행): " + e.message); }
          }
        }
      }
    }

    const out = path.join(dir, "final.mp4");
    await compose({ segments: segs, fontFile: FONT, bgmPath, bgmVol, bgmFadeIn, bgmFadeOut, outPath: out });
    const finalPath = `${partnerId || "unknown"}/${job.id}_final.mp4`;
    const { size } = await fs.stat(out);                 // RAM에 통째로 안 올림 — 크기는 stat으로
    await st.uploadFinalStream(finalPath, out, "video/mp4"); // 디스크→스트림 PUT(긴 영상 OOM 방지)
    const finalMB = +(size / (1024 * 1024)).toFixed(1);
    const exp = expiryFor(endDate);
    const videoUrl = await st.signedUrl(cfg.finalBucket, finalPath, exp.sec);
    log.info(`  합성 완료 job=${job.id} segs=${segs.length} ${finalMB}MB exp=${exp.at} → ${finalPath}`);
    return { videoUrl, finalPath, finalMB, expiresAt: exp.at };
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}
