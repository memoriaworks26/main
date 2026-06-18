// [총괄] 유저 입력 폼 빌더 — 보호자 입력 폼 항목 구성.
import React, { useState } from "react";
import {
  Check, Eye, EyeOff, Lock, Upload,
} from "lucide-react";
import { SURFACE, LINE, LINE2, GOLD, GOLD_D, INK, MUTE, FAINT, RADIUS } from "../theme.js";
import { Btn, PageHeader } from "../ui.jsx";
import { toast } from "../toast.jsx";
import { useStore, actions } from "../store.js";
import * as D from "../data.js";
import { SearchSelect } from "./shared.jsx";

const SECTION_COLOR = {
  "영상 기본":   { bg: "#e9f1ee", c: "#3a7468" },
  "운영":        { bg: "#e9eef5", c: "#3f5e87" },
  "영상 상세":   { bg: "#f4ead7", c: "#9a6a1c" },
  "추모 콘텐츠": { bg: "#eceef0", c: "#5a6470" },
};

function SectionTag({ section }) {
  const s = SECTION_COLOR[section] || { bg: "#eee", c: "#666" };
  return <span className="shrink-0 px-1.5 py-[1px] text-[10.5px] font-semibold" style={{ borderRadius: 3, background: s.bg, color: s.c }}>{section}</span>;
}

function FormPreviewField({ label, type, required }) {
  const isLong   = type === "장문";
  const isUpload = type === "사진" || type === "동영상";
  return (
    <div>
      <div className="mb-1 text-[11px] font-semibold" style={{ color: MUTE }}>{label}{required && <span style={{ color: GOLD }}> *</span>}</div>
      {isLong ? (
        <div className="h-12 w-full" style={{ background: "#f6f3ec", border: "1px solid " + LINE, borderRadius: 6 }} />
      ) : isUpload ? (
        <div className="flex h-8 w-full items-center justify-center gap-1.5 text-[11px]" style={{ background: "#f6f3ec", border: "1px dashed " + LINE, borderRadius: 6, color: FAINT }}>
          <Upload className="h-3 w-3" /> {type === "사진" ? "사진 선택" : "영상 선택"}
        </div>
      ) : (
        <div className="flex h-8 w-full items-center px-2 text-[11px]" style={{ background: "#f6f3ec", border: "1px solid " + LINE, borderRadius: 6, color: FAINT }}>
          {type === "숫자" ? "0" : type === "전화번호" ? "010-0000-0000" : ""}
        </div>
      )}
    </div>
  );
}

