// src/lib/demoData.ts
// ============================================================
// DONNÉES FICTIVES POUR LE MODE DÉMO
// Aucune connexion Supabase — tout est local
// ============================================================

export const DEMO_DATA: Record<string, any[]> = {
  // ---------- Clients ----------
  clients: [
    { id: "demo-c1", client_code: "DEMO001", name: "Société Alpha SARL", industry: "Industrie", status: "active", created_at: new Date().toISOString() },
    { id: "demo-c2", client_code: "DEMO002", name: "Cabinet Beta SA", industry: "Services", status: "active", created_at: new Date().toISOString() },
    { id: "demo-c3", client_code: "DEMO003", name: "Groupe Gamma", industry: "Commerce", status: "active", created_at: new Date().toISOString() },
    { id: "demo-c4", client_code: "DEMO004", name: "Delta Industries", industry: "Manufacturing", status: "active", created_at: new Date().toISOString() },
  ],

  // ---------- Weekly Missions ----------
  weekly_missions: [
    { id: "demo-m1", subject: "Audit annuel 2026", client_id: "demo-c1", client_name: "Société Alpha SARL", status: "in_progress", progress: 65, created_at: new Date().toISOString() },
    { id: "demo-m2", subject: "Revue de conformité", client_id: "demo-c2", client_name: "Cabinet Beta SA", status: "planning", progress: 30, created_at: new Date().toISOString() },
    { id: "demo-m3", subject: "Mission CAC", client_id: "demo-c3", client_name: "Groupe Gamma", status: "review", progress: 85, created_at: new Date().toISOString() },
    { id: "demo-m4", subject: "Expertise comptable", client_id: "demo-c4", client_name: "Delta Industries", status: "completed", progress: 100, created_at: new Date().toISOString() },
  ],

  // ---------- Review Notes ----------
  review_notes: [
    { id: "demo-rn1", reference: "RN-001", status: "open", severity: "critical", description: "Écart de rapprochement bancaire non justifié", created_at: new Date().toISOString() },
    { id: "demo-rn2", reference: "RN-002", status: "open", severity: "significant", description: "Factures fournisseurs non comptabilisées", created_at: new Date().toISOString() },
    { id: "demo-rn3", reference: "RN-003", status: "in_progress", severity: "minor", description: "Absence de justification pour les frais de déplacement", created_at: new Date().toISOString() },
    { id: "demo-rn4", reference: "RN-004", status: "resolved", severity: "minor", description: "Erreur de codification corrigée", created_at: new Date().toISOString() },
  ],

  // ---------- Findings ----------
  findings: [
    { id: "demo-f1", finding: "Absence de séparation des tâches", risk_level: "high", status: "open", created_at: new Date().toISOString() },
    { id: "demo-f2", finding: "Procédure de validation insuffisante", risk_level: "medium", status: "in_progress", created_at: new Date().toISOString() },
    { id: "demo-f3", finding: "Documentation incomplète", risk_level: "low", status: "closed", created_at: new Date().toISOString() },
  ],

  // ---------- Stock Items ----------
  stock_items: [
    { id: "demo-s1", item_name: "Ramette papier A4", category: "Fournitures", quantity_purchased: 100, quantity_released: 40, remaining_quantity: 60, remaining_value: 180000, created_at: new Date().toISOString() },
    { id: "demo-s2", item_name: "Cartouches encre HP", category: "Fournitures", quantity_purchased: 20, quantity_released: 15, remaining_quantity: 5, remaining_value: 125000, created_at: new Date().toISOString() },
    { id: "demo-s3", item_name: "Classeurs archivage", category: "Fournitures", quantity_purchased: 50, quantity_released: 30, remaining_quantity: 20, remaining_value: 90000, created_at: new Date().toISOString() },
  ],

  // ---------- Fixed Assets ----------
  fixed_assets: [
    { id: "demo-a1", asset_code: "IMM-001", asset_name: "Ordinateur Dell Latitude", purchase_value: 850000, acquisition_date: "2023-01-15", useful_life: 3, status: "Active", created_at: new Date().toISOString() },
    { id: "demo-a2", asset_code: "IMM-002", asset_name: "Imprimante Canon", purchase_value: 450000, acquisition_date: "2024-03-10", useful_life: 5, status: "Active", created_at: new Date().toISOString() },
    { id: "demo-a3", asset_code: "IMM-003", asset_name: "Véhicule utilitaire", purchase_value: 12500000, acquisition_date: "2022-06-20", useful_life: 7, status: "Active", created_at: new Date().toISOString() },
  ],

  // ---------- Leave Requests ----------
  leave_requests: [
    { id: "demo-l1", employee_name: "Jean Dupont", leave_type: "annual", status: "approved", start_date: "2026-08-01", end_date: "2026-08-15", created_at: new Date().toISOString() },
    { id: "demo-l2", employee_name: "Marie Martin", leave_type: "sick", status: "pending", start_date: "2026-09-10", end_date: "2026-09-12", created_at: new Date().toISOString() },
  ],

  // ---------- Notifications ----------
  notifications: [
    { id: "demo-n1", title: "Nouvelle mission assignée", message: "Mission CAC attribuée à Jean Dupont", created_at: new Date().toISOString() },
    { id: "demo-n2", title: "Document retourné", message: "Le client Alpha SARL a retourné 3 documents", created_at: new Date().toISOString() },
    { id: "demo-n3", title: "Validation requise", message: "2 notes de frais en attente de validation", created_at: new Date().toISOString() },
  ],

  // ---------- Expense Reports ----------
  expense_reports: [
    { id: "demo-e1", status: "soumis", amount: 45000, description: "Déplacement Douala-Yaoundé", created_at: new Date().toISOString() },
    { id: "demo-e2", status: "brouillon", amount: 25000, description: "Repas client", created_at: new Date().toISOString() },
    { id: "demo-e3", status: "soumis", amount: 120000, description: "Hébergement mission 3 jours", created_at: new Date().toISOString() },
  ],

  // ---------- Invoices ----------
  invoices: [
    { id: "demo-i1", client_id: "demo-c1", client_details_snapshot: { id: "demo-c1", name: "Société Alpha SARL" }, total_general: 2500000, date_emission: "2026-08-15", status: "paid", archived: false },
    { id: "demo-i2", client_id: "demo-c2", client_details_snapshot: { id: "demo-c2", name: "Cabinet Beta SA" }, total_general: 1800000, date_emission: "2026-08-20", status: "sent", archived: false },
    { id: "demo-i3", client_id: "demo-c3", client_details_snapshot: { id: "demo-c3", name: "Groupe Gamma" }, total_general: 3200000, date_emission: "2026-08-25", status: "paid", archived: false },
    { id: "demo-i4", client_id: "demo-c4", client_details_snapshot: { id: "demo-c4", name: "Delta Industries" }, total_general: 950000, date_emission: "2026-09-01", status: "pending", archived: false },
  ],

  // ---------- Profiles (utilisateurs fictifs) ----------
  profiles: [
    { id: "demo-u1", full_name: "Jean Dupont", email: "jean@demo.com", role: "associe_gerant", department: "Direction", created_at: new Date().toISOString() },
    { id: "demo-u2", full_name: "Marie Martin", email: "marie@demo.com", role: "chef_mission", department: "Audit", created_at: new Date().toISOString() },
    { id: "demo-u3", full_name: "Paul Bernard", email: "paul@demo.com", role: "junior_audit", department: "Audit", created_at: new Date().toISOString() },
  ],
};

// Utilisateur fictif pour le mode démo
export const DEMO_USER = {
  id: "demo-user",
  email: "demo@pajes.com",
  full_name: "Utilisateur Démo",
  role: null, // Pas de rôle → mode view-only
  department: "Démo",
  created_at: new Date().toISOString(),
};