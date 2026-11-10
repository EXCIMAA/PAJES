import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { PackagePlus, PackageMinus, Search, X, Edit } from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { Badge } from "../../components/ui/Badge";
import { EmptyState } from "../../components/ui/EmptyState";
import { formatCurrency } from "../../lib/utils";
import { fetchStockItems } from "../../lib/db-queries";
import { addNotification } from "../../lib/notifications";
import { supabase } from "../../lib/supabase";
import type { StockItem } from "../../types";
import { ProtectedAction } from "../../components/auth/ProtectedAction"; // ✅ ADDED

export function StockPage() {
  const { t } = useTranslation();
  const [items, setItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showStockIn, setShowStockIn] = useState(false);
  const [showStockOut, setShowStockOut] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<StockItem | null>(null);

  const [stockInForm, setStockInForm] = useState({
    item_name: "",
    quantity: 1,
    unit_cost: 0,
    note: "",
  });
  const [stockOutForm, setStockOutForm] = useState({
    item_name: "",
    quantity: 1,
    note: "",
  });
  const [editForm, setEditForm] = useState({
    item_name: "",
    category: "",
    unit_cost: 0,
  });
  const [submitting, setSubmitting] = useState(false);

  const loadItems = async () => {
    setLoading(true);
    const result = await fetchStockItems();
    if (result.error) {
      setError(result.error);
    } else {
      setItems(result.data);
      setError(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadItems();
  }, []);

  const filtered = items.filter(
    (i) =>
      i.item_name.toLowerCase().includes(search.toLowerCase()) ||
      i.category.toLowerCase().includes(search.toLowerCase()),
  );

  const totalValue = items.reduce((s, i) => s + i.remaining_value, 0);
  const lowStock = items.filter((i) => i.status === "low_stock").length;
  const outOfStock = items.filter((i) => i.status === "out_of_stock").length;

  const findItemByName = (name: string) =>
    items.find((i) => i.item_name.toLowerCase() === name.toLowerCase());

  const getOrCreateItem = async (
    name: string,
    unit_cost?: number,
  ): Promise<StockItem | null> => {
    let item = findItemByName(name);
    if (item) return item;

    const confirmCreate = confirm(
      `L'article "${name}" n'existe pas. Voulez-vous le créer ?`,
    );
    if (!confirmCreate) return null;

    const newItem = {
      item_name: name,
      category: "Autre",
      unit_cost: unit_cost || 0,
      quantity_purchased: 0,
      quantity_released: 0,
    };

    const { data, error } = await supabase
      .from("stock_items")
      .insert([newItem])
      .select()
      .single();

    if (error) {
      alert(t("stock.creatingError", { message: error.message }));
      return null;
    }

    await loadItems();
    void addNotification({
      title: "Article créé",
      message: `L'article "${name}" a été créé.`,
      type: "stock",
    });
    return data as StockItem;
  };

  const handleStockIn = async () => {
    if (stockInForm.quantity <= 0) {
      alert(t("errors.generic"));
      return;
    }

    setSubmitting(true);
    try {
      const unitCost =
        stockInForm.unit_cost > 0 ? stockInForm.unit_cost : undefined;
      const item = await getOrCreateItem(stockInForm.item_name, unitCost);
      if (!item) {
        setSubmitting(false);
        return;
      }

      const updates: any = {
        quantity_purchased: item.quantity_purchased + stockInForm.quantity,
      };
      if (unitCost && unitCost > 0) {
        updates.unit_cost = unitCost;
      }

      const { error: updateError } = await supabase
        .from("stock_items")
        .update(updates)
        .eq("id", item.id);

      if (updateError) throw updateError;

      const { error: movementError } = await supabase
        .from("stock_movements")
        .insert([
          {
            item_id: item.id,
            type: "in",
            quantity: stockInForm.quantity,
            note: stockInForm.note || null,
            created_at: new Date().toISOString(),
          },
        ]);

      if (movementError) throw movementError;

      await loadItems();
      void addNotification({
        title: "Entrée de stock enregistrée",
        message: `L'article "${item.item_name}" a été réceptionné (${stockInForm.quantity}).`,
        type: "stock",
      });
      setShowStockIn(false);
      setStockInForm({ item_name: "", quantity: 1, unit_cost: 0, note: "" });
    } catch (err: any) {
      alert(t("errors.savingError"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleStockOut = async () => {
    if (stockOutForm.quantity <= 0) {
      alert(t("errors.generic"));
      return;
    }

    setSubmitting(true);
    try {
      const item = await getOrCreateItem(stockOutForm.item_name);
      if (!item) {
        setSubmitting(false);
        return;
      }

      if (stockOutForm.quantity > item.remaining_quantity) {
        alert(t("stock.deletingError"));
        setSubmitting(false);
        return;
      }

      const { error: updateError } = await supabase
        .from("stock_items")
        .update({
          quantity_released: item.quantity_released + stockOutForm.quantity,
        })
        .eq("id", item.id);

      if (updateError) throw updateError;

      const { error: movementError } = await supabase
        .from("stock_movements")
        .insert([
          {
            item_id: item.id,
            type: "out",
            quantity: stockOutForm.quantity,
            note: stockOutForm.note || null,
            created_at: new Date().toISOString(),
          },
        ]);

      if (movementError) throw movementError;

      await loadItems();
      void addNotification({
        title: "Sortie de stock enregistrée",
        message: `L'article "${item.item_name}" a été sorti (${stockOutForm.quantity}).`,
        type: "stock",
      });
      setShowStockOut(false);
      setStockOutForm({ item_name: "", quantity: 1, note: "" });
    } catch (err: any) {
      alert(t("errors.savingError"));
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (item: StockItem) => {
    setEditingItem(item);
    setEditForm({
      item_name: item.item_name,
      category: item.category,
      unit_cost: item.unit_cost,
    });
    setShowEditModal(true);
  };

  const handleEditSave = async () => {
    if (!editingItem) return;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("stock_items")
        .update({
          item_name: editForm.item_name,
          category: editForm.category,
          unit_cost: editForm.unit_cost,
        })
        .eq("id", editingItem.id);

      if (error) throw error;

      await loadItems();
      void addNotification({
        title: "Article de stock mis à jour",
        message: `L'article "${editForm.item_name}" a été mis à jour.`,
        type: "stock",
      });
      setShowEditModal(false);
      setEditingItem(null);
    } catch (err: any) {
      alert(t("errors.savingError"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleBlurItemIn = () => {
    const match = items.find(
      (i) => i.item_name.toLowerCase() === stockInForm.item_name.toLowerCase(),
    );
    if (match) {
      setStockInForm((p) => ({ ...p, item_name: match.item_name }));
    }
  };

  const handleBlurItemOut = () => {
    const match = items.find(
      (i) => i.item_name.toLowerCase() === stockOutForm.item_name.toLowerCase(),
    );
    if (match) {
      setStockOutForm((p) => ({ ...p, item_name: match.item_name }));
    }
  };

  const tableHeaders = [
    "Article",
    "Catégorie",
    "Reçu",
    "Sorties",
    "Restant",
    "Valeur",
    "Statut",
    "Actions",
  ];

  return (
    <div className="page-container">
      <PageHeader
        title="Gestion des stocks"
        description="Suivez l'inventaire et les mouvements de stock"
        actions={
          <div className="flex gap-2">
            <ProtectedAction module="stock" action="create">
              <button
                onClick={() => setShowStockIn(true)}
                className="btn-primary btn-md"
              >
                <PackagePlus className="w-4 h-4" />
                Entrée
              </button>
            </ProtectedAction>
            <ProtectedAction module="stock" action="edit">
              <button
                onClick={() => setShowStockOut(true)}
                className="btn-secondary btn-md"
              >
                <PackageMinus className="w-4 h-4" />
                Sortie
              </button>
            </ProtectedAction>
          </div>
        }
      />

      {error && (
        <div className="mb-4 px-3 py-2 rounded-lg bg-error-500/10 text-error-500 text-sm border border-error-500/25">
          Erreur de chargement : {error}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Articles", value: items.length },
          { label: "Valeur totale", value: formatCurrency(totalValue) },
          { label: "Stock faible", value: lowStock },
          { label: "Rupture", value: outOfStock },
        ].map((s) => (
          <div key={s.label} className="card p-4">
            <p className="text-xs text-slate-400">{s.label}</p>
            <p className="text-lg font-semibold mt-1 text-slate-100">
              {s.value}
            </p>
          </div>
        ))}
      </div>

      <div className="relative max-w-sm mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un article..."
          className="input-md pl-10"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Aucun article en stock"
          description="Les articles d'inventaire apparaîtront ici."
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/50">
                  {tableHeaders.map((h) => (
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
                {filtered.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-700/30 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-slate-100">
                      {item.item_name}
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {item.category}
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {item.quantity_purchased}
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {item.quantity_released}
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {item.remaining_quantity}
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {formatCurrency(item.remaining_value)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          item.status === "in_stock"
                            ? "success"
                            : item.status === "low_stock"
                              ? "warning"
                              : "error"
                        }
                      >
                        {item.status === "in_stock"
                          ? "En stock"
                          : item.status === "low_stock"
                            ? "Stock faible"
                            : "Rupture"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <ProtectedAction module="stock" action="edit">
                        <button
                          onClick={() => openEditModal(item)}
                          className="p-1.5 rounded hover:bg-slate-700/50 text-slate-400 hover:text-slate-200"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </ProtectedAction>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showStockIn && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setShowStockIn(false)}
        >
          <div
            className="card p-6 w-full max-w-md animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-slate-50">
                Entrée de stock
              </h2>
              <button
                onClick={() => setShowStockIn(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">
                  Article
                </label>
                <input
                  list="items-list-in"
                  value={stockInForm.item_name}
                  onChange={(e) =>
                    setStockInForm((p) => ({ ...p, item_name: e.target.value }))
                  }
                  onBlur={handleBlurItemIn}
                  className="input-md w-full"
                  placeholder="Tapez le nom de l'article..."
                />
                <datalist id="items-list-in">
                  {items.map((item) => (
                    <option key={item.id} value={item.item_name} />
                  ))}
                </datalist>
                <p className="text-xs text-slate-400 mt-1">
                  Si l'article n'existe pas, il sera créé automatiquement.
                </p>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">
                  Quantité
                </label>
                <input
                  type="number"
                  min="1"
                  value={stockInForm.quantity}
                  onChange={(e) =>
                    setStockInForm((p) => ({
                      ...p,
                      quantity: parseInt(e.target.value) || 0,
                    }))
                  }
                  className="input-md w-full"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">
                  Coût unitaire (optionnel)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={stockInForm.unit_cost}
                  onChange={(e) =>
                    setStockInForm((p) => ({
                      ...p,
                      unit_cost: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="input-md w-full"
                  placeholder="Laisser vide pour conserver l'ancien prix"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">
                  Note (optionnelle)
                </label>
                <input
                  type="text"
                  value={stockInForm.note}
                  onChange={(e) =>
                    setStockInForm((p) => ({ ...p, note: e.target.value }))
                  }
                  className="input-md w-full"
                  placeholder="Ex: Réapprovisionnement"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <ProtectedAction module="stock" action="create">
                  <button
                    onClick={handleStockIn}
                    className="btn-primary btn-md flex-1"
                    disabled={submitting}
                  >
                    {submitting ? "Traitement..." : "Valider l'entrée"}
                  </button>
                </ProtectedAction>
                <button
                  onClick={() => setShowStockIn(false)}
                  className="btn-secondary btn-md"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showStockOut && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setShowStockOut(false)}
        >
          <div
            className="card p-6 w-full max-w-md animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-slate-50">
                Sortie de stock
              </h2>
              <button
                onClick={() => setShowStockOut(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">
                  Article
                </label>
                <input
                  list="items-list-out"
                  value={stockOutForm.item_name}
                  onChange={(e) =>
                    setStockOutForm((p) => ({
                      ...p,
                      item_name: e.target.value,
                    }))
                  }
                  onBlur={handleBlurItemOut}
                  className="input-md w-full"
                  placeholder="Tapez le nom de l'article..."
                />
                <datalist id="items-list-out">
                  {items.map((item) => (
                    <option key={item.id} value={item.item_name} />
                  ))}
                </datalist>
                {stockOutForm.item_name && (
                  <p className="text-xs text-slate-400 mt-1">
                    Stock disponible :{" "}
                    <span className="font-semibold text-slate-200">
                      {items.find(
                        (i) =>
                          i.item_name.toLowerCase() ===
                          stockOutForm.item_name.toLowerCase(),
                      )?.remaining_quantity ?? 0}
                    </span>
                  </p>
                )}
                <p className="text-xs text-slate-400 mt-1">
                  Si l'article n'existe pas, il sera créé avec stock 0 (sortie
                  impossible).
                </p>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">
                  Quantité à sortir
                </label>
                <input
                  type="number"
                  min="1"
                  value={stockOutForm.quantity}
                  onChange={(e) =>
                    setStockOutForm((p) => ({
                      ...p,
                      quantity: parseInt(e.target.value) || 0,
                    }))
                  }
                  className="input-md w-full"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">
                  Note (optionnelle)
                </label>
                <input
                  type="text"
                  value={stockOutForm.note}
                  onChange={(e) =>
                    setStockOutForm((p) => ({ ...p, note: e.target.value }))
                  }
                  className="input-md w-full"
                  placeholder="Ex: Utilisation interne"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <ProtectedAction module="stock" action="edit">
                  <button
                    onClick={handleStockOut}
                    className="btn-primary btn-md flex-1"
                    disabled={submitting}
                  >
                    {submitting ? "Traitement..." : "Valider la sortie"}
                  </button>
                </ProtectedAction>
                <button
                  onClick={() => setShowStockOut(false)}
                  className="btn-secondary btn-md"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showEditModal && editingItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setShowEditModal(false)}
        >
          <div
            className="card p-6 w-full max-w-md animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-slate-50">
                Modifier l'article
              </h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">
                  Nom de l'article
                </label>
                <input
                  type="text"
                  value={editForm.item_name}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, item_name: e.target.value }))
                  }
                  className="input-md w-full"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">
                  Catégorie
                </label>
                <input
                  type="text"
                  value={editForm.category}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, category: e.target.value }))
                  }
                  className="input-md w-full"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">
                  Coût unitaire
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editForm.unit_cost}
                  onChange={(e) =>
                    setEditForm((p) => ({
                      ...p,
                      unit_cost: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="input-md w-full"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <ProtectedAction module="stock" action="edit">
                  <button
                    onClick={handleEditSave}
                    className="btn-primary btn-md flex-1"
                    disabled={submitting}
                  >
                    {submitting ? "Enregistrement..." : "Enregistrer"}
                  </button>
                </ProtectedAction>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="btn-secondary btn-md"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}