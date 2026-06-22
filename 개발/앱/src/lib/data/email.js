// ─────────────────────────────────────────────────────────────
// 이메일 발송 데이터 계층 — send-email edge function(Resend) 호출. 활성 staff만.
//   키(RESEND_API_KEY)는 서버(엣지펑션 시크릿)에만 — 프론트엔 절대 없음.
//   from 기본값 = onboarding@resend.dev(미검증) → 계정 소유 메일로만 발송 가능.
//   임의 수신자 발송은 resend.com/domains에서 memoria.works 검증 후 RESEND_FROM 시크릿 교체.
// ─────────────────────────────────────────────────────────────
import { getClient } from "../supabase.js";

// sendEmail({ to, subject, html?, text?, from?, replyTo? }) → { ok, id }
export async function sendEmail(params) {
  const sb = getClient();
  if (!sb) throw new Error("백엔드 미연결");
  const { data, error } = await sb.functions.invoke("send-email", { body: params });
  if (data && data.error) throw new Error(data.error);
  if (error) throw new Error(error.message);
  return data;
}
