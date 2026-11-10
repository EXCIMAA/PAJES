// =====================================================
// 1. PAYS / DEVISE
// =====================================================
export const COUNTRIES = [
  { code: 'CM', name: 'Cameroun', flag: '🇨🇲', currency: 'XAF', currencySymbol: 'FCFA XAF', clientPrefix: 'C' },
  { code: 'CG', name: 'République du Congo', flag: '🇨🇬', currency: 'XAF', currencySymbol: 'FCFA XAF', clientPrefix: 'RCG' },
  { code: 'CD', name: 'RDC', flag: '🇨🇩', currency: 'CDF', currencySymbol: 'CDF', clientPrefix: 'RDC' },
  { code: 'RW', name: 'Rwanda', flag: '🇷🇼', currency: 'RWF', currencySymbol: 'RWF', clientPrefix: 'RW' },
] as const;

export type CountryCode = 'CM' | 'CG' | 'CD' | 'RW';

// =====================================================
// 2. TAUX / FISCALITÉ
// =====================================================
export const TVA_RATE = 0.1925; // 19.25%
export const RETENUES_RATES = [
  { label: '5.5%', value: 0.055 },
  { label: '2.2%', value: 0.022 },
];

// =====================================================
// 3. MODES DE PAIEMENT
// =====================================================
export const PAYMENT_METHODS = [
  { value: 'Chèque', label: 'Chèque' },
  { value: 'Virement bancaire', label: 'Virement bancaire' },
  { value: 'Espèces', label: 'Espèces' },
];

export const INVOICE_STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  draft: {
    label: 'Brouillon',
    color: 'bg-slate-500/15 text-slate-300 ring-slate-500/30',
    dot: 'bg-slate-400',
  },
  pending: {
    label: 'En attente',
    color: 'bg-amber-500/15 text-amber-300 ring-amber-500/30',
    dot: 'bg-amber-400',
  },
  sent: {
    label: 'Envoyée',
    color: 'bg-sky-500/15 text-sky-300 ring-sky-500/30',
    dot: 'bg-sky-400',
  },
  paid: {
    label: 'Payée',
    color: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
    dot: 'bg-emerald-400',
  },
  cancelled: {
    label: 'Annulée',
    color: 'bg-rose-500/15 text-rose-300 ring-rose-500/30',
    dot: 'bg-rose-400',
  },
};

// =====================================================
// 4. COORDONNÉES BANCAIRES
// =====================================================
export const BANK_DETAILS = {
  bank: 'Société Générale Cameroun - Douala Agence de Bali',
  rccm: 'RC/DLN/2024/063',
  iban: 'CM21 10003 01900 06191457892 74',
  account_number: '06191457892 74',
  nui: 'M032416624505J',
  residenceFiscal: ' CSIPLI WOURI',
};

// =====================================================
// 5. INFORMATIONS DE LA SOCIÉTÉ
// =====================================================
export const COMPANY_INFO = {
  name: 'EXCI-MAA',
  tagline: 'Professionalism in motion',
  address: 'Douala, Cameroun',
  email: 'www.exci-maa.com',
  phone: '+237 698 835 251',
  bp: 'BP: 2606   Immeuble CEDAM à Bali, Douala - République du Cameroun',
  rccm: 'RC/DLN/2024/063',
  nui: 'M032416624505J',
  accName: 'EXCI-MAA - SARL au Capital de 5 000 000 FCFA',
};

