import { supabase } from './supabase';
import { mapInventoryToStockItem, mapStockItemRow } from './db-mappers';
import type { StockItem } from '../types';

export async function fetchStockItems(): Promise<{ data: StockItem[]; error: string | null }> {
  const { data: stockData, error: stockError } = await supabase
    .from('stock_items')
    .select('*')
    .order('created_at', { ascending: false });

  if (!stockError && stockData) {
    return { data: stockData.map((row) => mapStockItemRow(row as Record<string, unknown>)), error: null };
  }

  const { data: inventoryData, error: inventoryError } = await supabase
    .from('inventory_items')
    .select('*')
    .order('name', { ascending: true });

  if (inventoryError) {
    return { data: [], error: inventoryError.message };
  }

  return {
    data: (inventoryData ?? []).map((row) => mapInventoryToStockItem(row as Record<string, unknown>)),
    error: null,
  };
}
