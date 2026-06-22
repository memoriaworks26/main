// ─────────────────────────────────────────────────────────────
// 워커 스토리지 — service_role(RLS 우회). 소스 서명URL·원격 다운로드·최종본 업로드.
// ─────────────────────────────────────────────────────────────
import { promises as fs } from "node:fs";
import { sb } from "./supabase.js";

// 비공개 객체 서명URL(Higgsfield가 가져갈 수 있게 / 결과 공유용).
export async function signedUrl(bucket, path, sec = 3600) {
  const { data, error } = await sb.storage.from(bucket).createSignedUrl(path, sec);
  if (error) throw new Error("서명URL 실패: " + error.message);
  return data.signedUrl;
}

// 원격 URL(서명URL·Higgsfield 결과) → 로컬 파일.
export async function downloadTo(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("다운로드 실패(" + res.status + "): " + url.slice(0, 80));
  await fs.writeFile(dest, Buffer.from(await res.arrayBuffer()));
  return dest;
}

// 최종본 업로드(memoria-final).
export async function uploadFinal(path, fileBuffer, contentType = "video/mp4") {
  const { error } = await sb.storage.from("memoria-final").upload(path, fileBuffer, { upsert: true, contentType });
  if (error) throw new Error("최종본 업로드 실패: " + error.message);
  return path;
}
