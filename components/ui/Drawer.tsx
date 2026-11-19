'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { cls } from '@/lib/utils';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  /** Rendered between the header and scroll body — stays fixed while content scrolls */
  tabs?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  headerActions?: React.ReactNode;
  width?: string;
}

export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  tabs,
  children,
  footer,
  headerActions,
  width = 'md:w-[90%] md:max-w-xl',
}: DrawerProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={cls(
          'fixed inset-x-0 top-0 z-40 h-dvh bg-black/40 backdrop-blur-[2px] transition-opacity duration-200',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
      />

      {/* Panel — bottom sheet on mobile, side drawer on larger screens */}
      <div
        className={cls(
          'fixed inset-x-0 bottom-0 z-50 flex h-[92dvh] max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-card shadow-(--shadow-dialog) transition-transform duration-200',
          'md:inset-y-0 md:inset-x-auto md:right-0 md:h-dvh md:max-h-none md:rounded-none',
          width,
          open ? 'translate-y-0 md:translate-x-0' : 'translate-y-full md:translate-y-0 md:translate-x-full',
        )}
      >
        <div className="shrink-0 py-2 md:hidden" aria-hidden="true">
          <div className="mx-auto h-1 w-9 rounded-full bg-border" />
        </div>
        {/* ── Header ── always visible */}
        <div className="shrink-0 flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0 flex-1">
            {title && (
              <h2 className="truncate text-sm font-semibold text-ink">{title}</h2>
            )}
            {subtitle && (
              <p className="mt-0.5 truncate text-[11px] text-ink-muted">{subtitle}</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {headerActions}
            <button
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-ink-grey transition-colors hover:bg-page hover:text-ink"
              aria-label="Close"
            >
              <X size={18} strokeWidth={1.75} />
            </button>
          </div>
        </div>

        {/* ── Tabs slot ── always visible, never scrolls */}
        {tabs && (
          <div className="shrink-0 border-b border-border bg-card">
            {tabs}
          </div>
        )}

        {/* ── Scrollable body ── only this area scrolls */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {children}
        </div>

        {/* ── Footer ── always visible */}
        {footer && (
          <div className="shrink-0 border-t border-border bg-card px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:pb-3">
            {footer}
          </div>
        )}
      </div>
    </>
  );
}
