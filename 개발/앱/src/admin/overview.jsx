// [총괄] 대시보드 — 관리자 홈. 파트너사 통합 현황 요약.
import React from "react";
import {
  Plus,
} from "lucide-react";
import { SURFACE, LINE2, GOLD, GOLD_D, INK, FAINT } from "../theme.js";
import { Btn, Card, MetricRow, PageHeader, Table } from "../ui.jsx";
import { useStore, actions } from "../store.js";
import * as D from "../data.js";
import { CUSTOMER_COLS, toCustomerRow, renderCustomerCell } from "./customers.jsx";
import { man } from "../lib/format.js";

export function Dashboard({ go }) {
  const store = useStore();
  const { bizUnits, bizUnit } = store;
  // 현재 사업부 스코핑 — 소속 파트너사 + 그 예약만
  const partners = store.partners.filter((p) => p.bizUnit === bizUnit);
  const bizNames = new Set(partners.map((p) => p.name));
  const reservations = store.reservations.filter((r) => bizNames.has(r.partner));
  const total = partners.length;
  const active = partners.filter((p) => p.active).length;
  const resv = partners.reduce((s, p) => s + p.reservThisMonth, 0);
  // 정산 데이터는 사업부 태깅 전 → 파트너 없는(신규) 사업부는 0으로
  const billed = total ? D.SETTLEMENT_PARTNERS.reduce((s, p) => s + p.billed, 0) : 0;
  const unpaid = total ? D.SETTLEMENT_PARTNERS.reduce((s, p) => s + p.unpaid, 0) : 0;
  // 고객관리와 같은 리스트 · 최신순(예약일 내림차순) 상위 5건
  const recent = reservations.map(toCustomerRow)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .slice(0, 5);

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
            {bizUnits.map((b) => {
              const on = b.id === bizUnit;
              const c = store.partners.filter((p) => p.bizUnit === b.id).length;
              return (
                <button key={b.id} onClick={() => actions.setBizUnit(b.id)} className="px-3.5 py-1.5 text-[12.5px] font-semibold outline-none transition focus-visible:ring-1" style={{ borderRadius: 999, background: on ? GOLD : SURFACE, color: on ? "#fff" : FAINT, border: "1px solid " + (on ? GOLD : LINE2) }}>
                  {b.name} · {c}개 파트너사
                </button>
              );
            })}
          </div>
        </Card>
      </div>

      <div className="mb-2 flex items-center justify-between">
        <span className="text-[14px] font-bold" style={{ color: INK }}>최근 예약</span>
        <button onClick={() => go && go("customers")} className="text-[12px] font-semibold outline-none hover:underline focus-visible:ring-1" style={{ color: GOLD_D }}>고객관리 전체보기 →</button>
      </div>
      <Table cols={CUSTOMER_COLS} rows={recent} onRowClick={(r) => go && go("customers", r.id)} renderCell={renderCustomerCell} />
    </div>
  );
}

