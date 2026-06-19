// [추모영상 제작] 콘텐츠 허브 — 공용 영상/이미지/음악 소스 업로드·관리.
import React, { useState, useEffect, useRef } from "react";
import {
  Check, Clapperboard, Image, Music, Pause, Play, Plus, Search, Trash2, Upload, X,
} from "lucide-react";
import { NAVY, SURFACE, LINE, LINE2, GOLD, GOLD_D, GOLD_SOFT, INK, MUTE, FAINT, RADIUS } from "../theme.js";
import { Btn, PageHeader, Modal, Table, useTableSort } from "../ui.jsx";
import { useStore, actions } from "../store.js";
import { confirm } from "../confirm.jsx";
import { photoThumb, genFrame } from "../lib/media.js";
import { matchQuery } from "../lib/util.js";
import * as D from "../data.js";
import { SearchSelect } from "./shared.jsx";

// id → 안정적인 인덱스(목업 썸네일 장면 선택용)
const hashId = (id) => { let h = 0; const s = String(id); for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; };
// 종류별 미리보기 이미지 (음악은 이미지 없음 → null)
const thumbFor = (c) => c.kind === "audio" ? null : (c.kind === "photo" ? photoThumb(hashId(c.id)) : genFrame("slide", hashId(c.id)));

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
const contentSortValue = (c, k) =>
  k === "kind" ? (KIND_RANK[c.kind] ?? 9) :
  k === "len" ? durSec(c) :
  k === "fmt" ? fmtLabel(c) :
  k === "name" ? c.name : c[k];

