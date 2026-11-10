// src/pages/clients/components/EtablissementsSection.tsx

import React, { useState, useEffect } from "react";
import { Plus, Trash2, Edit2, X } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import {
  ETABLISSEMENT_TYPES,
  ETABLISSEMENT_TYPE_LABELS,
} from "../../../lib/constants";
import type { Etablissement, EtablissementFormData } from "../../../types";
import { ProtectedAction } from "../../../components/auth/ProtectedAction"; // ✅ ADDED

interface Props {
  clientId: string;
  onEtablissementsChange?: (count: number) => void;
}

export function EtablissementsSection({
  clientId,
  onEtablissementsChange,
}: Props) {
  const [etablissements, setEtablissements] = useState<Etablissement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<EtablissementFormData>({
    name: "",
    type: "siege",
    address: "",
    city: "",
    region: "",
    country: "Cameroun",
    phone: "",
    email: "",
    responsable: "",
    date_ouverture: "",
    is_active: true,
  });
  const [saving, setSaving] = useState(false);

  const loadEtablissements = async () => {
    if (!clientId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("etablissements")
        .select("*")
        .eq("client_id", clientId)
        .order("code", { ascending: true });

      if (error) throw error;
      setEtablissements(data || []);
      onEtablissementsChange?.(data?.length || 0);
    } catch (err) {
      console.error("Erreur chargement établissements:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEtablissements();
  }, [clientId]);

  const generateCode = () => {
    const prefix = "ETS";
    const count = etablissements.length + 1;
    return `${prefix}${String(count).padStart(3, "0")}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert("Le nom de l'établissement est requis");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        client_id: clientId,
        code: editingId ? undefined : generateCode(),
        name: formData.name.trim(),
        type: formData.type,
        address: formData.address || null,
        city: formData.city || null,
        region: formData.region || null,
        country: formData.country || "Cameroun",
        phone: formData.phone || null,
        email: formData.email || null,
        responsable: formData.responsable || null,
        date_ouverture: formData.date_ouverture || null,
        is_active: formData.is_active,
      };

      if (editingId) {
        const { error } = await supabase
          .from("etablissements")
          .update(payload)
          .eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("etablissements")
          .insert([payload]);
        if (error) throw error;
      }

      await loadEtablissements();
      resetForm();
    } catch (err) {
      console.error("Erreur sauvegarde:", err);
      alert("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Supprimer l'établissement "${name}" ?`)) return;
    try {
      const { error } = await supabase
        .from("etablissements")
        .delete()
        .eq("id", id);
      if (error) throw error;
      await loadEtablissements();
    } catch (err) {
      console.error("Erreur suppression:", err);
      alert("Erreur lors de la suppression");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      type: "siege",
      address: "",
      city: "",
      region: "",
      country: "Cameroun",
      phone: "",
      email: "",
      responsable: "",
      date_ouverture: "",
      is_active: true,
    });
    setEditingId(null);
    setShowForm(false);
  };

  const openEdit = (etab: Etablissement) => {
    setFormData({
      name: etab.name,
      type: etab.type,
      address: etab.address || "",
      city: etab.city || "",
      region: etab.region || "",
      country: etab.country || "Cameroun",
      phone: etab.phone || "",
      email: etab.email || "",
      responsable: etab.responsable || "",
      date_ouverture: etab.date_ouverture || "",
      is_active: etab.is_active,
    });
    setEditingId(etab.id);
    setShowForm(true);
  };

  const getTypeLabel = (type: string) => {
    return (
      ETABLISSEMENT_TYPE_LABELS[
        type as keyof typeof ETABLISSEMENT_TYPE_LABELS
      ] || type
    );
  };

  if (!clientId) {
    return (
      <div className="text-center py-6 bg-slate-50 rounded-lg border border-slate-200 border-dashed">
        <p className="text-sm text-slate-500">
          Enregistrez d'abord le client pour gérer ses établissements.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-sm text-slate-400">
        Chargement des établissements...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-slate-800">
            Établissements
          </h4>
          <p className="text-xs text-slate-500">
            {etablissements.length} établissement
            {etablissements.length > 1 ? "s" : ""}
          </p>
        </div>
        {/* ✅ WRAPPED: Ajouter */}
        <ProtectedAction module="clients" action="create">
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Plus size={14} />
            Ajouter
          </button>
        </ProtectedAction>
      </div>

      {etablissements.length === 0 ? (
        <div className="text-center py-4 bg-slate-50 rounded-lg border border-slate-200 border-dashed">
          <p className="text-sm text-slate-500">
            Aucun établissement enregistré
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Cliquez sur "Ajouter" pour créer le premier
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {etablissements.map((etab) => (
            <div
              key={etab.id}
              className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-slate-500">
                    {etab.code}
                  </span>
                  <span className="font-medium text-slate-800 truncate">
                    {etab.name}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                    {getTypeLabel(etab.type)}
                  </span>
                  {!etab.is_active && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                      Inactif
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {[etab.city, etab.region, etab.country]
                    .filter(Boolean)
                    .join(" • ") || "Adresse non renseignée"}
                </div>
              </div>
              <div className="flex items-center gap-1 ml-2">
                {/* ✅ WRAPPED: Modifier */}
                <ProtectedAction module="clients" action="edit">
                  <button
                    onClick={() => openEdit(etab)}
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Edit2 size={14} />
                  </button>
                </ProtectedAction>
                {/* ✅ WRAPPED: Supprimer */}
                <ProtectedAction module="clients" action="delete">
                  <button
                    onClick={() => handleDelete(etab.id, etab.name)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </ProtectedAction>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL */}
      {showForm && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={resetForm}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="font-semibold text-gray-900">
                {editingId ? "Modifier" : "Ajouter"} un établissement
              </h3>
              <button
                onClick={resetForm}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Nom de l'établissement *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Siège social, Agence Douala..."
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Type d'établissement
                </label>
                <select
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value as any })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {ETABLISSEMENT_TYPES.map((type) => (
                    <option
                      key={type.value}
                      value={type.value}
                      className="text-gray-900"
                    >
                      {type.icon} {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Adresse
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="123 Avenue Manga, Douala"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Ville
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) =>
                      setFormData({ ...formData, city: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Douala"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Région
                  </label>
                  <input
                    type="text"
                    value={formData.region}
                    onChange={(e) =>
                      setFormData({ ...formData, region: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Littoral"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Pays
                  </label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) =>
                      setFormData({ ...formData, country: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Cameroun"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="+237 6XX XXX XXX"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="contact@exemple.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Responsable
                  </label>
                  <input
                    type="text"
                    value={formData.responsable}
                    onChange={(e) =>
                      setFormData({ ...formData, responsable: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nom du responsable"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Date d'ouverture
                  </label>
                  <input
                    type="date"
                    value={formData.date_ouverture}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        date_ouverture: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) =>
                      setFormData({ ...formData, is_active: e.target.checked })
                    }
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  Actif
                </label>
              </div>

              <div className="flex gap-3 pt-2 border-t border-gray-200">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  Annuler
                </button>
                {/* ✅ WRAPPED: Enregistrer */}
                <ProtectedAction
                  module="clients"
                  action={editingId ? "edit" : "create"}
                >
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-60"
                  >
                    {saving ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Sauvegarde...
                      </span>
                    ) : (
                      "Enregistrer"
                    )}
                  </button>
                </ProtectedAction>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
