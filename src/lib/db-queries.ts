import { dbApi } from './apiClient';
import { mapInventoryToStockItem, mapStockItemRow } from './db-mappers';
import type { StockItem } from '../types';

export async function fetchStockItems(): Promise<{ data: StockItem[]; error: string | null }> {
  try {
    const stockData = await dbApi.list('stock_items', {
      orderBy: 'created_at',
      orderAsc: false,
      limit: 500,
    });

    return {
      data: stockData.map((row) => mapStockItemRow(row as Record<string, unknown>)),
      error: null,
    };
  } catch (stockError) {
    try {
      const inventoryData = await dbApi.list('inventory_items', {
        orderBy: 'name',
        orderAsc: true,
        limit: 500,
      });

      return {
        data: inventoryData.map((row) => mapInventoryToStockItem(row as Record<string, unknown>)),
        error: null,
      };
    } catch (inventoryError: any) {
      return {
        data: [],
        error: inventoryError?.message ?? String(inventoryError),
      };
    }
  }
}