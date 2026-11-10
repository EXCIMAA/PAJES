// src/lib/search.ts
import { supabase } from './supabase';

export interface SearchResult {
  type: string;
  label: string;
  items: any[];
}

export async function searchAll(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return [];

  const results: SearchResult[] = [];
  const searchTerm = `%${query.trim()}%`;

  try {
    // 1. CLIENTS
    const { data: clients } = await supabase
      .from('clients')
      .select('id, name, email, contact_person')
      .or(`name.ilike.${searchTerm},email.ilike.${searchTerm},contact_person.ilike.${searchTerm}`)
      .limit(10);
    if (clients && clients.length > 0) {
      results.push({
        type: 'clients',
        label: 'Clients',
        items: clients.map(c => ({
          id: c.id,
          title: c.name,
          subtitle: c.email || c.contact_person,
          link: `/clients/${c.id}`,
        })),
      });
    }

    // 2. MISSIONS (engagements)
    const { data: missions } = await supabase
      .from('engagements')
      .select('id, code, client_name, subject, status')
      .or(`code.ilike.${searchTerm},client_name.ilike.${searchTerm},subject.ilike.${searchTerm}`)
      .limit(10);
    if (missions && missions.length > 0) {
      results.push({
        type: 'missions',
        label: 'Missions',
        items: missions.map(m => ({
          id: m.id,
          title: m.code || m.subject,
          subtitle: m.client_name,
          link: `/engagements/${m.id}`,
        })),
      });
    }

    // 3. NOTES DE REVUE
    const { data: reviewNotes } = await supabase
      .from('review_notes')
      .select('id, reference, description, category')
      .or(`reference.ilike.${searchTerm},description.ilike.${searchTerm},category.ilike.${searchTerm}`)
      .limit(10);
    if (reviewNotes && reviewNotes.length > 0) {
      results.push({
        type: 'review_notes',
        label: 'Notes de revue',
        items: reviewNotes.map(n => ({
          id: n.id,
          title: n.reference,
          subtitle: n.description?.substring(0, 60) || n.category,
          link: `/review-notes/${n.id}`,
        })),
      });
    }

    // 4. CONSTATS (findings)
    const { data: findings } = await supabase
      .from('findings')
      .select('id, finding, risk_level, recommendation')
      .or(`finding.ilike.${searchTerm},recommendation.ilike.${searchTerm}`)
      .limit(10);
    if (findings && findings.length > 0) {
      results.push({
        type: 'findings',
        label: 'Constats',
        items: findings.map(f => ({
          id: f.id,
          title: f.finding?.substring(0, 50),
          subtitle: `Risque: ${f.risk_level}`,
          link: `/findings/${f.id}`,
        })),
      });
    }

    // 5. STOCK
    const { data: stockItems } = await supabase
      .from('stock_items')
      .select('id, item_name, category, status')
      .or(`item_name.ilike.${searchTerm},category.ilike.${searchTerm}`)
      .limit(10);
    if (stockItems && stockItems.length > 0) {
      results.push({
        type: 'stock',
        label: 'Stock',
        items: stockItems.map(s => ({
          id: s.id,
          title: s.item_name,
          subtitle: s.category,
          link: `/stock/${s.id}`,
        })),
      });
    }

    // 6. IMMOBILISATIONS
    const { data: assets } = await supabase
      .from('fixed_assets')
      .select('id, asset_name, asset_code, category')
      .or(`asset_name.ilike.${searchTerm},asset_code.ilike.${searchTerm},category.ilike.${searchTerm}`)
      .limit(10);
    if (assets && assets.length > 0) {
      results.push({
        type: 'assets',
        label: 'Immobilisations',
        items: assets.map(a => ({
          id: a.id,
          title: a.asset_name,
          subtitle: a.asset_code || a.category,
          link: `/fixed-assets/${a.id}`,
        })),
      });
    }

    // 7. CONGÉS
    const { data: leaves } = await supabase
      .from('leave_requests')
      .select('id, employee_name, leave_type, status')
      .or(`employee_name.ilike.${searchTerm},leave_type.ilike.${searchTerm}`)
      .limit(10);
    if (leaves && leaves.length > 0) {
      results.push({
        type: 'leaves',
        label: 'Congés',
        items: leaves.map(l => ({
          id: l.id,
          title: l.employee_name,
          subtitle: `${l.leave_type} - ${l.status}`,
          link: `/leave/${l.id}`,
        })),
      });
    }

    // 8. ÉQUIPE (profiles)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email, role')
      .or(`full_name.ilike.${searchTerm},email.ilike.${searchTerm}`)
      .limit(10);
    if (profiles && profiles.length > 0) {
      results.push({
        type: 'team',
        label: 'Équipe',
        items: profiles.map(p => ({
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