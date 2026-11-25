import { dbApi } from '../apiClient';
import type { MissionCAC, IntervenantCAC } from '../../types/cac';

/**
 * Récupère la grille d'honoraires active
 */
export async function getGrilleHonoraires() {
  const data = await dbApi.list('grille_honoraires', {
    filters: { actif: 'true' },
    orderBy: 'tranche_min',
    orderAsc: true,
    limit: 500,
  });
  return data;
}

/**
 * Récupère les tarifs par grade actifs
 */
export async function getTarifsGrades() {
  const data = await dbApi.list('tarifs_par_grade', {
    filters: { actif: 'true' },
    orderBy: 'pourcentage_defaut',
    orderAsc: false,
    limit: 500,
  });
  return data;
}

/**
 * Calcule une mission CAC via la fonction PostgreSQL
 */
export async function calculerMission(missionId: string) {
  // TODO: backend RPC endpoint not yet created (remplace supabase.rpc('calculer_mission_cac'))
  console.warn(
    `[calculerMission] RPC 'calculer_mission_cac' indisponible (backend manquant) pour la mission ${missionId}`,
  );
  return null;
}

/**
 * Crée une nouvelle mission CAC avec ses intervenants
 */
export async function creerMission(payload: Partial<MissionCAC> & { intervenants?: Partial<IntervenantCAC>[] }) {
  const mission = await dbApi.create('missions_cac', {
    client_id: payload.client_id,
    exercice: payload.exercice,
    total_bilan: payload.total_bilan,
    produits_exploitation: payload.produits_exploitation,
    produits_financiers: payload.produits_financiers || 0,
    coefficient_multiplicateur: payload.coefficient_multiplicateur || 1.6,
    decote: payload.decote || 0,
    notes: payload.notes || '',
  });

  return mission;
}

/**
 * Met à jour une mission CAC (sans recalcul)
 */
export async function updateMission(missionId: string, updates: Partial<MissionCAC>) {
  const data = await dbApi.update('missions_cac', missionId, updates as Record<string, unknown>);
  return data;
}

/**
 * Récupère une mission avec ses intervenants
 */
export async function getMissionWithIntervenants(missionId: string) {
  const mission = await dbApi.get('missions_cac', missionId);

  const intervenants = await dbApi.list('missions_cac_intervenants', {
    filters: { mission_id: missionId },
    limit: 500,
  });

  return { ...mission, intervenants };
}

/**
 * Récupère la liste des missions (avec pagination/filtres optionnels)
 */
export async function getMissions(filters?: { exercice?: string; statut?: string; search?: string }) {
  const queryFilters: Record<string, string> = {};
  if (filters?.exercice) queryFilters.exercice = filters.exercice;
  if (filters?.statut) queryFilters.statut = filters.statut;

  const data = await dbApi.list('missions_cac', {
    filters: queryFilters,
    orderBy: 'created_at',
    orderAsc: false,
    limit: 500,
  });

  if (filters?.search) {
    const term = filters.search.toLowerCase();
    return data.filter((m) => {
      const client = (m.clients as { name?: string } | undefined)?.name;
      return (client ?? '').toLowerCase().includes(term);
    });
  }

  return data;
}