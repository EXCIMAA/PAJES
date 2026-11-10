import { useEffect, useState, useRef } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { Edit2, Download, ArrowLeft } from "lucide-react";
import { addNotification } from "../../lib/notifications";
import { supabase } from "../../lib/supabase";
import { InvoiceTemplate } from "../../components/InvoiceTemplate";
import html2pdf from "html2pdf.js";
import { useAuth } from "../../contexts/AuthContext";

type Invoice = any;
type Line = any;

const statusColors: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  sent: "bg-blue-100 text-blue-700",
  paid: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};
const statusLabels: Record<string, string> = {
  draft: "Brouillon",
  sent: "Envoyée",
  paid: "Payée",
  cancelled: "Annulée",
};

export default function InvoiceDetailPage() {
  const { user } = useAuth();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [totals, setTotals] = useState({
    honoraires_total: 0,
    retenus_total: 0,
    debours_total: 0,
    montant_ht: 0,
    montant_ttc: 0,
    tva: 0,
  });

  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const { data: invoiceData, error: invoiceError } = await supabase
          .from("invoices")
          .select("*")
          .eq("id", id)
          .maybeSingle();

        if (invoiceError) throw new Error(invoiceError.message);
        if (!invoiceData) {
          setInvoice(null);
          return;
        }
        if (cancelled) return;
        setInvoice(invoiceData);

        const { data: linesData, error: linesError } = await supabase
          .from("invoice_lines")
          .select("*")
          .eq("invoice_id", id)
          .order("sort_order");

        if (linesError) throw new Error(linesError.message);

        const finalLines = linesData || [];
        setLines(finalLines);

        const honoraires_total = finalLines
          .filter((l) => l.section === "HONORAIRES")
          .reduce((sum, l) => sum + (l.montant || 0), 0);
        const retenus_total = finalLines
          .filter((l) => l.section === "RETENUS")
          .reduce((sum, l) => sum + (l.montant || 0), 0);
        const debours_total = finalLines
          .filter((l) => l.section === "DEBOURS")
          .reduce((sum, l) => sum + (l.montant || 0), 0);
        const montant_ht = honoraires_total + debours_total - retenus_total;
        const tva = honoraires_total * 0.1925;
        const montant_ttc = montant_ht + tva;

        setTotals({
          honoraires_total,
          retenus_total,
          debours_total,
          montant_ht,
          montant_ttc,
          tva,
        });
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [id, user]);

  useEffect(() => {
    if (
      !loading &&
      invoice &&
      searchParams.get("download") === "1" &&
      printRef.current
    ) {
      void handleDownloadPDF();
    }
  }, [loading, invoice, searchParams]);

  const handleStatusChange = async (newStatus: string) => {
    if (!invoice) return;
    setUpdatingStatus(true);
    const { error } = await supabase
      .from("invoices")
      .update({ status: newStatus })
      .eq("id", invoice.id);
    if (error) {
      console.error("Error updating status:", error);
      alert("Erreur lors de la mise à jour du statut");
    } else {
      setInvoice({ ...invoice, status: newStatus });
      void addNotification({
        title: "Statut de facture mis à jour",
        message: `Le statut de la facture a été changé en ${newStatus}.`,
        type: "invoice",
      });
    }
    setUpdatingStatus(false);
  };

  const handleDownloadPDF = async () => {
    if (!printRef.current) return;

    const element = printRef.current;
    element.classList.add("pdf-print-shrink");
    await new Promise((resolve) => setTimeout(resolve, 100));

    const opt = {
      margin: [0.2, 0.2, 0.2, 0.2] as [number, number, number, number],
      filename: `Facture_${invoice?.invoice_number || id}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: {
        scale: 1.5,
        useCORS: true,
        logging: false,
        letterRendering: true,
      },
      jsPDF: {
        unit: "in",
        format: "a4",
        orientation: "portrait",
        compress: true,
      },
    } as any;

    await html2pdf().set(opt).from(element).save();
    element.classList.remove("pdf-print-shrink");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Facture non trouvée</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <style>{`
        .pdf-print-shrink {
          transform: scale(0.90);
          transform-origin: top left;
          width: 111%;
        }
        .pdf-print-shrink * {
          font-size: 95% !important;
          line-height: 1.2 !important;
        }
        .pdf-print-shrink .text-4xl { font-size: 18px !important; }
        .pdf-print-shrink .text-2xl { font-size: 15px !important; }
        .pdf-print-shrink .text-lg, .pdf-print-shrink .font-semibold { font-size: 11px !important; }
        .pdf-print-shrink table, .pdf-print-shrink td, .pdf-print-shrink th {
          font-size: 10px !important;
          padding: 3px 5px !important;
        }
        .pdf-print-shrink .px-3 { padding-left: 6px !important; padding-right: 6px !important; }
        .pdf-print-shrink .py-2 { padding-top: 4px !important; padding-bottom: 4px !important; }
      `}</style>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <Link
          to="/factures"
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
        >
          <ArrowLeft size={16} /> Retour
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-600">Statut :</span>
            <select
              value={invoice.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              disabled={updatingStatus}
              className={`text-sm font-medium px-3 py-1.5 rounded-full border-0 focus:ring-2 focus:ring-blue-500 cursor-pointer ${
                statusColors[invoice.status] || statusColors.draft
              }`}
            >
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            {updatingStatus && (
              <div className="w-4 h-4 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            )}
          </div>
          <Link
            to={`/factures/${id}/edit`}
            className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-all"
          >
            <Edit2 size={16} /> Modifier
          </Link>
          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-600 rounded-lg text-sm font-medium hover:bg-green-100 transition-all"
          >
            <Download size={16} /> Télécharger PDF
          </button>
        </div>
      </div>

      <div ref={printRef}>
        <InvoiceTemplate invoice={invoice} lines={lines} totals={totals} />
      </div>
    </div>
  );
}
