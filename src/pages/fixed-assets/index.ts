// src/types/fixed-assets.ts (ou dans index.ts)

export interface FixedAsset {
  id: string;
  asset_code: string;
  designation: string;
  category_id: string;
  family?: string | null;
  location?: string | null;
  invoice_number?: string | null;
  acquisition_date: string;
  service_date: string;
  original_value: number;
  currency: string;
  account_code?: string | null;
  acquisition_mode?: string;
  residual_value?: number;
  status: string; // 'Draft' | 'Active' | 'In_Maintenance' | 'Disposed'
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface AssetCategory {
  id: string;
  name: string;
  useful_life_years: number;
  depreciation_method: 'linear' | 'declining';
}

export interface DepreciationPlan {
  id: string;
  asset_id: string;
  method: 'linear' | 'declining';
  useful_life_years: number;
  start_date: string;
  residual_value: number;
  is_active: boolean;
}

export interface DepreciationEntry {
  id: string;
  asset_id: string;
  plan_id: string;
  period: string;
  amount: number;
  cumulative_depreciation: number;
  net_book_value: number;
  is_processed: boolean;
}

export interface AssetMovement {
  id: string;
  asset_id: string;
  type: 'Transfer' | 'Reaffectation' | 'Maintenance';
  from_location?: string | null;
  to_location?: string | null;
  date: string;
  notes?: string | null;
  validated_by?: string | null;
}

export interface AssetDisposal {
  id: string;
  asset_id: string;
  type: 'Sale' | 'Scrap' | 'Loss_Theft';
  sale_price?: number | null;
  net_book_value: number;
  disposal_date: string;
  capital_gain_loss?: number | null;
  status: 'Draft' | 'Validated';
  validated_by?: string | null;
}