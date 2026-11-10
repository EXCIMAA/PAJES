// src/components/layout/AppLayout.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "../../lib/utils";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { DatabaseBanner } from "../ui/DatabaseBanner";
import { useAuth } from "../../contexts/AuthContext";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { isDemo, exitDemo } = useAuth(); // ⭐ from useAuth now
  const navigate = useNavigate();

  const handleMenuToggle = () => {
    if (window.matchMedia("(max-width: 767px)").matches) {
      setMobileSidebarOpen((open) => !open);
      return;
    }
    setSidebarCollapsed((collapsed) => !collapsed);
  };

  const handleExitDemo = () => {
    exitDemo();
    navigate("/login");
  };

  return (
    <div className="min-h-[100dvh] bg-app">
      {/* Bandeau Mode Démo (fixe en haut) */}
      {isDemo && (
        <div className="fixed inset-x-0 top-[env(safe-area-inset-top)] z-50 flex h-10 items-center justify-center gap-3 bg-amber-500 px-2 text-center text-sm font-medium text-black">
          <span>🎭 MODE DÉMO — Données fictives</span>
          <button
            onClick={handleExitDemo}
            className="ml-2 px-3 py-0.5 bg-black/20 hover:bg-black/30 rounded text-xs transition-colors"
          >
            Quitter
          </button>
        </div>
      )}

      {/* Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        onToggle={() => setSidebarCollapsed((collapsed) => !collapsed)}
        onNavigate={() => setMobileSidebarOpen(false)}
      />

      {/* TopBar */}
      <TopBar
        onMenuToggle={handleMenuToggle}
        sidebarCollapsed={sidebarCollapsed}
        isDemo={isDemo}
      />

      {/* Contenu principal */}
      <main
        className={cn(
          "min-h-[100dvh] transition-all duration-300",
          isDemo
            ? "pt-[calc(6rem+env(safe-area-inset-top))]"
            : "pt-[calc(3.5rem+env(safe-area-inset-top))]",
          sidebarCollapsed ? "ml-0 md:ml-[72px]" : "ml-0 md:ml-[260px]",
        )}
      >
        <DatabaseBanner />
        <div className="mx-auto max-w-[1600px] px-3 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 sm:px-6 sm:pt-6">
          {children}
        </div>
      </main>
    </div>
  );
}
