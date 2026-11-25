import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Search,
  Building2,
  Target,
  ClipboardCheck,
  AlertTriangle,
  Package,
  Users,
  CalendarDays,
  X,
} from "lucide-react";
import { dbApi } from "../../lib/apiClient";
import { cn } from "../../lib/utils";

interface SearchResult {
  id: string;
  title: string;
  description: string;
  type:
    | "client"
    | "engagement"
    | "finding"
    | "review_note"
    | "stock"
    | "leave"
    | "team";
  link: string;
  date?: string;
}

export default function SearchPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const query = new URLSearchParams(location.search).get("q") || "";
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    performSearch(query);
  }, [query]);

  const performSearch = async (searchTerm: string) => {
    setLoading(true);
    setError(null);
    try {
      const term = searchTerm.toLowerCase();
      const match = (row: any, fields: string[]) =>
        fields.some((f) => String(row[f] || "").toLowerCase().includes(term));
      const results: SearchResult[] = [];

      // 1. Clients
      try {
        const clients = await dbApi.list("clients", { limit: 1000 });
        (clients || []).forEach((c: any) => {
          if (match(c, ["name", "email", "contact_person"])) {
            results.push({
              id: c.id,
              title: c.name,
              description: c.email || c.contact_person || "Client",
              type: "client",
              link: `/clients`,
            });
          }
        });
      } catch (e) {
        console.warn("Clients error:", e);
      }

      // 2. Engagements (missions)
      try {
        const engagements = await dbApi.list("engagements", { limit: 1000 });
        (engagements || []).forEach((e: any) => {
          if (match(e, ["code", "client_name", "subject"])) {
            results.push({
              id: e.id,
              title: e.code || e.subject,
              description: e.client_name || "Mission",
              type: "engagement",
              link: `/engagements`,
            });
          }
        });
      } catch (e) {
        console.warn("Engagements error:", e);
      }

      // 3. Findings (constats)
      try {
        const findings = await dbApi.list("findings", { limit: 1000 });
        (findings || []).forEach((f: any) => {
          if (match(f, ["finding"])) {
            results.push({
              id: f.id,
              title: f.finding.substring(0, 60),
              description: `Niveau : ${f.risk_level || "Non défini"}`,
              type: "finding",
              link: `/findings`,
            });
          }
        });
      } catch (e) {
        console.warn("Findings error:", e);
      }

      // 4. Review Notes
      try {
        const reviewNotes = await dbApi.list("review_notes", { limit: 1000 });
        (reviewNotes || []).forEach((r: any) => {
          if (match(r, ["reference", "description"])) {
            results.push({
              id: r.id,
              title: r.reference,
              description: r.description || "Note de revue",
              type: "review_note",
              link: `/review-notes`,
            });
          }
        });
      } catch (e) {
        console.warn("Review notes error:", e);
      }

      // 5. Stock
      try {
        const stockItems = await dbApi.list("stock_items", { limit: 1000 });
        (stockItems || []).forEach((s: any) => {
          if (match(s, ["item_name", "category"])) {
            results.push({
              id: s.id,
              title: s.item_name,
              description: s.category || "Article",
              type: "stock",
              link: `/stock`,
            });
          }
        });
      } catch (e) {
        console.warn("Stock error:", e);
      }

      // 6. Leave requests
      try {
        const leaves = await dbApi.list("leave_requests", { limit: 1000 });
        (leaves || []).forEach((l: any) => {
          if (match(l, ["employee_name", "leave_type"])) {
            results.push({
              id: l.id,
              title: l.employee_name || "Congé",
              description: l.leave_type || "",
              type: "leave",
              link: `/leave`,
            });
          }
        });
      } catch (e) {
        console.warn("Leave error:", e);
      }

      // 7. Team (profiles)
      try {
        const teamMembers = await dbApi.list("profiles", { limit: 1000 });
        (teamMembers || []).forEach((p: any) => {
          if (match(p, ["full_name", "email"])) {
            results.push({
              id: p.id,
              title: p.full_name,
              description: p.email || "Membre de l'équipe",
              type: "team",
              link: `/team`,
            });
          }
        });
      } catch (e) {
        console.warn("Team error:", e);
      }

      // Trier les résultats par date si disponible (approximatif)
      results.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
      setResults(results);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const iconMap: Record<
    SearchResult["type"],
    React.FC<{ className?: string }>
  > = {
    client: Building2,
    engagement: Target,
    finding: AlertTriangle,
    review_note: ClipboardCheck,
    stock: Package,
    leave: CalendarDays,
    team: Users,
  };

  const colorMap: Record<SearchResult["type"], string> = {
    client: "text-blue-400 bg-blue-500/10",
    engagement: "text-emerald-400 bg-emerald-500/10",
    finding: "text-red-400 bg-red-500/10",
    review_note: "text-purple-400 bg-purple-500/10",
    stock: "text-orange-400 bg-orange-500/10",
    leave: "text-yellow-400 bg-yellow-500/10",
    team: "text-cyan-400 bg-cyan-500/10",
  };

  const labelMap: Record<SearchResult["type"], string> = {
    client: "Client",
    engagement: "Mission",
    finding: "Constats",
    review_note: "Note de revue",
    stock: "Stock",
    leave: "Congé",
    team: "Équipe",
  };

  return (
    <div className="page-container">
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-semibold text-slate-100">Recherche</h1>
        <div className="flex-1 max-w-md">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const input = e.currentTarget.querySelector("input")?.value;
              if (input) navigate(`/search?q=${encodeURIComponent(input)}`);
            }}
            className="relative"
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              defaultValue={query}
              placeholder="Rechercher dans tous les modules..."
              className="w-full pl-9 pr-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </form>
        </div>
        {query && (
          <button
            onClick={() => navigate("/search")}
            className="p-2 rounded-lg hover:bg-slate-700/40 text-slate-400 hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="card p-6 text-error-500">Erreur : {error}</div>
      ) : !query ? (
        <div className="card p-12 text-center">
          <Search className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">
            Saisissez un terme de recherche pour commencer.
          </p>
        </div>
      ) : results.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-slate-400">
            Aucun résultat trouvé pour "{query}".
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-slate-400">
            {results.length} résultat(s) trouvé(s)
          </p>
          <div className="space-y-3">
            {results.map((result) => {
              const Icon = iconMap[result.type] || Search;
              const color =
                colorMap[result.type] || "text-slate-400 bg-slate-500/10";
              const label = labelMap[result.type] || result.type;
              return (
                <div
                  key={result.id}
                  onClick={() => navigate(result.link)}
                  className="card-hover p-4 flex items-start gap-4 cursor-pointer transition-colors"
                >
                  <div
                    className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                      color,
                    )}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-slate-100 truncate">
                        {result.title}
                      </p>
                      <span className="text-2xs px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-400 shrink-0">
                        {label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 truncate">
                      {result.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
