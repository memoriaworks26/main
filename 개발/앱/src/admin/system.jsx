// [시스템·총관리자] 사이니지(Signage) + 스토리지/기간 다운로드(Storage).
import React, { useState, useEffect } from "react";
import {
  AlertTriangle, CheckSquare, Clapperboard, ChevronDown, ChevronUp, ChevronsUpDown, Download, HardDrive, Plus, RefreshCw, Square, Trash2,
} from "lucide-react";
import { SURFACE, LINE, LINE2, GOLD, GOLD_D, GOLD_SOFT, INK, MUTE, FAINT, STATUS, RADIUS } from "../theme.js";
import { Tag, Btn, Card, Table, PageHeader, DateField, CopyBtn, Modal, useTableSort } from "../ui.jsx";
import { toast } from "../toast.jsx";
import { confirm } from "../confirm.jsx";
import { useStore, actions } from "../store.js";
import * as D from "../data.js";
import * as storage from "../lib/storage.js";
import { SearchSelect } from "./shared.jsx";

export function Signage() {
  const { devices, bizUnits, partners } = useStore();
  const [bf, setBf] = useState("all");   // 사업부 필터
  const [pf, setPf] = useState("all");   // 파트너사 필터
  const [reg, setReg] = useState(false); // 등록 모달
  const [sel, setSel] = useState(null);  // 관리 모달 대상 디바이스

  // 디바이스 → 파트너 레코드(id 기준 — 동명 파트너사 오매칭 방지). partnerId 없을 때만(목업/레거시) 이름 폴백.
  const partnerOf = (d) => d.partnerId ? partners.find((p) => p.id === d.partnerId) : partners.find((p) => p.name === d.partner);
  const partnerOpts = bf === "all" ? partners : partners.filter((p) => p.bizUnit === bf);
  const filtered = devices.filter((d) => {
    const p = partnerOf(d);
    if (bf !== "all" && (!p || p.bizUnit !== bf)) return false;
    if (pf !== "all" && (!p || p.id !== pf)) return false;
    return true;
  });
  const { rows, sort, onSortChange } = useTableSort(filtered);
  const online = filtered.filter((d) => d.status !== "offline" && d.status !== "pending").length;
  const cols = [
    { key: "partner", label: "파트너사", sortable: true }, { key: "id", label: "디바이스", sortable: true }, { key: "room", label: "호실", sortable: true },
    { key: "status", label: "상태", sortable: true }, { key: "playing", label: "표출 중", sortable: true },
    { key: "ip", label: "IP", sortable: true }, { key: "act", label: "", align: "right" },
  ];
  return (
    <div>
      <PageHeader title="사이니지" sub="사업부·파트너사별 라즈베리파이 디바이스 등록·매핑·재생·온라인 (udev·systemd · 네트워크 독립)"
        right={<div className="flex gap-1.5">
          <Btn size="sm" variant="ghost" onClick={() => actions.refreshDevices()}><RefreshCw className="h-3.5 w-3.5" /> 상태 새로고침</Btn>
          <Btn size="sm" onClick={() => setReg(true)}><Plus className="h-3.5 w-3.5" /> 디바이스 등록</Btn>
        </div>} />
      <div className="mb-3 flex items-center gap-2">
        <SearchSelect value={bf} onChange={(v) => { setBf(v); setPf("all"); }} placeholder="전체 사업부"
          options={[{ value: "all", label: "전체 사업부" }, ...bizUnits.map((b) => ({ value: b.id, label: b.name }))]} />
        <SearchSelect value={pf} onChange={setPf} placeholder="전체 파트너사"
          options={[{ value: "all", label: "전체 파트너사" }, ...partnerOpts.map((p) => ({ value: p.id, label: p.name }))]} />
        <span className="ml-auto text-[12px]" style={{ color: MUTE }}>온라인 <b style={{ color: STATUS.online.c }}>{online}</b> / {rows.length}</span>
      </div>
      <Table cols={cols} rows={rows} sort={sort} onSortChange={onSortChange} renderCell={(r, k) =>
        k === "status" ? <Tag s={r.status === "pending" ? "standby" : r.status} label={r.status === "pending" ? "등록대기" : undefined} /> :
        k === "act" ? <button onClick={() => setSel(r)} className="text-[12px] font-semibold" style={{ color: GOLD }}>관리</button> :
        k === "partner" ? <span className="font-semibold" style={{ color: INK }}>{r.partner}</span> :
        k === "playing" ? (r.enrolled ? r.playing : <span style={{ color: FAINT }}>등록대기 · 코드 {r.enrollCode || "—"}</span>) :
        k === "ip" ? <span className="tabular-nums">{r.ip || "—"}</span> : r[k]
      } />
      <p className="mt-3 text-[11px]" style={{ color: FAINT }}>※ 디바이스 등록 시 발급되는 코드를 SD의 <span style={{ fontFamily: "ui-monospace, monospace" }}>provision.json</span>에 넣으면 첫 부팅에 자동 등록됩니다.</p>
      <RegisterModal open={reg} onClose={() => setReg(false)} />
      <DeviceModal dev={sel} onClose={() => setSel(null)} />
    </div>
  );
}

