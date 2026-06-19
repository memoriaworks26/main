// 공용 UI — 테이블 + 헤더 클릭 정렬 훅. 어느 표든 동일한 정렬/행선택을 붙인다.
import React, { useState } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { SURFACE, LINE, GOLD_D, GOLD_SOFT, INK, MUTE, FAINT, RADIUS } from "../theme.js";
import { Checkbox } from "./controls.jsx";

// 리스트 정렬 훅 — 어느 표든 동일한 헤더 클릭 정렬을 붙인다.
//   const s = useTableSort(rows, { key:"date", dir:"desc", value });
//   <Table cols={cols} rows={s.rows} sort={s.sort} onSortChange={s.onSortChange} … />
// value(row, key): 비교값 커스터마이즈(미지정 시 row[key]). 숫자는 수치, 그 외 ko 로케일·자연수 비교.
export function useTableSort(rows, opts = {}) {
  const { key: defaultKey = null, dir: defaultDir = "asc", value } = opts;
  const [sort, setSort] = useState(defaultKey ? { key: defaultKey, dir: defaultDir } : null);
  const onSortChange = (k) => setSort((s) => (s && s.key === k) ? { key: k, dir: s.dir === "asc" ? "desc" : "asc" } : { key: k, dir: k === "date" || k === "ymd" ? "desc" : "asc" });
  let out = rows;
  if (sort) {
    const val = value || ((r, k) => r[k]);
    out = [...rows].sort((a, b) => {
      const av = val(a, sort.key), bv = val(b, sort.key);
      const c = (typeof av === "number" && typeof bv === "number")
        ? av - bv
        : String(av ?? "").localeCompare(String(bv ?? ""), "ko", { numeric: true });
      return sort.dir === "asc" ? c : -c;
    });
  }
  return { rows: out, sort, onSortChange };
}

// 테이블 (헤어라인, 데이터-ink). rows 비면 empty 안내 노출.
// 정렬: sort={ key, dir:"asc"|"desc" } · onSortChange(key) · col.sortable 로 헤더 클릭 정렬 활성화
// select(선택삭제 등): { selected:Set, onToggle:(id)=>, onToggleAll:()=>, idOf?:(row)=> } — 주면 좌측 체크박스 컬럼 노출
export function Table({ cols, rows, renderCell, empty = "표시할 내용이 없습니다.", onRowClick, sort, onSortChange, select }) {
  const idOf = select?.idOf || ((r) => r.id);
  const selCount = select ? rows.filter((r) => select.selected.has(idOf(r))).length : 0;
  const allChecked = select && rows.length > 0 && selCount === rows.length;
  const spanCount = cols.length + (select ? 1 : 0);
  return (
    <div className="overflow-x-auto" style={{ border: "1px solid " + LINE, borderRadius: RADIUS, background: SURFACE }}>
      <table className="w-full" style={{ borderCollapse: "collapse", minWidth: "max-content" }}>
        <thead>
          <tr style={{ background: "#f6f3ec" }}>
            {select && (
              <th className="px-3 py-2.5" style={{ width: 40, borderBottom: "1px solid " + LINE }}>
                <Checkbox checked={allChecked} indeterminate={selCount > 0 && !allChecked} onChange={select.onToggleAll} ariaLabel="전체 선택" />
              </th>
            )}
            {cols.map((c) => {
              const sortable = c.sortable && onSortChange;
              const on = sortable && sort && sort.key === c.key;
              const SortIcon = !on ? ChevronsUpDown : sort.dir === "asc" ? ChevronUp : ChevronDown;
              return (
                <th
                  key={c.key}
                  className="whitespace-nowrap px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide"
                  style={{ color: MUTE, borderBottom: "1px solid " + LINE, textAlign: c.align || "left" }}
                >
                  {sortable ? (
                    <button
                      onClick={() => onSortChange(c.key)}
                      className="inline-flex items-center gap-1 outline-none transition hover:opacity-80 focus-visible:ring-1"
                      style={{ color: on ? GOLD_D : MUTE, justifyContent: c.align === "right" ? "flex-end" : "flex-start" }}
                    >
                      {c.label}
                      <SortIcon className="h-3 w-3 shrink-0" style={{ color: on ? GOLD_D : FAINT }} strokeWidth={2.4} />
                    </button>
                  ) : c.label}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={spanCount} className="px-3 py-10 text-center text-[13px]" style={{ color: FAINT }}>{empty}</td></tr>
          ) : rows.map((row, ri) => {
            const checked = select ? select.selected.has(idOf(row)) : false;
            return (
            <tr key={ri} onClick={onRowClick ? () => onRowClick(row) : undefined}
              className="transition hover:bg-[#f6f3ec]/60"
              style={{ borderBottom: ri < rows.length - 1 ? "1px solid " + LINE : "none", cursor: onRowClick ? "pointer" : undefined, background: checked ? GOLD_SOFT : undefined }}>
              {select && (
                <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                  <Checkbox checked={checked} onChange={() => select.onToggle(idOf(row))} ariaLabel="행 선택" />
                </td>
              )}
              {cols.map((c) => (
                <td key={c.key} className="whitespace-nowrap px-3 py-2.5 text-[13px]" style={{ color: INK, textAlign: c.align || "left" }}>
                  {renderCell ? renderCell(row, c.key) : row[c.key]}
                </td>
              ))}
            </tr>
          );})}
        </tbody>
      </table>
    </div>
  );
}