export function FormBuilder() {
  const { formConfigs, partners } = useStore();
  const [pid, setPid] = useState(partners.find((p) => p.active)?.id || partners[0].id);
  const partner = partners.find((p) => p.id === pid) || partners[0];
  const cfg = formConfigs[pid] || {};

  const [editingKey, setEditingKey] = useState(null);
  const [editLabel, setEditLabel] = useState("");

  const lockedFields   = D.FORM_FIELDS.filter((f) => f.locked);
  const optionalFields = D.FORM_FIELDS.filter((f) => !f.locked);

  const fieldCfg      = (key) => cfg[key] || { hidden: false };
  const effectiveLabel = (f) => fieldCfg(f.key).label || f.label;
  const toggle        = (key) => actions.setFormConfig(pid, key, { hidden: !fieldCfg(key).hidden });

  const startEdit = (f) => { setEditingKey(f.key); setEditLabel(effectiveLabel(f)); };
  const saveLabel = () => {
    if (editingKey) {
      const base = D.FORM_FIELDS.find((x) => x.key === editingKey);
      const val  = editLabel.trim();
      actions.setFormConfig(pid, editingKey, { label: val && val !== base?.label ? val : undefined });
    }
    setEditingKey(null);
  };

  const previewFields = D.FORM_FIELDS.filter((f) => f.locked || !fieldCfg(f.key).hidden);

  return (
    <div>
      <PageHeader title="유저 입력 폼" sub="파트너사별 폼 — 필수 항목 고정 · 선택 항목 표시/숨김 · 라벨 변경" right={
        <Btn size="sm" onClick={() => toast(partner.name + " 폼이 저장되었습니다")}><Check className="h-3.5 w-3.5" /> 저장</Btn>
      } />
      <div className="flex gap-4">
        {/* 파트너사 선택 */}
        <div className="flex w-52 shrink-0 flex-col gap-2">
          <div className="px-1 text-[12px] font-bold" style={{ color: INK }}>파트너사</div>
          <SearchSelect value={pid} onChange={(v) => { setPid(v); setEditingKey(null); }} placeholder="파트너사" width="100%"
            options={partners.filter((p) => p.active).map((p) => ({ value: p.id, label: p.name }))} />
          <p className="px-1 text-[11px] leading-relaxed" style={{ color: FAINT }}>선택 항목은 파트너사별로 독립 설정됩니다.</p>
        </div>

        {/* 필드 목록 */}
        <div className="min-w-0 flex-1 space-y-3">
          {/* 필수 항목 (잠금) */}
          <div>
            <div className="mb-1.5 flex items-center gap-1.5 px-0.5 text-[12px] font-bold" style={{ color: INK }}>
              <Lock className="h-3.5 w-3.5" style={{ color: MUTE }} /> 필수 항목 (고정)
              <span className="text-[11px] font-normal" style={{ color: FAINT }}>— 파트너사 수정 불가</span>
            </div>
            <div className="overflow-hidden" style={{ background: "#faf8f3", border: "1px solid " + LINE, borderRadius: RADIUS }}>
              {lockedFields.map((f, i) => (
                <div key={f.key} className="flex items-center gap-3 px-4 py-2.5" style={{ borderTop: i ? "1px solid " + LINE : "none" }}>
                  <Lock className="h-3.5 w-3.5 shrink-0" style={{ color: LINE2 }} />
                  <span className="flex-1 text-[13px] font-semibold" style={{ color: INK }}>{f.label}</span>
                  <span className="px-1.5 py-[1px] text-[11px] font-semibold" style={{ background: "#e9eef5", color: "#3f5e87", borderRadius: 3 }}>{f.type}</span>
                  <SectionTag section={f.section} />
                  <span className="w-44 text-right text-[11px]" style={{ color: FAINT }}>{f.hint}</span>
                  <span className="w-8 text-right text-[11px] font-bold" style={{ color: GOLD_D }}>필수</span>
                </div>
              ))}
            </div>
          </div>

          {/* 선택 항목 */}
          <div>
            <div className="mb-1.5 flex items-center gap-1.5 px-0.5 text-[12px] font-bold" style={{ color: INK }}>
              <Eye className="h-3.5 w-3.5" style={{ color: GOLD_D }} /> 선택 항목
              <span className="text-[11px] font-normal" style={{ color: FAINT }}>— 아이콘으로 표시/숨김 · 라벨명 클릭하여 변경</span>
            </div>
            <div className="overflow-hidden" style={{ border: "1px solid " + LINE, borderRadius: RADIUS }}>
              {optionalFields.map((f, i) => {
                const { hidden, label: overrideLabel } = fieldCfg(f.key);
                const isEditing = editingKey === f.key;
                return (
                  <div key={f.key} className="flex items-center gap-3 px-4 py-2.5 transition-opacity"
                    style={{ borderTop: i ? "1px solid " + LINE : "none", background: SURFACE, opacity: hidden ? 0.45 : 1 }}>
                    {/* 표시/숨김 토글 */}
                    <button onClick={() => toggle(f.key)} className="shrink-0 outline-none transition"
                      title={hidden ? "숨김 — 클릭하여 표시" : "표시 중 — 클릭하여 숨김"}
                      style={{ color: hidden ? LINE2 : GOLD_D }}>
                      {hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                    {/* 라벨 — 클릭하여 인라인 편집 */}
                    {isEditing ? (
                      <input autoFocus value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        onBlur={saveLabel}
                        onKeyDown={(e) => { if (e.key === "Enter") saveLabel(); if (e.key === "Escape") setEditingKey(null); }}
                        className="flex-1 px-2 text-[13px] font-semibold outline-none"
                        style={{ height: 28, background: "#fff", border: "1px solid " + GOLD, borderRadius: RADIUS, color: INK }} />
                    ) : (
                      <button onClick={() => !hidden && startEdit(f)} disabled={hidden}
                        className="flex flex-1 items-center gap-1.5 text-left text-[13px] font-semibold outline-none"
                        style={{ color: INK, cursor: hidden ? "default" : "text" }}
                        title={hidden ? undefined : "클릭하여 라벨 변경"}>
                        {overrideLabel || f.label}
                        {overrideLabel && overrideLabel !== f.label && (
                          <span className="text-[10.5px] font-normal" style={{ color: FAINT }}>기본: {f.label}</span>
                        )}
                      </button>
                    )}
                    <span className="px-1.5 py-[1px] text-[11px] font-semibold" style={{ background: "#e9eef5", color: "#3f5e87", borderRadius: 3 }}>{f.type}</span>
                    <SectionTag section={f.section} />
                    <span className="w-44 text-right text-[11px]" style={{ color: FAINT }}>{f.hint}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 미리보기 */}
        <div className="w-60 shrink-0">
          <div className="px-1 pb-2 text-[12px] font-semibold" style={{ color: MUTE }}>보호자 화면 미리보기</div>
          <div className="overflow-hidden" style={{ background: SURFACE, border: "1px solid " + LINE, borderRadius: 14 }}>
            <div className="px-4 py-3 text-center" style={{ background: "#faf7f1", borderBottom: "1px solid " + LINE }}>
              <div className="text-[12.5px] font-bold" style={{ color: INK }}>{partner.name}</div>
              <div className="mt-0.5 text-[11px]" style={{ color: FAINT }}>추모영상 정보 입력</div>
            </div>
            <div className="space-y-3 px-4 py-4">
              {previewFields.map((f) => (
                <FormPreviewField key={f.key} label={effectiveLabel(f)} type={f.type} required={f.locked} />
              ))}
              <button className="mt-1 w-full py-2 text-[12.5px] font-bold text-white" style={{ background: GOLD, borderRadius: RADIUS }}>제출</button>
            </div>
          </div>
          <p className="mt-2 px-1 text-[11px] leading-relaxed" style={{ color: FAINT }}>숨김 처리한 선택 항목은 제외됩니다.</p>
        </div>
      </div>
    </div>
  );
}

