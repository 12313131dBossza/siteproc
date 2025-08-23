import React, { useMemo, useState } from 'react';

export interface Column<T> { key: keyof T; header: string; sortable?: boolean; render?: (row: T) => React.ReactNode; }
interface DataTableProps<T extends Record<string, any>> { columns: Column<T>[]; rows: T[]; loading?: boolean; emptyMessage?: string; onRowClick?: (row: T)=>void; }

export function DataTable<T extends Record<string, any>>({ columns, rows, loading, emptyMessage='No data', onRowClick }: DataTableProps<T>) {
  const [sort, setSort] = useState<{ key: keyof T; dir: 'asc'|'desc' } | null>(null);
  const sorted = useMemo(() => {
    if (!sort) return rows;
    const copy = [...rows];
    copy.sort((a,b) => {
      const v1 = a[sort.key]; const v2 = b[sort.key];
      if (v1 === v2) return 0;
      return (v1 > v2 ? 1 : -1) * (sort.dir === 'asc' ? 1 : -1);
    });
    return copy;
  }, [rows, sort]);

  function toggleSort(key: keyof T) {
    setSort(prev => {
      if (!prev || prev.key !== key) return { key, dir: 'asc' };
      if (prev.dir === 'asc') return { key, dir: 'desc' };
      return null; // third click clears sort
    });
  }

  return (
    <div className="overflow-x-auto border border-[var(--sp-color-border)] rounded-lg bg-[var(--sp-color-bg-alt)]">
      <table className="sp-table">
        <thead>
          <tr>
            {columns.map(c => (
              <th key={String(c.key)} scope="col">
                {c.sortable ? (
                  <button onClick={() => toggleSort(c.key)} className="flex items-center gap-1 select-none">
                    <span>{c.header}</span>
                    {sort?.key === c.key && <span className="text-[10px]">{sort.dir === 'asc' ? '▲' : '▼'}</span>}
                  </button>
                ) : c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr><td colSpan={columns.length} className="py-8 text-center text-[var(--sp-color-muted)]">Loading…</td></tr>
          )}
          {!loading && sorted.length === 0 && (
            <tr><td colSpan={columns.length} className="py-10 text-center text-[var(--sp-color-muted)]">{emptyMessage}</td></tr>
          )}
          {!loading && sorted.map((row,i) => (
            <tr key={i} className={onRowClick ? 'cursor-pointer' : ''} onClick={() => onRowClick?.(row)}>
              {columns.map(c => (
                <td key={String(c.key)}>{c.render ? c.render(row) : String(row[c.key])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default DataTable;