const CONTENT_KINDS = [
  { key: "clip", label: "영상 클립", icon: Clapperboard, hint: "예: 오프닝_숲속.mp4", metaPh: "0:10 · 1920×1080" },
  { key: "photo", label: "이미지", icon: Image, hint: "예: 추모액자_모던.png", metaPh: "투명 PNG" },
  { key: "audio", label: "음악", icon: Music, hint: "예: 잔잔한_피아노.mp3", metaPh: "3:45 · 128kbps" },
];
function ContentUploadModal({ open, onClose, partners, defaultPartner }) {
  const blank = { kind: "clip", scope: "partner", partner: defaultPartner, name: "", meta: "", size: "" };
  const [f, setF] = useState(blank);
  useEffect(() => { if (open) setF({ ...blank, partner: defaultPartner }); /* eslint-disable-next-line */ }, [open, defaultPartner]);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const kindDef = CONTENT_KINDS.find((k) => k.key === f.kind) || CONTENT_KINDS[0];
  // 음악은 공용(BGM 라이브러리), 클립·사진만 공통/파트너 선택 가능
  const shared = f.kind === "audio" || f.scope === "common";
  const canSubmit = !!f.name.trim() && (shared || !!f.partner);
  const submit = () => {
    if (!canSubmit) return;
    const asset = { id: "ct-" + Date.now(), kind: f.kind, name: f.name.trim(), meta: f.meta.trim() || kindDef.metaPh, size: f.size.trim() };
    if (shared) asset.shared = true; else asset.partner = f.partner;
    actions.addContent(asset);
    onClose();
  };
  const inputStyle = { height: 36, background: "#fff", border: "1px solid " + LINE2, borderRadius: RADIUS, color: INK };
  return (
    <Modal open={open} onClose={onClose} width={460}>
      <div className="flex items-center justify-between px-5" style={{ height: 50, borderBottom: "1px solid " + LINE }}>
        <span className="text-[14px] font-semibold" style={{ color: INK }}>자산 업로드</span>
        <button onClick={onClose} className="transition hover:opacity-70" style={{ color: MUTE }}><X className="h-4 w-4" /></button>
      </div>
      <div className="space-y-4 px-5 py-4">
        {/* 종류 */}
        <div>
          <div className="mb-1.5 text-[12px] font-semibold" style={{ color: MUTE }}>종류</div>
          <div className="grid grid-cols-3 gap-2">
            {CONTENT_KINDS.map((k) => {
              const on = f.kind === k.key; const Icon = k.icon;
              return (
                <button key={k.key} onClick={() => setF((s) => ({ ...s, kind: k.key }))}
                  className="flex flex-col items-center justify-center gap-1.5 py-3 text-[12px] font-semibold outline-none transition focus-visible:ring-1"
                  style={{ borderRadius: RADIUS, background: on ? GOLD_SOFT : "#fff", color: on ? GOLD_D : MUTE, border: "1.5px solid " + (on ? GOLD : LINE2) }}>
                  <Icon className="h-5 w-5" /> {k.label}
                </button>
              );
            })}
          </div>
        </div>
        {/* 드롭존(목업) */}
        <button onClick={() => !f.name && setF((s) => ({ ...s, name: kindDef.hint.replace("예: ", "") }))}
          className="flex w-full flex-col items-center justify-center gap-1.5 py-6 outline-none transition hover:border-[#c9a86a]"
          style={{ border: "1.5px dashed " + LINE2, borderRadius: RADIUS, background: "#faf8f3" }}>
          <Upload className="h-6 w-6" style={{ color: GOLD }} />
          <span className="text-[12.5px] font-semibold" style={{ color: INK }}>파일 끌어다 놓기 또는 눌러서 선택</span>
          <span className="text-[11px]" style={{ color: FAINT }}>{kindDef.hint}</span>
        </button>
        {/* 귀속 — 음악은 공용 고정 */}
        {f.kind === "audio" ? (
          <div className="px-3 py-2 text-[12px]" style={{ background: "#e9eef5", borderRadius: RADIUS, color: "#3f5e87" }}>음악은 공용 BGM 라이브러리에 추가됩니다 (모든 파트너사 공통).</div>
        ) : (
          <div>
            <div className="mb-1.5 text-[12px] font-semibold" style={{ color: MUTE }}>귀속</div>
            <div className="flex gap-2">
              <button onClick={() => setF((s) => ({ ...s, scope: "partner" }))} className="flex-1 py-2 text-[12.5px] font-semibold outline-none" style={{ borderRadius: RADIUS, background: f.scope === "partner" ? GOLD_SOFT : "#fff", color: f.scope === "partner" ? GOLD_D : MUTE, border: "1.5px solid " + (f.scope === "partner" ? GOLD : LINE2) }}>파트너사</button>
              <button onClick={() => setF((s) => ({ ...s, scope: "common" }))} className="flex-1 py-2 text-[12.5px] font-semibold outline-none" style={{ borderRadius: RADIUS, background: f.scope === "common" ? GOLD_SOFT : "#fff", color: f.scope === "common" ? GOLD_D : MUTE, border: "1.5px solid " + (f.scope === "common" ? GOLD : LINE2) }}>공통 (공용)</button>
            </div>
            {f.scope === "partner" && (
              <select value={f.partner} onChange={set("partner")} className="mt-2 w-full px-3 text-[13px] outline-none" style={inputStyle}>
                {partners.map((p) => <option key={p.id}>{p.name}</option>)}
              </select>
            )}
          </div>
        )}
        {/* 파일명 · 정보 · 용량 */}
        <label className="block">
          <span className="text-[12px] font-semibold" style={{ color: MUTE }}>파일명 *</span>
          <input value={f.name} onChange={set("name")} placeholder={kindDef.hint.replace("예: ", "")} className="mt-1 w-full px-3 text-[13px] outline-none" style={inputStyle} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-[12px] font-semibold" style={{ color: MUTE }}>정보</span>
            <input value={f.meta} onChange={set("meta")} placeholder={kindDef.metaPh} className="mt-1 w-full px-3 text-[13px] outline-none" style={inputStyle} />
          </label>
          <label className="block">
            <span className="text-[12px] font-semibold" style={{ color: MUTE }}>용량</span>
            <input value={f.size} onChange={set("size")} placeholder="예: 12MB" className="mt-1 w-full px-3 text-[13px] outline-none" style={inputStyle} />
          </label>
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 px-5" style={{ height: 56, borderTop: "1px solid " + LINE }}>
        <Btn size="sm" variant="neutral" onClick={onClose}>취소</Btn>
        <Btn size="sm" onClick={submit} disabled={!canSubmit}><Check className="h-3.5 w-3.5" /> 업로드</Btn>
      </div>
    </Modal>
  );
}

