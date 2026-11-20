'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, subDays } from 'date-fns';
import { CalendarDays } from 'lucide-react';
import { reportsApi, clientsApi, type RiderReportRow } from '@/lib/api';
import { fmt, fmtDate } from '@/lib/utils';
import { Table, Pagination } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton';
import { Dropdown } from '@/components/ui/Dropdown';
import { useToday } from '@/lib/useToday';

const TABS = ['Income', 'Riders', 'Sublets', 'Partners', 'Debts', 'Failed Jobs', 'Client Statement'] as const;
type Tab = typeof TABS[number];

type DatePreset = 'today' | '7days' | '30days' | 'custom' | '';

const DATE_PRESETS: { label: string; value: DatePreset }[] = [
  { label: 'All time',     value: ''       },
  { label: 'Today',        value: 'today'  },
  { label: 'Last 7 days',  value: '7days'  },
  { label: 'Last 30 days', value: '30days' },
  { label: 'Custom',       value: 'custom' },
];

export default function ReportsPage() {
  const [tab,        setTab]        = useState<Tab>('Income');
  const [datePreset, setDatePreset] = useState<DatePreset>('');
  const [startDate,  setStartDate]  = useState('');
  const [endDate,    setEndDate]    = useState('');
  const today = useToday();

  const todayDate = today ? new Date(`${today}T12:00:00`) : null;
  const resolvedStart =
    datePreset === 'today'  ? today :
    datePreset === '7days'  && todayDate ? format(subDays(todayDate, 6), 'yyyy-MM-dd') :
    datePreset === '30days' && todayDate ? format(subDays(todayDate, 29), 'yyyy-MM-dd') :
    datePreset === 'custom' ? startDate :
    '';
  const resolvedEnd =
    datePreset === 'today' || datePreset === '7days' || datePreset === '30days' ? today :
    datePreset === 'custom' ? endDate :
    '';

  const dateParams = {
    start_date: resolvedStart || undefined,
    end_date:   resolvedEnd   || undefined,
  };

  return (
    <div className="mx-auto max-w-[1600px] space-y-4 px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
      <div>
        <p className="mb-1 text-sm font-semibold uppercase tracking-[.14em] text-brand">BluSync / Performance</p>
        <h1 className="text-[22px] font-semibold tracking-tight text-ink">Reports</h1>
      </div>

      {/* Tab bar */}
      <div className="-mx-4 px-4 pb-0.5 lg:mx-0 lg:px-0">
        <div className="flex w-full flex-nowrap gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1 lg:w-fit lg:overflow-visible">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`shrink-0 whitespace-nowrap rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                tab === t
                  ? 'bg-brand text-white shadow-sm'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Date range — shared for all except Client Statement */}
      {tab !== 'Client Statement' && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-xs font-medium text-ink-muted">Period</span>
            <Dropdown
              aria-label="Date range"
              value={datePreset}
              options={DATE_PRESETS}
              onChange={(v) => setDatePreset(v as DatePreset)}
              className="w-36"
            />
          </div>
          {datePreset === 'custom' && (
            <div className="flex flex-wrap items-center gap-2">
              <CalendarDays size={14} className="shrink-0 text-ink-grey" />
              <label className="flex items-center gap-2 text-xs text-ink-muted">
                From
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-9 rounded-lg border border-border bg-card px-2.5 text-xs text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
                />
              </label>
              <label className="flex items-center gap-2 text-xs text-ink-muted">
                To
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-9 rounded-lg border border-border bg-card px-2.5 text-xs text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
                />
              </label>
            </div>
          )}
        </div>
      )}

      {/* Sub-report panels */}
      {tab === 'Income'           && <IncomeReport      params={dateParams} />}
      {tab === 'Riders'           && <RidersReport      params={dateParams} />}
      {tab === 'Sublets'          && <SubletsReport     params={dateParams} />}
      {tab === 'Partners'         && <PartnersReport    params={dateParams} />}
      {tab === 'Debts'            && <DebtsReport       params={dateParams} />}
      {tab === 'Failed Jobs'      && <FailedJobsReport  params={dateParams} />}
      {tab === 'Client Statement' && <ClientStatementReport />}
    </div>
  );
}

/* ── Shared summary banner ──────────────────────────────────────────────────── */
function SummaryBanner({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border not-focus:border-border bg-card px-5 py-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{label}</p>
      <p className="mt-1 text-3xl font-semibold text-ink tabular">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-ink-muted">{sub}</p>}
    </div>
  );
}

function ReportSkeleton() {
  return (
    <div className="space-y-4">
      <SkeletonCard />
      {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
    </div>
  );
}

/* ── Income ─────────────────────────────────────────────────────────────────── */
function IncomeReport({ params }: { params: Record<string, unknown> }) {
  const { data, isLoading } = useQuery({
    queryKey: ['report-income', params],
    queryFn: () => reportsApi.income(params),
  });
  if (isLoading) return <ReportSkeleton />;
  return (
    <div className="space-y-4">
      <SummaryBanner
        label="Total Office Income"
        value={fmt(data?.officeFees ?? 0)}
        sub={`${data?.jobCount ?? 0} jobs`}
      />
      <p className="text-sm text-ink-muted">
        {(!params.start_date && !params.end_date) ? 'Select a date range above to filter.' : ''}
      </p>
    </div>
  );
}

/* ── Riders ─────────────────────────────────────────────────────────────────── */
function RidersReport({ params }: { params: Record<string, unknown> }) {
  const { data, isLoading } = useQuery({
    queryKey: ['report-riders', params],
    queryFn: () => reportsApi.riders(params),
  });
  if (isLoading) return <ReportSkeleton />;
  const rows = data?.data ?? [];
  return (
    rows.length === 0 ? (
      <div className="rounded-xl border border-border bg-card px-5 py-10 text-center text-sm text-ink-muted">
        No rider data for this period.
      </div>
    ) : (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((rider: RiderReportRow) => {
          const initials = rider.name
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map((part) => part[0]?.toUpperCase() ?? '')
            .join('');
          const netProfit = rider.officeFees - rider.riderExpenses;

          return (
            <article key={rider.riderId} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-blue-100 bg-blue-50 text-xs font-semibold text-blue-700">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <h2 className="truncate text-sm font-semibold text-ink">{rider.name}</h2>
                    <p className="mt-0.5 text-xs text-ink-muted">
                      Rider #{String(rider.riderId).padStart(2, '0')}
                    </p>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-ink-muted">Net profit</p>
                  <p className={`mt-0.5 tabular text-sm font-semibold ${netProfit < 0 ? 'text-loss' : 'text-success-text'}`}>
                    {netProfit < 0 ? '-' : '+'}{fmt(Math.abs(netProfit))}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 border-b border-border py-3 text-center">
                <RiderStat label="Jobs" value={rider.jobCount} />
                <RiderStat label="Delivered" value={rider.deliveredJobs} tone="success" />
                <RiderStat label="Failed" value={rider.failedJobs} tone="loss" />
              </div>

              <dl className="space-y-2 pt-3 text-xs">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-ink-muted">Office Fees</dt>
                  <dd className="tabular font-semibold text-ink">{fmt(rider.officeFees)}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-ink-muted">Rider Expenses</dt>
                  <dd className="tabular font-medium text-loss">-{fmt(rider.riderExpenses)}</dd>
                </div>
              </dl>
            </article>
          );
        })}
      </div>
    )
  );
}

function RiderStat({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: number;
  tone?: 'neutral' | 'success' | 'loss';
}) {
  const styles = {
    neutral: 'border-border bg-page text-ink',
    success: 'border-success-text/10 bg-success-bg text-success-text',
    loss: 'border-loss/10 bg-loss-bg text-loss',
  };

  return (
    <div className={`rounded-xl border px-2 py-2 ${styles[tone]}`}>
      <p className="text-[10px] font-medium">{label}</p>
      <p className="mt-0.5 tabular text-sm font-semibold">{value}</p>
    </div>
  );
}

/* ── Sublets ─────────────────────────────────────────────────────────────────── */
function SubletsReport({ params }: { params: Record<string, unknown> }) {
  const { data, isLoading } = useQuery({
    queryKey: ['report-sublets', params],
    queryFn: () => reportsApi.sublets(params),
  });
  if (isLoading) return <ReportSkeleton />;
  const rows = data?.data ?? [];
  return (
    <div className="space-y-4">
      {data?.totals && (
        <SummaryBanner
          label="Total Sublet Cost"
          value={fmt(data.totals.amount)}
          sub={`${data.totals.jobCount} jobs`}
        />
      )}
      <Table
        emptyMessage="No sublet data."
        keyExtractor={(r: any) => r.name}
        data={rows}
        columns={[
          { key: 'name',   header: 'Sublet Name',   cell: (r: any) => <span className="font-semibold">{r.name}</span> },
          { key: 'jobs',   header: 'Jobs',           cell: (r: any) => r.jobCount },
          { key: 'amount', header: 'Total Amount',   cell: (r: any) => <span className="tabular font-semibold text-loss">-{fmt(r.amount)}</span> },
        ]}
      />
    </div>
  );
}

/* ── Partners ────────────────────────────────────────────────────────────────── */
function PartnersReport({ params }: { params: Record<string, unknown> }) {
  const { data, isLoading } = useQuery({
    queryKey: ['report-partners', params],
    queryFn: () => reportsApi.partners(params),
  });
  if (isLoading) return <ReportSkeleton />;
  const rows = data?.data ?? [];
  return (
    <div className="space-y-4">
      {data?.totals && (
        <SummaryBanner
          label="Total Partner Fees"
          value={fmt(data.totals.amount)}
          sub={`${data.totals.jobCount} jobs`}
        />
      )}
      <Table
        emptyMessage="No partner data."
        keyExtractor={(r: any) => r.name}
        data={rows}
        columns={[
          { key: 'name',   header: 'Partner',      cell: (r: any) => <span className="font-semibold">{r.name}</span> },
          { key: 'jobs',   header: 'Jobs',          cell: (r: any) => r.jobCount },
          { key: 'amount', header: 'Total Amount',  cell: (r: any) => <span className="tabular font-semibold">{fmt(r.amount)}</span> },
        ]}
      />
    </div>
  );
}

/* ── Debts ───────────────────────────────────────────────────────────────────── */
function DebtsReport({ params }: { params: Record<string, unknown> }) {
  const [page, setPage] = useState(1);
  const p = { ...params, page, limit: 20 };
  const { data, isLoading } = useQuery({
    queryKey: ['report-debts', p],
    queryFn: () => reportsApi.debts(p),
  });
  const rows   = data?.data ?? [];
  const totals = data?.totals;
  const meta   = data?.meta;

  return (
    <div className="space-y-4">
      {totals && (
        <SummaryBanner
          label="Total Outstanding Balance"
          value={fmt(totals.balance)}
          sub={`${totals.jobCount} jobs · Billed ${fmt(totals.totalBilled)} · Received ${fmt(totals.received)}`}
        />
      )}
      <Table
        loading={isLoading}
        emptyMessage="No outstanding debts."
        keyExtractor={(r: any) => r.id}
        data={rows}
        columns={[
          { key: 'date',     header: 'Date',     cell: (r: any) => <span className="text-ink-muted text-xs">{fmtDate(r.date)}</span> },
          { key: 'client',   header: 'Client',   cell: (r: any) => <span className="font-semibold">{r.client?.name}</span> },
          { key: 'rider',    header: 'Rider',    cell: (r: any) => <span className="text-ink-muted">{r.rider?.name ?? '—'}</span> },
          { key: 'total',    header: 'Total',    cell: (r: any) => <span className="tabular">{fmt(r.total)}</span> },
          { key: 'received', header: 'Paid',     cell: (r: any) => <span className="tabular text-success-text">{fmt(r.received)}</span> },
          { key: 'balance',  header: 'Debt',     cell: (r: any) => <span className="tabular font-semibold text-debt">-{fmt(r.balance)}</span> },
        ]}
      />
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
    </div>
  );
}

/* ── Failed Jobs ─────────────────────────────────────────────────────────────── */
function FailedJobsReport({ params }: { params: Record<string, unknown> }) {
  const [page, setPage] = useState(1);
  const p = { ...params, page, limit: 20 };
  const { data, isLoading } = useQuery({
    queryKey: ['report-failed', p],
    queryFn: () => reportsApi.failedJobs(p),
  });
  const rows   = data?.data ?? [];
  const totals = data?.totals;
  const meta   = data?.meta;

  return (
    <div className="space-y-4">
      {totals && (
        <SummaryBanner
          label="Net Outcome (Failed / Cancelled)"
          value={fmt(totals.netOutcome)}
          sub={`Office fees ${fmt(totals.officeFees)} · Expenses -${fmt(totals.expenses)}`}
        />
      )}
      <Table
        loading={isLoading}
        emptyMessage="No failed or cancelled jobs."
        keyExtractor={(r: any) => r.id}
        data={rows}
        columns={[
          { key: 'date',   header: 'Date',    cell: (r: any) => <span className="text-xs text-ink-muted">{fmtDate(r.date)}</span> },
          { key: 'client', header: 'Client',  cell: (r: any) => <span className="font-semibold">{r.client?.name}</span> },
          { key: 'route',  header: 'Route',   cell: (r: any) => <span className="text-xs text-ink-muted">{r.pickup} → {r.dropoff}</span> },
          { key: 'status', header: 'Status',  cell: (r: any) => (
            <Badge bg={r.status === 'failed' ? 'chip-loss' : 'chip-neutral'} label={r.status} />
          )},
          { key: 'fee',      header: 'Fee',      cell: (r: any) => <span className="tabular">{fmt(r.officeFee)}</span> },
          { key: 'expenses', header: 'Expenses', cell: (r: any) => <span className="tabular text-loss">-{fmt(r.expenses)}</span> },
          { key: 'net',      header: 'Net',      cell: (r: any) => <span className="tabular font-semibold">{fmt(r.netOutcome)}</span> },
        ]}
      />
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
    </div>
  );
}

/* ── Client Statement ────────────────────────────────────────────────────────── */
function ClientStatementReport() {
  const [clientId,   setClientId]   = useState('');
  const [startDate,  setStartDate]  = useState('');
  const [endDate,    setEndDate]    = useState('');

  const { data: clients } = useQuery({
    queryKey: ['clients', 'all'],
    queryFn: () => clientsApi.list({ limit: 100 }),
  });

  const params: Record<string, unknown> = { client_id: clientId };
  if (startDate) params.start_date = startDate;
  if (endDate)   params.end_date   = endDate;

  const { data, isLoading } = useQuery({
    queryKey: ['report-statement', params],
    queryFn: () => reportsApi.clientStatement(params),
    enabled: !!clientId,
  });

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-ink-muted">Client</label>
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="rounded-[10px] border not-focus:border-border bg-card px-3 py-2.5 text-sm text-ink outline-none focus:border-brand min-w-48 transition-colors"
          >
            <option value="">Select client…</option>
            {clients?.data.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-ink-muted">From</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="rounded-[10px] border not-focus:border-border bg-card px-3 py-2.5 text-sm text-ink outline-none focus:border-brand transition-colors"
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-ink-muted">To</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="rounded-[10px] border not-focus:border-border bg-card px-3 py-2.5 text-sm text-ink outline-none focus:border-brand transition-colors"
          />
        </div>
      </div>

      {!clientId && (
        <p className="rounded-xl border not-focus:border-border bg-card px-5 py-10 text-center text-sm text-ink-muted">
          Select a client to view their statement.
        </p>
      )}

      {isLoading && <ReportSkeleton />}

      {data && (
        <div className="space-y-4">
          {/* Summary strip */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {[
              { label: 'Opening Balance', v: data.summary.openingBalance, dimmed: true },
              { label: 'Job Charges',     v: data.summary.jobCharges                  },
              { label: 'Payments',        v: data.summary.payments,       green: true  },
              { label: 'Refunds',         v: data.summary.refunds,        red: true    },
              { label: 'Closing Balance', v: data.summary.closingBalance, big: true    },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border not-focus:border-border bg-card p-4">
                <p className="text-xs text-ink-muted">{s.label}</p>
                <p className={`mt-1 tabular font-semibold leading-tight ${
                  s.big    ? 'text-xl text-ink'          :
                  s.green  ? 'text-base text-success-text' :
                  s.red    ? 'text-base text-loss'        :
                  s.dimmed ? 'text-base text-ink-muted'   :
                  'text-base text-ink'
                }`}>
                  {fmt(s.v)}
                </p>
              </div>
            ))}
          </div>

          <Table
            emptyMessage="No transactions."
            keyExtractor={(r: any) => `${r.type}-${r.recordId}-${r.date}`}
            data={data.data ?? []}
            columns={[
              { key: 'date',   header: 'Date',            cell: (r: any) => <span className="text-xs text-ink-muted">{fmtDate(r.date)}</span> },
              { key: 'type',   header: 'Type',            cell: (r: any) => <Badge bg="chip-neutral" label={r.type} /> },
              { key: 'desc',   header: 'Description',     cell: (r: any) => r.description },
              { key: 'amount', header: 'Amount',           cell: (r: any) => <span className="tabular font-semibold">{fmt(r.amount)}</span> },
              { key: 'change', header: 'Balance Change',   cell: (r: any) => (
                <span className={`tabular font-medium ${r.balanceChange >= 0 ? 'text-loss' : 'text-success-text'}`}>
                  {fmt(r.balanceChange)}
                </span>
              )},
            ]}
          />
        </div>
      )}
    </div>
  );
}
