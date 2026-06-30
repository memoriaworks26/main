// [총괄] 고객관리 — 예약/영상 상태 목록과 1건 드릴다운 상세.
import React, { useState, useEffect, useMemo } from "react";
import {
  Search, Trash2, Download,
} from "lucide-react";
import { SERIF, SURFACE, LINE, GOLD_D, INK, MUTE, FAINT, RADIUS, SUB_LABEL } from "../theme.js";
import { Tag, Btn, Card, Table, PageHeader, CopyBtn, useTableSort } from "../ui.jsx";
import { useStore, actions, submissionFor, videoFor, term } from "../store.js";
import { confirm } from "../confirm.jsx";
import { toast } from "../toast.jsx";
import { matchQuery } from "../lib/util.js";
import * as storage from "../lib/storage.js";
import { SearchSelect } from "./shared.jsx";
import { SlotText } from "../partner/shared.jsx";

// 영상/예약 상태 태그 — 고객관리·대시보드 최근예약 공용(컬럼 일관)
export const videoTag = (st) =>
  st === "published" ? <Tag s="published" label="발행 완료" /> :
  st === "confirm" ? <Tag s="confirm" label="컨펌 대기" /> :
  st === "review" ? <Tag s="review" label="접수 대기" /> :
  <Tag s="rendering" label="작업중" />;
// 예약 상태 태그 — 접수 / 진행중 / 종료
export const reservTag = (st) =>
  st === "published" ? <Tag s="done" label="종료" /> :
  st === "review" ? <Tag s="standby" label="접수" /> :
  <Tag s="rendering" label="진행중" />;

// 고객관리·대시보드 공용 컬럼 정의 (동일 순서·라벨 · sortable은 onSortChange 줄 때만 활성)
export const CUSTOMER_COLS = [
  { key: "date", label: "예약일", sortable: true }, { key: "slot", label: "시간", sortable: true }, { key: "partner", label: "파트너사", sortable: true },
  { key: "room", label: "호실", sortable: true }, { key: "deceased", label: "반려동물", sortable: true }, { key: "chief", label: "보호자", sortable: true },
  { key: "phone", label: "연락처", sortable: true }, { key: "assignee", label: "담당자", sortable: true },
  { key: "video", label: "영상", sortable: true }, { key: "progress", label: "상태", sortable: true },
];

// 정렬 비교값 — 영상/상태 컬럼은 제작 단계 순서로(접수→진행→발행)
const STAGE_RANK = { review: 0, rendering: 1, confirm: 2, published: 3 };
export const customerSortValue = (r, k) => (k === "video" || k === "progress") ? (STAGE_RANK[r.status] ?? 99) : (r[k] ?? "");
// 예약 1건 → 고객관리 행 형태 (대시보드 최근예약과 공유)
export const toCustomerRow = (r) => ({ id: r.id, deceased: r.deceased, chief: r.chief, phone: r.phone, partner: r.partner, partnerId: r.partnerId, date: r.date || (r.requestedAt || "").split(" ")[0], room: r.room, slot: r.slot, endDate: r.endDate, status: r.status, assignee: r.assignee });
// 고객관리 행 셀 렌더 (대시보드 최근예약과 동일 표현)
export const renderCustomerCell = (r, k) =>
  k === "deceased" ? <span style={{ fontFamily: SERIF, fontWeight: 700, color: INK }}>{r.deceased}</span> :
  k === "video" ? videoTag(r.status) :
  k === "progress" ? reservTag(r.status) :
  k === "slot" ? <SlotText slot={r.slot} className="tabular-nums" /> :
  k === "assignee" ? (r.assignee || <span style={{ color: FAINT }}>미배정</span>) :
  r[k];

