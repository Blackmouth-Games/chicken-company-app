# Instrucciones para Aplicar Migraciones de Supabase

## Opción 1: Dashboard de Supabase (Recomendado - Más Simple)

1. **Accede al Dashboard de Supabase:**
   - Ve a https://supabase.com/dashboard
   - Inicia sesión con tu cuenta
   - Selecciona tu proyecto: `allexcdmfjigijunipxz`

2. **Abre el SQL Editor:**
   - En el menú lateral, haz clic en **"SQL Editor"**
   - Haz clic en **"New query"**

3. **Ejecuta la migración combinada:**
   - Copia todo el contenido del archivo: `supabase/migrations/20250117000002_apply_store_products_updates.sql`
   - Pégalo en el editor SQL
   - Haz clic en **"Run"** o presiona `Ctrl+Enter` (Windows) / `Cmd+Enter` (Mac)

4. **Verifica que se ejecutó correctamente:**
   - Deberías ver un mensaje de éxito
   - Puedes verificar los productos en la tabla `store_products` desde el **Table Editor**

## Opción 2: CLI de Supabase (Para Desarrollo Avanzado)

### Instalación de la CLI:

**Windows (con Scoop):**
```bash
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

**Windows (con Chocolatey):**
```bash
choco install supabase
```

**O descarga manualmente:**
- Ve a https://github.com/supabase/cli/releases
- Descarga el ejecutable para Windows
- Añádelo a tu PATH

### Uso de la CLI:

1. **Vincula tu proyecto local con Supabase:**
   ```bash
   supabase link --project-ref allexcdmfjigijunipxz
   ```

2. **Aplica las migraciones:**
   ```bash
   supabase db push
   ```

   O para aplicar una migración específica:
   ```bash
   supabase migration up
   ```

## Verificación

Después de ejecutar las migraciones, verifica que todo esté correcto:

1. **En el Dashboard de Supabase:**
   - Ve a **Table Editor** → `store_products`
   - Verifica que todos los productos tengan:
     - Nombres correctos
     - Descripciones
     - Precios
     - URLs de imágenes (`store_image_url` y `detail_image_url`)
     - `content_items` con las claves correctas (especialmente `basic_skins_pack` con `corral_1B`, `corral_2B`, etc.)

2. **En tu aplicación:**
   - Ve a la página de Store
   - Verifica que los productos se muestren correctamente
   - Abre el modal de un producto y verifica que la imagen de detalle se muestre

## Notas Importantes

- Las migraciones usan `ON CONFLICT DO UPDATE`, por lo que son **idempotentes** (puedes ejecutarlas múltiples veces sin problemas)
- Si un producto ya existe, se actualizará con los nuevos valores
- Las URLs de imágenes se preservan si ya existen (gracias a `COALESCE`)

