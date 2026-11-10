// src/components/InvoicePDF.tsx
import { Page, Document, StyleSheet, View, Text } from "@react-pdf/renderer";
import { formatNumber } from "../lib/invoiceUtils";
import { BANK_DETAILS, COMPANY_INFO } from "../lib/constants";

const styles = StyleSheet.create({
  page: { padding: 30, fontFamily: "Helvetica", fontSize: 10 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
    borderBottom: "1px solid #ccc",
    paddingBottom: 8,
  },
  companySection: { width: "60%" },
  companyName: { fontSize: 13, fontWeight: "bold", marginBottom: 3 },
  companyDetails: { fontSize: 9, color: "#444" },
  invoiceSection: { width: "35%", textAlign: "right" },
  invoiceNumber: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1e3a5f",
    marginBottom: 5,
  },
  clientBankRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
    borderBottom: "1px solid #ccc",
    paddingBottom: 8,
  },
  clientBox: { width: "45%" },
  bankBox: {
    width: "45%",
    backgroundColor: "#f0f9ff",
    padding: 8,
    borderRadius: 6,
  },
  sectionTitle: { fontSize: 11, fontWeight: "bold", marginBottom: 5 },
  label: { fontSize: 9, fontWeight: "bold", marginBottom: 2 },
  text: { fontSize: 9, color: "#444", marginBottom: 2 },
  table: { width: "100%", marginTop: 8, marginBottom: 8 },
  tableHeader: {
    backgroundColor: "#f1f5f9",
    flexDirection: "row",
    borderBottom: "1px solid #ccc",
    paddingVertical: 4,
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "1px solid #eee",
    paddingVertical: 4,
  },
  tableCell: { fontSize: 9, paddingHorizontal: 4, textAlign: "left" },
  mission: { width: "15%" },
  prestation: { width: "15%" },
  honorairesDesc: { width: "15%" },
  unite: { width: "8%", textAlign: "center" },
  taux: { width: "8%", textAlign: "center" },
  montant: { width: "14%", textAlign: "right" },
  comment: { width: "15%", textAlign: "left" },
  retenueDesc: { width: "60%" },
  totalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 4,
    paddingVertical: 2,
  },
  totalLabel: {
    fontSize: 10,
    fontWeight: "bold",
    width: 110,
    textAlign: "right",
    marginRight: 10,
  },
  totalValue: {
    fontSize: 10,
    fontWeight: "bold",
    width: 90,
    textAlign: "right",
  },
  blueBox: {
    backgroundColor: "#eff6ff",
    padding: 6,
    borderRadius: 4,
    marginTop: 6,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  signature: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
    borderTop: "1px solid #ccc",
    paddingTop: 10,
  },
  footer: {
    textAlign: "center",
    fontSize: 8,
    color: "#64748b",
    marginTop: 15,
    borderTop: "1px solid #eee",
    paddingTop: 8,
  },
});

const splitDesignation = (desig: string) => {
  const parts = (desig || "").split("||");
  return [parts[0] || "", parts[1] || "", parts[2] || ""];
};