// 라벨 + 입력 한 줄
function Row({ label, children }) {
  return (
    <label className="block">
      <span className="text-[11.5px] font-semibold" style={{ color: MUTE }}>{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
const inputCls = "w-full px-3 text-[13px] outline-none focus-visible:ring-1";
const inputSty = { height: 36, background: SURFACE, border: "1px solid " + LINE, borderRadius: RADIUS, color: INK };

// 파이가 붙을 엣지함수 베이스 주소(설정파일에 박음). 목업/미설정 시 자리표시자.
const FUNCTIONS_BASE = (import.meta.env.VITE_SUPABASE_URL || "https://<프로젝트>.supabase.co") + "/functions/v1";
// provision.json 다운로드 — SD카드 루트에 넣으면 첫 부팅에 파이가 읽어 자동 등록.
//   wifi는 비워두면(랜선/화면설정) 무시, 미리 알면 채워서 출고 가능.
function downloadProvision(dev, code) {
  const cfg = { device: dev.id, code, server: FUNCTIONS_BASE, wifi: { ssid: "", password: "" } };
  const blob = new Blob([JSON.stringify(cfg, null, 2)], { type: "application/json" });
  const href = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href; a.download = "provision.json"; a.click();
  setTimeout(() => window.URL.revokeObjectURL(href), 1000);
}

// 세팅 가이드 — 새 파이 받고 식장 재생까지 단계(랜선/와이파이 자동). 설정파일 다운로드 포함.
function SetupGuide({ dev, code }) {
  const steps = [
    "메모리아웍스 마스터 SD이미지를 SD카드에 굽습니다. (출고 전 1회 · 재사용)",
    "아래 설정파일(provision.json)을 받아 SD카드 루트에 복사합니다.",
    "SD를 파이에 꽂고 모니터(HDMI)·전원을 연결합니다.",
    "랜선이 있으면 꽂습니다. 없으면 전원만 — 첫 화면 안내대로 폰으로 와이파이를 입력합니다.",
    "잠시 후 자동 등록되어 재생이 시작됩니다. 아래 상태가 '온라인'으로 바뀌면 완료.",
  ];
  return (
    <div className="mt-3">
      <div className="mb-1.5 text-[11px] font-semibold" style={{ color: FAINT }}>세팅 방법 (랜선·와이파이 자동 인식)</div>
      <ol className="space-y-1 text-[12px]" style={{ color: MUTE }}>
        {steps.map((s, i) => (
          <li key={i} className="flex gap-2">
            <span className="flex h-4 w-4 shrink-0 items-center justify-center text-[10px] font-bold" style={{ borderRadius: 3, background: GOLD_SOFT, color: GOLD_D }}>{i + 1}</span>
            <span className="leading-snug">{s}</span>
          </li>
        ))}
      </ol>
      {code && (
        <button onClick={() => downloadProvision(dev, code)} className="mt-2.5 flex items-center gap-1.5 px-3 py-2 text-[12px] font-semibold"
          style={{ borderRadius: RADIUS, border: "1px solid " + LINE2, color: INK }}>
          <Download className="h-3.5 w-3.5" /> 설정파일(provision.json) 다운로드
        </button>
      )}
    </div>
  );
}

// 디바이스 등록 모달 — 사업부→파트너사→호실 캐스케이드 + 등록코드 발급
function RegisterModal({ open, onClose }) {
  const { bizUnits, partners } = useStore();
  const [biz, setBiz] = useState("");
  const [pid, setPid] = useState("");
  const [rooms, setRooms] = useState([]);
  const [roomId, setRoomId] = useState("");
  const [devId, setDevId] = useState("");
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState("");

  useEffect(() => { if (!open) { setBiz(""); setPid(""); setRooms([]); setRoomId(""); setDevId(""); setBusy(false); setCode(""); } }, [open]);
  useEffect(() => { setPid(""); setRooms([]); setRoomId(""); }, [biz]);
  useEffect(() => {
    if (!pid) { setRooms([]); setRoomId(""); return; }
    let alive = true;
    actions.fetchPartnerRooms(pid).then((r) => { if (alive) setRooms(r); }).catch(() => {});
    return () => { alive = false; };
  }, [pid]);

  const bizPartners = biz ? partners.filter((p) => p.bizUnit === biz) : [];
  const submit = async () => {
    if (!devId.trim()) return toast("디바이스 ID를 입력하세요 (예: RPI-0441)");
    if (!pid) return toast("파트너사를 선택하세요");
    setBusy(true);
    try { setCode(await actions.registerDevice({ id: devId.trim().toUpperCase(), partnerId: pid, roomId: roomId || null })); }
    catch (e) { toast(e.message || "등록 실패"); }
    finally { setBusy(false); }
  };

  return (
    <Modal open={open} onClose={onClose} width={420}>
      <div className="p-4">
        {code ? (
          <div>
            <div className="text-[14px] font-bold" style={{ color: INK }}>등록 완료</div>
            <p className="mt-1 text-[12px] leading-relaxed" style={{ color: MUTE }}>아래 등록코드를 디바이스 SD의 <span style={{ fontFamily: "ui-monospace, monospace" }}>provision.json</span>에 넣으면 첫 부팅에 자동 등록됩니다. <b>24시간 유효</b>.</p>
            <div className="mt-3 flex items-center justify-between px-3 py-3" style={{ background: GOLD_SOFT, border: "1px solid " + LINE, borderRadius: RADIUS }}>
              <span className="font-bold tracking-[0.2em]" style={{ fontFamily: "ui-monospace, monospace", fontSize: 20, color: GOLD_D }}>{code}</span>
              <CopyBtn text={code} />
            </div>
            <SetupGuide dev={{ id: devId.trim().toUpperCase() }} code={code} />
            <div className="mt-4 flex justify-end"><Btn size="sm" onClick={onClose}>닫기</Btn></div>
          </div>
        ) : (
          <div>
            <div className="text-[14px] font-bold" style={{ color: INK }}>디바이스 등록</div>
            <p className="mt-1 text-[12px]" style={{ color: MUTE }}>사업부 → 파트너사 → 호실을 고르면 등록코드가 발급됩니다.</p>
            <div className="mt-3 space-y-2.5">
              <Row label="디바이스 ID"><input value={devId} onChange={(e) => setDevId(e.target.value)} placeholder="RPI-0441" className={inputCls} style={inputSty} /></Row>
              <Row label="사업부"><SearchSelect value={biz} onChange={setBiz} placeholder="사업부 선택" width="100%" options={bizUnits.map((b) => ({ value: b.id, label: b.name }))} /></Row>
              <Row label="파트너사"><SearchSelect value={pid} onChange={setPid} placeholder={biz ? "파트너사 선택" : "사업부 먼저 선택"} width="100%" options={bizPartners.map((p) => ({ value: p.id, label: p.name }))} /></Row>
              <Row label="호실 (선택)"><SearchSelect value={roomId} onChange={setRoomId} placeholder={pid ? "호실 선택" : "파트너사 먼저 선택"} width="100%" options={rooms.map((r) => ({ value: r.id, label: r.name }))} /></Row>
            </div>
            <div className="mt-4 flex justify-end gap-1.5">
              <Btn size="sm" variant="ghost" onClick={onClose}>취소</Btn>
              <Btn size="sm" onClick={submit} disabled={busy}>{busy ? "등록 중…" : "등록"}</Btn>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

// 명령 버튼(작은 테두리 버튼)
function CmdBtn({ label, onClick, color = INK }) {
  return (
    <button onClick={onClick} className="py-2 text-[12px] font-semibold outline-none transition focus-visible:ring-1"
      style={{ borderRadius: RADIUS, border: "1px solid " + LINE2, color }}>{label}</button>
  );
}

// 웹 화면 링크 — 이 디바이스를 브라우저(웹) 디스플레이로 쓸 링크 발급·열기·복사.
function WebDisplayLink({ id }) {
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState(null);
  const issue = async () => {
    setBusy(true);
    try {
      const url = await actions.issueDeviceWebLink(id);
      setLink(url);
      window.open(url, "_blank", "noopener");
      toast("웹 화면 링크 발급 — 새 탭에서 열렸습니다");
    } catch (e) { toast(e.message || "발급 실패"); }
    finally { setBusy(false); }
  };
  return (
    <div className="mt-4">
      <div className="mb-1.5 text-[11px] font-semibold" style={{ color: FAINT }}>웹 화면(브라우저를 호실 TV로)</div>
      <div className="flex items-center gap-1.5">
        <button onClick={issue} disabled={busy} className="flex flex-1 items-center justify-center gap-1.5 py-2 text-[12px] font-bold outline-none transition focus-visible:ring-1"
          style={{ borderRadius: RADIUS, border: "1.5px solid " + GOLD, color: busy ? FAINT : GOLD_D, background: GOLD_SOFT }}>
          <Clapperboard className="h-3.5 w-3.5" /> {busy ? "발급 중…" : "웹 화면 링크 발급·열기"}
        </button>
        {link && <CopyBtn text={link} />}
      </div>
      {link && <div className="mt-1.5 truncate text-[11px]" style={{ color: FAINT, fontFamily: "ui-monospace, monospace" }} title={link}>{link}</div>}
      <div className="mt-1 text-[11px]" style={{ color: FAINT }}>※ 발급 시 기존 토큰(파이/이전 웹)은 해제됩니다. 호실 TV 브라우저에서 열면 자동 전체화면.</div>
    </div>
  );
}

// 디바이스 관리 모달 — 세팅 가이드·등록코드·명령(재시작/재부팅/새로고침/재다운로드)·재발급·폐기
function DeviceModal({ dev, onClose }) {
  const devices = useStore().devices;
  const live = dev ? devices.find((d) => d.id === dev.id) || dev : null;   // 스토어 최신값(상태 실시간 반영)
  const pending = !!live && !live.enrolled;
  // 등록대기 동안 5초마다 조용히 리페치 → 파이가 켜지면 '온라인'으로 자동 전환되는 걸 지켜봄.
  useEffect(() => {
    if (!dev || !pending) return;
    const t = setInterval(() => actions.refreshDevices(true), 5000);
    return () => clearInterval(t);
  }, [dev, pending]);
  if (!dev || !live) return null;

  const cmd = (c) => actions.sendDeviceCommand(live.id, c);
  const reissue = async () => { try { toast("새 등록코드: " + await actions.issueDeviceEnroll(live.id)); } catch (e) { toast(e.message); } };
  const revoke = async () => {
    if (!await confirm(live.id + " 디바이스를 폐기할까요? 토큰이 무효화되어 재등록이 필요합니다.")) return;
    try { await actions.revokeDevice(live.id); toast(live.id + " 폐기했습니다"); onClose(); } catch (e) { toast(e.message); }
  };
  return (
    <Modal open={!!dev} onClose={onClose} width={400}>
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="text-[14px] font-bold" style={{ color: INK }}>{live.id}</div>
          <Tag s={live.status === "pending" ? "standby" : live.status} label={live.status === "pending" ? "등록대기" : undefined} />
        </div>
        <div className="mt-0.5 text-[12px]" style={{ color: MUTE }}>{live.partner} · {live.room || "호실 미지정"}</div>

        {(live.hwSerial || live.model || live.ip || live.mac) && (
          <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-0.5 px-2.5 py-2 text-[11.5px]" style={{ background: "#faf8f4", border: "1px solid " + LINE, borderRadius: RADIUS, color: MUTE }}>
            {live.model && <div>모델 <span style={{ color: INK }}>{live.model}</span></div>}
            {live.ip && <div>IP <span className="tabular-nums" style={{ color: INK }}>{live.ip}</span></div>}
            {live.hwSerial && <div className="col-span-2">시리얼 <span style={{ fontFamily: "ui-monospace, monospace", color: INK }}>{live.hwSerial}</span></div>}
            {live.mac && <div className="col-span-2">MAC <span style={{ fontFamily: "ui-monospace, monospace", color: INK }}>{live.mac}</span></div>}
          </div>
        )}

        {pending ? (
          // 미등록 — 세팅 안내 + 등록코드 + (대기 중 자동 확인)
          <>
            {live.enrollCode && (
              <div className="mt-3 flex items-center justify-between px-3 py-2.5" style={{ background: GOLD_SOFT, border: "1px solid " + LINE, borderRadius: RADIUS }}>
                <div>
                  <div className="text-[11px]" style={{ color: MUTE }}>등록 대기 — provision.json 코드 (24h)</div>
                  <span className="font-bold tracking-[0.15em]" style={{ fontFamily: "ui-monospace, monospace", fontSize: 16, color: GOLD_D }}>{live.enrollCode}</span>
                </div>
                <CopyBtn text={live.enrollCode} />
              </div>
            )}
            <SetupGuide dev={live} code={live.enrollCode} />
            <div className="mt-2 flex items-center gap-1.5 text-[11px]" style={{ color: FAINT }}>
              <RefreshCw className="h-3 w-3 animate-spin" /> 파이가 켜지면 자동으로 ‘온라인’으로 바뀝니다 (자동 확인 중)
            </div>
            <WebDisplayLink id={live.id} />
            <div className="mt-3 flex justify-between">
              <CmdBtn label="등록코드 재발급" onClick={reissue} />
              <Btn size="sm" variant="ghost" onClick={onClose}>닫기</Btn>
            </div>
          </>
        ) : (
          // 등록 완료 — 명령·프로비저닝
          <>
            <div className="mt-4 mb-1.5 text-[11px] font-semibold" style={{ color: FAINT }}>명령 (다음 동기화에 디바이스가 실행)</div>
            <div className="grid grid-cols-2 gap-1.5">
              <CmdBtn label="플레이어 재시작" onClick={() => cmd("restart")} color={STATUS.online.c} />
              <CmdBtn label="장비 재부팅" onClick={() => cmd("reboot")} color={STATUS.review.c} />
              <CmdBtn label="강제 새로고침" onClick={() => cmd("refresh")} />
              <CmdBtn label="영상 재다운로드" onClick={() => cmd("redownload")} />
            </div>
            <div className="mt-4 mb-1.5 text-[11px] font-semibold" style={{ color: FAINT }}>프로비저닝</div>
            <div className="flex gap-1.5">
              <CmdBtn label="등록코드 재발급" onClick={reissue} />
              <CmdBtn label="디바이스 폐기" onClick={revoke} color="#a4564b" />
            </div>
            <WebDisplayLink id={live.id} />
            <div className="mt-4 flex justify-end"><Btn size="sm" variant="ghost" onClick={onClose}>닫기</Btn></div>
          </>
        )}
      </div>
    </Modal>
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

  const partnerOpts = [{ value: "all", label: "전체 파트너사" }, ...partners.map((p) => ({ value: p.id, label: p.name }))];
  const rows = videos
    .filter((v) => (partner === "all" || v.partnerId === partner) && (!from || v.date >= from) && (!to || v.date <= to))
    .sort((a, b) => String(b.datetime).localeCompare(String(a.datetime)));

  const ids = rows.map((r) => r.id);
  const allOn = ids.length > 0 && ids.every((id) => sel.has(id));
  const toggle = (id) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSel((s) => { const n = new Set(s); allOn ? ids.forEach((id) => n.delete(id)) : ids.forEach((id) => n.add(id)); return n; });
  // 실삭제 — DB 행 + 스토리지 파일(store 액션). 목록은 store.videos 갱신으로 자동 반영.
  const removeIds = (delIds) => {
    actions.removeVideos(delIds);
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
  // [QA] 클래스별 용량·개수 실측 — final(최종본)·source(원본)는 videos에서 집계. temp(중간 산출물)는 미추적(—).
  const gb = (mb) => +(mb / 1024).toFixed(1);
  const stat = {
    final: { gb: gb(videos.reduce((a, v) => a + (v.sizeMB || 0), 0)), files: videos.filter((v) => v.finalPath || v.sizeMB).length },
    source: { gb: gb(videos.reduce((a, v) => a + (v.srcMB || 0), 0)), files: videos.filter((v) => v.srcMB || v.sourcePath).length },
  };
  const setRet = (key, retention) => actions.setRetention(key, retention);

  return (
    <div>
      <PageHeader title="스토리지" sub="Cloudflare R2 — 자산 보존 정책 · 기간별 선택 다운로드 (egress 0 · 서명 URL)" right={<Btn size="sm" variant="ghost" onClick={() => actions.refreshStorage()}><RefreshCw className="h-3.5 w-3.5" /> 사용량 새로고침</Btn>} />

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
          const st = stat[c.key];  // final/source는 실측, 그 외(temp)는 미추적
          return (
            <div key={c.key} className="flex flex-col px-4 py-3.5" style={{ background: SURFACE, border: "1px solid " + LINE, borderRadius: RADIUS }}>
              <div className="text-[13px] font-bold" style={{ color: INK }}>{c.name}</div>
              <div className="mt-0.5 text-[11.5px]" style={{ color: FAINT }}>{c.desc}</div>
              <div className="mt-2 text-[12px]" style={{ color: MUTE }}>{st ? `${st.gb} GB · ` : ""}<span className="tabular-nums">{st ? st.files.toLocaleString() + "개" : "사용량 미추적"}</span></div>
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
                <Download className="h-3.5 w-3.5" /> 백업 다운로드 ({st ? st.gb : "—"} GB)
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

