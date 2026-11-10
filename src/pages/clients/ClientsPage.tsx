// src/pages/clients/ClientsPage.tsx
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Search, Edit2, Trash2, X, Check } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { useCountry } from "../../contexts/CountryContext";
import { PageHeader } from "../../components/ui/PageHeader";
import { EmptyState } from "../../components/ui/EmptyState";
import { addNotification } from "../../lib/notifications";
import { EtablissementsSection } from "./components/EtablissementsSection";
import { ProtectedAction } from "../../components/auth/ProtectedAction"; // ✅ ADDED

// ==================== CONSTANTS ====================
const COUNTRIES = [
  { code: "CMR", label: "Cameroun", flag: "🇨🇲" },
  { code: "BDI", label: "Burundi", flag: "🇧🇮" },
  { code: "COG", label: "République du Congo", flag: "🇨🇬" },
  { code: "GAB", label: "Gabon", flag: "🇬🇦" },
  { code: "RWA", label: "Rwanda", flag: "🇷🇼" },
  { code: "TZA", label: "Tanzanie", flag: "🇹🇿" },
  { code: "UGA", label: "Ouganda", flag: "🇺🇬" },
  { code: "COD", label: "République Démocratique du Congo", flag: "🇨🇩" },
  { code: "CAN", label: "Canada", flag: "🇨🇦" },
  { code: "FRA", label: "France", flag: "🇫🇷" },
  { code: "USA", label: "USA", flag: "🇺🇸" },
  { code: "ARE", label: "Dubai (UAE)", flag: "🇦🇪" },
];

const NATURE_OPTIONS = [
  "Commissariat aux comptes",
  "Conseil",
  "Expertise comptables",
  "CGA",
];

type Client = {
  id: string;
  client_code: string;
  name: string;
  country: string;
  nature?: string;
  address_bp: string;
  nui: string;
  rccm: string;
  contract_ref: string;
  manager_name: string;
  email: string;
  phone: string;
  city: string;
  rue?: string;
  forme_juridique?: string;
  obligation_300_salaries?: boolean;
  obligation_consolidee?: boolean;
  obligation_ca_18000ke?: boolean;
  statut_fiscal?: string;
  regime_fiscal?: string;
  nb_salaries?: number;
  decalage_paie?: boolean;
  jour_versement_salaires?: string;
  date_paye?: string;
  option_versement_mensuel?: boolean;
  entreprise_travail_temporaire?: boolean;
  rattachement_decalage_paie?: boolean;
  vrp_mono_carte?: boolean;
  vrp_multi_carte?: boolean;
  prevoyance_cadres_obligatoire?: boolean;
  prevoyance_cadres_non_cadres?: boolean;
  retraite_complementaire_non_cadre?: boolean;
  retraite_complementaire_cadre?: boolean;
  mutuelle?: boolean;
  retraite_capitalisation?: boolean;
  versement_1_pourcent_cdd?: boolean;
  soumis_cotisations_tns?: boolean;
  status?: string;
  forme_juridique_id?: number | null;
  statut_fiscal_id?: number | null;
  regime_fiscal_id?: number | null;
  nature_id?: number | null;
};

type RefForme = { id: number; label: string };
type RefStatutFiscal = { id: number; label: string };
type RefRegimeFiscal = { id: number; label: string };
type RefNature = { id: number; label: string };
type RefTaxe = {
  id: number;
  code: string;
  libelle: string;
  obligation: string;
  deadline: string;
  assujettis_condition: string;
  legal_ref: string;
  periodicite: string;
};
type RefCategory = { id: number; label: string };
type RefDocument = {
  id: number;
  category_id: number;
  label: string;
  ref_categories_documents?: RefCategory;
};
type ClientDocument = {
  id: number;
  client_id: string;
  document_id: number;
  status: "a_fournir" | "fourni" | "non_applicable";
  date_fourni?: string;
  commentaire?: string;
};
type ClientTaxe = {
  id: number;
  client_id: string;
  taxe_id: number;
  assujetti: boolean;
  date_derniere_declaration?: string;
  commentaire?: string;
};

type ModalState = { open: boolean; client: Partial<Client> | null };

