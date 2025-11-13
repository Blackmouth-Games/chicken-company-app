# Instrucciones para Desplegar Edge Functions de Supabase

## Método 1: Login Interactivo (Recomendado)

1. Abre una terminal en la raíz del proyecto
2. Ejecuta:
   ```bash
   npx supabase login
   ```
3. Se abrirá tu navegador para autenticarte
4. Una vez autenticado, despliega la función:
   ```bash
   npx supabase functions deploy auth-wallet --project-ref allexcdmfjigijunipxz
   ```

## Método 2: Usando Token de Acceso

1. Obtén tu token de acceso:
   - Ve a: https://supabase.com/dashboard/account/tokens
   - Haz clic en "Generate new token"
   - Copia el token generado

2. En PowerShell, ejecuta:
   ```powershell
   $env:SUPABASE_ACCESS_TOKEN="tu_token_aqui"
   npx supabase functions deploy auth-wallet --project-ref allexcdmfjigijunipxz
   ```

3. O directamente con el token:
   ```bash
   npx supabase functions deploy auth-wallet --project-ref allexcdmfjigijunipxz --token tu_token_aqui
   ```

## Desplegar Todas las Funciones

Para desplegar todas las funciones edge:
```bash
npx supabase functions deploy auth-wallet --project-ref allexcdmfjigijunipxz
npx supabase functions deploy process-store-purchase --project-ref allexcdmfjigijunipxz
npx supabase functions deploy run-migration --project-ref allexcdmfjigijunipxz
```

## Verificar el Despliegue

Después de desplegar, puedes verificar que la función está actualizada en:
https://supabase.com/dashboard/project/allexcdmfjigijunipxz/functions

