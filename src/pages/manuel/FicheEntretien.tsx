// src/pages/manuel/FicheEntretien.tsx
import React, { useEffect, useState, useRef } from "react";
import styled from "styled-components";
import { supabase } from "../../lib/supabase";
import { upsertManualToolContent } from "../../lib/manualToolPersistence";
import * as mammoth from "mammoth";

// ==================== STYLES (identiques aux autres composants) ====================
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

const Description = styled.p`
  color: #94a3b8;
  font-size: 14px;
  margin: 12px 0 20px;
  line-height: 1.6;
  i {
    color: #4facfe;
    margin-right: 6px;
  }
`;

const ContentWrapper = styled.div`
  background: #1e293b;
  border-radius: 12px;
  padding: 32px 40px;
  max-height: 600px;
  overflow-y: auto;
  color: #e2e8f0;
  font-size: 15px;
  line-height: 1.8;

  h1 {
    color: #4facfe;
    font-size: 28px;
    border-bottom: 2px solid #334155;
    padding-bottom: 12px;
    margin-top: 32px;
  }
  h2 {
    color: #60a5fa;
    font-size: 22px;
    margin-top: 28px;
  }
  h3 {
    color: #93c5fd;
    font-size: 18px;
    margin-top: 20px;
  }
  h4 {
    color: #bfdbfe;
    font-size: 16px;
    margin-top: 16px;
  }
  p {
    margin: 12px 0;
  }
  ul,
  ol {
    padding-left: 24px;
    margin: 8px 0;
  }
  li {
    margin: 4px 0;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 16px 0;
  }
  th,
  td {
    border: 1px solid #334155;
    padding: 8px 12px;
    text-align: left;
  }
  th {
    background: #0f172a;
    color: #94a3b8;
  }
  img {
    max-width: 100%;
    height: auto;
  }
  a {
    color: #4facfe;
    text-decoration: none;
    &:hover {
      text-decoration: underline;
    }
  }
  blockquote {
    border-left: 4px solid #4facfe;
    padding-left: 16px;
    margin: 16px 0;
    color: #94a3b8;
  }
  hr {
    border: none;
    border-top: 2px solid #334155;
    margin: 24px 0;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: #94a3b8;
  i {
    font-size: 48px;
    color: #334155;
    margin-bottom: 16px;
    display: block;
  }
  h3 {
    color: #e2e8f0;
    margin-bottom: 8px;
  }
`;

const ImportArea = styled.div`
  display: flex;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
  margin: 16px 0;
  padding: 16px 20px;
  background: #1e293b;
  border-radius: 8px;
  border: 2px dashed #334155;
`;

const FileInput = styled.input`
  display: none;
`;

const ImportButton = styled.button`
  padding: 10px 24px;
  background: #4facfe;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
  &:hover {
    background: #3b8edb;
  }
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const FileName = styled.span`
  color: #94a3b8;
  font-size: 13px;
  flex: 1;
`;

const ActionButton = styled.button<{ $variant?: "primary" | "secondary" }>`
  padding: 10px 24px;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
  ${({ $variant }) => {
    if ($variant === "primary")
      return "background: #22c55e; color: #fff; &:hover { background: #16a34a; }";
    if ($variant === "secondary")
      return "background: #334155; color: #e2e8f0; &:hover { background: #475569; }";
    return "";
  }}
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const LoadingContainer = styled.div`
  text-align: center;
  padding: 3rem;
  color: #94a3b8;
`;

const ErrorMessage = styled.div`
  background: #7f1d1d;
  color: #fca5a5;
  padding: 12px 16px;
  border-radius: 8px;
  margin: 12px 0;
  border-left: 4px solid #dc2626;
`;

const SuccessMessage = styled.div`
  background: #14532d;
  color: #86efac;
  padding: 12px 16px;
  border-radius: 8px;
  margin: 12px 0;
  border-left: 4px solid #22c55e;
`;

