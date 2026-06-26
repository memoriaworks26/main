// ─────────────────────────────────────────────────────────────
// 워커 스토리지 — service_role(RLS 우회). 소스 서명URL·원격 다운로드·최종본 업로드.
// ─────────────────────────────────────────────────────────────
import { promises as fs, createReadStream, createWriteStream } from "node:fs";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import sharp from "sharp";
import { sb } from "./supabase.js";

// 비공개 객체 서명URL(Higgsfield가 가져갈 수 있게 / 결과 공유용).
export async function signedUrl(bucket, path, sec = 3600) {
  const { data, error } = await sb.storage.from(bucket).createSignedUrl(path, sec);
  if (error) throw new Error("서명URL 실패: " + error.message);
  return data.signedUrl;
}

// 힉스필드 입력용 안전 이미지 URL(B: 서버 정규화 백스톱).
//   jpg/png는 그대로 통과(힉스필드 호환 확인됨), 그 외(heic·webp·tiff·bmp…)만 sharp로 jpeg 변환 후 재업로드.
//   클라(imageToJpeg)를 거치지 않은 경로(어드민 프롬프트 참고이미지·편집기 교체·데스크톱 HEIC)까지 한 곳에서 보장.
//   변환 시 EXIF 회전 보정(.rotate()) + 장축 4096 상한. 변환본은 {path}.hf.jpg로 upsert(재렌더 시 재사용).
const SAFE_EXT = new Set(["jpg", "jpeg", "png"]);
export async function safeImageUrl(bucket, path, sec = 3600) {
  const ext = (path.split(".").pop() || "").toLowerCase();
  if (SAFE_EXT.has(ext)) return signedUrl(bucket, path, sec); // 이미 안전 → 다운로드/변환 없이 통과
  const src = await signedUrl(bucket, path, 600);
  const res = await fetch(src);
  if (!res.ok) throw new Error("정규화 원본 다운로드 실패(" + res.status + "): " + path);
  const jpg = await sharp(Buffer.from(await res.arrayBuffer()))
    .rotate() // EXIF 방향 자동 보정
    .resize({ width: 4096, height: 4096, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 90 })
    .toBuffer();
  const out = path.replace(/\.[^.]+$/, "") + ".hf.jpg";
  await uploadTo(bucket, out, jpg, "image/jpeg");
  return signedUrl(bucket, out, sec);
}

// 원격 URL(서명URL·Higgsfield 결과) → 로컬 파일. 응답을 디스크로 스트리밍(긴 원본도 RAM에 통째 안 올림 → OOM 방지).
export async function downloadTo(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("다운로드 실패(" + res.status + "): " + url.slice(0, 80));
  if (!res.body) { await fs.writeFile(dest, Buffer.from(await res.arrayBuffer())); return dest; } // 폴백
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
  return dest;
}

// 최종본 업로드(memoria-final) — 작은 결과물용(버퍼). 긴 영상은 uploadFinalStream 사용.
export async function uploadFinal(path, fileBuffer, contentType = "video/mp4") {
  const { error } = await sb.storage.from("memoria-final").upload(path, fileBuffer, { upsert: true, contentType });
  if (error) throw new Error("최종본 업로드 실패: " + error.message);
  return path;
}

// 스트리밍 업로드(임의 버킷) — 파일을 디스크→스트림으로 PUT(메모리에 통째로 안 적재).
//   긴/대용량 영상에서 fs.readFile로 인한 RAM 폭증(OOM)을 제거. Content-Length는 stat으로 고정 전송.
//   supabase-js .upload(Buffer)는 전체를 메모리에 올리므로, 여기선 Storage REST에 직접 스트림 PUT.
export async function uploadStream(bucket, path, filePath, contentType = "application/octet-stream") {
  const { size } = await fs.stat(filePath);
  const base = (process.env.SUPABASE_URL || "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!base || !key) throw new Error("스트리밍 업로드: SUPABASE_URL/SERVICE_KEY 누락");
  const url = `${base}/storage/v1/object/${bucket}/${encodeURI(path)}`;
  const body = Readable.toWeb(createReadStream(filePath));
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      apikey: key,
      "Content-Type": contentType,
      "Content-Length": String(size),
      "x-upsert": "true",
      "cache-control": "3600",
    },
    body,
    duplex: "half",
  });
  if (!res.ok) throw new Error(`스트리밍 업로드 실패(${bucket} ${res.status}): ` + (await res.text().catch(() => "")).slice(0, 200));
  return path;
}

// 최종본(memoria-final) 스트리밍 업로드.
export async function uploadFinalStream(path, filePath, contentType = "video/mp4") {
  return uploadStream("memoria-final", path, filePath, contentType);
}

// 임의 버킷 업로드(블록 생성 결과물 등).
export async function uploadTo(bucket, path, fileBuffer, contentType) {
  const { error } = await sb.storage.from(bucket).upload(path, fileBuffer, { upsert: true, contentType });
  if (error) throw new Error(`업로드 실패(${bucket}): ` + error.message);
  return path;
}

// 원격 URL(Higgsfield 결과) → 버킷 업로드(다운로드 후).
export async function uploadFromUrl(bucket, path, url, contentType) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("결과 다운로드 실패(" + res.status + ")");
  return uploadTo(bucket, path, Buffer.from(await res.arrayBuffer()), contentType);
}