// 추모영상 카드 — 고객관리 상세 · 파트너 예약 상세 공용(두 화면 동일 보장).
// 발행 완료 건은 최종본(memoria-final) 미리보기 재생 + 다운로드. 미발행은 status 슬레이트 라벨.
export function MemorialVideoCard({ status, file, requestedAt, video }) {
  const vlabel = status === "published" ? "발행 완료" : status === "confirm" ? "컨펌 대기" : status === "review" ? "접수 대기" : "제작 중";
  const published = status === "published";
  // [미리보기] 발행 완료 건만 — 다운로드와 동일 소스(finalPath)로 매번 새 서명URL 발급(만료 없는 재생).
  const [preview, setPreview] = useState(null); // null=미시도/로딩중 · ""=불가 · url=재생가능
  useEffect(() => {
    if (!published || !video?.finalPath) { setPreview(""); return; }
    let alive = true;
    setPreview(null);
    storage.signedUrl(storage.BUCKETS.final, video.finalPath)
      .then((url) => { if (alive) setPreview(url); })
      .catch(() => { if (alive) setPreview(""); });
    return () => { alive = false; };
  }, [published, video?.finalPath]);
  // [QA] 실 다운로드 — videos.finalPath 서명URL + 감사로그. 경로 없으면 안내.
  const dl = () => {
    if (!video?.finalPath) { toast("아직 다운로드할 최종본이 없습니다."); return; }
    storage.downloadAsset(storage.BUCKETS.final, video.finalPath, file, { action: "download", targetType: "video", targetId: video.id, partnerId: video.partnerId })
      .catch((e) => toast("다운로드 실패: " + e.message));
  };
  return (
    <Card title="추모영상">
      <div className="relative flex items-center justify-center overflow-hidden" style={{ aspectRatio: "16/9", background: "#2a323d", borderRadius: RADIUS }}>
        {published && preview ? (
          <video src={preview} controls playsInline preload="metadata" className="absolute inset-0 h-full w-full" style={{ background: "#000" }} />
        ) : published && preview === null && video?.finalPath ? (
          <span className="text-[12px]" style={{ color: "#aab2bf" }}>미리보기 불러오는 중…</span>
        ) : (
          <span className="text-[12px]" style={{ color: "#aab2bf" }}>{vlabel}</span>
        )}
      </div>
      {published ? (
        <div className="mt-2.5 flex items-center justify-between gap-2">
          <span className="min-w-0 truncate text-[11.5px] tabular-nums" style={{ color: MUTE, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{file}</span>
          <Btn size="sm" onClick={dl}><Download className="h-3.5 w-3.5" /> 다운로드</Btn>
        </div>
      ) : (
        <div className="mt-2.5 flex items-center justify-between gap-2">
          <span className="text-[11.5px]" style={{ color: FAINT }}>발행 완료 후 다운로드할 수 있습니다.</span>
          <Btn size="sm" variant="neutral" disabled><Download className="h-3.5 w-3.5" /> 다운로드</Btn>
        </div>
      )}
      <p className="mt-2 text-[11px]" style={{ color: FAINT }}>※ 영상 편집·컨펌은 관리자(HQ)에서 진행됩니다.{requestedAt ? ` 컨펌 요청 ${requestedAt}` : ""}</p>
    </Card>
  );
}

// ── 고객관리 상세 (예약 1건 드릴다운) — 파트너 예약상세와 동일한 레이아웃 ──
function CustomerDetail({ rid, onBack }) {
  const store = useStore();
  const { reservations } = store;
  const r = reservations.find((x) => x.id === rid);
  if (!r) return null;
  // 사업부별 세팅(termConfigs) 반영 — 파트너 콘솔과 동일하게 사업부 용어를 따른다(파트너 예약상세와 동일 표기).
  // 예약의 소속 파트너 사업부 기준(고객목록은 현재 사업부로 스코핑되므로 통상 store.bizUnit과 동일).
  const reservBiz = store.partners.find((p) => p.id === r.partnerId)?.bizUnit || store.bizUnit;
  const tp = (key) => term(store, key, "partner", reservBiz);
  // [QA-P1] 발행 링크·영상 = 실제 submission(목업 제거). origin은 보호자 접속 도메인.
  const sub = submissionFor(store, r.id);
  const link = sub ? {
    url: window.location.origin + "/u/" + sub.token,
    status: sub.status,
    issued: sub.createdAt ? String(sub.createdAt).slice(0, 10) : "—",
    expires: sub.expiresAt ? String(sub.expiresAt).slice(0, 10) : "—",
  } : null;
  // 최종 렌더본 파일명(발행 완료 건만 다운로드 — MemorialVideoCard에서 처리)
  const file = `${r.deceased}_추모영상.mp4`;
  // [접수 정보] 예약접수에서 캡처한 보호자·반려동물 실데이터 — 파트너 예약상세와 동일 카드(고객관리 진입 시에도 노출).
  const guardianInfo = [
    { label: tp("subject") + " 이름", value: r.deceased || "—" },
    { label: tp("breed"), value: r.breed || "—" },
    { label: "나이", value: r.age || "—" },
    { label: tp("guardian") + " 성함", value: r.chief || "—" },
    { label: "연락처", value: r.phone || "—" },
  ];
  return (
    <div>
      <PageHeader title={r.deceased} sub={r.partner + " · " + r.room + " · " + tp("guardian") + " " + r.chief} back={{ onClick: onBack, label: "뒤로" }}
        right={
          <div className="flex items-center gap-2">
            {videoTag(r.status)}
            {reservTag(r.status)}
          </div>
        } />

      <div className="grid grid-cols-2 gap-4">
        <Card title="예약 정보">
          <div className="space-y-2 text-[13px]" style={{ color: INK }}>
            <div className="flex gap-2"><span style={{ color: MUTE }}>{tp("subject")}</span><span style={{ fontFamily: SERIF, fontWeight: 700 }}>{r.deceased}</span></div>
            <div className="flex gap-2"><span style={{ color: MUTE }}>{tp("guardian")}</span><span>{r.chief}</span></div>
            <div className="flex gap-2"><span style={{ color: MUTE }}>연락처</span><span className="tabular-nums">{r.phone}</span></div>
            <div className="flex items-center gap-2"><span style={{ color: MUTE }}>{tp("room")}·일정</span><span className="inline-flex items-center">{r.room} · {r.date} <span className="ml-1 inline-flex items-center"><SlotText slot={r.slot} /></span></span></div>
            <div className="flex gap-2"><span style={{ color: MUTE }}>파트너사</span><span>{r.partner}</span></div>
            <div className="flex gap-2"><span style={{ color: MUTE }}>담당자</span><span>{r.assignee || "미배정"}</span></div>
            <div className="flex items-center gap-2"><span style={{ color: MUTE }}>영상</span>{videoTag(r.status)}</div>
          </div>
        </Card>
        <MemorialVideoCard status={r.status} file={file} requestedAt={r.requestedAt || "—"} video={videoFor(store, r.id)} />
      </div>

      <div className="mt-4">
        <Card title="🔗 발행 링크">
          {link ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex-1 truncate px-3 py-2 text-[13px] tabular-nums" style={{ background: "#f6f3ec", border: "1px solid " + LINE, borderRadius: RADIUS, color: GOLD_D }}>{link.url}</div>
                <CopyBtn text={link.url} />
                <span className="shrink-0 px-2 py-1 text-[11px] font-semibold" style={{ background: "#f4ead7", borderRadius: RADIUS, color: "#9a6a1c" }}>{SUB_LABEL[link.status] || link.status}</span>
              </div>
              <div className="mt-2 flex items-center gap-4 text-[11px]" style={{ color: FAINT }}>
                <span>발행일 <b style={{ color: MUTE }}>{link.issued}</b></span>
                <span>만료 <b style={{ color: MUTE }}>{link.expires}</b></span>
              </div>
            </div>
          ) : <div className="text-[12.5px]" style={{ color: FAINT }}>아직 발행된 링크가 없습니다.</div>}
        </Card>
      </div>

      <div className="mt-4">
        <Card title="📝 접수 정보 (보호자 · 반려동물)">
          <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-[13px]" style={{ color: INK }}>
            {guardianInfo.map((item, i) => (
              <div key={i} className="flex gap-2" style={{ gridColumn: item.value && item.value.length > 18 ? "span 2" : undefined }}>
                <span className="shrink-0" style={{ color: MUTE }}>{item.label}</span>
                <span>{item.value}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px]" style={{ color: FAINT }}>※ 예약 접수 시 입력된 정보입니다. 보호자가 제작 URL에서 추가 입력한 편지·사진은 편집기에서 확인됩니다.</p>
        </Card>
      </div>
      <p className="mt-3 text-[11px]" style={{ color: FAINT }}>※ 개인정보 수탁 — 보유기간·삭제 요청 워크플로(PIPA)는 메모리아웍스 확인 항목.</p>
    </div>
  );
}

export function Customers({ initialSel = null, account }) {
  const cols = CUSTOMER_COLS;
  const store = useStore(); // 목 DB — 고객관리 = 예약 spine 파생(발행·컨펌 상태 전파)
  // 현재 사업부 스코핑 — 소속 파트너사의 예약만(고객은 partner 이름으로 연결)
  const partners = store.partners.filter((p) => p.bizUnit === store.bizUnit);
  const bizIds = new Set(partners.map((p) => p.id));
  const reservations = store.reservations.filter((r) => bizIds.has(r.partnerId));
  const canDelete = account?.role === "master"; // 예약건 삭제는 관리자권한(마스터)만 가능
  const [partner, setPartner] = useState("전체"); // 선택된 파트너 필터(파트너 id 또는 "전체")
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(initialSel); // 상세 보기 중인 예약 id
  const [picked, setPicked] = useState(() => new Set()); // 선택 삭제용 체크된 예약 id
  // 대시보드 최근예약 등 외부에서 특정 예약으로 진입 시 동기화
  useEffect(() => { if (initialSel) setSel(initialSel); }, [initialSel]);
  const filtered = reservations
    .map(toCustomerRow)
    .filter((c) => partner === "전체" || c.partnerId === partner)
    .filter((c) => matchQuery(q, c.chief, c.deceased, c.phone));
  const { rows, sort, onSortChange } = useTableSort(filtered, { key: "date", dir: "desc", value: customerSortValue });

  // 현재 보이는 행에 한해 선택 유지 (필터·검색으로 사라진 선택은 자동 정리)
  const visibleIds = useMemo(() => new Set(rows.map((r) => r.id)), [rows]);
  const pickedVisible = [...picked].filter((id) => visibleIds.has(id));
  const toggle = (id) => setPicked((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setPicked((prev) => {
    const n = new Set(prev);
    const allOn = rows.length > 0 && rows.every((r) => n.has(r.id));
    rows.forEach((r) => (allOn ? n.delete(r.id) : n.add(r.id)));
    return n;
  });
  const deletePicked = async () => {
    const ids = pickedVisible;
    if (!ids.length) return;
    const names = ids.map((id) => reservations.find((r) => r.id === id)?.deceased).filter(Boolean);
    const preview = names.slice(0, 3).join(", ") + (names.length > 3 ? ` 외 ${names.length - 3}건` : "");
    if (!(await confirm({ title: "예약 삭제", message: `${preview} — 총 ${ids.length}건의 예약을 삭제합니다.\n삭제 후 되돌릴 수 없습니다.`, danger: true, confirmLabel: "삭제" }))) return;
    actions.removeReservations(ids);
    setPicked(new Set());
    toast(`${ids.length}건의 예약을 삭제했습니다`);
  };

  if (sel) return <CustomerDetail rid={sel} onBack={() => setSel(null)} />;
  return (
    <div>
      <PageHeader title="고객관리" sub="전 파트너사 보호자·반려동물 정보 · 예약 이력" right={
        <div className="flex items-center px-3" style={{ height: 36, width: 232, background: SURFACE, border: "1px solid " + LINE, borderRadius: RADIUS }}>
          <Search className="h-4 w-4" style={{ color: FAINT }} strokeWidth={1.9} />
          <input value={q} onChange={(e) => setQ(e.target.value)} className="ml-2 w-full bg-transparent text-[13px] outline-none" placeholder="보호자·반려동물·연락처 검색" style={{ color: INK }} />
        </div>
      } />
      <div className="mb-3 flex items-center gap-2">
        <SearchSelect value={partner} onChange={setPartner} placeholder="전체 파트너사"
          options={[{ value: "전체", label: "전체 파트너사" }, ...partners.map((p) => ({ value: p.id, label: p.name }))]} />
        <span className="text-[12px]" style={{ color: FAINT }}>{rows.length}건</span>
        {canDelete && pickedVisible.length > 0 && (
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[12px] font-semibold" style={{ color: MUTE }}>{pickedVisible.length}건 선택</span>
            <button onClick={deletePicked}
              className="inline-flex items-center gap-1.5 px-3 text-[12.5px] font-bold text-white outline-none transition hover:opacity-90 focus-visible:ring-1"
              style={{ height: 34, background: "#a85d4a", border: "none", borderRadius: RADIUS }}>
              <Trash2 className="h-3.5 w-3.5" /> 선택 삭제
            </button>
          </div>
        )}
      </div>
      <Table cols={cols} rows={rows} onRowClick={(r) => setSel(r.id)} renderCell={renderCustomerCell} sort={sort} onSortChange={onSortChange}
        select={canDelete ? { selected: picked, onToggle: toggle, onToggleAll: toggleAll } : undefined} />
      <p className="mt-3 text-[11px]" style={{ color: FAINT }}>※ 개인정보 수탁 — 보유기간·삭제 요청 워크플로(PIPA)는 메모리아웍스 확인 항목.{canDelete ? " 예약 삭제는 마스터 관리자 권한에서만 가능합니다." : ""}</p>
    </div>
  );
}

