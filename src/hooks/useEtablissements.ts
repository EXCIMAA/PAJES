// src/hooks/useEtablissements.ts
import { useQuery } from '@tanstack/react-query';
import { clientsApi } from '../api/clients';

export const useEtablissements = (clientId: string) => {
  return useQuery({
    queryKey: ['etablissements', clientId],
    queryFn: () => clientsApi.establishments(clientId, true),
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000,
  });
};