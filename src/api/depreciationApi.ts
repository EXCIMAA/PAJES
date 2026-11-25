// src/api/depreciationApi.ts
import { dbApi } from '../lib/apiClient'; // ← chemin corrigé

export interface DepreciationSchedule {
  id: string;
  asset_id: string;
  period: string;
  amount: number;
  cumulative_depreciation: number;
  net_book_value: number;
  [key: string]: unknown;
}

export const generateDepreciation = async (assetId: string) => {
  // TODO: backend endpoint must be created (POST /api/v1/fixed-assets/generate-depreciation)
  const response = await fetch('/api/v1/fixed-assets/generate-depreciation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ asset_id: assetId }),
  });

  if (!response.ok) {
    const error = new Error(`Erreur génération amortissement : ${response.status}`);
    console.error('Erreur génération amortissement :', error);
    throw error;
  }

  const data = await response.json();
  return data;
};

export const getDepreciationSchedule = async (
  assetId: string,
): Promise<DepreciationSchedule[]> => {
  const data = await dbApi.list<DepreciationSchedule>('depreciation_schedules', {
    filters: { asset_id: assetId },
    orderBy: 'period',
    orderAsc: true,
    limit: 500,
  });
  return data || [];
};

export const getLatestDepreciation = async (
  assetId: string,
): Promise<Partial<DepreciationSchedule>> => {
  const data = await dbApi.list<DepreciationSchedule>('depreciation_schedules', {
    filters: { asset_id: assetId },
    orderBy: 'period',
    orderAsc: false,
    limit: 1,
  });
  return data?.[0] || { net_book_value: 0, cumulative_depreciation: 0 };
};