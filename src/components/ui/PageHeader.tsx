import type { ReactNode } from "react";
import {
  BarChart3,
  BookOpen,
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

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

interface HeaderTheme {
  Icon: LucideIcon;
  accent: "blue" | "cyan" | "emerald" | "amber" | "orange" | "rose" | "slate";
  eyebrow: string;
}

const DEFAULT_THEME: HeaderTheme = {
  Icon: LayoutDashboard,
  accent: "blue",
  eyebrow: "Espace de travail",
};

const HEADER_THEMES: Array<{ match: string[]; theme: HeaderTheme }> = [
  { match: ["ressource", "manuel"], theme: { Icon: FolderOpen, accent: "blue", eyebrow: "Documentation du cabinet" } },
  { match: ["client"], theme: { Icon: Building2, accent: "cyan", eyebrow: "Portefeuille clients" } },
  { match: ["mission", "engagement", "cac"], theme: { Icon: Target, accent: "blue", eyebrow: "Suivi des missions" } },
  { match: ["facture", "caisse"], theme: { Icon: Receipt, accent: "emerald", eyebrow: "Gestion financière" } },
  { match: ["frais"], theme: { Icon: Wallet, accent: "amber", eyebrow: "Dépenses du cabinet" } },
  { match: ["stock", "immobilisation"], theme: { Icon: Package, accent: "orange", eyebrow: "Ressources matérielles" } },
  { match: ["collaborateur", "équipe", "team"], theme: { Icon: Users, accent: "rose", eyebrow: "Vie du cabinet" } },
  { match: ["congé", "absence"], theme: { Icon: CalendarDays, accent: "cyan", eyebrow: "Planning équipe" } },
  { match: ["rapport", "business intelligence", "analyse"], theme: { Icon: BarChart3, accent: "blue", eyebrow: "Pilotage & analyse" } },
  { match: ["besoin", "document", "finding", "constat", "review"], theme: { Icon: FileText, accent: "slate", eyebrow: "Dossiers & contrôle" } },
  { match: ["formation", "compétence"], theme: { Icon: BookOpen, accent: "blue", eyebrow: "Référentiel interne" } },
];

function getHeaderTheme(title: string): HeaderTheme {
  const normalizedTitle = title.toLocaleLowerCase("fr-FR");
  return HEADER_THEMES.find(({ match }) => match.some((term) => normalizedTitle.includes(term)))?.theme ?? DEFAULT_THEME;
}

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  const theme = getHeaderTheme(title);
  const Icon = theme.Icon;

  return (
    <section className={cn("page-hero mb-7", `page-hero-${theme.accent}`, className)}>
      <div className="page-hero-content">
        <div className="page-hero-icon" aria-hidden="true">
          <Icon className="h-7 w-7" strokeWidth={1.8} />
        </div>
        <div className="min-w-0">
          <p className="page-eyebrow mb-2">{theme.eyebrow}</p>
          <h1 className="text-2xl font-bold tracking-tight text-app-primary sm:text-3xl">{title}</h1>
          {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-app-secondary">{description}</p>}
        </div>
      </div>
      {actions && <div className="page-hero-actions">{actions}</div>}
      <div className="page-hero-art" aria-hidden="true">
        <div className="page-hero-art-circle page-hero-art-circle-one" />
        <div className="page-hero-art-circle page-hero-art-circle-two" />
        <div className="page-hero-art-card"><Icon className="h-10 w-10" strokeWidth={1.3} /></div>
      </div>
    </section>
  );
}
