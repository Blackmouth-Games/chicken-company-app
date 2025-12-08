# 🐔 Sistema de Staking & Rewards - Guía Completa

## 🎮 Contexto del Proyecto

**Chicken Company** es un juego web3 donde:

1. **Gallineros**: Usuarios compran gallinas (1 gallina = 1 TON). Los gallineros producen huevos según:
   - % de llenado del gallinero → más eficiencia
   - Boosts del minijuego → puede superar 100%

2. **Almacén**: Almacena huevos. Si está lleno, los huevos se pierden (beneficio empresa).

3. **Market**: Vehículo recoge huevos del almacén. Velocidad y capacidad según nivel.

4. **Rewards**: Los huevos que llegan al market determinan las recompensas en TON.

### Modelo de Negocio:
- **Usuario base**: recibe 80% de sus rewards
- **Empresa**: recibe 20% de cada usuario
- **Con boosts**: usuario puede llegar a 93%, empresa mínimo 7%

---

## 📋 Resumen del Sistema

Sistema de distribución de recompensas basado en Merkle tree para TON (y futuro Solana).

### Flujo General:
```
Gallineros → Huevos → Almacén → Vehículo → Market
                                              ↓
                                    eggs_market (métricas)
                                              ↓
                              Edge Function: generate_epoch_snapshot
                                              ↓
                                    Merkle Tree + Allocations
                                              ↓
                              Contrato TON: Distributor.tact
                                              ↓
                                    Usuario hace CLAIM
```

---

## ✅ Componentes Completados

### 1. Base de Datos (Supabase)

| Tabla/Función | Descripción | Estado |
|---------------|-------------|--------|
| `staking_epochs` | Epochs de reparto | ✅ |
| `staking_epoch_allocations` | Asignaciones por usuario | ✅ |
| `user_boosts` | Boosts del minijuego | ✅ |
| `fn_epoch_eggs()` | Agrega huevos por usuario/epoch | ✅ |
| `get_user_fee_reduction()` | Obtiene reducción de fee por boosts | ✅ |
| `add_minigame_boost()` | Añade boost del minijuego | ✅ |
| Soporte multi-chain (TON/SOL) | Columna `chain` en tablas | ✅ |

### 2. Edge Functions (Supabase)

| Función | Ubicación | Estado |
|---------|-----------|--------|
| `generate_epoch_snapshot` | `supabase/functions/generate_epoch_snapshot/` | ✅ |
| `get_claim_info` | `supabase/functions/get_claim_info/` | ✅ |

### 3. Frontend (React)

| Componente | Descripción | Estado |
|------------|-------------|--------|
| `useEggSystem.ts` | Tracking de huevos (batch cada 10s) | ✅ |
| Eventos `eggs_produced_batch` | Huevos generados | ✅ |
| Eventos `eggs_market_batch` | Huevos que llegan al market | ✅ |

### 4. Smart Contract (TON/Tact)

| Archivo | Ubicación | Estado |
|---------|-----------|--------|
| `Distributor.tact` | `contracts/ton-deploy/contracts/distributor.tact` | ✅ Compilado |

---

## ⚠️ Pendiente de Ejecutar

### SQL que DEBES ejecutar en Supabase:

Ejecuta este **validador** primero para ver qué tienes:

```sql
SELECT 'tabla', 'staking_epochs', 
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'staking_epochs') 
  THEN '✅ EXISTE' ELSE '❌ FALTA' END
UNION ALL
SELECT 'tabla', 'staking_epoch_allocations',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'staking_epoch_allocations') 
  THEN '✅ EXISTE' ELSE '❌ FALTA' END
UNION ALL
SELECT 'tabla', 'user_boosts',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_boosts') 
  THEN '✅ EXISTE' ELSE '❌ FALTA' END
UNION ALL
SELECT 'columna', 'staking_epochs.chain',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'staking_epochs' AND column_name = 'chain') 
  THEN '✅ EXISTE' ELSE '❌ FALTA' END
UNION ALL
SELECT 'función', 'get_user_fee_reduction',
  CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_user_fee_reduction') 
  THEN '✅ EXISTE' ELSE '❌ FALTA' END;
```

### Si falta `user_boosts`, ejecuta:

