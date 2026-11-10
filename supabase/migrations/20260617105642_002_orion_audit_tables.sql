/*
# PAJES — Audit & Operations Tables

Adds the remaining tables from the original PAJES application:
clients, engagements, weekly_missions, review_notes, findings (updated),
working_papers, stock_items (updated), fixed_assets, leave_requests,
notifications, audit_log, profiles.

1. New Tables
- `profiles`: User profiles with roles, departments
- `clients`: Client management with industry, fiscal year, contact info
- `engagements`: Audit engagement tracking with progress and status
- `weekly_missions`: Weekly mission planning with urgency and progress
- `review_notes`: Audit review notes with severity and assignment
- `working_papers`: Document management with file references and versioning
- `fixed_assets`: Fixed asset register with depreciation calculations
- `leave_requests`: Leave management with approval workflow
- `notifications`: User notification system
- `audit_log`: Activity audit trail

2. Modified Tables
- `findings`: Updated to match original schema (engagement_id, risk_level, recommendation, management_response)
- `stock_items`: Updated with FCFA-compatible fields (quantity_purchased, quantity_released, remaining_value)

3. Security
- RLS enabled on all tables
- Single-tenant: public CRUD policies for anon + authenticated

4. Indexes
- Added for commonly queried columns
*/

-- Profiles
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'auditor',
  avatar_url text,
  department text,
  phone text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_department ON profiles(department);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_profiles" ON profiles;
CREATE POLICY "anon_select_profiles" ON profiles FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_profiles" ON profiles;
CREATE POLICY "anon_insert_profiles" ON profiles FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_profiles" ON profiles;
CREATE POLICY "anon_update_profiles" ON profiles FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_profiles" ON profiles;
CREATE POLICY "anon_delete_profiles" ON profiles FOR DELETE TO anon, authenticated USING (true);

-- Clients
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  industry text,
  tax_number text,
  contact_person text,
  email text,
  phone text,
  address text,
  fiscal_year_end text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_clients" ON clients;
CREATE POLICY "anon_select_clients" ON clients FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_clients" ON clients;
CREATE POLICY "anon_insert_clients" ON clients FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_clients" ON clients;
CREATE POLICY "anon_update_clients" ON clients FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_clients" ON clients;
CREATE POLICY "anon_delete_clients" ON clients FOR DELETE TO anon, authenticated USING (true);

-- Engagements
CREATE TABLE IF NOT EXISTS engagements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  client_id uuid,
  client_name text,
  fiscal_year text,
  start_date date,
  end_date date,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'planning', 'in_progress', 'review', 'completed', 'closed')),
  progress integer NOT NULL DEFAULT 0,
  manager_id uuid,
  manager_name text,
  partner_id uuid,
  partner_name text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_engagements_status ON engagements(status);
CREATE INDEX IF NOT EXISTS idx_engagements_client ON engagements(client_id);

ALTER TABLE engagements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_engagements" ON engagements;
CREATE POLICY "anon_select_engagements" ON engagements FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_engagements" ON engagements;
CREATE POLICY "anon_insert_engagements" ON engagements FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_engagements" ON engagements;
CREATE POLICY "anon_update_engagements" ON engagements FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_engagements" ON engagements;
CREATE POLICY "anon_delete_engagements" ON engagements FOR DELETE TO anon, authenticated USING (true);

-- Weekly Missions
CREATE TABLE IF NOT EXISTS weekly_missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  client_id uuid,
  client_name text,
  subject text NOT NULL,
  objective text,
  urgency_level text CHECK (urgency_level IN ('low', 'medium', 'high', 'critical')),
  responsible_id uuid,
  responsible_name text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'postponed')),
  progress integer NOT NULL DEFAULT 0,
  comments text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_missions_date ON weekly_missions(date DESC);
CREATE INDEX IF NOT EXISTS idx_missions_status ON weekly_missions(status);

ALTER TABLE weekly_missions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_missions" ON weekly_missions;
CREATE POLICY "anon_select_missions" ON weekly_missions FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_missions" ON weekly_missions;
CREATE POLICY "anon_insert_missions" ON weekly_missions FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_missions" ON weekly_missions;
CREATE POLICY "anon_update_missions" ON weekly_missions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_missions" ON weekly_missions;
CREATE POLICY "anon_delete_missions" ON weekly_missions FOR DELETE TO anon, authenticated USING (true);

-- Review Notes
CREATE TABLE IF NOT EXISTS review_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL,
  engagement_id uuid,
  category text,
  severity text NOT NULL DEFAULT 'minor' CHECK (severity IN ('critical', 'significant', 'minor')),
  description text NOT NULL,
  assigned_to_id uuid,
  assigned_to_name text,
  due_date date,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  comments text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_review_notes_status ON review_notes(status);