export default function ClientsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { selectedCountry } = useCountry();
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filterCountry, setFilterCountry] = useState<string>("all");
  const [filterNature, setFilterNature] = useState<string>("all");

  const [modal, setModal] = useState<ModalState>({ open: false, client: null });
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "general" | "juridiques" | "fiscales" | "sociales" | "etablissements"
  >("general");

  const [refs, setRefs] = useState<{
    formes: RefForme[];
    statuts: RefStatutFiscal[];
    regimes: RefRegimeFiscal[];
    natures: RefNature[];
    taxes: RefTaxe[];
    categories: RefCategory[];
    documents: RefDocument[];
  }>({
    formes: [],
    statuts: [],
    regimes: [],
    natures: [],
    taxes: [],
    categories: [],
    documents: [],
  });

  const [clientDocuments, setClientDocuments] = useState<ClientDocument[]>([]);
  const [clientTaxes, setClientTaxes] = useState<ClientTaxe[]>([]);

  const loadReferences = async () => {
    try {
      const [
        formesRes,
        statutsRes,
        regimesRes,
        naturesRes,
        taxesRes,
        categoriesRes,
        documentsRes,
      ] = await Promise.all([
        supabase.from("ref_formes_juridiques").select("*").order("label"),
        supabase.from("ref_statuts_fiscaux").select("*").order("label"),
        supabase.from("ref_regimes_fiscaux").select("*").order("label"),
        supabase.from("ref_natures").select("*").order("label"),
        supabase.from("ref_taxes").select("*").order("libelle"),
        supabase.from("ref_categories_documents").select("*").order("label"),
        supabase
          .from("ref_documents")
          .select("*, ref_categories_documents!inner(label)")
          .order("category_id, label"),
      ]);

      setRefs({
        formes: formesRes.data || [],
        statuts: statutsRes.data || [],
        regimes: regimesRes.data || [],
        natures: naturesRes.data || [],
        taxes: taxesRes.data || [],
        categories: categoriesRes.data || [],
        documents: documentsRes.data || [],
      });
    } catch (err) {
      console.error("Erreur chargement références:", err);
    }
  };

  const loadClients = async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("client_code");
      if (error) throw error;
      setClients(data || []);
    } catch (err: any) {
      setError(`Erreur chargement clients: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadClientLinks = async (clientId?: string) => {
    if (!clientId) {
      setClientDocuments([]);
      setClientTaxes([]);
      return;
    }
    try {
      const [docsRes, taxesRes] = await Promise.all([
        supabase.from("client_documents").select("*").eq("client_id", clientId),
        supabase.from("client_taxes").select("*").eq("client_id", clientId),
      ]);
      setClientDocuments(docsRes.data || []);
      setClientTaxes(taxesRes.data || []);
    } catch (err) {
      console.error("Erreur chargement liens:", err);
    }
  };

  useEffect(() => {
    loadReferences();
    loadClients();
  }, [user]);

  useEffect(() => {
    if (modal.open && modal.client?.id) {
      loadClientLinks(modal.client.id);
    } else {
      setClientDocuments([]);
      setClientTaxes([]);
    }
  }, [modal.open, modal.client?.id]);

  const generateClientCode = async (countryCode: string) => {
    const { data, error } = await supabase
      .from("clients")
      .select("client_code")
      .like("client_code", `${countryCode}%`)
      .order("client_code", { ascending: false })
      .limit(1);

    if (error) {
      console.error("Erreur génération code:", error);
      return `${countryCode}00001`;
    }

    let nextNum = 1;
    if (data && data.length > 0) {
      const lastCode = data[0].client_code;
      const match = lastCode.match(/\d+$/);
      if (match) nextNum = parseInt(match[0]) + 1;
    }
    return `${countryCode}${String(nextNum).padStart(5, "0")}`;
  };

  const openAdd = async () => {
    try {
      const defaultCountry = selectedCountry?.code || "CMR";
      const nextCode = await generateClientCode(defaultCountry);
      const currentYear = new Date().getFullYear();
      const contractRef = `CONTRAT/${currentYear}/${nextCode}`;

      setModal({
        open: true,
        client: {
          client_code: nextCode,
          country: defaultCountry,
          contract_ref: contractRef,
          manager_name: "",
          email: "",
          phone: "",
          city: "",
          rue: "",
          forme_juridique_id: null,
          nature_id: null,
          obligation_300_salaries: false,
          obligation_consolidee: false,
          obligation_ca_18000ke: false,
          statut_fiscal_id: null,
          regime_fiscal_id: null,
          nb_salaries: 0,
          decalage_paie: false,
          jour_versement_salaires: "",
          date_paye: "",
          option_versement_mensuel: false,
          entreprise_travail_temporaire: false,
          rattachement_decalage_paie: false,
          vrp_mono_carte: false,
          vrp_multi_carte: false,
          prevoyance_cadres_obligatoire: false,
          prevoyance_cadres_non_cadres: false,
          retraite_complementaire_non_cadre: false,
          retraite_complementaire_cadre: false,
          mutuelle: false,
          retraite_capitalisation: false,
          versement_1_pourcent_cdd: false,
          soumis_cotisations_tns: false,
          status: "active",
        },
      });
      setActiveTab("general");
    } catch (err) {
      console.error("Erreur ouverture modal:", err);
      setError("Impossible d'initialiser le nouveau client.");
    }
  };

  const openEdit = (client: Client) => {
    setModal({ open: true, client: { ...client } });
    setActiveTab("general");
  };

  const handleDelete = async (clientId: string, clientName: string) => {
    if (!confirm(`Supprimer définitivement "${clientName}" ?`)) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from("clients")
        .delete()
        .eq("id", clientId);
      if (error) throw error;
      await loadClients();
      await addNotification({
        title: "Client supprimé",
        message: `Le client "${clientName}" a été supprimé.`,
        type: "client",
      });
    } catch (err: any) {
      setError(`Erreur suppression: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: keyof Client, value: any) => {
    setModal((m) => ({ ...m, client: { ...m.client, [field]: value } }));
  };

  const handleCountryChange = async (countryCode: string) => {
    const newCode = await generateClientCode(countryCode);
    const currentYear = new Date().getFullYear();
    updateField("country", countryCode);
    updateField("client_code", newCode);
    updateField("contract_ref", `CONTRAT/${currentYear}/${newCode}`);
  };

  const handleDocumentStatusChange = (
    documentId: number,
    status: "a_fournir" | "fourni" | "non_applicable",
  ) => {
    const existing = clientDocuments.find((d) => d.document_id === documentId);
    if (existing) {
      setClientDocuments((prev) =>
        prev.map((d) => (d.document_id === documentId ? { ...d, status } : d)),
      );
    } else {
      setClientDocuments((prev) => [
        ...prev,
        {
          id: 0,
          client_id: modal.client?.id || "",
          document_id: documentId,
          status,
        } as ClientDocument,
      ]);
    }
  };

  const handleTaxeChange = (taxeId: number, assujetti: boolean) => {
    const existing = clientTaxes.find((t) => t.taxe_id === taxeId);
    if (existing) {
      setClientTaxes((prev) =>
        prev.map((t) => (t.taxe_id === taxeId ? { ...t, assujetti } : t)),
      );
    } else {
      setClientTaxes((prev) => [
        ...prev,
        {
          id: 0,
          client_id: modal.client?.id || "",
          taxe_id: taxeId,
          assujetti,
        } as ClientTaxe,
      ]);
    }
  };

  const handleSave = async () => {
    if (!modal.client?.name?.trim()) {
      setError("Le nom est requis");
      return;
    }
    setSaving(true);
    setError("");

    const payload: any = {
      client_code: modal.client.client_code || "",
      name: modal.client.name || "",
      country: modal.client.country || "CMR",
      address_bp: modal.client.address_bp || "",
      nui: modal.client.nui || "",
      rccm: modal.client.rccm || "",
      contract_ref: modal.client.contract_ref || "",
      manager_name: modal.client.manager_name || "",
      email: modal.client.email || "",
      phone: modal.client.phone || "",
      city: modal.client.city || "",
      rue: modal.client.rue || "",
      forme_juridique_id: modal.client.forme_juridique_id || null,
      nature_id: modal.client.nature_id || null,
      nature: modal.client.nature || null,
      obligation_300_salaries: modal.client.obligation_300_salaries || false,
      obligation_consolidee: modal.client.obligation_consolidee || false,
      obligation_ca_18000ke: modal.client.obligation_ca_18000ke || false,
      statut_fiscal_id: modal.client.statut_fiscal_id || null,
      regime_fiscal_id: modal.client.regime_fiscal_id || null,
      nb_salaries: modal.client.nb_salaries || 0,
      decalage_paie: modal.client.decalage_paie || false,
      jour_versement_salaires: modal.client.jour_versement_salaires || "",
      date_paye: modal.client.date_paye || null,
      option_versement_mensuel: modal.client.option_versement_mensuel || false,
      entreprise_travail_temporaire:
        modal.client.entreprise_travail_temporaire || false,
      rattachement_decalage_paie:
        modal.client.rattachement_decalage_paie || false,
      vrp_mono_carte: modal.client.vrp_mono_carte || false,
      vrp_multi_carte: modal.client.vrp_multi_carte || false,
      prevoyance_cadres_obligatoire:
        modal.client.prevoyance_cadres_obligatoire || false,
      prevoyance_cadres_non_cadres:
        modal.client.prevoyance_cadres_non_cadres || false,
      retraite_complementaire_non_cadre:
        modal.client.retraite_complementaire_non_cadre || false,
      retraite_complementaire_cadre:
        modal.client.retraite_complementaire_cadre || false,
      mutuelle: modal.client.mutuelle || false,
      retraite_capitalisation: modal.client.retraite_capitalisation || false,
      versement_1_pourcent_cdd: modal.client.versement_1_pourcent_cdd || false,
      soumis_cotisations_tns: modal.client.soumis_cotisations_tns || false,
      status: modal.client.status || "active",
    };

    let clientId = modal.client.id;
    let clientName = modal.client.name || "";

    try {
      if (clientId) {
        const { error: updateError } = await supabase
          .from("clients")
          .update(payload)
          .eq("id", clientId);
        if (updateError) throw updateError;
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from("clients")
          .insert(payload)
          .select("id, name")
          .single();
        if (insertError) throw insertError;
        clientId = inserted.id;
        clientName = inserted.name || clientName;
      }

      if (clientId) {
        await supabase
          .from("client_documents")
          .delete()
          .eq("client_id", clientId);

        const docsToInsert = clientDocuments
          .filter((d) => d.status && d.document_id)
          .map((d) => ({
            client_id: clientId,
            document_id: d.document_id,
            status: d.status,
            date_fourni:
              d.status === "fourni"
                ? new Date().toISOString().split("T")[0]
                : null,
            commentaire: null,
          }));
        if (docsToInsert.length > 0) {
          const { error: docsError } = await supabase
            .from("client_documents")
            .insert(docsToInsert);
          if (docsError) throw docsError;
        }

        await supabase.from("client_taxes").delete().eq("client_id", clientId);

        const taxesToInsert = clientTaxes
          .filter((t) => t.assujetti !== undefined && t.taxe_id)
          .map((t) => ({
            client_id: clientId,
            taxe_id: t.taxe_id,
            assujetti: t.assujetti,
            date_derniere_declaration: null,
            commentaire: null,
          }));
        if (taxesToInsert.length > 0) {
          const { error: taxesError } = await supabase
            .from("client_taxes")
            .insert(taxesToInsert);
          if (taxesError) throw taxesError;
        }
      }

      await addNotification({
        title: clientId ? "Client modifié" : "Nouveau client",
        message: `Le client "${clientName}" a été ${clientId ? "mis à jour" : "ajouté"}.`,
        type: "client",
      });

      setModal({ open: false, client: null });
      await loadClients();
    } catch (err: any) {
      setError(`Erreur lors de l'enregistrement : ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const filtered = clients.filter((c) => {
    const matchSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.client_code.toLowerCase().includes(search.toLowerCase()) ||
      (c.manager_name &&
        c.manager_name.toLowerCase().includes(search.toLowerCase()));
    const matchCountry = filterCountry === "all" || c.country === filterCountry;
    const matchNature = filterNature === "all" || c.nature === filterNature;
    return matchSearch && matchCountry && matchNature;
  });

  return (
    <div className="page-container">
      <PageHeader
        title={t("clients.title")}
        description={t("clients.manage")}
        actions={
          // ✅ WRAPPED IN ProtectedAction
          <ProtectedAction module="clients" action="create">
            <button
              onClick={openAdd}
              className="flex items-center gap-2 px-4 py-2 bg-[#1e3a5f] text-white rounded-xl text-sm font-medium hover:bg-[#2a4f7f] transition-all shadow-sm"
            >
              <Plus size={16} />
              {t("clients.addClient")}
            </button>
          </ProtectedAction>
        }
      />

      {/* Filtres et recherche */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("clients.searchPlaceholder")}
            className="auth-input w-full pl-10 pr-4 py-2.5 text-white bg-slate-800 border-slate-600 focus:border-primary-500"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={filterCountry}
            onChange={(e) => setFilterCountry(e.target.value)}
            className="auth-input py-2.5 px-3 text-white bg-slate-800 border-slate-600 focus:border-primary-500 rounded-lg"
          >
            <option value="all">🌍 {t("clients.allCountries")}</option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.flag} {c.label}
              </option>
            ))}
          </select>
          <select
            value={filterNature}
            onChange={(e) => setFilterNature(e.target.value)}
            className="auth-input py-2.5 px-3 text-white bg-slate-800 border-slate-600 focus:border-primary-500 rounded-lg"
          >
            <option value="all">📋 {t("clients.allNatures")}</option>
            {NATURE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Tableau des clients */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-12 bg-slate-100 rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title={t("clients.noClients")}
            description={t("clients.addFirstClient")}
            action={{ label: t("clients.addClient"), onClick: openAdd }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                  <th className="text-left px-6 py-3 font-medium">
                    {t("clients.code")}
                  </th>
                  <th className="text-left px-4 py-3 font-medium">
                    {t("clients.name")}
                  </th>
                  <th className="text-left px-4 py-3 font-medium">
                    {t("clients.country")}
                  </th>
                  <th className="text-left px-4 py-3 font-medium">
                    {t("clients.nature")}
                  </th>
                  <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">
                    {t("clients.manager")}
                  </th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">
                    {t("clients.city")}
                  </th>
                  <th className="text-right px-6 py-3 font-medium">
                    {t("clients.actions")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((client) => {
                  const countryInfo = COUNTRIES.find(
                    (c) => c.code === client.country,
                  );
                  return (
                    <tr
                      key={client.id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-6 py-3 font-mono text-xs text-slate-600">
                        {client.client_code}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {client.name}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {countryInfo ? (
                          <span className="flex items-center gap-1">
                            {countryInfo.flag} {countryInfo.label}
                          </span>
                        ) : (
                          client.country
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {client.nature || "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-500 hidden lg:table-cell">
                        {client.manager_name || "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-500 hidden md:table-cell">
                        {client.city || "—"}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* ✅ WRAPPED EDIT BUTTON */}
                          <ProtectedAction module="clients" action="edit">
                            <button
                              onClick={() => openEdit(client)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                              title="Modifier"
                            >
                              <Edit2 size={14} />
                            </button>
                          </ProtectedAction>
                          {/* ✅ WRAPPED DELETE BUTTON */}
                          <ProtectedAction module="clients" action="delete">
                            <button
                              onClick={() =>
                                handleDelete(client.id, client.name)
                              }
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                              title="Supprimer"
                            >
                              <Trash2 size={14} />
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

      {/* ========== MODAL ========== */}
      {modal.open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800">
                {modal.client?.id
                  ? t("clients.editClient")
                  : t("clients.newClient")}
              </h2>
              <button
                onClick={() => setModal({ open: false, client: null })}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            {/* Tabs */}
            <div className="border-b border-slate-100 px-6">
              <div className="flex gap-6">
                {[
                  "general",
                  "juridiques",
                  "fiscales",
                  "sociales",
                  "etablissements",
                ].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab as any)}
                    className={`py-2 text-sm font-medium transition-all ${
                      activeTab === tab
                        ? "text-blue-600 border-b-2 border-blue-600"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {tab === "general"
                      ? t("clients.tabs.general")
                      : tab === "juridiques"
                        ? t("clients.tabs.juridiques")
                        : tab === "fiscales"
                          ? t("clients.tabs.fiscales")
                          : tab === "sociales"
                            ? t("clients.tabs.sociales")
                            : t("clients.tabs.etablissements")}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

              {/* ====== TAB GÉNÉRAL ====== */}
              {activeTab === "general" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">
                        Code client
                      </label>
                      <input
                        value={modal.client?.client_code || ""}
                        readOnly
                        className="auth-input w-full px-3 py-2 text-sm bg-slate-50 text-slate-500 cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">
                        Pays
                      </label>
                      <select
                        value={modal.client?.country || "CMR"}
                        onChange={async (e) =>
                          await handleCountryChange(e.target.value)
                        }
                        className="auth-input w-full px-3 py-2 text-sm bg-white border-slate-300"
                        style={{ color: "black" }}
                      >
                        {COUNTRIES.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.flag} {c.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Nature
                    </label>
                    <select
                      value={modal.client?.nature_id || ""}
                      onChange={(e) => {
                        const id = e.target.value
                          ? Number(e.target.value)
                          : null;
                        updateField("nature_id", id);
                        const label = id
                          ? refs.natures.find((n) => n.id === id)?.label
                          : "";
                        updateField("nature", label);
                      }}
                      className="auth-input w-full px-3 py-2 text-sm bg-white border-slate-300"
                      style={{ color: "black" }}
                    >
                      <option value="">-- Sélectionner --</option>
                      {refs.natures.map((n) => (
                        <option key={n.id} value={n.id}>
                          {n.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Nom / Raison sociale{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={modal.client?.name || ""}
                      onChange={(e) => updateField("name", e.target.value)}
                      className="auth-input w-full px-3 py-2 text-sm"
                      placeholder="ACME SARL"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Nom du gérant / président
                    </label>
                    <input
                      value={modal.client?.manager_name || ""}
                      onChange={(e) =>
                        updateField("manager_name", e.target.value)
                      }
                      className="auth-input w-full px-3 py-2 text-sm"
                      placeholder="Mr. TCHÉBÉ Trésor"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Mail
                      </label>
                      <input
                        value={modal.client?.email || ""}
                        onChange={(e) => updateField("email", e.target.value)}
                        type="email"
                        className="auth-input w-full px-3 py-2 text-sm"
                        placeholder="contact@exemple.com"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Téléphone
                      </label>
                      <input
                        value={modal.client?.phone || ""}
                        onChange={(e) => updateField("phone", e.target.value)}
                        className="auth-input w-full px-3 py-2 text-sm"
                        placeholder="+237 6XX XXX XXX"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Ville
                      </label>
                      <input
                        value={modal.client?.city || ""}
                        onChange={(e) => updateField("city", e.target.value)}
                        className="auth-input w-full px-3 py-2 text-sm"
                        placeholder="Douala"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Rue
                      </label>
                      <input
                        value={modal.client?.rue || ""}
                        onChange={(e) => updateField("rue", e.target.value)}
                        className="auth-input w-full px-3 py-2 text-sm"
                        placeholder="12 Avenue Manga"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Adresse / BP
                    </label>
                    <input
                      value={modal.client?.address_bp || ""}
                      onChange={(e) =>
                        updateField("address_bp", e.target.value)
                      }
                      className="auth-input w-full px-3 py-2 text-sm"
                      placeholder="BP 1234"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        NUI
                      </label>
                      <input
                        value={modal.client?.nui || ""}
                        onChange={(e) => updateField("nui", e.target.value)}
                        className="auth-input w-full px-3 py-2 text-sm"
                        placeholder="M0000XXXXXXX"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        RCCM
                      </label>
                      <input
                        value={modal.client?.rccm || ""}
                        onChange={(e) => updateField("rccm", e.target.value)}
                        className="auth-input w-full px-3 py-2 text-sm"
                        placeholder="RC/DLA/XXXX/B/XXX"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Réf. contrat
                    </label>
                    <input
                      value={modal.client?.contract_ref || ""}
                      readOnly
                      className="auth-input w-full px-3 py-2 text-sm bg-slate-100 text-slate-600 cursor-not-allowed"
                      placeholder="Généré automatiquement"
                    />
                  </div>
                </>
              )}

              {/* ====== TAB JURIDIQUES ====== */}
              {activeTab === "juridiques" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Forme juridique
                      </label>
                      <select
                        value={modal.client?.forme_juridique_id || ""}
                        onChange={(e) =>
                          updateField(
                            "forme_juridique_id",
                            e.target.value ? Number(e.target.value) : null,
                          )
                        }
                        className="auth-input w-full px-3 py-2 text-sm bg-white border-slate-300"
                        style={{ color: "black" }}
                      >
                        <option value="">-- Sélectionner --</option>
                        {refs.formes.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Statut
                      </label>
                      <input
                        value={modal.client?.status || ""}
                        onChange={(e) => updateField("status", e.target.value)}
                        className="auth-input w-full px-3 py-2 text-sm"
                        placeholder="Active / Inactive"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Date de création
                      </label>
                      <input
                        type="date"
                        value={modal.client?.date_paye || ""}
                        onChange={(e) =>
                          updateField("date_paye", e.target.value)
                        }
                        className="auth-input w-full px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Numéro de contrat
                      </label>
                      <input
                        value={modal.client?.contract_ref || ""}
                        readOnly
                        className="auth-input w-full px-3 py-2 text-sm bg-slate-100 text-slate-600 cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <h4 className="font-medium text-sm text-slate-700 mb-2">
                      Documents juridiques
                    </h4>
                    <div className="space-y-2 max-h-60 overflow-y-auto border rounded p-2">
                      {refs.documents
                        .filter(
                          (doc) =>
                            doc.ref_categories_documents?.label === "Juridique",
                        )
                        .map((doc) => {
                          const clientDoc = clientDocuments.find(
                            (cd) => cd.document_id === doc.id,
                          );
                          const status = clientDoc?.status || "a_fournir";
                          return (
                            <div
                              key={doc.id}
                              className="flex items-center gap-3 text-sm"
                            >
                              <span className="flex-1 text-slate-700">
                                {doc.label}
                              </span>
                              <select
                                value={status}
                                onChange={(e) =>
                                  handleDocumentStatusChange(
                                    doc.id,
                                    e.target.value as any,
                                  )
                                }
                                className="border rounded px-2 py-1 text-xs bg-white"
                                style={{ color: "black" }}
                              >
                                <option value="a_fournir">À fournir</option>
                                <option value="fourni">Fourni</option>
                                <option value="non_applicable">
                                  Non applicable
                                </option>
                              </select>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </>
              )}

              {/* ====== TAB FISCALES ====== */}
              {activeTab === "fiscales" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Statut fiscal
                      </label>
                      <select
                        value={modal.client?.statut_fiscal_id || ""}
                        onChange={(e) =>
                          updateField(
                            "statut_fiscal_id",
                            e.target.value ? Number(e.target.value) : null,
                          )
                        }
                        className="auth-input w-full px-3 py-2 text-sm bg-white border-slate-300"
                        style={{ color: "black" }}
                      >
                        <option value="">-- Sélectionner --</option>
                        {refs.statuts.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Régime fiscal
                      </label>
                      <select
                        value={modal.client?.regime_fiscal_id || ""}
                        onChange={(e) =>
                          updateField(
                            "regime_fiscal_id",
                            e.target.value ? Number(e.target.value) : null,
                          )
                        }
                        className="auth-input w-full px-3 py-2 text-sm bg-white border-slate-300"
                        style={{ color: "black" }}
                      >
                        <option value="">-- Sélectionner --</option>
                        {refs.regimes.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={!!modal.client?.obligation_ca_18000ke}
                        onChange={(e) =>
                          updateField("obligation_ca_18000ke", e.target.checked)
                        }
                        className="form-checkbox h-4 w-4 text-blue-600"
                      />
                      Obligation CA 18 000 KE
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={!!modal.client?.obligation_consolidee}
                        onChange={(e) =>
                          updateField("obligation_consolidee", e.target.checked)
                        }
                        className="form-checkbox h-4 w-4 text-blue-600"
                      />
                      Obligation consolidée
                    </label>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={!!modal.client?.obligation_300_salaries}
                      onChange={(e) =>
                        updateField("obligation_300_salaries", e.target.checked)
                      }
                      className="form-checkbox h-4 w-4 text-blue-600"
                    />
                    Obligation 300 salariés
                  </label>

                  <div className="mt-4">
                    <h4 className="font-medium text-sm text-slate-700 mb-2">
                      Documents fiscaux
                    </h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto border rounded p-2">
                      {refs.documents
                        .filter(
                          (doc) =>
                            doc.ref_categories_documents?.label === "Fiscal",
                        )
                        .map((doc) => {
                          const clientDoc = clientDocuments.find(
                            (cd) => cd.document_id === doc.id,
                          );
                          const status = clientDoc?.status || "a_fournir";
                          return (
                            <div
                              key={doc.id}
                              className="flex items-center gap-3 text-sm"
                            >
                              <span className="flex-1 text-slate-700">
                                {doc.label}
                              </span>
                              <select
                                value={status}
                                onChange={(e) =>
                                  handleDocumentStatusChange(
                                    doc.id,
                                    e.target.value as any,
                                  )
                                }
                                className="border rounded px-2 py-1 text-xs bg-white"
                                style={{ color: "black" }}
                              >
                                <option value="a_fournir">À fournir</option>
                                <option value="fourni">Fourni</option>
                                <option value="non_applicable">
                                  Non applicable
                                </option>
                              </select>
                            </div>
                          );
                        })}
                    </div>
                  </div>

                  <div className="mt-4">
                    <h4 className="font-medium text-sm text-slate-700 mb-2">
                      Échéances fiscales 2026
                    </h4>
                    <div className="max-h-60 overflow-y-auto border rounded">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left">Impôt</th>
                            <th className="px-3 py-2 text-left">Obligation</th>
                            <th className="px-3 py-2 text-left">Délai</th>
                            <th className="px-3 py-2 text-center">Assujetti</th>
                          </tr>
                        </thead>
                        <tbody>
                          {refs.taxes.map((taxe) => {
                            const clientTaxe = clientTaxes.find(
                              (ct) => ct.taxe_id === taxe.id,
                            );
                            const isChecked = clientTaxe?.assujetti || false;
                            return (
                              <tr
                                key={taxe.id}
                                className="border-t border-slate-100"
                              >
                                <td className="px-3 py-2 text-slate-800">
                                  {taxe.libelle}
                                </td>
                                <td className="px-3 py-2 text-slate-600">
                                  {taxe.obligation}
                                </td>
                                <td className="px-3 py-2 text-slate-600">
                                  {taxe.deadline}
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) =>
                                      handleTaxeChange(
                                        taxe.id,
                                        e.target.checked,
                                      )
                                    }
                                    className="form-checkbox h-4 w-4 text-blue-600"
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}

              {/* ====== TAB SOCIALES & TNS ====== */}
              {activeTab === "sociales" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Nombre de salariés
                      </label>
                      <input
                        type="number"
                        value={modal.client?.nb_salaries ?? 0}
                        onChange={(e) =>
                          updateField("nb_salaries", Number(e.target.value))
                        }
                        className="auth-input w-full px-3 py-2 text-sm"
                        min={0}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Jour de versement salaires
                      </label>
                      <input
                        value={modal.client?.jour_versement_salaires || ""}
                        onChange={(e) =>
                          updateField("jour_versement_salaires", e.target.value)
                        }
                        className="auth-input w-full px-3 py-2 text-sm"
                        placeholder="15"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Date de paye
                      </label>
                      <input
                        value={modal.client?.date_paye || ""}
                        onChange={(e) =>
                          updateField("date_paye", e.target.value)
                        }
                        className="auth-input w-full px-3 py-2 text-sm"
                        placeholder="JJ/MM/AAAA"
                      />
                    </div>
                    <div className="flex flex-col gap-3">
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Options sociales
                      </label>
                      <div className="grid grid-cols-1 gap-2">
                        <label className="flex items-center gap-2 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={!!modal.client?.option_versement_mensuel}
                            onChange={(e) =>
                              updateField(
                                "option_versement_mensuel",
                                e.target.checked,
                              )
                            }
                            className="form-checkbox h-4 w-4 text-blue-600"
                          />
                          Versement mensuel
                        </label>
                        <label className="flex items-center gap-2 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={
                              !!modal.client?.entreprise_travail_temporaire
                            }
                            onChange={(e) =>
                              updateField(
                                "entreprise_travail_temporaire",
                                e.target.checked,
                              )
                            }
                            className="form-checkbox h-4 w-4 text-blue-600"
                          />
                          Entreprise travail temporaire
                        </label>
                        <label className="flex items-center gap-2 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={!!modal.client?.rattachement_decalage_paie}
                            onChange={(e) =>
                              updateField(
                                "rattachement_decalage_paie",
                                e.target.checked,
                              )
                            }
                            className="form-checkbox h-4 w-4 text-blue-600"
                          />
                          Rattachement décalage paie
                        </label>
                        <label className="flex items-center gap-2 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={!!modal.client?.soumis_cotisations_tns}
                            onChange={(e) =>
                              updateField(
                                "soumis_cotisations_tns",
                                e.target.checked,
                              )
                            }
                            className="form-checkbox h-4 w-4 text-blue-600"
                          />
                          Soumis cotisations TNS
                        </label>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={!!modal.client?.vrp_mono_carte}
                        onChange={(e) =>
                          updateField("vrp_mono_carte", e.target.checked)
                        }
                        className="form-checkbox h-4 w-4 text-blue-600"
                      />
                      VRP mono carte
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={!!modal.client?.vrp_multi_carte}
                        onChange={(e) =>
                          updateField("vrp_multi_carte", e.target.checked)
                        }
                        className="form-checkbox h-4 w-4 text-blue-600"
                      />
                      VRP multi carte
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={!!modal.client?.prevoyance_cadres_obligatoire}
                        onChange={(e) =>
                          updateField(
                            "prevoyance_cadres_obligatoire",
                            e.target.checked,
                          )
                        }
                        className="form-checkbox h-4 w-4 text-blue-600"
                      />
                      Prévoyance cadres obligatoire
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={!!modal.client?.prevoyance_cadres_non_cadres}
                        onChange={(e) =>
                          updateField(
                            "prevoyance_cadres_non_cadres",
                            e.target.checked,
                          )
                        }
                        className="form-checkbox h-4 w-4 text-blue-600"
                      />
                      Prévoyance cadres/non-cadres
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={
                          !!modal.client?.retraite_complementaire_non_cadre
                        }
                        onChange={(e) =>
                          updateField(
                            "retraite_complementaire_non_cadre",
                            e.target.checked,
                          )
                        }
                        className="form-checkbox h-4 w-4 text-blue-600"
                      />
                      Retraite complémentaire non-cadre
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={!!modal.client?.retraite_complementaire_cadre}
                        onChange={(e) =>
                          updateField(
                            "retraite_complementaire_cadre",
                            e.target.checked,
                          )
                        }
                        className="form-checkbox h-4 w-4 text-blue-600"
                      />
                      Retraite complémentaire cadre
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={!!modal.client?.mutuelle}
                        onChange={(e) =>
                          updateField("mutuelle", e.target.checked)
                        }
                        className="form-checkbox h-4 w-4 text-blue-600"
                      />
                      Mutuelle
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={!!modal.client?.retraite_capitalisation}
                        onChange={(e) =>
                          updateField(
                            "retraite_capitalisation",
                            e.target.checked,
                          )
                        }
                        className="form-checkbox h-4 w-4 text-blue-600"
                      />
                      Retraite capitalisation
                    </label>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={!!modal.client?.versement_1_pourcent_cdd}
                      onChange={(e) =>
                        updateField(
                          "versement_1_pourcent_cdd",
                          e.target.checked,
                        )
                      }
                      className="form-checkbox h-4 w-4 text-blue-600"
                    />
                    Versement 1% CDD
                  </label>

                  <div className="mt-4">
                    <h4 className="font-medium text-sm text-slate-700 mb-2">
                      Documents sociaux
                    </h4>
                    <div className="space-y-2 max-h-60 overflow-y-auto border rounded p-2">
                      {refs.documents
                        .filter(
                          (doc) =>
                            doc.ref_categories_documents?.label === "Social",
                        )
                        .map((doc) => {
                          const clientDoc = clientDocuments.find(
                            (cd) => cd.document_id === doc.id,
                          );
                          const status = clientDoc?.status || "a_fournir";
                          return (
                            <div
                              key={doc.id}
                              className="flex items-center gap-3 text-sm"
                            >
                              <span className="flex-1 text-slate-700">
                                {doc.label}
                              </span>
                              <select
                                value={status}
                                onChange={(e) =>
                                  handleDocumentStatusChange(
                                    doc.id,
                                    e.target.value as any,
                                  )
                                }
                                className="border rounded px-2 py-1 text-xs bg-white"
                                style={{ color: "black" }}
                              >
                                <option value="a_fournir">À fournir</option>
                                <option value="fourni">Fourni</option>
                                <option value="non_applicable">
                                  Non applicable
                                </option>
                              </select>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </>
              )}

              {/* ====== TAB ÉTABLISSEMENTS ====== */}
              {activeTab === "etablissements" && (
                <EtablissementsSection
                  clientId={modal.client?.id || ""}
                  onEtablissementsChange={() => {
                    // Optionnel
                  }}
                />
              )}
            </div>

            {/* Footer du modal */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100">
              <button
                onClick={() => setModal({ open: false, client: null })}
                className="px-4 py-2 text-slate-600 hover:text-slate-800 text-sm"
              >
                Annuler
              </button>
              {/* ✅ WRAPPED SAVE BUTTON */}
              <ProtectedAction
                module="clients"
                action={modal.client?.id ? "edit" : "create"}
              >
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-[#2a4f7f] disabled:opacity-60"
                >
                  {saving ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Check size={16} />
                  )}
                  Enregistrer
                </button>
              </ProtectedAction>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
