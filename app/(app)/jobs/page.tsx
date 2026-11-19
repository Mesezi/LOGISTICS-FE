'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, subDays } from 'date-fns';
import {
  Plus, Search,
  ChevronRight, XCircle, CalendarDays, Briefcase,
} from 'lucide-react';
import { jobsApi, type Job, type JobStatus } from '@/lib/api';
import { fmt, fmtDate, statusColors } from '@/lib/utils';
import { Pagination } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Dropdown } from '@/components/ui/Dropdown';
import { useUIStore } from '@/store/ui';
import { JobDrawer } from '@/components/jobs/JobDrawer';
import { JobDetailDrawer } from '@/components/jobs/JobDetailDrawer';
import { ExpenseDrawer } from '@/components/expenses/ExpenseDrawer';
import { useToday } from '@/lib/useToday';

type DateRange = 'today' | '7days' | '30days' | 'custom';

const DATE_RANGES: { label: string; value: DateRange }[] = [
  { label: 'Today',   value: 'today'   },
  { label: '7 days',  value: '7days'   },
  { label: '30 days', value: '30days'  },
  { label: 'Custom',  value: 'custom'  },
];

const FILTERS: { label: string; value: string }[] = [
  { label: 'All',        value: ''            },
  { label: 'Unpaid',     value: 'unpaid'      },
  { label: 'Sublet',     value: 'has_sublet'  },
  { label: 'Partner',    value: 'has_partner' },
  { label: 'Pending',    value: 'pending'     },
  { label: 'Picked up',  value: 'picked_up'   },
  { label: 'Delivered',  value: 'delivered'   },
  { label: 'Failed',     value: 'failed'      },
  { label: 'Cancelled',  value: 'cancelled'   },
];

export default function JobsPage() {
  const { openJobDrawer, openJobDetail } = useUIStore();

  const [page,     setPage]     = useState(1);
  const [filter,   setFilter]   = useState('');
  const [search,   setSearch]   = useState('');
  const [range,    setRange]    = useState<DateRange>('30days');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo,   setDateTo]   = useState('');
  const today = useToday();

  const { data, isLoading } = useQuery({
    queryKey: ['jobs', { page, filter, range, dateFrom, dateTo }],
    queryFn: () => {
      const params: Record<string, unknown> = { page, limit: 20 };

      if (filter === 'unpaid')      params.unpaid      = true;
      else if (filter === 'has_sublet')  params.has_sublet  = true;
      else if (filter === 'has_partner') params.has_partner = true;
      else if (filter)              params.status      = filter as JobStatus;

      const todayDate = today ? new Date(`${today}T12:00:00`) : null;
      if (range === 'today') {
        if (today) {
          params.date_from = today;
          params.date_to = today;
        }
      } else if ((range === '7days' || range === '30days') && todayDate) {
        params.date_from = format(subDays(todayDate, range === '7days' ? 6 : 29), 'yyyy-MM-dd');
        params.date_to   = today;
      } else {
        if (dateFrom) params.date_from = dateFrom;
        if (dateTo)   params.date_to   = dateTo;
      }

      return jobsApi.list(params);
    },
    enabled: range === 'custom' || Boolean(today),
  });

  const jobs = data?.data ?? [];
  const meta = data?.meta;

  const q = search.trim().toLowerCase();
  const filtered = q
    ? jobs.filter((j) =>
        j.client?.name?.toLowerCase().includes(q) ||
        j.pickup.toLowerCase().includes(q) ||
        j.dropoff.toLowerCase().includes(q) ||
        String(j.id).includes(q))
    : jobs;

  return (
    <div className="mx-auto max-w-275 space-y-3 px-4 py-4 lg:px-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-ink">Jobs</h1>
        <Button
          size="sm"
          icon={<Plus size={16} strokeWidth={1.75} />}
          onClick={() => openJobDrawer()}
          className="hidden lg:inline-flex py-3"
        >
          New Job
        </Button>
      </div>

      {/* ── Search + controls ── */}
      <div className="space-y-2.5 rounded-xl border border-border bg-card p-3">
        {/* Search bar */}
        <div className="relative">
          <Search size={15} strokeWidth={1.75} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-grey" />
          <input
            aria-label="Search jobs"
            placeholder="Search client, pickup, drop-off…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-[10px] border not-focus:border-border not-focus:bg-page pl-9 pr-9 text-sm text-ink outline-none transition focus:border-brand focus:bg-card focus:ring-2 focus:ring-brand/15"
          />
          {search && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-grey hover:text-ink"
            >
              <XCircle size={15} />
            </button>
          )}
        </div>

        {/* Date range + filter dropdowns */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-xs font-medium text-ink-muted">Date</span>
            <Dropdown
              aria-label="Date range"
              value={range}
              options={DATE_RANGES}
              onChange={(v) => { setRange(v as DateRange); setPage(1); }}
              className="w-32"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-xs font-medium text-ink-muted">Filter</span>
            <Dropdown
              aria-label="Filter jobs"
              value={filter}
              options={FILTERS}
              onChange={(v) => { setFilter(v); setPage(1); }}
              className="w-36"
            />
          </div>
          <span className="text-xs text-ink-muted">
            {meta?.total ?? filtered.length} job{(meta?.total ?? filtered.length) !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Custom date inputs — only when Custom is selected */}
        {range === 'custom' && (
          <div className="flex flex-wrap items-center gap-2 border-t border-border pt-2.5">
            <CalendarDays size={14} className="shrink-0 text-ink-grey" />
            <label className="flex items-center gap-2 text-xs text-ink-muted">
              From
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                className="h-9 rounded-lg border border-border bg-page px-2.5 text-xs text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
              />
            </label>
            <label className="flex items-center gap-2 text-xs text-ink-muted">
              To
              <input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                className="h-9 rounded-lg border border-border bg-page px-2.5 text-xs text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
              />
            </label>
          </div>
        )}
      </div>

      {/* ── Job list ── */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No jobs found"
          description="Try a different search, filter or date range."
          action={
            <Button
              size="sm"
              icon={<Plus size={16} strokeWidth={1.75} />}
              onClick={() => openJobDrawer()}
            >
              New Job
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
          {filtered.map((job) => (
            <JobRow key={job.id} job={job} onClick={() => openJobDetail(job.id)} />
          ))}
        </div>
      )}

      {meta && (
        <Pagination
          page={meta.page}
          totalPages={meta.totalPages}
          hasNext={meta.hasNextPage}
          hasPrev={meta.hasPreviousPage}
          onNext={() => setPage((p) => p + 1)}
          onPrev={() => setPage((p) => p - 1)}
        />
      )}

      <JobDrawer />
      <JobDetailDrawer />
      <ExpenseDrawer />
    </div>
  );
}

