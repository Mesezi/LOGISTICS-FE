import { cls } from '@/lib/utils';
import { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
  suffix?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, icon, suffix, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="min-w-0 space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-[13px] font-medium text-ink-muted">
            {label}
          </label>
        )}
        <div className="relative min-w-0">
          {icon && (
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-ink-grey">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            {...props}
            className={cls(
              'w-full min-w-0 rounded-[10px] border bg-card text-sm text-ink',
              'outline-none transition-colors duration-150',
              'placeholder:text-ink-grey',
              'focus:ring-2 focus:ring-brand/20 focus:border-brand',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              error
                ? 'border-loss focus:border-loss focus:ring-loss/20'
                : 'border-border hover:border-ink-grey',
              icon   ? 'pl-9'  : 'pl-3.5',
              suffix ? 'pr-9'  : 'pr-3.5',
              'py-2.5',
              className,
            )}
          />
          {suffix && (
            <span className="absolute inset-y-0 right-3 flex items-center text-ink-grey">
              {suffix}
            </span>
          )}
        </div>
        {error && <p className="text-xs text-loss font-medium">{error}</p>}
        {hint && !error && <p className="text-xs text-ink-muted">{hint}</p>}
      </div>
    );
  },
);
Input.displayName = 'Input';
