'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, subDays } from 'date-fns';
import { Plus, Pencil, Trash2, Receipt as ReceiptIcon, CalendarDays } from 'lucide-react';
import { expensesApi, type Expense, type ExpenseOwner } from '@/lib/api';
import { fmt, fmtDate } from '@/lib/utils';
import { Pagination } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmModal } from '@/components/ui/Modal';
import { Dropdown } from '@/components/ui/Dropdown';
import { useUIStore } from '@/store/ui';
import { ExpenseDrawer } from '@/components/expenses/ExpenseDrawer';
import { useToday } from '@/lib/useToday';

const OWNER_FILTERS: { label: string; value: string }[] = [
  { label: 'All',    value: ''       },
  { label: 'Rider',  value: 'rider'  },
  { label: 'Office', value: 'office' },
  { label: 'Client', value: 'client' },
];

type DatePreset = 'today' | '7days' | '30days' | 'custom' | '';

const DATE_PRESETS: { label: string; value: DatePreset }[] = [
  { label: 'All time',  value: ''       },
  { label: 'Today',     value: 'today'  },
  { label: 'Last 7 days',  value: '7days'  },
  { label: 'Last 30 days', value: '30days' },
  { label: 'Custom',    value: 'custom' },
];

const ownerChip: Record<ExpenseOwner, string> = {
  rider:  'chip-info',
  office: 'chip-pink',
  client: 'chip-debt',
};

export default function ExpensesPage() {
  const { openExpenseDrawer } = useUIStore();
  const qc = useQueryClient();

  const [page,       setPage]       = useState(1);
  const [owner,      setOwner]      = useState('');
  const [datePreset, setDatePreset] = useState<DatePreset>('');
  const [dateFrom,   setDateFrom]   = useState('');
  const [dateTo,     setDateTo]     = useState('');
  const [deleteId,   setDeleteId]   = useState<number | null>(null);
  const today = useToday();

  const todayDate = today ? new Date(`${today}T12:00:00`) : null;
  const resolvedFrom =
    datePreset === 'today'  ? today :
    datePreset === '7days'  && todayDate ? format(subDays(todayDate, 6), 'yyyy-MM-dd') :
    datePreset === '30days' && todayDate ? format(subDays(todayDate, 29), 'yyyy-MM-dd') :
    datePreset === 'custom' ? dateFrom :
    '';
  const resolvedTo =
    datePreset === 'today' || datePreset === '7days' || datePreset === '30days' ? today :
    datePreset === 'custom' ? dateTo :
    '';

  const params: Record<string, unknown> = { page, limit: 20 };
  if (owner)        params.owner     = owner as ExpenseOwner;
  if (resolvedFrom) params.date_from = resolvedFrom;
  if (resolvedTo)   params.date_to   = resolvedTo;

  const { data, isLoading } = useQuery({
    queryKey: ['expenses', params],
    queryFn: () => expensesApi.list(params),
    enabled: datePreset === '' || datePreset === 'custom' || Boolean(today),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => expensesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['reports'] });
      setDeleteId(null);
    },
  });

  const expenses = data?.data ?? [];
  const meta     = data?.meta;

  return (
    <div className="mx-auto max-w-[1600px] space-y-4 px-4 py-4 sm:px-6 sm:py-5 lg:px-8">

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="mb-1 text-sm font-semibold uppercase tracking-[.14em] text-brand">BluSync / Operations</p>
          <h1 className="text-[22px] font-semibold tracking-tight text-ink">Expenses</h1>
        </div>
        <Button
          size="sm"
          icon={<Plus size={16} strokeWidth={1.75} />}
          onClick={() => openExpenseDrawer()}
        >
          Log Expense
        </Button>
      </div>

      {/* Filters */}
      <div className="space-y-2.5 rounded-xl border border-border bg-card p-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-xs font-medium text-ink-muted">Date</span>
            <Dropdown
              aria-label="Date range"
              value={datePreset}
              options={DATE_PRESETS}
              onChange={(v) => { setDatePreset(v as DatePreset); setPage(1); }}
              className="w-36"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-xs font-medium text-ink-muted">Owner</span>
            <Dropdown
              aria-label="Filter by owner"
              value={owner}
              options={OWNER_FILTERS}
              onChange={(v) => { setOwner(v); setPage(1); }}
              className="w-28"
            />
          </div>
          <span className="text-xs text-ink-muted">
            {meta?.total ?? expenses.length} expense{(meta?.total ?? expenses.length) !== 1 ? 's' : ''}
          </span>
        </div>

        {datePreset === 'custom' && (
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

      {/* Expense list */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : expenses.length === 0 ? (
        <EmptyState
          icon={ReceiptIcon}
          title="No expenses yet"
          description="Log your first expense to start tracking costs."
          action={
            <Button size="sm" icon={<Plus size={16} strokeWidth={1.75} />} onClick={() => openExpenseDrawer()}>
              Log Expense
            </Button>
          }
        />
      ) : (
        <div className="rounded-xl border not-focus:border-border bg-card divide-y divide-border">
          {expenses.map((expense) => (
            <ExpenseRow
              key={expense.id}
              expense={expense}
              onEdit={() => {
                qc.setQueryData(['expense', expense.id], expense);
                openExpenseDrawer(expense.id, expense);
              }}
              onDelete={() => setDeleteId(expense.id)}
              ownerChip={ownerChip}
            />
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

      <ExpenseDrawer />

      <ConfirmModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteMutation.mutate(deleteId!)}
        loading={deleteMutation.isPending}
        title="Delete expense"
        message="This will permanently remove the expense and can't be undone."
        confirmLabel="Delete expense"
        danger
      />
    </div>
  );
}

/* ── Expense row ──────────────────────────────────────────────────────────── */
function ExpenseRow({
  expense,
  onEdit,
  onDelete,
  ownerChip,
}: {
  expense: Expense;
  onEdit: () => void;
  onDelete: () => void;
  ownerChip: Record<ExpenseOwner, string>;
}) {
  const ownerLabel =
    expense.owner === 'rider'  && expense.rider  ? expense.rider.name  :
    expense.owner === 'client' && expense.client ? expense.client.name :
    expense.owner;

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-ink">{expense.description}</span>
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${ownerChip[expense.owner]}`}>
            {ownerLabel}
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-ink-muted">
          {expense.expense_date && <span>{fmtDate(expense.expense_date)}</span>}
          <span className="capitalize">{expense.mode}{expense.bank_name ? ` · ${expense.bank_name}` : ''}</span>
          {expense.note && <span>· {expense.note}</span>}
        </div>
      </div>
      <span className="tabular text-sm font-semibold text-loss shrink-0">
        -{fmt(expense.amount)}
      </span>
      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onEdit}
          className="rounded-lg p-1.5 text-ink-grey hover:bg-page hover:text-ink transition-colors"
          aria-label="Edit"
        >
          <Pencil size={14} strokeWidth={1.75} />
        </button>
        <button
          onClick={onDelete}
          className="rounded-lg p-1.5 text-ink-grey hover:bg-loss-bg hover:text-loss transition-colors"
          aria-label="Delete"
        >
          <Trash2 size={14} strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
}
