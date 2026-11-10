// src/pages/collaborateurs/CollaborateurList.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { supabase } from "../../lib/supabase";
import { format } from "date-fns";
import { useAuth } from "../../contexts/AuthContext";
import { ProtectedAction } from "../../components/auth/ProtectedAction";
import { buildAccessFilter } from "../../lib/permissions";
import { usePermission } from "../../hooks/usePermission";

const Container = styled.div`
  background: #0f172a;
  border-radius: 16px;
  padding: 24px 28px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
  border: 1px solid #1e293b;
  color: #e2e8f0;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 2px solid #1e293b;
`;

const HeaderTitle = styled.h2`
  font-size: 22px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  i {
    color: #4facfe;
  }
`;

const Button = styled.button<{ variant?: "primary" | "secondary" }>`
  padding: 6px 14px;
  border: none;
  border-radius: 4px;
  font-weight: 600;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.2s;
  ${({ variant }) => {
    if (variant === "primary")
      return "background: #4facfe; color: #fff; &:hover { background: #3b8edb; }";
    return "background: #334155; color: #e2e8f0; &:hover { background: #475569; }";
  }}
`;

const TabsContainer = styled.div`
  display: flex;
  background: #1e293b;
  border-radius: 6px;
  padding: 3px;
  border: 1px solid #334155;
`;

const Tab = styled.button<{ $active: boolean }>`
  padding: 6px 14px;
  border: none;
  border-radius: 4px;
  background: ${({ $active }) => ($active ? "#4facfe" : "transparent")};
  color: ${({ $active }) => ($active ? "#fff" : "#94a3b8")};
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  transition: all 0.15s;
  &:hover {
    color: ${({ $active }) => ($active ? "#fff" : "#e2e8f0")};
  }
`;

const TableWrapper = styled.div`
  overflow-x: auto;
`;

const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  th,
  td {
    padding: 8px 12px;
    border-bottom: 1px solid #1e293b;
    text-align: left;
    vertical-align: middle;
  }
  th {
    color: #94a3b8;
    font-weight: 600;
    text-transform: uppercase;
    font-size: 10px;
    letter-spacing: 0.5px;
    border-bottom: 2px solid #334155;
  }
  .clickable {
    cursor: pointer;
    &:hover {
      background: #1e293b;
    }
  }
`;

const Avatar = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  overflow: hidden;
  background: #1e293b;
  display: flex;
  align-items: center;
  justify-content: center;
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  i {
    color: #475569;
    font-size: 16px;
  }
`;

const StatusBadge = styled.span<{ $archived: boolean }>`
  display: inline-block;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  ${({ $archived }) =>
    $archived
      ? "background: #fef3c7; color: #92400e;"
      : "background: #14532d; color: #86efac;"}
`;

const LoadingContainer = styled.div`
  text-align: center;
  padding: 3rem;
  color: #94a3b8;
`;

const AccessDeniedContainer = styled.div`
  background: #0f172a;
  border-radius: 16px;
  padding: 60px 28px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
  border: 1px solid #1e293b;
  color: #e2e8f0;
  text-align: center;
  max-width: 600px;
  margin: 40px auto;
`;

const AccessDeniedIcon = styled.div`
  font-size: 64px;
  color: #fca5a5;
  margin-bottom: 20px;
`;

const AccessDeniedTitle = styled.h2`
  font-size: 22px;
  font-weight: 700;
  color: #e2e8f0;
  margin-bottom: 12px;
`;

