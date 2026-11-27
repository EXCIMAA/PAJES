import React, { useEffect, useState } from "react";
import { dbApi } from "../../lib/apiClient";
import * as XLSX from "xlsx";
import { useNotification } from "../../contexts/NotificationContext";
import { cn } from "../../lib/utils";

interface Client {
  id: string;
  client_code: string;
  name: string;
  status?: string;
  niveau_risque?: string;
}

interface AcceptationData {
  id?: string;
  client_id: string;
  rencontre_client: boolean;
  presentation_obtenue: boolean;
  observations_connaissance: string;
  risque_activite: string;
  risque_structure: string;
  risque_si_comptable: string;
  risque_org_comptable: string;
  risque_historique_fiscal: string;
  risque_historique_social: string;
  observations_risques: string;
  repartition_taches_define: boolean;
  volume_ecritures_estime: boolean;
  specificites_identifiees: boolean;
  delais_identifies: boolean;
  observations_besoins: string;
  cabinet_independant: boolean;
  competence_technique: boolean;
  moyens_suffisants: boolean;
  observations_faisabilite: string;
  questionnaire_vigilance_complete: boolean;
  pieces_identite_verifiees: boolean;
  origine_fonds_comprise: boolean;
  observations_lbc: string;
  client_suivi_autre_cabinet: boolean;
  info_confrere_demandee: boolean;
  litige_confrere: boolean;
  observations_ancien_cabinet: string;
  type_client: string;
  decision: string;
  signature_expert: string;
  date_signature: string;
  observations_generales: string;
}

