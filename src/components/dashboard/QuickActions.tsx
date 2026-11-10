import {
  Target,
  Search,
  PackagePlus,
  CalendarDays,
  Upload,
  FileText, // Added for "Note de frais ouvertes"
  Receipt, // Added for "Nouvelle note de frais"
  UserPlus, // Added for "Nouveau collaborateur"
  FilePlus, // Added for "Nouvelle facture"
  AlertTriangle, // Added for "Constats ouverts"
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "../../lib/utils";
import { QUICK_ACTIONS } from "../../lib/constants";

// Updated icon map with all required icons
const iconMap: Record<string, React.FC<{ className?: string }>> = {
  Target,
  Search,
  PackagePlus,
  CalendarDays,
  Upload,
  FileText,
  Receipt,
  UserPlus,
  FilePlus,
  AlertTriangle,
};

const colorClasses: Record<
  string,
  { bg: string; icon: string; hover: string }
> = {
  primary: {
    bg: "bg-primary-500/10",
    icon: "text-primary-600 dark:text-primary-300",
    hover: "hover:bg-primary-500/10",
  },
  royal: {
    bg: "bg-royal-500/10",
    icon: "text-royal-600 dark:text-royal-300",
    hover: "hover:bg-royal-500/10",
  },
  emerald: {
    bg: "bg-emerald-500/10",
    icon: "text-emerald-600 dark:text-emerald-300",
    hover: "hover:bg-emerald-500/10",
  },
  cyan: {
    bg: "bg-cyan-500/10",
    icon: "text-cyan-700 dark:text-cyan-300",
    hover: "hover:bg-cyan-500/10",
  },
  warning: {
    bg: "bg-warning-500/10",
    icon: "text-warning-700 dark:text-warning-300",
    hover: "hover:bg-warning-500/10",
  },
};

interface QuickActionsProps {
  className?: string;
  onAction?: (id: string) => void;
}

export function QuickActions({ className, onAction }: QuickActionsProps) {
  const { t } = useTranslation();

  return (
    <div className={cn("card p-5", className)}>
      <h3 className="text-sm font-semibold text-app-primary mb-4">
        {t("dashboard.quickActions")}
      </h3>
      <div className="space-y-1">
        {QUICK_ACTIONS.map((action) => {
          const Icon = iconMap[action.icon];
          const colors = colorClasses[action.color];
          return (
            <button
              key={action.id}
              onClick={() => onAction?.(action.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 group text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500",
                colors.hover,
              )}
            >
              <div
                className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center",
                  colors.bg,
                )}
              >
                {Icon && <Icon className={cn("w-4 h-4", colors.icon)} />}
              </div>
              <span className="text-sm text-app-secondary group-hover:text-app-primary">
                {action.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
