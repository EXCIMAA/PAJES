// src/pages/fixed-assets/FixedAssetsPage.tsx

import { useState } from "react";
import {
  Search,
  Plus,
  Eye,
  Trash2,
  CheckCircle,
  Heart,
  LayoutGrid,
  List,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSupabaseQuery } from "../../hooks/useSupabaseData";
import { PageHeader } from "../../components/ui/PageHeader";
import { Badge } from "../../components/ui/Badge";
import { cn, formatCurrency } from "../../lib/utils";
import { supabase } from "../../lib/supabase";
import { addNotification } from "../../lib/notifications";
import type { FixedAsset } from "../../types";
import { ProtectedAction } from "../../components/auth/ProtectedAction"; // ✅ ADDED

// Hooks pour l'amortissement
import {
  useDepreciationSchedule,
  useGenerateDepreciation,
} from "../../hooks/useDepreciation";

// Recharts
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// ==================== TYPES LOCAUX ====================

type AssetStatus = "Draft" | "Active" | "In_Maintenance" | "Disposed";
type AmortizationMethod = "lineaire" | "degressif";

interface ExtendedFixedAsset {
  id: string;
  asset_code: string;
  asset_name: string;
  category: string;
  nature?: string;
  purchase_value: number;
  currency: string;
  status: AssetStatus;
  created_at: string;
  acquisition_date?: string;
  net_book_value?: number;
  family?: string | null;
  location?: string | null;
  invoice_number?: string | null;
  service_date?: string;
  account_code?: string | null;
  acquisition_mode?: string;
  residual_value?: number;
  useful_life_years?: number;
  depreciation_rate?: number;
  amortization_method?: AmortizationMethod;
}

interface AssetMovement {
  id: string;
  asset_id: string;
  type: string;
  from_location: string | null;
  to_location: string | null;
  date: string;
  notes: string | null;
  validated_by: string | null;
}

interface AssetDisposal {
  id: string;
  asset_id: string;
  type: string;
  sale_price: number | null;
  net_book_value: number;
  disposal_date: string;
  capital_gain_loss: number | null;
  status: string;
}

// ==================== COMPOSANT ====================

