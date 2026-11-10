// src/hooks/useDepreciation.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDepreciationSchedule, generateDepreciation, getLatestDepreciation } from '../api/depreciationApi';

export const useDepreciationSchedule = (assetId: string) => {
  return useQuery({
    queryKey: ['depreciation', assetId],
    queryFn: () => getDepreciationSchedule(assetId),
    enabled: !!assetId,
    staleTime: 5 * 60 * 1000,
  });
};

export const useLatestDepreciation = (assetId: string) => {
  return useQuery({
    queryKey: ['depreciation-latest', assetId],
    queryFn: () => getLatestDepreciation(assetId),
    enabled: !!assetId,
    staleTime: 5 * 60 * 1000,
  });
};

export const useGenerateDepreciation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (assetId: string) => generateDepreciation(assetId),
    onSuccess: (_, assetId) => {
      queryClient.invalidateQueries({ queryKey: ['depreciation', assetId] });
      queryClient.invalidateQueries({ queryKey: ['depreciation-latest', assetId] });
    },
  });
};