import { Bell } from "lucide-react";
import { useUnreadCount } from "../../hooks/useUnreadCount";
import { cn } from "../../lib/utils";

interface NotificationBadgeProps {
  className?: string;
  iconClassName?: string;
}

export function NotificationBadge({
  className,
  iconClassName,
}: NotificationBadgeProps) {
  const { count, loading } = useUnreadCount();

  return (
    <div className={cn("relative inline-flex items-center", className)}>
      <Bell className={cn("w-5 h-5", iconClassName)} />
      {!loading && count > 0 && (
        <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-bold text-white bg-red-500 rounded-full shadow-md ring-2 ring-slate-900">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </div>
  );
}
