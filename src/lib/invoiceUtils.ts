import { TVA_RATE } from './constants';
import { supabase } from './supabase';

export type LineSection = 'HONORAIRES' | 'RETENUS' | 'DEBOURS';

export type InvoiceLine = {
  id?: string;
  section: LineSection;
  designation: string;
  unite: number | null;
  taux: number | null;
  montant: number;
  sort_order: number;
  comments?: string;
};

export type InvoiceTotals = {
  totalHT: number;
  totalTTC: number;
  totalRetenues: number;
  totalDebours: number;
  totalGeneral: number;
  tva: number;
};

export function buildUserInitials(firstName: string, lastName: string): string {
  const names = `${firstName || ''} ${lastName || ''}`.trim().split(/\s+/).filter(Boolean);
  return names.map((name) => name.charAt(0).toUpperCase()).join('');
}

export function generateRefPF(firstName: string, lastName: string, dateEmission: string): string {
  const initials = buildUserInitials(firstName, lastName);
  const d = new Date(dateEmission);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${initials}${day}${month}${year}`;
}

export async function getNextInvoiceSequence(initials: string, month: number): Promise<number> {
  try {
    const prefix = `EXCIMAA/FAC${String(month).padStart(2, '0')}/${(initials || 'XX').toUpperCase()}/`;
    const { data, error } = await supabase
      .from('invoices')
      .select('invoice_number')
      .like('invoice_number', `${prefix}%`);

    if (error) {
      console.error('Error fetching invoice sequences:', error);
      return 1;
    }

    if (!data || data.length === 0) {
      return 1;
    }

    const sequences = data
      .map((invoice) => {
        const match = invoice.invoice_number?.match(/\/([0-9]+)$/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter((seq) => !Number.isNaN(seq));

    const maxSequence = sequences.length > 0 ? Math.max(...sequences) : 0;
    return maxSequence + 1;
  } catch (error) {
    console.error('Error in getNextInvoiceSequence:', error);
    return 1;
  }
}

export async function getNextRefPFSequence(refPFBase: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select('ref_pf')
      .like('ref_pf', `${refPFBase}-%`);

    if (error) {
      console.error('Error fetching ref_pf sequences:', error);
      return 1;
    }

    if (!data || data.length === 0) {
      return 1;
    }

    const sequences = data
      .map(invoice => {
        const match = invoice.ref_pf.match(new RegExp(`^${refPFBase}-(\\d+)$`));
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter(seq => !isNaN(seq));

    const maxSequence = sequences.length > 0 ? Math.max(...sequences) : 0;
    return maxSequence + 1;
  } catch (error) {
    console.error('Error in getNextRefPFSequence:', error);
    return 1;
  }
}

// ✅ computeTotals avec paramètre typeDocument
export function computeTotals(lines: InvoiceLine[], acompteRegle: number, typeDocument: string): InvoiceTotals {
  const honoraireLines = lines.filter(l => l.section === 'HONORAIRES');
  const retenuLines = lines.filter(l => l.section === 'RETENUS');
  const debourLines = lines.filter(l => l.section === 'DEBOURS');

  const totalHT = honoraireLines.reduce((s, l) => s + (l.montant || 0), 0);
  const tva = totalHT * TVA_RATE;
  const totalTTC = totalHT + tva;

  const totalRetenues = retenuLines.reduce((s, l) => s + (l.montant || 0), 0);
  const totalDebours = debourLines.reduce((s, l) => s + (l.montant || 0), 0);

  let totalGeneral = totalTTC + totalRetenues + totalDebours - acompteRegle;
  // Si Avoir => total négatif
  if (typeDocument === 'AVOIR') {
    totalGeneral = -totalGeneral;
  }

  return { totalHT, tva, totalTTC, totalRetenues, totalDebours, totalGeneral };
}


export function computeLineMontant(line: InvoiceLine, totalHT: number): number {
  if (line.section === 'HONORAIRES') {
    return (line.unite || 0) * (line.taux || 0) / 100;
  }
  if (line.section === 'DEBOURS') {
    return (line.unite || 0) * (line.taux || 0);
  }
  if (line.section === 'RETENUS') {
    return -(totalHT * (line.taux || 0));
  }
  return 0;
}

export function formatNumber(n: number, decimals = 0): string {
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(n);
}

export type InvoiceClient = {
  id: string;
  client_code: string;
  name: string;
  address_bp: string;
  nui: string;
  rccm: string;
  contract_ref: string;
};

export function mapSystemClient(row: Record<string, unknown>): InvoiceClient {
  const id = String(row.id ?? '');
  const name = String(row.name ?? 'Client');
  return {
    id,
    client_code: String(row.client_code ?? row.tax_number ?? id.slice(0, 8).toUpperCase()),
    name,
    address_bp: String(row.address_bp ?? row.address ?? ''),
    nui: String(row.nui ?? row.tax_number ?? ''),
    rccm: String(row.rccm ?? ''),
    contract_ref: String(row.contract_ref ?? ''),
  };
}

export function getInvoiceUserNames(
  profile: { first_name?: string; last_name?: string } | null | undefined,
  user: { user_metadata?: Record<string, unknown>; email?: string } | null | undefined,
): { firstName: string; lastName: string } {
  const meta = user?.user_metadata ?? {};
  const firstName = String(
    profile?.first_name ?? meta.first_name ?? meta.firstName ?? user?.email?.split('@')[0] ?? '',
  );
  const lastName = String(profile?.last_name ?? meta.last_name ?? meta.lastName ?? '');
  return { firstName, lastName };
}