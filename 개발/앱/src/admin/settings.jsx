// [환경설정] 내 설정·비밀번호 재설정·계정/권한·시스템 설정.
import React, { useState } from "react";
import {
  Check, KeyRound, Lock, Plus, RefreshCw, RotateCcw, Settings, ShieldCheck, Trash2, User, UserPlus, X,
} from "lucide-react";
import { SURFACE, LINE, LINE2, GOLD, GOLD_D, GOLD_SOFT, INK, MUTE, FAINT, RADIUS } from "../theme.js";
import { Tag, Btn, Card, Table, PageHeader, PwField } from "../ui.jsx";
import { toast } from "../toast.jsx";
import { useStore, actions } from "../store.js";
import * as D from "../data.js";

export function SettingsView() {
  return (
    <div>
      <PageHeader title="환경설정" sub="관리자 전용 — 회사 정보" />
      <div className="grid grid-cols-2 gap-4">
        <Card title="공급자 정보 (거래명세서 자동 삽입)">
          <div className="space-y-2 text-[13px]" style={{ color: INK }}>
            <div className="flex justify-between"><span style={{ color: MUTE }}>상호</span><span className="font-semibold">{D.COMPANY.name}</span></div>
            <div className="flex justify-between"><span style={{ color: MUTE }}>대표자</span><span>{D.COMPANY.ceo}</span></div>
            <div className="flex justify-between"><span style={{ color: MUTE }}>사업자번호</span><span className="tabular-nums">{D.COMPANY.biz}</span></div>
            <div className="flex justify-between"><span style={{ color: MUTE }}>업태/종목</span><span className="text-right">{D.COMPANY.type}</span></div>
          </div>
        </Card>
        <Card title="결제 계좌 · 도장">
          <div className="space-y-2 text-[13px]" style={{ color: INK }}>
            <div className="flex justify-between"><span style={{ color: MUTE }}>은행</span><span>{D.COMPANY.bank}</span></div>
            <div className="flex justify-between"><span style={{ color: MUTE }}>계좌</span><span className="tabular-nums">{D.COMPANY.account}</span></div>
            <div className="flex justify-between"><span style={{ color: MUTE }}>예금주</span><span>{D.COMPANY.holder}</span></div>
            <div className="flex items-center justify-between"><span style={{ color: MUTE }}>도장 등록</span><Btn size="sm" variant="ghost" onClick={() => toast("도장 이미지가 업로드되었습니다")}><Plus className="h-3.5 w-3.5" /> 업로드</Btn></div>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ── 내 설정 (모든 계정 공용 — 작업자도 본인 비밀번호 재설정 가능) ────
function PasswordResetModal({ account, onClose }) {
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);

  const tooShort = next.length > 0 && next.length < 8;
  const mismatch = confirm.length > 0 && next !== confirm;
  const canSubmit = cur.trim() && next.length >= 8 && next === confirm;
  const submit = () => { if (canSubmit) setDone(true); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(20,26,36,.46)" }} onClick={onClose}>
      <div className="w-full" style={{ maxWidth: 420, background: SURFACE, border: "1px solid " + LINE, borderRadius: 10, boxShadow: "0 24px 64px rgba(0,0,0,.28)" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5" style={{ height: 50, borderBottom: "1px solid " + LINE }}>
          <span className="flex items-center gap-2 text-[14px] font-bold" style={{ color: INK }}>
            <KeyRound className="h-4 w-4" style={{ color: GOLD_D }} /> 비밀번호 재설정
          </span>
          <button onClick={onClose} className="p-1" style={{ color: FAINT }} aria-label="닫기"><X className="h-4 w-4" /></button>
        </div>

        {done ? (
          <div className="px-5 py-7 text-center">
            <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full" style={{ background: GOLD_SOFT }}>
              <Check className="h-6 w-6" strokeWidth={2.4} style={{ color: GOLD_D }} />
            </span>
            <div className="text-[14px] font-bold" style={{ color: INK }}>비밀번호가 변경되었습니다</div>
            <p className="mt-1.5 text-[12px]" style={{ color: MUTE }}>다음 로그인부터 새 비밀번호를 사용하세요. (목업)</p>
            <div className="mt-5"><Btn size="sm" onClick={onClose}>확인</Btn></div>
          </div>
        ) : (
          <div className="px-5 py-4">
            <div className="mb-3 flex items-center gap-2 px-3 py-2 text-[12px]" style={{ background: "#f6f3ec", border: "1px solid " + LINE, borderRadius: RADIUS, color: MUTE }}>
              <User className="h-3.5 w-3.5" style={{ color: FAINT }} /> {account.name} · <span className="tabular-nums">{account.loginId}</span>
            </div>
            <div className="space-y-3">
              <PwField label="현재 비밀번호" value={cur} onChange={setCur} placeholder="현재 비밀번호" autoFocus />
              <div>
                <PwField label="새 비밀번호" value={next} onChange={setNext} placeholder="영문·숫자 포함 8자 이상" />
                {tooShort && <p className="mt-1 text-[11px]" style={{ color: "#8a4b1c" }}>※ 비밀번호는 8자 이상이어야 합니다.</p>}
              </div>
              <div>
                <PwField label="새 비밀번호 확인" value={confirm} onChange={setConfirm} placeholder="새 비밀번호 다시 입력" />
                {mismatch && <p className="mt-1 text-[11px]" style={{ color: "#8a4b1c" }}>※ 새 비밀번호가 일치하지 않습니다.</p>}
              </div>
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <Btn size="sm" variant="neutral" onClick={onClose}>취소</Btn>
              <Btn size="sm" onClick={submit} disabled={!canSubmit}><Check className="h-4 w-4" /> 변경</Btn>
            </div>
            <p className="mt-3 text-[11px]" style={{ color: FAINT }}>※ 보안을 위해 8자 이상 · 영문과 숫자를 섞어 설정하세요.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function MySettings({ account }) {
  const [pwOpen, setPwOpen] = useState(false);
  const role = D.ADMIN_ROLES[account.role];
  return (
    <div>
      <PageHeader title="내 설정" sub="내 계정 정보 · 비밀번호 관리" />
      <div className="max-w-md space-y-4">
        <Card title="계정 정보">
          <div className="space-y-2.5 text-[13px]" style={{ color: INK }}>
            <div className="flex gap-6"><span className="w-16 shrink-0" style={{ color: MUTE }}>이름</span><span className="font-semibold">{account.name}</span></div>
            <div className="flex gap-6"><span className="w-16 shrink-0" style={{ color: MUTE }}>아이디</span><span className="tabular-nums">{account.loginId}</span></div>
            <div className="flex gap-6"><span className="w-16 shrink-0" style={{ color: MUTE }}>이메일</span><span>{account.email}</span></div>
            <div className="flex gap-6"><span className="w-16 shrink-0" style={{ color: MUTE }}>역할</span><span className="font-semibold" style={{ color: account.role === "master" ? GOLD_D : INK }}>{role.label}</span></div>
            <div className="flex gap-6"><span className="w-16 shrink-0" style={{ color: MUTE }}>최근 접속</span><span>{account.lastLogin}</span></div>
          </div>
        </Card>

        <Card title="보안">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ background: GOLD_SOFT }}><KeyRound className="h-4 w-4" style={{ color: GOLD_D }} /></span>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold" style={{ color: INK }}>비밀번호</div>
              <div className="text-[12px]" style={{ color: MUTE }}>주기적으로 변경하면 계정을 더 안전하게 보호할 수 있어요.</div>
              <div className="mt-3"><Btn size="sm" variant="ghost" onClick={() => setPwOpen(true)}><RotateCcw className="h-3.5 w-3.5" /> 비밀번호 재설정</Btn></div>
            </div>
          </div>
        </Card>
      </div>

      {pwOpen && <PasswordResetModal account={account} onClose={() => setPwOpen(false)} />}
    </div>
  );
}

export function AccountsManage({ account }) {
  const { accounts } = useStore();
  const isMaster = account.role === "master";
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [loginId, setLoginId] = useState("");
  const [pw, setPw] = useState("");
  const [editId, setEditId] = useState(null); // 권한 편집 중인 작업자

  // 초기 비밀번호 자동생성 (목업 — 영문+숫자 8자리)
  const genPw = () => {
    const c = "abcdefghijkmnpqrstuvwxyz23456789";
    setPw(Array.from({ length: 8 }, () => c[Math.floor(Math.random() * c.length)]).join(""));
  };

  const stTag = { active: { s: "online", label: "활성" }, invited: { s: "waiting", label: "초대됨" }, disabled: { s: "offline", label: "비활성" } };
  const roleBadge = (role) => (
    <span className="inline-flex items-center gap-1 px-2 py-[3px] text-[11px] font-semibold" style={{ borderRadius: 3, background: role === "master" ? GOLD_SOFT : "#eceef0", color: role === "master" ? GOLD_D : "#5a6470" }}>
      {role === "master" ? <ShieldCheck className="h-3 w-3" /> : <User className="h-3 w-3" />} {D.ADMIN_ROLES[role].label}
    </span>
  );

  const idTaken = accounts.some((a) => a.loginId === loginId.trim());
  const canAdd = name.trim() && loginId.trim() && pw.trim() && !idTaken;
  const addWorker = () => {
    if (!canAdd) return;
    actions.addAccount({ id: "u-" + Date.now(), name: name.trim(), role: "worker", loginId: loginId.trim(), email: "—", status: "invited", lastLogin: "—", perms: [...D.DEFAULT_WORKER_PERMS] });
    setName(""); setLoginId(""); setPw(""); setAdding(false);
  };
  const removeAcct = (id) => { actions.removeAccount(id); if (editId === id) setEditId(null); };
  // 비밀번호 재설정 (목업) — 초기 비밀번호로 초기화 → 첫 로그인 시 변경
  const resetPw = (r) => window.alert(`${r.name}(${r.loginId}) 계정의 비밀번호가 초기 비밀번호로 초기화되었습니다.\n첫 로그인 시 비밀번호 변경이 필요합니다. (목업)`);
  const togglePerm = (id, key) => actions.toggleAccountPerm(id, key);
  const setAllPerms = (id, on) => actions.setAccountPerms(id, on ? [...D.GRANTABLE_PERMS] : []);

  const editing = editId ? accounts.find((a) => a.id === editId) : null;

  const cols = [
    { key: "name", label: "이름" }, { key: "loginId", label: "아이디" }, { key: "role", label: "역할" }, { key: "perms", label: "권한" },
    { key: "status", label: "상태" }, { key: "lastLogin", label: "최근 접속" }, { key: "act", label: "", align: "right" },
  ];
  return (
    <div>
      <PageHeader title="계정·권한" sub="마스터 = 풀 액세스 · 작업자 = 마스터가 선택한 권한만"
        right={isMaster ? <Btn size="sm" onClick={() => setAdding((v) => !v)}><UserPlus className="h-4 w-4" /> 작업자 추가</Btn> : null} />

      {!isMaster && (
        <div className="mb-3 flex items-center gap-2 px-3 py-2.5 text-[12.5px]" style={{ background: "#f6f3ec", border: "1px solid " + LINE, borderRadius: RADIUS, color: MUTE }}>
          <Lock className="h-4 w-4" style={{ color: FAINT }} /> 계정·권한 관리는 마스터 관리자 전용입니다.
        </div>
      )}

      {isMaster && adding && (
        <div className="mb-3 px-4 py-3.5" style={{ background: SURFACE, border: "1px solid " + LINE, borderRadius: RADIUS }}>
          <div className="flex items-end gap-2">
            <label className="flex-1"><div className="mb-1 text-[12px] font-semibold" style={{ color: MUTE }}>이름</div>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="작업자 이름" className="w-full px-3 text-[13px] outline-none" style={{ height: 36, background: "#fff", border: "1px solid " + LINE2, borderRadius: RADIUS, color: INK }} /></label>
            <label className="flex-1"><div className="mb-1 text-[12px] font-semibold" style={{ color: MUTE }}>아이디</div>
              <input value={loginId} onChange={(e) => setLoginId(e.target.value)} placeholder="로그인 아이디" className="w-full px-3 text-[13px] outline-none" style={{ height: 36, background: "#fff", border: "1px solid " + (idTaken ? "#8a4b1c" : LINE2), borderRadius: RADIUS, color: INK }} /></label>
            <label className="flex-1"><div className="mb-1 text-[12px] font-semibold" style={{ color: MUTE }}>초기 비밀번호</div>
              <div className="flex items-center gap-1.5">
                <input value={pw} onChange={(e) => setPw(e.target.value)} placeholder="초기 비밀번호" className="w-full px-3 text-[13px] outline-none" style={{ height: 36, background: "#fff", border: "1px solid " + LINE2, borderRadius: RADIUS, color: INK }} />
                <button type="button" onClick={genPw} title="자동생성" className="flex shrink-0 items-center justify-center" style={{ height: 36, width: 36, background: "#f6f3ec", border: "1px solid " + LINE2, borderRadius: RADIUS, color: GOLD_D }}><RefreshCw className="h-4 w-4" /></button>
              </div></label>
            <label className="w-32"><div className="mb-1 text-[12px] font-semibold" style={{ color: MUTE }}>역할</div>
              <div className="flex items-center px-3 text-[13px]" style={{ height: 36, background: "#f6f3ec", border: "1px solid " + LINE2, borderRadius: RADIUS, color: MUTE }}>작업자 (고정)</div></label>
            <Btn size="sm" onClick={addWorker} disabled={!canAdd}><Check className="h-4 w-4" /> 계정 발급</Btn>
            <Btn size="sm" variant="neutral" onClick={() => setAdding(false)}>취소</Btn>
          </div>
          <p className="mt-2 text-[11px]" style={{ color: idTaken ? "#8a4b1c" : FAINT }}>
            {idTaken ? "※ 이미 사용 중인 아이디입니다." : "※ 아이디·초기 비밀번호 발급 후 작업자에게 전달 — 첫 로그인 시 비밀번호 변경. 권한은 발급 후 아래에서 지정."}
          </p>
        </div>
      )}

      <Table cols={cols} rows={accounts} renderCell={(r, k) =>
        k === "name" ? (
          <span className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: r.role === "master" ? GOLD : "#3f5e87" }}>{r.name.slice(0, 1)}</span>
            <span className="font-semibold" style={{ color: INK }}>{r.name}</span>
            {r.id === account.id && <span className="text-[10.5px] font-semibold" style={{ color: GOLD_D }}>· 나</span>}
          </span>
        ) :
        k === "loginId" ? <span className="inline-flex items-center gap-1.5 text-[12.5px] tabular-nums font-semibold" style={{ color: MUTE }}><KeyRound className="h-3.5 w-3.5" style={{ color: FAINT }} /> {r.loginId}</span> :
        k === "role" ? roleBadge(r.role) :
        k === "perms" ? (r.role === "master"
          ? <span className="text-[12px] font-semibold" style={{ color: GOLD_D }}>전체 (풀 액세스)</span>
          : <span className="text-[12px] tabular-nums" style={{ color: MUTE }}>{(r.perms || []).length} / {D.GRANTABLE_PERMS.length}개</span>) :
        k === "status" ? <Tag s={stTag[r.status].s} label={stTag[r.status].label} /> :
        k === "act" ? (isMaster && r.role !== "master"
          ? <span className="inline-flex items-center gap-3">
              <button onClick={() => setEditId(editId === r.id ? null : r.id)} className="inline-flex items-center gap-1 text-[12px] font-semibold" style={{ color: editId === r.id ? GOLD_D : GOLD }}><Settings className="h-3.5 w-3.5" /> 권한 편집</button>
              <button onClick={() => resetPw(r)} className="inline-flex items-center gap-1 text-[12px] font-semibold" style={{ color: MUTE }}><RotateCcw className="h-3.5 w-3.5" /> 초기 비번으로 초기화</button>
              <button onClick={() => removeAcct(r.id)} className="inline-flex items-center gap-1 text-[12px] font-semibold" style={{ color: MUTE }}><Trash2 className="h-3.5 w-3.5" /> 삭제</button>
            </span>
          : <span className="text-[11px]" style={{ color: FAINT }}>{r.role === "master" ? "권한 고정" : ""}</span>) : r[k]
      } />

      {/* 권한 선택 패널 (마스터가 작업자별로 토글) */}
      {isMaster && editing && (
        <div className="mt-3 px-4 py-4" style={{ background: SURFACE, border: "1px solid " + GOLD_SOFT, borderRadius: RADIUS }}>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[13px] font-bold" style={{ color: INK }}>
              <ShieldCheck className="h-4 w-4" style={{ color: GOLD_D }} /> {editing.name} 권한 설정
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setAllPerms(editing.id, true)} className="text-[12px] font-semibold" style={{ color: GOLD }}>전체 허용</button>
              <span style={{ color: LINE2 }}>·</span>
              <button onClick={() => setAllPerms(editing.id, false)} className="text-[12px] font-semibold" style={{ color: MUTE }}>전체 해제</button>
              <button onClick={() => setEditId(null)} className="ml-1 p-0.5" style={{ color: FAINT }}><X className="h-4 w-4" /></button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {D.GRANTABLE_PERMS.map((key) => {
              const on = (editing.perms || []).includes(key);
              return (
                <button key={key} onClick={() => togglePerm(editing.id, key)}
                  className="flex items-center gap-2 px-3 py-2.5 text-left outline-none transition focus-visible:ring-1"
                  style={{ background: on ? GOLD_SOFT : "#fff", border: "1.5px solid " + (on ? GOLD : LINE2), borderRadius: RADIUS }}>
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-sm" style={{ background: on ? GOLD : "transparent", border: on ? "none" : "1.5px solid " + LINE2 }}>
                    {on && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                  </span>
                  <span className="text-[12.5px] font-semibold" style={{ color: on ? GOLD_D : MUTE }}>{D.ADMIN_PAGES[key]}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-[11px]" style={{ color: FAINT }}>※ 계정·권한 관리는 마스터 고유 권한이라 작업자에게 위임할 수 없습니다.</p>
        </div>
      )}

      <p className="mt-3 text-[11px] leading-relaxed" style={{ color: FAINT }}>
        ※ 마스터는 모든 페이지 + 계정관리(풀 액세스). 작업자는 위에서 켠 권한만 사이드바·접근에 노출 — 좌상단 계정 전환으로 바로 확인 가능. 파트너/유저 링크는 1:1이라 권한체계 없음.
      </p>
    </div>
  );
}

