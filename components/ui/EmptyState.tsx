import { type LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-card-alt">
        <Icon className="h-6 w-6 text-brand" strokeWidth={1.75} />
      </div>
      <p className="text-[15px] font-semibold text-ink">{title}</p>
      {description && (
        <p className="mt-1 text-sm text-ink-muted max-w-xs">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
