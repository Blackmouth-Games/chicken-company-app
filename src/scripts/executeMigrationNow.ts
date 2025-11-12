/**
 * Script para ejecutar la migración inmediatamente
 * Usa la Edge Function que ya tiene acceso a SERVICE_ROLE_KEY
 */

import { supabase } from "@/integrations/supabase/client";

async function executeMigration() {
  console.log("🚀 Ejecutando migración de productos de la tienda...\n");

  try {
    const { data, error } = await supabase.functions.invoke('run-migration');

    if (error) {
      console.error("❌ Error:", error);
      throw error;
    }

    console.log("✅ Migración completada exitosamente!");
    console.log("📋 Verifica los productos en el dashboard de Supabase");
    
    return data;
  } catch (error: any) {
    console.error("❌ Error ejecutando migración:", error.message);
    throw error;
  }
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  executeMigration()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { executeMigration };

