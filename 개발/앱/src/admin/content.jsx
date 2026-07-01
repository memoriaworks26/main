// [추모영상 제작] 콘텐츠 허브 — 공용 영상/이미지/음악 소스 업로드·관리.
import React, { useState, useEffect, useRef } from "react";
import {
  Check, Clapperboard, Image, Loader2, Music, Pause, Pencil, Play, Plus, RotateCw, Search, Trash2, X,
} from "lucide-react";
import { NAVY, SURFACE, LINE, LINE2, GOLD, GOLD_D, GOLD_SOFT, INK, MUTE, FAINT, RADIUS } from "../theme.js";
import { Btn, PageHeader, Modal, Table, useTableSort } from "../ui.jsx";
import { useStore, actions } from "../store.js";
import { confirm } from "../confirm.jsx";
import { photoThumb, genFrame, grabImageSize, grabVideoMeta, grabAudioMeta } from "../lib/media.js";
import { matchQuery } from "../lib/util.js";
import * as storage from "../lib/storage.js";
import { SearchSelect } from "./shared.jsx";

// id → 안정적인 인덱스(목업 썸네일 장면 선택용)
const hashId = (id) => { let h = 0; const s = String(id); for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; };
// 종류별 미리보기 이미지 (음악은 이미지 없음 → null)
const thumbFor = (c) => c.kind === "audio" ? null : (c.kind === "photo" ? photoThumb(hashId(c.id)) : genFrame("slide", hashId(c.id)));

// 표시용 이미지 src — 실파일(서명URL) 우선, 없거나 실패하면 절차적 목업으로 폴백.
//   클립=업로드 시 캡처한 썸네일(thumbPath), 사진=원본(storagePath), 음악=이미지 없음(null).
function useThumbSrc(item) {
  const path = item.kind === "clip" ? item.thumbPath : item.kind === "photo" ? item.storagePath : null;
  const [real, setReal] = useState(null);
  useEffect(() => {
    if (!path) { setReal(null); return; }
    let alive = true;
    storage.signedUrl(storage.BUCKETS.content, path).then((u) => { if (alive) setReal(u); }).catch(() => { if (alive) setReal(null); });
    return () => { alive = false; };
  }, [path]);
  if (item.kind === "audio") return null;
  return real || thumbFor(item);
}

// 표 미리보기 셀 — 실 썸네일 로드(서명URL) + 음악 폴백 아이콘 + 클립 재생 뱃지.
function ThumbCell({ c }) {
  const src = useThumbSrc(c);
  return (
    <span className="relative flex items-center justify-center overflow-hidden" style={{ width: 52, height: 32, borderRadius: 3, background: c.kind === "audio" ? "linear-gradient(135deg,#202b3a,#3f5e87)" : "#1c232c", border: "1px solid " + LINE }}>
      {src ? <img src={src} alt="" className="h-full w-auto max-w-none" /> : <Music className="h-4 w-4" style={{ color: "#fff", opacity: 0.85 }} />}
      {c.kind === "clip" && <span className="absolute flex h-4 w-4 items-center justify-center rounded-full" style={{ background: "rgba(0,0,0,.45)" }}><Play className="h-2 w-2 text-white" style={{ marginLeft: 1 }} fill="#fff" /></span>}
    </span>
  );
}

// 콘텐츠 표 — 종류/형식/길이 파생 (meta: "0:10 · 1920×1080" / "3:45 · 128kbps" / "투명 PNG")
const KIND_RANK = { clip: 0, photo: 1, audio: 2 };
const KIND_LABEL = { clip: "영상", photo: "이미지", audio: "음악" };
const KIND_ICON = { clip: Clapperboard, photo: Image, audio: Music };
const KIND_ICON_C = { clip: NAVY, photo: NAVY, audio: "#3f5e87" };
const durMatch = (c) => /(\d+):(\d{2})/.exec(c.meta || "");
const durLabel = (c) => { const m = durMatch(c); return m ? m[1] + ":" + m[2] : "—"; };
const durSec = (c) => { const m = durMatch(c); return m ? (+m[1] * 60 + +m[2]) : -1; };
// 길이 부분을 뺀 나머지를 '형식'으로 (해상도·비트레이트·"투명 PNG" 등)
const fmtLabel = (c) => ((c.meta || "").replace(/\d+:\d{2}\s*·?\s*/, "").trim() || KIND_LABEL[c.kind] || "—");
// 귀속(대상) 라벨 — 공용 또는 파트너사명. 음악·클립·사진 모두 동일(대상 편집 가능).
const ownerLabel = (c) => (c.shared ? "공용" : (c.partner || "—"));
const contentSortValue = (c, k) =>
  k === "kind" ? (KIND_RANK[c.kind] ?? 9) :
  k === "len" ? durSec(c) :
  k === "fmt" ? fmtLabel(c) :
  k === "owner" ? ownerLabel(c) :
  k === "name" ? c.name : c[k];

