import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get today's date in YYYY-MM-DD format
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    // Get yesterday's date for comparison
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    console.log(`Capturing daily metrics for ${todayStr}`);

    // 1. Total Users
    const { count: totalUsers } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });

    // 2. Total Buildings
    const { count: totalBuildings } = await supabase
      .from("user_buildings")
      .select("*", { count: "exact", head: true });

    // 3. Total Chickens
    const { data: buildingsData } = await supabase
      .from("user_buildings")
      .select("current_chickens");
    
    const totalChickens = buildingsData?.reduce((sum, b) => sum + (b.current_chickens || 0), 0) || 0;

    // 4. Total Purchases
    const { count: totalPurchases } = await supabase
      .from("building_purchases")
      .select("*", { count: "exact", head: true });

    // 5. Total Revenue (completed purchases)
    const { data: purchasesData } = await supabase
      .from("building_purchases")
      .select("price_ton")
      .eq("status", "completed");
    
    const totalRevenue = purchasesData?.reduce((sum, p) => sum + (p.price_ton || 0), 0) || 0;

    // 6. New Users Today
    const { count: newUsersToday } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("created_at", todayStr);

    // 7. New Purchases Today
    const { count: newPurchasesToday } = await supabase
      .from("building_purchases")
      .select("*", { count: "exact", head: true })
      .gte("created_at", todayStr);

    // 8. Buildings by Type
    const { data: buildingsByTypeData } = await supabase
      .from("user_buildings")
      .select("building_type");
    
    const buildingsByType: Record<string, number> = {};
    buildingsByTypeData?.forEach((building) => {
      buildingsByType[building.building_type] = (buildingsByType[building.building_type] || 0) + 1;
    });

    // Insert/Update daily metrics
    // Note: We'll store these in metadata since the enum doesn't have these specific types
    // Alternatively, you can create a migration to add these types to the metric_type enum
    const metrics = [
      { type: 'new_registered_users', value: newUsersToday || 0, metadata: { metric_name: 'new_users_today' } },
      { type: 'building_purchased', value: newPurchasesToday || 0, metadata: { metric_name: 'new_purchases_today' } },
    ];

    // Store aggregate metrics in a separate structure
    const aggregateMetrics = {
      total_users: totalUsers || 0,
      total_buildings: totalBuildings || 0,
      total_chickens: totalChickens,
      total_purchases: totalPurchases || 0,
      total_revenue: totalRevenue,
      total_coops: buildingsByType['coop'] || 0,
      total_warehouses: buildingsByType['warehouse'] || 0,
      total_markets: buildingsByType['market'] || 0,
    };

    // Use upsert to update or insert daily metrics
    for (const metric of metrics) {
      // Check if metric exists for today
      const { data: existing } = await supabase
        .from("daily_metrics")
        .select("id, metric_value")
        .eq("date", todayStr)
        .eq("metric_type", metric.type)
        .single();

      if (existing) {
        // Update existing metric
        const { error } = await supabase
          .from("daily_metrics")
          .update({
            metric_value: metric.value,
            metadata: metric.metadata,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);

        if (error) {
          console.error(`Error updating metric ${metric.type}:`, error);
        }
      } else {
        // Insert new metric
        const { error } = await supabase
          .from("daily_metrics")
          .insert({
            date: todayStr,
            metric_type: metric.type as any,
            metric_value: metric.value,
            metadata: {
              ...metric.metadata,
              captured_at: new Date().toISOString(),
            },
          });

        if (error) {
          console.error(`Error inserting metric ${metric.type}:`, error);
        }
      }
    }

    // Store aggregate metrics in metadata of a single record
    // We'll use 'feature_usage' type and store all aggregates in metadata
    const { data: aggregateExisting } = await supabase
      .from("daily_metrics")
      .select("id")
      .eq("date", todayStr)
      .eq("metric_type", "feature_usage")
      .eq("metadata->>metric_name", "daily_aggregates")
      .single();

    if (aggregateExisting) {
      await supabase
        .from("daily_metrics")
        .update({
          metric_value: 0, // Not used for aggregates
          metadata: {
            metric_name: "daily_aggregates",
            ...aggregateMetrics,
            captured_at: new Date().toISOString(),
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", aggregateExisting.id);
    } else {
      await supabase
        .from("daily_metrics")
        .insert({
          date: todayStr,
          metric_type: "feature_usage" as any,
          metric_value: 0,
          metadata: {
            metric_name: "daily_aggregates",
            ...aggregateMetrics,
            captured_at: new Date().toISOString(),
          },
        });
    }

    console.log(`Successfully captured daily metrics for ${todayStr}`);

    return new Response(
      JSON.stringify({
        success: true,
        date: todayStr,
        metrics_captured: metrics.length + 1, // +1 for aggregate metrics
        metrics,
        aggregate_metrics: aggregateMetrics,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in capture-daily-metrics function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

