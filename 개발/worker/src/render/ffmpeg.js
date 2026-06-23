// ─────────────────────────────────────────────────────────────
// FFmpeg 합성 — 템플릿 블록(이미지/영상) → 16:9 세그먼트 정규화 → concat → BGM.
//   ffmpeg-static 휴대용 바이너리 사용(로컬·Railway 동일). 캡션 drawtext(한글은 fontfile 필요).
//   세그먼트 단위로 인코딩 후 concat → 혼합 입력(이미지+영상)도 안정적으로 이어붙임.
// ─────────────────────────────────────────────────────────────
import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import ffmpegStatic from "ffmpeg-static";
import ffprobeStatic from "ffprobe-static";

// 운영(Railway)은 apt ffmpeg(드로텍스트 포함)를 FFMPEG_PATH로 주입 — ffmpeg-static Linux엔 drawtext 없음.
// 로컬은 ffmpeg-static 폴백.
const ffmpegPath = process.env.FFMPEG_PATH || ffmpegStatic;
const ffprobePath = process.env.FFPROBE_PATH || ffprobeStatic.path;

const W = 1920, H = 1080, FPS = 30;
const FIT = `scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1`;

function run(bin, args) {
  return new Promise((res, rej) => {
    const p = spawn(bin, args, { stdio: ["ignore", "ignore", "pipe"] });
    let err = ""; p.stderr.on("data", (d) => (err += d));
    p.on("error", rej);
    p.on("close", (c) => (c === 0 ? res() : rej(new Error(`ffmpeg(${c}): ` + err.slice(-600)))));
  });
}
const ff = (args) => run(ffmpegPath, args);

// drawtext 텍스트 escape — 줄바꿈(\n)은 보존(편지 멀티라인), %·:·\·' 처리.
const escText = (t) => String(t).replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/:/g, "\\:").replace(/'/g, "’");

// 긴 텍스트를 maxChars 폭으로 줄바꿈(기존 \n 단락 유지, 띄어쓰기 우선·긴 한글런 하드랩).
function wrapText(text, maxChars) {
  const out = [];
  for (const para of String(text).split("\n")) {
    if (!para) { out.push(""); continue; }
    let line = "";
    for (const word of para.split(" ")) {
      if ((line ? line.length + 1 : 0) + word.length <= maxChars) { line = line ? line + " " + word : word; continue; }
      if (line) { out.push(line); line = ""; }
      let w = word;
      while (w.length > maxChars) { out.push(w.slice(0, maxChars)); w = w.slice(maxChars); }
      line = w;
    }
    if (line) out.push(line);
  }
  return out.join("\n");
}

// 짧은 캡션(타이틀 펫 이름 등) — 하단 중앙 1줄.
function caption(text, fontFile) {
  if (!text) return "";
  const font = fontFile ? `fontfile='${fontFile}':` : "";
  return `,drawtext=${font}text='${escText(text)}':fontcolor=white:fontsize=64:x=(w-text_w)/2:y=h-180:box=1:boxcolor=black@0.45:boxborderw=24`;
}
// 편지 장면 — 자동 줄바꿈 + 화면 중앙·행간, 작은 폰트.
function letterCaption(text, fontFile) {
  if (!text) return "";
  const font = fontFile ? `fontfile='${fontFile}':` : "";
  const wrapped = wrapText(text, 24);
  return `,drawtext=${font}text='${escText(wrapped)}':fontcolor=white:fontsize=44:line_spacing=18:x=(w-text_w)/2:y=(h-text_h)/2:box=1:boxcolor=black@0.35:boxborderw=48`;
}
const capFor = (cap, isLetter, fontFile) => (isLetter ? letterCaption(cap, fontFile) : caption(cap, fontFile));

async function imageSegment(src, dur, out, cap, fontFile, isLetter) {
  await ff(["-y", "-loop", "1", "-t", String(dur), "-i", src, "-vf", FIT + capFor(cap, isLetter, fontFile), "-r", String(FPS), "-c:v", "libx264", "-pix_fmt", "yuv420p", "-an", out]);
}
async function videoSegment(src, dur, out, cap, fontFile, isLetter) {
  const args = ["-y", "-i", src];
  if (dur) args.push("-t", String(dur));
  args.push("-vf", FIT + capFor(cap, isLetter, fontFile), "-r", String(FPS), "-c:v", "libx264", "-pix_fmt", "yuv420p", "-an", out);
  await ff(args);
}

// segments: [{ type:'image'|'video', path, dur, caption? }], bgmPath?, fontFile?(한글캡션), outPath
export async function compose({ segments, bgmPath, fontFile, outPath }) {
  if (!segments?.length) throw new Error("compose: 세그먼트 없음");
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "mw-render-"));
  try {
    const parts = [];
    for (let i = 0; i < segments.length; i++) {
      const s = segments[i]; const seg = path.join(dir, `seg${i}.mp4`);
      if (s.type === "video") await videoSegment(s.path, s.dur, seg, s.caption, fontFile, s.letter);
      else await imageSegment(s.path, s.dur || 5, seg, s.caption, fontFile, s.letter);
      parts.push(seg);
    }
    const list = path.join(dir, "list.txt");
    await fs.writeFile(list, parts.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join("\n"));
    const concat = path.join(dir, "concat.mp4");
    await ff(["-y", "-f", "concat", "-safe", "0", "-i", list, "-c", "copy", concat]);
    if (bgmPath) {
      await ff(["-y", "-i", concat, "-i", bgmPath, "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", outPath]);
    } else {
      await fs.copyFile(concat, outPath);
    }
    return outPath;
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

// 단색 배경 이미지(편지 장면 등) 1920x1080.
export async function makeSolid(color, out) {
  await ff(["-y", "-f", "lavfi", "-i", `color=c=${color}:s=${W}x${H}`, "-frames:v", "1", out]);
  return out;
}

export function durationOf(file) {
  return new Promise((res, rej) => {
    const p = spawn(ffprobePath, ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", file]);
    let o = ""; p.stdout.on("data", (d) => (o += d));
    p.on("error", rej);
    p.on("close", (c) => (c === 0 ? res(parseFloat(o)) : rej(new Error("ffprobe " + c))));
  });
}
