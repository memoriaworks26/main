// ─────────────────────────────────────────────────────────────
// 보호자 제출(제작링크) 데이터 계층 — staff/파트너. memoria.submissions(RLS).
//   예약→submission 발급(토큰 자동) → 보호자 /u/<token>. 상태(draft→queued→rendering→done) 표시.
// ─────────────────────────────────────────────────────────────
import { db, getClient, UPLOAD_BUCKET } from "../supabase.js";

const need = () => { const d = db(); if (!d) throw new Error("백엔드 미연결"); return d; };
const COLS = "id,token,reservation_id,pet_name,partner_name,status,video_url,created_at,expires_at";
const mapSub = (r) => ({ id: r.id, token: r.token, reservationId: r.reservation_id, petName: r.pet_name, partnerName: r.partner_name, status: r.status, videoUrl: r.video_url, createdAt: r.created_at, expiresAt: r.expires_at });

export async function fetchSubmissions() {
  const d = need();
  const { data, error } = await d.from("submissions").select(COLS).order("created_at");
  if (error) throw new Error("제출 조회 실패: " + error.message);
  return (data || []).map(mapSub);
}

// 예약의 보호자 업로드 자산(독사진·슬라이드 사진·추억영상) + 편지 — 편집기 미리보기에 실제 미디어로 사용.
//   memoria-uploads 비공개 → staff RLS로 서명URL 일괄 발급(createSignedUrls). 1시간 유효(편집 세션용).
export async function fetchReservationMedia(reservationId) {
  const d = need();
  const { data: sub, error: se } = await d.from("submissions")
    .select("id, token, letter, met_date, part_date, status, video_url, regen_target").eq("reservation_id", reservationId).maybeSingle();
  if (se) throw new Error("제출 조회 실패: " + se.message);
  if (!sub) return { assets: [], submissionId: null, token: null, letter: null, metDate: null, partDate: null, status: null, videoUrl: null, regenTarget: null };
  const { data: rows, error: ae } = await d.from("submission_assets")
    .select("id,kind,role,name,storage_path,sort_order,selected,created_at").eq("submission_id", sub.id).order("created_at");
  if (ae) throw new Error("자산 조회 실패: " + ae.message);
  const list = rows || [];
  const paths = list.map((r) => r.storage_path).filter(Boolean);
  const urls = {};
  if (paths.length) {
    const sbc = getClient();
    const { data: signed } = await sbc.storage.from(UPLOAD_BUCKET).createSignedUrls(paths, 3600);
    (signed || []).forEach((s, i) => { if (s && s.signedUrl) urls[paths[i]] = s.signedUrl; });
  }
  const assets = list.map((r) => ({ id: r.id, kind: r.kind, role: r.role, name: r.name, sortOrder: r.sort_order, selected: r.selected !== false, createdAt: r.created_at, url: urls[r.storage_path] || null }));
  return { assets, submissionId: sub.id, token: sub.token, letter: sub.letter, metDate: sub.met_date, partDate: sub.part_date, status: sub.status, videoUrl: sub.video_url, regenTarget: sub.regen_target };
}

// 자산 버전 선택(활성) — 같은 슬롯(role+sort)에서 하나만 활성. compose·편집기가 활성본 사용.
export async function selectAsset(submissionId, assetId, role, sortOrder) {
  const d = need();
  await d.from("submission_assets").update({ selected: false }).eq("submission_id", submissionId).eq("role", role).eq("sort_order", sortOrder);
  const { error } = await d.from("submission_assets").update({ selected: true }).eq("id", assetId);
  if (error) throw new Error(error.message);
}

const _ext = (n = "") => { const i = n.lastIndexOf("."); return i > 0 ? n.slice(i + 1) : "bin"; };
const _uniq = () => globalThis.crypto?.randomUUID?.() || Date.now() + "-" + Math.random().toString(36).slice(2, 8);

// 소스 자산 파일 교체(타이틀·AI 독사진 등) — 새 파일 업로드 후 storage_path 갱신(staff write RLS).
export async function replaceAssetFile(assetId, token, file) {
  const sbc = getClient();
  const path = `${token}/replace/${_uniq()}.${_ext(file.name)}`;
  const { error: ue } = await sbc.storage.from(UPLOAD_BUCKET).upload(path, file, { contentType: file.type || undefined });
  if (ue) throw new Error("업로드 실패: " + ue.message);
  const { error } = await need().from("submission_assets").update({ storage_path: path, name: file.name }).eq("id", assetId);
  if (error) throw new Error(error.message);
}

// 추억 슬라이드 사진 추가.
export async function addSlidePhoto(submissionId, token, file) {
  const sbc = getClient();
  const path = `${token}/slide/${_uniq()}.${_ext(file.name)}`;
  const { error: ue } = await sbc.storage.from(UPLOAD_BUCKET).upload(path, file, { contentType: file.type || undefined });
  if (ue) throw new Error("업로드 실패: " + ue.message);
  const d = need();
  const { data: cur } = await d.from("submission_assets").select("sort_order").eq("submission_id", submissionId).eq("role", "slide_photo").order("sort_order", { ascending: false }).limit(1);
  const so = (cur?.[0]?.sort_order ?? -1) + 1;
  const { error } = await d.from("submission_assets").insert({ submission_id: submissionId, kind: "photo", role: "slide_photo", name: file.name, storage_path: path, sort_order: so });
  if (error) throw new Error(error.message);
}

// 단일 블록 AI 재생성 요청 — regen_target 지정 + status=queued(워커가 해당 블록만 재생성).
//   target: "title" | "ai:0" | "ai:1" (null이면 전체).
export async function regenBlock(reservationId, target) {
  const d = need();
  const { error } = await d.from("submissions").update({ regen_target: target, status: "queued" }).eq("reservation_id", reservationId);
  if (error) throw new Error(error.message);
}

// 최종 합성 요청 — 예약의 제출물을 compose_queued로(워커가 블록 결과물로 최종 영상 합성).
export async function requestCompose(reservationId) {
  const d = need();
  const { error } = await d.from("submissions").update({ status: "compose_queued" }).eq("reservation_id", reservationId);
  if (error) throw new Error(error.message);
}

// 예약에 대한 보호자 제작링크 발급(토큰 자동). 예약당 1건(unique).
export async function issueSubmission({ reservationId, petName, partnerName }) {
  const d = need();
  const { data, error } = await d.from("submissions")
    .insert({ reservation_id: reservationId, pet_name: petName, partner_name: partnerName, status: "draft" })
    .select(COLS).single();
  if (error) throw new Error(error.message);
  return mapSub(data);
}