```sql
-- Tabla user_boosts (boosts del minijuego)
CREATE TABLE IF NOT EXISTS public.user_boosts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  boost_type text NOT NULL,
  boost_value numeric NOT NULL,
  source text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_boosts_boost_type_check CHECK (boost_type IN ('fee_reduction', 'production_boost')),
  CONSTRAINT user_boosts_fee_reduction_check CHECK (
    boost_type != 'fee_reduction' OR (boost_value >= 0 AND boost_value <= 0.13)
  )
);

CREATE INDEX IF NOT EXISTS idx_user_boosts_user_id ON public.user_boosts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_boosts_active ON public.user_boosts(user_id, is_active, expires_at);

ALTER TABLE public.user_boosts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own boosts" ON public.user_boosts
FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own boosts" ON public.user_boosts
FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Función para obtener reducción de fee
CREATE OR REPLACE FUNCTION get_user_fee_reduction(p_user_id uuid)
RETURNS numeric AS $$
BEGIN
  RETURN COALESCE((
    SELECT LEAST(SUM(boost_value), 0.13)
    FROM public.user_boosts
    WHERE user_id = p_user_id
      AND boost_type = 'fee_reduction'
      AND is_active = true
      AND expires_at > now()
  ), 0);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Función para añadir boost del minijuego
CREATE OR REPLACE FUNCTION add_minigame_boost(
  p_user_id uuid,
  p_boost_value numeric,
  p_duration_minutes integer
)
RETURNS uuid AS $$
DECLARE v_boost_id uuid;
BEGIN
  INSERT INTO public.user_boosts (user_id, boost_type, boost_value, source, expires_at)
  VALUES (p_user_id, 'fee_reduction', LEAST(p_boost_value, 0.13), 'minigame', 
          now() + (p_duration_minutes || ' minutes')::interval)
  RETURNING id INTO v_boost_id;
  RETURN v_boost_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_user_fee_reduction(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION add_minigame_boost(uuid, numeric, integer) TO authenticated;
```

### Si falta multi-chain (columna `chain`), ejecuta:

```sql
-- Añadir soporte multi-chain
ALTER TABLE public.staking_epochs 
ADD COLUMN IF NOT EXISTS chain text NOT NULL DEFAULT 'ton';

ALTER TABLE public.staking_epochs 
ADD CONSTRAINT staking_epochs_chain_check CHECK (chain IN ('ton', 'sol'));

ALTER TABLE public.staking_epoch_allocations 
ADD COLUMN IF NOT EXISTS chain text NOT NULL DEFAULT 'ton';

ALTER TABLE public.staking_epoch_allocations 
ADD COLUMN IF NOT EXISTS amount_base_units bigint;

-- Actualizar fn_epoch_eggs para aceptar chain
CREATE OR REPLACE FUNCTION public.fn_epoch_eggs(
  _epoch_start timestamptz,
  _epoch_end   timestamptz,
  _chain       text DEFAULT 'ton'
)
RETURNS TABLE (
  user_id uuid,
  wallet_address text,
  eggs_produced bigint,
  eggs_market bigint
) AS $$
BEGIN
  RETURN QUERY
  WITH chain_wallets AS (
    SELECT DISTINCT ON (uw.user_id)
      uw.user_id,
      uw.wallet_address
    FROM public.user_wallets uw
    WHERE UPPER(uw.blockchain) = UPPER(_chain)
    ORDER BY uw.user_id, uw.is_primary DESC, uw.last_used_at DESC
  ),
  produced AS (
    SELECT me.user_id, SUM(me.event_value)::bigint AS eggs_produced
    FROM public.metric_events me
    WHERE me.event_type = 'eggs_produced_batch'
      AND me.created_at >= _epoch_start AND me.created_at < _epoch_end
    GROUP BY me.user_id
  ),
  market AS (
    SELECT me.user_id, SUM(me.event_value)::bigint AS eggs_market
    FROM public.metric_events me
    WHERE me.event_type = 'eggs_market_batch'
      AND me.created_at >= _epoch_start AND me.created_at < _epoch_end
    GROUP BY me.user_id
  )
  SELECT p.id, cw.wallet_address,
    COALESCE(pr.eggs_produced, 0), COALESCE(mk.eggs_market, 0)
  FROM public.profiles p
  JOIN chain_wallets cw ON cw.user_id = p.id
  LEFT JOIN produced pr ON pr.user_id = p.id
  LEFT JOIN market mk ON mk.user_id = p.id
  WHERE COALESCE(pr.eggs_produced, 0) > 0 AND COALESCE(mk.eggs_market, 0) > 0;
END;
$$ LANGUAGE plpgsql STABLE;
```

---

## 🚀 Deploy del Contrato TON (Testnet)

### Paso 1: Obtener TON de Testnet

1. Abre **Tonkeeper** en tu móvil
2. Activa modo testnet: Ajustes → toca 5 veces el logo → "Switch to Testnet"
3. Copia tu dirección
4. Pide TON en: https://t.me/testgiver_ton_bot

### Paso 2: Compilar el contrato

```bash
cd F:\Git\Projects\chicken-company-app\contracts\ton-deploy
npx blueprint build
# Selecciona: Distributor
```

### Paso 3: Desplegar en testnet

```bash
npx blueprint run --testnet --tonconnect
```

1. Aparecerá un QR code
2. Escanéalo con Tonkeeper (en modo testnet)
3. Aprueba la transacción
4. ¡Contrato desplegado!