export const InvoicePDF = ({ invoiceData }: { invoiceData: any }) => {
  const honors = invoiceData.lines.filter(
    (l: any) => l.section === "HONORAIRES",
  );
  const retenues = invoiceData.lines.filter(
    (l: any) => l.section === "RETENUS",
  );
  const debours = invoiceData.lines.filter((l: any) => l.section === "DEBOURS");

  const honoraires_total = honors.reduce(
    (s: number, l: any) => s + (l.montant || 0),
    0,
  );
  const retenus_total = retenues.reduce(
    (s: number, l: any) => s + (l.montant || 0),
    0,
  );
  const debours_total = debours.reduce(
    (s: number, l: any) => s + (l.montant || 0),
    0,
  );

  const total_ht = honoraires_total;
  const tva_amount = honoraires_total * 0.1925;
  const total_ttc = total_ht + tva_amount;

  const docType = invoiceData.type_document || "FACTURE";
  const isCredit = docType === "AVOIR";
  const final_ttc = isCredit
    ? -(total_ttc + retenus_total + debours_total)
    : total_ttc + retenus_total + debours_total;

  const titleMap: Record<string, string> = {
    FACTURE: "FACTURE",
    "PRO-FORMA": "PRO-FORMA",
    AVOIR: "AVOIR",
  };
  const title = titleMap[docType] || "FACTURE";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.companySection}>
            <Text style={styles.companyName}>{COMPANY_INFO.name}</Text>
            <Text style={styles.companyDetails}>
              EXPERTS COMPTABLES INTERNATIONAUX MANAGEMENT AUDIT ADVISORY
            </Text>
            <Text style={styles.companyDetails}>{COMPANY_INFO.tagline}</Text>
            <Text style={styles.companyDetails}>{COMPANY_INFO.address}</Text>
            <Text style={styles.companyDetails}>Tel: {COMPANY_INFO.phone}</Text>
            <Text style={styles.companyDetails}>
              Email: {COMPANY_INFO.email}
            </Text>
            {COMPANY_INFO.bp && (
              <Text style={styles.companyDetails}>BP: {COMPANY_INFO.bp}</Text>
            )}
          </View>
          <View style={styles.invoiceSection}>
            <Text style={styles.invoiceNumber}>{title}</Text>
            <Text style={styles.companyDetails}>
              N° {invoiceData.invoice_number}
            </Text>
            {isCredit && (
              <Text style={{ fontSize: 9, color: "#cc0000" }}>(Avoir)</Text>
            )}
            <Text style={styles.companyDetails}>
              Date:{" "}
              {new Date(invoiceData.date_emission).toLocaleDateString("fr-FR")}
            </Text>
          </View>
        </View>

        {/* Client + Bank Details */}
        <View style={styles.clientBankRow}>
          <View style={styles.clientBox}>
            <Text style={styles.label}>Client</Text>
            <Text style={styles.text}>
              {invoiceData.client_details_snapshot?.name}
            </Text>
            {invoiceData.client_details_snapshot?.address_bp && (
              <Text style={styles.text}>
                BP: {invoiceData.client_details_snapshot.address_bp}
              </Text>
            )}
            {invoiceData.client_details_snapshot?.nui && (
              <Text style={styles.text}>
                NUI: {invoiceData.client_details_snapshot.nui}
              </Text>
            )}
            {invoiceData.client_details_snapshot?.rccm && (
              <Text style={styles.text}>
                RCCM: {invoiceData.client_details_snapshot.rccm}
              </Text>
            )}
          </View>
          <View style={styles.bankBox}>
            <Text style={styles.label}>Coordonnées Bancaires</Text>
            {BANK_DETAILS.bank && (
              <Text style={styles.text}>{BANK_DETAILS.bank}</Text>
            )}
            {BANK_DETAILS.account_number && (
              <Text style={styles.text}>
                N° Compte: {BANK_DETAILS.account_number}
              </Text>
            )}
            {BANK_DETAILS.iban && (
              <Text style={styles.text}>IBAN: {BANK_DETAILS.iban}</Text>
            )}
            {BANK_DETAILS.residenceFiscal && (
              <Text style={styles.text}>
                Résidence fiscale: {BANK_DETAILS.residenceFiscal}
              </Text>
            )}
          </View>
        </View>

        {/* Honoraires Table */}
        {honors.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Honoraires</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableCell, styles.mission]}>MISSION</Text>
                <Text style={[styles.tableCell, styles.prestation]}>
                  PRESTATION
                </Text>
                <Text style={[styles.tableCell, styles.honorairesDesc]}>
                  HONORAIRES
                </Text>
                <Text style={[styles.tableCell, styles.unite]}>Unité</Text>
                <Text style={[styles.tableCell, styles.taux]}>Taux (%)</Text>
                <Text style={[styles.tableCell, styles.montant]}>
                  Montant ({invoiceData.currency})
                </Text>
                <Text style={[styles.tableCell, styles.comment]}>Accompte</Text>
              </View>
              {honors.map((line: any) => {
                const [mission, prestation, honorairesText] = splitDesignation(
                  line.designation,
                );
                return (
                  <View style={styles.tableRow} key={line.id}>
                    <Text style={[styles.tableCell, styles.mission]}>
                      {mission}
                    </Text>
                    <Text style={[styles.tableCell, styles.prestation]}>
                      {prestation}
                    </Text>
                    <Text style={[styles.tableCell, styles.honorairesDesc]}>
                      {honorairesText}
                    </Text>
                    <Text style={[styles.tableCell, styles.unite]}>
                      {formatNumber(line.unite || 0)}
                    </Text>
                    <Text style={[styles.tableCell, styles.taux]}>
                      {line.taux || 0}%
                    </Text>
                    <Text style={[styles.tableCell, styles.montant]}>
                      {formatNumber(line.montant)}
                    </Text>
                    <Text style={[styles.tableCell, styles.comment]}>
                      {line.comments || "—"}
                    </Text>
                  </View>
                );
              })}
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total HT :</Text>
                <Text style={styles.totalValue}>
                  {formatNumber(total_ht)} {invoiceData.currency}
                </Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>TVA (19.25%) :</Text>
                <Text style={styles.totalValue}>
                  {formatNumber(tva_amount)} {invoiceData.currency}
                </Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total TTC :</Text>
                <Text style={styles.totalValue}>
                  {formatNumber(total_ttc)} {invoiceData.currency}
                </Text>
              </View>
            </View>
          </>
        )}

        {/* Retenues Table */}
        {retenues.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 10 }]}>
              Retenues
            </Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableCell, styles.retenueDesc]}>
                  Désignation
                </Text>
                <Text style={[styles.tableCell, styles.unite]}>Unité</Text>
                <Text style={[styles.tableCell, styles.taux]}>Taux (%)</Text>
                <Text style={[styles.tableCell, styles.montant]}>
                  Montant ({invoiceData.currency})
                </Text>
              </View>
              {retenues.map((line: any) => (
                <View style={styles.tableRow} key={line.id}>
                  <Text style={[styles.tableCell, styles.retenueDesc]}>
                    {line.designation}
                  </Text>
                  <Text style={[styles.tableCell, styles.unite]}>
                    {formatNumber(line.unite || 0)}
                  </Text>
                  <Text style={[styles.tableCell, styles.taux]}>
                    {line.taux || 0}%
                  </Text>
                  <Text style={[styles.tableCell, styles.montant]}>
                    {formatNumber(line.montant)}
                  </Text>
                </View>
              ))}
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total Retenues :</Text>
                <Text style={styles.totalValue}>
                  {formatNumber(retenus_total)} {invoiceData.currency}
                </Text>
              </View>
            </View>
          </>
        )}

        {/* Débours Table */}
        {debours.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 10 }]}>
              Débours
            </Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableCell, styles.retenueDesc]}>
                  Désignation
                </Text>
                <Text style={[styles.tableCell, styles.unite]}>Unité</Text>
                <Text style={[styles.tableCell, styles.taux]}>Taux (%)</Text>
                <Text style={[styles.tableCell, styles.montant]}>
                  Montant ({invoiceData.currency})
                </Text>
              </View>
              {debours.map((line: any) => (
                <View style={styles.tableRow} key={line.id}>
                  <Text style={[styles.tableCell, styles.retenueDesc]}>
                    {line.designation}
                  </Text>
                  <Text style={[styles.tableCell, styles.unite]}>
                    {formatNumber(line.unite || 0)}
                  </Text>
                  <Text style={[styles.tableCell, styles.taux]}>
                    {line.taux || 0}%
                  </Text>
                  <Text style={[styles.tableCell, styles.montant]}>
                    {formatNumber(line.montant)}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Final totals */}
        <View style={{ marginTop: 10, alignItems: "flex-end" }}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Débours :</Text>
            <Text style={styles.totalValue}>
              {formatNumber(debours_total)} {invoiceData.currency}
            </Text>
          </View>
          <View
            style={
              isCredit
                ? [styles.blueBox, { backgroundColor: "#fee2e2" }]
                : styles.blueBox
            }
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: "bold",
                color: isCredit ? "#cc0000" : "#1e3a5f",
              }}
            >
              Montant {isCredit ? " (Avoir)" : ""} TTC :{" "}
            </Text>
            <Text
              style={{
                fontSize: 11,
                fontWeight: "bold",
                color: isCredit ? "#cc0000" : "#1e3a5f",
              }}
            >
              {formatNumber(final_ttc)} {invoiceData.currency}
            </Text>
          </View>
          {invoiceData.payment_method && (
            <Text style={{ marginTop: 6, fontSize: 9 }}>
              Mode de paiement : {invoiceData.payment_method}
            </Text>
          )}
        </View>

        {/* Signatures */}
        <View style={styles.signature}>
          <View>
            <Text style={styles.label}>Signature EXCI-MAA :</Text>
            <View
              style={{
                width: 150,
                height: 1,
                backgroundColor: "#cbd5e1",
                marginTop: 4,
              }}
            />
          </View>
          <View>
            <Text style={styles.label}>Signature du client :</Text>
            <View
              style={{
                width: 150,
                height: 1,
                backgroundColor: "#cbd5e1",
                marginTop: 4,
              }}
            />
          </View>
        </View>

        <Text style={styles.footer}>
          Document généré automatiquement par EXCI-MAA – Système de facturation
          professionnelle
        </Text>
      </Page>
    </Document>
  );
};
