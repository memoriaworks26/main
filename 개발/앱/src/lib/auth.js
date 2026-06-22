// ─────────────────────────────────────────────────────────────
// 인증 API — Supabase Auth(이메일+비번) 기반 관리자/파트너 로그인.
//   · signIn       : 이메일+비번 로그인(관리자·파트너 공통, 이메일 직접 입력)
//   · fetchProfile : 세션 → memoria.staff / partner_members 조회로 신원·권한 해석
//   · 보호자(anon 토큰)는 여기 거치지 않음(userLink.js).
// DEV_PREVIEW=1 이면 App이 로그인 우회 + 목업 화면(개발용).
// ─────────────────────────────────────────────────────────────
import { getClient, db, BACKEND_LIVE } from "./supabase.js";

export const DEV_PREVIEW = import.meta.env.VITE_DEV_PREVIEW === "1";
export { BACKEND_LIVE };

// id 기반 로그인 — 사용자는 아이디만 입력, 내부에서 합성 이메일로 매핑.
//   관리자: <loginId>@staff.memoriaworks.kr · 파트너: <idCode>@ptn.memoriaworks.kr
//   (입력에 '@'가 있으면 실제 이메일로 간주해 그대로 사용 — 호환)
const STAFF_DOMAIN = "staff.memoriaworks.kr";
const PARTNER_DOMAIN = "ptn.memoriaworks.kr";
export function idToEmail(id, kind = "admin") {
  const v = String(id || "").trim();
  if (v.includes("@")) return v;
  return `${v}@${kind === "partner" ? PARTNER_DOMAIN : STAFF_DOMAIN}`;
}

export async function getSession() {
  const sb = getClient();
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  return data?.session || null;
}

// 세션 변경 구독. 해제 함수 반환.
export function onAuthChange(cb) {
  const sb = getClient();
  if (!sb) return () => {};
  const { data } = sb.auth.onAuthStateChange((_event, session) => cb(session));
  return () => data?.subscription?.unsubscribe?.();
}

export async function signIn(id, password, kind = "admin") {
  const sb = getClient();
  if (!sb) return { ok: false, error: "백엔드가 설정되지 않았습니다." };
  const { data, error } = await sb.auth.signInWithPassword({
    email: idToEmail(id, kind),
    password: password || "",
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, session: data.session };
}

export async function signOut() {
  const sb = getClient();
  if (sb) await sb.auth.signOut();
}

// 본인 비밀번호 변경 — 현재 비번 재인증 후 변경(세션 탈취 시 무단변경 방지).
//   관리자·파트너 공통(로그인된 본인). Supabase 비번 최소길이(6) 이상 필요.
export async function changePassword(currentPassword, newPassword) {
  const sb = getClient();
  if (!sb) throw new Error("백엔드가 설정되지 않았습니다.");
  const { data: { user } } = await sb.auth.getUser();
  if (!user?.email) throw new Error("세션이 만료되었습니다. 다시 로그인해 주세요.");
  // 현재 비밀번호 확인(재인증) — 같은 유저 재로그인이라 세션만 갱신됨.
  const { error: reErr } = await sb.auth.signInWithPassword({ email: user.email, password: currentPassword });
  if (reErr) throw new Error("현재 비밀번호가 올바르지 않습니다.");
  const { error } = await sb.auth.updateUser({ password: newPassword });
  if (error) throw new Error(error.message.includes("at least") ? "비밀번호는 6자 이상이어야 합니다." : error.message);
}

// 세션 신원 해석. staff(관리자) 우선, 아니면 partner. 둘 다 아니면 none.
// RLS가 본인 행만 주지만 master는 staff 전체가 보이므로 반드시 uid로 필터.
export async function fetchProfile(session) {
  const d = db();
  const uid = session?.user?.id;
  if (!d || !uid) return { kind: "none" };

  const { data: staff } = await d.from("staff").select("*").eq("auth_user_id", uid).maybeSingle();
  if (staff) {
    return {
      kind: "staff",
      account: {
        id: staff.auth_user_id,
        name: staff.name,
        loginId: staff.login_id,
        email: staff.email,
        role: staff.role,
        perms: staff.perms || [],
        bizUnit: staff.biz_unit_id,
        status: staff.status,
      },
    };
  }

  const { data: pm } = await d.from("partner_members").select("partner_id").eq("auth_user_id", uid).maybeSingle();
  if (pm?.partner_id) {
    const { data: p } = await d.from("partners").select("*").eq("id", pm.partner_id).maybeSingle();
    if (p) {
      return {
        kind: "partner",
        partner: {
          id: p.id, idCode: p.id_code, name: p.name, region: p.region, manager: p.manager,
          phone: p.phone, csPhone: p.cs_phone, csHours: p.cs_hours, rooms: p.rooms,
          active: p.active, unitPrice: p.unit_price, bizUnit: p.biz_unit_id,
        },
      };
    }
  }
  return { kind: "none" };
}
