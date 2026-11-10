// Types pour le module CAC
export interface MissionCAC {
  id: string;
  client_id: string;
  exercice: string;
  total_bilan: number;
  produits_exploitation: number;
  produits_financiers: number;
  assiette_calcul: number;
  temps_retenu: number | null;
  coefficient_multiplicateur: number;
  decote: number;
  notes?: string;
  statut: "brouillon" | "valide" | "facture_emise" | "facture_payee";
  total_budget?: number;
  facture_brute?: number;
  facture_nette?: number;
  marge_estimee?: number;
  created_at: string;
  updated_at: string;
  created_by?: string;
  // Jointure
  clients?: { name: string };
}

export interface IntervenantCAC {
  id: string;
  mission_id: string;
  grade:
    | "associe_signataire"
    | "chef_mission"
    | "collaborateur_senior"
    | "collaborateur_junior";
  pourcentage_temps: number;
  taux_horaire: number;
  heures_calculees: number | null;
  budget: number | null;
}

export interface GrilleHonoraire {
  id: string;
  tranche_min: number;
  tranche_max: number | null;
  heures_min: number;
  actif: boolean;
}

export interface TarifGrade {
  id: string;
  grade: string;
  pourcentage_defaut: number;
  taux_horaire_defaut: number;
  actif: boolean;
}