### Paso 4: Guardar la dirección del contrato

Después del deploy, anota la dirección del contrato desplegado:
```
DISTRIBUTOR_CONTRACT_ADDRESS = "EQ..."
```

---

## 📊 Modelo de Rewards

### Fórmulas:

```
efficiency = eggs_market / eggs_produced    (0 a 1)
weight = stake_user × efficiency            (stake_user = 1 por ahora)
r_u = totalRewards × (weight_u / Σweight)   (reward teórico)

company_fee = 0.20 - boosts                 (20% base, 7% mínimo)
userReward = r_u × (1 - company_fee)        (80-93% para usuario)
companyPart = r_u × company_fee             (7-20% para empresa)
```

### Split Usuario/Empresa:

| Escenario | Usuario | Empresa |
|-----------|---------|---------|
| Sin boosts | 80% | 20% |
| Boosts máximos | 93% | 7% |

---

## 🎮 Uso de las Edge Functions

### Generar Epoch Snapshot:

```bash
curl -X POST 'https://YOUR_PROJECT.supabase.co/functions/v1/generate_epoch_snapshot' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "epochNumber": 1,
    "epochStart": "2025-01-01T00:00:00Z",
    "epochEnd": "2025-01-08T00:00:00Z",
    "totalRewards": "100.0",
    "chain": "ton",
    "companyWallet": "UQCXgTzQlsYDSmL7fIHRQruX04fYhst_JrQifmUkRUyvUSlo"
  }'
```

### Obtener Claim Info:

```bash
curl -X POST 'https://YOUR_PROJECT.supabase.co/functions/v1/get_claim_info' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "walletAddress": "UQxxx...",
    "chain": "ton"
  }'
```

---

## 🔄 Flujo Completo de un Epoch

### 1. Durante el epoch (automático):
- Usuarios juegan
- `useEggSystem.ts` registra `eggs_produced_batch` y `eggs_market_batch`
- Datos se envían a Supabase cada 10 segundos

### 2. Al cerrar el epoch (admin):
```
POST /generate_epoch_snapshot
→ Calcula efficiency por usuario
→ Aplica fee de empresa (20% - boosts)
→ Genera Merkle tree
→ Guarda allocations + merkle_root
```

### 3. Publicar root on-chain (admin):
```
Contrato.updateRoot(epoch, merkle_root)
```

### 4. Usuario hace claim:
```
GET /get_claim_info → {amount, proof}
Contrato.claim(epoch, amount, proof)
→ Usuario recibe TON
```

---

## ❌ Funcionalidades NO Implementadas

| Feature | Descripción | Prioridad |
|---------|-------------|-----------|
| Withdraw gallinero | Retirar TON/SOL (vender gallinas) | Alta |
| Reducir gallinas | Permitir reducir cantidad | Alta |
| Minijuego | Juego que da boosts | Media |
| UI Claim TonConnect | Interfaz para hacer claim | Media |
| Contrato Solana | Versión Rust del Distributor | Baja |

---

## 📁 Estructura de Archivos

```
chicken-company-app/
├── contracts/
│   ├── ton/
│   │   ├── Distributor.tact      # Contrato original
│   │   └── README.md
│   └── ton-deploy/               # Proyecto Blueprint
│       ├── contracts/
│       │   └── distributor.tact  # Contrato compilable
│       ├── build/
│       │   └── Distributor.compiled.json
│       └── package.json
├── supabase/
│   ├── functions/
│   │   ├── generate_epoch_snapshot/
│   │   │   ├── index.ts
│   │   │   └── merkle_utils.ts
│   │   └── get_claim_info/
│   │       └── index.ts
│   └── migrations/
│       ├── 20250129000000_create_staking_epochs.sql
│       └── 20250130000000_create_user_boosts.sql
└── src/
    └── hooks/
        └── useEggSystem.ts       # Tracking de huevos
```

---

## 🔐 Direcciones Importantes

### Testnet:
```
Owner/Company Wallet: UQCXgTzQlsYDSmL7fIHRQruX04fYhst_JrQifmUkRUyvUSlo
Distributor Contract: [PENDIENTE - después del deploy]
```

### Mainnet:
```
Owner/Company Wallet: [PENDIENTE]
Distributor Contract: [PENDIENTE]
```

---

## 📞 Comandos Útiles

```bash
# Compilar contrato
cd contracts/ton-deploy
npx blueprint build

# Desplegar en testnet
npx blueprint run --testnet --tonconnect

# Desplegar Edge Functions
supabase functions deploy generate_epoch_snapshot
supabase functions deploy get_claim_info

# Ver logs de Edge Functions
supabase functions logs generate_epoch_snapshot
```

---

## 🐛 Bugs Conocidos

1. **Telegram Desktop**: Los gallineros no se generan correctamente (investigar `useEggSystem.ts`)

---

*Última actualización: Diciembre 2025*