// =====================================================
// 6. NAVIGATION (MENU LATÉRAL)
// =====================================================
export const NAV_ITEMS = [
  {
    section: 'Principal',
    items: [
      { id: 'dashboard', label: 'Tableau de bord', icon: 'LayoutDashboard', path: '/' },
    ],
  },
  {
    section: 'Cabinet',
    items: [
      { id: 'note-de-frais', label: 'Notes de frais', icon: 'Receipt', path: '/note-de-frais' },
      { id: 'resources', label: 'Ressources internes', icon: 'FolderOpen', path: '/resources' },
      { id: 'stock', label: 'Stock', icon: 'Package', path: '/stock' },
      { id: 'fixed-assets', label: 'Immobilisations', icon: 'Landmark', path: '/fixed-assets' },
      { id: 'manuel', label: 'Manuel', icon: 'BookOpen', path: '/manuel' },
      { id: 'caisse', label: 'Caisse', icon: 'Wallet', path: '/caisse' },
      { id: 'working-papers', label: 'Besoins cabinet', icon: 'FileText', path: '/working-papers' },
      { id: 'fournisseurs', label: 'Fournisseurs', icon: 'Truck', path: '/fournisseurs' },
      { id: 'factures', label: 'Factures', icon: 'FileText', path: '/factures' },
    ],
  },
  {
    section: 'Missions',
    items: [
      { id: 'missions-cac', label: 'Missions CAC', icon: 'FileText', path: '/missions/cac' },
    ],
  },
  {
    section: 'Opérations',
    items: [
      { id: 'clients', label: 'Clientss', icon: 'Building2', path: '/clients' },
      { id: 'engagements', label: 'Missions', icon: 'Target', path: '/engagements' },
      { id: 'review-notes', label: 'Notes de revue', icon: 'ClipboardCheck', path: '/review-notes' },
      { id: 'findings', label: 'Constats', icon: 'Search', path: '/findings' },
      { id: 'cac-suivi', label: 'Suivi des missions', icon: 'ClipboardList', path: '/cac-suivi' },
    ],
  },
  {
    section: 'Personnel',
    items: [
      { id: 'leave', label: 'Congés', icon: 'CalendarDays', path: '/leave' },
      { id: 'collaborateurs', label: 'Collaborateurs', icon: 'Users', path: '/collaborateurs' },
    ],
  },
  {
    section: 'Administration',
    items: [
      { id: 'team', label: 'Équipe', icon: 'Users', path: '/team' },
      { id: 'reports', label: 'Rapports', icon: 'BarChart3', path: '/reports' },
      { id: 'business-intelligence', label: 'Business Intelligence', icon: 'BarChart3', path: '/business-intelligence' },
      { id: 'notifications', label: 'Notifications', icon: 'Bell', path: '/notifications' },
    ],
  },
] as const;

// =====================================================
// 7. ACTIONS RAPIDES
// =====================================================
export const QUICK_ACTIONS = [
  { id: 'new-engagement', label: 'Nouvelle mission', icon: 'Target', color: 'primary' as const },
  { id: 'new-finding', label: 'Signaler un constat', icon: 'Search', color: 'warning' as const },
  { id: 'stock-in', label: 'Entrée de stock', icon: 'PackagePlus', color: 'emerald' as const },
  { id: 'request-leave', label: 'Demander un congé', icon: 'CalendarDays', color: 'cyan' as const },
  { id: 'upload-paper', label: 'Téléverser document', icon: 'Upload', color: 'royal' as const },
  { id: 'new-expense', label: 'Nouvelle note de frais', icon: 'Receipt', color: 'primary' as const },
  { id: 'new-collaborateur', label: 'Nouveau collaborateur', icon: 'UserPlus', color: 'primary' as const },
  { id: 'new-invoice', label: 'Nouvelle facture', icon: 'FileText', color: 'primary' as const },
] as const;

// =====================================================
// 8. AUTRES CONFIGURATIONS (STATUTS, LABELS, ETC.)
// =====================================================
export const ENGAGEMENT_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: 'Brouillon', color: 'bg-slate-500/15 text-slate-300 ring-slate-500/25' },
  planning: { label: 'Planification', color: 'bg-info-500/15 text-info-500 ring-info-500/25' },
  in_progress: { label: 'En cours', color: 'bg-warning-500/15 text-warning-500 ring-warning-500/25' },
  review: { label: 'Revue', color: 'bg-primary-500/15 text-primary-300 ring-primary-500/25' },
  completed: { label: 'Terminé', color: 'bg-success-500/15 text-success-500 ring-success-500/25' },
  closed: { label: 'Fermé', color: 'bg-slate-500/15 text-slate-300 ring-slate-500/25' },
};

