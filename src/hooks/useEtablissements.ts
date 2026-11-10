// src/hooks/useEtablissements.ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Etablissement } from '../types';

export const useEtablissements = (clientId: string) => {
  return useQuery({
    queryKey: ['etablissements', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('etablissements')
        .select('*')
        .eq('client_id', clientId)
        .eq('is_active', true)
        .order('code', { ascending: true });
      if (error) throw error;
      return data as Etablissement[];
    },
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000,
  });
};