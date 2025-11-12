# ✅ Checklist de Verificación - Migraciones de Productos de la Tienda

## 📋 Estado de Archivos

### ✅ Migraciones SQL Creadas
- [x] `supabase/migrations/20250117000000_update_store_products_skin_keys.sql`
  - Actualiza las claves de skins del `basic_skins_pack`
  
- [x] `supabase/migrations/20250117000001_insert_all_store_products.sql`
  - Inserta/actualiza todos los productos con datos completos
  
- [x] `supabase/migrations/20250117000002_apply_store_products_updates.sql`
  - **Migración combinada** (recomendada para ejecutar)
  - Combina ambas actualizaciones en un solo archivo

### ✅ Edge Function Creada
- [x] `supabase/functions/run-migration/index.ts`
  - Función para ejecutar la migración automáticamente
  - Usa SERVICE_ROLE_KEY automáticamente
  
- [x] `supabase/config.toml`
  - Configuración de la función `run-migration` agregada
  - `verify_jwt = false` configurado

### ✅ Código Actualizado
- [x] `src/pages/Store.tsx`
  - ✅ Removido el `useEffect` que llamaba a `updateStoreProducts`
  - ✅ Comentario indicando que todo se gestiona desde migraciones
  
- [x] `src/scripts/updateStoreProducts.ts`
  - ⚠️ Archivo existe pero ya no se usa (puede quedar como referencia)
  - Solo actualiza URLs de imágenes (ahora se hace en migraciones)

### ✅ Scripts de Migración
- [x] `src/scripts/applyStoreProductsMigration.ts`
  - Script Node.js para ejecutar migración (requiere SERVICE_ROLE_KEY)
  
- [x] `src/scripts/runMigrations.ts`
  - Script alternativo (requiere función SQL helper)
  
- [x] `src/scripts/executeMigrationDirect.ts`
  - Script directo (tiene problemas con localStorage en Node.js)

## ⚠️ Pendiente de Ejecutar

### 1. Ejecutar Migraciones SQL en la Base de Datos

**Opción A: SQL Editor (Recomendado)**
1. Ve a: https://supabase.com/dashboard/project/allexcdmfjigijunipxz
2. Abre **SQL Editor** → **New query**
3. Copia el contenido de: `supabase/migrations/20250117000002_apply_store_products_updates.sql`
4. Pega y ejecuta (Ctrl+Enter o Run)
5. Verifica que se ejecutó correctamente

**Opción B: Edge Function (Requiere despliegue)**
1. Despliega la función:
   ```bash
   supabase functions deploy run-migration
   ```
2. Ejecuta la función desde el código o desde AdminMigrations

**Opción C: Script Node.js (Requiere SERVICE_ROLE_KEY)**
```bash
# Windows PowerShell
$env:SUPABASE_SERVICE_ROLE_KEY='tu_key'; npm run migrate:store

# Windows CMD
set SUPABASE_SERVICE_ROLE_KEY=tu_key && npm run migrate:store

# Linux/Mac
SUPABASE_SERVICE_ROLE_KEY=tu_key npm run migrate:store
```

### 2. Desplegar Edge Function (Opcional)

Si quieres usar la Edge Function para ejecutar migraciones desde la UI:

```bash
supabase functions deploy run-migration
```

Luego puedes llamarla desde:
- `src/pages/AdminMigrations.tsx` (página creada pero no agregada al router)
- O directamente: `supabase.functions.invoke('run-migration')`

## ✅ Verificación Post-Migración

Después de ejecutar la migración, verifica:

1. **En el Dashboard de Supabase:**
   - Ve a **Table Editor** → `store_products`
   - Verifica que todos los productos tengan:
     - ✅ Nombres correctos
     - ✅ Descripciones
     - ✅ Precios correctos
     - ✅ URLs de imágenes (`store_image_url` y `detail_image_url`)
     - ✅ `content_items` correctos
     - ✅ `basic_skins_pack` tiene `['corral_1B', 'corral_2B', 'corral_3B', 'warehouse_1B', 'market_1B']`

2. **En tu aplicación:**
   - Ve a la página de Store (`/store`)
   - Verifica que los productos se muestren correctamente
   - Abre el modal de un producto y verifica las imágenes
   - Verifica que los nombres y descripciones sean correctos

## 📝 Notas

- Las migraciones son **idempotentes** (puedes ejecutarlas múltiples veces sin problemas)
- El script `updateStoreProducts.ts` ya no se usa pero puede quedar como referencia
- La Edge Function `run-migration` está lista pero necesita ser desplegada
- La página `AdminMigrations.tsx` está creada pero no agregada al router (opcional)

## 🎯 Acción Requerida

**EJECUTAR LA MIGRACIÓN SQL:**
- Usa el SQL Editor del dashboard de Supabase
- Ejecuta: `supabase/migrations/20250117000002_apply_store_products_updates.sql`

