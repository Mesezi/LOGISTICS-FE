import { format, parseISO } from 'date-fns';
import type { JobStatus } from './api';

/* ── Money formatter ──────────────────────────────────────────────────────── */
export function fmt(amount: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/* ── Date formatters ──────────────────────────────────────────────────────── */
export function fmtDate(date: string) {
  try { return format(parseISO(date), 'dd MMM yyyy'); }
  catch { return date; }
}

export function fmtDateTime(date: string) {
  try { return format(parseISO(date), 'dd MMM yyyy, h:mm a'); }
  catch { return date; }
}

/* ── Status colours ───────────────────────────────────────────────────────── */
// bg / text classes map to the chip-* helper classes in globals.css.
// Every badge in the app pulls from here — change once, changes everywhere.
export const statusColors: Record<JobStatus, { bg: string; text: string; label: string }> = {
  pending:   { bg: 'chip-debt',    text: '', label: 'Pending'   },
  picked_up: { bg: 'chip-info',    text: '', label: 'Picked Up' },
  delivered: { bg: 'chip-success', text: '', label: 'Delivered' },
  failed:    { bg: 'chip-loss',    text: '', label: 'Failed'    },
  cancelled: { bg: 'chip-neutral', text: '', label: 'Cancelled' },
};

export function paymentLabel(debt: number, received: number, total: number) {
  if (received === 0) return { label: 'Unpaid',    bg: 'chip-loss',    text: '' };
  if (debt <= 0)      return { label: 'Paid',      bg: 'chip-success', text: '' };
  return               { label: 'Part-Paid', bg: 'chip-debt',    text: '' };
}

/* ── className joiner ─────────────────────────────────────────────────────── */
export function cls(...args: (string | false | null | undefined)[]) {
  return args.filter(Boolean).join(' ');
}
