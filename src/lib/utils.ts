export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value).replace('XOF', 'FCFA');
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('fr-FR').format(value);
}

export function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "À l'instant";
  if (minutes < 60) return `Il y a ${minutes}min`;
  if (hours < 24) return `Il y a ${hours}h`;
  if (days < 7) return `Il y a ${days}j`;
  return formatDate(dateStr);
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    in_stock: 'text-success-500',
    low_stock: 'text-warning-500',
    out_of_stock: 'text-error-500',
    active: 'text-success-500',
    inactive: 'text-slate-400',
    disposed: 'text-error-500',
    maintenance: 'text-warning-500',
    open: 'text-error-500',
    in_progress: 'text-warning-500',
    resolved: 'text-success-500',
    closed: 'text-slate-400',
    critical: 'text-error-500',
    high: 'text-warning-500',
    medium: 'text-info-500',
    low: 'text-slate-400',
    significant: 'text-warning-500',
    minor: 'text-info-500',
    draft: 'text-slate-400',
    planning: 'text-info-500',
    review: 'text-warning-500',
    completed: 'text-success-500',
    approved: 'text-success-500',
    submitted: 'text-warning-500',
    rejected: 'text-error-500',
    cancelled: 'text-slate-400',
    postponed: 'text-warning-500',
  };
  return colors[status] || 'text-slate-400';
}

export function getStatusBgColor(status: string): string {
  const colors: Record<string, string> = {
    active: 'bg-success-500/15 text-success-500 ring-success-500/25',
    inactive: 'bg-slate-500/15 text-slate-300 ring-slate-500/25',
    open: 'bg-error-500/15 text-error-500 ring-error-500/25',
    in_progress: 'bg-warning-500/15 text-warning-500 ring-warning-500/25',
    resolved: 'bg-success-500/15 text-success-500 ring-success-500/25',
    closed: 'bg-slate-500/15 text-slate-300 ring-slate-500/25',
    critical: 'bg-error-500/15 text-error-500 ring-error-500/25',
    high: 'bg-warning-500/15 text-warning-500 ring-warning-500/25',
    medium: 'bg-info-500/15 text-info-500 ring-info-500/25',
    low: 'bg-slate-500/15 text-slate-300 ring-slate-500/25',
    significant: 'bg-warning-500/15 text-warning-500 ring-warning-500/25',
    minor: 'bg-info-500/15 text-info-500 ring-info-500/25',
    in_stock: 'bg-success-500/15 text-success-500 ring-success-500/25',
    low_stock: 'bg-warning-500/15 text-warning-500 ring-warning-500/25',
    out_of_stock: 'bg-error-500/15 text-error-500 ring-error-500/25',
    draft: 'bg-slate-500/15 text-slate-300 ring-slate-500/25',
    planning: 'bg-info-500/15 text-info-500 ring-info-500/25',
    review: 'bg-warning-500/15 text-warning-500 ring-warning-500/25',
    completed: 'bg-success-500/15 text-success-500 ring-success-500/25',
    approved: 'bg-success-500/15 text-success-500 ring-success-500/25',
    submitted: 'bg-warning-500/15 text-warning-500 ring-warning-500/25',
    rejected: 'bg-error-500/15 text-error-500 ring-error-500/25',
    postponed: 'bg-warning-500/15 text-warning-500 ring-warning-500/25',
    disposed: 'bg-error-500/15 text-error-500 ring-error-500/25',
    maintenance: 'bg-warning-500/15 text-warning-500 ring-warning-500/25',
    cancelled: 'bg-slate-500/15 text-slate-300 ring-slate-500/25',
    final: 'bg-primary-500/15 text-primary-300 ring-primary-500/25',
  };
  return colors[status] || 'bg-slate-500/15 text-slate-300 ring-slate-500/25';
}

export function getTrendColor(trend: 'up' | 'down' | 'flat'): string {
  if (trend === 'up') return 'text-success-500';
  if (trend === 'down') return 'text-error-500';
  return 'text-slate-400';
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}
// src/lib/utils.ts

/**
 * Abrège un nombre en milliers (k), millions (M), milliards (Mrd)
 * avec la devise en option.
 */
export function abbreviateNumber(
  num: number,
  currency = "FCFA",
  decimals = 1
): string {
  if (num === 0) return `0 ${currency}`;

  const abs = Math.abs(num);
  let value: number;
  let suffix = "";

  if (abs >= 1_000_000_000) {
    value = num / 1_000_000_000;
    suffix = " Mrd";
  } else if (abs >= 1_000_000) {
    value = num / 1_000_000;
    suffix = " M";
  } else if (abs >= 1_000) {
    value = num / 1_000;
    suffix = " k";
  } else {
    return `${num.toFixed(0)} ${currency}`;
  }

  return `${value.toFixed(decimals)}${suffix} ${currency}`;
}