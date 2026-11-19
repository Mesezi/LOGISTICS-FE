import { cls } from '@/lib/utils';
import { type LucideIcon } from 'lucide-react';
import { Skeleton } from './Skeleton';

interface KpiCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  loading?: boolean;
}

export function KpiCard({ title, value, icon: Icon, trend, trendUp, loading }: KpiCardProps) {
  if (loading) {
    return (
      <div className="rounded-[14px] border border-border/70 bg-card p-3.5 shadow-[0_2px_8px_rgba(22,34,51,.025)] sm:p-4 space-y-3">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-6 w-28" />
        {trend !== undefined && <Skeleton className="h-3 w-14" />}
      </div>
    );
  }

  return (
    <div className="group rounded-[14px] border border-border/70 bg-card p-3.5 shadow-[0_2px_8px_rgba(22,34,51,.025)] transition-shadow hover:shadow-[0_8px_24px_rgba(22,34,51,.06)] sm:p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium text-ink-muted truncate">{title}</p>
          <p className="mt-2 text-[22px] font-semibold tracking-tight text-ink tabular leading-tight">{value}</p>
          {trend && (
            <p className={cls('mt-1 text-xs font-semibold', trendUp ? 'text-success-text' : 'text-loss')}>
              {trend}
            </p>
          )}
        </div>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-card-alt">
          <Icon className="h-[17px] w-[17px] text-brand" strokeWidth={1.75} />
        </div>
      </div>
    </div>
  );
}