// ── 자동 분류·메타 추출 ── 파일 하나에서 종류·이름·길이·해상도·용량을 모두 자동 산출.
//   수동 입력(파일명·정보·용량·종류·귀속) 전부 제거. 귀속은 현재 보고 있는 파트너 베이스(공통이면 공용).
const kindOf = (file) => {
  const t = file.type || "";
  if (t.startsWith("image/")) return "photo";
  if (t.startsWith("audio/")) return "audio";
  if (t.startsWith("video/")) return "clip";
  const ext = (file.name.split(".").pop() || "").toLowerCase(); // MIME 비어있을 때 확장자 폴백
  if (["png", "jpg", "jpeg", "gif", "webp", "heic", "heif", "svg", "bmp"].includes(ext)) return "photo";
  if (["mp3", "wav", "m4a", "aac", "ogg", "flac", "opus"].includes(ext)) return "audio";
  return "clip";
};
const mmss = (s) => { const t = Math.max(0, Math.round(s || 0)); return Math.floor(t / 60) + ":" + String(t % 60).padStart(2, "0"); };
const sizeLabel = (bytes) => `${(bytes / 1048576).toFixed(1)}MB`;

// 파일 → store asset(메타 자동). i는 같은 배치 내 id 충돌 방지용. 메타 추출 실패해도 업로드는 진행.
async function buildAsset(file, target, i, partnerName) {
  const kind = kindOf(file);
  let meta = "";
  if (kind === "photo") {
    const s = await grabImageSize(file);
    const ext = (file.name.split(".").pop() || "IMG").toUpperCase();
    meta = s ? `${s.w}×${s.h} · ${ext}` : ext;
  } else if (kind === "clip") {
    const m = await grabVideoMeta(file);
    meta = m.w ? `${mmss(m.duration)} · ${m.w}×${m.h}` : mmss(m.duration);
  } else {
    const m = await grabAudioMeta(file);
    const kbps = m.duration ? Math.round((file.size * 8) / m.duration / 1000) : 0; // 용량·길이로 평균 비트레이트 추정
    meta = kbps ? `${mmss(m.duration)} · ${kbps}kbps` : mmss(m.duration);
  }
  const asset = { id: `ct-${Date.now()}-${i}`, kind, name: file.name, meta, size: sizeLabel(file.size), file };
  // 음악은 무조건 공용 BGM 라이브러리. 클립·사진은 현재 파트너 베이스(공통→공용). 스코핑은 partnerId 기준.
  if (kind !== "audio") { if (target === "공통") asset.shared = true; else { asset.partnerId = target; asset.partner = partnerName; } }
  return asset;
}

// 업로드 진행 상태 라벨(인라인 행에서 사용).
const UP_STATUS = { prep: "처리 중", up: "업로드 중", err: "업로드 실패" };

