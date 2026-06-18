// [총괄] 대시보드 — 관리자 홈. 파트너사 통합 현황 요약.
import React from "react";
import {
  Plus,
} from "lucide-react";
import { SERIF, SURFACE, LINE, LINE2, GOLD, INK, MUTE, FAINT } from "../theme.js";
import { Btn, Card, MetricRow, PageHeader } from "../ui.jsx";
import { useStore } from "../store.js";
import * as D from "../data.js";

export function Dashboard({ go }) {
  const { reservations, partners } = useStore();
  const total = partners.length;
  const active = partners.filter((p) => p.active).length;
  const resv = partners.reduce((s, p) => s + p.reservThisMonth, 0);
  const billed = D.SETTLEMENT_PARTNERS.reduce((s, p) => s + p.billed, 0);
  const unpaid = D.SETTLEMENT_PARTNERS.reduce((s, p) => s + p.unpaid, 0);
  const man = (v) => Math.round(v / 10000).toLocaleString() + "만";
  const recent = reservations.slice(0, 5);

  const pill = (txt, c, bg) => <span className="inline-flex px-2 py-[3px] text-[11px] font-semibold" style={{ borderRadius: 3, color: c, background: bg }}>{txt}</span>;
  const videoPill = (st) =>
    st === "published" ? pill("발행 완료", "#3a7468", "#e9f1ee") :
    st === "review" ? pill("컨펌 대기", "#9a6a1c", "#f4ead7") :
    pill("작업중", "#3f5e87", "#e9eef5");
  const statePill = (st) =>
    st === "published" ? pill("종료", "#5a6470", "#eceef0") :
    st === "review" ? pill("접수", "#8a857b", "#eeece6") :
    pill("진행중", "#3f5e87", "#e9eef5");

  const cols = ["반려동물", "보호자", "파트너사", "예약일", "영상", "상태"];
  const th = { padding: "10px 16px", fontSize: 11, color: MUTE, borderBottom: "1px solid " + LINE, textAlign: "left", textTransform: "uppercase", letterSpacing: ".03em", fontWeight: 700 };
  const tdc = { padding: "10px 16px", fontSize: 13, color: INK };

  return (
    <div>
      <PageHeader title="대시보드" sub="전 파트너사 운영 요약" right={<Btn size="sm" onClick={() => go && go("partners")}><Plus className="h-4 w-4" /> 파트너사 등록</Btn>} />

      <div className="mb-4">
        <MetricRow fit items={[
          { label: "전체 파트너사", value: total, sub: `활성 ${active}개` },
          { label: "이번달 예약", value: resv + "건", sub: "전월 대비 +3" },
          { label: "이번달 매출", value: man(billed), sub: "VAT 포함" },
          { label: "미수금", value: man(unpaid), sub: "확인 필요", accent: "#9a6a1c" },
        ]} />
      </div>

      <div className="mb-4">
        <Card title="사업부별 현황">
          <div className="flex flex-wrap items-center gap-2">
            {D.BIZ_UNITS.map((b) => (
              <span key={b.id} className="px-3.5 py-1.5 text-[12.5px] font-semibold" style={{ borderRadius: 999, background: b.active ? GOLD : SURFACE, color: b.active ? "#fff" : FAINT, border: "1px solid " + (b.active ? GOLD : LINE2) }}>
                {b.name}{b.active ? ` · ${b.partners}개 파트너사` : ""}
              </span>
            ))}
          </div>
        </Card>
      </div>

      <Card title="최근 예약" pad={false}>
        <table className="w-full" style={{ borderCollapse: "collapse" }}>
          <thead><tr style={{ background: "#f6f3ec" }}>{cols.map((c) => <th key={c} style={th}>{c}</th>)}</tr></thead>
          <tbody>
            {recent.map((r, ri) => (
              <tr key={r.id} style={{ borderBottom: ri < recent.length - 1 ? "1px solid " + LINE : "none" }}>
                <td style={{ ...tdc, fontFamily: SERIF, fontWeight: 700 }}>{r.deceased}</td>
                <td style={tdc}>{r.chief}</td>
                <td style={tdc}>{r.partner}</td>
                <td style={{ ...tdc }} className="tabular-nums">{r.date || r.requestedAt}</td>
                <td style={tdc}>{videoPill(r.status)}</td>
                <td style={tdc}>{statePill(r.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

