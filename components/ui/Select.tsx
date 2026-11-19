import { cls } from '@/lib/utils';
import { forwardRef } from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string | number; label: string }[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-[13px] font-medium text-ink-muted">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={inputId}
          {...props}
          className={cls(
            'w-full rounded-[10px] border bg-card px-3.5 py-2.5 text-sm text-ink',
            'outline-none transition-colors duration-150',
            'focus:ring-2 focus:ring-brand/20 focus:border-brand',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error
              ? 'border-loss focus:border-loss'
              : 'border-border hover:border-ink-grey',
            className,
          )}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {error && <p className="text-xs text-loss font-medium">{error}</p>}
      </div>
    );
  },
);
Select.displayName = 'Select';
