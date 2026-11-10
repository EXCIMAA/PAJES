import { supabase } from '../supabase';
import type { MissionCAC, IntervenantCAC } from '../../types/cac';

/**
 * Récupère la grille d'honoraires active
 */
export async function getGrilleHonoraires() {
  const { data, error } = await supabase
    .from('grille_honoraires')
    .select('*')
    .eq('actif', true)
    .order('tranche_min');
  if (error) throw error;
  return data;
}

/**
 * Récupère les tarifs par grade actifs
 */
export async function getTarifsGrades() {
  const { data, error } = await supabase
    .from('tarifs_par_grade')
    .select('*')
    .eq('actif', true)
    .order('pourcentage_defaut', { ascending: false });
  if (error) throw error;
  return data;
}

/**
 * Calcule une mission CAC via la fonction PostgreSQL
 */
export async function calculerMission(missionId: string) {
  const { data, error } = await supabase
    .rpc('calculer_mission_cac', { mission_id: missionId });
  if (error) throw error;
  return data;
}

/**
 * Crée une nouvelle mission CAC avec ses intervenants
 */
export async function creerMission(payload: Partial<MissionCAC> & { intervenants?: Partial<IntervenantCAC>[] }) {
  const { data: mission, error: missionError } = await supabase
    .from('missions_cac')
    .insert({
      client_id: payload.client_id,
      exercice: payload.exercice,
      total_bilan: payload.total_bilan,
      produits_exploitation: payload.produits_exploitation,
      produits_financiers: payload.produits_financiers || 0,
      coefficient_multiplicateur: payload.coefficient_multiplicateur || 1.6,
      decote: payload.decote || 0,
      notes: payload.notes || '',
    })
    .select()
    .single();

  if (missionError) throw missionError;
  return mission;
}

/**
 * Met à jour une mission CAC (sans recalcul)
 */
export async function updateMission(missionId: string, updates: Partial<MissionCAC>) {
  const { data, error } = await supabase
    .from('missions_cac')
    .update(updates)
    .eq('id', missionId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Récupère une mission avec ses intervenants
 */
export async function getMissionWithIntervenants(missionId: string) {
  const { data: mission, error: missionError } = await supabase
    .from('missions_cac')
    .select('*, clients(name)')
    .eq('id', missionId)
    .single();
  if (missionError) throw missionError;

  const { data: intervenants, error: interError } = await supabase
    .from('missions_cac_intervenants')
    .select('*')
    .eq('mission_id', missionId);
  if (interError) throw interError;

  return { ...mission, intervenants };
}

/**
 * Récupère la liste des missions (avec pagination/filtres optionnels)
 */
export async function getMissions(filters?: { exercice?: string; statut?: string; search?: string }) {
  let query = supabase
    .from('missions_cac')
    .select('*, clients(name)')
    .order('created_at', { ascending: false });

  if (filters?.exercice) query = query.eq('exercice', filters.exercice);
  if (filters?.statut) query = query.eq('statut', filters.statut);
  if (filters?.search) {
    query = query.ilike('clients.name', `%${filters.search}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}