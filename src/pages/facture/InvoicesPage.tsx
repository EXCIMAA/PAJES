// src/pages/InvoicesPage.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  FileText,
  Plus,
  Search,
  Download,
  Eye,
  Trash2,
  Edit2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { useCountry } from "../../contexts/CountryContext";
import { INVOICE_STATUS_CONFIG } from "../../lib/constants";
import { cn, formatDate } from "../../lib/utils";
import { ProtectedAction } from "../../components/auth/ProtectedAction"; // ✅ ADDED

type Invoice = {
  id: string;
  invoice_number: string;
  ref_pf?: string;
  date_emission: string;
  total_general: number;
  status: string;
  currency: string;
  type_document: string;
  client_details_snapshot?: { name?: string };
};

const STAT_CARDS = [
  { key: "total", label: "Total" },
  { key: "sent", label: "Envoyées" },
  { key: "draft", label: "Brouillons" },
  { key: "cancelled", label: "Annulées" },
] as const;

function StatusBadge({ status }: { status: string }) {
  const config = INVOICE_STATUS_CONFIG[status] ?? INVOICE_STATUS_CONFIG.draft;

  const bgColorMap: Record<string, string> = {
    draft: "bg-slate-600",
    pending: "bg-amber-600",
    sent: "bg-sky-600",
    paid: "bg-emerald-600",
    cancelled: "bg-rose-600",
  };

  const bg = bgColorMap[status] || "bg-slate-600";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-white",
        bg,
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-white/60" />
      {config.label}
    </span>
  );
}