const AccessDeniedText = styled.p`
  font-size: 14px;
  color: #94a3b8;
  margin-bottom: 8px;
  line-height: 1.6;
  strong {
    color: #e2e8f0;
  }
`;

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
  const { user, profile } = useAuth();
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

      const accessFilter = buildAccessFilter({
        role: profile?.role,
        module: "collaborateurs",
        currentUserId: user.id,
        ownerColumn: "id",
        assignmentColumn: "manager_id",
      });

      let q = supabase
        .from("collaborateurs")
        .select(
          "id, nom, prenom, photo_url, fonction, pays, date_embauche, archived",
        )
        .eq("archived", showArchived)
        .order("nom");

      if (accessFilter) q = q.or(accessFilter);

      const { data, error } = await q;
      if (error) throw error;
      setCollaborateurs(data || []);
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
  }, [user, profile?.role, canViewCollaborateurs, showArchived]);

  if (loading) {
    return (
      <LoadingContainer>
        <i className="fas fa-spinner fa-spin"></i> {t("common.loading")}
      </LoadingContainer>
    );
  }

  // ✅ ÉCRAN "ACCÈS REFUSÉ" si l'utilisateur n'a pas la permission
  if (!canViewCollaborateurs) {
    return (
      <AccessDeniedContainer>
        <AccessDeniedIcon>
          <i className="fas fa-user-lock"></i>
        </AccessDeniedIcon>
        <AccessDeniedTitle>Accès refusé</AccessDeniedTitle>
        <AccessDeniedText>
          Votre rôle actuel (<strong>"{role || "inconnu"}"</strong>) ne vous
          permet pas de consulter les informations des collaborateurs.
        </AccessDeniedText>
        <AccessDeniedText>
          Veuillez contacter votre administrateur si vous pensez qu'il s'agit
          d'une erreur.
        </AccessDeniedText>
      </AccessDeniedContainer>
    );
  }

  return (
    <Container>
      <Header>
        <HeaderTitle>
          <i className="fas fa-users"></i> Collaborateurs
        </HeaderTitle>

        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <TabsContainer>
            <Tab $active={!showArchived} onClick={() => setShowArchived(false)}>
              <i className="fas fa-user-check"></i> Actifs
            </Tab>
            <Tab $active={showArchived} onClick={() => setShowArchived(true)}>
              <i className="fas fa-archive"></i> Archivés
            </Tab>
          </TabsContainer>

          <ProtectedAction module="collaborateurs" action="create">
            <Button
              variant="primary"
              onClick={() => navigate("/collaborateurs/new")}
            >
              <i className="fas fa-plus"></i> Nouveau collaborateur
            </Button>
          </ProtectedAction>
        </div>
      </Header>

      <TableWrapper>
        <StyledTable>
          <thead>
            <tr>
              <th style={{ width: "50px" }}>Photo</th>
              <th>Nom</th>
              <th>Prénom</th>
              <th>Fonction</th>
              <th>Pays</th>
              <th>Date embauche</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {collaborateurs.map((c) => (
              <ProtectedAction key={c.id} module="collaborateurs" action="view">
                <tr
                  className="clickable"
                  onClick={() => navigate(`/collaborateurs/${c.id}`)}
                >
                  <td>
                    <Avatar>
                      {c.photo_url ? (
                        <img src={c.photo_url} alt={c.nom} />
                      ) : (
                        <i className="fas fa-user-circle"></i>
                      )}
                    </Avatar>
                  </td>
                  <td>{c.nom}</td>
                  <td>{c.prenom}</td>
                  <td>{c.fonction || "-"}</td>
                  <td>{c.pays || "-"}</td>
                  <td>
                    {c.date_embauche
                      ? format(new Date(c.date_embauche), "dd/MM/yyyy")
                      : "-"}
                  </td>
                  <td>
                    <StatusBadge $archived={!!c.archived}>
                      {c.archived ? (
                        <>
                          <i className="fas fa-archive"></i> Archivé
                        </>
                      ) : (
                        <>
                          <i className="fas fa-user-check"></i> Actif
                        </>
                      )}
                    </StatusBadge>
                  </td>
                </tr>
              </ProtectedAction>
            ))}
            {collaborateurs.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  style={{
                    textAlign: "center",
                    color: "#94a3b8",
                    padding: "24px",
                  }}
                >
                  {showArchived
                    ? "Aucun collaborateur archivé"
                    : "Aucun collaborateur actif"}
                </td>
              </tr>
            )}
          </tbody>
        </StyledTable>
      </TableWrapper>
    </Container>
  );
};
