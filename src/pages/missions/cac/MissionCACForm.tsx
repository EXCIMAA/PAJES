import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Save, Calculator } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { PageHeader } from "../../../components/ui/PageHeader";
import { Badge } from "../../../components/ui/Badge";
import { RetourButton } from "../../../components/ui/RetourButton";
import { formatCurrency } from "../../../lib/utils";
import { ProtectedAction } from "../../../components/auth/ProtectedAction"; // ✅ ADDED

export default function MissionCACForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [mission, setMission] = useState<any>({
    client_id: "",
    exercice: new Date().getFullYear().toString(),
    total_bilan: "",
    produits_exploitation: "",
    produits_financiers: "",
    coefficient_multiplicateur: 1.6,
    decote: 0,
    notes: "",
  });
  const [intervenants, setIntervenants] = useState<any[]>([]);
  const [resultats, setResultats] = useState<any>(null);

  useEffect(() => {
    loadClients();
    if (isEdit) loadMission();
  }, [id]);

  async function loadClients() {
    const { data } = await supabase
      .from("clients")
      .select("id, name")
      .order("name");
    if (data) setClients(data);
  }

  async function loadMission() {
    setLoading(true);
    setErrorMessage(null);
    try {
      const { data, error } = await supabase
        .from("missions_cac")
        .select("*, clients(name)")
        .eq("id", id)
        .single();
      if (error) throw error;
      setMission({
        ...data,
        total_bilan: data.total_bilan?.toString() || "",
        produits_exploitation: data.produits_exploitation?.toString() || "",
        produits_financiers: data.produits_financiers?.toString() || "",
      });
      const { data: interData } = await supabase
        .from("missions_cac_intervenants")
        .select("*")
        .eq("mission_id", id);
      if (interData) setIntervenants(interData);
      if (data.facture_nette) {
        setResultats({
          temps_retenu: data.temps_retenu,
          total_budget: data.total_budget,
          facture_brute: data.facture_brute,
          facture_nette: data.facture_nette,
          marge_estimee: data.marge_estimee,
        });
      }
    } catch (err: any) {
      console.error("Erreur chargement mission:", err);
      setErrorMessage(`Erreur de chargement: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  const handleFieldChange = (field: string, value: any) => {
    setMission((prev: any) => ({ ...prev, [field]: value }));
    if (errorMessage) setErrorMessage(null);
  };

  const validateMission = () => {
    if (!mission.client_id) {
      setErrorMessage("Veuillez sélectionner un client.");
      return false;
    }
    if (!mission.exercice || mission.exercice.trim() === "") {
      setErrorMessage("Veuillez saisir un exercice.");
      return false;
    }
    const bilan = parseFloat(mission.total_bilan);
    const produits = parseFloat(mission.produits_exploitation);
    const financiers = parseFloat(mission.produits_financiers);
    if (bilan < 0 || produits < 0 || financiers < 0) {
      setErrorMessage("Les montants ne peuvent pas être négatifs.");
      return false;
    }
    if (mission.coefficient_multiplicateur <= 0) {
      setErrorMessage("Le coefficient doit être supérieur à 0.");
      return false;
    }
    if (mission.decote < 0 || mission.decote > 100) {
      setErrorMessage("La décote doit être comprise entre 0 et 100 %.");
      return false;
    }
    return true;
  };

  const handleCalcul = async () => {
    if (!validateMission()) return;

    if (!isEdit) {
      try {
        const payload = buildPayload();
        const { data, error } = await supabase
          .from("missions_cac")
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        navigate(`/missions/cac/${data.id}/edit`);
        return;
      } catch (err: any) {
        console.error("Erreur création mission:", err);
        setErrorMessage(`Erreur lors de la création: ${err.message}`);
        return;
      }
    } else {
      try {
        const updates = buildPayload();
        const { error } = await supabase
          .from("missions_cac")
          .update(updates)
          .eq("id", id);
        if (error) throw error;

        const { data, error: calcError } = await supabase.rpc(
          "calculer_mission_cac",
          { mission_id: id },
        );
        if (calcError) throw calcError;
        setResultats(data);
        await loadMission();
      } catch (err: any) {
        console.error("Erreur calcul:", err);
        setErrorMessage(`Erreur lors du calcul: ${err.message}`);
      }
    }
  };

  const buildPayload = () => ({
    client_id: mission.client_id,
    exercice: mission.exercice,
    total_bilan: parseFloat(mission.total_bilan) || 0,
    produits_exploitation: parseFloat(mission.produits_exploitation) || 0,
    produits_financiers: parseFloat(mission.produits_financiers) || 0,
    coefficient_multiplicateur: mission.coefficient_multiplicateur,
    decote: mission.decote,
    notes: mission.notes || "",
  });

  const handleSave = async () => {
    if (!validateMission()) return;

    setSaving(true);
    setErrorMessage(null);
    try {
      const payload = buildPayload();
      if (isEdit) {
        const { error } = await supabase
          .from("missions_cac")
          .update(payload)
          .eq("id", id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("missions_cac")
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        navigate(`/missions/cac/${data.id}/edit`);
        return;
      }
      navigate("/missions/cac");
    } catch (err: any) {
      console.error("Erreur enregistrement:", err);
      const msg =
        err.message ||
        err.details ||
        err.hint ||
        "Erreur inconnue lors de l'enregistrement.";
      setErrorMessage(msg);
    } finally {
      setSaving(false);
    }
  };

  const assiette =
    (parseFloat(mission.total_bilan) || 0) +
    (parseFloat(mission.produits_exploitation) || 0) +
    (parseFloat(mission.produits_financiers) || 0);

  if (loading) return <div className="p-6 text-center">Chargement...</div>;

  return (
    <div className="page-container">
      <RetourButton />

      <PageHeader
        title={isEdit ? "Modifier la mission CAC" : "Nouvelle mission CAC"}
        description={
          isEdit
            ? "Modifiez les informations de la mission"
            : "Saisissez les données pour créer une mission"
        }
        actions={
          <div className="flex gap-2">
            {/* ✅ WRAPPED: Calculer (edit or create) */}
            <ProtectedAction
              module="missions"
              action={isEdit ? "edit" : "create"}
            >
              <button
                onClick={handleCalcul}
                className="btn-secondary btn-md flex items-center gap-2"
              >
                <Calculator className="w-4 h-4" /> Calculer
              </button>
            </ProtectedAction>
            {/* ✅ WRAPPED: Enregistrer (edit or create) */}
            <ProtectedAction
              module="missions"
              action={isEdit ? "edit" : "create"}
            >
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary btn-md flex items-center gap-2"
              >
                <Save className="w-4 h-4" />{" "}
                {saving ? "Sauvegarde..." : "Enregistrer"}
              </button>
            </ProtectedAction>
          </div>
        }
      />

      {errorMessage && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <strong>Erreur :</strong> {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">
              Informations générales
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Client *
                </label>
                <select
                  value={mission.client_id}
                  onChange={(e) =>
                    handleFieldChange("client_id", e.target.value)
                  }
                  className="auth-input w-full"
                >
                  <option value="">-- Sélectionner --</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Exercice *
                </label>
                <input
                  type="text"
                  value={mission.exercice}
                  onChange={(e) =>
                    handleFieldChange("exercice", e.target.value)
                  }
                  className="auth-input w-full"
                />
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">
              Données financières
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Total bilan
                </label>
                <input
                  type="number"
                  value={mission.total_bilan}
                  onChange={(e) =>
                    handleFieldChange("total_bilan", e.target.value)
                  }
                  className="auth-input w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Produits d'exploitation
                </label>
                <input
                  type="number"
                  value={mission.produits_exploitation}
                  onChange={(e) =>
                    handleFieldChange("produits_exploitation", e.target.value)
                  }
                  className="auth-input w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Produits financiers
                </label>
                <input
                  type="number"
                  value={mission.produits_financiers}
                  onChange={(e) =>
                    handleFieldChange("produits_financiers", e.target.value)
                  }
                  className="auth-input w-full"
                />
              </div>
              <div className="flex items-end">
                <div className="w-full p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="text-xs text-slate-500">
                    Assiette de calcul
                  </div>
                  <div className="font-semibold text-gray-900">
                    {formatCurrency(assiette)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">
              Paramètres de calcul
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Temps retenu (heures)
                </label>
                <input
                  type="number"
                  value={mission.temps_retenu || ""}
                  onChange={(e) =>
                    handleFieldChange(
                      "temps_retenu",
                      e.target.value ? parseInt(e.target.value) : null,
                    )
                  }
                  className="auth-input w-full"
                  placeholder="Auto"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Coefficient
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={mission.coefficient_multiplicateur}
                  onChange={(e) =>
                    handleFieldChange(
                      "coefficient_multiplicateur",
                      parseFloat(e.target.value) || 1.6,
                    )
                  }
                  className="auth-input w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Décote (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={mission.decote}
                  onChange={(e) =>
                    handleFieldChange("decote", parseFloat(e.target.value) || 0)
                  }
                  className="auth-input w-full"
                />
              </div>
            </div>
          </div>

          <div className="card p-6">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Notes
            </label>
            <textarea
              rows={3}
              value={mission.notes}
              onChange={(e) => handleFieldChange("notes", e.target.value)}
              className="auth-input w-full"
              placeholder="Observations, particularités..."
            />
          </div>
        </div>

        <div className="space-y-6">
          {resultats && (
            <div className="card p-6 bg-blue-50 border-blue-200">
              <h3 className="text-sm font-semibold text-blue-800 mb-3">
                Résultats du calcul
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-blue-700">Temps retenu</span>
                  <span className="font-medium">
                    {resultats.temps_retenu} h
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">Total budget</span>
                  <span className="font-medium">
                    {formatCurrency(resultats.total_budget)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">Facture brute</span>
                  <span className="font-medium">
                    {formatCurrency(resultats.facture_brute)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-blue-200 pt-2 font-semibold">
                  <span className="text-blue-800">Facture nette</span>
                  <span className="text-blue-900">
                    {formatCurrency(resultats.facture_nette)}
                  </span>
                </div>
                <div className="flex justify-between text-green-700">
                  <span>Marge estimée</span>
                  <span>
                    {formatCurrency(resultats.marge_estimee)} (
                    {resultats.taux_marge?.toFixed(1)}%)
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="card p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Répartition par grade
            </h3>
            {intervenants.length === 0 ? (
              <div className="text-sm text-slate-500">
                Appuyez sur "Calculer" pour générer la répartition.
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                {intervenants.map((int) => (
                  <div
                    key={int.id}
                    className="flex justify-between items-center border-b border-slate-100 pb-1"
                  >
                    <span className="font-medium">
                      {int.grade === "associe_signataire" &&
                        "Associé signataire"}
                      {int.grade === "chef_mission" && "Chef de mission"}
                      {int.grade === "collaborateur_senior" &&
                        "Collaborateur senior"}
                      {int.grade === "collaborateur_junior" &&
                        "Collaborateur junior"}
                    </span>
                    <span className="text-slate-600">
                      {int.heures_calculees?.toFixed(0)}h –{" "}
                      {formatCurrency(int.budget || 0)}
                    </span>
                  </div>
                ))}
                {resultats && (
                  <div className="flex justify-between font-semibold border-t border-slate-200 pt-2 mt-2">
                    <span>Total</span>
                    <span>{formatCurrency(resultats.total_budget)}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {isEdit && (
            <div className="card p-6 bg-slate-50">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Statut</span>
                <Badge
                  variant={mission.statut === "valide" ? "success" : "neutral"}
                >
                  {mission.statut === "brouillon" ? "Brouillon" : "Validé"}
                </Badge>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}