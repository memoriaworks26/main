// [시스템·총관리자] 사이니지(Signage) + 스토리지/기간 다운로드(Storage).
import React, { useState } from "react";
import {
  AlertTriangle, CheckSquare, Clapperboard, ChevronDown, ChevronUp, ChevronsUpDown, Download, HardDrive, RefreshCw, Square, Trash2,
} from "lucide-react";
import { SURFACE, LINE, LINE2, GOLD, GOLD_D, GOLD_SOFT, INK, MUTE, FAINT, STATUS, RADIUS } from "../theme.js";
import { Tag, Btn, Card, Table, PageHeader, DateField, useTableSort } from "../ui.jsx";
import { toast } from "../toast.jsx";
import { confirm } from "../confirm.jsx";
import { useStore, actions } from "../store.js";
import * as D from "../data.js";
import * as storage from "../lib/storage.js";
import { SearchSelect } from "./shared.jsx";

export function Signage() {
  const { devices } = useStore();
  const partners = [...new Set(devices.map((d) => d.partner))];
  const [pf, setPf] = useState("all");
  const filtered = devices.filter((d) => pf === "all" || d.partner === pf);
  const { rows, sort, onSortChange } = useTableSort(filtered);
  const online = filtered.filter((d) => d.status !== "offline").length;
  const cols = [
    { key: "partner", label: "파트너사", sortable: true }, { key: "id", label: "디바이스", sortable: true }, { key: "room", label: "호실", sortable: true },
    { key: "status", label: "상태", sortable: true }, { key: "playing", label: "표출 중", sortable: true },
    { key: "ip", label: "IP", sortable: true }, { key: "act", label: "", align: "right" },
  ];
  return (
    <div>
      <PageHeader title="사이니지" sub="파트너사별 라즈베리파이 디바이스 매핑·재생·온라인 (udev·systemd · 네트워크 독립)" right={<Btn size="sm" variant="ghost" onClick={() => toast("상태를 새로고침했습니다")}><RefreshCw className="h-3.5 w-3.5" /> 상태 새로고침</Btn>} />
      <div className="mb-3 flex items-center justify-between">
        <SearchSelect value={pf} onChange={setPf} placeholder="전체 파트너사"
          options={[{ value: "all", label: "전체 파트너사" }, ...partners.map((p) => ({ value: p, label: p }))]} />
        <span className="text-[12px]" style={{ color: MUTE }}>온라인 <b style={{ color: STATUS.online.c }}>{online}</b> / {rows.length}</span>
      </div>
      <Table cols={cols} rows={rows} sort={sort} onSortChange={onSortChange} renderCell={(r, k) =>
        k === "status" ? <Tag s={r.status} /> :
        k === "act" ? <button onClick={() => toast(r.id + " 디바이스를 제어합니다")} className="text-[12px] font-semibold" style={{ color: GOLD }}>제어</button> :
        k === "partner" ? <span className="font-semibold" style={{ color: INK }}>{r.partner}</span> :
        k === "ip" ? <span className="tabular-nums">{r.ip}</span> : r[k]
      } />
      <p className="mt-3 text-[11px]" style={{ color: FAINT }}>※ 사이니지 범위(영상 루프만 / 정보안내 화면도)는 메모리아웍스 확인 항목(⚠️E).</p>
    </div>
  );
}

