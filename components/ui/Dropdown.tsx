'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cls } from '@/lib/utils';

interface DropdownOption {
  label: string;
  value: string;
}

interface DropdownProps {
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  'aria-label'?: string;
}

export function Dropdown({
  value,
  options,
  onChange,
  className,
  'aria-label': ariaLabel,
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  return (
    <div ref={ref} className={cls('relative', className)}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((v) => !v)}
        className={cls(
          'flex h-9 w-full items-center justify-between gap-2 rounded-lg border bg-card pl-3 pr-2.5 text-xs font-semibold text-ink outline-none transition-colors',
          open
            ? 'border-brand ring-2 ring-brand/15'
            : 'border-border hover:border-ink-grey',
        )}
      >
        <span className="truncate">{selected?.label ?? '—'}</span>
        <ChevronDown
          size={13}
          strokeWidth={2}
          className={cls('shrink-0 text-ink-grey transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label={ariaLabel}
          className="absolute left-0 top-full z-30 mt-1 min-w-full overflow-hidden rounded-xl border border-border bg-card shadow-[0_8px_24px_rgba(22,34,51,.12)]"
        >
          {options.map((opt) => {
            const active = opt.value === value;
            return (
              <li key={opt.value} role="option" aria-selected={active}>
                <button
                  type="button"
                  onClick={() => { onChange(opt.value); setOpen(false); }}
                  className={cls(
                    'flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left text-xs font-semibold transition-colors',
                    active
                      ? 'bg-brand/8 text-brand'
                      : 'text-ink hover:bg-page',
                  )}
                >
                  {opt.label}
                  {active && <Check size={12} strokeWidth={2.5} className="shrink-0 text-brand" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
