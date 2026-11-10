import { AlertCircle, Inbox, Search } from 'lucide-react';
import { cn } from '../../lib/utils';

interface EmptyStateProps {
  icon?: 'inbox' | 'search' | 'alert';
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

const iconMap = {
  inbox: Inbox,
  search: Search,
  alert: AlertCircle,
};

export function EmptyState({ icon = 'inbox', title, description, action, className }: EmptyStateProps) {
  const Icon = iconMap[icon];
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 px-4 text-center animate-fade-in', className)}>
      <div className="w-12 h-12 rounded-full bg-app-tertiary flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-app-secondary" />
      </div>
      <h3 className="text-sm font-medium text-app-primary mb-1">{title}</h3>
      {description && <p className="text-xs text-app-secondary max-w-sm mb-4">{description}</p>}
      {action && (
        <button onClick={action.onClick} className="btn-primary btn-sm">
          {action.label}
        </button>
      )}
    </div>
  );
}
