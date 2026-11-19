import { cls } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
}

/** Pulsing placeholder block. Use instead of spinners for content areas. */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cls(
        'animate-pulse rounded-[10px] bg-border',
        className,
      )}
    />
  );
}

/** Pre-composed skeleton row for table-like lists */
export function SkeletonRow({ cols = 4 }: { cols?: number }) {
  return (
    <div className="flex items-center gap-4 px-4 py-3">
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton
          key={i}
          className={cls('h-4', i === 0 ? 'w-20' : i === 1 ? 'flex-1' : 'w-16')}
        />
      ))}
    </div>
  );
}

/** Pre-composed skeleton for a KPI card */
export function SkeletonCard() {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-7 w-32" />
      <Skeleton className="h-3 w-16" />
    </div>
  );
}
