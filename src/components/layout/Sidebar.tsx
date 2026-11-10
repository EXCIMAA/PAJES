// src/components/layout/Sidebar.tsx

import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  Target,
  ClipboardCheck,
  Search,
  FileText,
  Package,
  Landmark,
  CalendarDays,
  Users,
  BarChart3,
  Bell,
  ChevronLeft,
  ChevronRight,
  Wallet,
  Hexagon,
  BookOpen,
  Receipt,
  Truck,
  ClipboardList,
  FolderOpen, // ✅ ajout pour Ressources internes
  Scale,
  X,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { NAV_ITEMS } from "../../lib/constants";
import { useTranslation } from "react-i18next";
import { NotificationBadge } from "../ui/NotificationBadge";
import { usePermission } from "../../hooks/usePermission";
import type { ModuleId } from "../../lib/permissions";

const BI_MODULES: ModuleId[] = [
  "factures",
  "clients",
  "missions",
  "stock",
  "caisse",
  "immobilisations",
  "notes_frais",
  "collaborateur_performance",
];

const iconMap: Record<string, React.FC<{ className?: string }>> = {
  LayoutDashboard,
  Building2,
  Target,
  ClipboardCheck,
  Search,
  FileText,
  Package,
  Landmark,
  CalendarDays,
  Users,
  BarChart3,
  Bell,
  Truck,
  Wallet,
  BookOpen,
  Receipt,
  ClipboardList,
  FolderOpen, // ✅ ajout dans le map
};

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onNavigate: () => void;
}

export function Sidebar({
  collapsed,
  onToggle,
  mobileOpen,
  onNavigate,
}: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { can } = usePermission();
  const hasBIVisibility = BI_MODULES.some((module) => can(module, "view"));
  const isCollapsed = collapsed && !mobileOpen;

  const sectionLabels: Record<string, string> = {
    principal: t("navigation.principal"),
    cabinet: t("navigation.cabinet"),
    missions: t("navigation.missions"),
    opérations: t("navigation.operations"),
    operations: t("navigation.operations"),
    personnel: t("navigation.personnel"),
    administration: t("navigation.administration"),
  };

  const itemLabels: Record<string, string> = {
    dashboard: t("navigation.dashboard"),
    "note-de-frais": t("navigation.expenses"),
    resources: t("navigation.resources"),
    stock: t("navigation.stock"),
    "fixed-assets": t("navigation.assets"),
    manuel: t("navigation.manuel"),
    "working-papers": t("navigation.needs"),
    factures: t("navigation.invoices"),
    "missions-cac": t("navigation.cac"),
    clients: t("navigation.clients"),
    engagements: t("navigation.missions"),
    "review-notes": t("navigation.review_notes"),
    findings: t("navigation.findings"),
    "cac-suivi": t("navigation.cac_followup"),
    leave: t("navigation.leaves"),
    collaborateurs: t("navigation.collaborators"),
    team: t("navigation.team"),
    reports: t("navigation.reports"),
    "business-intelligence": t("navigation.businessIntelligence"),
    notifications: t("navigation.notifications"),
  };

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-slate-950/45 backdrop-blur-[2px] md:hidden"
          aria-label={t("navigation.closeSidebar")}
          onClick={onNavigate}
        />
      )}
      <aside
        className={cn(
          "sidebar-shell fixed left-0 top-[env(safe-area-inset-top)] bottom-[env(safe-area-inset-bottom)] z-40 flex w-[280px] flex-col border-r transition-all duration-300 md:translate-x-0",
          mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full",
          collapsed ? "md:w-[72px]" : "md:w-[260px]",
        )}
        aria-label={t("navigation.principal")}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-app">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-primary-500 flex items-center justify-center shrink-0 shadow-sm shadow-primary-500/30">
              <Hexagon className="w-5 h-5 text-white" />
            </div>
            {!isCollapsed && (
              <div className="animate-fade-in min-w-0">
                <h1 className="text-base font-semibold text-app-primary tracking-tight">
                  {t("app.title")}
                </h1>
                <p className="text-2xs text-app-tertiary tracking-wide">
                  EXCIMAA
                </p>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onNavigate}
            className="md:hidden p-2 rounded-lg text-app-secondary hover:bg-app-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300"
            aria-label={t("navigation.closeSidebar")}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

      <nav className="flex-1 py-5 px-3 overflow-y-auto" aria-label={t("navigation.principal")}>
        {NAV_ITEMS.map((section, si) => (
          <div key={section.section} className={cn(si > 0 && "mt-6")}>
            {!isCollapsed && (
              <p className="px-3 mb-2 text-2xs font-medium text-app-tertiary uppercase tracking-widest">
                {sectionLabels[section.section.toLowerCase()] ??
                  section.section}
              </p>
            )}
            <ul className="space-y-1" role="list">
              {section.items.map((item) => {
                if (item.id === "business-intelligence" && !hasBIVisibility) {
                  return null;
                }
                const isActive = location.pathname === item.path;
                const isNotifications = item.id === "notifications";

                return (
                  <li key={item.id}>
                    <button
                      onClick={() => {
                        navigate(item.path);
                        onNavigate();
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-150 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300",
                        isActive
                          ? "bg-primary-400/15 text-white"
                          : "text-app-secondary hover:bg-app-tertiary hover:text-app-primary",
                      )}
                      aria-current={isActive ? "page" : undefined}
                      title={isCollapsed ? item.label : undefined}
                    >
                      {isNotifications ? (
                        <NotificationBadge
                          iconClassName={cn(
                            "w-5 h-5 shrink-0 transition-colors",
                            isActive
                              ? "text-primary-500 dark:text-primary-400"
                              : "text-app-secondary group-hover:text-app-primary",
                          )}
                        />
                      ) : (
                        (() => {
                          const Icon = iconMap[item.icon];
                          return (
                            Icon && (
                              <Icon
                                className={cn(
                                  "w-5 h-5 shrink-0 transition-colors",
                                  isActive
                                    ? "text-primary-500 dark:text-primary-400"
                                    : "text-app-secondary group-hover:text-app-primary",
                                )}
                              />
                            )
                          );
                        })()
                      )}
                      {!isCollapsed && (
                        <span className="truncate">
                          {itemLabels[item.id] ?? item.label}
                        </span>
                      )}
                      {isActive && !isCollapsed && (
                        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan-300" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="px-3 pb-2">
        <button
          onClick={() => {
            navigate("/legal");
            onNavigate();
          }}
          data-public-navigation="true"
          className={cn(
            "w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-150",
            location.pathname === "/legal"
              ? "bg-primary-400/15 text-white"
              : "text-app-secondary hover:bg-app-tertiary hover:text-app-primary",
          )}
          aria-current={location.pathname === "/legal" ? "page" : undefined}
          title={isCollapsed ? t("navigation.legal") : undefined}
        >
          <Scale className="w-5 h-5 shrink-0" />
          {!isCollapsed && <span className="truncate">{t("navigation.legal")}</span>}
        </button>
      </div>

      <div className="p-3 border-t border-app hidden md:block">
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-slate-700/40 hover:text-slate-200 transition-colors"
          aria-label={
            collapsed ? t("navigation.expand") : t("navigation.reduce")
          }
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
          {!collapsed && (
            <span className="text-xs">{t("navigation.reduce")}</span>
          )}
        </button>
      </div>
      </aside>
    </>
  );
}
