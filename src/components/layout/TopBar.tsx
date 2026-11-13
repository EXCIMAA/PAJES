import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
        "fixed right-0 z-30 h-14 glass border-b border-app transition-[left,top] duration-300",
        isDemo
          ? "top-[calc(2.5rem+env(safe-area-inset-top))]"
          : "top-[env(safe-area-inset-top)]",
        sidebarCollapsed ? "left-0 md:left-[72px]" : "left-0 md:left-[260px]",
      )}
    >
      <div className="flex h-full items-center justify-between px-2 sm:px-4">
        {/* Left: menu + search */}
        <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-3">
          <button
            onClick={onMenuToggle}
            className="p-1.5 rounded-lg hover:bg-app-tertiary text-app-secondary hover:text-app-primary transition-colors shrink-0"
            aria-label={t("navigation.toggleSidebar")}
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Global search (desktop) */}
          <div className="hidden sm:block flex-1 max-w-md">
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
          <LanguageSwitcher />
          <ThemeToggle />
          <button
            onClick={() => navigate("/notifications")}
            className="relative p-2 rounded-lg hover:bg-app-tertiary transition-colors"
            aria-label="Notifications"
          >
            <NotificationBadge iconClassName="w-5 h-5 text-app-secondary" />
          </button>

          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-app-tertiary transition-colors"
              aria-expanded={showUserMenu}
              aria-label={displayName}
            >
              <div className="w-8 h-8 rounded-full bg-primary-600/20 flex items-center justify-center text-sm font-medium text-primary-600 dark:text-primary-300">
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