// canDelete=false: 삭제 비노출(읽기전용) · finalOnly=true: 최종본만(원본/혼합 대상 토글 숨김) — 협력파트너 다운로드 전용.
function PeriodDownload({ canDelete = true, finalOnly = false }) {
  const { partners, videos } = useStore();  // [QA-P1] 발행 영상 = store(워커 산출물), 목업 제거
  const [from, setFrom] = useState("2026-04-01");
  const [to, setTo] = useState("2026-06-18");
  const [partner, setPartner] = useState("all");
  const [target, setTarget] = useState("final"); // final | source | both
  const [sel, setSel] = useState(() => new Set());
  const [deleted, setDeleted] = useState(() => new Set()); // 삭제된 자산(목업 — 로컬 상태)

  const partnerOpts = [{ value: "all", label: "전체 파트너사" }, ...partners.map((p) => ({ value: p.id, label: p.name }))];
  const rows = videos
    .filter((v) => !deleted.has(v.id) && (partner === "all" || v.partnerId === partner) && (!from || v.date >= from) && (!to || v.date <= to))
    .sort((a, b) => String(b.datetime).localeCompare(String(a.datetime)));

  const ids = rows.map((r) => r.id);
  const allOn = ids.length > 0 && ids.every((id) => sel.has(id));
  const toggle = (id) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSel((s) => { const n = new Set(s); allOn ? ids.forEach((id) => n.delete(id)) : ids.forEach((id) => n.add(id)); return n; });
  const removeIds = (delIds) => {
    setDeleted((d) => { const n = new Set(d); delIds.forEach((id) => n.add(id)); return n; });
    setSel((s) => { const n = new Set(s); delIds.forEach((id) => n.delete(id)); return n; });
  };
  const deleteSel = async () => {
    const delIds = ids.filter((id) => sel.has(id));
    if (delIds.length === 0) return;
    if (await confirm({ title: "자산 삭제", message: `선택한 ${delIds.length}개 자산을 삭제합니다.\n영구 삭제되며 복구할 수 없습니다.`, danger: true })) removeIds(delIds);
  };
  const deleteOne = async (v) => { if (await confirm({ title: "자산 삭제", message: `「${D.assetFileName(v, target)}」을(를) 삭제합니다.\n영구 삭제되며 복구할 수 없습니다.`, danger: true })) removeIds([v.id]); };
  // [QA] 실 다운로드 — 대상(final/source/both)별 서명URL 발급 + 감사로그(log_access).
  const dlOne = (v) => {
    const jobs = [];
    if ((target === "final" || target === "both") && v.finalPath) jobs.push([v.finalPath, D.videoFileName(v)]);
    if ((target === "source" || target === "both") && v.sourcePath) jobs.push([v.sourcePath, D.sourceFileName(v)]);
    if (!jobs.length) { toast("다운로드할 파일이 아직 없습니다(렌더 전)."); return; }
    jobs.forEach(([p, fn]) => storage.downloadAsset(storage.BUCKETS.final, p, fn, { action: "download", targetType: "video", targetId: v.id, partnerId: v.partnerId })
      .catch((e) => toast("다운로드 실패: " + e.message)));
  };
  const dlSel = () => { if (!selRows.length) return; selRows.forEach(dlOne); };

  // 현재 필터 결과 중 선택된 것 (필터 밖 선택은 집계 제외)
  const selRows = rows.filter((r) => sel.has(r.id));
  const sz = (r) => D.assetSize(r, target); // 다운로드 대상별 용량
  const selSize = selRows.reduce((s, r) => s + sz(r), 0);
  const totalSize = rows.reduce((s, r) => s + sz(r), 0);
  const fmtSize = (mb) => (mb >= 1024 ? (mb / 1024).toFixed(1) + " GB" : mb + " MB");
  const fmtDt = (dt) => `${dt.slice(0, 2)}.${dt.slice(2, 4)}.${dt.slice(4, 6)} ${dt.slice(6, 8)}:${dt.slice(8, 10)}`;

  // 헤더 클릭 정렬 (파일명·반려동물·생성일시·용량)
  const [sort, setSort] = useState({ key: "datetime", dir: "desc" });
  const sval = (v, k) => k === "name" ? D.assetFileName(v, target) : k === "size" ? sz(v) : v[k];
  const displayRows = [...rows].sort((a, b) => {
    const av = sval(a, sort.key), bv = sval(b, sort.key);
    const c = (typeof av === "number" && typeof bv === "number") ? av - bv : String(av ?? "").localeCompare(String(bv ?? ""), "ko", { numeric: true });
    return sort.dir === "asc" ? c : -c;
  });
  const onSort = (k) => setSort((s) => s.key === k ? { key: k, dir: s.dir === "asc" ? "desc" : "asc" } : { key: k, dir: (k === "datetime" || k === "size") ? "desc" : "asc" });
  const SortHead = ({ k, children, className }) => {
    const on = sort.key === k;
    const Icon = !on ? ChevronsUpDown : sort.dir === "asc" ? ChevronUp : ChevronDown;
    return (
      <button onClick={() => onSort(k)} className={"inline-flex items-center gap-1 outline-none transition hover:opacity-80 " + (className || "")} style={{ color: on ? GOLD_D : MUTE }}>
        {children}<Icon className="h-3 w-3 shrink-0" style={{ color: on ? GOLD_D : FAINT }} strokeWidth={2.4} />
      </button>
    );
  };

  return (
    <Card title="기간별 다운로드" action={<span className="text-[11.5px]" style={{ color: FAINT }}>최종본 · 원본 소스 · 파일명 규칙 자동 적용</span>}>
      {/* 필터 */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-40"><DateField label="시작일" value={from} onChange={setFrom} /></div>
        <div className="w-40"><DateField label="종료일" value={to} onChange={setTo} /></div>
        <div>
          <span className="text-[12px] font-semibold" style={{ color: MUTE }}>파트너사</span>
          <div className="mt-1"><SearchSelect value={partner} onChange={(v) => setPartner(v)} width={240} options={partnerOpts} /></div>
        </div>
        {!finalOnly && (
          <div>
            <span className="text-[12px] font-semibold" style={{ color: MUTE }}>다운로드 대상</span>
            <div className="mt-1 flex items-center gap-1">
              {D.DOWNLOAD_TARGETS.map((t) => {
                const on = target === t.key;
                return (
                  <button key={t.key} onClick={() => setTarget(t.key)} className="px-2.5 text-[12px] font-semibold outline-none transition focus-visible:ring-1"
                    style={{ height: 36, borderRadius: RADIUS, background: on ? GOLD_SOFT : SURFACE, color: on ? GOLD_D : MUTE, border: "1px solid " + (on ? GOLD_SOFT : LINE2) }}>{t.label}</button>
                );
              })}
            </div>
          </div>
        )}
        <span className="ml-auto pb-2 text-[12px] tabular-nums" style={{ color: MUTE }}>
          {rows.length}개 · {fmtSize(totalSize)}
        </span>
      </div>

      {/* 파일 목록 */}
      <div className="mt-3 overflow-hidden" style={{ border: "1px solid " + LINE, borderRadius: RADIUS }}>
        <div className="flex items-center gap-3 px-3 py-2 text-[11px] font-bold uppercase tracking-wide" style={{ background: "#f6f4ef", borderBottom: "1px solid " + LINE, color: MUTE }}>
          <button onClick={toggleAll} className="flex items-center outline-none" style={{ color: allOn ? GOLD : FAINT }} title="전체 선택" disabled={ids.length === 0}>
            {allOn ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
          </button>
          <span className="flex-1"><SortHead k="name">파일명</SortHead></span>
          <span className="w-24"><SortHead k="deceased">반려동물</SortHead></span>
          <span className="w-32 text-right"><SortHead k="datetime" className="justify-end w-full">생성일시</SortHead></span>
          <span className="w-20 text-right"><SortHead k="size" className="justify-end w-full">용량</SortHead></span>
          <span className="w-14" />
        </div>
        {displayRows.length === 0 && <div className="px-3 py-6 text-center text-[12.5px]" style={{ color: FAINT }}>선택한 기간에 해당하는 자산이 없습니다.</div>}
        {displayRows.map((v) => {
          const on = sel.has(v.id);
          return (
            <div key={v.id} className="flex items-center gap-3 px-3 py-2.5" style={{ borderTop: "1px solid " + LINE, background: on ? GOLD_SOFT : SURFACE }}>
              <button onClick={() => toggle(v.id)} className="flex items-center outline-none" style={{ color: on ? GOLD : FAINT }}>
                {on ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
              </button>
              <span className="flex min-w-0 flex-1 items-center gap-2">
                {target === "source" ? <HardDrive className="h-3.5 w-3.5 shrink-0" style={{ color: "#5a6470" }} /> : <Clapperboard className="h-3.5 w-3.5 shrink-0" style={{ color: "#3f5e87" }} />}
                <span className="truncate text-[12.5px] tabular-nums" style={{ color: INK, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{D.assetFileName(v, target)}</span>
                {target === "both" && <span className="shrink-0 px-1.5 py-0.5 text-[10px] font-bold" style={{ borderRadius: RADIUS, background: GOLD_SOFT, color: GOLD_D }}>+원본</span>}
              </span>
              <span className="w-24 truncate text-[12.5px]" style={{ color: MUTE }}>{v.deceased}</span>
              <span className="w-32 text-right text-[12px] tabular-nums" style={{ color: MUTE }}>{fmtDt(v.datetime)}</span>
              <span className="w-20 text-right text-[12px] tabular-nums" style={{ color: MUTE }}>{fmtSize(sz(v))}</span>
              <span className="flex w-14 items-center justify-end gap-1">
                <button onClick={() => dlOne(v)} className="flex items-center justify-center p-1 outline-none" style={{ color: GOLD_D }} title="개별 다운로드"><Download className="h-3.5 w-3.5" /></button>
                {canDelete && <button onClick={() => deleteOne(v)} className="flex items-center justify-center p-1 outline-none transition hover:opacity-70" style={{ color: "#c0392b" }} title="삭제"><Trash2 className="h-3.5 w-3.5" /></button>}
              </span>
            </div>
          );
        })}
      </div>

      {/* 액션 */}
      <div className="mt-3 flex items-center gap-2">
        <span className="text-[12px] tabular-nums" style={{ color: selRows.length ? INK : FAINT }}>
          선택 <b style={{ color: selRows.length ? GOLD_D : FAINT }}>{selRows.length}</b>개 · {fmtSize(selSize)}
        </span>
        <div className="ml-auto flex items-center gap-2">
          {canDelete && <Btn size="sm" variant="ghost" disabled={selRows.length === 0} onClick={deleteSel}><span className="inline-flex items-center gap-1.5" style={{ color: "#c0392b" }}><Trash2 className="h-3.5 w-3.5" /> 선택 삭제</span></Btn>}
          <Btn size="sm" variant="ghost" disabled={selRows.length === 0} onClick={dlSel}><Download className="h-3.5 w-3.5" /> 선택 다운로드</Btn>
          <Btn size="sm" disabled={rows.length === 0} onClick={() => toast("전체 ZIP 묶음은 서버 측 처리 예정입니다 — 개별·선택 다운로드를 이용하세요.")}><Download className="h-3.5 w-3.5" /> 전체 ZIP ({fmtSize(totalSize)})</Btn>
        </div>
      </div>
      <p className="mt-2.5 text-[11px] leading-relaxed" style={{ color: FAINT }}>
        ※ 파일명 규칙 <span className="tabular-nums" style={{ color: MUTE, fontFamily: "ui-monospace, monospace" }}>파트너코드(4)_호실(2)_장례일시(YYMMDDHHmm)</span> — 최종본은 <span className="tabular-nums">.mp4</span>, 원본 소스는 <span className="tabular-nums">_src.zip</span>(보호자 업로드 사진·영상). 다운로드는 egress 0 서명 URL로 제공됩니다.
      </p>
    </Card>
  );
}

export function Storage() {
  const { storageClasses: classes, videos } = useStore();
  // [QA-P1] 사용량 = 발행 영상(최종본+원본) 실측 합. 총량은 R2 소프트 캡(설정값).
  const usedGB = +(videos.reduce((a, v) => a + (v.sizeMB || 0) + (v.srcMB || 0), 0) / 1024).toFixed(1);
  const s = { used: usedGB, total: 1024, unit: "GB" };
  const pct = s.total ? Math.min(100, Math.round((s.used / s.total) * 100)) : 0;
  const setRet = (key, retention) => actions.setRetention(key, retention);

  return (
    <div>
      <PageHeader title="스토리지" sub="Cloudflare R2 — 자산 보존 정책 · 기간별 선택 다운로드 (egress 0 · 서명 URL)" right={<Btn size="sm" variant="ghost" onClick={() => toast("사용량을 새로고침했습니다")}><RefreshCw className="h-3.5 w-3.5" /> 사용량 새로고침</Btn>} />

      {/* 총 사용량 */}
      <Card title={`총 사용량 ${s.used}${s.unit} / ${s.total}${s.unit} (${pct}%)`}>
        <div className="h-3 w-full overflow-hidden" style={{ background: "#e7e2d8", borderRadius: 99 }}>
          <div className="h-full" style={{ width: pct + "%", background: pct > 85 ? STATUS.review.c : GOLD, borderRadius: 99 }} />
        </div>
        {pct > 85
          ? <p className="mt-2 flex items-center gap-1.5 text-[11.5px]" style={{ color: STATUS.review.c }}><AlertTriangle className="h-3.5 w-3.5" /> 용량 85% 초과 — 임시본 정리 또는 증설 검토</p>
          : <p className="mt-2 text-[11px]" style={{ color: FAINT }}>임시본은 보존일 경과 시 라이프사이클로 자동 삭제 → 무한 증가 방지.</p>}
      </Card>

      {/* 자산 보존 정책 (편집 + 정책별 백업 다운로드) */}
      <div className="mb-2 mt-5 text-[13px] font-bold" style={{ color: INK }}>자산 보존 정책 <span className="font-normal" style={{ color: FAINT }}>· 클래스별 R2 라이프사이클 · 외부 백업 다운로드</span></div>
      <div className="grid grid-cols-3 gap-3">
        {classes.map((c) => {
          const isNum = typeof c.retention === "number";
          return (
            <div key={c.key} className="flex flex-col px-4 py-3.5" style={{ background: SURFACE, border: "1px solid " + LINE, borderRadius: RADIUS }}>
              <div className="text-[13px] font-bold" style={{ color: INK }}>{c.name}</div>
              <div className="mt-0.5 text-[11.5px]" style={{ color: FAINT }}>{c.desc}</div>
              <div className="mt-2 text-[12px]" style={{ color: MUTE }}>{c.sizeGB} GB · <span className="tabular-nums">{c.files.toLocaleString()}</span>개</div>
              <div className="mt-3 flex items-center gap-1.5 border-t pt-3" style={{ borderColor: LINE }}>
                <button onClick={() => setRet(c.key, "permanent")} className="px-2.5 py-1.5 text-[12px] font-semibold" style={{ borderRadius: RADIUS, background: !isNum ? GOLD_SOFT : "#fff", color: !isNum ? GOLD_D : MUTE, border: "1px solid " + (!isNum ? GOLD_SOFT : LINE2) }}>영구</button>
                <button onClick={() => setRet(c.key, isNum ? c.retention : 30)} className="px-2.5 py-1.5 text-[12px] font-semibold" style={{ borderRadius: RADIUS, background: isNum ? GOLD_SOFT : "#fff", color: isNum ? GOLD_D : MUTE, border: "1px solid " + (isNum ? GOLD_SOFT : LINE2) }}>기간</button>
                {isNum && (
                  <div className="flex items-center gap-1">
                    <input type="number" min="1" value={c.retention} onChange={(e) => setRet(c.key, Math.max(1, +e.target.value))} className="w-14 px-2 text-[12.5px] tabular-nums outline-none" style={{ height: 32, background: "#fff", border: "1px solid " + LINE2, borderRadius: RADIUS, color: INK }} />
                    <span className="text-[12px]" style={{ color: MUTE }}>일 후 삭제</span>
                  </div>
                )}
              </div>
              <button onClick={() => toast(c.name + " 백업 다운로드를 시작합니다")} className="mt-2 flex w-full items-center justify-center gap-1.5 py-2 text-[12.5px] font-semibold" style={{ borderRadius: RADIUS, border: "1px solid " + LINE2, color: GOLD_D }}>
                <Download className="h-3.5 w-3.5" /> 백업 다운로드 ({c.sizeGB} GB)
              </button>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[11px] leading-relaxed" style={{ color: FAINT }}>
        ※ 「백업 다운로드」로 각 정책의 자산을 외부 백업 저장장치에 내려받을 수 있습니다. 원본은 영구보관(요청 시 삭제) 정책입니다.
      </p>

      {/* 기간별 다운로드 — 발행 최종본 선택 */}
      <div className="mb-2 mt-6 text-[13px] font-bold" style={{ color: INK }}>기간별 다운로드 <span className="font-normal" style={{ color: FAINT }}>· 기간·파트너사로 골라 선택 다운로드 (최종본 · 원본 소스)</span></div>
      <PeriodDownload />
    </div>
  );
}

// [협력파트너 전용] 영상 다운로드 — 쌓인 발행 최종본만 골라 선택 다운로드(삭제·원본·내부 데이터 접근 불가).
export function Downloads() {
  return (
    <div>
      <PageHeader title="영상 다운로드" sub="쌓인 추모영상(발행 최종본)을 기간·파트너사로 골라 선택 다운로드 — 협력파트너 전용" />
      <PeriodDownload canDelete={false} finalOnly />
    </div>
  );
}

