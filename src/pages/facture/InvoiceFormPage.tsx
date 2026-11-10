// src/pages/InvoiceFormPage.tsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, X, Save, Trash2 } from "lucide-react";
import { addNotification } from "../../lib/notifications";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { useCountry } from "../../contexts/CountryContext";
import {
  RETENUES_RATES,
  PAYMENT_METHODS,
  BANK_DETAILS,
} from "../../lib/constants";
import {
  InvoiceLine,
  computeTotals,
  formatNumber,
  generateRefPF,
  getNextInvoiceSequence,
  getNextRefPFSequence,
  mapSystemClient,
  getInvoiceUserNames,
  buildUserInitials,
  type InvoiceClient,
} from "../../lib/invoiceUtils";

export default function InvoiceFormPage() {
  const { id: invoiceId } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { selectedCountry } = useCountry();

  const [clients, setClients] = useState<InvoiceClient[]>([]);
  const [selectedClient, setSelectedClient] = useState<InvoiceClient | null>(
    null,
  );
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [refPf, setRefPf] = useState("");
  const [dateContrat, setDateContrat] = useState("");
  // 👇 UN SEUL SELECT avec 3 options
  const [typeDocument, setTypeDocument] = useState<
    "FACTURE" | "PRO-FORMA" | "AVOIR"
  >("FACTURE");
  const [lines, setLines] = useState<InvoiceLine[]>([]);
  const [acompteRegle, setAcompteRegle] = useState(0);
  const [paymentMethods, setPaymentMethods] = useState<string[]>(["virement"]);
  const [signatureCompany, setSignatureCompany] = useState(
    profile?.first_name || "",
  );
  const [signatureClient, setSignatureClient] = useState("");
  const [saving, setSaving] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ✅ Passage de typeDocument à computeTotals
  const totals = computeTotals(lines, acompteRegle, typeDocument);
  const { firstName, lastName } = getInvoiceUserNames(profile, user);

  const generateReference = async () => {
    if (!firstName || !invoiceDate) return;
    const baseRef = generateRefPF(firstName, lastName, invoiceDate);
    const sequence = await getNextRefPFSequence(baseRef);
    setRefPf(`${baseRef}-${String(sequence).padStart(3, "0")}`);
  };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!user) {
        setInitializing(false);
        return;
      }

      setInitializing(true);
      setError(null);

      try {
        const { data: clientRows, error: clientsError } = await supabase
          .from("clients")
          .select("*")
          .order("name");

        if (clientsError) throw new Error(clientsError.message);

        const loadedClients = (clientRows || []).map((row) =>
          mapSystemClient(row as Record<string, unknown>),
        );
        if (cancelled) return;
        setClients(loadedClients);

        if (invoiceId) {
          const invRes = await supabase
            .from("invoices")
            .select("*")
            .eq("id", invoiceId)
            .maybeSingle();

          if (invRes.error) throw new Error(invRes.error.message);

          const linesRes = await supabase
            .from("invoice_lines")
            .select("*")
            .eq("invoice_id", invoiceId)
            .order("sort_order");

          if (linesRes.error) throw new Error(linesRes.error.message);

          if (invRes.data) {
            const inv = invRes.data;
            setInvoiceDate(inv.date_emission);
            setRefPf(inv.ref_pf || "");
            setDateContrat(inv.date_contrat || "");
            setTypeDocument(inv.type_document || "FACTURE");
            setAcompteRegle(inv.acompte_regle || 0);
            setPaymentMethods([inv.payment_method]);
            setSignatureCompany(inv.signature_company || "");
            setSignatureClient(inv.signature_client || "");

            const clientMatch = loadedClients.find(
              (c) => c.id === inv.client_id,
            );
            if (clientMatch) setSelectedClient(clientMatch);
          }

          setLines((linesRes.data || []) as InvoiceLine[]);
        } else {
          setLines([
            {
              section: "HONORAIRES",
              designation: "",
              unite: 0,
              taux: 0,
              montant: 0,
              sort_order: 0,
              comments: "",
            },
          ]);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Erreur de chargement");
        }
      } finally {
        if (!cancelled) setInitializing(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [invoiceId, user]);

  useEffect(() => {
    if (!invoiceId && firstName && invoiceDate) {
      void generateReference();
    }
  }, [invoiceDate, firstName, lastName, invoiceId]);

  const addLine = (section: "HONORAIRES" | "RETENUS" | "DEBOURS") => {
    const maxSort = Math.max(...lines.map((l) => l.sort_order || 0), -1);
    setLines([
      ...lines,
      {
        section,
        designation: "",
        unite: null,
        taux: null,
        montant: 0,
        sort_order: maxSort + 1,
        comments: "",
      },
    ]);
  };

  const updateLine = (idx: number, field: keyof InvoiceLine, value: any) => {
    const updated = [...lines];
    updated[idx] = { ...updated[idx], [field]: value };

    if (field === "unite" || field === "taux") {
      if (updated[idx].section === "HONORAIRES") {
        updated[idx].montant =
          ((updated[idx].unite || 0) * (updated[idx].taux || 0)) / 100;
      } else if (updated[idx].section === "DEBOURS") {
        updated[idx].montant =
          (updated[idx].unite || 0) * (updated[idx].taux || 0);
      }
    }
    if (field === "taux" && updated[idx].section === "RETENUS") {
      updated[idx].montant = -(totals.totalHT * (updated[idx].taux || 0));
    }

    setLines(updated);
  };

  const removeLine = (idx: number) => {
    setLines(lines.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (!user || !selectedClient) return;
    setSaving(true);
    setError(null);

    try {
      const invoiceDateObj = new Date(invoiceDate);
      const month = invoiceDateObj.getMonth() + 1;
      const initials = (
        profile?.initials ||
        buildUserInitials(firstName, lastName) ||
        "XX"
      ).toUpperCase();
      const invoiceNumber = invoiceId
        ? undefined
        : `EXCIMAA/FAC${String(month).padStart(2, "0")}/${initials || "XX"}/${String(
            await getNextInvoiceSequence(initials || "XX", month),
          ).padStart(7, "0")}`;

      const invoiceData: any = {
        ...(invoiceNumber && { invoice_number: invoiceNumber }),
        date_emission: invoiceDate,
        client_id: selectedClient.id,
        client_details_snapshot: {
          name: selectedClient.name,
          address_bp: selectedClient.address_bp,
          nui: selectedClient.nui,
          rccm: selectedClient.rccm,
          contract_ref: selectedClient.contract_ref,
        },
        currency: selectedCountry.currency,
        country: selectedCountry.code,
        ref_pf: refPf,
        date_contrat: dateContrat || null,
        type_document: typeDocument, // 👈 UN SEUL CHAMP
        total_ht: totals.totalHT,
        total_tva: totals.tva,
        total_ttc: totals.totalTTC,
        total_retenues: totals.totalRetenues,
        total_debours: totals.totalDebours,
        total_general: totals.totalGeneral,
        acompte_regle: acompteRegle,
        payment_method: paymentMethods[0] || "virement",
        signature_company: signatureCompany,
        signature_client: signatureClient,
        status: "draft",
        created_by: user.id,
      };

      if (invoiceId) {
        const { error: updateError } = await supabase
          .from("invoices")
          .update(invoiceData)
          .eq("id", invoiceId);
        if (updateError) throw updateError;
        for (const line of lines) {
          if (line.id) {
            const { error: lineError } = await supabase
              .from("invoice_lines")
              .update(line)
              .eq("id", line.id);
            if (lineError) throw lineError;
          } else {
            const { error: insertError } = await supabase
              .from("invoice_lines")
              .insert({ ...line, invoice_id: invoiceId });
            if (insertError) throw insertError;
          }
        }
        void addNotification({
          title: "Facture mise à jour",
          message: `La facture ${invoiceId} a été mise à jour.`,
          type: "invoice",
        });
      } else {
        const { data: inv, error: insertError } = await supabase
          .from("invoices")
          .insert(invoiceData)
          .select()
          .maybeSingle();
        if (insertError) throw insertError;
        if (inv) {
          for (const line of lines) {
            const { error: lineError } = await supabase
              .from("invoice_lines")
              .insert({ ...line, invoice_id: inv.id });
            if (lineError) throw lineError;
          }
          void addNotification({
            title: "Nouvelle facture créée",
            message: `La ${typeDocument === "AVOIR" ? "avoir" : typeDocument === "PRO-FORMA" ? "pro‑forma" : "facture"} ${inv.invoice_number || inv.ref_pf || "a été créée"} a été enregistrée.`,
            type: "invoice",
          });
        }
      }

      setSaving(false);
      navigate("/factures");
    } catch (err: any) {
      console.error("Erreur lors de l'enregistrement:", err);
      setError(err.message || "Erreur lors de l'enregistrement de la facture");
      setSaving(false);
    }
  };

  if (initializing && invoiceId) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
      </div>
    );
  }

  const splitDesignation = (desig: string) => {
    if (!desig) return ["", "", ""];
    const parts = desig.split("||");
    return [parts[0] || "", parts[1] || "", parts[2] || ""];
  };

  const combineDesignation = (
    mission: string,
    prestation: string,
    honoraires: string,
  ) => {
    return [mission, prestation, honoraires]
      .filter((s) => s.trim() !== "")
      .join("||");
  };

  const typeLabels = {
    FACTURE: "Facture",
    "PRO-FORMA": "Pro‑forma",
    AVOIR: "Avoir",
  };

  return (
    <div className="page-container max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">
            {invoiceId ? "Modifier" : "Nouvelle"}{" "}
            {typeLabels[typeDocument].toLowerCase()}
          </h1>
          {refPf && (
            <p className="text-sm text-slate-300 mt-1 font-mono">{refPf}</p>
          )}
        </div>
        <button
          onClick={() => navigate("/factures")}
          className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
        >
          <X size={24} />
        </button>
      </div>

      <div className="card p-6 space-y-6 border-slate-700/50">
        {error && (
          <div className="p-4 bg-error-500/10 border border-error-500/30 rounded-lg">
            <p className="text-sm text-error-400 font-medium">Erreur</p>
            <p className="text-xs text-error-300/80 mt-1">{error}</p>
          </div>
        )}
        {initializing && !invoiceId && (
          <p className="text-xs text-slate-400">Chargement des clients...</p>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 pb-6 border-b border-slate-700/50">
          <div>
            <label className="block text-xs font-medium text-white mb-1">
              Client
            </label>
            <select
              value={selectedClient?.id || ""}
              onChange={(e) =>
                setSelectedClient(
                  clients.find((c) => c.id === e.target.value) || null,
                )
              }
              disabled={initializing}
              className="input-md w-full bg-white text-black"
            >
              <option value="">Sélectionner un client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.client_code} — {c.name}
                </option>
              ))}
            </select>
            {clients.length === 0 && !initializing && (
              <p className="text-xs text-amber-400 mt-1">
                Aucun client. Ajoutez-en depuis la page Clients.
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-white mb-1">
              Date d'émission
            </label>
            <input
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              className="input-md w-full bg-white text-black"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-white mb-1">
              Référence
            </label>
            <input
              type="text"
              value={refPf || "Génération..."}
              readOnly
              className="input-md w-full bg-slate-800/60 font-mono text-primary-300"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-white mb-1">
              Date contrat
            </label>
            <input
              type="date"
              value={dateContrat}
              onChange={(e) => setDateContrat(e.target.value)}
              className="input-md w-full bg-white text-black"
            />
          </div>
          {/* 👇 UN SEUL SELECT */}
          <div>
            <label className="block text-xs font-medium text-white mb-1">
              Type de document
            </label>
            <select
              value={typeDocument}
              onChange={(e) =>
                setTypeDocument(
                  e.target.value as "FACTURE" | "PRO-FORMA" | "AVOIR",
                )
              }
              className="input-md w-full bg-white text-black"
            >
              <option value="FACTURE">Facture</option>
              <option value="PRO-FORMA">Pro‑forma</option>
              <option value="AVOIR">Avoir</option>
            </select>
          </div>
        </div>

        {selectedClient && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pb-6 border-b border-slate-700/50 bg-slate-800/40 p-4 rounded-lg">
            <div>
              <p className="text-xs text-slate-300">BP / Adresse</p>
              <p className="text-sm font-medium text-white">
                {selectedClient.address_bp || "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-300">NUI</p>
              <p className="text-sm font-medium text-white">
                {selectedClient.nui || "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-300">RCCM</p>
              <p className="text-sm font-medium text-white">
                {selectedClient.rccm || "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-300">Réf. Contrat</p>
              <p className="text-sm font-medium text-white">
                {selectedClient.contract_ref || "—"}
              </p>
            </div>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-white">HONORAIRES</h3>
            <button
              onClick={() => addLine("HONORAIRES")}
              className="flex items-center gap-1 text-xs text-primary-300 hover:text-primary-200"
            >
              <Plus size={14} /> Ajouter
            </button>
          </div>
          <div className="space-y-4 mb-4">
            {lines
              .filter((l) => l.section === "HONORAIRES")
              .map((line, idx) => {
                const lineIdx = lines.indexOf(line);
                const [mission, prestation, honorairesText] = splitDesignation(
                  line.designation,
                );
                return (
                  <div key={idx} className="border-b border-slate-700/50 pb-2">
                    <div className="flex flex-wrap items-end gap-2">
                      <input
                        type="text"
                        value={mission}
                        onChange={(e) =>
                          updateLine(
                            lineIdx,
                            "designation",
                            combineDesignation(
                              e.target.value,
                              prestation,
                              honorairesText,
                            ),
                          )
                        }
                        className="flex-1 px-3 py-2 border border-slate-600 rounded-lg text-sm bg-white text-black focus:ring-2 focus:ring-primary-500"
                        placeholder="MISSION"
                      />
                      <input
                        type="text"
                        value={prestation}
                        onChange={(e) =>
                          updateLine(
                            lineIdx,
                            "designation",
                            combineDesignation(
                              mission,
                              e.target.value,
                              honorairesText,
                            ),
                          )
                        }
                        className="flex-1 px-3 py-2 border border-slate-600 rounded-lg text-sm bg-white text-black focus:ring-2 focus:ring-primary-500"
                        placeholder="PRESTATION"
                      />
                      <input
                        type="text"
                        value={honorairesText}
                        onChange={(e) =>
                          updateLine(
                            lineIdx,
                            "designation",
                            combineDesignation(
                              mission,
                              prestation,
                              e.target.value,
                            ),
                          )
                        }
                        className="flex-1 px-3 py-2 border border-slate-600 rounded-lg text-sm bg-white text-black focus:ring-2 focus:ring-primary-500"
                        placeholder="HONORAIRES"
                      />
                      <input
                        type="number"
                        value={line.unite || ""}
                        onChange={(e) =>
                          updateLine(
                            lineIdx,
                            "unite",
                            parseFloat(e.target.value) || null,
                          )
                        }
                        className="w-20 px-2 py-2 border border-slate-600 rounded-lg text-sm bg-white text-black"
                        placeholder="Unité"
                      />
                      <div className="relative">
                        <input
                          type="number"
                          value={line.taux || ""}
                          onChange={(e) =>
                            updateLine(
                              lineIdx,
                              "taux",
                              parseFloat(e.target.value) || null,
                            )
                          }
                          className="w-20 px-2 py-2 pr-6 border border-slate-600 rounded-lg text-sm bg-white text-black"
                          placeholder="Taux"
                        />
                        <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-slate-500">
                          %
                        </span>
                      </div>
                      <div className="w-24 px-3 py-2 bg-slate-800 rounded-lg text-sm font-medium text-white">
                        {formatNumber(line.montant, 2)}
                      </div>
                      <button
                        onClick={() => removeLine(lineIdx)}
                        className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="mt-2">
                      <input
                        type="text"
                        value={line.comments || ""}
                        onChange={(e) =>
                          updateLine(lineIdx, "comments", e.target.value)
                        }
                        className="w-full px-3 py-2 text-sm border border-slate-600 rounded-lg bg-white text-black focus:ring-2 focus:ring-primary-500"
                        placeholder="Accompte (commentaire)"
                      />
                    </div>
                  </div>
                );
              })}
          </div>

          <div className="bg-slate-800/60 p-4 rounded-lg mb-4 space-y-2">
            <div className="flex justify-between text-sm text-white">
              <span>Total HONORAIRES HT:</span>
              <span className="font-semibold">
                {formatNumber(totals.totalHT, 2)}{" "}
                {selectedCountry.currencySymbol}
              </span>
            </div>
            <div className="flex justify-between text-sm text-white">
              <span>TVA (19.25%):</span>
              <span className="font-semibold">
                {formatNumber(totals.tva, 2)} {selectedCountry.currencySymbol}
              </span>
            </div>
            <div className="flex justify-between text-sm font-bold border-t border-slate-600 pt-2 text-white">
              <span>Total HONORAIRES TTC(A):</span>
              <span className="text-primary-400">
                {formatNumber(totals.totalTTC, 2)}{" "}
                {selectedCountry.currencySymbol}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-white">RETENUES</h3>
            <button
              onClick={() => addLine("RETENUS")}
              className="flex items-center gap-1 text-xs text-primary-300 hover:text-primary-200"
            >
              <Plus size={14} /> Ajouter
            </button>
          </div>
          <div className="space-y-2 mb-4">
            {lines
              .filter((l) => l.section === "RETENUS")
              .map((line, idx) => {
                const lineIdx = lines.indexOf(line);
                return (
                  <div key={idx} className="flex items-end gap-2">
                    <input
                      type="text"
                      value={line.designation}
                      onChange={(e) =>
                        updateLine(lineIdx, "designation", e.target.value)
                      }
                      className="flex-1 px-3 py-2 border border-slate-600 rounded-lg text-sm bg-white text-black"
                      placeholder="Désignation"
                    />
                    <select
                      value={line.taux || ""}
                      onChange={(e) =>
                        updateLine(
                          lineIdx,
                          "taux",
                          parseFloat(e.target.value) || null,
                        )
                      }
                      className="w-32 px-2 py-2 border border-slate-600 rounded-lg text-sm bg-white text-black"
                    >
                      <option value="">Sélectionner</option>
                      {RETENUES_RATES.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                    <div className="w-24 px-3 py-2 bg-slate-800 rounded-lg text-sm font-medium text-red-400">
                      {formatNumber(line.montant, 2)}
                    </div>
                    <button
                      onClick={() => removeLine(lineIdx)}
                      className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
          </div>

          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-white">DÉBOURS</h3>
            <button
              onClick={() => addLine("DEBOURS")}
              className="flex items-center gap-1 text-xs text-primary-300 hover:text-primary-200"
            >
              <Plus size={14} /> Ajouter
            </button>
          </div>
          <div className="space-y-2 mb-4">
            {lines
              .filter((l) => l.section === "DEBOURS")
              .map((line, idx) => {
                const lineIdx = lines.indexOf(line);
                return (
                  <div key={idx} className="flex items-end gap-2">
                    <input
                      type="text"
                      value={line.designation}
                      onChange={(e) =>
                        updateLine(lineIdx, "designation", e.target.value)
                      }
                      className="flex-1 px-3 py-2 border border-slate-600 rounded-lg text-sm bg-white text-black"
                      placeholder="Désignation"
                    />
                    <input
                      type="number"
                      value={line.unite || ""}
                      onChange={(e) =>
                        updateLine(
                          lineIdx,
                          "unite",
                          parseFloat(e.target.value) || null,
                        )
                      }
                      className="w-20 px-2 py-2 border border-slate-600 rounded-lg text-sm bg-white text-black"
                      placeholder="Unité"
                    />
                    <input
                      type="number"
                      value={line.taux || ""}
                      onChange={(e) =>
                        updateLine(
                          lineIdx,
                          "taux",
                          parseFloat(e.target.value) || null,
                        )
                      }
                      className="w-20 px-2 py-2 border border-slate-600 rounded-lg text-sm bg-white text-black"
                      placeholder="Qté/Taux"
                    />
                    <div className="w-24 px-3 py-2 bg-slate-800 rounded-lg text-sm font-medium text-white">
                      {formatNumber(line.montant, 2)}
                    </div>
                    <button
                      onClick={() => removeLine(lineIdx)}
                      className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-slate-800/60 p-4 rounded-lg">
              <p className="text-xs text-slate-300 mb-1">Total Débours(C)</p>
              <p className="text-lg font-bold text-orange-400">
                {formatNumber(totals.totalDebours, 2)}
              </p>
            </div>
            <div className="bg-slate-800/60 p-4 rounded-lg">
              <p className="text-xs text-slate-300 mb-1">Total Retenues(B)</p>
              <p className="text-lg font-bold text-red-400">
                {formatNumber(totals.totalRetenues, 2)}
              </p>
            </div>
            <div className="bg-slate-800/60 p-4 rounded-lg">
              <p className="text-xs text-slate-300 mb-1">Acompte réglé</p>
              <input
                type="number"
                value={acompteRegle}
                onChange={(e) =>
                  setAcompteRegle(parseFloat(e.target.value) || 0)
                }
                className="w-full px-2 py-1 border border-slate-600 rounded text-sm bg-white text-black"
              />
            </div>
          </div>

          <div className="bg-primary-900/30 p-4 rounded-lg border-2 border-primary-500/50">
            <p className="text-sm text-slate-300 mb-1">Total général à payer</p>
            <p
              className={`text-3xl font-bold ${totals.totalGeneral < 0 ? "text-red-400" : "text-primary-300"}`}
            >
              {formatNumber(totals.totalGeneral, 2)}{" "}
              {selectedCountry.currencySymbol}
            </p>
            {typeDocument === "AVOIR" && (
              <p className="text-xs text-amber-400 mt-1">
                (Avoir - montant négatif)
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-6 border-b border-slate-700/50">
          <div>
            <label className="block text-xs font-medium text-white mb-2">
              Mode de paiement
            </label>
            <div className="space-y-2">
              {PAYMENT_METHODS.map((m) => (
                <label
                  key={m.value}
                  className="flex items-center gap-2 cursor-pointer text-white"
                >
                  <input
                    type="checkbox"
                    checked={paymentMethods.includes(m.value)}
                    onChange={(e) =>
                      setPaymentMethods(
                        e.target.checked
                          ? [...paymentMethods, m.value]
                          : paymentMethods.filter((p) => p !== m.value),
                      )
                    }
                    className="rounded"
                  />
                  <span className="text-sm">{m.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="bg-slate-800/60 p-4 rounded-lg">
            <p className="text-xs font-medium text-white mb-2">
              Détails bancaires
            </p>
            <div className="text-xs space-y-1 text-slate-300">
              <p>
                <span className="font-medium text-white">Banque:</span>{" "}
                {BANK_DETAILS.bank}
              </p>
              <p>
                <span className="font-medium text-white">IBAN:</span>{" "}
                {BANK_DETAILS.iban}
              </p>
              <p>
                <span className="font-medium text-white">RCCM:</span>{" "}
                {BANK_DETAILS.rccm}
              </p>
              <p>
                <span className="font-medium text-white">NIU:</span>{" "}
                {BANK_DETAILS.nui}
              </p>
              <p>
                <span className="font-medium text-white">
                  Résidence fiscale:
                </span>{" "}
                {BANK_DETAILS.residenceFiscal}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-medium text-white mb-1">
              Signature EXCI-MAA
            </label>
            <input
              type="text"
              value={signatureCompany}
              onChange={(e) => setSignatureCompany(e.target.value)}
              className="w-full px-3 py-2 border border-slate-600 rounded-lg text-sm bg-white text-black"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-white mb-1">
              Signature client
            </label>
            <input
              type="text"
              value={signatureClient}
              onChange={(e) => setSignatureClient(e.target.value)}
              className="w-full px-3 py-2 border border-slate-600 rounded-lg text-sm bg-white text-black"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-4 border-t border-slate-700/50">
          <button
            onClick={() => navigate("/factures")}
            className="flex-1 px-4 py-2.5 text-white hover:bg-slate-700/50 rounded-lg font-medium transition-all"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !selectedClient}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-60 transition-all"
          >
            {saving ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save size={16} />
            )}
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}
