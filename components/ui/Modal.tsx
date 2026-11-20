'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cls } from '@/lib/utils';
import { Button } from './Button';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizes = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-2xl' };

const subscribeToPortalTarget = () => () => {};
const getPortalTargetSnapshot = () =>
  typeof document === 'undefined' ? null : document.body;
const getServerPortalTargetSnapshot = () => null;

export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  const portalTarget = useSyncExternalStore(
    subscribeToPortalTarget,
    getPortalTargetSnapshot,
    getServerPortalTargetSnapshot,
  );

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open || !portalTarget) return null;

  return createPortal(
    <div className="fixed inset-x-0 top-0 z-[60] flex h-screen items-center justify-center p-4 [height:100dvh]">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        className={cls(
          'relative w-full rounded-xl bg-card',
          'shadow-[var(--shadow-dialog)]',
          sizes[size],
        )}
      >
        {title && (
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-base font-semibold text-ink">{title}</h2>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-ink-grey hover:bg-page hover:text-ink transition-colors"
              aria-label="Close"
            >
              <X size={16} strokeWidth={1.75} />
            </button>
          </div>
        )}
        <div className="px-5 py-5">{children}</div>
      </div>
    </div>,
    portalTarget,
  );
}

/* ── Confirm dialog ───────────────────────────────────────────────────────── */
interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  loading?: boolean;
}

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  danger,
  loading,
}: ConfirmModalProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <p className="mb-6 text-sm text-ink-muted leading-relaxed">{message}</p>
      <div className="flex justify-end gap-3">
        <Button variant="secondary" size="sm" onClick={onClose} type="button">
          Cancel
        </Button>
        <Button
          variant={danger ? 'danger' : 'primary'}
          size="sm"
          onClick={onConfirm}
          loading={loading}
          type="button"
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
