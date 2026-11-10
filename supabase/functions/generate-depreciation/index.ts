import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(
      JSON.stringify({ success: false, error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    {
      global: { headers: { Authorization: authHeader } },
    }
  );

  const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
  if (authError || !user) {
    return new Response(
      JSON.stringify({ success: false, error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { asset_id } = await req.json();

    if (!asset_id) {
      const result = await generateForAllAssets(supabaseClient);
      return new Response(
        JSON.stringify({ success: true, message: 'Plans générés', data: result }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await generateForAsset(supabaseClient, asset_id);
    return new Response(
      JSON.stringify({ success: true, message: 'Plan généré', data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function generateForAsset(supabaseClient: any, assetId: string) {
  const { data: asset } = await supabaseClient
    .from('fixed_assets')
    .select('*')
    .eq('id', assetId)
    .maybeSingle();

  if (!asset) throw new Error('Asset not found');

  const schedule = calculateDepreciationSchedule(asset);
  const { error } = await supabaseClient
    .from('depreciation_schedules')
    .upsert(schedule.map((s: any) => ({ ...s, asset_id: assetId })));

  if (error) throw error;
  return schedule;
}

async function generateForAllAssets(supabaseClient: any) {
  const { data: assets } = await supabaseClient
    .from('fixed_assets')
    .select('*')
    .eq('status', 'active');

  if (!assets || assets.length === 0) return [];

  const allSchedules: any[] = [];
  for (const asset of assets) {
    const schedule = calculateDepreciationSchedule(asset);
    allSchedules.push(...schedule.map((s: any) => ({ ...s, asset_id: asset.id })));
  }

  if (allSchedules.length > 0) {
    const { error } = await supabaseClient
      .from('depreciation_schedules')
      .upsert(allSchedules);
    if (error) throw error;
  }

  return allSchedules;
}

function calculateDepreciationSchedule(asset: any) {
  const schedule: any[] = [];
  const { purchase_value, acquisition_date, useful_life, depreciation_method, depreciation_rate } = asset;

  if (!useful_life || useful_life <= 0) return schedule;

  const startDate = new Date(acquisition_date);
  const annualDepreciation = depreciation_method === 'Linéaire'
    ? purchase_value * (depreciation_rate / 100)
    : purchase_value / useful_life;

  let accumulated = 0;
  for (let year = 1; year <= useful_life; year++) {
    const yearlyDep = Math.min(annualDepreciation, purchase_value - accumulated);
    accumulated += yearlyDep;
    const yearDate = new Date(startDate);
    yearDate.setFullYear(yearDate.getFullYear() + year);

    schedule.push({
      year,
      date: yearDate.toISOString().split('T')[0],
      depreciation_amount: yearlyDep,
      accumulated_depreciation: accumulated,
      net_book_value: purchase_value - accumulated,
    });
  }

  return schedule;
}
