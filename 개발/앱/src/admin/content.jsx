// [추모영상 제작] 콘텐츠 허브 — 공용 영상/이미지/음악 소스 업로드·관리.
import React, { useState, useEffect } from "react";
import {
  Check, Clapperboard, Image, Music, Plus, Search, Trash2, Upload, X,
} from "lucide-react";
import { NAVY, SURFACE, LINE, LINE2, GOLD, GOLD_D, GOLD_SOFT, INK, MUTE, FAINT, RADIUS } from "../theme.js";
import { Btn, PageHeader, Modal } from "../ui.jsx";
import { useStore, actions } from "../store.js";
import * as D from "../data.js";
import { SearchSelect } from "./shared.jsx";

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

export function ContentHub() {
  const tabs = ["전체", "영상", "이미지", "음악"];
  const { content, partners: allPartners } = useStore();
  const [partner, setPartner] = useState(allPartners.find((p) => p.active)?.name || allPartners[0].name);
  const [t, setT] = useState("전체");
  const [q, setQ] = useState("");
  const [uploading, setUploading] = useState(false);
  const partners = allPartners.filter((p) => p.active);
  // 음악(BGM)은 공용 라이브러리 → 모든 파트너사 공통. 클립·사진은 파트너사별.
  const items = content.concat(D.BGM.map((b) => ({ id: b.id, kind: "audio", name: b.name, meta: b.meta, size: "", shared: true })));
  const rows = items
    .filter((c) => partner === "공통" ? c.shared : (c.partner === partner || c.shared))
    .filter((c) => t === "전체" || (t === "영상" && c.kind === "clip") || (t === "이미지" && c.kind === "photo") || (t === "음악" && c.kind === "audio"))
    .filter((c) => { const s = q.trim().toLowerCase(); return !s || (c.name + " " + (c.meta || "")).toLowerCase().includes(s); });
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
      <div style={{ border: "1px solid " + LINE, borderRadius: RADIUS, overflow: "hidden" }}>
        {rows.length === 0 && (
          <div className="flex items-center justify-center py-10 text-[13px]" style={{ color: FAINT }}>자산이 없습니다</div>
        )}
        {rows.map((c, i) => {
          const canDelete = content.some((x) => x.id === c.id);
          return (
            <div key={c.id} className="flex items-center gap-2.5 px-3 py-2" style={{ background: SURFACE, borderBottom: i < rows.length - 1 ? "1px solid " + LINE : "none" }}>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center" style={{ background: c.kind === "clip" ? "#d9d6cd" : c.kind === "audio" ? "#e9eef5" : "#eef0f2", borderRadius: RADIUS }}>
                {c.kind === "clip" ? <Clapperboard className="h-4 w-4" style={{ color: NAVY, opacity: 0.55 }} /> : c.kind === "audio" ? <Music className="h-4 w-4" style={{ color: "#3f5e87", opacity: 0.65 }} /> : <Image className="h-4 w-4" style={{ color: NAVY, opacity: 0.55 }} />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-[13px] font-semibold" style={{ color: INK }}>{c.name}</span>
                  {c.shared && <span className="shrink-0 px-1.5 py-[1px] text-[10px] font-semibold" style={{ background: "#e9eef5", color: "#3f5e87", borderRadius: 3 }}>공용</span>}
                </div>
                <div className="text-[11px]" style={{ color: FAINT }}>{c.meta}{c.size ? " · " + c.size : ""}</div>
              </div>
              <span className="shrink-0 text-[11px]" style={{ color: FAINT }}>
                {c.kind === "clip" ? "영상" : c.kind === "audio" ? "음악" : "이미지"}
              </span>
              {canDelete ? (
                <button
                  onClick={() => window.confirm(`"${c.name}" 자산을 삭제할까요?`) && actions.removeContent(c.id)}
                  className="shrink-0 rounded p-1.5 outline-none transition hover:bg-[#f0ece4]"
                  title="삭제" style={{ color: FAINT }}>
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              ) : (
                <div className="w-7 shrink-0" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

