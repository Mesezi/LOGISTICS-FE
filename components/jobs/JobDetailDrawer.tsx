'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Banknote, Landmark, ReceiptText, RotateCcw, Ban,
  MoreHorizontal, Trash2, Pencil, Check, MapPin,
  ArrowRightLeft, Handshake, ParkingCircle, CircleAlert,
} from 'lucide-react';
import { jobsApi, paymentsApi, ridersApi, searchApi, type Payment, type JobDetail, type JobStatus } from '@/lib/api';
import { useUIStore } from '@/store/ui';
import { Drawer } from '@/components/ui/Drawer';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Autocomplete } from '@/components/ui/Autocomplete';
import { ConfirmModal, Modal } from '@/components/ui/Modal';
import { MoneyBar } from '@/components/ui/MoneyBar';
import { Skeleton } from '@/components/ui/Skeleton';
import { fmt, fmtDate, fmtDateTime, statusColors } from '@/lib/utils';
import { cls } from '@/lib/utils';

/* ── Types ──────────────────────────────────────────────────────────────────── */
type Tab = 'details' | 'record' | 'transactions';

/* ── Main component ─────────────────────────────────────────────────────────── */
export function JobDetailDrawer() {
  const { viewingJobId, closeJobDetail, openJobDrawer } = useUIStore();
  const qc = useQueryClient();

  /* tab state — reset per job */
  const [tabState, setTabState] = useState<{ jobId: number | null; tab: Tab }>({ jobId: null, tab: 'details' });
  const tab: Tab = tabState.jobId === viewingJobId ? tabState.tab : 'details';
  const setTab = (t: Tab) => setTabState({ jobId: viewingJobId, tab: t });

  /* payment form state */
  const [payType,       setPayType]       = useState<'payment' | 'refund'>('payment');
  const [amountState,   setAmountState]   = useState<{ jobId: number | null; value: string | null }>({ jobId: null, value: null });
  const rawAmount = amountState.jobId === viewingJobId ? amountState.value : null;
  const setRawAmount = (v: string | null) => setAmountState({ jobId: viewingJobId, value: v });

  const [mode,          setMode]          = useState<'cash' | 'transfer'>('cash');
  const [bankName,      setBankName]      = useState('');
  const [note,          setNote]          = useState('');
  const [payLoading,    setPayLoading]    = useState(false);
  const [payError,      setPayError]      = useState('');
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [menuOpen,      setMenuOpen]      = useState(false);
  const [refundOpen,    setRefundOpen]    = useState(false);
  const [pickupRiderOpen, setPickupRiderOpen] = useState(false);
  const [pickupRiderId, setPickupRiderId] = useState('');

  const { data: job, isLoading } = useQuery({
    queryKey: ['job', viewingJobId],
    queryFn: () => jobsApi.get(viewingJobId!),
    enabled: !!viewingJobId,
  });

  const {
    data: ridersData,
    isLoading: ridersLoading,
    isError: ridersError,
  } = useQuery({
    queryKey: ['riders', 'active'],
    queryFn: () => ridersApi.list({ active: true, limit: 100 }),
    enabled: pickupRiderOpen,
  });

  const cancelMutation = useMutation({
    mutationFn: () => jobsApi.cancel(viewingJobId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['jobs'] });
      qc.invalidateQueries({ queryKey: ['job', viewingJobId] });
      qc.invalidateQueries({ queryKey: ['reports'] });
      setCancelConfirm(false);
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: (body: { status: JobStatus; rider_id?: number }) =>
      jobsApi.update(viewingJobId!, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['jobs'] });
      qc.invalidateQueries({ queryKey: ['job', viewingJobId] });
      qc.invalidateQueries({ queryKey: ['reports'] });
      setPickupRiderOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => jobsApi.delete(viewingJobId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['jobs'] });
      qc.invalidateQueries({ queryKey: ['reports'] });
      closeJobDetail();
    },
  });

  const deletePaymentMutation = useMutation({
    mutationFn: (id: number) => paymentsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['job', viewingJobId] });
      qc.invalidateQueries({ queryKey: ['reports'] });
    },
  });

  async function submitPayment(type: 'payment' | 'refund', overrideAmount?: string) {
    if (!job) return;
    const finalAmount = overrideAmount ?? rawAmount ??
      String(type === 'payment' ? job.debt : job.received);
    if (!finalAmount || Number(finalAmount) <= 0) return;
    setPayLoading(true);
    setPayError('');
    try {
      const body: Record<string, unknown> = { amount: Number(finalAmount), mode };
      if (mode === 'transfer') body.bank_name = bankName;
      if (note) body.note = note;
      if (type === 'payment') await jobsApi.addPayment(job.id, body);
      else                    await jobsApi.addRefund(job.id, body);
      qc.invalidateQueries({ queryKey: ['job', viewingJobId] });
      qc.invalidateQueries({ queryKey: ['reports'] });
      qc.invalidateQueries({ queryKey: ['jobs'] });
      setRawAmount(null);
      setNote('');
      setBankName('');
      setMode('cash');
      setTab('transactions');
      if (type === 'refund') { setPayType('payment'); setRefundOpen(false); }
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      setPayError(msg ?? 'Something went wrong. Please try again.');
    } finally {
      setPayLoading(false);
    }
  }

  if (!viewingJobId) return null;

  const statusC = job ? statusColors[job.status] : null;

  return (
    <>
      <Drawer
        open={!!viewingJobId}
        onClose={closeJobDetail}
        title={job ? (job.client?.name ?? 'Unknown client') : 'Job details'}
        subtitle={job ? `#${job.id} · ${fmtDate(job.job_date)}` : undefined}
        width="md:w-[90%] md:max-w-md"
        tabs={
          job && !isLoading ? (
            <TabBar tab={tab} setTab={setTab} paymentCount={job.payments.length} />
          ) : undefined
        }
        footer={
          job && !isLoading && (job.status === 'pending' || job.status === 'picked_up') ? (
            <StickyFooter
              job={job}
              onStatusAdvance={() => {
                if (job.status === 'pending') {
                  if (job.sublet_name) {
                    updateStatusMutation.mutate({ status: 'picked_up' });
                    return;
                  }
                  updateStatusMutation.reset();
                  setPickupRiderId(job.rider_id ? String(job.rider_id) : '');
                  setPickupRiderOpen(true);
                  return;
                }
                updateStatusMutation.mutate({ status: 'delivered' });
              }}
              statusLoading={updateStatusMutation.isPending}
            />
          ) : undefined
        }
        headerActions={
          job ? (
            <>
              {statusC && (
                <Badge bg={statusC.bg} label={statusC.label} className="shrink-0" />
              )}
              {/* ·· More menu ·· */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMenuOpen((v) => !v)}
                  aria-label="More actions"
                  aria-expanded={menuOpen}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-page hover:text-ink"
                >
                  <MoreHorizontal size={18} strokeWidth={1.75} />
                </button>
                {menuOpen && (
                  <>
                    {/* dismiss overlay */}
                    <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                    <div className="absolute right-0 top-10 z-50 w-52 rounded-xl border border-border bg-card p-1.5 shadow-[0_12px_32px_rgba(0,0,0,.12)]">
                      {job.status !== 'cancelled' && (
                        <MenuItem
                          icon={<Pencil size={15} strokeWidth={1.75} />}
                          label="Edit job"
                          onClick={() => { setMenuOpen(false); closeJobDetail(); openJobDrawer(job.id); }}
                        />
                      )}
                      {job.received > 0 && (
                        <MenuItem
                          icon={<RotateCcw size={15} strokeWidth={1.75} />}
                          label="Record refund"
                          onClick={() => {
                            setPayType('refund');
                            setRawAmount(String(job.received));
                            setMenuOpen(false);
                            setRefundOpen(true);
                          }}
                        />
                      )}
                      {job.status !== 'cancelled' && (
                        <MenuItem
                          icon={<Ban size={15} strokeWidth={1.75} />}
                          label="Cancel job"
                          onClick={() => { setMenuOpen(false); setCancelConfirm(true); }}
                        />
                      )}
                      {job.payments.length === 0 && (
                        <MenuItem
                          icon={<Trash2 size={15} strokeWidth={1.75} />}
                          label="Delete job"
                          danger
                          onClick={() => { setMenuOpen(false); setDeleteConfirm(true); }}
                        />
                      )}
                    </div>
                  </>
                )}
              </div>
            </>
          ) : undefined
        }
      >
        {isLoading || !job ? (
          <LoadingState />
        ) : (
          <div className="pb-2">
            {/* ── Tab panels ──────────────────────────────────────── */}
            {tab === 'details'      && <DetailsPanel job={job} />}
            {tab === 'record'       && (
              <RecordPanel
                job={job}
                rawAmount={rawAmount}
                setRawAmount={setRawAmount}
                mode={mode}
                setMode={setMode}
                bankName={bankName}
                setBankName={setBankName}
                note={note}
                setNote={setNote}
                payLoading={payLoading}
                payError={payError}
                onSubmit={(amt) => submitPayment('payment', amt)}
                onRefundClick={() => { setPayType('refund'); setRawAmount(String(job.received)); setRefundOpen(true); }}
              />
            )}
            {tab === 'transactions' && (
              <TransactionsPanel
                payments={job.payments}
                onDelete={(id) => deletePaymentMutation.mutate(id)}
              />
            )}
          </div>
        )}
      </Drawer>

      {/* ── Refund modal ──────────────────────────────────────────── */}
      {job && (
        <RefundModal
          open={refundOpen}
          onClose={() => { setRefundOpen(false); setPayError(''); }}
          job={job}
          rawAmount={rawAmount}
          setRawAmount={setRawAmount}
          mode={mode}
          setMode={setMode}
          bankName={bankName}
          setBankName={setBankName}
          note={note}
          setNote={setNote}
          payLoading={payLoading}
          payError={payError}
          onSubmit={() => submitPayment('refund')}
        />
      )}

      <ConfirmModal
        open={cancelConfirm}
        onClose={() => setCancelConfirm(false)}
        onConfirm={() => cancelMutation.mutate()}
        loading={cancelMutation.isPending}
        title="Cancel this job?"
        message="If any payments were received, a cash refund will be created automatically. This can't be undone."
        confirmLabel="Yes, cancel job"
        danger
      />
      <ConfirmModal
        open={deleteConfirm}
        onClose={() => setDeleteConfirm(false)}
        onConfirm={() => deleteMutation.mutate()}
        loading={deleteMutation.isPending}
        title="Delete this job?"
        message="This permanently removes the job and all its data. There's no way to recover it."
        confirmLabel="Delete job"
        danger
      />
      <Modal
        open={pickupRiderOpen}
        onClose={() => {
          if (!updateStatusMutation.isPending) setPickupRiderOpen(false);
        }}
        title="Assign rider"
        size="sm"
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!pickupRiderId) return;
            updateStatusMutation.mutate({
              status: 'picked_up',
              rider_id: Number(pickupRiderId),
            });
          }}
          className="space-y-4"
        >
          <p className="text-sm leading-relaxed text-ink-muted">
            Choose the rider assigned to this pickup. The job will be marked as picked up after you confirm.
          </p>
          {ridersError ? (
            <p role="alert" className="text-sm text-loss">
              Could not load active riders. Please close this dialog and try again.
            </p>
          ) : ridersLoading ? (
            <Skeleton className="h-11 w-full rounded-[10px]" />
          ) : (ridersData?.data ?? []).length === 0 ? (
            <p role="alert" className="rounded-lg bg-debt-bg px-3 py-2 text-sm text-debt">
              There are no active riders to assign. Add or activate a rider, then try again.
            </p>
          ) : (
            <Select
              label="Rider"
              value={pickupRiderId}
              onChange={(event) => setPickupRiderId(event.target.value)}
              placeholder="Choose a rider"
              options={(ridersData?.data ?? []).map((rider) => ({
                value: rider.id,
                label: rider.name,
              }))}
            />
          )}
          {updateStatusMutation.isError && (
            <p role="alert" className="text-sm text-loss">
              Could not assign the rider or update the job status. Please try again.
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              size="sm"
              type="button"
              disabled={updateStatusMutation.isPending}
              onClick={() => setPickupRiderOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              type="submit"
              loading={updateStatusMutation.isPending}
              disabled={ridersLoading || ridersError || !pickupRiderId || !(ridersData?.data.length)}
            >
              Assign &amp; mark picked up
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SUB-COMPONENTS
═══════════════════════════════════════════════════════════════════════════ */

/* ── Loading skeleton ───────────────────────────────────────────────────── */
function LoadingState() {
  return (
    <div className="space-y-3 pt-2">
      <Skeleton className="h-20 w-full rounded-xl" />
      <Skeleton className="h-32 w-full rounded-xl" />
      <Skeleton className="h-24 w-full rounded-xl" />
    </div>
  );
}

/* ── Tab bar ────────────────────────────────────────────────────────────── */
function TabBar({
  tab, setTab, paymentCount,
}: {
  tab: Tab;
  setTab: (t: Tab) => void;
  paymentCount: number;
}) {
  const tabs: { key: Tab; label: string; badge?: number }[] = [
    { key: 'details',      label: 'Details' },
    { key: 'record',       label: 'Payment' },
    { key: 'transactions', label: 'History', badge: paymentCount },
  ];

  return (
    <div className="flex gap-1 px-4 pt-2 pb-0 text-sm">
      {tabs.map(({ key, label, badge }) => (
        <button
          key={key}
          type="button"
          role="tab"
          aria-selected={tab === key}
          onClick={() => setTab(key)}
          className={cls(
            'relative flex h-9 items-center gap-1.5 rounded-t-lg px-3.5 text-sm font-semibold transition-colors',
            tab === key
              ? 'bg-card-alt text-brand after:absolute after:bottom-0 after:inset-x-0 after:h-0.5 after:bg-brand'
              : 'text-ink-muted hover:text-ink',
          )}
        >
          {label}
          {badge !== undefined && badge > 0 && (
            <span className={cls(
              'rounded-full px-1.5 py-0.5 text-sm font-bold leading-none tabular',
              tab === key ? 'bg-brand/15 text-brand' : 'bg-border text-ink-muted',
            )}>
              {badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

/* ── Details panel ──────────────────────────────────────────────────────── */
function DetailsPanel({ job }: { job: JobDetail }) {
  const STEPS = [
    { key: 'pending',   label: 'Pending'   },
    { key: 'picked_up', label: 'Picked up' },
    { key: 'delivered', label: 'Delivered' },
  ] as const;

  const stepIndex =
    job.status === 'delivered' ? 2 :
    job.status === 'picked_up' ? 1 : 0;

  const totalExpenses = job.expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="space-y-3">
      {/* Route card */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-stretch divide-x divide-border">
          {/* Pickup */}
          <div className="flex flex-1 items-start gap-2.5 p-3.5">
            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand/10">
              <MapPin size={13} strokeWidth={2} className="text-brand" />
            </div>
            <div>
              <p className="text-sm font-medium uppercase tracking-wider text-ink-muted">Pickup</p>
              <p className="mt-0.5 text-sm font-semibold text-ink leading-snug">{job.pickup}</p>
            </div>
          </div>
          {/* Dropoff */}
          <div className="flex flex-1 items-start gap-2.5 p-3.5">
            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-success-bg">
              <MapPin size={13} strokeWidth={2} className="text-success-text" />
            </div>
            <div>
              <p className="text-sm font-medium uppercase tracking-wider text-ink-muted">Drop-off</p>
              <p className="mt-0.5 text-sm font-semibold text-ink leading-snug">{job.dropoff}</p>
            </div>
          </div>
        </div>
        {(job.client?.phone || job.description) && (
          <div className="border-t border-border px-3.5 py-2.5 text-xs text-ink-muted space-y-1">
            {job.client?.phone && <p>📞 {job.client.phone}</p>}
            {job.description   && <p className="italic">&ldquo;{job.description}&rdquo;</p>}
          </div>
        )}
      </div>


      {/* Extras row: rider / sublet / partner / park */}
      {(job.rider || job.sublet_name || job.partner || job.partner_name_snapshot || job.partner_name || job.park_waybill > 0) && (
        <div className="grid grid-cols-2 gap-2">
          {job.rider && (
            <ExtraChip icon={<span className="text-base">🏍</span>} label="Rider" value={job.rider.name} />
          )}
          {job.sublet_name && (
            <ExtraChip
              icon={<ArrowRightLeft size={13} strokeWidth={1.75} className="text-ink-grey" />}
              label="Sublet"
              value={`${job.sublet_name} · ${fmt(job.sublet_amount)}`}
            />
          )}
          {(job.partner?.name || job.partner_name_snapshot || job.partner_name) && (
            <ExtraChip
              icon={<Handshake size={13} strokeWidth={1.75} className="text-ink-grey" />}
              label="Partner"
              value={`${job.partner?.name ?? job.partner_name_snapshot ?? job.partner_name} · ${fmt(job.partner_amount)}`}
            />
          )}
          {job.park_waybill > 0 && (
            <ExtraChip
              icon={<ParkingCircle size={13} strokeWidth={1.75} className="text-ink-grey" />}
              label="Park / waybill"
              value={fmt(job.park_waybill)}
            />
          )}
        </div>
      )}

      {/* Status stepper */}
      {job.status !== 'cancelled' && job.status !== 'failed' && (
        <div className="rounded-xl border border-border bg-card px-4 py-3.5">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-ink-muted">Status</p>
          <div className="flex items-center">
            {STEPS.map((step, i) => {
              const done   = i < stepIndex;
              const active = i === stepIndex;
              return (
                <div key={step.key} className="flex flex-1 items-center">
                  <div className="flex flex-col items-center gap-1.5">
                    <div className={cls(
                      'flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors',
                      active ? 'border-brand bg-brand text-white' :
                      done   ? 'border-success-text bg-success-bg text-success-text' :
                      'border-border bg-page text-ink-grey',
                    )}>
                      {done ? <Check size={12} strokeWidth={2.5} /> : i + 1}
                    </div>
                    <span className={cls(
                      'whitespace-nowrap text-sm font-semibold',
                      active ? 'text-brand' : done ? 'text-success-text' : 'text-ink-grey',
                    )}>
                      {step.label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={cls(
                      'mb-5 h-0.5 flex-1 mx-2',
                      done ? 'bg-success-text' : 'bg-border',
                    )} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Financials card */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {/* Hero: balance */}
        <div className={cls(
          'flex items-center justify-between px-4 py-3.5',
          job.debt > 0 ? 'bg-debt-bg/40' : 'bg-success-bg/30',
        )}>
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-ink-muted">
              {job.debt > 0 ? 'Outstanding balance' : 'Balance'}
            </p>
            <p className={cls(
              'tabular text-2xl font-bold leading-tight',
              job.debt > 0 ? 'text-debt' : 'text-success-text',
            )}>
              {fmt(job.debt)}
            </p>
          </div>
          {job.debt > 0 ? (
            <CircleAlert size={28} strokeWidth={1.5} className="text-debt/60 shrink-0" />
          ) : (
            <Check size={28} strokeWidth={1.5} className="text-success-text/60 shrink-0" />
          )}
        </div>

        {/* Money rows */}
        <div className="divide-y divide-border px-4 text-sm">
          <FinRow label="Total charged" value={fmt(job.total)} />
          <FinRow label="Received" value={fmt(job.received)} valueClass="text-success-text" />
          <FinRow
            label={<span className="flex items-center gap-1.5 font-semibold text-ink">
              Office fee <span className="text-sm font-medium text-success-text">(your income)</span>
            </span>}
            value={fmt(job.office_fee)}
            valueClass="font-bold text-ink"
          />
        </div>

        {/* Money bar */}
        {job.total > 0 && (
          <div className="border-t border-border px-4 py-3">
            <MoneyBar
              officeFee={job.office_fee}
              subletAmount={job.sublet_amount}
              parkWaybill={job.park_waybill}
              partnerAmount={job.partner_amount}
              total={job.total}
            />
          </div>
        )}

        {/* Net profit footnote */}
        {totalExpenses > 0 && (
          <div className="border-t border-border bg-page px-4 py-2.5 text-[11px] text-ink-muted">
            Net office profit after {fmt(totalExpenses)} expenses:
            <span className="ml-1 tabular font-semibold text-ink">{fmt(job.profit)}</span>
          </div>
        )}
      </div>

      
    </div>
  );
}

/* ── Record payment panel ───────────────────────────────────────────────── */
function RecordPanel({
  job,
  rawAmount, setRawAmount,
  mode, setMode,
  bankName, setBankName,
  note, setNote,
  payLoading, payError,
  onSubmit, onRefundClick,
}: {
  job: JobDetail;
  rawAmount: string | null;
  setRawAmount: (v: string | null) => void;
  mode: 'cash' | 'transfer';
  setMode: (m: 'cash' | 'transfer') => void;
  bankName: string;
  setBankName: (v: string) => void;
  note: string;
  setNote: (v: string) => void;
  payLoading: boolean;
  payError: string;
  onSubmit: (amount?: string) => void;
  onRefundClick: () => void;
}) {
  const displayAmount = rawAmount ?? String(job.debt);
  const numAmount     = Number(displayAmount);
  const isValid       = numAmount > 0 && numAmount <= job.debt;

  if (job.status === 'cancelled') {
    return (
      <div className="flex items-center gap-2.5 rounded-xl border border-border bg-page px-4 py-5 text-sm text-ink-muted">
        <Ban size={18} strokeWidth={1.75} />
        This job has been cancelled.
      </div>
    );
  }

  if (job.debt <= 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between rounded-xl border border-border bg-success-bg/30 px-4 py-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-success-text">
            <Check size={18} strokeWidth={2} />
            Fully paid — {fmt(job.received)} received
          </p>
        </div>
        {job.received > 0 && (
          <button
            type="button"
            onClick={onRefundClick}
            className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-ink-muted transition-colors hover:border-loss/40 hover:bg-loss-bg/30 hover:text-loss"
          >
            Record a refund
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Balance summary */}
      <div className="flex items-center justify-between rounded-xl border border-border bg-debt-bg/30 px-4 py-3">
        <div>
          <p className="text-sm font-medium text-ink-muted uppercase tracking-wider">Outstanding</p>
          <p className="tabular text-lg font-bold text-debt">{fmt(job.debt)}</p>
        </div>
        <div className="text-right text-[11px] text-ink-muted leading-relaxed">
          <p>Total {fmt(job.total)}</p>
          <p>Received {fmt(job.received)}</p>
        </div>
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); onSubmit(rawAmount ?? String(job.debt)); }}
        className="space-y-4 rounded-xl border border-border bg-card p-4"
      >
        {payError && (
          <div className="flex items-center gap-2 rounded-lg bg-loss-bg px-3 py-2.5 text-sm text-loss">
            <CircleAlert size={15} strokeWidth={1.75} className="shrink-0" />
            {payError}
          </div>
        )}

        {/* Amount input */}
        <div className="space-y-2">
          <label className="block text-[13px] font-medium text-ink-muted">
            Amount (₦)
          </label>
          <div className="flex h-12 overflow-hidden rounded-[10px] border not-focus-within:border-border focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/15 transition-colors">
            <span className="flex items-center bg-page pl-3.5 pr-2 text-sm font-medium text-ink-muted select-none">
              ₦
            </span>
            <input
              type="number"
              inputMode="decimal"
              min={1}
              max={job.debt}
              value={displayAmount}
              onChange={(e) => setRawAmount(e.target.value)}
              className="h-full min-w-0 flex-1 bg-transparent pr-3 text-base font-semibold text-ink outline-none tabular"
              aria-label="Payment amount"
            />
          </div>
          {/* Quick-fill chips */}
          <div className="flex gap-2">
            <QuickFill
              label="Full balance"
              value={fmt(job.debt)}
              onClick={() => setRawAmount(String(job.debt))}
              active={rawAmount === String(job.debt) || rawAmount === null}
            />
            {job.debt > 1 && (
              <QuickFill
                label="Half"
                value={fmt(Math.floor(job.debt / 2))}
                onClick={() => setRawAmount(String(Math.max(1, Math.floor(job.debt / 2))))}
                active={rawAmount === String(Math.max(1, Math.floor(job.debt / 2)))}
              />
            )}
          </div>
        </div>

        {/* Payment mode toggle */}
        <div className="space-y-1.5">
          <label className="block text-[13px] font-medium text-ink-muted">Mode</label>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <ModeButton
              label="Cash"
              icon={<Banknote size={15} strokeWidth={1.75} />}
              active={mode === 'cash'}
              onClick={() => { setMode('cash'); setBankName(''); }}
            />
            <ModeButton
              label="Transfer"
              icon={<Landmark size={15} strokeWidth={1.75} />}
              active={mode === 'transfer'}
              onClick={() => setMode('transfer')}
            />
          </div>
        </div>

        {/* Bank autocomplete — only for transfer */}
        {mode === 'transfer' && (
          <Autocomplete
            label="Bank"
            placeholder="e.g. Access Bank"
            value={bankName}
            onChange={setBankName}
            onSearch={(q) => searchApi.banks(q)}
          />
        )}

        <Input
          label="Note (optional)"
          placeholder="Reference number, context…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        {/* Submit */}
        <button
          type="submit"
          disabled={!isValid || payLoading || (mode === 'transfer' && !bankName.trim())}
          className={cls(
            'flex h-12 w-full items-center justify-center gap-2 rounded-[10px] text-sm font-semibold text-white transition-colors',
            'bg-ink-dark hover:bg-[#1f1f1f]',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40',
          )}
        >
          {payLoading
            ? 'Recording…'
            : `Record ${fmt(isValid ? numAmount : job.debt)} ${mode}`}
        </button>
      </form>
    </div>
  );
}

/* ── Transactions panel ─────────────────────────────────────────────────── */
function TransactionsPanel({
  payments,
  onDelete,
}: {
  payments: Payment[];
  onDelete: (id: number) => void;
}) {
  if (payments.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border px-6 py-10 text-center">
        <ReceiptText size={28} strokeWidth={1.5} className="mx-auto mb-2 text-border" />
        <p className="text-sm font-medium text-ink">No transactions yet</p>
        <p className="mt-0.5 text-xs text-ink-muted">
          Switch to Payment to record cash or a transfer.
        </p>
      </div>
    );
  }

  /* Show newest first */
  const sorted = [...payments].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  return (
    <div className="space-y-2">
      {sorted.map((p) => {
        const isRefund = p.type === 'refund';
        const ModeIcon = p.mode === 'transfer' ? Landmark : Banknote;
        return (
          <div
            key={p.id}
            className="flex items-center gap-3 rounded-xl border border-border bg-card px-3.5 py-3"
          >
            {/* Icon */}
            <div className={cls(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
              isRefund ? 'bg-loss-bg' : 'bg-success-bg',
            )}>
              {isRefund
                ? <RotateCcw size={15} strokeWidth={1.75} className="text-loss" />
                : <ModeIcon  size={15} strokeWidth={1.75} className="text-success-text" />
              }
            </div>

            {/* Amount + meta */}
            <div className="min-w-0 flex-1">
              <p className={cls(
                'tabular text-sm font-semibold',
                isRefund ? 'text-loss' : 'text-success-text',
              )}>
                {isRefund ? '−' : '+'}{fmt(p.amount)}
              </p>
              <p className="mt-0.5 truncate text-[11px] text-ink-muted">
                {p.mode.charAt(0).toUpperCase() + p.mode.slice(1)}
                {p.bank_name ? ` · ${p.bank_name}` : ''}
                {p.note      ? ` · ${p.note}`      : ''}
              </p>
            </div>

            {/* Date + delete */}
            <div className="flex shrink-0 flex-col items-end gap-1">
              <span className="text-[11px] tabular text-ink-muted">
                {p.paid_at ? fmtDate(p.paid_at) : fmtDateTime(p.created_at)}
              </span>
              <button
                type="button"
                onClick={() => onDelete(p.id)}
                className="rounded-lg p-1 text-ink-grey transition-colors hover:bg-loss-bg hover:text-loss"
                aria-label="Delete transaction"
              >
                <Trash2 size={13} strokeWidth={1.75} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Refund modal ───────────────────────────────────────────────────────── */
function RefundModal({
  open, onClose, job,
  rawAmount, setRawAmount,
  mode, setMode,
  bankName, setBankName,
  note, setNote,
  payLoading, payError,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  job: JobDetail;
  rawAmount: string | null;
  setRawAmount: (v: string | null) => void;
  mode: 'cash' | 'transfer';
  setMode: (m: 'cash' | 'transfer') => void;
  bankName: string;
  setBankName: (v: string) => void;
  note: string;
  setNote: (v: string) => void;
  payLoading: boolean;
  payError: string;
  onSubmit: () => void;
}) {
  const displayAmount = rawAmount ?? String(job.received);
  const numAmount     = Number(displayAmount);
  const isValid       = numAmount > 0 && numAmount <= job.received;

  return (
    <Modal open={open} onClose={onClose} title="Record refund" size="sm">
      <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-4">
        {payError && (
          <div className="flex items-center gap-2 rounded-lg bg-loss-bg px-3 py-2.5 text-sm text-loss">
            <CircleAlert size={15} strokeWidth={1.75} className="shrink-0" />
            {payError}
          </div>
        )}

        <div className="space-y-2">
          <label className="block text-[13px] font-medium text-ink-muted">Amount (₦)</label>
          <div className="flex h-12 overflow-hidden rounded-[10px] border not-focus-within:border-border focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/15 transition-colors">
            <span className="flex items-center bg-page pl-3.5 pr-2 text-sm font-medium text-ink-muted select-none">₦</span>
            <input
              type="number"
              inputMode="decimal"
              min={1}
              max={job.received}
              value={displayAmount}
              onChange={(e) => setRawAmount(e.target.value)}
              className="h-full min-w-0 flex-1 bg-transparent pr-3 text-base font-semibold text-ink outline-none tabular"
            />
          </div>
          <div className="flex gap-2">
            <QuickFill label="Full" value={fmt(job.received)} onClick={() => setRawAmount(String(job.received))} active={rawAmount === String(job.received) || rawAmount === null} />
            {job.received > 1 && <QuickFill label="Half" value={fmt(Math.floor(job.received / 2))} onClick={() => setRawAmount(String(Math.max(1, Math.floor(job.received / 2))))} active={false} />}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-[13px] font-medium text-ink-muted">Mode</label>
          <div className="grid grid-cols-2 gap-2">
            <ModeButton label="Cash" icon={<Banknote size={15} strokeWidth={1.75} />} active={mode === 'cash'} onClick={() => { setMode('cash'); setBankName(''); }} />
            <ModeButton label="Transfer" icon={<Landmark size={15} strokeWidth={1.75} />} active={mode === 'transfer'} onClick={() => setMode('transfer')} />
          </div>
        </div>

        {mode === 'transfer' && (
          <Autocomplete label="Bank" placeholder="Select bank" value={bankName} onChange={setBankName} onSearch={(q) => searchApi.banks(q)} />
        )}

        <Input label="Note (optional)" placeholder="Reason for refund…" value={note} onChange={(e) => setNote(e.target.value)} />

        <button
          type="submit"
          disabled={!isValid || payLoading || (mode === 'transfer' && !bankName.trim())}
          className={cls(
            'flex h-12 w-full items-center justify-center gap-2 rounded-[10px] text-sm font-semibold text-white transition-colors',
            'bg-loss hover:bg-red-700',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
        >
          {payLoading ? 'Recording…' : `Refund ${fmt(isValid ? numAmount : job.received)}`}
        </button>
      </form>
    </Modal>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MICRO-COMPONENTS
═══════════════════════════════════════════════════════════════════════════ */

function FinRow({
  label, value, valueClass = 'text-ink',
}: {
  label: React.ReactNode;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <span className="text-sm text-ink-muted">{label}</span>
      <span className={cls('tabular text-sm font-semibold', valueClass)}>{value}</span>
    </div>
  );
}

function ExtraChip({
  icon, label, value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-border bg-card px-3 py-2.5">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink-muted uppercase tracking-wide">{label}</p>
        <p className="truncate text-xs font-semibold text-ink">{value}</p>
      </div>
    </div>
  );
}

function QuickFill({
  label, value, onClick, active,
}: {
  label: string;
  value: string;
  onClick: () => void;
  active: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cls(
        'flex flex-1 flex-col items-center justify-center rounded-[10px] border px-3 py-2 text-center transition-colors',
        active
          ? 'border-brand bg-card-alt text-brand'
          : 'border-border bg-page text-ink-muted hover:border-brand/40 hover:text-ink',
      )}
    >
      <span className="text-sm font-medium leading-none">{label}</span>
      <span className="tabular mt-0.5 text-xs font-bold leading-none">{value}</span>
    </button>
  );
}

function ModeButton({
  label, icon, active, onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cls(
        'flex h-11 items-center justify-center gap-2 rounded-[10px] border text-sm font-semibold transition-colors',
        active
          ? 'border-brand bg-card-alt text-brand'
          : 'border-border bg-card text-ink-muted hover:border-brand/40 hover:text-ink',
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function MenuItem({
  icon, label, onClick, danger = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cls(
        'flex h-10 w-full items-center gap-2.5 rounded-lg px-3 text-left text-sm font-medium transition-colors',
        danger
          ? 'text-loss hover:bg-loss-bg'
          : 'text-ink hover:bg-page',
      )}
    >
      {icon}
      {label}
    </button>
  );
}

/* ── Sticky CTA footer ──────────────────────────────────────────────────── */
function StickyFooter({
  job,
  onStatusAdvance,
  statusLoading,
}: {
  job: JobDetail;
  onStatusAdvance: () => void;
  statusLoading: boolean;
}) {
  /* What does the advance button say? */
  const advanceLabel =
    job.status === 'pending'   ? 'Mark Picked Up' :
    job.status === 'picked_up' ? 'Mark Delivered'  :
    null;

  if (!advanceLabel) return null;

  return (
    <button
      type="button"
      onClick={onStatusAdvance}
      disabled={statusLoading}
      className={cls(
        'flex w-full items-center justify-center gap-2 rounded-[10px] py-3 text-sm font-semibold text-white transition-colors',
        'bg-ink-dark hover:brightness-110 active:brightness-90',
        'disabled:cursor-not-allowed disabled:opacity-60',
      )}
    >
      <Check size={16} strokeWidth={2.5} />
      {statusLoading ? 'Updating…' : advanceLabel}
    </button>
  );
}
