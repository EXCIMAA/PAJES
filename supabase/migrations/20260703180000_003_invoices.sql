-- Invoices & invoice lines for EXCI-MAA billing module

CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text NOT NULL,
  ref_pf text,
  date_emission date NOT NULL DEFAULT CURRENT_DATE,
  date_contrat date,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  client_details_snapshot jsonb DEFAULT '{}'::jsonb,
  currency text NOT NULL DEFAULT 'XAF',
  country text NOT NULL DEFAULT 'CM',
  invoice_type text NOT NULL DEFAULT 'FACTURE' CHECK (invoice_type IN ('FACTURE', 'PRO-FORMA')),
  total_ht numeric(14, 2) NOT NULL DEFAULT 0,
  total_tva numeric(14, 2) NOT NULL DEFAULT 0,
  total_ttc numeric(14, 2) NOT NULL DEFAULT 0,
  total_retenues numeric(14, 2) NOT NULL DEFAULT 0,
  total_debours numeric(14, 2) NOT NULL DEFAULT 0,
  total_general numeric(14, 2) NOT NULL DEFAULT 0,
  acompte_regle numeric(14, 2) NOT NULL DEFAULT 0,
  payment_method text DEFAULT 'virement',
  signature_company text,
  signature_client text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'cancelled', 'pending')),
  archived boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_country ON invoices(country);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_ref_pf ON invoices(ref_pf);
CREATE INDEX IF NOT EXISTS idx_invoices_archived ON invoices(archived);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at DESC);

CREATE TABLE IF NOT EXISTS invoice_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  section text NOT NULL CHECK (section IN ('HONORAIRES', 'RETENUS', 'DEBOURS')),
  designation text NOT NULL DEFAULT '',
  unite numeric(14, 4),
  taux numeric(14, 4),
  montant numeric(14, 2) NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  comments text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoice_lines_invoice_id ON invoice_lines(invoice_id);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_invoices" ON invoices;
CREATE POLICY "anon_select_invoices" ON invoices FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_invoices" ON invoices;
CREATE POLICY "anon_insert_invoices" ON invoices FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_invoices" ON invoices;
CREATE POLICY "anon_update_invoices" ON invoices FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_invoices" ON invoices;
CREATE POLICY "anon_delete_invoices" ON invoices FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_select_invoice_lines" ON invoice_lines;
CREATE POLICY "anon_select_invoice_lines" ON invoice_lines FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_invoice_lines" ON invoice_lines;
CREATE POLICY "anon_insert_invoice_lines" ON invoice_lines FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_invoice_lines" ON invoice_lines;
CREATE POLICY "anon_update_invoice_lines" ON invoice_lines FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_invoice_lines" ON invoice_lines;
CREATE POLICY "anon_delete_invoice_lines" ON invoice_lines FOR DELETE TO anon, authenticated USING (true);
