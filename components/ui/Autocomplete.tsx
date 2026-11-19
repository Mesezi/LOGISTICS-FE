'use client';

import { useState, useRef, useEffect } from 'react';
import { cls } from '@/lib/utils';
import { Spinner } from './Spinner';

interface AutocompleteProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (val: string) => void;
  onSearch: (q: string) => Promise<{ name: string }[]>;
  error?: string;
  disabled?: boolean;
}

export function Autocomplete({
  label,
  placeholder,
  value,
  onChange,
  onSearch,
  error,
  disabled,
}: AutocompleteProps) {
  const [query, setQuery]     = useState(value);
  const [results, setResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen]       = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ref   = useRef<HTMLDivElement>(null);

  useEffect(() => { setQuery(value); }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value;
    setQuery(q);
    onChange(q);
    if (timer.current) clearTimeout(timer.current);
    if (!q.trim()) { setResults([]); setOpen(false); return; }
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await onSearch(q);
        setResults(data.map((d) => d.name));
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 300);
  }

  function pick(name: string) {
    setQuery(name);
    onChange(name);
    setOpen(false);
  }

  const inputId = label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div ref={ref} className="relative space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-[13px] font-medium text-ink-muted">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={inputId}
          value={query}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          className={cls(
            'w-full rounded-[10px] border bg-card px-3.5 py-2.5 pr-9 text-sm text-ink',
            'outline-none transition-colors duration-150 placeholder:text-ink-grey',
            'focus:ring-2 focus:ring-brand/20 focus:border-brand',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error
              ? 'border-loss focus:border-loss focus:ring-loss/20'
              : 'border-border hover:border-ink-grey',
          )}
        />
        {loading && (
          <span className="absolute inset-y-0 right-3 flex items-center">
            <Spinner className="h-4 w-4 text-brand" />
          </span>
        )}
      </div>
      {error && <p className="text-xs text-loss font-medium">{error}</p>}
      {open && results.length > 0 && (
        <ul className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-border bg-card py-1 shadow-[var(--shadow-dialog)]">
          {results.map((name) => (
            <li
              key={name}
              onMouseDown={() => pick(name)}
              className="cursor-pointer px-4 py-2.5 text-sm text-ink hover:bg-card-alt hover:text-brand transition-colors"
            >
              {name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
