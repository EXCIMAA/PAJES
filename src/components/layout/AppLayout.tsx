// src/components/layout/AppLayout.tsx
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Building2,
  CalendarDays,
  FileText,
  FolderOpen,
  LayoutDashboard,
  Package,
  Receipt,
  Target,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { DatabaseBanner } from "../ui/DatabaseBanner";
import { useAuth } from "../../contexts/AuthContext";

interface AppLayoutProps {
  children: React.ReactNode;
}

interface ModuleVisual {
  label: string;
  Icon: LucideIcon;
  accent: string;
}

const MODULE_VISUALS: Array<{ match: string; visual: ModuleVisual }> = [
  { match: "/clients", visual: { label: "Clients & relations", Icon: Building2, accent: "blue" } },
  { match: "/engagements", visual: { label: "Missions & engagements", Icon: Target, accent: "cyan" } },
  { match: "/factures", visual: { label: "Facturation", Icon: Receipt, accent: "emerald" } },
  { match: "/note-de-frais", visual: { label: "Notes de frais", Icon: Wallet, accent: "amber" } },
  { match: "/stock", visual: { label: "Stock & fournitures", Icon: Package, accent: "orange" } },
  { match: "/resources", visual: { label: "Ressources internes", Icon: FolderOpen, accent: "violet" } },
  { match: "/collaborateurs", visual: { label: "Collaborateurs", Icon: Users, accent: "rose" } },
  { match: "/leave", visual: { label: "Congés & absences", Icon: CalendarDays, accent: "teal" } },
  { match: "/reports", visual: { label: "Rapports & analyse", Icon: BarChart3, accent: "indigo" } },
  { match: "/working-papers", visual: { label: "Besoins cabinet", Icon: FileText, accent: "slate" } },
];

const DEFAULT_VISUAL: ModuleVisual = {
  label: "Pilotage du cabinet",
  Icon: LayoutDashboard,
  accent: "blue",
};

export function AppLayout({ children }: AppLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { isDemo, exitDemo } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const moduleVisual = MODULE_VISUALS.find(({ match }) => location.pathname.startsWith(match))?.visual ?? DEFAULT_VISUAL;
  const VisualIcon = moduleVisual.Icon;

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

      <div
        aria-hidden="true"
        className={cn("workspace-visual", `workspace-visual-${moduleVisual.accent}`)}
      >
        <div className="workspace-orbit workspace-orbit-one" />
        <div className="workspace-orbit workspace-orbit-two" />
        <div className="workspace-visual-mark">
          <VisualIcon className="h-10 w-10" strokeWidth={1.4} />
        </div>
      </div>

      {/* Contenu principal */}
      <main
        className={cn(
          "relative z-10 min-h-[100dvh] transition-all duration-300",
          isDemo
            ? "pt-[calc(6.5rem+env(safe-area-inset-top))]"
            : "pt-[calc(4.25rem+env(safe-area-inset-top))]",
          sidebarCollapsed ? "ml-0 md:ml-[72px]" : "ml-0 md:ml-[260px]",
        )}
      >
        <DatabaseBanner />
        <div className="mx-auto max-w-[1600px] px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-5 sm:px-8 sm:pt-8">
          <div className="module-context mb-5 hidden items-center gap-2 sm:flex">
            <span className={cn("module-context-icon", `module-context-${moduleVisual.accent}`)}>
              <VisualIcon className="h-3.5 w-3.5" />
            </span>
            <span>{moduleVisual.label}</span>
            <span className="module-context-dot" />
            <span className="text-app-tertiary">Espace sécurisé PAJES</span>
          </div>
          <div key={`${location.pathname}${location.search}`} className="page-transition">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