/* ── Job row card ─────────────────────────────────────────────────────────── */
function JobRow({ job, onClick }: { job: Job; onClick: () => void }) {
  const s = statusColors[job.status];
  const initials = (job.client?.name ?? '—')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
  const createdAt = new Date(job.created_at);
  const createdLabel = Number.isNaN(createdAt.getTime())
    ? fmtDate(job.job_date)
    : format(createdAt, 'dd MMM yyyy, HH:mm');
  const passedOn = job.sublet_amount + job.park_waybill + job.partner_amount;
  const incomeShare = job.total > 0
    ? Math.max(0, Math.min(100, (job.office_fee / job.total) * 100))
    : 0;
  const dispatchLabel = job.sublet_name
    ? 'Sublet Dispatch'
    : job.partner_id || job.partner || job.partner_name_snapshot || job.partner_name
    ? 'Partner Dispatch'
    : 'Standard Dispatch';
  const passedOnLabel = job.sublet_amount > 0 || job.partner_amount > 0
    ? 'Other fees'
    : 'Waybill/Park';
  const riderName = job.rider?.name
    ?? (job.rider_id ? `Rider #${job.rider_id}` : job.sublet_name);
  const assignmentLabel = job.rider
    ? job.status === 'picked_up' ? 'Picked up by' : 'Assigned rider'
    : job.rider_id
    ? 'Assigned rider'
    : job.sublet_name
    ? 'Sublet courier'
    : 'Rider assignment';

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`View job ${job.id} for ${job.client?.name ?? 'unknown client'}`}
      className="group w-full overflow-hidden rounded-xl border border-border bg-card text-left shadow-sm transition hover:border-brand/30 hover:shadow-md active:scale-[.995]"
    >
      <div className="flex items-start justify-between gap-3 px-3.5 py-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-ink-dark text-[10px] font-bold text-white">
            {initials}
          </div>
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="truncate text-xs font-semibold text-ink">
                {job.client?.name ?? '—'}
              </span>
              <Badge bg={s.bg} label={s.label} className="shrink-0 px-1.5 py-0 text-[9px] leading-4" />
            </div>
            <p className="mt-1 truncate text-[10px] text-ink-muted">
              #{job.id} · {createdLabel}
            </p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[9px] font-medium uppercase tracking-wide text-ink-muted">Total due</p>
          <p className="tabular text-sm font-bold text-ink">{fmt(job.total)}</p>
        </div>
      </div>

      <div className="mx-3.5 rounded-lg border border-border/70 bg-page/60 px-2.5 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="h-2 w-2 shrink-0 rounded-full bg-brand" />
          <span className="truncate text-[11px] font-medium text-ink">{job.pickup}</span>
          <span className="h-px min-w-3 flex-1 bg-border" />
          <span className="h-2 w-2 shrink-0 rounded-full bg-success-text" />
          <span className="truncate text-[11px] font-medium text-ink">{job.dropoff}</span>
          <span className="ml-auto hidden shrink-0 rounded border border-border bg-card px-1.5 py-0.5 text-[9px] text-ink-muted sm:inline-flex">
            {dispatchLabel}
          </span>
        </div>
      </div>

      <div className="px-3.5 pb-2.5 pt-2">
        <div className="flex items-center justify-between gap-3 text-[10px]">
          <span className="truncate font-medium text-success-text">
            Your income: <span className="tabular font-semibold">{fmt(job.office_fee)}</span>
          </span>
          {passedOn > 0 && (
            <span className="shrink-0 font-medium text-debt">
              {passedOnLabel}: <span className="tabular font-semibold">{fmt(passedOn)}</span>
            </span>
          )}
        </div>
        <div className="mt-1.5 flex h-[3px] overflow-hidden rounded-full bg-border">
          <span className="bg-success-text transition-all" style={{ width: `${incomeShare}%` }} />
          <span className="flex-1 bg-debt" />
        </div>
      </div>

      <div className="flex items-center gap-2.5 border-t border-border px-3.5 py-2.5">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-success-bg bg-success-bg text-[10px] font-semibold text-success-text">
          {riderName ? riderName.charAt(0).toUpperCase() : '—'}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[9px] uppercase leading-3 tracking-wide text-ink-grey">
            {assignmentLabel}
          </span>
          <span className={`block truncate text-xs font-semibold leading-4 ${riderName ? 'text-ink' : 'text-ink-muted'}`}>
            {riderName ?? 'No rider assigned'}
          </span>
        </span>
        <span className="inline-flex shrink-0 items-center gap-0.5 text-[10px] font-semibold text-success-text transition-colors group-hover:text-brand">
          View details
          <ChevronRight size={13} strokeWidth={1.75} className="transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </button>
  );
}
