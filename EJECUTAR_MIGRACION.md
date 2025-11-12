# Cómo Ejecutar las Migraciones

## Opción 1: Edge Function (Más Simple - Sin necesidad de SERVICE_ROLE_KEY)

He creado una Edge Function que ejecuta la migración automáticamente. Solo necesitas llamarla:

1. **Despliega la Edge Function** (si aún no está desplegada):
   ```bash
   supabase functions deploy run-migration
   ```

2. **Ejecuta la función** desde tu aplicación o directamente:
   ```bash
   curl -X POST https://allexcdmfjigijunipxz.supabase.co/functions/v1/run-migration \
     -H "Authorization: Bearer TU_ANON_KEY"
   ```

   O desde el código:
   ```typescript
   const { data, error } = await supabase.functions.invoke('run-migration');
   ```

## Opción 2: Script Node.js (Requiere SERVICE_ROLE_KEY)

1. **Obtén tu SERVICE_ROLE_KEY:**
   - Ve a https://supabase.com/dashboard
   - Selecciona tu proyecto
   - Ve a **Settings → API**
   - Copia la **service_role** key (secreta, no la anon key)

2. **Ejecuta el script:**
   
   **Windows PowerShell:**
   ```powershell
   $env:SUPABASE_SERVICE_ROLE_KEY='tu_service_role_key_aqui'
   npm run migrate:store
   ```
   
   **Windows CMD:**
   ```cmd
   set SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui && npm run migrate:store
   ```
   
   **Linux/Mac:**
   ```bash
   SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui npm run migrate:store
   ```

## Opción 3: SQL Editor del Dashboard (Recomendado - Más Seguro)

1. Ve a https://supabase.com/dashboard/project/allexcdmfjigijunipxz
2. Abre **SQL Editor** → **New query**
3. Copia el contenido completo de: `supabase/migrations/20250117000002_apply_store_products_updates.sql`
4. Pégalo en el editor
5. Haz clic en **Run** o presiona `Ctrl+Enter` (Windows) / `Cmd+Enter` (Mac)

## Verificación

Después de ejecutar la migración, verifica:

1. **En el Dashboard:**
   - Ve a **Table Editor** → `store_products`
   - Verifica que todos los productos tengan:
     - ✅ Nombres correctos
     - ✅ Descripciones
     - ✅ Precios
     - ✅ URLs de imágenes (`store_image_url` y `detail_image_url`)
     - ✅ `content_items` correctos (especialmente `basic_skins_pack` con `corral_1B`, `corral_2B`, etc.)

2. **En tu aplicación:**
   - Ve a la página de Store
   - Verifica que los productos se muestren correctamente
   - Abre el modal de un producto y verifica las imágenes