export function FixedAssetsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | AssetStatus>("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<ExtendedFixedAsset | null>(
    null,
  );
  const [editMode, setEditMode] = useState(false);
  const [detailTab, setDetailTab] = useState<
    "info" | "depreciation" | "movements" | "disposal"
  >("info");

  const { t } = useTranslation();

  const statusLabels: Record<string, string> = {
    Draft: t("status.draft"),
    Active: t("status.active"),
    In_Maintenance: t("status.maintenance"),
    Disposed: t("status.disposed"),
  };

  const categoryOptions = [
    { value: "", label: t("fixedAssets.select.categoryPlaceholder") },
    { value: "corporelle", label: t("fixedAssets.categoryTypes.corporelle") },
    {
      value: "incorporelle",
      label: t("fixedAssets.categoryTypes.incorporelle"),
    },
    { value: "financiere", label: t("fixedAssets.categoryTypes.financiere") },
  ];

  const natureOptions = [
    { value: "", label: t("fixedAssets.select.naturePlaceholder") },
    { value: "building", label: t("fixedAssets.natureTypes.building") },
    { value: "equipment", label: t("fixedAssets.natureTypes.equipment") },
    { value: "vehicle", label: t("fixedAssets.natureTypes.vehicle") },
    { value: "furniture", label: t("fixedAssets.natureTypes.furniture") },
    { value: "it", label: t("fixedAssets.natureTypes.it") },
    { value: "other", label: t("fixedAssets.natureTypes.other") },
  ];

  const acquisitionModeOptions = [
    { value: "Achat", label: t("fixedAssets.acquisitionMethods.purchase") },
    {
      value: "Production",
      label: t("fixedAssets.acquisitionMethods.production"),
    },
    { value: "Credit-bail", label: t("fixedAssets.acquisitionMethods.lease") },
    { value: "Donation", label: t("fixedAssets.acquisitionMethods.donation") },
  ];

  const amortizationMethodOptions = [
    { value: "lineaire", label: t("fixedAssets.amortizationMethods.linear") },
    {
      value: "degressif",
      label: t("fixedAssets.amortizationMethods.degressive"),
    },
  ];

  const categoryLabels: Record<string, string> = {
    corporelle: t("fixedAssets.categoryTypes.corporelle"),
    incorporelle: t("fixedAssets.categoryTypes.incorporelle"),
    financiere: t("fixedAssets.categoryTypes.financiere"),
  };

  const natureLabels: Record<string, string> = {
    building: t("fixedAssets.natureTypes.building"),
    equipment: t("fixedAssets.natureTypes.equipment"),
    vehicle: t("fixedAssets.natureTypes.vehicle"),
    furniture: t("fixedAssets.natureTypes.furniture"),
    it: t("fixedAssets.natureTypes.it"),
    other: t("fixedAssets.natureTypes.other"),
  };

  const acquisitionModeLabels: Record<string, string> = {
    Achat: t("fixedAssets.acquisitionMethods.purchase"),
    Production: t("fixedAssets.acquisitionMethods.production"),
    "Credit-bail": t("fixedAssets.acquisitionMethods.lease"),
    Donation: t("fixedAssets.acquisitionMethods.donation"),
  };

  const statusFilterOptions = [
    { value: "all", label: t("common.all") },
    { value: "Draft", label: t("status.draft") },
    { value: "Active", label: t("status.active") },
    { value: "In_Maintenance", label: t("status.maintenance") },
    { value: "Disposed", label: t("status.disposed") },
  ];

  const [viewMode, setViewMode] = useState<"list" | "dashboard">("list");
  const [likedAssets, setLikedAssets] = useState<Set<string>>(new Set());
  const [movements] = useState<AssetMovement[]>([]);
  const [disposal] = useState<AssetDisposal | null>(null);

  const [formData, setFormData] = useState<Partial<ExtendedFixedAsset>>({
    asset_name: "",
    category: "",
    nature: "",
    family: "",
    location: "",
    invoice_number: "",
    acquisition_date: "",
    service_date: "",
    purchase_value: 0,
    currency: "XAF",
    account_code: "",
    acquisition_mode: "Achat",
    residual_value: 0,
    useful_life_years: 10,
    depreciation_rate: undefined,
    amortization_method: "lineaire",
    status: "Draft",
  });

  const {
    data: assetsRaw = [],
    loading,
    refetch,
  } = useSupabaseQuery<FixedAsset>({
    table: "fixed_assets",
    orderBy: "created_at",
    orderAsc: false,
  });

  const assets: ExtendedFixedAsset[] = assetsRaw.map((asset) => {
    const status = (asset.status || "Draft") as AssetStatus;
    const currency = asset.currency ? String(asset.currency) : "XAF";
    return {
      id: asset.id || "",
      asset_code: asset.asset_code || "",
      asset_name: asset.asset_name || "",
      category: asset.category || "",
      nature: (asset as any).nature || undefined,
      purchase_value: asset.purchase_value || 0,
      currency,
      status,
      created_at: asset.created_at || new Date().toISOString(),
      acquisition_date: asset.acquisition_date || "",
      net_book_value: asset.net_book_value || 0,
      family: (asset as any).family || null,
      location: (asset as any).location || null,
      invoice_number: (asset as any).invoice_number || null,
      service_date: (asset as any).service_date || asset.acquisition_date || "",
      account_code: (asset as any).account_code || null,
      acquisition_mode: (asset as any).acquisition_mode || "Achat",
      residual_value: (asset as any).residual_value || 0,
      useful_life_years: (asset as any).useful_life_years || 10,
      depreciation_rate: (asset as any).depreciation_rate || undefined,
      amortization_method: (asset as any).amortization_method || "lineaire",
    };
  });

  const totalPurchase = assets.reduce((s, a) => s + (a.purchase_value || 0), 0);
  const totalDep = assets.reduce((s, a) => {
    const years = a.useful_life_years || 10;
    const annual = (a.purchase_value || 0) / years;
    const age =
      new Date().getFullYear() -
      new Date(a.acquisition_date || "").getFullYear();
    return s + Math.min(annual * age, a.purchase_value || 0);
  }, 0);
  const totalNBV = totalPurchase - totalDep;

  const categoryData = assets.reduce(
    (acc, a) => {
      const cat = a.category || t("common.unknown");
      acc[cat] = (acc[cat] || 0) + (a.purchase_value || 0);
      return acc;
    },
    {} as Record<string, number>,
  );
  const categoryChartData = Object.entries(categoryData).map(
    ([name, value]) => ({
      name: categoryLabels[name] ?? name,
      value,
    }),
  );

  const statusData = assets.reduce(
    (acc, a) => {
      const st = a.status || "Draft";
      acc[st] = (acc[st] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );
  const statusChartData = Object.entries(statusData).map(([name, value]) => ({
    name: statusLabels[name] ?? name,
    value,
  }));

  const valueByCategory = assets.reduce(
    (acc, a) => {
      const cat = a.category || t("common.unknown");
      acc[cat] = (acc[cat] || 0) + (a.purchase_value || 0);
      return acc;
    },
    {} as Record<string, number>,
  );
  const valueChartData = Object.entries(valueByCategory).map(
    ([name, value]) => ({
      name: categoryLabels[name] ?? name,
      value,
    }),
  );

  const COLORS = [
    "#3b82f6",
    "#8b5cf6",
    "#ec4899",
    "#f59e0b",
    "#10b981",
    "#ef4444",
  ];

  const filtered = assets.filter((a) => {
    const matchSearch =
      (a.asset_name?.toLowerCase() || "").includes(search.toLowerCase()) ||
      (a.asset_code?.toLowerCase() || "").includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || a.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const { data: depreciationSchedule = [] } = useDepreciationSchedule(
    selectedAsset?.id || "",
  );
  const generateMutation = useGenerateDepreciation();

  const handleCreate = async () => {
    try {
      const count = assets.length + 1;
      const code = `IMM-${new Date().getFullYear()}-${String(count).padStart(4, "0")}`;

      const payload = {
        asset_code: code,
        asset_name: formData.asset_name || "",
        category: formData.category || "",
        nature: formData.nature || null,
        family: formData.family || null,
        location: formData.location || null,
        invoice_number: formData.invoice_number || null,
        acquisition_date: formData.acquisition_date || null,
        service_date: formData.service_date || null,
        purchase_value: formData.purchase_value || 0,
        currency: formData.currency || "XAF",
        account_code: formData.account_code || null,
        acquisition_mode: formData.acquisition_mode || "Achat",
        residual_value: formData.residual_value || 0,
        useful_life_years: formData.useful_life_years || 10,
        depreciation_rate: formData.depreciation_rate || null,
        amortization_method: formData.amortization_method || "lineaire",
        status: "Draft" as AssetStatus,
      };

      const { error } = await supabase.from("fixed_assets").insert([payload]);
      if (error) {
        alert("Erreur : " + error.message);
        console.error("Insert error:", error);
      } else {
        void addNotification({
          title: t("fixedAssets.notifications.createdTitle"),
          message: t("fixedAssets.notifications.createdMessage", {
            name: payload.asset_name,
          }),
          type: "asset",
        });
        refetch();
        setShowCreateModal(false);
        setFormData({
          asset_name: "",
          category: "",
          nature: "",
          family: "",
          location: "",
          invoice_number: "",
          acquisition_date: "",
          service_date: "",
          purchase_value: 0,
          currency: "XAF",
          account_code: "",
          acquisition_mode: "Achat",
          residual_value: 0,
          useful_life_years: 10,
          depreciation_rate: undefined,
          amortization_method: "lineaire",
          status: "Draft",
        });
      }
    } catch (err: any) {
      alert("Erreur inattendue : " + err.message);
      console.error(err);
    }
  };

  const handleUpdate = async () => {
    if (!selectedAsset) return;
    try {
      const payload = {
        asset_name: formData.asset_name || selectedAsset.asset_name,
        category: formData.category || selectedAsset.category,
        nature: formData.nature || null,
        family: formData.family || null,
        location: formData.location || null,
        invoice_number: formData.invoice_number || null,
        acquisition_date:
          formData.acquisition_date || selectedAsset.acquisition_date,
        service_date: formData.service_date || null,
        purchase_value: formData.purchase_value || selectedAsset.purchase_value,
        currency: formData.currency || "XAF",
        account_code: formData.account_code || null,
        acquisition_mode: formData.acquisition_mode || "Achat",
        residual_value: formData.residual_value || 0,
        useful_life_years: formData.useful_life_years || 10,
        depreciation_rate: formData.depreciation_rate || null,
        amortization_method: formData.amortization_method || "lineaire",
      };

      const { error } = await supabase
        .from("fixed_assets")
        .update(payload)
        .eq("id", selectedAsset.id);
      if (error) {
        alert("Erreur : " + error.message);
        console.error("Update error:", error);
      } else {
        void addNotification({
          title: t("fixedAssets.notifications.updatedTitle"),
          message: t("fixedAssets.notifications.updatedMessage", {
            name: payload.asset_name,
          }),
          type: "asset",
        });
        refetch();
        setShowDetailModal(false);
        setSelectedAsset(null);
        setEditMode(false);
      }
    } catch (err: any) {
      alert("Erreur inattendue : " + err.message);
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("fixedAssets.confirmDelete"))) return;
    const { error } = await supabase.from("fixed_assets").delete().eq("id", id);
    if (error) {
      alert("Erreur : " + error.message);
      console.error("Delete error:", error);
    } else {
      void addNotification({
        title: t("fixedAssets.notifications.deletedTitle"),
        message: t("fixedAssets.notifications.deletedMessage"),
        type: "asset",
      });
      refetch();
    }
  };

  const handleValidate = async (id: string) => {
    const { error } = await supabase
      .from("fixed_assets")
      .update({ status: "Active" as AssetStatus })
      .eq("id", id);
    if (error) {
      alert("Erreur : " + error.message);
      console.error("Validate error:", error);
    } else {
      try {
        await generateMutation.mutateAsync(id);
      } catch (err) {
        console.error("Erreur génération du plan d'amortissement :", err);
      }

      void addNotification({
        title: t("fixedAssets.notifications.validatedTitle"),
        message: t("fixedAssets.notifications.validatedMessage"),
        type: "asset",
      });
      refetch();
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    const { error } = await supabase
      .from("fixed_assets")
      .update({ status: newStatus as AssetStatus })
      .eq("id", id);
    if (error) {
      alert("Erreur : " + error.message);
      console.error("Status update error:", error);
    } else {
      if (newStatus === "Active") {
        try {
          await generateMutation.mutateAsync(id);
        } catch (err) {
          console.error("Erreur génération du plan d'amortissement :", err);
        }
      }
      void addNotification({
        title: t("fixedAssets.notifications.statusChangedTitle"),
        message: t("fixedAssets.notifications.statusChangedMessage", {
          status: statusLabels[newStatus] ?? newStatus,
        }),
        type: "asset",
      });
      refetch();
    }
  };

  const toggleLike = (id: string) => {
    setLikedAssets((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const openDetail = async (asset: ExtendedFixedAsset) => {
    setSelectedAsset(asset);
    setFormData(asset);
    setShowDetailModal(true);
    setDetailTab("info");
  };

  if (loading) {
    return <div className="page-container">{t("common.loading")}</div>;
  }

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-4">
        <PageHeader
          title={t("fixedAssets.title")}
          description={t("fixedAssets.manage")}
        />
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode("list")}
            className={cn(
              "p-2 rounded-lg transition-colors",
              viewMode === "list"
                ? "bg-primary-600/15 text-primary-300 ring-1 ring-primary-500/25"
                : "text-slate-400 hover:bg-slate-700/40",
            )}
            title={t("common.list")}
          >
            <List className="w-5 h-5" />
          </button>
          <button
            onClick={() => setViewMode("dashboard")}
            className={cn(
              "p-2 rounded-lg transition-colors",
              viewMode === "dashboard"
                ? "bg-primary-600/15 text-primary-300 ring-1 ring-primary-500/25"
                : "text-slate-400 hover:bg-slate-700/40",
            )}
            title={t("navigation.dashboard")}
          >
            <LayoutGrid className="w-5 h-5" />
          </button>
          {/* ✅ WRAPPED: Create button */}
          <ProtectedAction module="immobilisations" action="create">
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> {t("common.create")}
            </button>
          </ProtectedAction>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          {
            label: t("fixedAssets.summary.purchaseValue"),
            value: formatCurrency(totalPurchase),
            color: "text-primary-400",
          },
          {
            label: t("fixedAssets.summary.cumulativeDepreciation"),
            value: formatCurrency(totalDep),
            color: "text-warning-500",
          },
          {
            label: t("fixedAssets.summary.netBookValue"),
            value: formatCurrency(totalNBV),
            color: "text-emerald-400",
          },
        ].map((s) => (
          <div key={s.label} className="card p-4">
            <p className="text-xs text-slate-400">{s.label}</p>
            <p className={`text-lg font-semibold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {viewMode === "list" && (
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("fixedAssets.searchPlaceholder")}
              className="input-md pl-10"
            />
          </div>
          <div className="flex gap-2">
            {statusFilterOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setStatusFilter(option.value as any)}
                className={cn(
                  "px-3 py-2 rounded-lg text-sm transition-colors",
                  statusFilter === option.value
                    ? "bg-primary-600/15 text-primary-300 ring-1 ring-primary-500/25"
                    : "text-slate-400 hover:bg-slate-700/40",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {viewMode === "list" && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/50">
                  {[
                    t("fixedAssets.table.code"),
                    t("fixedAssets.table.asset"),
                    t("fixedAssets.table.nature"),
                    t("fixedAssets.table.category"),
                    t("fixedAssets.table.value"),
                    t("fixedAssets.table.depreciation"),
                    t("fixedAssets.table.netBookValue"),
                    t("fixedAssets.table.status"),
                    t("common.actions"),
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30">
                {filtered.map((asset) => {
                  const dep = (asset.purchase_value || 0) * 0.2;
                  const vnc = (asset.purchase_value || 0) - dep;
                  const isLiked = likedAssets.has(asset.id);
                  return (
                    <tr
                      key={asset.id}
                      className="hover:bg-slate-700/30 transition-colors"
                    >
                      <td className="px-4 py-3 font-mono text-xs text-slate-400">
                        {asset.asset_code}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-100">
                        {asset.asset_name}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {asset.nature || "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {asset.category}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-slate-200">
                        {formatCurrency(asset.purchase_value || 0)}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-warning-400">
                        {formatCurrency(dep)}
                      </td>
                      <td className="px-4 py-3 tabular-nums font-medium text-emerald-400">
                        {formatCurrency(vnc)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              asset.status === "Active"
                                ? "success"
                                : asset.status === "Disposed"
                                  ? "error"
                                  : asset.status === "Draft"
                                    ? "warning"
                                    : "warning"
                            }
                          >
                            {statusLabels[asset.status] ?? asset.status}
                          </Badge>
                          {/* ✅ WRAPPED: Status change select (edit) */}
                          <ProtectedAction
                            module="immobilisations"
                            action="edit"
                          >
                            <select
                              value={asset.status || "Draft"}
                              onChange={(e) =>
                                handleStatusChange(asset.id, e.target.value)
                              }
                              className="text-xs bg-slate-700 border border-slate-600 rounded px-1 py-0.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary-500"
                            >
                              <option value="Draft">{t("status.draft")}</option>
                              <option value="Active">
                                {t("status.active")}
                              </option>
                              <option value="In_Maintenance">
                                {t("status.maintenance")}
                              </option>
                              <option value="Disposed">
                                {t("status.disposed")}
                              </option>
                            </select>
                          </ProtectedAction>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleLike(asset.id)}
                            className={cn(
                              "transition-colors",
                              isLiked
                                ? "text-red-400"
                                : "text-slate-400 hover:text-slate-200",
                            )}
                            title={
                              isLiked
                                ? t("fixedAssets.actions.unlike")
                                : t("fixedAssets.actions.like")
                            }
                          >
                            <Heart
                              className="w-4 h-4"
                              fill={isLiked ? "currentColor" : "none"}
                            />
                          </button>
                          {/* ✅ WRAPPED: View */}
                          <ProtectedAction
                            module="immobilisations"
                            action="view"
                          >
                            <button
                              onClick={() => openDetail(asset)}
                              className="text-slate-400 hover:text-slate-200"
                              title={t("common.view")}
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </ProtectedAction>
                          {asset.status === "Draft" && (
                            <>
                              {/* ✅ WRAPPED: Validate (edit) */}
                              <ProtectedAction
                                module="immobilisations"
                                action="edit"
                              >
                                <button
                                  onClick={() => handleValidate(asset.id)}
                                  className="text-emerald-400 hover:text-emerald-300"
                                  title={t("fixedAssets.actions.validate")}
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </button>
                              </ProtectedAction>
                              {/* ✅ WRAPPED: Delete */}
                              <ProtectedAction
                                module="immobilisations"
                                action="delete"
                              >
                                <button
                                  onClick={() => handleDelete(asset.id)}
                                  className="text-red-400 hover:text-red-300"
                                  title={t("common.delete")}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </ProtectedAction>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {viewMode === "dashboard" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-slate-300 mb-4">
              {t("fixedAssets.dashboard.byCategory")}
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={categoryChartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  label={({ name, percent }) =>
                    `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                  }
                >
                  {categoryChartData.map((_entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => formatCurrency(value as number)}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="card p-4">
            <h3 className="text-sm font-semibold text-slate-300 mb-4">
              {t("fixedAssets.dashboard.valueByCategory")}
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={valueChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis
                  stroke="#94a3b8"
                  tickFormatter={(v) => formatCurrency(v)}
                />
                <Tooltip
                  formatter={(value) => formatCurrency(value as number)}
                />
                <Bar dataKey="value" fill="#3b82f6">
                  {valueChartData.map((_entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card p-4">
            <h3 className="text-sm font-semibold text-slate-300 mb-4">
              {t("fixedAssets.dashboard.byStatus")}
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={statusChartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  label={({ name, percent }) =>
                    `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                  }
                >
                  {statusChartData.map((_entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="card p-4 flex flex-col justify-center">
            <h3 className="text-sm font-semibold text-slate-300 mb-2">
              {t("fixedAssets.dashboard.keyMetrics")}
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">
                  {t("fixedAssets.dashboard.totalAssets")}
                </span>
                <span className="font-semibold text-slate-100">
                  {assets.length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">
                  {t("fixedAssets.dashboard.activeAssets")}
                </span>
                <span className="font-semibold text-emerald-400">
                  {assets.filter((a) => a.status === "Active").length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">
                  {t("fixedAssets.dashboard.draftAssets")}
                </span>
                <span className="font-semibold text-warning-400">
                  {assets.filter((a) => a.status === "Draft").length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">
                  {t("fixedAssets.dashboard.disposedAssets")}
                </span>
                <span className="font-semibold text-red-400">
                  {assets.filter((a) => a.status === "Disposed").length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">
                  {t("fixedAssets.dashboard.maintenanceAssets")}
                </span>
                <span className="font-semibold text-slate-300">
                  {assets.filter((a) => a.status === "In_Maintenance").length}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowCreateModal(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">
              {t("fixedAssets.createModal.title")}
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleCreate();
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">
                    {t("fixedAssets.modal.labels.designation")} *
                  </label>
                  <input
                    type="text"
                    value={formData.asset_name || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, asset_name: e.target.value })
                    }
                    className="input-md w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">
                    {t("fixedAssets.modal.labels.category")} *
                  </label>
                  <select
                    value={formData.category || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                    className="input-md w-full"
                    required
                  >
                    {categoryOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">
                    {t("fixedAssets.modal.labels.nature")}
                  </label>
                  <select
                    value={formData.nature || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, nature: e.target.value })
                    }
                    className="input-md w-full"
                  >
                    {natureOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">
                    {t("fixedAssets.modal.labels.family")}
                  </label>
                  <input
                    type="text"
                    value={formData.family || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, family: e.target.value })
                    }
                    className="input-md w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">
                    {t("fixedAssets.modal.labels.location")}
                  </label>
                  <input
                    type="text"
                    value={formData.location || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, location: e.target.value })
                    }
                    className="input-md w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">
                    {t("fixedAssets.modal.labels.invoiceNumber")}
                  </label>
                  <input
                    type="text"
                    value={formData.invoice_number || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        invoice_number: e.target.value,
                      })
                    }
                    className="input-md w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">
                    {t("fixedAssets.modal.labels.acquisitionDate")} *
                  </label>
                  <input
                    type="date"
                    value={formData.acquisition_date || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        acquisition_date: e.target.value,
                      })
                    }
                    className="input-md w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">
                    {t("fixedAssets.modal.labels.serviceDate")} *
                  </label>
                  <input
                    type="date"
                    value={formData.service_date || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, service_date: e.target.value })
                    }
                    className="input-md w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">
                    {t("fixedAssets.modal.labels.originalValue")} *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.purchase_value || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        purchase_value: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="input-md w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">
                    {t("fixedAssets.modal.labels.currency")}
                  </label>
                  <select
                    value={formData.currency || "XAF"}
                    onChange={(e) =>
                      setFormData({ ...formData, currency: e.target.value })
                    }
                    className="input-md w-full"
                  >
                    <option value="XAF">XAF</option>
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">
                    {t("fixedAssets.modal.labels.accountCode")}
                  </label>
                  <input
                    type="text"
                    value={formData.account_code || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, account_code: e.target.value })
                    }
                    className="input-md w-full"
                    placeholder={t(
                      "fixedAssets.modal.placeholders.accountCode",
                    )}
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">
                    {t("fixedAssets.modal.labels.acquisitionMode")}
                  </label>
                  <select
                    value={formData.acquisition_mode || "Achat"}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        acquisition_mode: e.target.value,
                      })
                    }
                    className="input-md w-full"
                  >
                    {acquisitionModeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">
                    {t("fixedAssets.modal.labels.residualValue")}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.residual_value || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        residual_value: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="input-md w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">
                    {t("fixedAssets.modal.labels.usefulLifeYears")}
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={formData.useful_life_years || 10}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        useful_life_years: parseInt(e.target.value) || 10,
                      })
                    }
                    className="input-md w-full"
                    placeholder={t(
                      "fixedAssets.modal.placeholders.usefulLifeYears",
                    )}
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">
                    {t("fixedAssets.modal.labels.depreciationRate")}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.depreciation_rate ?? ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        depreciation_rate:
                          e.target.value !== ""
                            ? parseFloat(e.target.value)
                            : undefined,
                      })
                    }
                    className="input-md w-full"
                    placeholder={t(
                      "fixedAssets.modal.placeholders.depreciationRate",
                    )}
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    {t("fixedAssets.modal.hints.autoCalculate")}
                  </p>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">
                    {t("fixedAssets.modal.labels.amortizationMethod")}
                  </label>
                  <select
                    value={formData.amortization_method || "lineaire"}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        amortization_method: e.target
                          .value as AmortizationMethod,
                      })
                    }
                    className="input-md w-full"
                  >
                    {amortizationMethodOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-secondary"
                >
                  {t("common.cancel")}
                </button>
                {/* ✅ WRAPPED: Create submit */}
                <ProtectedAction module="immobilisations" action="create">
                  <button type="submit" className="btn-primary">
                    {t("common.create")}
                  </button>
                </ProtectedAction>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDetailModal && selectedAsset && (
        <div
          className="modal-overlay"
          onClick={() => setShowDetailModal(false)}
        >
          <div
            className="modal-content max-w-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold">
                  {selectedAsset.asset_name}
                </h2>
                <p className="text-sm text-slate-400">
                  {selectedAsset.asset_code}
                </p>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="flex gap-2 border-b border-slate-700 mb-4">
              {(["info", "depreciation", "movements", "disposal"] as const).map(
                (tab) => (
                  <button
                    key={tab}
                    onClick={() => setDetailTab(tab)}
                    className={cn(
                      "px-4 py-2 text-sm font-medium transition-colors",
                      detailTab === tab
                        ? "text-primary-400 border-b-2 border-primary-400"
                        : "text-slate-400 hover:text-slate-200",
                    )}
                  >
                    {tab === "info"
                      ? t("fixedAssets.detailTabs.info")
                      : tab === "depreciation"
                        ? t("fixedAssets.detailTabs.depreciation")
                        : tab === "movements"
                          ? t("fixedAssets.detailTabs.movements")
                          : t("fixedAssets.detailTabs.disposal")}
                  </button>
                ),
              )}
            </div>

            {detailTab === "info" && (
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-slate-400">
                    {t("fixedAssets.detailLabels.category")}
                  </span>{" "}
                  {categoryLabels[selectedAsset.category] ??
                    selectedAsset.category}
                </div>
                <div>
                  <span className="text-slate-400">
                    {t("fixedAssets.detailLabels.nature")}
                  </span>{" "}
                  {natureLabels[selectedAsset.nature || ""] || "—"}
                </div>
                <div>
                  <span className="text-slate-400">
                    {t("fixedAssets.detailLabels.family")}
                  </span>{" "}
                  {selectedAsset.family || "—"}
                </div>
                <div>
                  <span className="text-slate-400">
                    {t("fixedAssets.detailLabels.location")}
                  </span>{" "}
                  {selectedAsset.location || "—"}
                </div>
                <div>
                  <span className="text-slate-400">
                    {t("fixedAssets.detailLabels.invoiceNumber")}
                  </span>{" "}
                  {selectedAsset.invoice_number || "—"}
                </div>
                <div>
                  <span className="text-slate-400">
                    {t("fixedAssets.detailLabels.acquisitionDate")}
                  </span>{" "}
                  {selectedAsset.acquisition_date}
                </div>
                <div>
                  <span className="text-slate-400">
                    {t("fixedAssets.detailLabels.serviceDate")}
                  </span>{" "}
                  {selectedAsset.service_date || "—"}
                </div>
                <div>
                  <span className="text-slate-400">
                    {t("fixedAssets.detailLabels.originalValue")}
                  </span>{" "}
                  {formatCurrency(selectedAsset.purchase_value || 0)}
                </div>
                <div>
                  <span className="text-slate-400">
                    {t("fixedAssets.detailLabels.residualValue")}
                  </span>{" "}
                  {formatCurrency(selectedAsset.residual_value || 0)}
                </div>
                <div>
                  <span className="text-slate-400">
                    {t("fixedAssets.detailLabels.currency")}
                  </span>{" "}
                  {selectedAsset.currency || "XAF"}
                </div>
                <div>
                  <span className="text-slate-400">
                    {t("fixedAssets.detailLabels.accountCode")}
                  </span>{" "}
                  {selectedAsset.account_code || "—"}
                </div>
                <div>
                  <span className="text-slate-400">
                    {t("fixedAssets.detailLabels.acquisitionMode")}
                  </span>{" "}
                  {acquisitionModeLabels[
                    selectedAsset.acquisition_mode || ""
                  ] || "—"}
                </div>
                <div>
                  <span className="text-slate-400">
                    {t("fixedAssets.detailLabels.usefulLifeYears")}
                  </span>{" "}
                  {selectedAsset.useful_life_years || "-"}{" "}
                  {t("fixedAssets.detailLabels.years")}
                </div>
                <div>
                  <span className="text-slate-400">
                    {t("fixedAssets.detailLabels.depreciationRate")}
                  </span>{" "}
                  {selectedAsset.depreciation_rate
                    ? `${selectedAsset.depreciation_rate}%`
                    : "—"}
                </div>
                <div>
                  <span className="text-slate-400">
                    {t("fixedAssets.detailLabels.amortizationMethod")}
                  </span>{" "}
                  {selectedAsset.amortization_method === "lineaire"
                    ? t("fixedAssets.amortizationMethods.linear")
                    : selectedAsset.amortization_method === "degressif"
                      ? t("fixedAssets.amortizationMethods.degressive")
                      : "-"}
                </div>
                <div>
                  <span className="text-slate-400">{t("common.status")}</span>{" "}
                  {statusLabels[selectedAsset.status] ?? selectedAsset.status}
                </div>
                <div className="col-span-2 flex gap-2 mt-2">
                  {selectedAsset.status === "Draft" && (
                    // ✅ WRAPPED: Validate (edit)
                    <ProtectedAction module="immobilisations" action="edit">
                      <button
                        onClick={() => handleValidate(selectedAsset.id)}
                        className="btn-primary text-sm"
                      >
                        {t("fixedAssets.actions.validate")}
                      </button>
                    </ProtectedAction>
                  )}
                  {/* ✅ WRAPPED: Enter edit mode (edit) */}
                  <ProtectedAction module="immobilisations" action="edit">
                    <button
                      onClick={() => setEditMode(true)}
                      className="btn-secondary text-sm"
                    >
                      {t("common.edit")}
                    </button>
                  </ProtectedAction>
                </div>
                {editMode && (
                  <div className="col-span-2 border-t border-slate-700 pt-4">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleUpdate();
                      }}
                      className="space-y-3"
                    >
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm text-slate-400">
                            {t("fixedAssets.modal.labels.designation")}
                          </label>
                          <input
                            type="text"
                            value={formData.asset_name || ""}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                asset_name: e.target.value,
                              })
                            }
                            className="input-md w-full"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-slate-400">
                            {t("fixedAssets.modal.labels.category")}
                          </label>
                          <select
                            value={formData.category || ""}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                category: e.target.value,
                              })
                            }
                            className="input-md w-full"
                          >
                            {categoryOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm text-slate-400">
                            {t("fixedAssets.modal.labels.nature")}
                          </label>
                          <select
                            value={formData.nature || ""}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                nature: e.target.value,
                              })
                            }
                            className="input-md w-full"
                          >
                            {natureOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm text-slate-400">
                            {t("fixedAssets.detailLabels.family")}
                          </label>
                          <input
                            type="text"
                            value={formData.family || ""}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                family: e.target.value,
                              })
                            }
                            className="input-md w-full"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-slate-400">
                            {t("fixedAssets.detailLabels.location")}
                          </label>
                          <input
                            type="text"
                            value={formData.location || ""}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                location: e.target.value,
                              })
                            }
                            className="input-md w-full"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-slate-400">
                            {t("fixedAssets.modal.labels.usefulLifeYears")}
                          </label>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={formData.useful_life_years || 10}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                useful_life_years:
                                  parseInt(e.target.value) || 10,
                              })
                            }
                            className="input-md w-full"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-slate-400">
                            {t("fixedAssets.modal.labels.depreciationRate")}
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={formData.depreciation_rate ?? ""}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                depreciation_rate:
                                  e.target.value !== ""
                                    ? parseFloat(e.target.value)
                                    : undefined,
                              })
                            }
                            className="input-md w-full"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-slate-400">
                            {t("fixedAssets.modal.labels.amortizationMethod")}
                          </label>
                          <select
                            value={formData.amortization_method || "lineaire"}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                amortization_method: e.target
                                  .value as AmortizationMethod,
                              })
                            }
                            className="input-md w-full"
                          >
                            {amortizationMethodOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditMode(false)}
                          className="btn-secondary"
                        >
                          {t("common.cancel")}
                        </button>
                        {/* ✅ WRAPPED: Update (edit) */}
                        <ProtectedAction module="immobilisations" action="edit">
                          <button type="submit" className="btn-primary">
                            {t("common.update")}
                          </button>
                        </ProtectedAction>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            )}

            {detailTab === "depreciation" && (
              <div>
                {depreciationSchedule.length === 0 ? (
                  <p className="text-slate-400">
                    {t("fixedAssets.emptyStates.noDepreciation")}
                  </p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="px-2 py-1 text-left text-slate-400">
                          {t("fixedAssets.tables.depreciation.period")}
                        </th>
                        <th className="px-2 py-1 text-right text-slate-400">
                          {t("fixedAssets.tables.depreciation.amount")}
                        </th>
                        <th className="px-2 py-1 text-right text-slate-400">
                          {t("fixedAssets.tables.depreciation.cumulative")}
                        </th>
                        <th className="px-2 py-1 text-right text-slate-400">
                          {t("fixedAssets.tables.depreciation.nbv")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {depreciationSchedule.map((d) => (
                        <tr key={d.id} className="border-b border-slate-700/50">
                          <td className="px-2 py-1">{d.period}</td>
                          <td className="px-2 py-1 text-right">
                            {formatCurrency(d.amount)}
                          </td>
                          <td className="px-2 py-1 text-right">
                            {formatCurrency(d.cumulative_depreciation)}
                          </td>
                          <td className="px-2 py-1 text-right">
                            {formatCurrency(d.net_book_value)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {detailTab === "movements" && (
              <div>
                {movements.length === 0 ? (
                  <p className="text-slate-400">
                    {t("fixedAssets.emptyStates.noMovements")}
                  </p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="px-2 py-1 text-left text-slate-400">
                          {t("fixedAssets.tables.movements.date")}
                        </th>
                        <th className="px-2 py-1 text-left text-slate-400">
                          {t("fixedAssets.tables.movements.type")}
                        </th>
                        <th className="px-2 py-1 text-left text-slate-400">
                          {t("fixedAssets.tables.movements.from")}
                        </th>
                        <th className="px-2 py-1 text-left text-slate-400">
                          {t("fixedAssets.tables.movements.to")}
                        </th>
                        <th className="px-2 py-1 text-left text-slate-400">
                          {t("fixedAssets.tables.movements.notes")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {movements.map((m) => (
                        <tr key={m.id} className="border-b border-slate-700/50">
                          <td className="px-2 py-1">{m.date}</td>
                          <td className="px-2 py-1">{m.type}</td>
                          <td className="px-2 py-1">
                            {m.from_location || "—"}
                          </td>
                          <td className="px-2 py-1">{m.to_location || "—"}</td>
                          <td className="px-2 py-1">{m.notes || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {detailTab === "disposal" && (
              <div>
                {disposal ? (
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-slate-400">
                        {t("fixedAssets.detailLabels.type")}
                      </span>{" "}
                      {disposal.type}
                    </div>
                    <div>
                      <span className="text-slate-400">
                        {t("fixedAssets.detailLabels.disposalDate")}
                      </span>{" "}
                      {disposal.disposal_date}
                    </div>
                    <div>
                      <span className="text-slate-400">
                        {t("fixedAssets.detailLabels.salePrice")}
                      </span>{" "}
                      {disposal.sale_price
                        ? formatCurrency(disposal.sale_price)
                        : "—"}
                    </div>
                    <div>
                      <span className="text-slate-400">
                        {t("fixedAssets.detailLabels.netBookValueAtDisposal")}
                      </span>{" "}
                      {formatCurrency(disposal.net_book_value)}
                    </div>
                    <div>
                      <span className="text-slate-400">
                        {t("fixedAssets.detailLabels.capitalGainLoss")}
                      </span>{" "}
                      {disposal.capital_gain_loss
                        ? formatCurrency(disposal.capital_gain_loss)
                        : "—"}
                    </div>
                    <div>
                      <span className="text-slate-400">
                        {t("common.status")}
                      </span>{" "}
                      {statusLabels[disposal.status] ?? disposal.status}
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-400">
                    {t("fixedAssets.emptyStates.noDisposal")}
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-end mt-4">
              <button
                onClick={() => setShowDetailModal(false)}
                className="btn-secondary"
              >
                {t("common.close")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
