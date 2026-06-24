// ─────────────────────────────────────────────────────────────
// 블록 생성(2단계 中 1단계) — 보호자 독사진 → 타이틀(Seedream i2i) + AI영상(Kling i2v).
//   결과를 memoria-uploads/{token}/results/ 에 저장 + submission_assets(role=*_result) 적재.
//   전체 합성은 안 함(관리자 「최종 렌더」에서 compose). 편집기는 이 결과물을 블록별로 표시.
// ─────────────────────────────────────────────────────────────
import { db } from "../supabase.js";
import * as st from "../storage.js";
import { loadConfig } from "../config.js";
import { log } from "../log.js";
import { generateTitleImage, generateMemoryVideo } from "./higgsfield.js";

const cfg = loadConfig();
// 타이틀 2장: ① 독사진 → 영정 초상+배경, ② ①을 화풍·배경 변경(오버랩용).
const titlePrompt1 = (name) => `${name} 반려동물 영정 초상, 또렷한 얼굴, 따뜻하고 품위 있는 추모 분위기, 부드러운 황금빛 보케 배경, 고요하고 평온한 표정`;
const titlePrompt2 = (name) => `${name} 추모 초상을 다른 화풍으로 재해석, 전통 한지 질감과 절제된 먹색, 배경도 완전히 다르게, 예술적 기법 변경, 은은하고 평온한 분위기`;
const aiPrompt = "잔잔하고 따뜻한 추억의 흐름, 부드럽고 느린 카메라 무빙, 평온하고 따뜻한 분위기";

export async function generateBlocks(job, assets) {
  if (cfg.stub) {
    log.info(`  [stub] generate-blocks job=${job.id}`);
    return { count: 0 };
  }
  const token = job.token;
  const photos = assets.filter((a) => a.kind === "photo" && a.storage_path);
  const titleA = photos.find((a) => a.role === "title") || photos[0];
  const aiPhotos = photos.filter((a) => a.role === "ai_video");
  const sign = (a) => st.signedUrl(cfg.uploadBucket, a.storage_path, 3600);

  // 재생성 대비 기존 결과물 제거
  await db.from("submission_assets").delete().eq("submission_id", job.id)
    .in("role", ["title_result", "ai_video_result", "slide_video"]);

  const rows = [];
  // 타이틀 2장(Seedream i2i): ① 독사진→영정, ② ①→화풍·배경 변경(오버랩용)
  if (titleA) {
    const name = job.pet_name || "";
    const ref = await sign(titleA);
    const url1 = await generateTitleImage({ prompt: titlePrompt1(name), imageRefUrl: ref });
    const p1 = `${token}/results/title_0.png`;
    await st.uploadFromUrl(cfg.uploadBucket, p1, url1, "image/png");
    rows.push({ submission_id: job.id, kind: "photo", role: "title_result", name: "title_0.png", storage_path: p1, sort_order: 0 });
    log.info(`  타이틀① 생성(Seedream) → ${p1}`);
    const url2 = await generateTitleImage({ prompt: titlePrompt2(name), imageRefUrl: url1 }); // ①을 레퍼런스로 화풍 변경
    const p2 = `${token}/results/title_1.png`;
    await st.uploadFromUrl(cfg.uploadBucket, p2, url2, "image/png");
    rows.push({ submission_id: job.id, kind: "photo", role: "title_result", name: "title_1.png", storage_path: p2, sort_order: 1 });
    log.info(`  타이틀② 생성(Seedream, 화풍변경) → ${p2}`);
  }
  // AI영상(Kling) — 독사진 1장당 1영상(A·B)
  for (let i = 0; i < aiPhotos.length; i++) {
    const ref = await sign(aiPhotos[i]);
    const vurl = await generateMemoryVideo({ prompt: aiPrompt, imageUrl: ref });
    const path = `${token}/results/ai_${i}.mp4`;
    await st.uploadFromUrl(cfg.uploadBucket, path, vurl, "video/mp4");
    rows.push({ submission_id: job.id, kind: "video", role: "ai_video_result", name: `ai_${i}.mp4`, storage_path: path, sort_order: i });
    log.info(`  AI영상 ${String.fromCharCode(65 + i)} 생성(Kling) → ${path}`);
  }
  if (rows.length) {
    const { error } = await db.from("submission_assets").insert(rows);
    if (error) throw new Error("결과물 저장 실패: " + error.message);
  }
  return { count: rows.length };
}
