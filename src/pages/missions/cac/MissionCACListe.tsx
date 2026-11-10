import { useState, useEffect } from "react";
import { Plus, Eye, Edit2, FileText, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "../../../lib/supabase";
import { PageHeader } from "../../../components/ui/PageHeader";
import { Badge } from "../../../components/ui/Badge";
import { RetourButton } from "../../../components/ui/RetourButton";
import { formatCurrency } from "../../../lib/utils";
import { ProtectedAction } from "../../../components/auth/ProtectedAction";
import { buildAccessFilter } from "../../../lib/permissions";
import { useAuth } from "../../../contexts/AuthContext";

type MissionCAC = {
  id: string;
  client_id: string;
  client_nom?: string;
  exercice: string;
  assiette_calcul: number;
  temps_retenu: number | null;
  total_budget: number | null;
  facture_nette: number | null;
  marge_estimee: number | null;
  statut: string;
  created_at: string;
};

export default function MissionCACListe() {
  const { user, profile } = useAuth();
  const [missions, setMissions] = useState<MissionCAC[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statutFilter, setStatutFilter] = useState("");
  const [exerciceFilter, setExerciceFilter] = useState("");

  useEffect(() => {
    if (user) loadMissions();
  }, [user, profile?.role]);

  async function loadMissions() {
    if (!user) return;
    setLoading(true);
    try {
      const accessFilter = buildAccessFilter({
        role: profile?.role,
        module: "missions",
        currentUserId: user.id,
        ownerColumn: "created_by",
        assignmentColumn: "chef_mission_id",
      });

      let query = supabase
        .from("missions_cac")
        .select(
          `
          id,
          client_id,
          exercice,
          assiette_calcul,
          temps_retenu,
          total_budget,
          facture_nette,
          marge_estimee,
          statut,
          created_at,
          clients (name)
        `,
        )
        .order("created_at", { ascending: false });

      if (accessFilter) query = query.or(accessFilter);
      if (statutFilter) query = query.eq("statut", statutFilter);
      if (exerciceFilter) query = query.eq("exercice", exerciceFilter);
      if (search) {
        query = query.ilike("clients.name", `%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      const mapped = (data || []).map((item: any) => ({
        ...item,
        client_nom: item.clients?.name || "Client inconnu",
      }));
      setMissions(mapped);
    } catch (err) {
      console.error("Erreur chargement missions CAC:", err);
    } finally {
      setLoading(false);
    }
  }

  function getStatutBadge(
    statut: string,
  ): "error" | "success" | "neutral" | "primary" | "warning" | "info" {
    const variants: Record<
      string,
      "error" | "success" | "neutral" | "primary" | "warning" | "info"
    > = {
      brouillon: "neutral",
      valide: "success",
      facture_emise: "warning",
      facture_payee: "success",
    };
    return variants[statut] || "neutral";
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

  return (
    <div className="page-container">
      <RetourButton />

      <PageHeader
        title="Missions CAC"
        description="Gestion des missions de commissariat aux comptes"
        actions={
          <ProtectedAction module="missions" action="create">
            <Link
              to="/missions/cac/nouveau"
              className="btn-primary btn-md flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Nouvelle mission
            </Link>
          </ProtectedAction>
        }
      />

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadMissions()}
            placeholder="Rechercher un client..."
            className="auth-input w-full pl-10 pr-4 py-2.5"
          />
        </div>
        <select
          value={exerciceFilter}
          onChange={(e) => setExerciceFilter(e.target.value)}
          className="auth-input py-2.5 px-3"
        >
          <option value="">Tous les exercices</option>
          <option value="2024">2024</option>
          <option value="2025">2025</option>
          <option value="2026">2026</option>
        </select>
        <select
          value={statutFilter}
          onChange={(e) => setStatutFilter(e.target.value)}
          className="auth-input py-2.5 px-3"
        >
          <option value="">Tous les statuts</option>
          <option value="brouillon">Brouillon</option>
          <option value="valide">Validé</option>
          <option value="facture_emise">Facture émise</option>
          <option value="facture_payee">Payée</option>
        </select>
        <button onClick={loadMissions} className="btn-secondary btn-md">
          Appliquer
        </button>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-12 bg-slate-100 rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : missions.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <p>Aucune mission CAC trouvée.</p>
            <Link
              to="/missions/cac/nouveau"
              className="text-primary-600 hover:underline mt-2 inline-block"
            >
              Créer la première mission
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">
                    Client
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">
                    Exercice
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-slate-500">
                    Assiette
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-slate-500">
                    Temps
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-slate-500">
                    Facture nette
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-slate-500">
                    Statut
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {missions.map((mission) => (
                  <tr
                    key={mission.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <td className="px-4 py-3 font-medium">
                      {mission.client_nom}
                    </td>
                    <td className="px-4 py-3">{mission.exercice}</td>
                    <td className="px-4 py-3 text-right">
                      {formatCurrency(mission.assiette_calcul)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {mission.temps_retenu ? `${mission.temps_retenu}h` : "-"}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-blue-600">
                      {mission.facture_nette
                        ? formatCurrency(mission.facture_nette)
                        : "-"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={getStatutBadge(mission.statut)}>
                        {getStatutLabel(mission.statut)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <ProtectedAction module="missions" action="view">
                          <Link
                            to={`/missions/cac/${mission.id}`}
                            className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                        </ProtectedAction>
                        <ProtectedAction module="missions" action="edit">
                          <Link
                            to={`/missions/cac/${mission.id}/edit`}
                            className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Link>
                        </ProtectedAction>
                        <ProtectedAction module="missions" action="create">
                          <button className="p-1.5 text-slate-400 hover:text-green-600 rounded-lg">
                            <FileText className="w-4 h-4" />
                          </button>
                        </ProtectedAction>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
