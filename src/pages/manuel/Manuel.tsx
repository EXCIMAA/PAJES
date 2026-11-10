// src/pages/manuel/Manuel.tsx
import React, { useEffect, useState, useRef } from "react";
import { supabase } from "../../lib/supabase";
import "./Manuel.css";
import PlanningClient from "./PlanningClient";
import SuiviEcheancesSociales from "./SuiviEcheancesSociales";
import AcceptationMission from "./AcceptationMission";
import LutteAntiBlanchiment from "./LutteAntiBlanchiment";
import RepartitionTaches from "./RepartitionTaches";
import SuiviLettresMission from "./SuiviLettresMission";
import DemandeDocumentsClient from "./DemandeDocumentsClient";
import TravauxPeriodiques from "./TravauxPeriodiques";
import ControlesEssentiels from "./ControlesEssentiels";
import BouclageDossier from "./BouclageDossier";
import LivretAccueilCollab from "./LivretAccueilCollab";
import SuiviObjectifs from "./SuiviObjectifs";
import TableauSuiviActions from "./TableauSuiviActions";
import NoteSynthèse from "./NoteSynthèse";
import CompteRenduMission from "./CompteRenduMission";
import LivretAccueilClient from "./LivretAccueilClient";
import GestionTemps from "./GestionTemps";
import FichesFonction from "./FichesFonction";
import FicheEntretien from "./FicheEntretien";
import CompetencesCle from "./CompetencesCle";
import QuestionnaireEcouteClient from "./QuestionnaireEcouteClient";
import GestionDocumentation from "./GestionDocumentation";
import * as XLSX from "xlsx";

// ============================================================
// Fonction utilitaire pour normaliser les chaînes
// Accepte undefined/null et retourne une chaîne vide
// ============================================================
const normalizeTitle = (str: string | null | undefined): string => {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim()
    .replace(/[-\s]+/g, " ");
};

interface OutilManuel {
  id: number;
  icon: string;
  titre: string;
  code: string;
  contenu: string;
}

