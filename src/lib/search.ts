// src/lib/search.ts
import { dbApi } from './apiClient';

export interface SearchResult {
  type: string;
  label: string;
  items: any[];
}

const matches = (value: unknown, term: string): boolean =>
  typeof value === 'string' && value.toLowerCase().includes(term);

export async function searchAll(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return [];

  const results: SearchResult[] = [];
  const term = query.trim().toLowerCase();

  try {
    // 1. CLIENTS
    const clients = await dbApi.list('clients', { limit: 1000 });
    const filteredClients = clients
      .filter((c) => matches(c.name, term) || matches(c.email, term) || matches(c.contact_person, term))
      .slice(0, 10);
    if (filteredClients.length > 0) {
      results.push({
        type: 'clients',
        label: 'Clients',
        items: filteredClients.map((c) => ({
          id: c.id,
          title: c.name,
          subtitle: c.email || c.contact_person,
          link: `/clients/${c.id}`,
        })),
      });
    }

    // 2. MISSIONS (engagements)
    const missions = await dbApi.list('engagements', { limit: 1000 });
    const filteredMissions = missions
      .filter((m) => matches(m.code, term) || matches(m.client_name, term) || matches(m.subject, term))
      .slice(0, 10);
    if (filteredMissions.length > 0) {
      results.push({
        type: 'missions',
        label: 'Missions',
        items: filteredMissions.map((m) => ({
          id: m.id,
          title: m.code || m.subject,
          subtitle: m.client_name,
          link: `/engagements/${m.id}`,
        })),
      });
    }

    // 3. NOTES DE REVUE
    const reviewNotes = await dbApi.list('review_notes', { limit: 1000 });
    const filteredReviewNotes = reviewNotes
      .filter((n) => matches(n.reference, term) || matches(n.description, term) || matches(n.category, term))
      .slice(0, 10);
    if (filteredReviewNotes.length > 0) {
      results.push({
        type: 'review_notes',
        label: 'Notes de revue',
        items: filteredReviewNotes.map((n) => ({
          id: n.id,
          title: n.reference,
          subtitle: (n.description as string | undefined)?.substring(0, 60) || n.category,
          link: `/review-notes/${n.id}`,
        })),
      });
    }

    // 4. CONSTATS (findings)
    const findings = await dbApi.list('findings', { limit: 1000 });
    const filteredFindings = findings
      .filter((f) => matches(f.finding, term) || matches(f.recommendation, term))
      .slice(0, 10);
    if (filteredFindings.length > 0) {
      results.push({
        type: 'findings',
        label: 'Constats',
        items: filteredFindings.map((f) => ({
          id: f.id,
          title: (f.finding as string | undefined)?.substring(0, 50),
          subtitle: `Risque: ${f.risk_level as string}`,
          link: `/findings/${f.id}`,
        })),
      });
    }

    // 5. STOCK
    const stockItems = await dbApi.list('stock_items', { limit: 1000 });
    const filteredStock = stockItems
      .filter((s) => matches(s.item_name, term) || matches(s.category, term))
      .slice(0, 10);
    if (filteredStock.length > 0) {
      results.push({
        type: 'stock',
        label: 'Stock',
        items: filteredStock.map((s) => ({
          id: s.id,
          title: s.item_name,
          subtitle: s.category,
          link: `/stock/${s.id}`,
        })),
      });
    }

    // 6. IMMOBILISATIONS
    const assets = await dbApi.list('fixed_assets', { limit: 1000 });
    const filteredAssets = assets
      .filter((a) => matches(a.asset_name, term) || matches(a.asset_code, term) || matches(a.category, term))
      .slice(0, 10);
    if (filteredAssets.length > 0) {
      results.push({
        type: 'assets',
        label: 'Immobilisations',
        items: filteredAssets.map((a) => ({
          id: a.id,
          title: a.asset_name,
          subtitle: a.asset_code || a.category,
          link: `/fixed-assets/${a.id}`,
        })),
      });
    }

    // 7. CONGÉS
    const leaves = await dbApi.list('leave_requests', { limit: 1000 });
    const filteredLeaves = leaves
      .filter((l) => matches(l.employee_name, term) || matches(l.leave_type, term))
      .slice(0, 10);
    if (filteredLeaves.length > 0) {
      results.push({
        type: 'leaves',
        label: 'Congés',
        items: filteredLeaves.map((l) => ({
          id: l.id,
          title: l.employee_name,
          subtitle: `${l.leave_type as string} - ${l.status as string}`,
          link: `/leave/${l.id}`,
        })),
      });
    }

    // 8. ÉQUIPE (profiles)
    const profiles = await dbApi.list('profiles', { limit: 1000 });
    const filteredProfiles = profiles
      .filter((p) => matches(p.full_name, term) || matches(p.email, term))
      .slice(0, 10);
    if (filteredProfiles.length > 0) {
      results.push({
        type: 'team',
        label: 'Équipe',
        items: filteredProfiles.map((p) => ({
          id: p.id,
          title: p.full_name,
          subtitle: p.email || p.role,
          link: `/team/${p.id}`,
        })),
      });
    }

    return results;
  } catch (error) {
    console.error('Erreur de recherche:', error);
    return [];
  }
}