// ─────────────────────────────────────────────────────────────
// 보호자 제출(제작링크) 데이터 계층 — staff/파트너. memoria.submissions(RLS).
//   예약→submission 발급(토큰 자동) → 보호자 /u/<token>. 상태(draft→queued→rendering→done) 표시.
// ─────────────────────────────────────────────────────────────
import { db, getClient, UPLOAD_BUCKET } from "../supabase.js";

const need = () => { const d = db(); if (!d) throw new Error("백엔드 미연결"); return d; };
// 서명URL 캐시(경로별) — 같은 자산은 동일 URL 재사용 → 편집기 미리보기 video src 안정(재로딩·끊김 방지). 만료 5분 전 재발급.
const _urlCache = new Map(); // storage_path -> { url, exp }
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
    .select("id, token, letter, met_date, part_date, status, video_url, regen_target, edit_doc, bgm_id").eq("reservation_id", reservationId).maybeSingle();
  if (se) throw new Error("제출 조회 실패: " + se.message);
  if (!sub) return { assets: [], submissionId: null, token: null, letter: null, metDate: null, partDate: null, status: null, videoUrl: null, regenTarget: null, editDoc: null, bgmId: null };
  const { data: rows, error: ae } = await d.from("submission_assets")
    .select("id,kind,role,name,storage_path,sort_order,selected,created_at").eq("submission_id", sub.id).order("created_at");
  if (ae) throw new Error("자산 조회 실패: " + ae.message);
  const list = rows || [];
  const paths = list.map((r) => r.storage_path).filter(Boolean);
  const now = Date.now();
  const fresh = paths.filter((p) => { const c = _urlCache.get(p); return !(c && c.exp > now); }); // 캐시 만료된 것만 재발급
  if (fresh.length) {
    const sbc = getClient();
    const { data: signed } = await sbc.storage.from(UPLOAD_BUCKET).createSignedUrls(fresh, 3600);
    (signed || []).forEach((s, i) => { if (s && s.signedUrl) _urlCache.set(fresh[i], { url: s.signedUrl, exp: now + 55 * 60 * 1000 }); });
  }
  const urls = {};
  paths.forEach((p) => { const c = _urlCache.get(p); if (c) urls[p] = c.url; });
  const assets = list.map((r) => ({ id: r.id, kind: r.kind, role: r.role, name: r.name, sortOrder: r.sort_order, selected: r.selected !== false, createdAt: r.created_at, url: urls[r.storage_path] || null }));
  return { assets, submissionId: sub.id, token: sub.token, letter: sub.letter, metDate: sub.met_date, partDate: sub.part_date, status: sub.status, videoUrl: sub.video_url, regenTarget: sub.regen_target, editDoc: sub.edit_doc || null, bgmId: sub.bgm_id || null };
}

// 이 영상의 배경 음악 지정 — submissions.bgm_id(합성이 템플릿 기본보다 먼저 사용). null이면 템플릿 기본으로.
export async function setSubmissionBgm(submissionId, bgmId) {
  const d = need();
  const { error } = await d.from("submissions").update({ bgm_id: bgmId }).eq("id", submissionId);
  if (error) throw new Error(error.message);
}

// 편집기 편집본 저장 — submissions.edit_doc(jsonb). { v, doc, render }. 다음 최종 렌더부터 워커가 render 플랜으로 합성.
export async function saveEditDoc(submissionId, payload) {
  const d = need();
  const { error } = await d.from("submissions").update({ edit_doc: payload }).eq("id", submissionId);
  if (error) throw new Error(error.message);
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

// 자산 버전 추가(덮어쓰기 X) — 같은 슬롯(role+sort)에 새 버전 업로드 + 활성, 기존은 내역으로 보관.
export async function addAsset(submissionId, token, file, role, sortOrder, kind) {
  const sbc = getClient();
  const isVid = (kind || file.type || "").includes("video");
  const path = `${token}/added/${_uniq()}.${_ext(file.name)}`;
  const { error: ue } = await sbc.storage.from(UPLOAD_BUCKET).upload(path, file, { contentType: file.type || undefined });
  if (ue) throw new Error("업로드 실패: " + ue.message);
  const d = need();
  await d.from("submission_assets").update({ selected: false }).eq("submission_id", submissionId).eq("role", role).eq("sort_order", sortOrder);
  const { error } = await d.from("submission_assets").insert({ submission_id: submissionId, kind: isVid ? "video" : "photo", role, name: file.name, storage_path: path, sort_order: sortOrder, selected: true });
  if (error) throw new Error(error.message);
}

// 자산 버전 삭제 — 활성본을 지우면 같은 슬롯의 최신 남은 버전을 활성으로.
export async function deleteAsset(assetId) {
  const d = need();
  const { data: a } = await d.from("submission_assets").select("submission_id, role, sort_order, selected").eq("id", assetId).maybeSingle();
  const { error } = await d.from("submission_assets").delete().eq("id", assetId);
  if (error) throw new Error(error.message);
  if (a && a.selected) {
    const { data: rest } = await d.from("submission_assets").select("id").eq("submission_id", a.submission_id).eq("role", a.role).eq("sort_order", a.sort_order).order("created_at", { ascending: false }).limit(1);
    if (rest && rest[0]) await d.from("submission_assets").update({ selected: true }).eq("id", rest[0].id);
  }
}

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

// 추억 슬라이드 사진 순서 변경 — 표시 순서에서 인접 사진과 자리 교환(sort_order 재부여). 워커는 sort_order 순으로 합성.
export async function moveSlidePhoto(submissionId, assetId, dir) {
  const d = need();
  const { data: rows, error: qe } = await d.from("submission_assets")
    .select("id, sort_order").eq("submission_id", submissionId).eq("role", "slide_photo")
    .order("sort_order").order("created_at");
  if (qe) throw new Error(qe.message);
  const list = rows || [];
  const i = list.findIndex((r) => r.id === assetId);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  // 새 순서대로 sort_order를 0..n-1로 재부여 — 값이 바뀐 행만 갱신(삭제로 생긴 갭도 함께 정리).
  for (let k = 0; k < list.length; k++) {
    if (list[k].sort_order !== k) {
      const { error } = await d.from("submission_assets").update({ sort_order: k }).eq("id", list[k].id);
      if (error) throw new Error(error.message);
    }
  }
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
