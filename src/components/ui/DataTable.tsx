import { useState, useMemo } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Download, Search } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { ColumnDef, SortDirection } from '../../types';
import { EmptyState } from './EmptyState';

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  pageSize?: number;
  searchable?: boolean;
  searchPlaceholder?: string;
  exportable?: boolean;
  onExport?: () => void;
  onRowClick?: (row: T) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
}

export function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  pageSize = 10,
  searchable = true,
  searchPlaceholder = 'Search...',
  exportable = true,
  onExport,
  onRowClick,
  emptyTitle = 'No data found',
  emptyDescription = 'Try adjusting your search or filters.',
  className,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>(null);
  const [page, setPage] = useState(0);

  const filteredData = useMemo(() => {
    if (!search) return data;
    const lower = search.toLowerCase();
    return data.filter((row) =>
      columns.some((col) => {
        const val = row[col.key];
        return val != null && String(val).toLowerCase().includes(lower);
      })
    );
  }, [data, search, columns]);

  const sortedData = useMemo(() => {
    if (!sortKey || !sortDir) return filteredData;
    return [...filteredData].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filteredData, sortKey, sortDir]);

  const totalPages = Math.ceil(sortedData.length / pageSize);
  const pagedData = sortedData.slice(page * pageSize, (page + 1) * pageSize);

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : sortDir === 'desc' ? null : 'asc');
      if (sortDir === 'desc') setSortKey(null);
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setPage(0);
  }

  function SortIcon({ columnKey }: { columnKey: string }) {
    if (sortKey !== columnKey) return <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />;
    if (sortDir === 'asc') return <ArrowUp className="w-3.5 h-3.5 text-primary-400" />;
    return <ArrowDown className="w-3.5 h-3.5 text-primary-400" />;
  }

  if (sortedData.length === 0 && search) {
    return (
      <div className={cn('card overflow-hidden', className)}>
        {searchable && (
          <div className="p-4 border-b border-app">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="input-md pl-10"
              />
            </div>
          </div>
        )}
        <EmptyState icon="search" title={emptyTitle} description={emptyDescription} />
      </div>
    );
  }

  return (
    <div className={cn('card overflow-hidden', className)}>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border-b border-app">
        {searchable && (
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              placeholder={searchPlaceholder}
              className="input-md pl-10"
              aria-label={searchPlaceholder}
            />
          </div>
        )}
        <div className="flex items-center gap-2">
          {exportable && (
            <button onClick={onExport} className="btn-ghost btn-sm gap-1.5" aria-label="Export data">
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span>
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm" role="table">
          <thead>
            <tr className="border-b border-app">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'px-4 py-3 text-left text-xs font-semibold text-app-secondary uppercase tracking-wider whitespace-nowrap',
                    col.sortable && 'cursor-pointer select-none hover:text-app-primary transition-colors'
                  )}
                  style={col.width ? { width: col.width } : undefined}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                  aria-sort={sortKey === col.key ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}
                >
                  <div className="flex items-center gap-1.5">
                    {col.label}
                    {col.sortable && <SortIcon columnKey={col.key} />}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-app">
            {pagedData.map((row, i) => (
              <tr
                key={i}
                className={cn(
                  'transition-colors',
                  onRowClick && 'cursor-pointer hover:bg-app-tertiary'
                )}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                onKeyDown={onRowClick ? (e) => { if (e.key === 'Enter') onRowClick(row); } : undefined}
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 text-app-primary whitespace-nowrap">
                    {col.render ? col.render(row[col.key], row) : String(row[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-app">
          <p className="text-xs text-app-secondary">
            Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, sortedData.length)} of {sortedData.length}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="btn-ghost btn-sm"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => setPage(i)}
                className={cn(
                  'w-8 h-8 rounded-lg text-xs font-medium transition-colors',
                  page === i ? 'bg-primary-600 text-white' : 'text-app-secondary hover:bg-app-tertiary'
                )}
                aria-label={`Page ${i + 1}`}
                aria-current={page === i ? 'page' : undefined}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page === totalPages - 1}
              className="btn-ghost btn-sm"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
