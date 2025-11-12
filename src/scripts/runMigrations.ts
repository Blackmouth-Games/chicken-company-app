/**
 * Script para ejecutar migraciones de Supabase automáticamente
 * Este script ejecuta las migraciones SQL usando el cliente de Supabase
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Para ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SUPABASE_URL = "https://allexcdmfjigijunipxz.supabase.co";
// Necesitas la SERVICE_ROLE_KEY para ejecutar migraciones
// Puedes obtenerla desde: Supabase Dashboard → Settings → API → service_role key
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Error: SUPABASE_SERVICE_ROLE_KEY no está configurada.");
  console.log("\n📋 Para ejecutar las migraciones:");
  console.log("1. Ve a https://supabase.com/dashboard");
  console.log("2. Selecciona tu proyecto");
  console.log("3. Ve a Settings → API");
  console.log("4. Copia la 'service_role' key (secreta, no la anon key)");
  console.log("5. Ejecuta:");
  console.log("   Windows PowerShell: $env:SUPABASE_SERVICE_ROLE_KEY='tu_key'; npm run migrate");
  console.log("   Windows CMD: set SUPABASE_SERVICE_ROLE_KEY=tu_key && npm run migrate");
  console.log("   Linux/Mac: SUPABASE_SERVICE_ROLE_KEY=tu_key npm run migrate");
  console.log("\n💡 Alternativa: Ejecuta las migraciones manualmente desde el SQL Editor del dashboard.");
  process.exit(1);
}

async function executeSQL(sql: string): Promise<void> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  // Dividir el SQL en statements individuales
  // Necesitamos ser cuidadosos con los comentarios y strings que contengan ;
  const statements: string[] = [];
  let currentStatement = '';
  let inString = false;
  let stringChar = '';

  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    const nextChar = sql[i + 1];

    // Detectar inicio/fin de strings
    if ((char === "'" || char === '"') && (i === 0 || sql[i - 1] !== '\\')) {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar) {
        inString = false;
        stringChar = '';
      }
    }

    // Si encontramos ; fuera de un string, es el fin de un statement
    if (char === ';' && !inString) {
      currentStatement = currentStatement.trim();
      // Filtrar comentarios y líneas vacías
      if (currentStatement.length > 0 && !currentStatement.startsWith('--')) {
        statements.push(currentStatement);
      }
      currentStatement = '';
    } else {
      currentStatement += char;
    }
  }

  // Agregar el último statement si existe
  if (currentStatement.trim().length > 0 && !currentStatement.trim().startsWith('--')) {
    statements.push(currentStatement.trim());
  }

  console.log(`📝 Encontrados ${statements.length} statements SQL\n`);

  // Ejecutar cada statement usando la API REST directamente
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    if (statement.length === 0) continue;

    console.log(`⏳ Ejecutando statement ${i + 1}/${statements.length}...`);
    
    try {
      // Usar fetch para ejecutar SQL a través de PostgREST
      // Necesitamos crear una función helper primero o usar el método directo
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({ sql_query: statement + ';' })
      });

      if (!response.ok) {
        const errorText = await response.text();
        // Si la función no existe, intentar crear las funciones directamente
        if (response.status === 404 || errorText.includes('function') || errorText.includes('exec_sql')) {
          console.log("⚠️  La función helper no existe. Ejecutando statements directamente...");
          
          // Intentar ejecutar directamente usando el método de Supabase
          // Para esto necesitamos usar una función SQL que ya exista o crear una
          // Por ahora, mejor mostrar instrucciones
          console.log("\n❌ No se puede ejecutar SQL directamente desde el cliente por seguridad.");
          console.log("\n📋 Por favor, ejecuta las migraciones manualmente:");
          console.log("1. Ve a https://supabase.com/dashboard/project/allexcdmfjigijunipxz");
          console.log("2. SQL Editor → New query");
          console.log("3. Copia el contenido de: supabase/migrations/20250117000002_apply_store_products_updates.sql");
          console.log("4. Pega y ejecuta (Ctrl+Enter o Run)");
          process.exit(1);
        }
        throw new Error(`Failed: ${errorText}`);
      }

      console.log(`✅ Statement ${i + 1} ejecutado correctamente\n`);
    } catch (error: any) {
      console.error(`❌ Error en statement ${i + 1}:`, error.message);
      throw error;
    }
  }
}

async function runMigration() {
  console.log("🚀 Iniciando migración de productos de la tienda...\n");

  try {
    // Leer el archivo SQL de migración
    const migrationPath = join(process.cwd(), 'supabase', 'migrations', '20250117000002_apply_store_products_updates.sql');
    const sql = readFileSync(migrationPath, 'utf-8');

    console.log("📄 Leyendo migración: 20250117000002_apply_store_products_updates.sql\n");
    
    // Ejecutar el SQL completo
    await executeSQL(sql);

    console.log("\n✅ ¡Migración completada exitosamente!");
    console.log("\n📋 Verifica los productos en:");
    console.log("   https://supabase.com/dashboard/project/allexcdmfjigijunipxz/editor/table/store_products");

  } catch (error: any) {
    console.error("\n❌ Error ejecutando migración:", error.message);
    console.log("\n💡 Alternativa: Ejecuta las migraciones manualmente desde el SQL Editor del dashboard.");
    console.log("   Archivo: supabase/migrations/20250117000002_apply_store_products_updates.sql");
    process.exit(1);
  }
}

runMigration();

