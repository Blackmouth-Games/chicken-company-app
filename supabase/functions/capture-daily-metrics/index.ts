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

    // Capture daily sales by type
    console.log(`Capturing daily sales by type for ${todayStr}`);

    // Get building purchases from yesterday (to capture yesterday's sales)
    const { data: buildingPurchases } = await supabase
      .from("building_purchases")
      .select("building_type, level, price_ton, status, completed_at, created_at")
      .gte("created_at", yesterdayStr)
      .lt("created_at", todayStr);

    // Get store purchases from yesterday
    const { data: storePurchases } = await supabase
      .from("store_purchases")
      .select("product_key, price_ton, status, completed_at, created_at")
      .gte("created_at", yesterdayStr)
      .lt("created_at", todayStr);

    // Aggregate building sales by type and level
    const buildingSalesByCategory: Record<string, {
      total_sales: number;
      total_revenue: number;
      completed_sales: number;
      completed_revenue: number;
      pending_sales: number;
      failed_sales: number;
      cancelled_sales: number;
      building_type: string;
      building_level: number;
    }> = {};

    buildingPurchases?.forEach((purchase) => {
      const category = `${purchase.building_type}_${purchase.level}`;
      if (!buildingSalesByCategory[category]) {
        buildingSalesByCategory[category] = {
          total_sales: 0,
          total_revenue: 0,
          completed_sales: 0,
          completed_revenue: 0,
          pending_sales: 0,
          failed_sales: 0,
          cancelled_sales: 0,
          building_type: purchase.building_type,
          building_level: purchase.level,
        };
      }

      buildingSalesByCategory[category].total_sales += 1;
      buildingSalesByCategory[category].total_revenue += purchase.price_ton || 0;

      if (purchase.status === 'completed') {
        buildingSalesByCategory[category].completed_sales += 1;
        buildingSalesByCategory[category].completed_revenue += purchase.price_ton || 0;
      } else if (purchase.status === 'pending') {
        buildingSalesByCategory[category].pending_sales += 1;
      } else if (purchase.status === 'failed') {
        buildingSalesByCategory[category].failed_sales += 1;
      } else if (purchase.status === 'cancelled') {
        buildingSalesByCategory[category].cancelled_sales += 1;
      }
    });

    // Aggregate store sales by product
    const storeSalesByCategory: Record<string, {
      total_sales: number;
      total_revenue: number;
      completed_sales: number;
      completed_revenue: number;
      pending_sales: number;
      failed_sales: number;
      cancelled_sales: number;
      product_key: string;
    }> = {};

    storePurchases?.forEach((purchase) => {
      const category = purchase.product_key;
      if (!storeSalesByCategory[category]) {
        storeSalesByCategory[category] = {
          total_sales: 0,
          total_revenue: 0,
          completed_sales: 0,
          completed_revenue: 0,
          pending_sales: 0,
          failed_sales: 0,
          cancelled_sales: 0,
          product_key: purchase.product_key,
        };
      }

      storeSalesByCategory[category].total_sales += 1;
      storeSalesByCategory[category].total_revenue += purchase.price_ton || 0;

      if (purchase.status === 'completed') {
        storeSalesByCategory[category].completed_sales += 1;
        storeSalesByCategory[category].completed_revenue += purchase.price_ton || 0;
      } else if (purchase.status === 'pending') {
        storeSalesByCategory[category].pending_sales += 1;
      } else if (purchase.status === 'failed') {
        storeSalesByCategory[category].failed_sales += 1;
      } else if (purchase.status === 'cancelled') {
        storeSalesByCategory[category].cancelled_sales += 1;
      }
    });

    // Save building sales
    for (const [category, data] of Object.entries(buildingSalesByCategory)) {
      const { error } = await supabase
        .from("daily_sales")
        .upsert({
          date: yesterdayStr,
          sale_type: 'building',
          sale_category: category,
          building_type: data.building_type,
          building_level: data.building_level,
          total_sales: data.total_sales,
          total_revenue: data.total_revenue,
          completed_sales: data.completed_sales,
          completed_revenue: data.completed_revenue,
          pending_sales: data.pending_sales,
          failed_sales: data.failed_sales,
          cancelled_sales: data.cancelled_sales,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'date,sale_type,sale_category',
        });

      if (error) {
        console.error(`Error saving building sales for ${category}:`, error);
      }
    }

    // Save store sales
    for (const [category, data] of Object.entries(storeSalesByCategory)) {
      const { error } = await supabase
        .from("daily_sales")
        .upsert({
          date: yesterdayStr,
          sale_type: 'store',
          sale_category: category,
          product_key: data.product_key,
          total_sales: data.total_sales,
          total_revenue: data.total_revenue,
          completed_sales: data.completed_sales,
          completed_revenue: data.completed_revenue,
          pending_sales: data.pending_sales,
          failed_sales: data.failed_sales,
          cancelled_sales: data.cancelled_sales,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'date,sale_type,sale_category',
        });

      if (error) {
        console.error(`Error saving store sales for ${category}:`, error);
      }
    }

    console.log(`Successfully captured daily metrics and sales for ${todayStr}`);

    return new Response(
      JSON.stringify({
        success: true,
        date: todayStr,
        metrics_captured: metrics.length + 1, // +1 for aggregate metrics
        sales_captured: Object.keys(buildingSalesByCategory).length + Object.keys(storeSalesByCategory).length,
        metrics,
        aggregate_metrics: aggregateMetrics,
        building_sales_categories: Object.keys(buildingSalesByCategory).length,
        store_sales_categories: Object.keys(storeSalesByCategory).length,
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

