// src/pages/missions/cac/CalculHonaraires.tsx (Top part only)
import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabase";
import { Calculator } from "lucide-react";
import { RetourButton } from "../../../components/ui/RetourButton";

interface Props {
  missionId?: string;
  clientId?: string; // Kept in interface for external compatibility
  onCalculComplete?: (resultats: any) => void;
}

export function CalculHonoraires({
  missionId,
  clientId: _clientId, // Renamed here to suppress warning
  onCalculComplete,
}: Props) {
  // ... rest of your component remains exactly the same
  const [donnees, setDonnees] = useState({
    total_bilan: "",
    produits_exploitation: "",
    produits_financiers: "",
    temps_retenu: "",
    coefficient: 1.6,
    decote: 0,
  });
  const [resultats, setResultats] = useState<any>(null);
  const [grille, setGrille] = useState<any[]>([]);

  useEffect(() => {
    loadReferences();
    if (missionId) loadMission();
  }, [missionId]);

  async function loadReferences() {
    const { data: grilleData } = await supabase
      .from("grille_honoraires")
      .select("*")
      .order("tranche_min");
    if (grilleData) setGrille(grilleData);
  }

  async function loadMission() {
    if (!missionId) return;
    const { data } = await supabase
      .from("missions_cac")
      .select("*")
      .eq("id", missionId)
      .single();
    if (data) {
      setDonnees({
        total_bilan: data.total_bilan?.toString() || "",
        produits_exploitation: data.produits_exploitation?.toString() || "",
        produits_financiers: data.produits_financiers?.toString() || "",
        temps_retenu: data.temps_retenu?.toString() || "",
        coefficient: data.coefficient_multiplicateur || 1.6,
        decote: data.decote || 0,
      });
    }
  }

  const getHeuresParTranche = (assiette: number) => {
    const tranche = grille.find(
      (g) =>
        assiette >= g.tranche_min &&
        (g.tranche_max === null || assiette <= g.tranche_max),
    );
    return tranche?.heures_min || 0;
  };

  const calculer = () => {
    const bilan = parseFloat(donnees.total_bilan) || 0;
    const produits = parseFloat(donnees.produits_exploitation) || 0;
    const financiers = parseFloat(donnees.produits_financiers) || 0;
    const assiette = bilan + produits + financiers;

    const heuresMin = getHeuresParTranche(assiette);
    const temps = parseFloat(donnees.temps_retenu) || heuresMin;

    const intervenants = [
      { grade: "associe_signataire", pourcentage: 10, taux: 45000 },
      { grade: "chef_mission", pourcentage: 40, taux: 35000 },
      { grade: "collaborateur_senior", pourcentage: 30, taux: 20000 },
      { grade: "collaborateur_junior", pourcentage: 20, taux: 15000 },
    ];

    let totalBudget = 0;
    const details = intervenants.map((int) => {
      const heures = (int.pourcentage / 100) * temps;
      const budget = heures * int.taux;
      totalBudget += budget;
      return {
        grade: int.grade,
        pourcentage: int.pourcentage,
        taux: int.taux,
        heures,
        budget,
      };
    });

    const coeff = parseFloat(donnees.coefficient.toString()) || 1.6;
    const decote = parseFloat(donnees.decote.toString()) || 0;
    const factureBrute = totalBudget * coeff;
    const factureNette = factureBrute * (1 - decote / 100);

    const result = {
      assiette,
      heuresMin,
      tempsRetenu: temps,
      details,
      totalBudget,
      factureBrute,
      factureNette,
      marge: factureNette - totalBudget,
      tauxMarge:
        totalBudget > 0
          ? ((factureNette - totalBudget) / totalBudget) * 100
          : 0,
    };

    setResultats(result);
    if (onCalculComplete) onCalculComplete(result);
  };

  const handleFieldChange = (field: string, value: any) => {
    setDonnees((prev) => ({ ...prev, [field]: value }));
  };

  const assiette =
    (parseFloat(donnees.total_bilan) || 0) +
    (parseFloat(donnees.produits_exploitation) || 0) +
    (parseFloat(donnees.produits_financiers) || 0);

  return (
    <div className="space-y-6">
      <RetourButton />

      <div className="card p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">
          Données financières
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Total bilan
            </label>
            <input
              type="number"
              value={donnees.total_bilan}
              onChange={(e) => handleFieldChange("total_bilan", e.target.value)}
              className="auth-input w-full"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Produits d'exploitation
            </label>
            <input
              type="number"
              value={donnees.produits_exploitation}
              onChange={(e) =>
                handleFieldChange("produits_exploitation", e.target.value)
              }
              className="auth-input w-full"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Produits financiers
            </label>
            <input
              type="number"
              value={donnees.produits_financiers}
              onChange={(e) =>
                handleFieldChange("produits_financiers", e.target.value)
              }
              className="auth-input w-full"
              placeholder="0"
            />
          </div>
          <div className="flex items-end">
            <div className="w-full p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="text-xs text-slate-500">Assiette de calcul</div>
              <div className="font-semibold text-gray-900">
                {new Intl.NumberFormat("fr-FR", {
                  style: "currency",
                  currency: "XAF",
                }).format(assiette)}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Paramètres</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Temps retenu (heures)
            </label>
            <input
              type="number"
              value={donnees.temps_retenu}
              onChange={(e) =>
                handleFieldChange("temps_retenu", e.target.value)
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
              value={donnees.coefficient}
              onChange={(e) =>
                handleFieldChange(
                  "coefficient",
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
              value={donnees.decote}
              onChange={(e) =>
                handleFieldChange("decote", parseFloat(e.target.value) || 0)
              }
              className="auth-input w-full"
            />
          </div>
        </div>
      </div>

      <button
        onClick={calculer}
        className="btn-primary btn-md flex items-center gap-2"
      >
        <Calculator className="w-4 h-4" /> Calculer
      </button>

      {resultats && (
        <div className="card p-6 bg-blue-50 border-blue-200">
          <h3 className="text-sm font-semibold text-blue-800 mb-3">
            Résultats du calcul
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-xs text-blue-600">Temps retenu</div>
              <div className="font-semibold text-blue-900">
                {resultats.tempsRetenu} h
              </div>
            </div>
            <div>
              <div className="text-xs text-blue-600">Total budget</div>
              <div className="font-semibold text-blue-900">
                {new Intl.NumberFormat("fr-FR", {
                  style: "currency",
                  currency: "XAF",
                }).format(resultats.totalBudget)}
              </div>
            </div>
            <div>
              <div className="text-xs text-blue-600">Facture brute</div>
              <div className="font-semibold text-blue-900">
                {new Intl.NumberFormat("fr-FR", {
                  style: "currency",
                  currency: "XAF",
                }).format(resultats.factureBrute)}
              </div>
            </div>
            <div className="col-span-2">
              <div className="text-xs text-blue-600">Facture nette</div>
              <div className="font-semibold text-blue-900 text-lg">
                {new Intl.NumberFormat("fr-FR", {
                  style: "currency",
                  currency: "XAF",
                }).format(resultats.factureNette)}
              </div>
            </div>
            <div>
              <div className="text-xs text-green-600">Marge estimée</div>
              <div className="font-semibold text-green-700">
                {new Intl.NumberFormat("fr-FR", {
                  style: "currency",
                  currency: "XAF",
                }).format(resultats.marge)}{" "}
                ({resultats.tauxMarge.toFixed(1)}%)
              </div>
            </div>
          </div>

          <div className="mt-4 border-t border-blue-200 pt-4">
            <h4 className="text-xs font-medium text-blue-700 mb-2">
              Détail par grade
            </h4>
            <div className="space-y-1 text-sm">
              {resultats.details.map((d: any, idx: number) => (
                <div key={idx} className="flex justify-between text-blue-700">
                  <span>
                    {d.grade === "associe_signataire" && "Associé signataire"}
                    {d.grade === "chef_mission" && "Chef de mission"}
                    {d.grade === "collaborateur_senior" &&
                      "Collaborateur senior"}
                    {d.grade === "collaborateur_junior" &&
                      "Collaborateur junior"}
                    {" ("}
                    {d.pourcentage}%)
                  </span>
                  <span>
                    {d.heures.toFixed(0)}h –{" "}
                    {new Intl.NumberFormat("fr-FR", {
                      style: "currency",
                      currency: "XAF",
                    }).format(d.budget)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