export const URGENCY_CONFIG: Record<string, { label: string; color: string }> = {
  low: { label: 'Faible', color: 'bg-slate-500/15 text-slate-300 ring-slate-500/25' },
  medium: { label: 'Moyen', color: 'bg-info-500/15 text-info-500 ring-info-500/25' },
  high: { label: 'Élevé', color: 'bg-warning-500/15 text-warning-500 ring-warning-500/25' },
  critical: { label: 'Critique', color: 'bg-error-500/15 text-error-500 ring-error-500/25' },
};

export const MISSION_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  open: { label: 'Ouvert', color: 'bg-info-500/15 text-info-500 ring-info-500/25' },
  closed: { label: 'Fermé', color: 'bg-success-500/15 text-success-500 ring-success-500/25' },
  postponed: { label: 'Reporté', color: 'bg-warning-500/15 text-warning-500 ring-warning-500/25' },
};

export const SEVERITY_LABELS: Record<string, string> = {
  critical: 'Critique',
  significant: 'Significatif',
  minor: 'Mineur',
};

export const RISK_LABELS: Record<string, string> = {
  critical: 'Critique',
  high: 'Élevé',
  medium: 'Moyen',
  low: 'Faible',
};

export const LEAVE_TYPE_LABELS: Record<string, string> = {
  annual: 'Congé annuel',
  sick: 'Maladie',
  maternity: 'Maternité',
  personal: 'Personnel',
  unpaid: 'Sans solde',
  permission: 'Permission',
};

export const USER_ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  partner: 'Associé',
  manager: 'Manager',
  senior_auditor: 'Auditeur Senior',
  auditor: 'Auditeur',
  hr_officer: 'Responsable RH',
  stock_manager: 'Gestionnaire Stock',
  asset_manager: 'Gestionnaire Actifs',
  finance_officer: 'Responsable Finance',
  read_only: 'Lecture seule',
  assistant_administratif: 'Assistant Administratif',
  rh: 'RH (Ressources Humaines)',
  responsable_controle_interne: 'Responsable Contrôle Interne et Conformité',
  responsable_admin_fin: 'Responsable Administratif et Financier',
  associe_gerant: 'Associé Gérant',
  directeur_bureau: 'Directeur du Bureau',
  manageur: 'Manager',
  chef_mission: 'Chef de Mission',
  superviseur: 'Superviseur',
  senior_audit: 'Senior Audit',
  senior_expertise: 'Senior Expertise',
  junior_audit: 'Junior Audit',
  junior_expertise: 'Junior Expertise',
  stagiaires: 'Stagiaires',
  formateur_senior: 'Formateur Senior',
  formateur_junior: 'Formateur Junior',
};

export const ASSET_CATEGORY_LABELS: Record<string, string> = {
  buildings: 'Bâtiments',
  equipment: 'Équipements',
  vehicles: 'Véhicules',
  furniture: 'Mobilier',
  it_equipment: 'Équipement IT',
  other: 'Autres',
};

export const STOCK_CATEGORY_LABELS: Record<string, string> = {
  supplies: 'Fournitures',
  equipment: 'Équipements',
  materials: 'Matériaux',
  services: 'Services',
  other: 'Autres',
};

// =====================================================
// 9. ÉTABLISSEMENTS
// =====================================================
import type { EtablissementType } from '../types';

export const ETABLISSEMENT_TYPES: { value: EtablissementType; label: string; icon: string }[] = [
  { value: 'siege', label: 'Siège social', icon: '🏢' },
  { value: 'agence', label: 'Agence', icon: '🏛️' },
  { value: 'succursale', label: 'Succursale', icon: '🏪' },
  { value: 'usine', label: 'Usine', icon: '🏭' },
  { value: 'magasin', label: 'Magasin', icon: '🛒' },
  { value: 'bureau', label: 'Bureau', icon: '📋' },
  { value: 'entrepot', label: 'Entrepôt', icon: '📦' },
  { value: 'autre', label: 'Autre', icon: '📍' },
];

export const ETABLISSEMENT_TYPE_LABELS: Record<EtablissementType, string> = {
  siege: 'Siège social',
  agence: 'Agence',
  succursale: 'Succursale',
  usine: 'Usine',
  magasin: 'Magasin',
  bureau: 'Bureau',
  entrepot: 'Entrepôt',
  autre: 'Autre',
};