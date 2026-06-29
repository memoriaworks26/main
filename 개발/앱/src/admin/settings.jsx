// [환경설정] 내 설정·비밀번호 재설정·계정/권한·시스템 설정.
import React, { useState } from "react";
import {
  Check, Download, FileText, Headset, KeyRound, Lock, Plus, RefreshCw, RotateCcw, Settings, ShieldCheck, Trash2, User, UserPlus, X,
} from "lucide-react";
import { SURFACE, LINE, LINE2, GOLD, GOLD_D, GOLD_SOFT, INK, MUTE, FAINT, RADIUS } from "../theme.js";
import { Tag, Btn, Card, Table, PageHeader, PwField, useTableSort } from "../ui.jsx";
import { toast } from "../toast.jsx";
import { confirm as confirmDialog } from "../confirm.jsx";
import { useStore, actions } from "../store.js";
import { changePassword, DEV_PREVIEW } from "../lib/auth.js";
import * as D from "../data.js";

// ── 고객센터 (유저 문의처) — 마스터가 등록 → 유저링크 하단 문의 안내에 노출 ──
function CustomerCenterCard({ account }) {
  const { company } = useStore();
  const isMaster = account?.role === "master";
  const [phone, setPhone] = useState(company.csPhone || "");
  const [hours, setHours] = useState(company.csHours || "");

  const dirty = phone.trim() !== (company.csPhone || "") || hours.trim() !== (company.csHours || "");
  const save = () => {
    actions.updateCompany({ csPhone: phone.trim(), csHours: hours.trim() });
    toast("고객센터 정보가 저장되었습니다 — 유저링크 문의처에 반영됩니다");
  };

  return (
    <Card title="고객센터 (유저 문의처)">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ background: GOLD_SOFT }}>
          <Headset className="h-4 w-4" style={{ color: GOLD_D }} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[12px]" style={{ color: MUTE }}>
            보호자가 보는 유저링크 하단에 표시되는 문의 연락처입니다. (내부 운영 알림용 번호와 별개)
          </div>

          {isMaster ? (
            <div className="mt-3 max-w-md space-y-3">
              <label className="block">
                <div className="mb-1 text-[12px] font-semibold" style={{ color: MUTE }}>전화번호</div>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="예: 1668-0000"
                  className="w-full px-3 text-[13px] tabular-nums outline-none" style={{ height: 36, background: "#fff", border: "1px solid " + LINE2, borderRadius: RADIUS, color: INK }} />
              </label>
              <label className="block">
                <div className="mb-1 text-[12px] font-semibold" style={{ color: MUTE }}>운영시간 <span style={{ color: FAINT }}>(선택)</span></div>
                <input value={hours} onChange={(e) => setHours(e.target.value)} placeholder="예: 평일 09:00–18:00"
                  className="w-full px-3 text-[13px] outline-none" style={{ height: 36, background: "#fff", border: "1px solid " + LINE2, borderRadius: RADIUS, color: INK }} />
              </label>
              <div className="flex items-center gap-2">
                <Btn size="sm" onClick={save} disabled={!dirty || !phone.trim()}><Check className="h-4 w-4" /> 저장</Btn>
                {dirty && <span className="text-[11px]" style={{ color: FAINT }}>저장하지 않은 변경사항</span>}
              </div>
            </div>
          ) : (
            <div className="mt-3 space-y-2 text-[13px]" style={{ color: INK }}>
              <div className="flex gap-6"><span className="w-16 shrink-0" style={{ color: MUTE }}>전화번호</span><span className="font-semibold tabular-nums">{company.csPhone || "—"}</span></div>
              <div className="flex gap-6"><span className="w-16 shrink-0" style={{ color: MUTE }}>운영시간</span><span>{company.csHours || "—"}</span></div>
              <div className="mt-1 flex items-center gap-1.5 text-[11px]" style={{ color: FAINT }}><Lock className="h-3 w-3" /> 수정은 마스터 관리자 전용</div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

// ── 개인정보처리방침 전문 — 마스터가 편집 → 유저링크 동의란·푸터 '전문 보기'에 반영 ──
function PrivacyPolicyCard({ account }) {
  const { company } = useStore();
  const isMaster = account?.role === "master";
  const [text, setText] = useState(company.privacyPolicy || "");

  const dirty = text !== (company.privacyPolicy || "");
  const save = () => {
    actions.updateCompany({ privacyPolicy: text });
    toast("개인정보처리방침이 저장되었습니다 — 유저링크 전문 보기에 반영됩니다");
  };
  const reset = () => setText(company.privacyPolicy || "");

  return (
    <Card title="개인정보처리방침 (유저링크 전문)">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ background: GOLD_SOFT }}>
          <ShieldCheck className="h-4 w-4" style={{ color: GOLD_D }} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[12px]" style={{ color: MUTE }}>
            보호자가 보는 유저링크 동의란·하단의 <b style={{ color: INK }}>전문 보기</b>에 노출되는 개인정보처리방침 전문입니다. (개인정보 보호책임자 성명은 이 전문에 표기)
          </div>

          {isMaster ? (
            <div className="mt-3 space-y-2">
              <textarea value={text} onChange={(e) => setText(e.target.value)} rows={14}
                className="w-full resize-y px-3 py-2.5 text-[12.5px] leading-relaxed outline-none focus-visible:ring-1"
                style={{ background: "#fff", border: "1px solid " + LINE2, borderRadius: RADIUS, color: INK }} />
              <div className="flex items-center gap-2">
                <Btn size="sm" onClick={save} disabled={!dirty}><Check className="h-4 w-4" /> 저장</Btn>
                {dirty && <Btn size="sm" variant="neutral" onClick={reset}><RotateCcw className="h-3.5 w-3.5" /> 되돌리기</Btn>}
                {dirty && <span className="text-[11px]" style={{ color: FAINT }}>저장하지 않은 변경사항</span>}
              </div>
            </div>
          ) : (
            <div className="mt-3 max-h-72 overflow-y-auto px-3 py-2.5 text-[12px] leading-relaxed" style={{ background: "#faf8f3", border: "1px solid " + LINE, borderRadius: RADIUS, color: MUTE, whiteSpace: "pre-line" }}>
              {company.privacyPolicy || "—"}
              <div className="mt-2 flex items-center gap-1.5 text-[11px]" style={{ color: FAINT }}><Lock className="h-3 w-3" /> 수정은 마스터 관리자 전용</div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

// ── 유저폼 동의 문구 — 마스터가 편집 → 유저폼 1단계 개인정보/마케팅 동의 안내에 반영 ──
function ConsentCard({ account }) {
  const { company } = useStore();
  const isMaster = account?.role === "master";
  const [priv, setPriv] = useState(company.consentPrivacy || "");
  const [mkt, setMkt] = useState(company.consentMarketing || "");
  const privDirty = priv !== (company.consentPrivacy || "");
  const mktDirty = mkt !== (company.consentMarketing || "");
  const savePriv = () => { actions.updateCompany({ consentPrivacy: priv }); toast("개인정보 동의 문구가 저장되었습니다 — 유저폼에 반영됩니다"); };
  const saveMkt = () => { actions.updateCompany({ consentMarketing: mkt }); toast("마케팅 동의 문구가 저장되었습니다 — 유저폼에 반영됩니다"); };

  // 함수로 인라인 렌더(컴포넌트로 만들면 입력 중 포커스가 풀리므로 호출형으로 유지)
  const editor = (label, badge, badgeBg, badgeColor, value, setValue, dirty, onSave, original) => (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5">
        <span className="text-[12.5px] font-bold" style={{ color: INK }}>{label}</span>
        <span className="px-1.5 py-[1px] text-[10px] font-bold" style={{ background: badgeBg, color: badgeColor, borderRadius: 3 }}>{badge}</span>
      </div>
      {isMaster ? (
        <>
          <textarea value={value} onChange={(e) => setValue(e.target.value)} rows={4}
            className="w-full resize-y px-3 py-2.5 text-[12.5px] leading-relaxed outline-none focus-visible:ring-1"
            style={{ background: "#fff", border: "1px solid " + LINE2, borderRadius: RADIUS, color: INK }} />
          <div className="mt-1.5 flex items-center gap-2">
            <Btn size="sm" onClick={onSave} disabled={!dirty}><Check className="h-4 w-4" /> 저장</Btn>
            {dirty && <Btn size="sm" variant="neutral" onClick={() => setValue(original)}><RotateCcw className="h-3.5 w-3.5" /> 되돌리기</Btn>}
            {dirty && <span className="text-[11px]" style={{ color: FAINT }}>저장하지 않은 변경사항</span>}
          </div>
        </>
      ) : (
        <div className="px-3 py-2.5 text-[12px] leading-relaxed" style={{ background: "#faf8f3", border: "1px solid " + LINE, borderRadius: RADIUS, color: MUTE, whiteSpace: "pre-line" }}>{value || "—"}</div>
      )}
    </div>
  );

  return (
    <Card title="유저폼 동의 문구 (개인정보 · 마케팅)">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ background: GOLD_SOFT }}><FileText className="h-4 w-4" style={{ color: GOLD_D }} /></span>
        <div className="min-w-0 flex-1">
          <div className="text-[12px]" style={{ color: MUTE }}>
            보호자가 보는 유저폼 1단계의 <b style={{ color: INK }}>개인정보 수집·이용 동의(필수)</b>와 <b style={{ color: INK }}>마케팅·홍보 활용 동의(선택)</b> 안내 문구입니다. (처리·위탁·보호책임자 라인은 파트너사·고객센터 기준으로 자동 표기)
          </div>
          <div className="mt-3 space-y-4">
            {editor("개인정보 수집·이용 동의", "필수", GOLD_D, "#fff", priv, setPriv, privDirty, savePriv, company.consentPrivacy || "")}
            {editor("마케팅·홍보 활용 동의", "선택", "#eceef0", "#5a6470", mkt, setMkt, mktDirty, saveMkt, company.consentMarketing || "")}
          </div>
          {!isMaster && <div className="mt-2 flex items-center gap-1.5 text-[11px]" style={{ color: FAINT }}><Lock className="h-3 w-3" /> 수정은 마스터 관리자 전용</div>}
        </div>
      </div>
    </Card>
  );
}

export function SettingsView({ account }) {
  const [pwOpen, setPwOpen] = useState(false);
  const { company } = useStore();  // [QA-P1] 공급자·계좌 = store.company(DB 하이드레이트), 목업 제거
  return (
    <div>
      <PageHeader title="환경설정" sub="관리자 전용 — 회사 정보" />
      <div className="mb-4"><CustomerCenterCard account={account} /></div>
      <div className="mb-4"><PrivacyPolicyCard account={account} /></div>
      <div className="mb-4"><ConsentCard account={account} /></div>
      <div className="grid grid-cols-2 gap-4">
        <Card title="공급자 정보 (거래명세서 자동 삽입)">
          <div className="space-y-2 text-[13px]" style={{ color: INK }}>
            <div className="flex justify-between"><span style={{ color: MUTE }}>상호</span><span className="font-semibold">{company.name || "—"}</span></div>
            <div className="flex justify-between"><span style={{ color: MUTE }}>대표자</span><span>{company.ceo || "—"}</span></div>
            <div className="flex justify-between"><span style={{ color: MUTE }}>사업자번호</span><span className="tabular-nums">{company.biz || "—"}</span></div>
            <div className="flex justify-between"><span style={{ color: MUTE }}>업태/종목</span><span className="text-right">{company.type || "—"}</span></div>
          </div>
        </Card>
        <Card title="결제 계좌 · 도장">
          <div className="space-y-2 text-[13px]" style={{ color: INK }}>
            <div className="flex justify-between"><span style={{ color: MUTE }}>은행</span><span>{company.bank || "—"}</span></div>
            <div className="flex justify-between"><span style={{ color: MUTE }}>계좌</span><span className="tabular-nums">{company.account || "—"}</span></div>
            <div className="flex justify-between"><span style={{ color: MUTE }}>예금주</span><span>{company.holder || "—"}</span></div>
            <div className="flex items-center justify-between"><span style={{ color: MUTE }}>도장 등록</span><Btn size="sm" variant="ghost" onClick={() => toast("도장 이미지가 업로드되었습니다")}><Plus className="h-3.5 w-3.5" /> 업로드</Btn></div>
          </div>
        </Card>
      </div>

      <div className="mt-4 max-w-md">
        <Card title="보안">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ background: GOLD_SOFT }}><KeyRound className="h-4 w-4" style={{ color: GOLD_D }} /></span>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold" style={{ color: INK }}>비밀번호</div>
              <div className="text-[12px]" style={{ color: MUTE }}>주기적으로 변경하면 계정을 더 안전하게 보호할 수 있어요.</div>
              <div className="mt-3"><Btn size="sm" variant="ghost" onClick={() => setPwOpen(true)}><RotateCcw className="h-3.5 w-3.5" /> 비밀번호 변경</Btn></div>
            </div>
          </div>
        </Card>
      </div>

      {pwOpen && <PasswordResetModal account={account} onClose={() => setPwOpen(false)} />}
    </div>
  );
}

