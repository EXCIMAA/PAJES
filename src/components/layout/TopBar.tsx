import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Menu, LogOut, Settings, ChevronDown, Search } from "lucide-react";
import { cn } from "../../lib/utils";
import { useAuth } from "../../contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { NotificationBadge } from "../ui/NotificationBadge";
import { GlobalSearch } from "../ui/GlobalSearch";
import { LanguageSwitcher } from "../ui/LanguageSwitcher";
import { ThemeToggle } from "../ui/ThemeToggle";

interface TopBarProps {
  onMenuToggle: () => void;
  sidebarCollapsed: boolean;
  isDemo: boolean;
}

const getInitials = (name: string): string => {
  if (!name) return "U";
  const parts = name.trim().split(" ");
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

export function TopBar({
  onMenuToggle,
  sidebarCollapsed,
  isDemo,
}: TopBarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut, user } = useAuth();
  const { t } = useTranslation();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = async () => {
    await signOut(); // nettoie session, isDemo, etc.
    setShowUserMenu(false);
    navigate("/login", { replace: true }); // redirection vers la page de connexion
  };

  const displayName = user?.full_name || user?.email || t("common.user");
  const initials = getInitials(user?.full_name || user?.email || "");

  return (
    <header
      className={cn(
        "fixed right-0 z-30 h-[68px] glass border-b border-app transition-[left,top] duration-300 shadow-[0_4px_18px_rgba(15,35,68,0.04)]",
        isDemo
          ? "top-[calc(2.5rem+env(safe-area-inset-top))]"
          : "top-[env(safe-area-inset-top)]",
        sidebarCollapsed ? "left-0 md:left-[72px]" : "left-0 md:left-[260px]",
      )}
    >
      <div className="flex h-full items-center justify-between px-3 sm:px-6">
        {/* Left: menu + search */}
        <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-3">
          <button
            onClick={onMenuToggle}
            className="p-2 rounded-xl hover:bg-app-tertiary text-app-secondary hover:text-app-primary transition-colors shrink-0"
            aria-label={t("navigation.toggleSidebar")}
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="hidden lg:flex items-center gap-3 min-w-0">
            <div className="h-7 w-px bg-app border-app" />
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-app-tertiary">Espace de travail</p>
              <p className="truncate text-sm font-semibold text-app-primary">{location.pathname === "/" ? "Vue d’ensemble" : "PAJES"}</p>
            </div>
          </div>
          <div className="hidden sm:block flex-1 max-w-md ml-4">
            <GlobalSearch />
          </div>

          {/* Mobile search button */}
          <button
            onClick={() => navigate("/search")}
            className="p-1.5 rounded-lg hover:bg-app-tertiary text-app-secondary hover:text-app-primary transition-colors sm:hidden"
            aria-label={t("navigation.search")}
          >
            <Search className="w-5 h-5" />
          </button>
        </div>

        {/* Right: notifications + language + user menu */}
        <div className="flex shrink-0 items-center gap-0.5 sm:gap-2">
          <div className="hidden sm:flex items-center gap-1 rounded-xl border border-app bg-app-tertiary/50 p-1">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
          <button
            onClick={() => navigate("/notifications")}
            className="relative p-2.5 rounded-xl hover:bg-app-tertiary transition-colors"
            aria-label="Notifications"
          >
            <NotificationBadge iconClassName="w-5 h-5 text-app-secondary" />
          </button>

          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 rounded-xl p-1.5 hover:bg-app-tertiary transition-colors"
              aria-expanded={showUserMenu}
              aria-label={displayName}
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center text-xs font-bold text-white shadow-md shadow-primary-500/20">
                {initials}
              </div>
              <ChevronDown
                className={cn(
                  "w-4 h-4 text-app-tertiary transition-transform",
                  showUserMenu && "rotate-180",
                )}
              />
            </button>

            {showUserMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowUserMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-56 bg-card border border-app rounded-lg shadow-xl overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-app">
                    <p className="text-sm font-medium text-app-primary truncate">
                      {displayName}
                    </p>
                    <p className="text-xs text-app-tertiary truncate">
                      {user?.email}
                    </p>
                  </div>
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        navigate("/profile");
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-app-secondary hover:bg-app-tertiary transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                      {t("navigation.settings")}
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-error-600 dark:text-error-400 hover:bg-app-tertiary transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      {t("navigation.logout")}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
