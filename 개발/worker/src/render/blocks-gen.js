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
// 타이틀 2장: ① 독사진 → 영정 초상+배경, ② ①을 화풍·배경 변경(오버랩용). 활성 프롬프트(ai_prompts) 스타일을 덧붙임.
const titlePrompt1 = (name, style) => `${name} 반려동물 영정 초상, 또렷한 얼굴, 따뜻하고 품위 있는 추모 분위기${style ? ", " + style : ", 부드러운 황금빛 보케 배경"}, 고요하고 평온한 표정`;
const titlePrompt2 = (name, style) => `${name} 추모 초상을 다른 화풍·배경으로 재해석, 예술적 기법 변경${style ? ", " + style : ", 전통 한지 질감과 절제된 먹색"}, 은은하고 평온한 분위기`;
const aiPromptDefault = "잔잔하고 따뜻한 추억의 흐름, 부드럽고 느린 카메라 무빙, 평온하고 따뜻한 분위기";

// 타깃별 활성 프롬프트 body(ai_prompts). 없으면 null.
async function activePrompt(target) {
  const { data } = await db.from("ai_prompts").select("body").eq("target", target).eq("active", true).limit(1).maybeSingle();
  return data?.body || null;
}

export async function generateBlocks(job, assets) {
  if (cfg.stub) {
    log.info(`  [stub] generate-blocks job=${job.id} target=${job.regen_target || "all"}`);
    return { count: 0 };
  }
  const token = job.token;
  const name = job.pet_name || "";
  const photos = assets.filter((a) => a.kind === "photo" && a.storage_path);
  const titleA = photos.find((a) => a.role === "title") || photos[0];
  const aiPhotos = photos.filter((a) => a.role === "ai_video");
  const sign = (a) => st.signedUrl(cfg.uploadBucket, a.storage_path, 3600);
  const del = (role, sort) => { let q = db.from("submission_assets").delete().eq("submission_id", job.id).eq("role", role); if (sort != null) q = q.eq("sort_order", sort); return q; };
  const ins = (row) => db.from("submission_assets").insert(row);

  const titleStyle = await activePrompt("타이틀");
  const aiStyle = await activePrompt("AI영상");
  // 타이틀 2장(Seedream): ① 독사진→영정, ② ①→화풍·배경 변경(오버랩용). 활성 프롬프트 스타일 반영.
  async function genTitle() {
    if (!titleA) return 0;
    await del("title_result");
    const ref = await sign(titleA);
    const url1 = await generateTitleImage({ prompt: titlePrompt1(name, titleStyle), imageRefUrl: ref });
    const p1 = `${token}/results/title_0.png`;
    await st.uploadFromUrl(cfg.uploadBucket, p1, url1, "image/png");
    await ins({ submission_id: job.id, kind: "photo", role: "title_result", name: "title_0.png", storage_path: p1, sort_order: 0 });
    const url2 = await generateTitleImage({ prompt: titlePrompt2(name, titleStyle), imageRefUrl: url1 });
    const p2 = `${token}/results/title_1.png`;
    await st.uploadFromUrl(cfg.uploadBucket, p2, url2, "image/png");
    await ins({ submission_id: job.id, kind: "photo", role: "title_result", name: "title_1.png", storage_path: p2, sort_order: 1 });
    log.info(`  타이틀 2장 생성(Seedream)${titleStyle ? " [활성 프롬프트]" : ""}`);
    return 2;
  }
  // AI영상 i번(Kling) — 해당 독사진 1장 → 영상. 활성 프롬프트 반영.
  async function genAi(i) {
    if (!aiPhotos[i]) return 0;
    await del("ai_video_result", i);
    const ref = await sign(aiPhotos[i]);
    const vurl = await generateMemoryVideo({ prompt: aiStyle || aiPromptDefault, imageUrl: ref });
    const path = `${token}/results/ai_${i}.mp4`;
    await st.uploadFromUrl(cfg.uploadBucket, path, vurl, "video/mp4");
    await ins({ submission_id: job.id, kind: "video", role: "ai_video_result", name: `ai_${i}.mp4`, storage_path: path, sort_order: i });
    log.info(`  AI영상 ${String.fromCharCode(65 + i)} 생성(Kling)`);
    return 1;
  }

  const target = job.regen_target; // null=전체 / "title" / "ai:i"
  let count = 0;
  if (target === "title") count += await genTitle();
  else if (target && target.startsWith("ai:")) count += await genAi(Number(target.slice(3)));
  else {
    count += await genTitle();
    for (let i = 0; i < aiPhotos.length; i++) count += await genAi(i);
  }
  return { count };
}
