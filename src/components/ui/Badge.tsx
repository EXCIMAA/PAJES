import { cn } from '../../lib/utils';

interface BadgeProps {
  variant: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'neutral';
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeProps['variant'], string> = {
  primary: 'bg-primary-500/15 text-primary-600 dark:text-primary-300 ring-1 ring-primary-500/25',
  success: 'bg-success-500/15 text-success-600 dark:text-success-500 ring-1 ring-success-500/25',
  warning: 'bg-warning-500/15 text-warning-600 dark:text-warning-500 ring-1 ring-warning-500/25',
  error: 'bg-error-500/15 text-error-600 dark:text-error-500 ring-1 ring-error-500/25',
  info: 'bg-info-500/15 text-info-600 dark:text-info-500 ring-1 ring-info-500/25',
  neutral: 'bg-app-tertiary text-app-secondary ring-1 ring-app-border',
};

export function Badge({ variant, children, className }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', variantClasses[variant], className)}>
      {children}
    </span>
  );
}
