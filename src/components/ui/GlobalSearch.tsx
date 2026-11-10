import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  X,
  Building2,
  Target,
  ClipboardCheck,
  AlertTriangle,
  Package,
  Users,
  CalendarDays,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { supabase } from "../../lib/supabase";
import { useDebounce } from "../../hooks/useDebounce";

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
}

const iconMap: Record<string, React.FC<{ className?: string }>> = {
  client: Building2,
  engagement: Target,
  finding: AlertTriangle,
  review_note: ClipboardCheck,
  stock: Package,
  leave: CalendarDays,
  team: Users,
};

const labelMap: Record<string, string> = {
  client: "Client",
  engagement: "Mission",
  finding: "Constats",
  review_note: "Note de revue",
  stock: "Stock",
  leave: "Congé",
  team: "Équipe",
};

const colorMap: Record<string, string> = {
  client: "text-blue-400 bg-blue-500/10",
  engagement: "text-emerald-400 bg-emerald-500/10",
  finding: "text-red-400 bg-red-500/10",
  review_note: "text-purple-400 bg-purple-500/10",
  stock: "text-orange-400 bg-orange-500/10",
  leave: "text-yellow-400 bg-yellow-500/10",
  team: "text-cyan-400 bg-cyan-500/10",
};

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const debouncedQuery = useDebounce(query, 300);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const performSearch = async () => {
      setLoading(true);
      try {
        const term = `%${debouncedQuery}%`;
        const allResults: SearchResult[] = [];

        console.log("🔍 Recherche de:", debouncedQuery);

        // 1. Clients
        try {
          const { data: clients } = await supabase
            .from("clients")
            .select("id, name")
            .ilike("name", term)
            .limit(5);
          console.log("Clients trouvés:", clients?.length || 0);
          if (clients) {
            clients.forEach((c: any) => {
              allResults.push({
                id: c.id,
                title: c.name,
                description: "Client",
                type: "client",
                link: "/clients",
              });
            });
          }
        } catch (e) {
          console.warn("Clients error:", e);
        }

        // 2. Engagements
        try {
          const { data: engagements } = await supabase
            .from("engagements")
            .select("id, code, subject")
            .or(`code.ilike.${term}, subject.ilike.${term}`)
            .limit(5);
          console.log("Engagements trouvés:", engagements?.length || 0);
          if (engagements) {
            engagements.forEach((e: any) => {
              allResults.push({
                id: e.id,
                title: e.code || e.subject,
                description: "Mission",
                type: "engagement",
                link: "/engagements",
              });
            });
          }
        } catch (e) {
          console.warn("Engagements error:", e);
        }

        // 3. Findings
        try {
          const { data: findings } = await supabase
            .from("findings")
            .select("id, finding")
            .ilike("finding", term)
            .limit(5);
          console.log("Findings trouvés:", findings?.length || 0);
          if (findings) {
            findings.forEach((f: any) => {
              allResults.push({
                id: f.id,
                title: f.finding.substring(0, 50),
                description: "Constats",
                type: "finding",
                link: "/findings",
              });
            });
          }
        } catch (e) {
          console.warn("Findings error:", e);
        }

        // 4. Stock
        try {
          const { data: stockItems } = await supabase
            .from("stock_items")
            .select("id, item_name")
            .ilike("item_name", term)
            .limit(5);
          console.log("Stock trouvés:", stockItems?.length || 0);
          if (stockItems) {
            stockItems.forEach((s: any) => {
              allResults.push({
                id: s.id,
                title: s.item_name,
                description: "Stock",
                type: "stock",
                link: "/stock",
              });
            });
          }
        } catch (e) {
          console.warn("Stock error:", e);
        }

        // 5. Leave
        try {
          const { data: leaves } = await supabase
            .from("leave_requests")
            .select("id, employee_name")
            .ilike("employee_name", term)
            .limit(5);
          console.log("Leaves trouvés:", leaves?.length || 0);
          if (leaves) {
            leaves.forEach((l: any) => {
              allResults.push({
                id: l.id,
                title: l.employee_name || "Congé",
                description: "Congé",
                type: "leave",
                link: "/leave",
              });
            });
          }
        } catch (e) {
          console.warn("Leave error:", e);
        }

        // 6. Profiles (Team)
        try {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, full_name")
            .ilike("full_name", term)
            .limit(5);
          console.log("Profiles trouvés:", profiles?.length || 0);
          if (profiles) {
            profiles.forEach((p: any) => {
              allResults.push({
                id: p.id,
                title: p.full_name,
                description: "Équipe",
                type: "team",
                link: "/team",
              });
            });
          }
        } catch (e) {
          console.warn("Profiles error:", e);
        }

        console.log("✅ Total résultats:", allResults.length);
        setResults(allResults.slice(0, 12));
        setIsOpen(allResults.length > 0);
      } catch (err) {
        console.error("Erreur recherche:", err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    performSearch();
  }, [debouncedQuery]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && query.trim()) {
      e.preventDefault();
      navigate(`/search?q=${encodeURIComponent(query)}`);
      setIsOpen(false);
      setQuery("");
      inputRef.current?.blur();
    }
    if (e.key === "Escape") {
      setIsOpen(false);
      setQuery("");
      inputRef.current?.blur();
    }
  };

  const handleResultClick = (result: SearchResult) => {
    setIsOpen(false);
    setQuery("");
    navigate(result.link);
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative flex items-center">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Rechercher dans le système... (Ctrl+K)"
          className="w-full pl-9 pr-10 py-1.5 text-sm bg-slate-800/50 border border-slate-700/50 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-transparent transition-all"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setResults([]);
              setIsOpen(false);
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-slate-700/50 text-slate-400 hover:text-slate-200"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-700/50 rounded-lg shadow-xl max-h-80 overflow-y-auto z-50">
          {loading ? (
            <div className="p-4 text-center text-slate-400">
              <div className="w-5 h-5 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mx-auto" />
            </div>
          ) : results.length === 0 ? (
            <div className="p-4 text-center text-slate-400 text-sm">
              Aucun résultat pour "{debouncedQuery}"
            </div>
          ) : (
            <>
              <div className="py-2">
                {results.map((result) => {
                  const Icon = iconMap[result.type] || Search;
                  const color =
                    colorMap[result.type] || "text-slate-400 bg-slate-500/10";
                  const label = labelMap[result.type] || result.type;
                  return (
                    <button
                      key={result.id}
                      onClick={() => handleResultClick(result)}
                      className="w-full flex items-start gap-3 px-4 py-2 hover:bg-slate-700/40 transition-colors text-left"
                    >
                      <div
                        className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                          color,
                        )}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-200 truncate">
                            {result.title}
                          </span>
                          <span className="text-2xs px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-400 shrink-0">
                            {label}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 truncate">
                          {result.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="border-t border-slate-700/50 px-4 py-2 text-xs text-slate-400 text-center">
                <button
                  onClick={() => {
                    navigate(`/search?q=${encodeURIComponent(query)}`);
                    setIsOpen(false);
                    setQuery("");
                  }}
                  className="text-primary-400 hover:underline"
                >
                  Voir tous les résultats
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
