import { Package, Search, CheckCircle2, MessageSquare, UserPlus, FileText } from 'lucide-react';
import { cn, formatRelativeTime } from '../../lib/utils';
import type { ActivityItem } from '../../types';

interface ActivityFeedProps {
  items: ActivityItem[];
  className?: string;
}

const typeConfig: Record<ActivityItem['type'], { icon: React.FC<{ className?: string }>; color: string }> = {
  inventory: { icon: Package, color: 'text-primary-400 bg-primary-500/10' },
  finding: { icon: Search, color: 'text-warning-400 bg-warning-500/10' },
  approval: { icon: CheckCircle2, color: 'text-success-400 bg-success-500/10' },
  comment: { icon: MessageSquare, color: 'text-cyan-400 bg-cyan-500/10' },
  assignment: { icon: UserPlus, color: 'text-royal-400 bg-royal-500/10' },
  report: { icon: FileText, color: 'text-emerald-400 bg-emerald-500/10' },
  engagement: { icon: FileText, color: 'text-primary-400 bg-primary-500/10' },
  document: { icon: FileText, color: 'text-cyan-400 bg-cyan-500/10' },
};

export function ActivityFeed({ items, className }: ActivityFeedProps) {
  return (
    <div className={cn('space-y-1', className)}>
      {items.map((item, i) => {
        const config = typeConfig[item.type];
        const Icon = config.icon;
        return (
          <div
            key={item.id}
            className={cn(
              'flex items-start gap-3 p-3 rounded-lg transition-colors hover:bg-slate-700/30 cursor-default',
              i === 0 && 'animate-slide-up'
            )}
          >
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', config.color)}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-200 truncate">{item.title}</p>
              <p className="text-xs text-slate-400 truncate">{item.description}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-2xs text-slate-500">{formatRelativeTime(item.timestamp)}</p>
              <p className="text-2xs text-slate-500">{item.user}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