// ── 내 설정 (모든 계정 공용 — 작업자도 본인 비밀번호 재설정 가능) ────
function PasswordResetModal({ account, onClose }) {
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const tooShort = next.length > 0 && next.length < 8;
  const mismatch = confirm.length > 0 && next !== confirm;
  const canSubmit = cur.trim() && next.length >= 8 && next === confirm && !busy;
  const submit = async () => {
    if (!canSubmit) return;
    if (DEV_PREVIEW) { setDone(true); return; }  // 개발 미리보기 — 목업
    setBusy(true);
    try { await changePassword(cur, next); setDone(true); }
    catch (e) { toast(e.message || "비밀번호 변경 실패"); }
    finally { setBusy(false); }
  };

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
            <p className="mt-1.5 text-[12px]" style={{ color: MUTE }}>다음 로그인부터 새 비밀번호를 사용하세요.</p>
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
  const [phone, setPhone] = useState("");
  const [pw, setPw] = useState("");
  const [role, setRole] = useState("worker"); // 신규 계정 역할: worker | collab(협력파트너)
  const [editId, setEditId] = useState(null); // 권한 편집 중인 작업자

  // 초기 비밀번호 자동생성 (목업 — 영문+숫자 8자리)
  const genPw = () => {
    const c = "abcdefghijkmnpqrstuvwxyz23456789";
    setPw(Array.from({ length: 8 }, () => c[Math.floor(Math.random() * c.length)]).join(""));
  };

  const stTag = { active: { s: "online", label: "활성" }, invited: { s: "waiting", label: "초대됨" }, disabled: { s: "offline", label: "비활성" } };
  const roleBadge = (rl) => {
    const RB = {
      master: { bg: GOLD_SOFT, c: GOLD_D, Icon: ShieldCheck },
      collab: { bg: "#e9eef5", c: "#3f5e87", Icon: Download },
      worker: { bg: "#eceef0", c: "#5a6470", Icon: User },
    };
    const m = RB[rl] || RB.worker;
    return (
      <span className="inline-flex items-center gap-1 px-2 py-[3px] text-[11px] font-semibold" style={{ borderRadius: 3, background: m.bg, color: m.c }}>
        <m.Icon className="h-3 w-3" /> {D.ADMIN_ROLES[rl].label}
      </span>
    );
  };

  const idTaken = accounts.some((a) => a.loginId === loginId.trim());
  const idTooShort = loginId.trim().length > 0 && loginId.trim().length < 6;
  // 임시 비밀번호 = 아이디(6자 이상). 비번 정책(최소 6자) 충족 위해 아이디도 6자 이상 강제.
  const canAdd = name.trim() && loginId.trim().length >= 6 && !idTaken;
  const addWorker = async () => {
    if (!canAdd) return;
    const roleLabel = D.ADMIN_ROLES[role].label;
    if (!(await confirmDialog({ title: "계정 발급", message: `${name.trim()}(${loginId.trim()}) ${roleLabel} 계정을 발급합니다.\n초기 비밀번호는 아이디와 동일하며, 첫 로그인 후 변경합니다.` }))) return;
    // 협력파트너는 권한체계 무관(다운로드 전용) → perms 빈 배열. 작업자는 기본 권한으로 시작.
    actions.addAccount({ id: "u-" + Date.now(), name: name.trim(), role, loginId: loginId.trim(), email: "—", phone: phone.trim() || "—", status: "invited", lastLogin: "—", perms: role === "worker" ? [...D.DEFAULT_WORKER_PERMS] : [] });
    setName(""); setLoginId(""); setPhone(""); setPw(""); setRole("worker"); setAdding(false);
  };
  const removeAcct = async (r) => { if (!(await confirmDialog({ title: "계정 삭제", message: `${r.name}(${r.loginId}) 계정을 삭제합니다.\n삭제 후에는 복구할 수 없습니다.`, danger: true }))) return; actions.removeAccount(r.id); if (editId === r.id) setEditId(null); };
  // 비밀번호 재설정 — 초기 비밀번호(아이디/ID코드)로 초기화 → 첫 로그인 시 변경. edge function 실배선.
  const resetPw = async (r) => { if (!(await confirmDialog({ title: "비밀번호 초기화", message: `${r.name}(${r.loginId}) 계정의 비밀번호를 초기 비밀번호로 초기화합니다.\n첫 로그인 시 비밀번호 변경이 필요합니다.`, confirmLabel: "초기화" }))) return; actions.resetAccountPw(r.id); };
  const togglePerm = (id, key) => actions.toggleAccountPerm(id, key);
  const setAllPerms = (id, on) => actions.setAccountPerms(id, on ? [...D.GRANTABLE_PERMS] : []);

  const editing = editId ? accounts.find((a) => a.id === editId) : null;
  const { rows: acctRows, sort, onSortChange } = useTableSort(accounts);

  const cols = [
    { key: "name", label: "이름", sortable: true }, { key: "loginId", label: "아이디", sortable: true }, { key: "phone", label: "전화번호", sortable: true }, { key: "role", label: "역할", sortable: true }, { key: "perms", label: "권한" },
    { key: "status", label: "상태", sortable: true }, { key: "lastLogin", label: "최근 접속", sortable: true }, { key: "act", label: "", align: "right" },
  ];
  return (
    <div>
      <PageHeader title="계정·권한" sub="마스터 = 풀 액세스 · 작업자 = 선택 권한 · 협력파트너 = 영상 다운로드 전용"
        right={isMaster ? <Btn size="sm" onClick={() => setAdding((v) => !v)}><UserPlus className="h-4 w-4" /> 계정 추가</Btn> : null} />

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
              <input value={loginId} onChange={(e) => setLoginId(e.target.value)} placeholder="6자 이상" className="w-full px-3 text-[13px] outline-none" style={{ height: 36, background: "#fff", border: "1px solid " + (idTaken || idTooShort ? "#8a4b1c" : LINE2), borderRadius: RADIUS, color: INK }} />
              {(idTooShort || idTaken) && <div className="mt-1 text-[10.5px]" style={{ color: "#8a4b1c" }}>{idTaken ? "이미 사용 중인 아이디" : "아이디는 6자 이상"}</div>}</label>
            <label className="flex-1"><div className="mb-1 text-[12px] font-semibold" style={{ color: MUTE }}>전화번호</div>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="010-0000-0000" inputMode="tel" className="w-full px-3 text-[13px] tabular-nums outline-none" style={{ height: 36, background: "#fff", border: "1px solid " + LINE2, borderRadius: RADIUS, color: INK }} /></label>
            <label className="flex-1"><div className="mb-1 text-[12px] font-semibold" style={{ color: MUTE }}>초기 비밀번호</div>
              <div className="flex items-center px-3 text-[12px]" style={{ height: 36, background: "#f6f3ec", border: "1px dashed " + LINE2, borderRadius: RADIUS, color: MUTE }}>
                아이디와 동일 · 첫 로그인 후 변경
              </div></label>
            <label className="w-44"><div className="mb-1 text-[12px] font-semibold" style={{ color: MUTE }}>역할</div>
              <div className="flex items-center gap-1">
                {["worker", "collab"].map((rk) => {
                  const on = role === rk;
                  return (
                    <button key={rk} type="button" onClick={() => setRole(rk)} className="flex-1 px-2 text-[12px] font-semibold outline-none transition focus-visible:ring-1"
                      style={{ height: 36, borderRadius: RADIUS, background: on ? GOLD_SOFT : "#fff", color: on ? GOLD_D : MUTE, border: "1px solid " + (on ? GOLD : LINE2) }}>{D.ADMIN_ROLES[rk].label}</button>
                  );
                })}
              </div></label>
            <Btn size="sm" onClick={addWorker} disabled={!canAdd}><Check className="h-4 w-4" /> 계정 발급</Btn>
            <Btn size="sm" variant="neutral" onClick={() => setAdding(false)}>취소</Btn>
          </div>
          <p className="mt-2 text-[11px]" style={{ color: idTaken ? "#8a4b1c" : FAINT }}>
            {idTaken ? "※ 이미 사용 중인 아이디입니다." : "※ 아이디·초기 비밀번호 발급 후 전달 — 첫 로그인 시 비밀번호 변경. 작업자 권한은 발급 후 아래에서 지정(협력파트너는 영상 다운로드 전용으로 고정)."}
          </p>
        </div>
      )}

      <Table cols={cols} rows={acctRows} sort={sort} onSortChange={onSortChange} renderCell={(r, k) =>
        k === "name" ? (
          <span className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: r.role === "master" ? GOLD : "#3f5e87" }}>{r.name.slice(0, 1)}</span>
            <span className="font-semibold" style={{ color: INK }}>{r.name}</span>
            {r.id === account.id && <span className="text-[10.5px] font-semibold" style={{ color: GOLD_D }}>· 나</span>}
          </span>
        ) :
        k === "loginId" ? <span className="inline-flex items-center gap-1.5 text-[12.5px] tabular-nums font-semibold" style={{ color: MUTE }}><KeyRound className="h-3.5 w-3.5" style={{ color: FAINT }} /> {r.loginId}</span> :
        k === "phone" ? (isMaster
          ? <input value={r.phone && r.phone !== "—" ? r.phone : ""} onChange={(e) => actions.updateAccount(r.id, { phone: e.target.value })} placeholder="010-0000-0000" inputMode="tel"
              className="w-28 px-2 text-[12.5px] tabular-nums outline-none focus-visible:ring-1" style={{ height: 28, background: "#fff", border: "1px solid " + LINE2, borderRadius: RADIUS, color: INK }} />
          : <span className="tabular-nums" style={{ color: MUTE }}>{r.phone || "—"}</span>) :
        k === "role" ? roleBadge(r.role) :
        k === "perms" ? (r.role === "master"
          ? <span className="text-[12px] font-semibold" style={{ color: GOLD_D }}>전체 (풀 액세스)</span>
          : r.role === "collab"
          ? <span className="text-[12px] font-semibold" style={{ color: "#3f5e87" }}>영상 다운로드 전용</span>
          : <span className="text-[12px] tabular-nums" style={{ color: MUTE }}>{(r.perms || []).length} / {D.GRANTABLE_PERMS.length}개</span>) :
        k === "status" ? <Tag s={stTag[r.status].s} label={stTag[r.status].label} /> :
        k === "act" ? (isMaster && r.role !== "master"
          ? <span className="inline-flex items-center gap-3">
              {r.role === "worker" && <button onClick={() => setEditId(editId === r.id ? null : r.id)} className="inline-flex items-center gap-1 text-[12px] font-semibold" style={{ color: editId === r.id ? GOLD_D : GOLD }}><Settings className="h-3.5 w-3.5" /> 권한 편집</button>}
              <button onClick={() => resetPw(r)} className="inline-flex items-center gap-1 text-[12px] font-semibold" style={{ color: MUTE }}><RotateCcw className="h-3.5 w-3.5" /> 비번 초기화</button>
              <button onClick={() => removeAcct(r)} className="inline-flex items-center gap-1 text-[12px] font-semibold" style={{ color: MUTE }}><Trash2 className="h-3.5 w-3.5" /> 삭제</button>
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