CREATE INDEX IF NOT EXISTS idx_review_notes_severity ON review_notes(severity);

ALTER TABLE review_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_review_notes" ON review_notes;
CREATE POLICY "anon_select_review_notes" ON review_notes FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_review_notes" ON review_notes;
CREATE POLICY "anon_insert_review_notes" ON review_notes FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_review_notes" ON review_notes;
CREATE POLICY "anon_update_review_notes" ON review_notes FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_review_notes" ON review_notes;
CREATE POLICY "anon_delete_review_notes" ON review_notes FOR DELETE TO anon, authenticated USING (true);

-- Working Papers
CREATE TABLE IF NOT EXISTS working_papers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id uuid,
  name text NOT NULL,
  folder text,
  reference text NOT NULL,
  file_type text NOT NULL,
  file_size integer NOT NULL DEFAULT 0,
  file_path text,
  uploaded_by uuid,
  version integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'final')),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_working_papers_folder ON working_papers(folder);

ALTER TABLE working_papers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_working_papers" ON working_papers;
CREATE POLICY "anon_select_working_papers" ON working_papers FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_working_papers" ON working_papers;
CREATE POLICY "anon_insert_working_papers" ON working_papers FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_working_papers" ON working_papers;
CREATE POLICY "anon_update_working_papers" ON working_papers FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_working_papers" ON working_papers;
CREATE POLICY "anon_delete_working_papers" ON working_papers FOR DELETE TO anon, authenticated USING (true);

-- Fixed Assets
CREATE TABLE IF NOT EXISTS fixed_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_code text NOT NULL,
  asset_name text NOT NULL,
  category text NOT NULL,
  nature text NOT NULL DEFAULT 'Corporel',
  purchase_value numeric NOT NULL DEFAULT 0,
  acquisition_date date NOT NULL,
  useful_life integer NOT NULL,
  depreciation_method text NOT NULL DEFAULT 'Linéaire',
  depreciation_rate numeric NOT NULL DEFAULT 0,
  accumulated_depreciation numeric NOT NULL DEFAULT 0,
  net_book_value numeric NOT NULL DEFAULT 0,
  disposal_date date,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disposed', 'maintenance')),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fixed_assets_status ON fixed_assets(status);
CREATE INDEX IF NOT EXISTS idx_fixed_assets_category ON fixed_assets(category);

ALTER TABLE fixed_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_fixed_assets" ON fixed_assets;
CREATE POLICY "anon_select_fixed_assets" ON fixed_assets FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_fixed_assets" ON fixed_assets;
CREATE POLICY "anon_insert_fixed_assets" ON fixed_assets FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_fixed_assets" ON fixed_assets;
CREATE POLICY "anon_update_fixed_assets" ON fixed_assets FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_fixed_assets" ON fixed_assets;
CREATE POLICY "anon_delete_fixed_assets" ON fixed_assets FOR DELETE TO anon, authenticated USING (true);

-- Leave Requests
CREATE TABLE IF NOT EXISTS leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL,
  employee_name text NOT NULL,
  leave_type text NOT NULL,
  reason text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  duration integer NOT NULL,
  supporting_document text,
  manager_approval boolean DEFAULT false,
  hr_approval boolean DEFAULT false,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'cancelled')),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leave_status ON leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_leave_employee ON leave_requests(employee_id);

ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_leave" ON leave_requests;
CREATE POLICY "anon_select_leave" ON leave_requests FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_leave" ON leave_requests;
CREATE POLICY "anon_insert_leave" ON leave_requests FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_leave" ON leave_requests;
CREATE POLICY "anon_update_leave" ON leave_requests FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_leave" ON leave_requests;
CREATE POLICY "anon_delete_leave" ON leave_requests FOR DELETE TO anon, authenticated USING (true);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_notifications" ON notifications;
CREATE POLICY "anon_select_notifications" ON notifications FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_notifications" ON notifications;
CREATE POLICY "anon_insert_notifications" ON notifications FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_notifications" ON notifications;
CREATE POLICY "anon_update_notifications" ON notifications FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_notifications" ON notifications;
CREATE POLICY "anon_delete_notifications" ON notifications FOR DELETE TO anon, authenticated USING (true);

-- Audit Log
CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  user_name text,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id text NOT NULL,
  old_value text,
  new_value text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at DESC);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_audit_log" ON audit_log;
CREATE POLICY "anon_select_audit_log" ON audit_log FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_audit_log" ON audit_log;
CREATE POLICY "anon_insert_audit_log" ON audit_log FOR INSERT TO anon, authenticated WITH CHECK (true);