export default function InvoicesPage() {
  const { user, profile } = useAuth();
  const { selectedCountry } = useCountry();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tableMissing, setTableMissing] = useState(false);

  const userInitials =
    profile?.initials ||
    `${profile?.first_name?.charAt(0) ?? ""}${profile?.last_name?.charAt(0) ?? ""}`.toUpperCase() ||
    user?.email?.charAt(0).toUpperCase() ||
    "?";

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setTableMissing(false);

    try {
      const { data, error: fetchError } = await supabase
        .from("invoices")
        .select(
          "id, invoice_number, ref_pf, date_emission, total_general, status, currency, type_document, client_details_snapshot",
        )
        .eq("archived", false)
        .eq("country", selectedCountry.code)
        .order("created_at", { ascending: false });

      if (fetchError) {
        if (fetchError.message.includes("Could not find the table")) {
          setTableMissing(true);
        }
        setError(fetchError.message);
        setInvoices([]);
        return;
      }

      setInvoices((data || []) as Invoice[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, [selectedCountry.code, user]);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(
    () => ({
      total: invoices.length,
      sent: invoices.filter((inv) => inv.status === "sent").length,
      draft: invoices.filter((inv) => ["draft", "pending"].includes(inv.status))
        .length,
      cancelled: invoices.filter((inv) => inv.status === "cancelled").length,
    }),
    [invoices],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return invoices;
    return invoices.filter((inv) => {
      const haystack = [
        inv.ref_pf,
        inv.invoice_number,
        inv.client_details_snapshot?.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [invoices, search]);

  const handleDelete = async (id: string) => {
    if (
      !confirm(
        "Archiver cette facture ? Elle ne sera plus visible dans la liste.",
      )
    )
      return;

    const { error: deleteError } = await supabase
      .from("invoices")
      .update({ archived: true })
      .eq("id", id);

    if (deleteError) {
      alert("Erreur lors de l'archivage : " + deleteError.message);
    } else {
      await load();
    }
  };

  const formatAmount = (amount: number, currency: string) =>
    `${new Intl.NumberFormat("fr-FR").format(amount)} ${currency === "XAF" ? "FCFA" : currency}`;

  const getDocumentLabel = (type: string) => {
    if (type === "PRO-FORMA") return "Pro‑forma";
    if (type === "AVOIR") return "Avoir";
    return "Facture";
  };

  return (
    <div className="page-container space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">
            Factures
          </h1>
          <p className="text-sm text-slate-300 mt-1 flex items-center gap-2">
            <span className="font-mono bg-primary-600/20 text-primary-200 px-2 py-0.5 rounded-md text-xs">
              {userInitials}
            </span>
            Gestion des factures EXCI-MAA · {selectedCountry.name}
          </p>
        </div>
        {/* ✅ WRAPPED: Nouvelle facture */}
        <ProtectedAction module="factures" action="create">
          <Link
            to="/factures/new"
            className="btn-primary inline-flex items-center gap-2"
          >
            <Plus size={16} />
            Nouvelle facture
          </Link>
        </ProtectedAction>
      </div>

      {tableMissing && (
        <div className="card p-4 border-amber-500/30 bg-amber-500/10 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm text-white">
            <p className="font-medium text-amber-200">
              Tables factures absentes
            </p>
            <p className="text-amber-100/80 mt-1">
              Exécutez la migration Supabase{" "}
              <code className="text-xs bg-slate-800 px-1 py-0.5 rounded">
                20260703180000_003_invoices.sql
              </code>{" "}
              dans votre projet Supabase, puis réessayez.
            </p>
          </div>
        </div>
      )}

      {error && !tableMissing && (
        <div className="card p-4 border-error-500/30 bg-error-500/10 text-sm text-error-300">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {STAT_CARDS.map((card) => (
          <div
            key={card.key}
            className="card p-4 border-slate-700/50 bg-gradient-to-br from-slate-800/80 to-slate-900/40"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-slate-300">
              {card.label}
            </p>
            <p className="mt-2 text-3xl font-semibold text-white">
              {stats[card.key]}
            </p>
          </div>
        ))}
      </div>

      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-md w-full pl-9 text-white placeholder:text-slate-400 bg-slate-800 border-slate-700 focus:border-primary-500"
          placeholder="Rechercher par référence, numéro ou client..."
        />
      </div>

      <div className="card overflow-hidden border-slate-700/50">
        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-14 bg-slate-800/60 rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-14 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto mb-4">
              <FileText size={28} className="text-slate-500" />
            </div>
            <p className="text-white font-medium">Aucune facture trouvée</p>
            <p className="text-sm text-slate-400 mt-1 mb-5">
              Créez votre première facture avec une référence auto-générée.
            </p>
            <ProtectedAction module="factures" action="create">
              <Link
                to="/factures/new"
                className="btn-primary inline-flex items-center gap-2"
              >
                <Plus size={14} />
                Créer une facture
              </Link>
            </ProtectedAction>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/50 text-slate-300 text-xs uppercase tracking-wide">
                  <th className="text-left px-6 py-3 font-medium">Référence</th>
                  <th className="text-left px-4 py-3 font-medium">Client</th>
                  <th className="text-left px-4 py-3 font-medium">Type</th>
                  <th className="text-left px-4 py-3 font-medium">Document</th>
                  <th className="text-left px-4 py-3 font-medium">Date</th>
                  <th className="text-right px-4 py-3 font-medium">Total</th>
                  <th className="text-left px-4 py-3 font-medium">Statut</th>
                  <th className="text-right px-6 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filtered.map((inv) => {
                  const reference = inv.ref_pf || inv.invoice_number;
                  return (
                    <tr
                      key={inv.id}
                      className="hover:bg-slate-800/40 transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <Link to={`/factures/${inv.id}`} className="block">
                          <p className="font-semibold text-white group-hover:text-primary-300 transition-colors">
                            {reference}
                          </p>
                          {inv.ref_pf && inv.invoice_number !== inv.ref_pf && (
                            <p className="text-xs text-slate-400 mt-0.5 font-mono">
                              {inv.invoice_number}
                            </p>
                          )}
                        </Link>
                      </td>
                      <td className="px-4 py-4 text-white">
                        {inv.client_details_snapshot?.name || "—"}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`text-xs px-2 py-1 rounded-md ${inv.type_document === "AVOIR" ? "bg-amber-700 text-amber-100" : inv.type_document === "PRO-FORMA" ? "bg-blue-700 text-blue-100" : "bg-slate-700 text-white"}`}
                        >
                          {getDocumentLabel(inv.type_document)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-slate-300">
                        {formatDate(inv.date_emission)}
                      </td>
                      <td className="px-4 py-4 text-right font-semibold text-white">
                        {formatAmount(inv.total_general, inv.currency)}
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={inv.status} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          {/* ✅ WRAPPED: Voir */}
                          <ProtectedAction module="factures" action="view">
                            <Link
                              to={`/factures/${inv.id}`}
                              className="p-2 text-slate-300 hover:text-primary-300 hover:bg-primary-500/10 rounded-lg transition-all"
                              title="Voir"
                            >
                              <Eye size={15} />
                            </Link>
                          </ProtectedAction>
                          {/* ✅ WRAPPED: Télécharger PDF (view) */}
                          <ProtectedAction module="factures" action="view">
                            <Link
                              to={`/factures/${inv.id}?download=1`}
                              className="p-2 text-slate-300 hover:text-emerald-300 hover:bg-emerald-500/10 rounded-lg transition-all"
                              title="Télécharger PDF"
                            >
                              <Download size={15} />
                            </Link>
                          </ProtectedAction>
                          {/* ✅ WRAPPED: Modifier */}
                          <ProtectedAction module="factures" action="edit">
                            <Link
                              to={`/factures/${inv.id}/edit`}
                              className="p-2 text-slate-300 hover:text-violet-300 hover:bg-violet-500/10 rounded-lg transition-all"
                              title="Modifier"
                            >
                              <Edit2 size={15} />
                            </Link>
                          </ProtectedAction>
                          {/* ✅ WRAPPED: Supprimer */}
                          <ProtectedAction module="factures" action="delete">
                            <button
                              type="button"
                              onClick={() => handleDelete(inv.id)}
                              className="p-2 text-slate-300 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-all"
                              title="Supprimer"
                            >
                              <Trash2 size={15} />
                            </button>
                          </ProtectedAction>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!loading && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors"
          >
            <RefreshCw size={12} />
            Actualiser
          </button>
        </div>
      )}
    </div>
  );
}
