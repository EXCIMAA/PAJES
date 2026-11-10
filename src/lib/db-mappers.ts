import type { Finding, StockItem, ActivityItem } from '../types';
import type { ChartDataPoint } from '../types';

export function mapFindingRow(row: Record<string, unknown>): Finding {
  return {
    id: String(row.id ?? ''),
    engagement_id: String(row.engagement_id ?? ''),
    finding: String(row.finding ?? row.title ?? ''),
    risk_level: String(row.risk_level ?? row.severity ?? 'medium'),
    recommendation: row.recommendation ? String(row.recommendation) : row.description ? String(row.description) : undefined,
    management_response: row.management_response ? String(row.management_response) : undefined,
    responsible_person: row.responsible_person ? String(row.responsible_person) : row.assignee ? String(row.assignee) : undefined,
    target_date: row.target_date ? String(row.target_date) : undefined,
    status: String(row.status ?? 'open'),
    created_at: String(row.created_at ?? ''),
  };
}

export function mapInventoryToStockItem(row: Record<string, unknown>): StockItem {
  const quantity = Number(row.quantity ?? 0);
  const value = Number(row.value ?? 0);
  const unitCost = quantity > 0 ? Math.round(value / quantity) : value;

  return {
    id: String(row.id ?? ''),
    item_name: String(row.name ?? ''),
    category: String(row.category ?? ''),
    purchase_date: String(row.last_counted ?? row.created_at ?? '').slice(0, 10),
    quantity_purchased: quantity,
    unit_cost: unitCost,
    total_amount: value,
    quantity_released: 0,
    remaining_quantity: quantity,
    remaining_value: value,
    supplier: undefined,
    warehouse: row.location ? String(row.location) : undefined,
    status: (row.status === 'expired' ? 'out_of_stock' : row.status) as StockItem['status'],
    created_at: String(row.created_at ?? ''),
  };
}

export function mapStockItemRow(row: Record<string, unknown>): StockItem {
  return {
    id: String(row.id ?? ''),
    item_name: String(row.item_name ?? ''),
    category: String(row.category ?? ''),
    purchase_date: String(row.purchase_date ?? '').slice(0, 10),
    quantity_purchased: Number(row.quantity_purchased ?? 0),
    unit_cost: Number(row.unit_cost ?? 0),
    total_amount: Number(row.total_amount ?? 0),
    quantity_released: Number(row.quantity_released ?? 0),
    remaining_quantity: Number(row.remaining_quantity ?? 0),
    remaining_value: Number(row.remaining_value ?? 0),
    supplier: row.supplier ? String(row.supplier) : undefined,
    warehouse: row.warehouse ? String(row.warehouse) : undefined,
    status: String(row.status ?? 'in_stock') as StockItem['status'],
    created_at: String(row.created_at ?? ''),
  };
}

export function mapActivityRow(row: Record<string, unknown>): ActivityItem {
  return {
    id: String(row.id ?? ''),
    type: String(row.type ?? 'comment') as ActivityItem['type'],
    title: String(row.title ?? ''),
    description: String(row.description ?? ''),
    timestamp: String(row.created_at ?? ''),
    user: String(row.user_name ?? ''),
  };
}

const STATUS_LABELS: Record<string, string> = {
  open: 'Ouvert',
  in_progress: 'En cours',
  resolved: 'Résolu',
  closed: 'Fermé',
  draft: 'Brouillon',
  planning: 'Planification',
  review: 'Revue',
  completed: 'Terminé',
};

const RISK_LABELS: Record<string, string> = {
  critical: 'Critique',
  high: 'Élevé',
  medium: 'Moyen',
  low: 'Faible',
  significant: 'Significatif',
  minor: 'Mineur',
};

export function buildEngagementProgressChart(
  engagements: Array<{ client_name?: string | null; progress?: number | null }>
): ChartDataPoint[] {
  return engagements.slice(0, 8).map((e) => ({
    name: (e.client_name ?? 'Mission').slice(0, 12),
    value: Number(e.progress ?? 0),
  }));
}

export function buildReviewNotesStatusChart(
  notes: Array<{ status?: string | null }>
): ChartDataPoint[] {
  const counts: Record<string, number> = {};
  notes.forEach((n) => {
    const key = n.status ?? 'open';
    counts[key] = (counts[key] ?? 0) + 1;
  });
  return Object.entries(counts).map(([name, value]) => ({
    name: STATUS_LABELS[name] ?? name,
    value,
  }));
}

export function buildRiskDistributionChart(
  findings: Array<{ risk_level?: string | null; severity?: string | null }>
): ChartDataPoint[] {
  const counts: Record<string, number> = {};
  findings.forEach((f) => {
    const key = f.risk_level ?? f.severity ?? 'medium';
    counts[key] = (counts[key] ?? 0) + 1;
  });
  return Object.entries(counts).map(([name, value]) => ({
    name: RISK_LABELS[name] ?? name,
    value,
  }));
}