// 자산 미리보기 모달 — 영상/이미지는 프레임, 음악은 WebAudio 합성음 재생(목업).
function ContentPreview({ item, onClose }) {
  const [playing, setPlaying] = useState(false);
  const ctxRef = useRef(null);
  const oscRef = useRef([]);
  const isAudio = item.kind === "audio";
  const isClip = item.kind === "clip";
  const src = useThumbSrc(item);
  // 음악 실파일 재생용 — 업로드본(서명URL) 우선, 없으면 공용 번들 mp3(item.src). 둘 다 없으면 합성음(목업).
  const [audioUrl, setAudioUrl] = useState(null);
  useEffect(() => {
    if (!isAudio) { setAudioUrl(null); return; }
    if (item.storagePath) {
      let alive = true;
      storage.signedUrl(storage.BUCKETS.content, item.storagePath).then((u) => { if (alive) setAudioUrl(u); }).catch(() => { if (alive) setAudioUrl(null); });
      return () => { alive = false; };
    }
    setAudioUrl(item.src || null); // 공용 번들 BGM(/bgm/*.mp3) 미리듣기
  }, [isAudio, item.storagePath, item.src]);
  // 영상 실파일 재생용 서명URL — 있으면 정지 썸네일 대신 <video controls>로 실제 재생.
  const [videoUrl, setVideoUrl] = useState(null);
  useEffect(() => {
    if (!isClip || !item.storagePath) { setVideoUrl(null); return; }
    let alive = true;
    storage.signedUrl(storage.BUCKETS.content, item.storagePath).then((u) => { if (alive) setVideoUrl(u); }).catch(() => { if (alive) setVideoUrl(null); });
    return () => { alive = false; };
  }, [isClip, item.storagePath]);

  const stop = () => {
    oscRef.current.forEach((o) => { try { o.stop(); } catch { /* already stopped */ } });
    oscRef.current = [];
    setPlaying(false);
  };
  // 실제 mp3가 없는 목업 — 잔잔한 화음을 합성해 '재생' 느낌만. (본운영: <audio src>로 교체)
  const play = () => {
    stop();
    try {
      const ctx = ctxRef.current || (ctxRef.current = new (window.AudioContext || window.webkitAudioContext)());
      const now = ctx.currentTime;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.12, now + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.4);
      gain.connect(ctx.destination);
      const seed = hashId(item.id) % 6;
      [261.63, 329.63, 392.0].forEach((f, k) => {
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.value = f * (1 + seed * 0.04);
        osc.connect(gain);
        osc.start(now + k * 0.12);
        osc.stop(now + 2.4);
        oscRef.current.push(osc);
      });
      setPlaying(true);
      setTimeout(stop, 2400);
    } catch { /* WebAudio 미지원 — 무음 폴백 */ }
  };
  useEffect(() => stop, []); // 언마운트 시 정지

  return (
    <Modal open onClose={onClose} width={520}>
      <div className="flex items-center justify-between px-5" style={{ height: 50, borderBottom: "1px solid " + LINE }}>
        <span className="flex items-center gap-2 text-[14px] font-semibold" style={{ color: INK }}>
          {React.createElement(KIND_ICON[item.kind] || Clapperboard, { className: "h-4 w-4", style: { color: KIND_ICON_C[item.kind] } })}
          {item.name}
          {item.shared && <span className="px-1.5 py-[1px] text-[10px] font-semibold" style={{ background: "#e9eef5", color: "#3f5e87", borderRadius: 3 }}>공용</span>}
        </span>
        <button onClick={onClose} className="transition hover:opacity-70" style={{ color: MUTE }}><X className="h-4 w-4" /></button>
      </div>
      <div className="px-5 py-4">
        <div className="relative flex items-center justify-center overflow-hidden" style={{ aspectRatio: "16/9", background: isAudio ? "linear-gradient(135deg,#202b3a,#3f5e87)" : "#1c232c", borderRadius: RADIUS }}>
          {isAudio ? (
            <div className="flex w-full flex-col items-center gap-3 px-6">
              <div className="flex items-end gap-1" style={{ height: 36 }}>
                {[14, 26, 18, 32, 22, 30, 16].map((h, i) => (
                  <span key={i} style={{ width: 4, height: h, background: "rgba(255,255,255,.85)", borderRadius: 2, transformOrigin: "bottom", animation: playing ? `mw-eq .9s ${i * 0.08}s ease-in-out infinite alternate` : "none", opacity: playing ? 1 : 0.5 }} />
                ))}
              </div>
              {audioUrl ? (
                <audio src={audioUrl} controls className="w-full" style={{ height: 36 }}
                  onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} />
              ) : (
                <button onClick={playing ? stop : play} className="flex h-11 w-11 items-center justify-center rounded-full outline-none transition hover:scale-105" style={{ background: "#fff", color: NAVY }}>
                  {playing ? <Pause className="h-5 w-5" fill={NAVY} /> : <Play className="h-5 w-5" style={{ marginLeft: 2 }} fill={NAVY} />}
                </button>
              )}
            </div>
          ) : isClip && videoUrl ? (
            <video src={videoUrl} poster={src || undefined} controls playsInline preload="metadata"
              className="absolute inset-y-0 left-1/2 h-full w-auto max-w-none -translate-x-1/2" style={{ background: "#000" }} />
          ) : (
            <>
              <img src={src} alt={item.name} className="absolute inset-y-0 left-1/2 h-full w-auto max-w-none -translate-x-1/2" />
              {isClip && (
                <span className="relative flex h-12 w-12 items-center justify-center rounded-full" style={{ background: "rgba(0,0,0,.45)" }}>
                  <Play className="h-5 w-5 text-white" style={{ marginLeft: 2 }} fill="#fff" />
                </span>
              )}
            </>
          )}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-[12.5px]">
          <div><div className="text-[11px]" style={{ color: FAINT }}>종류</div><div style={{ color: INK }}>{KIND_LABEL[item.kind]}</div></div>
          <div><div className="text-[11px]" style={{ color: FAINT }}>형식</div><div style={{ color: INK }}>{fmtLabel(item)}</div></div>
          <div><div className="text-[11px]" style={{ color: FAINT }}>길이</div><div className="tabular-nums" style={{ color: INK }}>{durLabel(item)}</div></div>
        </div>
        {item.size && <div className="mt-2 text-[11.5px]" style={{ color: FAINT }}>용량 {item.size}</div>}
        {(isAudio ? !audioUrl : isClip ? !videoUrl : !item.storagePath) && (
          <p className="mt-3 text-[11px]" style={{ color: FAINT }}>※ 미리보기는 예시입니다 — 실제 업로드 파일이 있으면 그대로 표시·재생됩니다.</p>
        )}
      </div>
      {/* 미리보기에서 바로 삭제 (음악=BGM 라이브러리, 그 외=콘텐츠 자산) */}
      <div className="flex items-center justify-between px-5" style={{ height: 56, borderTop: "1px solid " + LINE }}>
        <button
          onClick={async () => {
            if (await confirm({ title: isAudio ? "음악 삭제" : "자산 삭제", message: `"${item.name}"${isAudio ? " 음악을" : " 자산을"} 삭제합니다.`, danger: true })) {
              isAudio ? actions.removeBgm(item.id) : actions.removeContent(item.id);
              onClose();
            }
          }}
          className="inline-flex items-center gap-1.5 px-3 text-[12.5px] font-semibold outline-none transition hover:opacity-80"
          style={{ height: 34, borderRadius: RADIUS, color: "#c0392b", border: "1px solid " + LINE2, background: "#fff" }}>
          <Trash2 className="h-3.5 w-3.5" /> 삭제
        </button>
        <Btn size="sm" variant="neutral" onClick={onClose}>닫기</Btn>
      </div>
    </Modal>
  );
}

