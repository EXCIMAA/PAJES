// src/pages/collaborateurs/CollaborateurList.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Users, UserCheck, Archive, Plus, UserCircle, Lock } from "lucide-react";
import { dbApi } from "../../lib/apiClient";
import { format } from "date-fns";
import { useAuth } from "../../contexts/AuthContext";
import { ProtectedAction } from "../../components/auth/ProtectedAction";
import { usePermission } from "../../hooks/usePermission";
import { PageHeader } from "../../components/ui/PageHeader";
import { cn } from "../../lib/utils";

interface Collaborateur {
  id: string;
  nom: string;
  prenom: string;
  photo_url: string;
  fonction: string;
  pays: string;
  date_embauche: string;
  archived?: boolean;
}

export const CollaborateurList: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { can, role } = usePermission();

  const [collaborateurs, setCollaborateurs] = useState<Collaborateur[]>([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);

  const canViewCollaborateurs = can("collaborateurs", "view");

  const fetchData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await dbApi.list<Collaborateur>("collaborateurs", {
        orderBy: "nom",
        limit: 500,
      });
      setCollaborateurs(
        (data || []).filter((c) => (showArchived ? !!c.archived : !c.archived)),
      );
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canViewCollaborateurs) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [user, canViewCollaborateurs, showArchived]);

  if (loading) {
    return (
      <div className="text-center py-12 text-app-tertiary">
        <i className="fas fa-spinner fa-spin"></i> {t("common.loading")}
      </div>
    );
  }

  if (!canViewCollaborateurs) {
    return (
      <div className="card p-16 text-center max-w-2xl mx-auto my-10">
        <Lock className="w-16 h-16 mx-auto mb-5 text-error" />
        <h2 className="text-xl font-bold text-app-primary mb-3">
          Accès refusé
        </h2>
        <p className="text-sm text-app-tertiary mb-2 leading-relaxed">
          Votre rôle actuel (
          <strong className="text-app-primary">"{role || "inconnu"}"</strong>)
          ne vous permet pas de consulter les informations des collaborateurs.
        </p>
        <p className="text-sm text-app-tertiary mb-2 leading-relaxed">
          Veuillez contacter votre administrateur si vous pensez qu'il s'agit
          d'une erreur.
        </p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <PageHeader
        title="Collaborateurs"
        description="Gérez les collaborateurs actifs et archivés"
        actions={
          <div className="flex gap-2 items-center">
            <div className="flex bg-app-secondary rounded-md p-0.5 border border-app">
              <button
                onClick={() => setShowArchived(false)}
                className={cn(
                  "px-3.5 py-1.5 rounded text-xs font-semibold transition-colors flex items-center gap-1.5",
                  !showArchived
                    ? "bg-primary text-white"
                    : "text-app-tertiary hover:text-app-primary",
                )}
              >
                <UserCheck className="w-3.5 h-3.5" /> Actifs
              </button>
              <button
                onClick={() => setShowArchived(true)}
                className={cn(
                  "px-3.5 py-1.5 rounded text-xs font-semibold transition-colors flex items-center gap-1.5",
                  showArchived
                    ? "bg-primary text-white"
                    : "text-app-tertiary hover:text-app-primary",
                )}
              >
                <Archive className="w-3.5 h-3.5" /> Archivés
              </button>
            </div>

            <ProtectedAction module="collaborateurs" action="create">
              <button
                onClick={() => navigate("/collaborateurs/new")}
                className="btn-primary btn-md"
              >
                <Plus className="w-4 h-4" /> Nouveau collaborateur
              </button>
            </ProtectedAction>
          </div>
        }
      />

      <div className="card p-5">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="px-3 py-2 text-left text-app-tertiary font-semibold uppercase text-[10px] tracking-wide border-b-2 border-app">
                  Photo
                </th>
                <th className="px-3 py-2 text-left text-app-tertiary font-semibold uppercase text-[10px] tracking-wide border-b-2 border-app">
                  Nom
                </th>
                <th className="px-3 py-2 text-left text-app-tertiary font-semibold uppercase text-[10px] tracking-wide border-b-2 border-app">
                  Prénom
                </th>
                <th className="px-3 py-2 text-left text-app-tertiary font-semibold uppercase text-[10px] tracking-wide border-b-2 border-app">
                  Fonction
                </th>
                <th className="px-3 py-2 text-left text-app-tertiary font-semibold uppercase text-[10px] tracking-wide border-b-2 border-app">
                  Pays
                </th>
                <th className="px-3 py-2 text-left text-app-tertiary font-semibold uppercase text-[10px] tracking-wide border-b-2 border-app">
                  Date embauche
                </th>
                <th className="px-3 py-2 text-left text-app-tertiary font-semibold uppercase text-[10px] tracking-wide border-b-2 border-app">
                  Statut
                </th>
              </tr>
            </thead>
            <tbody>
              {collaborateurs.map((c) => (
                <ProtectedAction key={c.id} module="collaborateurs" action="view">
                  <tr
                    className="cursor-pointer hover:bg-app-secondary border-b border-app"
                    onClick={() => navigate(`/collaborateurs/${c.id}`)}
                  >
                    <td className="px-3 py-2">
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-app-secondary flex items-center justify-center">
                        {c.photo_url ? (
                          <img
                            src={c.photo_url}
                            alt={c.nom}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <UserCircle className="w-4 h-4 text-app-tertiary" />
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-app-primary">{c.nom}</td>
                    <td className="px-3 py-2 text-app-primary">{c.prenom}</td>
                    <td className="px-3 py-2 text-app-secondary">
                      {c.fonction || "-"}
                    </td>
                    <td className="px-3 py-2 text-app-secondary">
                      {c.pays || "-"}
                    </td>
                    <td className="px-3 py-2 text-app-secondary">
                      {c.date_embauche
                        ? format(new Date(c.date_embauche), "dd/MM/yyyy")
                        : "-"}
                    </td>
                    <td className="px-3 py-2">
                      {c.archived ? (
                        <span className="badge badge-warning">
                          <Archive className="w-3 h-3" /> Archivé
                        </span>
                      ) : (
                        <span className="badge badge-success">
                          <UserCheck className="w-3 h-3" /> Actif
                        </span>
                      )}
                    </td>
                  </tr>
                </ProtectedAction>
              ))}
              {collaborateurs.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="text-center text-app-tertiary py-6"
                  >
                    {showArchived
                      ? "Aucun collaborateur archivé"
                      : "Aucun collaborateur actif"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
