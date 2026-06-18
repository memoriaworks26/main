import React from "react";
import { Printer, Mail } from "lucide-react";
import { SURFACE, LINE, LINE2, INK, MUTE, FAINT, GOLD, GOLD_D, RADIUS } from "./theme.js";
import { Btn } from "./ui.jsx";
import * as D from "./data.js";

// 거래명세서 양식 (발행 시 동결 · 메일 발송) — 기획안 정산 §4 in-scope
export function TradeStatement({ partner, items: itemsProp, period, issuedAt }) {
  const items = itemsProp || D.SETTLEMENT_ITEMS.filter((i) => !partner || i.partner === partner);
  const C = D.COMPANY;
  const recv = D.PARTNERS.find((p) => p.name === partner);
  const unit = recv ? recv.unitPrice : (items[0] ? items[0].amount : 0);
  const total = items.length * unit;          // 합계(VAT 포함)
  const supply = Math.round(total / 1.1);     // 공급가액
  const vat = total - supply;                 // 부가세
  const won = (v) => v.toLocaleString();

  const bd = "1px solid " + LINE2;
  const hd = { padding: "5px 6px", fontSize: 10.5, color: MUTE, background: "#f6f3ec", borderRight: bd, borderBottom: bd, fontWeight: 700 };
  const td = { padding: "5px 6px", fontSize: 10.5, borderRight: bd, borderBottom: bd, color: INK };
  const labelCell = { padding: "5px 8px", fontSize: 10.5, color: MUTE, background: "#f6f3ec", fontWeight: 700, borderRight: bd, borderBottom: bd, whiteSpace: "nowrap" };
  const valCell = { padding: "5px 8px", fontSize: 11, color: INK, borderBottom: bd };

  // 품목을 좌/우 두 표로 분할 (영수 양식 느낌). 빈 행으로 높이 맞춤.
  const ROWS = Math.max(6, Math.ceil(items.length / 2));
  const left = items.slice(0, ROWS);
  const right = items.slice(ROWS);
  const subtotal = (arr) => arr.length * unit;

  const ItemTable = ({ rows, offset }) => (
    <table style={{ borderCollapse: "collapse", width: "100%", border: bd }}>
      <thead>
        <tr>
          {["No", "날짜", "품목", "수량", "단가", "금액"].map((h, i) => (
            <th key={h} style={{ ...hd, textAlign: i >= 3 ? "right" : i === 0 ? "center" : "left", width: i === 0 ? 26 : i === 2 ? "auto" : i === 3 ? 34 : 64 }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: ROWS }).map((_, i) => {
          const it = rows[i];
          return (
            <tr key={i} style={{ height: 22 }}>
              <td style={{ ...td, textAlign: "center", color: FAINT }}>{it ? offset + i + 1 : ""}</td>
              <td style={td}>{it ? it.date : ""}</td>
              <td style={td}>{it ? "추모영상 제작 · " + it.deceased : ""}</td>
              <td style={{ ...td, textAlign: "right" }}>{it ? 1 : ""}</td>
              <td style={{ ...td, textAlign: "right" }} className="tabular-nums">{it ? won(unit) : ""}</td>
              <td style={{ ...td, textAlign: "right" }} className="tabular-nums">{it ? won(unit) : ""}</td>
            </tr>
          );
        })}
        <tr>
          <td colSpan={5} style={{ ...td, textAlign: "right", background: "#faf8f3", fontWeight: 700, color: MUTE }}>소계</td>
          <td style={{ ...td, textAlign: "right", background: "#faf8f3", fontWeight: 700 }} className="tabular-nums">{won(subtotal(rows))}</td>
        </tr>
      </tbody>
    </table>
  );

  return (
    <div>
      <div className="mb-3 flex items-center justify-end gap-2">
        <Btn size="sm" variant="neutral"><Printer className="h-3.5 w-3.5" /> 인쇄</Btn>
        <Btn size="sm"><Mail className="h-3.5 w-3.5" /> 이메일 발송</Btn>
      </div>
      <div className="mx-auto" style={{ maxWidth: 900, background: SURFACE, border: "1px solid " + LINE2, borderRadius: RADIUS, padding: 28 }}>
        {/* 타이틀 */}
        <div className="mb-4 flex items-end justify-between">
          <div style={{ width: 120 }} />
          <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: 8, color: INK }}>거 래 명 세 서</div>
          <div className="text-right text-[11px]" style={{ width: 120, color: FAINT }}>No. 2026-06-001</div>
        </div>

        {/* 공급자 / 공급받는자 */}
        <div className="grid grid-cols-2 gap-3">
          <table style={{ borderCollapse: "collapse", border: bd, width: "100%" }}><tbody>
            <tr><td style={{ ...labelCell, width: 70 }}>공급자</td><td style={valCell}>{C.name} (대표 {C.ceo} 인)</td></tr>
            <tr><td style={labelCell}>등록번호</td><td style={valCell} className="tabular-nums">{C.biz}</td></tr>
            <tr><td style={labelCell}>업태/종목</td><td style={valCell}>{C.type}</td></tr>
            <tr><td style={{ ...labelCell, borderBottom: "none" }}>주소</td><td style={{ ...valCell, borderBottom: "none" }}>{C.addr}</td></tr>
          </tbody></table>
          <table style={{ borderCollapse: "collapse", border: bd, width: "100%" }}><tbody>
            <tr><td style={{ ...labelCell, width: 70 }}>공급받는자</td><td style={valCell}>{partner || "—"}</td></tr>
            <tr><td style={labelCell}>지역</td><td style={valCell}>{recv ? recv.region : "—"}</td></tr>
            <tr><td style={labelCell}>담당자</td><td style={valCell}>{recv ? recv.manager : "—"}</td></tr>
            <tr><td style={{ ...labelCell, borderBottom: "none" }}>건당 단가</td><td style={{ ...valCell, borderBottom: "none" }} className="tabular-nums">{won(unit)}원 (VAT 포함)</td></tr>
          </tbody></table>
        </div>

        {/* 작성일 · 거래기간 · 합계금액 밴드 */}
        <div className="mt-3 flex items-center justify-between px-3 py-2.5" style={{ border: bd, borderRadius: RADIUS, background: "#faf8f3" }}>
          <div className="flex gap-6 text-[11.5px]" style={{ color: MUTE }}>
            <span>작성일 <b style={{ color: INK }}>{issuedAt || "2026. 06. 30"}</b></span>
            <span>거래기간 <b style={{ color: INK }}>{period || "2026. 06. 01 ~ 06. 30"}</b></span>
          </div>
          <div className="text-[12px]" style={{ color: MUTE }}>합계금액 <span className="ml-1 text-[16px] font-extrabold tabular-nums" style={{ color: GOLD_D }}>₩ {won(total)}원</span></div>
        </div>

        {/* 품목 2분할 표 */}
        <div className="mt-3 grid grid-cols-2 gap-3">
          <ItemTable rows={left} offset={0} />
          <ItemTable rows={right} offset={ROWS} />
        </div>

        {/* 하단 합계 밴드 */}
        <div className="mt-3 grid grid-cols-4" style={{ border: bd, borderRadius: RADIUS, overflow: "hidden" }}>
          {[["총 건수", items.length + "건"], ["공급가액", won(supply) + "원"], ["부가세 (10%)", won(vat) + "원"], ["합계", won(total) + "원"]].map(([l, v], i) => (
            <div key={l} className="flex flex-col items-center gap-0.5 px-3 py-2.5" style={{ borderRight: i < 3 ? bd : "none", background: i === 3 ? "#f1e8d8" : SURFACE }}>
              <span className="text-[11px]" style={{ color: MUTE }}>{l}</span>
              <span className={"text-[13px] font-bold tabular-nums" + (i === 3 ? "" : "")} style={{ color: i === 3 ? GOLD_D : INK }}>{v}</span>
            </div>
          ))}
        </div>

        {/* 푸터: 안내 + 결제 계좌 */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="text-[10.5px] leading-relaxed" style={{ color: FAINT }}>
            위 금액을 정히 청구합니다.<br />
            ※ 세금계산서 발행은 개발 범위 제외 — 거래명세서 제작·메일 발송까지 지원 (기획안 정산 §4 · 견적서 조건).<br />
            ※ 단가는 발행 시점 스냅샷으로 동결됩니다.
          </div>
          <table style={{ borderCollapse: "collapse", border: bd, width: "100%", alignSelf: "start" }}><tbody>
            <tr><td style={{ ...labelCell, width: 64 }}>은행</td><td style={valCell}>{C.bank}</td></tr>
            <tr><td style={labelCell}>계좌번호</td><td style={valCell} className="tabular-nums">{C.account}</td></tr>
            <tr><td style={{ ...labelCell, borderBottom: "none" }}>예금주</td><td style={{ ...valCell, borderBottom: "none" }}>{C.holder}</td></tr>
          </tbody></table>
        </div>
      </div>
    </div>
  );
}
