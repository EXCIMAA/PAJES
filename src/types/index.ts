// src/types/index.ts

export type UserRole =
  // Nouveaux rôles de la matrice
  | 'super_admin'
  | 'assistant_administratif'
  | 'rh'
  | 'responsable_controle_interne'
  | 'responsable_admin_fin'
  | 'associe_gerant'
  | 'directeur_bureau'
  | 'manageur'
  | 'chef_mission'
  | 'superviseur'
  | 'senior_audit'
  | 'senior_expertise'
  | 'junior_audit'
  | 'junior_expertise'
  | 'stagiaires'
  | 'formateur_senior'
  | 'formateur_junior'
  // Anciens rôles conservés pour compatibilité
  | 'partner'
  | 'manager'
  | 'senior_auditor'
  | 'auditor'
  | 'hr_officer'
  | 'stock_manager'
  | 'asset_manager'
  | 'finance_officer'
  | 'read_only';

export type EngagementStatus = 'draft' | 'planning' | 'in_progress' | 'review' | 'completed' | 'closed';

export type ReviewNoteStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type ReviewNoteSeverity = 'minor' | 'significant' | 'critical';

export type LeaveStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'cancelled';

export type AssetStatus = 'active' | 'disposed' | 'maintenance';

export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

export type DocumentCategory = 'ADMINISTRATIVE' | 'PERMANENT' | 'ANNUAL' | 'FISCAL' | 'SOCIAL' | 'AUDIT';

// ✅ ADDED — Profile interface (was missing, causing TS2305)
export interface Profile {
  id: string;
  email?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  role?: UserRole | string;
  active?: boolean;
  hire_date?: string;
  initials?: string;
  avatar_url?: string;
  department?: string;
  phone?: string;
  created_at?: string;
  updated_at?: string;
}

export interface User {
  [key: string]: unknown;
  id: string;
  email: string;
  full_name: string;
  role: UserRole | string;
  avatar_url?: string;
  department?: string;
  phone?: string;
  created_at: string;
}

// ✅ FIXED — removed `[key: string]: unknown` (was causing `{}` errors)
export interface Client {
  id: string;
  name: string;
  industry?: string;
  tax_number?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  fiscal_year_end?: string;
  status: string;
  created_at: string;
}

export interface Engagement {
  [key: string]: unknown;
  id: string;
  code: string;
  client_id: string;
  client_name: string;
  fiscal_year: string;
  start_date?: string;
  end_date?: string;
  status: EngagementStatus;
  progress: number;
  manager_id?: string;
  manager_name?: string;
  partner_id?: string;
  partner_name?: string;
  created_at: string;
}

// ✅ FIXED — removed `[key: string]: unknown` (was causing `{}` errors on subject/objective/comments)
export interface WeeklyMission {
  id: string;
  date: string;
  client_id: string | null;
  client_name: string | null;
  subject: string;
  objective: string | null;
  urgency_level: 'low' | 'medium' | 'high' | 'critical' | null;
  responsible_id: string | null;
  responsible_name: string | null;
  status: 'open' | 'closed' | 'postponed';
  progress: number;
  comments: string | null;
  start_date?: string | null;
  end_date?: string | null;
  created_at: string;
}

export interface ReviewNote {
  [key: string]: unknown;
  id: string;
  reference: string;
  engagement_id: string | null;
  category: string | null;
  severity: ReviewNoteSeverity;
  description: string;
  assigned_to_id: string | null;
  assigned_to_name?: string | null;
  due_date?: string | null;
  status: ReviewNoteStatus;
  comments?: string | null;
  created_at: string;
}

export interface Finding {
  id: string;
  engagement_id?: string;
  finding: string;
  risk_level: string;
  status: string; // mappé depuis 'statut'
  recommendation?: string;
  management_response?: string;
  responsible_person?: string;
  target_date?: string;
  created_by?: string;
  created_at: string;
  updated_at?: string;
}