export function ContentHub() {
  const tabs = ["전체", "영상", "이미지", "음악"];
  const { content, bgm, partners: allPartners } = useStore();
  const [partner, setPartner] = useState("공통"); // 신규 업로드/조회 기본은 공통(공용 자산)
  const [t, setT] = useState("전체");
  const [q, setQ] = useState("");
  // 백그라운드 업로드 — 파일을 고르면 즉시 표 상단에 행으로 띄우고, 자동으로 메타추출→업로드(진행률%)를 처리.
  //   entry: { upId, name, kind, progress(0~1), status: prep|up|err, file, target, targetLabel }
  const [uploads, setUploads] = useState([]);
  const [preview, setPreview] = useState(null); // 미리보기 중인 자산
  const [editing, setEditing] = useState(null); // 인라인 이름 변경 { id, value }
  const fileRef = useRef(null);
  const queueRef = useRef([]);   // 대기 중 업로드 entry
  const activeRef = useRef(0);   // 동시 업로드 수
  const partners = allPartners.filter((p) => p.active);
  const patchUp = (upId, patch) => setUploads((u) => u.map((e) => (e.upId === upId ? { ...e, ...patch } : e)));
  // 한 파일: 메타추출(처리 중) → 업로드(진행률) → 완료 시 행 제거(실데이터가 목록에 prepend). 실패는 행에 '다시 시도'.
  const runUpload = async (entry) => {
    patchUp(entry.upId, { status: "prep", progress: 0 });
    try {
      const asset = await buildAsset(entry.file, entry.target, entry.upId, entry.targetLabel);
      patchUp(entry.upId, { status: "up" });
      await actions.addContent(asset, { onProgress: (p) => patchUp(entry.upId, { progress: p }) });
      setUploads((u) => u.filter((e) => e.upId !== entry.upId));
    } catch {
      patchUp(entry.upId, { status: "err" });
    }
  };
  // 동시 업로드 상한(3) — 너무 많이 동시에 올리면 대역폭 분산으로 각 파일이 더 느려짐.
  const pump = () => {
    while (activeRef.current < 3 && queueRef.current.length) {
      const entry = queueRef.current.shift();
      activeRef.current += 1;
      runUpload(entry).finally(() => { activeRef.current -= 1; pump(); });
    }
  };
  const enqueue = (entries) => { queueRef.current.push(...entries); pump(); };
  const onFiles = (list) => {
    const files = Array.from(list || []);
    if (!files.length) return;
    // 업로드는 항상 공용으로 저장(위 대상 필터와 무관) — 대상(파트너)은 올린 뒤 표에서 개별 지정.
    const entries = files.map((file, k) => ({
      upId: `up-${Date.now()}-${k}-${Math.random().toString(36).slice(2, 6)}`,
      name: file.name, kind: kindOf(file), progress: 0, status: "prep", file, target: "공통", targetLabel: "공용(모든 파트너)",
    }));
    setUploads((u) => [...entries, ...u]); // 즉시 행으로 표시
    enqueue(entries);                       // 백그라운드 처리
  };
  // 인라인 편집(이름 + 대상) — 음악·클립·사진 모두 이름 + 파트너/공통 지정.
  //   target: "공통"(공용) | 파트너 id. 빈값/무변경 항목은 저장 생략.
  const startEdit = (c) => setEditing({ id: c.id, value: c.name, partner: c.shared ? "공통" : c.partnerId });
  const saveEdit = (c) => {
    const nm = (editing?.value || "").trim();
    const cur = c.shared ? "공통" : c.partnerId;
    const target = editing?.partner;
    if (c.kind === "audio") {
      if (nm && nm !== c.name) actions.renameBgm(c.id, nm);
      if (target && target !== cur) actions.setBgmPartner(c.id, target);
    } else {
      if (nm && nm !== c.name) actions.renameContent(c.id, nm);
      if (target && target !== cur) actions.setContentPartner(c.id, target);
    }
    setEditing(null);
  };
  // 음악(BGM)도 클립·사진처럼 대상(공용/파트너) 지정 — partnerId 있으면 그 파트너 전용, 없으면 공용.
  const items = content.concat(bgm.map((b) => ({ id: b.id, kind: "audio", name: b.name, meta: b.meta, size: b.size || "", shared: b.shared ?? !b.partnerId, partnerId: b.partnerId, partner: b.partner, storagePath: b.storagePath, src: b.src })));
  const filtered = items
    .filter((c) => partner === "공통" ? c.shared : (c.partnerId === partner || c.shared))
    .filter((c) => t === "전체" || (t === "영상" && c.kind === "clip") || (t === "이미지" && c.kind === "photo") || (t === "음악" && c.kind === "audio"))
    .filter((c) => matchQuery(q, c.name, c.meta));
  const { rows: sorted, sort, onSortChange } = useTableSort(filtered, { value: contentSortValue });
  // 진행 중 업로드 행을 표 상단에 고정 — 현재 탭/파트너와 무관하게 항상 보이게(완료되면 자동 제거).
  const upRows = uploads.map((u) => ({ ...u, id: u.upId, _uploading: true }));
  const rows = upRows.concat(sorted.map((c, i) => ({ ...c, idx: i + 1 })));
  const cols = [
    { key: "idx", label: "순번", align: "right" },
    { key: "thumb", label: "미리보기" },
    { key: "kind", label: "종류", sortable: true },
    { key: "name", label: "이름", sortable: true },
    { key: "owner", label: "대상", sortable: true },
    { key: "fmt", label: "형식", sortable: true },
    { key: "len", label: "길이", align: "right", sortable: true },
    { key: "act", label: "", align: "right" },
  ];
  return (
    <div style={{ maxWidth: 880 }}>
      <PageHeader title="콘텐츠 허브" sub="파트너사별 선업로드 자산(클립·사진) + 공용 음악 라이브러리" right={
        <div className="flex items-center gap-2">
          <div className="flex items-center px-3" style={{ height: 36, width: 232, background: SURFACE, border: "1px solid " + LINE, borderRadius: RADIUS }}>
            <Search className="h-4 w-4" style={{ color: FAINT }} strokeWidth={1.9} />
            <input value={q} onChange={(e) => setQ(e.target.value)} className="ml-2 w-full bg-transparent text-[13px] outline-none" placeholder="자산명·정보 검색" style={{ color: INK }} />
          </div>
          {/* 업로드 버튼 → 다중 파일 선택. 종류·메타·용량은 전부 자동. */}
          <input ref={fileRef} type="file" multiple accept="image/*,video/*,audio/*" className="hidden"
            onChange={(e) => { onFiles(e.target.files); e.target.value = ""; }} />
          <Btn size="sm" onClick={() => fileRef.current?.click()}><Plus className="h-4 w-4" /> 자산 업로드</Btn>
        </div>
      } />
      {/* 파트너사 베이스(+공통 공용 자산) — 표 보기 필터. 신규 업로드는 항상 공용으로 저장. */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-[12px] font-semibold" style={{ color: MUTE }}>대상</span>
        <SearchSelect value={partner} onChange={setPartner} placeholder="파트너사"
          options={[{ value: "공통", label: "공통 (공용 자산)" }, ...partners.map((p) => ({ value: p.id, label: p.name }))]} />
        <span className="text-[12px]" style={{ color: FAINT }}>{sorted.length}개 · 신규 업로드는 공용으로 저장 · 대상은 올린 뒤 각 행에서 지정</span>
      </div>
      <div className="mb-3 flex gap-1.5">
        {tabs.map((x) => (
          <button key={x} onClick={() => setT(x)} className="px-3 py-1.5 text-[12px] font-semibold" style={{ borderRadius: RADIUS, background: t === x ? GOLD_SOFT : SURFACE, color: t === x ? GOLD_D : MUTE, border: "1px solid " + (t === x ? GOLD_SOFT : LINE) }}>{x}</button>
        ))}
      </div>
      <Table cols={cols} rows={rows} empty="자산이 없습니다" sort={sort} onSortChange={onSortChange} onRowClick={(c) => { if (!c._uploading && editing?.id !== c.id) setPreview(c); }} renderCell={(c, k) => {
        // 백그라운드 업로드 진행 행 — 종류 아이콘 + 진행률 바/%. 완료되면 사라지고 실데이터 행이 대체.
        if (c._uploading) {
          const Icon = KIND_ICON[c.kind] || Clapperboard;
          const pct = Math.round((c.progress || 0) * 100);
          const err = c.status === "err";
          if (k === "idx") return err ? <X className="h-3.5 w-3.5" style={{ color: "#c0392b" }} /> : <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: GOLD_D }} />;
          if (k === "thumb") return (
            <span className="flex items-center justify-center" style={{ width: 52, height: 32, borderRadius: 3, background: "#1c232c", border: "1px solid " + LINE }}>
              <Icon className="h-4 w-4" style={{ color: "#fff", opacity: 0.7 }} />
            </span>
          );
          if (k === "kind") return <span className="inline-flex items-center gap-1.5 text-[12.5px]" style={{ color: MUTE }}><Icon className="h-3.5 w-3.5" style={{ color: KIND_ICON_C[c.kind], opacity: 0.7 }} />{KIND_LABEL[c.kind] || "—"}</span>;
          if (k === "name") return (
            <span className="block" style={{ minWidth: 200 }}>
              <span className="block truncate font-semibold" style={{ color: INK }}>{c.name}</span>
              <span className="mt-1 block overflow-hidden" style={{ height: 4, borderRadius: 2, background: "#eee" }}>
                <span className="block h-full" style={{ width: `${err ? 100 : pct}%`, background: err ? "#c0392b" : GOLD, transition: "width .2s" }} />
              </span>
            </span>
          );
          if (k === "owner") return <span className="inline-block truncate" style={{ color: MUTE, maxWidth: 120 }}>{c.targetLabel || "공용"}</span>;
          if (k === "fmt") return <span style={{ color: err ? "#c0392b" : MUTE }}>{UP_STATUS[c.status] || "처리 중"}</span>;
          if (k === "len") return <span className="tabular-nums" style={{ color: err ? "#c0392b" : MUTE }}>{c.status === "up" ? `${pct}%` : err ? "실패" : "준비"}</span>;
          if (k === "act") return err ? (
            <span className="inline-flex items-center gap-0.5">
              <button onClick={(e) => { e.stopPropagation(); patchUp(c.upId, { status: "prep", progress: 0 }); enqueue([{ upId: c.upId, name: c.name, kind: c.kind, file: c.file, target: c.target, targetLabel: c.targetLabel, status: "prep", progress: 0 }]); }}
                className="rounded p-1.5 outline-none transition hover:bg-[#f0ece4]" title="다시 시도" style={{ color: GOLD_D }}>
                <RotateCw className="h-3.5 w-3.5" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); setUploads((u) => u.filter((x) => x.upId !== c.upId)); }}
                className="rounded p-1.5 outline-none transition hover:bg-[#f0ece4]" title="지우기" style={{ color: FAINT }}>
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ) : null;
          return null;
        }
        if (k === "idx") return <span className="tabular-nums" style={{ color: FAINT }}>{c.idx}</span>;
        if (k === "thumb") return <ThumbCell c={c} />;
        if (k === "kind") {
          const Icon = KIND_ICON[c.kind] || Clapperboard;
          return <span className="inline-flex items-center gap-1.5 text-[12.5px]" style={{ color: MUTE }}><Icon className="h-3.5 w-3.5" style={{ color: KIND_ICON_C[c.kind], opacity: 0.7 }} />{KIND_LABEL[c.kind] || "—"}</span>;
        }
        if (k === "name") {
          if (editing?.id === c.id) return (
            <input
              autoFocus value={editing.value}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => setEditing((ed) => ({ ...ed, value: e.target.value }))}
              onKeyDown={(e) => { if (e.key === "Enter") saveEdit(c); else if (e.key === "Escape") setEditing(null); }}
              className="w-full bg-transparent text-[13px] font-semibold outline-none"
              style={{ color: INK, borderBottom: "1px solid " + GOLD_D, minWidth: 160 }} />
          );
          return <span className="block truncate font-semibold" style={{ color: INK, maxWidth: 200 }} title={c.name}>{c.name}</span>;
        }
        if (k === "owner") {
          // 편집 중이면 대상(파트너/공통) 선택 드롭다운 — 음악·클립·사진 모두.
          if (editing?.id === c.id) return (
            <select value={editing.partner ?? "공통"}
              onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}
              onChange={(e) => setEditing((ed) => ({ ...ed, partner: e.target.value }))}
              className="bg-white text-[12px] outline-none"
              style={{ color: INK, border: "1px solid " + LINE, borderRadius: RADIUS, padding: "2px 4px", maxWidth: 150 }}>
              <option value="공통">공통 (공용)</option>
              {partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          );
          return c.shared
            ? <span className="px-1.5 py-[1px] text-[11px] font-semibold" style={{ background: "#e9eef5", color: "#3f5e87", borderRadius: 3 }}>공용</span>
            : <span className="inline-block truncate" style={{ color: MUTE, maxWidth: 140 }} title={ownerLabel(c)}>{c.partner || allPartners.find((p) => p.id === c.partnerId)?.name || "—"}</span>;
        }
        if (k === "fmt") return <span style={{ color: MUTE }}>{fmtLabel(c)}</span>;
        if (k === "len") return <span className="tabular-nums" style={{ color: MUTE }}>{durLabel(c)}</span>;
        if (k === "act") {
          const isBgm = c.kind === "audio";
          if (editing?.id === c.id) return (
            <span className="inline-flex items-center gap-0.5">
              <button onClick={(e) => { e.stopPropagation(); saveEdit(c); }}
                className="rounded p-1.5 outline-none transition hover:bg-[#f0ece4]" title="저장" style={{ color: "#2f8f5b" }}>
                <Check className="h-3.5 w-3.5" />
              </button>
              <button onMouseDown={(e) => e.preventDefault()} onClick={(e) => { e.stopPropagation(); setEditing(null); }}
                className="rounded p-1.5 outline-none transition hover:bg-[#f0ece4]" title="취소" style={{ color: FAINT }}>
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          );
          return (
            <span className="inline-flex items-center gap-0.5">
              <button onClick={(e) => { e.stopPropagation(); startEdit(c); }}
                className="rounded p-1.5 outline-none transition hover:bg-[#f0ece4]" title="이름·대상 변경" style={{ color: FAINT }}>
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  if (await confirm({ title: isBgm ? "음악 삭제" : "자산 삭제", message: `"${c.name}"${isBgm ? " 음악을" : " 자산을"} 삭제합니다.`, danger: true }))
                    isBgm ? actions.removeBgm(c.id) : actions.removeContent(c.id);
                }}
                className="rounded p-1.5 outline-none transition hover:bg-[#f0ece4]"
                title="삭제" style={{ color: FAINT }}>
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </span>
          );
        }
        return c[k];
      }} />
      {preview && <ContentPreview item={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}

