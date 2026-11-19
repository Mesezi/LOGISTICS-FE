'use client';

import { useEffect, useState } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { format, subDays } from 'date-fns';
import {
  TrendingUp, Banknote, TriangleAlert, Receipt,
  Plus, ChevronRight, MapPin, Truck, CalendarDays,
} from 'lucide-react';
import { reportsApi, jobsApi, type Job } from '@/lib/api';
import { fmt, fmtDate, statusColors } from '@/lib/utils';
import { KpiCard } from '@/components/ui/KpiCard';
import { Badge } from '@/components/ui/Badge';
import { useUIStore } from '@/store/ui';
import { JobDrawer } from '@/components/jobs/JobDrawer';
import { PaymentDrawer } from '@/components/jobs/PaymentDrawer';
import { ExpenseDrawer } from '@/components/expenses/ExpenseDrawer';
import { JobDetailDrawer } from '@/components/jobs/JobDetailDrawer';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';

export default function DashboardPage() {
  const {
    activeDate, setActiveDate,
    openJobDrawer, openExpenseDrawer, openJobDetail,
  } = useUIStore();

  const [today,     setToday]     = useState('');
  const [yesterday, setYesterday] = useState('');

  /* anchor the weekly chart to the selected date */
  const anchorDate = activeDate ? new Date(`${activeDate}T12:00:00`) : null;
  const weekDays = anchorDate
    ? Array.from({ length: 7 }, (_, i) => {
        const d = subDays(anchorDate, 6 - i);
        return { date: format(d, 'yyyy-MM-dd'), label: format(d, 'EEE') };
      })
    : [];

  /* compute today / yesterday client-side only to avoid SSR mismatch */
  useEffect(() => {
    const now = new Date();
    const t = format(now, 'yyyy-MM-dd');
    setToday(t);
    setYesterday(format(subDays(now, 1), 'yyyy-MM-dd'));
    if (!activeDate) setActiveDate(t);
  }, [activeDate, setActiveDate]);

  const { data: daily, isLoading: dailyLoading } = useQuery({
    queryKey: ['reports', 'daily', activeDate],
    queryFn:  () => reportsApi.daily(activeDate),
  });

  const { data: jobsData, isLoading: jobsLoading } = useQuery({
    queryKey: ['jobs', { date_from: activeDate, date_to: activeDate, limit: 20 }],
    queryFn:  () => jobsApi.list({ date_from: activeDate, date_to: activeDate, limit: 20 }),
    enabled: Boolean(activeDate),
  });

  const weekQueries = useQueries({
    queries: weekDays.map(({ date }) => ({
      queryKey: ['reports', 'daily', date],
      queryFn:  () => reportsApi.daily(date),
      staleTime: 60_000,
    })),
  });

  const jobs: Job[] = jobsData?.data ?? [];

  const outstanding = Math.max(
    0,
    (daily?.officeFees ?? 0) - (daily?.paymentsReceived ?? 0) + (daily?.refundsIssued ?? 0),
  );

  const needsAttention = jobs.filter(
    (j) => j.status === 'pending' || j.status === 'failed' || j.status === 'cancelled',
  );

  /* chart maths */
  const weekData = weekQueries.map((q) => q.data);
  const maxCash  = Math.max(...weekData.map((d) => d?.paymentsReceived ?? 0), 1);
  const maxJobs  = Math.max(...weekData.map((d) => d?.jobCount ?? 0), 1);
  const cashLine = weekData
    .map((d, i) => `${57 + i * 90},${147 - ((d?.paymentsReceived ?? 0) / maxCash) * 118}`)
    .join(' ');

  return (
    <div className="mx-auto max-w-275 space-y-5 px-4 py-5 lg:px-6">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink">Dashboard</h1>
          <p className="mt-0.5 text-xs text-ink-muted">{fmtDate(activeDate)}</p>
        </div>

        {/* Date picker strip */}
        <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-0.5">
          {/* Quick buttons — only rendered once today/yesterday are known */}
          {today && (
            <>
              <button
                onClick={() => setActiveDate(yesterday)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  activeDate === yesterday
                    ? 'bg-brand text-white shadow-sm'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                Yesterday
              </button>
              <button
                onClick={() => setActiveDate(today)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  activeDate === today
                    ? 'bg-brand text-white shadow-sm'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                Today
              </button>
            </>
          )}
          {/* Calendar icon opens the native date picker */}
          <label className="relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-ink-grey transition-colors hover:bg-page hover:text-ink">
            <CalendarDays size={15} strokeWidth={1.75} />
            <input
              type="date"
              value={activeDate}
              onChange={(e) => setActiveDate(e.target.value)}
              className="absolute inset-0 cursor-pointer opacity-0"
              aria-label="Pick a custom date"
            />
          </label>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiCard title="Office Income" value={fmt(daily?.officeFees ?? 0)}                                              icon={TrendingUp}    loading={dailyLoading} />
        <KpiCard title="Cash / Bank"   value={fmt((daily?.paymentsReceived ?? 0) - (daily?.refundsIssued ?? 0))}        icon={Banknote}      loading={dailyLoading} />
        <KpiCard title="Expenses"      value={fmt(daily?.expenses ?? 0)}                                                icon={Receipt}       loading={dailyLoading} />
        <KpiCard title="Outstanding"   value={fmt(outstanding)}                                                         icon={TriangleAlert} loading={dailyLoading} />
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        <Button icon={<Plus size={16} strokeWidth={1.75} />} onClick={() => openJobDrawer()}>
          New Job
        </Button>
        <Button
          variant="secondary"
          icon={<Receipt size={16} strokeWidth={1.75} />}
          onClick={() => openExpenseDrawer()}
        >
          Log Expense
        </Button>
      </div>

      {/* Chart + Needs attention */}
      <div className="grid gap-4 xl:grid-cols-[1.45fr_.75fr]">

        {/* 7-day chart */}
        <section className="overflow-hidden rounded-2xl border border-border bg-card p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-brand">Performance</p>
              <h2 className="mt-1 text-base font-semibold text-ink">Last 7 days</h2>
            </div>
            <div className="flex gap-4 pt-1 text-[11px] text-ink-muted">
              <span className="flex items-center gap-1.5">
                <i className="h-2 w-2 rounded-sm bg-brand" />
                Orders
              </span>
              <span className="flex items-center gap-1.5">
                <i className="h-0.5 w-3 rounded bg-ink-dark" />
                Payments
              </span>
            </div>
          </div>

          <div className="mt-4">
            {weekQueries.some((q) => q.isLoading) ? (
              <Skeleton className="h-47.5 w-full rounded-xl" />
            ) : (
              <svg
                viewBox="0 0 640 205"
                role="img"
                aria-label="Orders and payments for the last 7 days"
                className="h-47.5 w-full overflow-visible sm:h-55"
              >
                {[25, 65, 105, 147].map((y) => (
                  <line key={y} x1="34" x2="615" y1={y} y2={y} stroke="var(--border)" strokeDasharray="3 5" />
                ))}
                {weekData.map((day, i) => {
                  const x = 40 + i * 90;
                  const h = ((day?.jobCount ?? 0) / maxJobs) * 108;
                  return (
                    <g key={weekDays[i]?.date ?? i}>
                      <rect x={x} y={147 - h} width="34" height={h} rx="6" fill="var(--brand)" opacity=".82" />
                      <text x={x + 17} y="183" textAnchor="middle" fill="var(--ink-muted)" fontSize="11">
                        {weekDays[i]?.label}
                      </text>
                    </g>
                  );
                })}
                <polyline
                  points={cashLine}
                  fill="none"
                  stroke="var(--ink-dark)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {weekData.map((day, i) => (
                  <circle
                    key={weekDays[i]?.date ?? i}
                    cx={57 + i * 90}
                    cy={147 - ((day?.paymentsReceived ?? 0) / maxCash) * 118}
                    r="3.5"
                    fill="var(--card)"
                    stroke="var(--ink-dark)"
                    strokeWidth="2"
                  />
                ))}
              </svg>
            )}
          </div>

          <div className="mt-2 grid grid-cols-2 gap-3 border-t border-border pt-4">
            <div>
              <p className="text-[11px] text-ink-muted">Jobs booked</p>
              <p className="mt-1 tabular text-lg font-semibold text-ink">
                {dailyLoading ? '—' : (daily?.jobCount ?? 0)}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-ink-muted">Payments received</p>
              <p className="mt-1 tabular text-lg font-semibold text-ink">
                {dailyLoading ? '—' : fmt(daily?.paymentsReceived ?? 0)}
              </p>
            </div>
          </div>
        </section>

        {/* Needs attention */}
        <section className="rounded-[14px] border border-border bg-card p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-ink">Needs attention</h2>
              <p className="mt-0.5 text-xs text-ink-muted">Pending &amp; unsuccessful</p>
            </div>
            <span className="rounded-full bg-card-alt px-2 py-1 text-[11px] font-semibold text-brand">
              {needsAttention.length}
            </span>
          </div>

          {jobsLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : needsAttention.length === 0 ? (
            <div className="flex min-h-32 flex-col items-center justify-center rounded-lg bg-page px-4 text-center">
              <Truck size={22} className="mb-2 text-success-text" strokeWidth={1.75} />
              <p className="text-sm font-medium text-ink">All clear</p>
              <p className="mt-1 text-xs text-ink-muted">No orders need attention today.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {needsAttention.slice(0, 4).map((job) => (
                <button
                  key={job.id}
                  onClick={() => openJobDetail(job.id)}
                  className="flex w-full items-center gap-3 py-3 text-left transition-colors hover:opacity-80 first:pt-0 last:pb-0"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-card-alt text-brand">
                    <Truck size={15} strokeWidth={1.75} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold text-ink">
                      {job.client?.name ?? '—'}
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] text-ink-muted">
                      {job.pickup} {'→'} {job.dropoff}
                    </span>
                  </span>
                  <Badge bg={statusColors[job.status].bg} label={statusColors[job.status].label} />
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Activity feed */}
      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-ink">Recent orders</h2>
            <p className="mt-0.5 text-xs text-ink-muted">
              Latest activity for {fmtDate(activeDate)}
            </p>
          </div>
          {!dailyLoading && daily && (
            <span className="text-xs text-ink-muted">{daily.jobCount} total</span>
          )}
        </div>

        {jobsLoading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div className="rounded-xl border border-border bg-card px-4 py-10 text-center">
            <Truck size={28} className="mx-auto mb-2 text-border" strokeWidth={1.5} />
            <p className="text-sm text-ink-muted">No jobs on this date.</p>
            <button
              onClick={() => openJobDrawer()}
              className="mt-3 text-sm font-semibold text-brand hover:underline"
            >
              Create one
            </button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-[14px] border bg-card divide-y divide-border">
            {jobs.map((job) => (
              <JobRow key={job.id} job={job} onClick={() => openJobDetail(job.id)} />
            ))}
          </div>
        )}
      </section>

      <JobDrawer />
      <PaymentDrawer />
      <ExpenseDrawer />
      <JobDetailDrawer />
    </div>
  );
}

/* ── Job row ──────────────────────────────────────────────────────────────── */
function JobRow({ job, onClick }: { job: Job; onClick: () => void }) {
  const s = statusColors[job.status];
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-page"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-ink">{job.client?.name ?? '—'}</p>
        <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-ink-muted">
          <MapPin size={11} strokeWidth={1.75} />
          {job.pickup} {'→'} {job.dropoff}
        </p>
      </div>
      <div className="ml-3 flex shrink-0 items-center gap-2">
        <span className="tabular text-sm font-semibold text-ink">{fmt(job.total)}</span>
        <Badge bg={s.bg} label={s.label} />
        <ChevronRight size={15} className="text-ink-grey" strokeWidth={1.75} />
      </div>
    </button>
  );
}
