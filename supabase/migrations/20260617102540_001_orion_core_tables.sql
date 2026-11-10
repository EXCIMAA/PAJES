/*
# PAJES Hotel Operations — Core Tables

Creates the foundational tables for the PAJES hotel operations management platform.
This is a single-tenant application without user authentication — all data is shared/public.

1. New Tables
- `inventory_items`: Tracks hotel inventory items including linen, F&B, equipment, amenities, supplies, spa, safety, and maintenance items.
  - id (uuid, PK), name, sku, category, quantity, unit, location, status, value, last_counted, created_at, updated_at
- `findings`: Operational findings and issues discovered during audits or daily operations.
  - id (uuid, PK), title, severity, status, category, location, assignee, description, created_at, updated_at
- `reports`: Generated operational reports across audit, inventory, compliance, and performance types.
  - id (uuid, PK), title, type, status, author, pages, created_at, updated_at
- `team_members`: Hotel operations team members and their status.
  - id (uuid, PK), name, role, department, status, avatar, tasks_completed, tasks_pending, email, created_at, updated_at
- `activity_log`: Timeline of operational activities for the dashboard feed.
  - id (uuid, PK), type, title, description, user_name, created_at

2. Indexes
- inventory_items: idx on status, category, sku (unique)
- findings: idx on severity, status, category
- reports: idx on type, status
- team_members: idx on department, status
- activity_log: idx on created_at (desc), type

3. Security
- RLS enabled on all tables.
- Single-tenant: all tables use `TO anon, authenticated` with `USING (true)` / `WITH CHECK (true)` since the data is intentionally shared/public (no auth).
*/

-- Inventory Items
CREATE TABLE IF NOT EXISTS inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sku text UNIQUE NOT NULL,
  category text NOT NULL,
  quantity integer NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'units',
  location text NOT NULL,
  status text NOT NULL DEFAULT 'in_stock' CHECK (status IN ('in_stock', 'low_stock', 'out_of_stock', 'expired')),
  value numeric NOT NULL DEFAULT 0,
  last_counted timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_status ON inventory_items(status);
CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory_items(category);

ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_inventory" ON inventory_items;
CREATE POLICY "anon_select_inventory" ON inventory_items FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_inventory" ON inventory_items;
CREATE POLICY "anon_insert_inventory" ON inventory_items FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_inventory" ON inventory_items;
CREATE POLICY "anon_update_inventory" ON inventory_items FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_inventory" ON inventory_items;
CREATE POLICY "anon_delete_inventory" ON inventory_items FOR DELETE TO anon, authenticated USING (true);

-- Findings
CREATE TABLE IF NOT EXISTS findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  category text NOT NULL,
  location text NOT NULL,
  assignee text,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_findings_severity ON findings(severity);
CREATE INDEX IF NOT EXISTS idx_findings_status ON findings(status);
CREATE INDEX IF NOT EXISTS idx_findings_category ON findings(category);

ALTER TABLE findings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_findings" ON findings;
CREATE POLICY "anon_select_findings" ON findings FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_findings" ON findings;
CREATE POLICY "anon_insert_findings" ON findings FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_findings" ON findings;
CREATE POLICY "anon_update_findings" ON findings FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_findings" ON findings;
CREATE POLICY "anon_delete_findings" ON findings FOR DELETE TO anon, authenticated USING (true);

-- Reports
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  type text NOT NULL DEFAULT 'audit' CHECK (type IN ('audit', 'inventory', 'compliance', 'performance')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_review', 'approved', 'published')),
  author text NOT NULL,
  pages integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reports_type ON reports(type);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_reports" ON reports;
CREATE POLICY "anon_select_reports" ON reports FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_reports" ON reports;
CREATE POLICY "anon_insert_reports" ON reports FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_reports" ON reports;
CREATE POLICY "anon_update_reports" ON reports FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_reports" ON reports;
CREATE POLICY "anon_delete_reports" ON reports FOR DELETE TO anon, authenticated USING (true);

-- Team Members
CREATE TABLE IF NOT EXISTS team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  role text NOT NULL,
  department text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'away', 'offline')),
  avatar text NOT NULL,
  tasks_completed integer NOT NULL DEFAULT 0,
  tasks_pending integer NOT NULL DEFAULT 0,
  email text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_team_department ON team_members(department);
CREATE INDEX IF NOT EXISTS idx_team_status ON team_members(status);

ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_team" ON team_members;
CREATE POLICY "anon_select_team" ON team_members FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_team" ON team_members;
CREATE POLICY "anon_insert_team" ON team_members FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_team" ON team_members;
CREATE POLICY "anon_update_team" ON team_members FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_team" ON team_members;
CREATE POLICY "anon_delete_team" ON team_members FOR DELETE TO anon, authenticated USING (true);

-- Activity Log
CREATE TABLE IF NOT EXISTS activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('inventory', 'finding', 'approval', 'comment', 'assignment', 'report')),
  title text NOT NULL,
  description text,
  user_name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_type ON activity_log(type);

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_activity" ON activity_log;
CREATE POLICY "anon_select_activity" ON activity_log FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_activity" ON activity_log;
CREATE POLICY "anon_insert_activity" ON activity_log FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_activity" ON activity_log;
CREATE POLICY "anon_update_activity" ON activity_log FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_activity" ON activity_log;
CREATE POLICY "anon_delete_activity" ON activity_log FOR DELETE TO anon, authenticated USING (true);
