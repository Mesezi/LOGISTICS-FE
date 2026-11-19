import { cls } from '@/lib/utils';

interface BadgeProps {
  /** Pass a chip-* class (e.g. "chip-success") OR a Tailwind bg class. */
  bg: string;
  /** Pass a Tailwind text class, or leave empty when using chip-* classes. */
  text?: string;
  label: string;
  className?: string;
}

export function Badge({ bg, text = '', label, className }: BadgeProps) {
  return (
    <span
      className={cls(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
        bg,
        text,
        className,
      )}
    >
      {label}
    </span>
  );
}
