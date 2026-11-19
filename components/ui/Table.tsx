import { cls } from '@/lib/utils';
import { SkeletonRow } from './Skeleton';
import { PackageSearch } from 'lucide-react';

interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  className?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  keyExtractor: (row: T) => string | number;
}

export function Table<T>({
  columns,
  data,
  loading,
  emptyMessage = 'No records found.',
  onRowClick,
  keyExtractor,
}: TableProps<T>) {
  return (
    <div className="overflow-hidden rounded-[14px] border border-border/70 bg-card shadow-[0_2px_8px_rgba(22,34,51,.025)]">
      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/70 bg-page/70">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cls(
                    'px-4 py-3 text-left text-sm font-semibold uppercase tracking-[.1em] text-ink-muted',
                    col.className,
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={columns.length} className="p-0">
                    <SkeletonRow cols={columns.length} />
                  </td>
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  <div className="flex flex-col items-center justify-center py-14 gap-2 text-ink-muted">
                    <PackageSearch className="h-8 w-8 text-border" strokeWidth={1.5} />
                    <span className="text-sm">{emptyMessage}</span>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr
                  key={keyExtractor(row)}
                  onClick={() => onRowClick?.(row)}
                  className={cls(
                    'transition-colors duration-100 hover:bg-page',
                    onRowClick && 'cursor-pointer',
                  )}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cls('px-4 py-3 text-[13px] text-ink', col.className)}
                    >
                      {col.cell(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile stacked cards */}
      <div className="sm:hidden divide-y divide-border">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-4 space-y-2">
              <SkeletonRow cols={2} />
            </div>
          ))
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 gap-2 text-ink-muted">
            <PackageSearch className="h-8 w-8 text-border" strokeWidth={1.5} />
            <span className="text-sm">{emptyMessage}</span>
          </div>
        ) : (
          data.map((row) => (
            <div
              key={keyExtractor(row)}
              onClick={() => onRowClick?.(row)}
              className={cls(
                'px-4 py-3 space-y-1',
                onRowClick && 'cursor-pointer active:bg-page',
              )}
            >
              {columns
                .filter((c) => c.header) // skip hidden action columns
                .map((col) => (
                  <div key={col.key} className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="text-xs text-ink-muted shrink-0">{col.header}</span>
                    <span className="text-right text-ink">{col.cell(row)}</span>
                  </div>
                ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ── Pagination ──────────────────────────────────────────────────────────── */
interface PaginationProps {
  page: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  onNext: () => void;
  onPrev: () => void;
}

export function Pagination({ page, totalPages, hasNext, hasPrev, onNext, onPrev }: PaginationProps) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between pt-3 text-sm text-ink-muted">
      <span className="text-xs">Page {page} of {totalPages}</span>
      <div className="flex gap-2">
        <button
          disabled={!hasPrev}
          onClick={onPrev}
          className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-page disabled:opacity-40 transition-colors"
        >
          ← Prev
        </button>
        <button
          disabled={!hasNext}
          onClick={onNext}
          className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-page disabled:opacity-40 transition-colors"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
