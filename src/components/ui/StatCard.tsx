import {
  BarChart3,
  AlertTriangle,
  Briefcase,
  Package,
  Landmark,
  Search, // <--- ADDED
  Receipt, // <--- ADDED
} from "lucide-react";
import { cn } from "../../lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  color: "primary" | "royal" | "emerald" | "cyan" | "warning" | "error";
  icon: string;
  className?: string;
}

const colorMap = {
  primary: {
    bg: "bg-primary-500/10",
    border: "border-primary-500/20",
    icon: "text-primary-600 dark:text-primary-300",
    glow: "shadow-primary-500/5",
  },
  royal: {
    bg: "bg-royal-500/10",
    border: "border-royal-500/20",
    icon: "text-royal-600 dark:text-royal-300",
    glow: "shadow-royal-500/5",
  },
  emerald: {
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    icon: "text-emerald-600 dark:text-emerald-300",
    glow: "shadow-emerald-500/5",
  },
  cyan: {
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/20",
    icon: "text-cyan-700 dark:text-cyan-300",
    glow: "shadow-cyan-500/5",
  },
  warning: {
    bg: "bg-warning-500/10",
    border: "border-warning-500/20",
    icon: "text-warning-700 dark:text-warning-300",
    glow: "shadow-warning-500/5",
  },
  error: {
    bg: "bg-error-500/10",
    border: "border-error-500/20",
    icon: "text-error-600 dark:text-error-300",
    glow: "shadow-error-500/5",
  },
};

const iconMap: Record<string, React.FC<{ className?: string }>> = {
  "bar-chart": BarChart3,
  "alert-triangle": AlertTriangle,
  briefcase: Briefcase,
  package: Package,
  landmark: Landmark,
  search: Search,
  receipt: Receipt,
};

export function StatCard({
  label,
  value,
  color,
  icon,
  className,
}: StatCardProps) {
  const colors = colorMap[color];
  const IconComponent = iconMap[icon];

  return (
    <div
      className={cn(
        "card-hover p-5 transition-all duration-200 group hover:-translate-y-0.5",
        colors.glow,
        className,
      )}
    >
      <div className="flex items-center justify-between mb-5">
        <div
          className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center",
            colors.bg,
            colors.border,
            "border",
          )}
        >
          {IconComponent && (
            <IconComponent className={cn("w-5 h-5", colors.icon)} />
          )}
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-2xl sm:text-[1.75rem] font-semibold text-app-primary tracking-tight tabular-nums">
          {value}
        </p>
        <p className="text-xs sm:text-sm text-app-secondary leading-5">{label}</p>
      </div>
    </div>
  );
}
