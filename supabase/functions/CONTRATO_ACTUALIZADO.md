# ✅ Edge Functions Actualizadas con Dirección del Contrato

## 📋 Actualización Realizada

**Fecha**: 2025-01-30  
**Contrato Desplegado**: `EQDEnTBYm8p9JbQ6jdlfqp1DwMYGUtsYSafrvQxl65cU93rt`

## 🔄 Funciones Actualizadas

### 1. `generate_epoch_snapshot`
- ✅ Agregada constante `DISTRIBUTOR_CONTRACT_ADDRESSES`
- ✅ Dirección del contrato incluida en la respuesta JSON
- ✅ Campo `contractAddress` disponible para el frontend

### 2. `get_claim_info`
- ✅ Agregada constante `DISTRIBUTOR_CONTRACT_ADDRESSES`
- ✅ Dirección del contrato incluida en la respuesta JSON
- ✅ Campo `contractAddress` disponible para el frontend

## 📝 Cambios Realizados

### Constante Agregada
```typescript
const DISTRIBUTOR_CONTRACT_ADDRESSES: Record<string, string> = {
  ton: 'EQDEnTBYm8p9JbQ6jdlfqp1DwMYGUtsYSafrvQxl65cU93rt', // Testnet
  sol: '', // TODO: Configurar cuando se despliegue en Solana
};
```

### Respuesta Actualizada

**generate_epoch_snapshot** ahora incluye:
```json
{
  "success": true,
  "contractAddress": "EQDEnTBYm8p9JbQ6jdlfqp1DwMYGUtsYSafrvQxl65cU93rt",
  ...
}
```

**get_claim_info** ahora incluye:
```json
{
  "claims": [...],
  "contractAddress": "EQDEnTBYm8p9JbQ6jdlfqp1DwMYGUtsYSafrvQxl65cU93rt",
  ...
}
```

## 🚀 Próximos Pasos

1. ✅ Contrato desplegado en testnet
2. ✅ Edge Functions actualizadas con la dirección
3. ⏭️ Desplegar las Edge Functions actualizadas a Supabase
4. ⏭️ Probar el flujo completo de epochs y claims

## 📚 Notas

- La dirección del contrato está hardcodeada en las funciones
- Cuando se despliegue en mainnet, actualizar la constante
- El frontend puede usar `contractAddress` de las respuestas para hacer claims


