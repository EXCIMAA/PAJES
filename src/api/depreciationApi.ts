// src/api/depreciationApi.ts
import { supabase } from '../lib/supabase'; // ← chemin corrigé

export const generateDepreciation = async (assetId: string) => {
  const { data, error } = await supabase.functions.invoke('generate-depreciation', {
    body: { asset_id: assetId },
  });
  if (error) {
    console.error('Erreur génération amortissement :', error);
    throw error;
  }
  return data;
};

export const getDepreciationSchedule = async (assetId: string) => {
  const { data, error } = await supabase
    .from('depreciation_schedules')
    .select('*')
    .eq('asset_id', assetId)
    .order('period', { ascending: true });
  if (error) throw error;
  return data || [];
};

export const getLatestDepreciation = async (assetId: string) => {
  const { data, error } = await supabase
    .from('depreciation_schedules')
    .select('net_book_value, cumulative_depreciation')
    .eq('asset_id', assetId)
    .order('period', { ascending: false })
    .limit(1);
  if (error) throw error;
  return data?.[0] || { net_book_value: 0, cumulative_depreciation: 0 };
};