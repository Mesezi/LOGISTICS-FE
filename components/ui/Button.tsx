import { cls } from '@/lib/utils';
import { Spinner } from './Spinner';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size    = 'sm' | 'md' | 'lg';

const variants: Record<Variant, string> = {
  primary:
    'bg-brand text-white hover:bg-brand-dark active:bg-brand-dark shadow-sm',
  secondary:
    'border border-border bg-card text-ink hover:bg-page active:bg-page shadow-sm',
  danger:
    'bg-loss text-white hover:bg-red-700 active:bg-red-800 shadow-sm',
  ghost:
    'text-ink-muted hover:text-ink hover:bg-page active:bg-border',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-11 px-5 text-sm gap-2',
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size    = 'md',
  loading,
  icon,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={cls(
        'inline-flex items-center justify-center rounded-[10px] font-semibold',
        'transition-colors duration-150 active:scale-[0.98]',
        'disabled:opacity-50 disabled:pointer-events-none',
        variants[variant],
        sizes[size],
        className,
      )}
    >
      {loading ? <Spinner className="h-4 w-4" /> : icon}
      {children}
    </button>
  );
}
