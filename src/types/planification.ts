// types/planification.ts

export type FormeJuridique = 'SARL' | 'SA' | 'SAS' | 'SCI' | 'BNC' | 'BIC' | 'Association' | 'Autres';

export type RegimeTVA = 'Réel mensuel' | 'Réel trimestriel' | 'Réel normal (CA12)' | 'Non concerné';

export type TaxeFonciereFrequence = 'Mensuel' | 'Annuel' | 'Non concerné';

export interface ParametresCabinet {
  id?: string;
  nom_cabinet: string;
  annee: number;
  responsables: string[];         // initiales
  collaborateurs: string[];       // initiales
  formes_juridiques: FormeJuridique[];
}

export interface Client {
  id?: string;
  code_client: string;
  nom: string;
  forme: FormeJuridique;
  resp: string;
  coll1: string;
  coll2: string;
  date_cloture: string;           // 'YYYY-MM-DD'
  etablissement_comptes_annuels: boolean;
  dispense_annexe: boolean;
  juridique_annuel_courant: boolean;
  declaration_confidentialite: boolean;
  rcm_verses_a_declarer: boolean;
  versement_dividendes: boolean;
  regime_tva: RegimeTVA;
  des_deb: boolean;
  liasse_fiscale: boolean;
  acompte_is: boolean;
  solde_is: boolean;
  cva: boolean;                   // CVAE (conservée)
  cfe: boolean;
  taxe_bureaux: boolean;
  taxe_fonciere: TaxeFonciereFrequence;
  tascom: boolean;
  tvts: boolean;
  tns: boolean;
  // Champs calculés (non stockés en base, mais recalculés à l'affichage)
  date_depot_comptes?: string;    // calculé
  mois_depot_liasse?: number;     // calculé
  date_depot_solde_is?: string;   // calculé
  created_at?: string;
  updated_at?: string;
}

export interface EcheanceMensuelle {
  client_id: string;
  mois: number;                     // 1-12
  annee: number;
  // Chaque obligation est un booléen indiquant si elle est due ce mois
  comptes_annuels: boolean;
  juridique: boolean;
  tva: boolean;
  des_deb: boolean;
  liasse: boolean;
  is_acompte: boolean;
  is_solde: boolean;
  cva: boolean;
  cfe: boolean;
  taxe_bureaux: boolean;
  taxe_fonciere: boolean;
  tascom: boolean;
  tvts: boolean;
  tns: boolean;
  // Suivi
  realise_le?: string;            // date si réalisé
  non_applicable?: boolean;       // NA
}