const AcceptationMission: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [clientData, setClientData] = useState<Client | null>(null);
  const [formData, setFormData] = useState<AcceptationData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { notify } = useNotification();

  useEffect(() => {
    const fetchClients = async () => {
      try {
        setLoading(true);
        const data = await dbApi.list<Client>("clients", {
          orderBy: "name",
          limit: 500,
        });
        setClients(data || []);
        if (data && data.length > 0) {
          setSelectedClientId(data[0].id);
        } else {
          setError("Aucun client trouvé.");
        }
      } catch (err: any) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchClients();
  }, []);

  useEffect(() => {
    if (!selectedClientId) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const clientInfo = await dbApi.get<Client>("clients", selectedClientId);
        setClientData(clientInfo);

        const acceptation = await dbApi.list<AcceptationData>(
          "acceptation_mission",
          {
            filters: { client_id: selectedClientId },
            limit: 500,
          },
        );

        if (acceptation.length > 0) {
          setFormData(acceptation[0]);
        } else {
          setFormData({
            client_id: selectedClientId,
            rencontre_client: false,
            presentation_obtenue: false,
            observations_connaissance: "",
            risque_activite: "",
            risque_structure: "",
            risque_si_comptable: "",
            risque_org_comptable: "",
            risque_historique_fiscal: "",
            risque_historique_social: "",
            observations_risques: "",
            repartition_taches_define: false,
            volume_ecritures_estime: false,
            specificites_identifiees: false,
            delais_identifies: false,
            observations_besoins: "",
            cabinet_independant: false,
            competence_technique: false,
            moyens_suffisants: false,
            observations_faisabilite: "",
            questionnaire_vigilance_complete: false,
            pieces_identite_verifiees: false,
            origine_fonds_comprise: false,
            observations_lbc: "",
            client_suivi_autre_cabinet: false,
            info_confrere_demandee: false,
            litige_confrere: false,
            observations_ancien_cabinet: "",
            type_client: "",
            decision: "",
            signature_expert: "",
            date_signature: "",
            observations_generales: "",
          });
        }
      } catch (err: any) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedClientId]);

  const handleChange = (field: keyof AcceptationData, value: any) => {
    if (formData) {
      setFormData({ ...formData, [field]: value });
    }
  };

  const saveForm = async () => {
    if (!formData || !selectedClientId) return;
    setSaving(true);
    try {
      const dataToSave = { ...formData };
      if (dataToSave.date_signature === "") {
        dataToSave.date_signature = null as any;
      }

      const existing = await dbApi.list<AcceptationData>(
        "acceptation_mission",
        {
          filters: { client_id: selectedClientId },
          limit: 500,
        },
      );

      if (existing.length > 0) {
        await dbApi.update(
          "acceptation_mission",
          existing[0].id as string,
          dataToSave,
        );
      } else {
        await dbApi.create("acceptation_mission", dataToSave);
      }
      notify.success("Formulaire d'acceptation sauvegardé !");
    } catch (err: any) {
      console.error(err);
      notify.error("Erreur : " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const cancel = async () => {
    if (!selectedClientId) return;
    setLoading(true);
    try {
      const data = await dbApi.list<AcceptationData>("acceptation_mission", {
        filters: { client_id: selectedClientId },
        limit: 500,
      });
      if (data.length > 0) {
        setFormData(data[0]);
      } else {
        setFormData({
          client_id: selectedClientId,
          rencontre_client: false,
          presentation_obtenue: false,
          observations_connaissance: "",
          risque_activite: "",
          risque_structure: "",
          risque_si_comptable: "",
          risque_org_comptable: "",
          risque_historique_fiscal: "",
          risque_historique_social: "",
          observations_risques: "",
          repartition_taches_define: false,
          volume_ecritures_estime: false,
          specificites_identifiees: false,
          delais_identifies: false,
          observations_besoins: "",
          cabinet_independant: false,
          competence_technique: false,
          moyens_suffisants: false,
          observations_faisabilite: "",
          questionnaire_vigilance_complete: false,
          pieces_identite_verifiees: false,
          origine_fonds_comprise: false,
          observations_lbc: "",
          client_suivi_autre_cabinet: false,
          info_confrere_demandee: false,
          litige_confrere: false,
          observations_ancien_cabinet: "",
          type_client: "",
          decision: "",
          signature_expert: "",
          date_signature: "",
          observations_generales: "",
        });
      }
    } catch (err: any) {
      console.error(err);
      notify.error("Erreur annulation : " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const exportExcel = () => {
    if (!formData || !clientData) return;

    const rows: any[] = [];
    rows.push(["ACCEPTATION ET MAINTIEN DE MISSION"]);
    rows.push([]);
    rows.push(["Client", clientData.name, "Code", clientData.client_code]);
    rows.push([]);
    rows.push(["1. PRISE DE CONNAISSANCE DU CLIENT"]);
    rows.push(["Le cabinet a-t-il rencontré le client ?", formData.rencontre_client ? "Oui" : "Non"]);
    rows.push(["Une présentation a-t-elle été obtenue ?", formData.presentation_obtenue ? "Oui" : "Non"]);
    rows.push(["Observations", formData.observations_connaissance || ""]);
    rows.push([]);
    rows.push(["2. ANALYSE DES RISQUES"]);
    rows.push(["Activité", formData.risque_activite || ""]);
    rows.push(["Structure juridique", formData.risque_structure || ""]);
    rows.push(["SI comptable", formData.risque_si_comptable || ""]);
    rows.push(["Organisation comptable", formData.risque_org_comptable || ""]);
    rows.push(["Historique fiscal", formData.risque_historique_fiscal || ""]);
    rows.push(["Historique social", formData.risque_historique_social || ""]);
    rows.push(["Observations", formData.observations_risques || ""]);
    rows.push([]);
    rows.push(["3. ANALYSE DES BESOINS"]);
    rows.push(["Répartition des tâches définie ?", formData.repartition_taches_define ? "Oui" : "Non"]);
    rows.push(["Volume d'écritures estimé ?", formData.volume_ecritures_estime ? "Oui" : "Non"]);
    rows.push(["Spécificités identifiées ?", formData.specificites_identifiees ? "Oui" : "Non"]);
    rows.push(["Délais identifiés ?", formData.delais_identifies ? "Oui" : "Non"]);
    rows.push(["Observations", formData.observations_besoins || ""]);
    rows.push([]);
    rows.push(["4. FAISABILITÉ"]);
    rows.push(["Cabinet indépendant ?", formData.cabinet_independant ? "Oui" : "Non"]);
    rows.push(["Compétence technique ?", formData.competence_technique ? "Oui" : "Non"]);
    rows.push(["Moyens suffisants ?", formData.moyens_suffisants ? "Oui" : "Non"]);
    rows.push(["Observations", formData.observations_faisabilite || ""]);
    rows.push([]);
    rows.push(["5. CONFORMITÉ LBC/FT"]);
    rows.push(["Questionnaire vigilance complété ?", formData.questionnaire_vigilance_complete ? "Oui" : "Non"]);
    rows.push(["Pièces d'identité vérifiées ?", formData.pieces_identite_verifiees ? "Oui" : "Non"]);
    rows.push(["Origine des fonds comprise ?", formData.origine_fonds_comprise ? "Oui" : "Non"]);
    rows.push(["Observations", formData.observations_lbc || ""]);
    rows.push([]);
    rows.push(["6. RELATION AVEC UN ANCIEN CABINET"]);
    rows.push(["Client suivi par un autre cabinet ?", formData.client_suivi_autre_cabinet ? "Oui" : "Non"]);
    rows.push(["Information du confrère demandée ?", formData.info_confrere_demandee ? "Oui" : "Non"]);
    rows.push(["Litige avec le précédent cabinet ?", formData.litige_confrere ? "Oui" : "Non"]);
    rows.push(["Observations", formData.observations_ancien_cabinet || ""]);
    rows.push([]);
    rows.push(["7. DÉCISION"]);
    rows.push(["Type de client", formData.type_client === "nouveau" ? "Nouveau client" : formData.type_client === "ancien" ? "Ancien client" : ""]);
    rows.push(["Décision", formData.decision || ""]);
    rows.push([]);
    rows.push(["SIGNATURE"]);
    rows.push(["Expert-comptable", formData.signature_expert || ""]);
    rows.push(["Date", formData.date_signature || ""]);
    rows.push([]);
    rows.push(["OBSERVATIONS GÉNÉRALES"]);
    rows.push([formData.observations_generales || ""]);

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Acceptation");
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], { type: "application/octet-stream" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Acceptation_mission_${clientData.name}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  const renderCheckbox = (field: keyof AcceptationData, label: string) => {
    if (!formData) return null;
    return (
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          className="manuel-checkbox"
          checked={(formData[field] as boolean) || false}
          onChange={(e) => handleChange(field, e.target.checked)}
        />
        {label && <span className="text-sm text-app-primary">{label}</span>}
      </div>
    );
  };

  const renderRiskRadio = (field: keyof AcceptationData) => {
    if (!formData) return null;
    const value = (formData[field] as string) || "";
    return (
      <div className="manuel-radio-group">
        {(["E", "M", "F"] as const).map((opt) => (
          <label key={opt} className={cn("manuel-radio-label", value === opt && "checked")}>
            <input type="radio" checked={value === opt} onChange={() => handleChange(field, opt)} />
            {opt}
          </label>
        ))}
      </div>
    );
  };

  if (loading && clients.length === 0) {
    return <div className="manuel-loading"><p>Chargement...</p></div>;
  }

  if (error) {
    return <div className="manuel-page"><p className="text-error-600 dark:text-error-400">Erreur : {error}</p></div>;
  }

  if (!formData || !clientData) {
    return <div className="manuel-page"><p className="text-app-secondary">Sélectionnez un client pour commencer.</p></div>;
  }

  const sections = [
    { title: "1. PRISE DE CONNAISSANCE DU CLIENT", fields: [
      { label: "Le cabinet a-t-il rencontré le client et compris son activité ?", field: "rencontre_client" as const },
      { label: "Une présentation de l'entreprise a-t-elle été obtenue ?", field: "presentation_obtenue" as const },
    ], obs: "observations_connaissance" as const },
    { title: "2. ANALYSE DES RISQUES CLIENT", fields: [
      { label: "Activité (secteur, complexité, informel)", field: "risque_activite" as const, radio: true },
      { label: "Structure juridique et gouvernance", field: "risque_structure" as const, radio: true },
      { label: "Fiabilité du SI comptable", field: "risque_si_comptable" as const, radio: true },
      { label: "Organisation comptable interne", field: "risque_org_comptable" as const, radio: true },
      { label: "Historique fiscal (DGI)", field: "risque_historique_fiscal" as const, radio: true },
      { label: "Historique social (CNPS)", field: "risque_historique_social" as const, radio: true },
    ], obs: "observations_risques" as const },
    { title: "3. ANALYSE DES BESOINS DU CLIENT", fields: [
      { label: "Répartition des tâches définie ?", field: "repartition_taches_define" as const },
      { label: "Volume d'écritures estimé ?", field: "volume_ecritures_estime" as const },
      { label: "Spécificités fiscales/comptables (OHADA) identifiées ?", field: "specificites_identifiees" as const },
      { label: "Délais spécifiques identifiés ?", field: "delais_identifies" as const },
    ], obs: "observations_besoins" as const },
    { title: "4. FAISABILITÉ DE LA MISSION", fields: [
      { label: "Le cabinet est-il indépendant du client ?", field: "cabinet_independant" as const },
      { label: "Le cabinet a-t-il la compétence technique nécessaire ?", field: "competence_technique" as const },
      { label: "Les moyens humains et matériels sont-ils suffisants ?", field: "moyens_suffisants" as const },
    ], obs: "observations_faisabilite" as const },
    { title: "5. CONFORMITÉ – LBC / FT", fields: [
      { label: "Questionnaire de vigilance client complété ?", field: "questionnaire_vigilance_complete" as const },
      { label: "Pièces d'identité du dirigeant vérifiées ?", field: "pieces_identite_verifiees" as const },
      { label: "Origine de l'activité et des fonds comprise ?", field: "origine_fonds_comprise" as const },
    ], obs: "observations_lbc" as const },
    { title: "6. RELATION AVEC UN ANCIEN CABINET", fields: [
      { label: "Le client est-il suivi par un autre expert-comptable ?", field: "client_suivi_autre_cabinet" as const },
      { label: "Si oui : information du confrère demandée ?", field: "info_confrere_demandee" as const },
      { label: "Y a-t-il opposition ou litige avec le précédent cabinet ?", field: "litige_confrere" as const },
    ], obs: "observations_ancien_cabinet" as const },
  ];

  return (
    <div className="manuel-page">
      <div className="manuel-selectors">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-app-secondary">Client :</span>
          <select
            className="manuel-select"
            value={selectedClientId ?? ""}
            onChange={(e) => setSelectedClientId(e.target.value)}
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name} ({c.client_code})</option>
            ))}
          </select>
        </div>
        <button className="manuel-btn-export" onClick={exportExcel}>
          <i className="fas fa-file-excel"></i> Exporter Excel
        </button>
      </div>

      <div className="manuel-header">
        <h2 className="manuel-title"><i className="fas fa-file-signature"></i> Acceptation et maintien de mission</h2>
        <div className="flex gap-2.5 items-center">
          <span className="badge badge-success">{clientData.status || "Actif"}</span>
          {clientData.niveau_risque && (
            <span className={cn("badge", clientData.niveau_risque === "Faible" ? "badge-primary" : clientData.niveau_risque === "Moyen" ? "badge-warning" : "badge-error")}>
              Risque {clientData.niveau_risque}
            </span>
          )}
        </div>
      </div>

      <div className="manuel-subtitle mb-4">
        <strong className="text-app-primary">{clientData.name}</strong> · {clientData.client_code}
      </div>

      {sections.map((section) => (
        <div key={section.title} className="manuel-section">
          <h3 className="manuel-section-title">🔹 {section.title}</h3>
          <div className="manuel-grid">
            {section.fields.map((f) => (
              <React.Fragment key={f.field}>
                <span className="manuel-grid-label">{f.label}</span>
                <div>{f.radio ? renderRiskRadio(f.field) : renderCheckbox(f.field, "")}</div>
                <div></div>
                <div></div>
              </React.Fragment>
            ))}
          </div>
          <div className="mt-2">
            <textarea
              className="manuel-textarea"
              placeholder="Observations…"
              value={(formData as any)[section.obs] || ""}
              onChange={(e) => handleChange(section.obs, e.target.value)}
            />
          </div>
        </div>
      ))}

      <div className="manuel-section">
        <h3 className="manuel-section-title">🔹 7. DÉCISION D'ACCEPTATION</h3>
        <div className="mb-3">
          <span className="text-sm text-app-secondary font-medium">Type de client :</span>
          <div className="manuel-decision-group">
            {[
              { val: "nouveau", label: "Nouveau client" },
              { val: "ancien", label: "Ancien client" },
            ].map((opt) => (
              <label key={opt.val} className={cn("manuel-decision-label", formData.type_client === opt.val && "checked")}>
                <input type="radio" checked={formData.type_client === opt.val} onChange={() => handleChange("type_client", opt.val)} />
                {opt.label}
              </label>
            ))}
          </div>
        </div>
        <div>
          <span className="text-sm text-app-secondary font-medium">Décision :</span>
          <div className="manuel-decision-group">
            {[
              { val: "accepter", label: "J'accepte la mission comptable", enable: "nouveau" },
              { val: "refuser", label: "Je refuse la mission comptable", enable: "nouveau" },
              { val: "maintenir", label: "Je maintiens la mission", enable: "ancien" },
              { val: "ne_pas_maintenir", label: "Je ne maintiens pas la mission", enable: "ancien" },
            ].map((opt) => (
              <label key={opt.val} className={cn("manuel-decision-label", formData.decision === opt.val && "checked")}>
                <input
                  type="radio"
                  checked={formData.decision === opt.val}
                  onChange={() => handleChange("decision", opt.val)}
                  disabled={formData.type_client !== opt.enable}
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="manuel-section" style={{ borderLeftColor: "#22c55e" }}>
        <h3 className="manuel-section-title" style={{ color: "#22c55e" }}>✍️ SIGNATURE</h3>
        <div className="manuel-signature-row">
          <div className="flex-1">
            <label className="manuel-field-label">Expert-comptable</label>
            <input
              className="manuel-signature-input"
              placeholder="Nom et signature"
              value={formData.signature_expert || ""}
              onChange={(e) => handleChange("signature_expert", e.target.value)}
            />
          </div>
          <div className="flex-1">
            <label className="manuel-field-label">Date</label>
            <input
              className="manuel-signature-input"
              type="date"
              value={formData.date_signature || ""}
              onChange={(e) => handleChange("date_signature", e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="manuel-section">
        <h3 className="manuel-section-title">📝 OBSERVATIONS GÉNÉRALES</h3>
        <textarea
          className="manuel-textarea"
          placeholder="Observations générales…"
          value={formData.observations_generales || ""}
          onChange={(e) => handleChange("observations_generales", e.target.value)}
          style={{ minHeight: "80px" }}
        />
      </div>

      <div className="manuel-button-group">
        <button className="manuel-btn manuel-btn-primary" onClick={saveForm} disabled={saving}>
          {saving ? "Sauvegarde..." : "ENREGISTRER"}
        </button>
        <button className="manuel-btn manuel-btn-secondary" onClick={cancel} disabled={saving}>
          ANNULER
        </button>
      </div>
    </div>
  );
};

export default AcceptationMission;