// ==================== COMPOSANT ====================
const FicheEntretien: React.FC = () => {
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const OUTIL_CODE = "FEE-019"; // Code de l'outil dans la table outils_manuel

  useEffect(() => {
    const fetchContent = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("outils_manuel")
          .select("contenu")
          .eq("code", OUTIL_CODE)
          .single();

        if (error) throw error;
        setContent(data?.contenu || "");
      } catch (err) {
        console.error("Erreur chargement:", err);
        setError("Impossible de charger la fiche d'entretien.");
      } finally {
        setLoading(false);
      }
    };
    fetchContent();
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = [
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
    ];
    if (
      !validTypes.includes(file.type) &&
      !file.name.endsWith(".docx") &&
      !file.name.endsWith(".doc")
    ) {
      setError("Veuillez sélectionner un fichier Word (.docx ou .doc)");
      return;
    }

    setSelectedFile(file);
    setFileName(file.name);
    setError(null);
    setSuccess(null);
  };

  const importDocument = async () => {
    if (!selectedFile) {
      setError("Veuillez d'abord sélectionner un fichier.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const result = await mammoth.convertToHtml(
        { arrayBuffer },
        {
          convertImage: mammoth.images.imgElement((image) => {
            return image.read("base64").then((imageBuffer) => {
              return {
                src: `data:${image.contentType};base64,${imageBuffer}`,
              };
            });
          }),
        },
      );

      const htmlContent = result.value;
      const warnings = result.messages;
      if (warnings.length > 0) {
        console.warn("Warnings lors de la conversion:", warnings);
      }

      await upsertManualToolContent({
        code: OUTIL_CODE,
        contenu: htmlContent,
        titre: "Fiche d'entretien d'évaluation",
      });

      setContent(htmlContent);
      setSuccess("La fiche d'entretien a été importée avec succès !");
      setSelectedFile(null);
      setFileName("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      console.error("Erreur import:", err);
      setError(
        "Erreur lors de l'import du document. Vérifiez que le fichier est valide.",
      );
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setSelectedFile(null);
    setFileName("");
    setError(null);
    setSuccess(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  if (loading) {
    return (
      <LoadingContainer>
        <i className="fas fa-spinner fa-spin" style={{ fontSize: "2rem" }}></i>
        <p>Chargement de la fiche d'entretien...</p>
      </LoadingContainer>
    );
  }

  return (
    <Container>
      <Header>
        <HeaderTitle>
          <i className="fas fa-clipboard-list"></i> Fiche d'entretien
          d'évaluation
        </HeaderTitle>
        <span style={{ color: "#94a3b8", fontSize: "13px" }}>
          <i className="fas fa-code"></i> FEE-019
        </span>
      </Header>

      <Description>
        <i className="fas fa-info-circle"></i>
        Modèle de fiche d'entretien annuel d'évaluation. Il permet de faire le
        bilan de l'année, d'identifier les points de progrès, de définir les
        objectifs et de mieux connaître les aspirations du collaborateur.
      </Description>

      <ImportArea>
        <ImportButton
          onClick={() => fileInputRef.current?.click()}
          disabled={saving}
        >
          <i className="fas fa-upload"></i> Importer un document
        </ImportButton>
        <FileInput
          ref={fileInputRef}
          type="file"
          accept=".docx,.doc,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
          onChange={handleFileSelect}
          disabled={saving}
        />
        {fileName && (
          <FileName>
            <i className="fas fa-file-word"></i> {fileName}
          </FileName>
        )}
        {selectedFile && !saving && (
          <>
            <ActionButton $variant="primary" onClick={importDocument}>
              <i className="fas fa-save"></i> Enregistrer
            </ActionButton>
            <ActionButton $variant="secondary" onClick={reset}>
              <i className="fas fa-times"></i> Annuler
            </ActionButton>
          </>
        )}
      </ImportArea>

      {error && (
        <ErrorMessage>
          <i className="fas fa-exclamation-circle"></i> {error}
        </ErrorMessage>
      )}
      {success && (
        <SuccessMessage>
          <i className="fas fa-check-circle"></i> {success}
        </SuccessMessage>
      )}

      {content ? (
        <ContentWrapper dangerouslySetInnerHTML={{ __html: content }} />
      ) : (
        <EmptyState>
          <i className="fas fa-clipboard-list"></i>
          <h3>Aucune fiche d'entretien disponible</h3>
          <p>
            Utilisez le bouton <strong>"Importer un document"</strong> ci-dessus
            pour ajouter la fiche d'entretien au format Word (.docx).
          </p>
          <p style={{ fontSize: "13px", color: "#64748b", marginTop: "12px" }}>
            Le document sera converti automatiquement et affiché ici.
          </p>
        </EmptyState>
      )}

      <div
        style={{
          marginTop: "20px",
          paddingTop: "16px",
          borderTop: "1px solid #1e293b",
          fontSize: "12px",
          color: "#475569",
          display: "flex",
          justifyContent: "space-between",
          flexWrap: "wrap",
        }}
      >
        <span>
          <i className="fas fa-info-circle"></i> Dernière mise à jour :{" "}
          {new Date().toLocaleDateString("fr-FR")}
        </span>
        <span>
          <i className="fas fa-file-word"></i> Format supporté : .docx, .doc
        </span>
      </div>
    </Container>
  );
};

export default FicheEntretien;