const Manuel: React.FC = () => {
  const [outils, setOutils] = useState<OutilManuel[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number>(0);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchOutils = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("outils_manuel")
          .select("*")
          .order("id", { ascending: true });

        if (error) throw error;
        setOutils(data || []);
        if (data && data.length > 0) setSelectedId(data[0].id);
      } catch (err) {
        console.error("Erreur Supabase:", err);
        setError("Impossible de charger les données du manuel.");
      } finally {
        setLoading(false);
      }
    };

    fetchOutils();
  }, []);

  const selectedTool = outils.find((tool) => tool.id === selectedId);

  const isTool = (titreRef: string): boolean => {
    if (!selectedTool) return false;
    return normalizeTitle(selectedTool.titre) === normalizeTitle(titreRef);
  };

  const isPlanningTool = isTool("OUTIL DE PLANIFICATION");
  const isEcheancesSocialesTool = isTool("SUIVIE DES ECHEANCES SOCIALES");
  const isAcceptationTool = isTool("ACCEPTATION");
  const isLabTool = isTool("LUTTE ANTIBLANCHIMENT");
  const isRepartitionTool = isTool("REPARTITION DES TACHES ENTRE LE CABINET");
  const isLettresTool = isTool("SUIVI DES LETTRE DE MISSION");
  const isDemandeDocTool = isTool("DEMANDE DE DOCUMENT DU CLIENT");
  const isTravauxPeriodiquesTool = isTool("TRAVAUX PERIODIQUES");
  const isControlesEssentielsTool = isTool("CONTROLES ESSENTIELS");
  const isBouclageDossierTool =
    isTool("BOUCLAGE DE DOSSIER") || isTool("BOUCLAGE DU DOSSIER");
  const isLivretAccueilCollabTool =
    isTool("LIVRET ACCUEIL COLLAB") ||
    isTool("LIVRET D'ACCUEIL COLLAB") ||
    isTool("LIVRET D'ACCEUIL DU COLLABORATEUR");
  const isObjectifsTool =
    isTool("MISE EN PLACE ET SUIVI DES OBJECTIFS") ||
    isTool("MISE EN PLACE ET SUIVI DES OBJECTIF");
  const isNoteSyntheseTool =
    isTool("NOTE DE SYNTHESE") || isTool("NOTE DE SYNTHÈSE");
  const isSuiviActionsTool = isTool("TABLEAU DE SUIVI DES ACTIONS");
  const isCompteRenduMissionTool =
    isTool("COMPTE RENDU DE MISSION") || isTool("COMPTES RENDU DE MISSION");
  const isLivretAccueilClientTool = isTool("LIVRET ACCUEIL DU CLIENT");
  const isFichesFonctionTool = isTool("FICHES DE FONCTION EXPERTISE");
  const isCompetencesCleTool = isTool(
    "TABLEAU D'IDENTIFICATION DES COMPETENCES CLES DU CABINET",
  );
  const isQuestionnaireEcouteClientTool =
    isTool("QUESTIONNAIRE D'ECOUTE CLIENT") ||
    isTool("QUESTIONNAIRE D'ÉCOUTE CLIENT");
  const isFicheEntretienTool =
    isTool("FICHE D'ENTRETIEN D'EVALUATION") ||
    isTool("FICHE D'ENTRETIEN D'ÉVALUATION");
  const isGestionDocumentationTool =
    isTool("OUTIL DE GESTION DE LA DOCUMENTATION") ||
    isTool("GESTION DE LA DOCUMENTATION");
  const isGestionTemps =
    isTool("GESTION TEMPS") ||
    isTool("GESTION DES TEMPS") ||
    isTool("GESTION DU TEMPS");

  const isCustomComponent =
    isPlanningTool ||
    isEcheancesSocialesTool ||
    isAcceptationTool ||
    isLabTool ||
    isRepartitionTool ||
    isLettresTool ||
    isDemandeDocTool ||
    isTravauxPeriodiquesTool ||
    isControlesEssentielsTool ||
    isBouclageDossierTool ||
    isLivretAccueilCollabTool ||
    isObjectifsTool ||
    isSuiviActionsTool ||
    isNoteSyntheseTool ||
    isCompteRenduMissionTool ||
    isLivretAccueilClientTool ||
    isFichesFonctionTool ||
    isCompetencesCleTool ||
    isFicheEntretienTool ||
    isQuestionnaireEcouteClientTool ||
    isGestionDocumentationTool ||
    isGestionTemps;

  // Export du contenu HTML en Excel
  const exportContent = () => {
    if (!selectedTool) return;

    let content = selectedTool.contenu || "";

    const rows: any[] = [];
    rows.push(["MANUEL - OUTIL", selectedTool.titre]);
    rows.push(["Code", selectedTool.code]);
    rows.push([]);
    rows.push(["Contenu :"]);

    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = content;
    const textContent = tempDiv.textContent || tempDiv.innerText || "";
    rows.push([textContent]);

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Manuel");
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], { type: "application/octet-stream" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Manuel_${selectedTool.titre}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  if (loading) {
    return (
      <div
        className="manuel-container"
        style={{ textAlign: "center", padding: "4rem" }}
      >
        <i
          className="fas fa-spinner fa-spin"
          style={{ fontSize: "3rem", color: "#4facfe" }}
        ></i>
        <p style={{ marginTop: "1rem", color: "#475569" }}>
          Chargement du manuel...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="manuel-container"
        style={{ textAlign: "center", padding: "4rem" }}
      >
        <i
          className="fas fa-exclamation-triangle"
          style={{ fontSize: "3rem", color: "#ef4444" }}
        ></i>
        <h3 style={{ color: "#dc2626" }}>Erreur</h3>
        <p>{error}</p>
        <button
          onClick={() => window.location.reload()}
          style={{
            marginTop: "1rem",
            padding: "0.5rem 1.5rem",
            cursor: "pointer",
          }}
        >
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="manuel-container">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <h1>
          <i className="fas fa-book-open"></i> Manuel
        </h1>
        {/* Bouton d'export global : exclure les outils qui ont leur propre export */}
        {selectedTool &&
          !isPlanningTool &&
          !isEcheancesSocialesTool &&
          !isAcceptationTool &&
          !isTravauxPeriodiquesTool &&
          !isControlesEssentielsTool &&
          !isObjectifsTool &&
          !isSuiviActionsTool &&
          !isCompteRenduMissionTool &&
          !isBouclageDossierTool &&
          !isQuestionnaireEcouteClientTool &&
          !isGestionDocumentationTool &&
          !isGestionTemps && (
            <button
              onClick={exportContent}
              style={{
                padding: "8px 18px",
                background: "#22c55e",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                fontWeight: "600",
                fontSize: "14px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <i className="fas fa-file-excel"></i> Exporter Excel
            </button>
          )}
      </div>
      <p className="intro">
        Sélectionnez un outil pour voir son contenu détaillé.
      </p>

      <div className="options-grid">
        {outils.map((outil) => (
          <div
            key={outil.id}
            className={`option-card ${selectedId === outil.id ? "active" : ""}`}
            onClick={() => setSelectedId(outil.id)}
          >
            <div className="card-icon">
              <i className={`fas ${outil.icon}`}></i>
            </div>
            <div className="card-title">{outil.titre}</div>
            <div className="card-code">{outil.code}</div>
            {selectedId === outil.id && (
              <div className="card-check">
                <i className="fas fa-check-circle"></i>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="content-panel">
        {selectedTool ? (
          <>
            <div className="panel-header">
              <i className={`fas ${selectedTool.icon}`}></i>
              <h2>{selectedTool.titre}</h2>
              <span className="code-badge">CODE : {selectedTool.code}</span>
            </div>
            <div className="panel-body" ref={contentRef}>
              {isPlanningTool && <PlanningClient />}
              {isEcheancesSocialesTool && <SuiviEcheancesSociales />}
              {isAcceptationTool && <AcceptationMission />}
              {isLabTool && <LutteAntiBlanchiment />}
              {isRepartitionTool && <RepartitionTaches />}
              {isLettresTool && <SuiviLettresMission />}
              {isDemandeDocTool && <DemandeDocumentsClient />}
              {isTravauxPeriodiquesTool && <TravauxPeriodiques />}
              {isControlesEssentielsTool && <ControlesEssentiels />}
              {isBouclageDossierTool && <BouclageDossier />}
              {isLivretAccueilCollabTool && <LivretAccueilCollab />}
              {isObjectifsTool && <SuiviObjectifs />}
              {isSuiviActionsTool && <TableauSuiviActions />}
              {isNoteSyntheseTool && <NoteSynthèse />}
              {isCompteRenduMissionTool && <CompteRenduMission />}
              {isLivretAccueilClientTool && <LivretAccueilClient />}
              {isGestionTemps && <GestionTemps />}
              {isFichesFonctionTool && <FichesFonction />}
              {isCompetencesCleTool && <CompetencesCle />}
              {isFicheEntretienTool && <FicheEntretien />}
              {isQuestionnaireEcouteClientTool && <QuestionnaireEcouteClient />}
              {isGestionDocumentationTool && <GestionDocumentation />}
              {!isCustomComponent && (
                <div
                  dangerouslySetInnerHTML={{ __html: selectedTool.contenu }}
                />
              )}
            </div>
          </>
        ) : (
          <div className="empty-state">
            <i className="fas fa-hand-pointer"></i>
            <h3>Aucun outil trouvé</h3>
            <p>Vérifiez votre base de données Supabase.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Manuel;
