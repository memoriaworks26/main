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
import { generateTitleImage, generateMemoryVideo } from "./higgsfield.js";
import { compose, makeSolid } from "./ffmpeg.js";

const cfg = loadConfig();
const FONT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../assets/NotoSansKR-Regular.otf");

export async function renderJob(job, assets, _ctx) {
  if (cfg.stub) {
    log.info(`  [stub] render job=${job.id} assets=${assets.length} bgm=${job.bgm_id || "-"} letter=${job.letter ? "Y" : "N"}`);
    return { videoUrl: `stub://${job.id}`, finalPath: `stub/${job.id}.mp4` };
  }

  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "mw-render-"));
  try {
    const petName = job.pet_name || "";
    const photos = assets.filter((a) => a.kind === "photo" && a.storage_path);
    const titleAsset = photos.find((a) => a.role === "title") || photos[0];
    const others = photos.filter((a) => a !== titleAsset);
    const aiPhotos = others.slice(0, 2);                 // 독사진 2장 → AI 추억영상
    const slidePhotos = others.slice(2);                 // 나머지 → 슬라이드

    // 소스 서명URL(Higgsfield가 원격으로 가져감)
    const sign = (a) => st.signedUrl(cfg.uploadBucket, a.storage_path, 3600);
    const titleRefUrl = titleAsset ? await sign(titleAsset) : null;
    const aiUrls = await Promise.all(aiPhotos.map(sign));

    // 1) 타이틀 이미지 2장(Soul): ①원본+영정배경 ②①을 다른 기법
    const title1 = await generateTitleImage({ prompt: `${petName} 영정 사진, 우아하고 따뜻한 추모 배경, 부드러운 황금빛 보케, 고요하고 품위 있는 분위기`, imageRefUrl: titleRefUrl });
    const title2 = title1 ? await generateTitleImage({ prompt: `${petName} 추모 초상, 전통 한지 결과 절제된 먹색의 다른 화풍으로 재해석`, imageRefUrl: title1 }) : null;

    // 2) 추억영상(DoP) — 독사진 2장
    const memVideo = aiUrls.length ? await generateMemoryVideo({ prompt: "잔잔하고 따뜻한 추억의 흐름, 부드럽고 느린 카메라 무빙", imageUrls: aiUrls }) : null;

    // 3) 세그먼트 구성(다운로드)
    const segs = [];
    const dl = async (url, name) => st.downloadTo(url, path.join(dir, name));
    if (title1) { await dl(title1, "t1.png"); segs.push({ type: "image", path: path.join(dir, "t1.png"), dur: 6, caption: petName }); }
    if (title2) { await dl(title2, "t2.png"); segs.push({ type: "image", path: path.join(dir, "t2.png"), dur: 4 }); }
    for (let i = 0; i < slidePhotos.length; i++) {
      await dl(await sign(slidePhotos[i]), `s${i}.img`);
      segs.push({ type: "image", path: path.join(dir, `s${i}.img`), dur: 4 });
    }
    if (memVideo) { await dl(memVideo, "ai.mp4"); segs.push({ type: "video", path: path.join(dir, "ai.mp4"), dur: 8 }); }
    if (job.letter) {
      const bg = await makeSolid("0x1a1a1a", path.join(dir, "letterbg.png"));
      segs.push({ type: "image", path: bg, dur: 18, caption: job.letter, letter: true });
    }
    if (!segs.length) throw new Error("렌더할 세그먼트 없음(소스/AI 결과 부재)");

    // 4) 합성
    const out = path.join(dir, "final.mp4");
    await compose({ segments: segs, fontFile: FONT, outPath: out });

    // 5) 업로드(memoria-final) + 서명URL
    let partnerId = null;
    if (job.reservation_id) {
      const { data: r } = await db.from("reservations").select("partner_id").eq("id", job.reservation_id).maybeSingle();
      partnerId = r?.partner_id || null;
    }
    const finalPath = `${partnerId || "unknown"}/${job.id}_final.mp4`;
    const buf = await fs.readFile(out);
    await st.uploadFinal(finalPath, buf, "video/mp4");
    const finalMB = +(buf.length / (1024 * 1024)).toFixed(1);
    const videoUrl = await st.signedUrl(cfg.finalBucket, finalPath, 60 * 60 * 24 * 7); // 7일(추후 on-demand 서명 권장)
    log.info(`  렌더 완료 job=${job.id} segs=${segs.length} ${finalMB}MB → ${finalPath}`);
    return { videoUrl, finalPath, finalMB };
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}