// 자산 미리보기 모달 — 영상/이미지는 프레임, 음악은 WebAudio 합성음 재생(목업).
function ContentPreview({ item, onClose }) {
  const [playing, setPlaying] = useState(false);
  const ctxRef = useRef(null);
  const oscRef = useRef([]);
  const isAudio = item.kind === "audio";
  const src = thumbFor(item);

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
            <div className="flex flex-col items-center gap-3">
              <div className="flex items-end gap-1" style={{ height: 36 }}>
                {[14, 26, 18, 32, 22, 30, 16].map((h, i) => (
                  <span key={i} style={{ width: 4, height: h, background: "rgba(255,255,255,.85)", borderRadius: 2, transformOrigin: "bottom", animation: playing ? `mw-eq .9s ${i * 0.08}s ease-in-out infinite alternate` : "none", opacity: playing ? 1 : 0.5 }} />
                ))}
              </div>
              <button onClick={playing ? stop : play} className="flex h-11 w-11 items-center justify-center rounded-full outline-none transition hover:scale-105" style={{ background: "#fff", color: NAVY }}>
                {playing ? <Pause className="h-5 w-5" fill={NAVY} /> : <Play className="h-5 w-5" style={{ marginLeft: 2 }} fill={NAVY} />}
              </button>
            </div>
          ) : (
            <>
              <img src={src} alt={item.name} className="absolute inset-0 h-full w-full object-cover" />
              {item.kind === "clip" && (
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
        <p className="mt-3 text-[11px]" style={{ color: FAINT }}>※ 목업 미리보기 — 실제 파일은 본운영에서 업로드 자산으로 표시됩니다.</p>
      </div>
    </Modal>
  );
}

export function ContentHub() {
  const tabs = ["전체", "영상", "이미지", "음악"];
  const { content, partners: allPartners } = useStore();
  const [partner, setPartner] = useState(allPartners.find((p) => p.active)?.name || allPartners[0].name);
  const [t, setT] = useState("전체");
  const [q, setQ] = useState("");
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null); // 미리보기 중인 자산
  const partners = allPartners.filter((p) => p.active);
  // 음악(BGM)은 공용 라이브러리 → 모든 파트너사 공통. 클립·사진은 파트너사별.
  const items = content.concat(D.BGM.map((b) => ({ id: b.id, kind: "audio", name: b.name, meta: b.meta, size: "", shared: true })));
  const filtered = items
    .filter((c) => partner === "공통" ? c.shared : (c.partner === partner || c.shared))
    .filter((c) => t === "전체" || (t === "영상" && c.kind === "clip") || (t === "이미지" && c.kind === "photo") || (t === "음악" && c.kind === "audio"))
    .filter((c) => matchQuery(q, c.name, c.meta));
  const { rows: sorted, sort, onSortChange } = useTableSort(filtered, { value: contentSortValue });
  const rows = sorted.map((c, i) => ({ ...c, idx: i + 1 }));
  const cols = [
    { key: "idx", label: "순번", align: "right" },
    { key: "thumb", label: "미리보기" },
    { key: "kind", label: "종류", sortable: true },
    { key: "name", label: "이름", sortable: true },
    { key: "fmt", label: "형식", sortable: true },
    { key: "len", label: "길이", align: "right", sortable: true },
    { key: "act", label: "", align: "right" },
  ];
  return (
    <div style={{ maxWidth: 700 }}>
      <PageHeader title="콘텐츠 허브" sub="파트너사별 선업로드 자산(클립·사진) + 공용 음악 라이브러리" right={
        <div className="flex items-center gap-2">
          <div className="flex items-center px-3" style={{ height: 36, width: 232, background: SURFACE, border: "1px solid " + LINE, borderRadius: RADIUS }}>
            <Search className="h-4 w-4" style={{ color: FAINT }} strokeWidth={1.9} />
            <input value={q} onChange={(e) => setQ(e.target.value)} className="ml-2 w-full bg-transparent text-[13px] outline-none" placeholder="자산명·정보 검색" style={{ color: INK }} />
          </div>
          <Btn size="sm" onClick={() => setUploading(true)}><Plus className="h-4 w-4" /> 자산 업로드</Btn>
        </div>
      } />
      <ContentUploadModal open={uploading} onClose={() => setUploading(false)} partners={partners} defaultPartner={partner === "공통" ? partners[0]?.name : partner} />
      {/* 파트너사 베이스 (+ 공통 공용 자산) */}
      <div className="mb-3 flex items-center gap-2">
        <SearchSelect value={partner} onChange={setPartner} placeholder="파트너사"
          options={[{ value: "공통", label: "공통 (공용 자산)" }, ...partners.map((p) => ({ value: p.name, label: p.name }))]} />
        <span className="text-[12px]" style={{ color: FAINT }}>{rows.length}개</span>
      </div>
      <div className="mb-3 flex gap-1.5">
        {tabs.map((x) => (
          <button key={x} onClick={() => setT(x)} className="px-3 py-1.5 text-[12px] font-semibold" style={{ borderRadius: RADIUS, background: t === x ? GOLD_SOFT : SURFACE, color: t === x ? GOLD_D : MUTE, border: "1px solid " + (t === x ? GOLD_SOFT : LINE) }}>{x}</button>
        ))}
      </div>
      <Table cols={cols} rows={rows} empty="자산이 없습니다" sort={sort} onSortChange={onSortChange} onRowClick={(c) => setPreview(c)} renderCell={(c, k) => {
        if (k === "idx") return <span className="tabular-nums" style={{ color: FAINT }}>{c.idx}</span>;
        if (k === "thumb") {
          const src = thumbFor(c);
          return (
            <span className="relative flex items-center justify-center overflow-hidden" style={{ width: 52, height: 32, borderRadius: 3, background: c.kind === "audio" ? "linear-gradient(135deg,#202b3a,#3f5e87)" : "#1c232c", border: "1px solid " + LINE }}>
              {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : <Music className="h-4 w-4" style={{ color: "#fff", opacity: 0.85 }} />}
              {c.kind === "clip" && <span className="absolute flex h-4 w-4 items-center justify-center rounded-full" style={{ background: "rgba(0,0,0,.45)" }}><Play className="h-2 w-2 text-white" style={{ marginLeft: 1 }} fill="#fff" /></span>}
            </span>
          );
        }
        if (k === "kind") {
          const Icon = KIND_ICON[c.kind] || Clapperboard;
          return <span className="inline-flex items-center gap-1.5 text-[12.5px]" style={{ color: MUTE }}><Icon className="h-3.5 w-3.5" style={{ color: KIND_ICON_C[c.kind], opacity: 0.7 }} />{KIND_LABEL[c.kind] || "—"}</span>;
        }
        if (k === "name") return (
          <span className="inline-flex items-center gap-1.5">
            <span className="font-semibold" style={{ color: INK }}>{c.name}</span>
            {c.shared && <span className="shrink-0 px-1.5 py-[1px] text-[10px] font-semibold" style={{ background: "#e9eef5", color: "#3f5e87", borderRadius: 3 }}>공용</span>}
          </span>
        );
        if (k === "fmt") return <span style={{ color: MUTE }}>{fmtLabel(c)}</span>;
        if (k === "len") return <span className="tabular-nums" style={{ color: MUTE }}>{durLabel(c)}</span>;
        if (k === "act") {
          const canDelete = content.some((x) => x.id === c.id);
          return canDelete ? (
            <button
              onClick={async (e) => { e.stopPropagation(); if (await confirm({ title: "자산 삭제", message: `"${c.name}" 자산을 삭제합니다.`, danger: true })) actions.removeContent(c.id); }}
              className="rounded p-1.5 outline-none transition hover:bg-[#f0ece4]"
              title="삭제" style={{ color: FAINT }}>
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          ) : null;
        }
        return c[k];
      }} />
      {preview && <ContentPreview item={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}

