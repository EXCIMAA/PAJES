import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Edit2, FileText, Printer } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { PageHeader } from "../../../components/ui/PageHeader";
import { Badge } from "../../../components/ui/Badge";
import { RetourButton } from "../../../components/ui/RetourButton";
import { formatCurrency } from "../../../lib/utils";
import { ProtectedAction } from "../../../components/auth/ProtectedAction"; // ✅ ADDED

export default function MissionCACDetail() {
  const { id } = useParams();
  const [mission, setMission] = useState<any>(null);
  const [intervenants, setIntervenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) loadMission();
  }, [id]);

  async function loadMission() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("missions_cac")
        .select("*, clients(name)")
        .eq("id", id)
        .single();
      if (error) throw error;
      setMission(data);

      const { data: interData } = await supabase
        .from("missions_cac_intervenants")
        .select("*")
        .eq("mission_id", id);
      if (interData) setIntervenants(interData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function getStatutLabel(statut: string) {
    const labels: Record<string, string> = {
      brouillon: "Brouillon",
      valide: "Validé",
      facture_emise: "Facture émise",
      facture_payee: "Payée",
    };
    return labels[statut] || statut;
  }

  if (loading) return <div className="p-6 text-center">Chargement...</div>;
  if (!mission)
    return (
      <div className="p-6 text-center text-red-500">Mission non trouvée</div>
    );

  return (
    <div className="page-container">
      <RetourButton />

      <PageHeader
        title={`Mission CAC – ${mission.clients?.name || "Client"}`}
        description={`Exercice ${mission.exercice}`}
        actions={
          <div className="flex gap-2">
            {/* ✅ WRAPPED: Modifier (edit) */}
            <ProtectedAction module="missions" action="edit">
              <Link
                to={`/missions/cac/${id}/edit`}
                className="btn-secondary btn-md flex items-center gap-2"
              >
                <Edit2 className="w-4 h-4" /> Modifier
              </Link>
            </ProtectedAction>
            {/* ✅ WRAPPED: Facture (create in factures module) */}
            <ProtectedAction module="factures" action="create">
              <button className="btn-primary btn-md flex items-center gap-2">
                <FileText className="w-4 h-4" /> Facture
              </button>
            </ProtectedAction>
            {/* ✅ WRAPPED: PDF (view) */}
            <ProtectedAction module="missions" action="view">
              <button className="btn-ghost btn-md flex items-center gap-2">
                <Printer className="w-4 h-4" /> PDF
              </button>
            </ProtectedAction>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">
              Récapitulatif
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <div className="text-xs text-slate-500">Assiette</div>
                <div className="font-semibold">
                  {formatCurrency(mission.assiette_calcul)}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Temps retenu</div>
                <div className="font-semibold">{mission.temps_retenu} h</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Coefficient</div>
                <div className="font-semibold">
                  {mission.coefficient_multiplicateur}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Décote</div>
                <div className="font-semibold">{mission.decote}%</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Statut</div>
                <Badge variant="primary">
                  {getStatutLabel(mission.statut)}
                </Badge>
              </div>
              <div>
                <div className="text-xs text-slate-500">Créée le</div>
                <div className="font-semibold">
                  {new Date(mission.created_at).toLocaleDateString("fr-FR")}
                </div>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">
              Détail des coûts
            </h3>
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left">Grade</th>
                  <th className="px-3 py-2 text-right">Heures</th>
                  <th className="px-3 py-2 text-right">Taux horaire</th>
                  <th className="px-3 py-2 text-right">Budget</th>
                </tr>
              </thead>
              <tbody>
                {intervenants.map((int) => (
                  <tr key={int.id} className="border-t border-slate-100">
                    <td className="px-3 py-2">
                      {int.grade === "associe_signataire" &&
                        "Associé signataire"}
                      {int.grade === "chef_mission" && "Chef de mission"}
                      {int.grade === "collaborateur_senior" &&
                        "Collaborateur senior"}
                      {int.grade === "collaborateur_junior" &&
                        "Collaborateur junior"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {int.heures_calculees?.toFixed(0)}h
                    </td>
                    <td className="px-3 py-2 text-right">
                      {formatCurrency(int.taux_horaire)}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold">
                      {formatCurrency(int.budget || 0)}
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 border-slate-200 font-semibold">
                  <td colSpan={3} className="px-3 py-2 text-right">
                    Total budget
                  </td>
                  <td className="px-3 py-2 text-right">
                    {formatCurrency(mission.total_budget || 0)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {mission.notes && (
            <div className="card p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">
                Notes
              </h3>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">
                {mission.notes}
              </p>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="card p-6 bg-blue-50 border-blue-200">
            <h3 className="text-sm font-semibold text-blue-800 mb-3">
              Synthèse financière
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-blue-700">Total budget</span>
                <span className="font-medium">
                  {formatCurrency(mission.total_budget || 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-700">Facture brute</span>
                <span className="font-medium">
                  {formatCurrency(mission.facture_brute || 0)}
                </span>
              </div>
              <div className="flex justify-between border-t border-blue-200 pt-2 font-semibold">
                <span className="text-blue-800">Facture nette</span>
                <span className="text-blue-900">
                  {formatCurrency(mission.facture_nette || 0)}
                </span>
              </div>
              <div className="flex justify-between text-green-700">
                <span>Marge estimée</span>
                <span>
                  {formatCurrency(mission.marge_estimee || 0)}
                  {mission.total_budget > 0 && (
                    <span className="text-xs ml-1">
                      (
                      {(
                        ((mission.marge_estimee || 0) /
                          (mission.total_budget || 1)) *
                        100
                      ).toFixed(1)}
                      %)
                    </span>
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