// ✅ WorkingPaper — déclaration UNIQUE (les 2 versions fusionnées)
export interface WorkingPaper {
  [key: string]: unknown;
  id: string;
  engagement_id: string;
  name: string;
  folder?: string | null;
  reference: string;
  file_type: string;
  file_size: number;
  file_path?: string | null;
  uploaded_by?: string | null;
  version: number;
  status: string;
  created_at: string;
  // Champs optionnels (ancienne version)
  category?: DocumentCategory;
  updated_at?: string;
}

export interface StockItem {
  [key: string]: unknown;
  id: string;
  item_name: string;
  category: string;
  purchase_date: string;
  quantity_purchased: number;
  unit_cost: number;
  total_amount: number;
  quantity_released: number;
  remaining_quantity: number;
  remaining_value: number;
  supplier?: string;
  warehouse?: string;
  status: StockStatus;
  created_at: string;
}

export interface FixedAsset {
  [key: string]: unknown;
  id: string;
  asset_code: string;
  asset_name: string;
  category: string;
  nature: string;
  purchase_value: number;
  acquisition_date: string;
  useful_life: number;
  depreciation_method: string;
  depreciation_rate: number;
  accumulated_depreciation: number;
  net_book_value: number;
  disposal_date?: string;
  status: AssetStatus;
  created_at: string;
}

export interface LeaveRequest {
  [key: string]: unknown;
  id: string;
  employee_id: string;
  employee_name: string;
  leave_type: string;
  reason: string;
  start_date: string;
  end_date: string;
  duration: number;
  supporting_document?: string;
  manager_approval?: boolean;
  hr_approval?: boolean;
  status: LeaveStatus;
  created_at: string;
}

export interface KPIData {
  active_engagements: number;
  open_review_notes: number;
  open_findings: number;
  active_clients: number;
  inventory_value: number;
  asset_value: number;
  employees_on_leave: number;
}

export interface Notification {
  [key: string]: unknown;
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
}

export interface ActivityItem {
  id: string;
  type: 'inventory' | 'finding' | 'approval' | 'comment' | 'assignment' | 'report' | 'engagement' | 'document';
  title: string;
  description: string;
  timestamp: string;
  user: string;
}

export interface AuditLog {
  [key: string]: unknown;
  id: string;
  user_id: string;
  user_name: string;
  action: string;
  entity: string;
  entity_id: string;
  old_value?: string;
  new_value?: string;
  created_at: string;
}

export interface ChartDataPoint {
  name: string;
  value: number;
  secondary?: number;
}

export type SortDirection = 'asc' | 'desc' | null;

export interface ColumnDef<T> {
  key: keyof T & string;
  label: string;
  sortable?: boolean;
  render?: (value: T[keyof T], row: T) => React.ReactNode;
  width?: string;
}

export type WidgetStatus = 'urgent' | 'warning' | 'success' | 'info';

export interface WidgetItem {
  id: string;
  label: string;
  date?: string;
  value?: string | number;
  status: WidgetStatus;
  progression?: number;
}

export interface ManuelWidgetData {
  id: string;
  title: string;
  icon: string;
  summary: string;
  items: WidgetItem[];
  actions: string[];
  filters: string[];
  progress: number;
}

export type EtablissementType =
  | 'siege'
  | 'agence'
  | 'succursale'
  | 'usine'
  | 'magasin'
  | 'bureau'
  | 'entrepot'
  | 'autre';

export interface Etablissement {
  id: string;
  client_id: string;
  code: string; // ex: ETS001
  name: string;
  type: EtablissementType;
  address: string;
  city: string;
  region: string;
  country: string;
  phone: string;
  email: string;
  responsable: string;
  date_ouverture: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
}

export interface EtablissementFormData {
  name: string;
  type: EtablissementType;
  address: string;
  city: string;
  region: string;
  country: string;
  phone: string;
  email: string;
  responsable: string;
  date_ouverture: string;
  is_active: boolean;
}