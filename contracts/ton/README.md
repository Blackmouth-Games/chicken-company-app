# Distributor Contract (TON/Tact)

Contrato de distribución de recompensas para TON blockchain.
100% non-custodial, basado en Merkle tree.

## Características

- ✅ **Non-Custodial**: El owner solo puede actualizar roots, no retirar fondos
- ✅ **Merkle Proof**: Verificación on-chain de claims válidos
- ✅ **Anti-replay**: Tracking de claims por (epoch, wallet)
- ✅ **Pull Model**: El usuario inicia el claim, `msg.sender` = identidad

## Formato del Leaf (Merkle)

```
amount_nano = floor(reward_ton * 1e9)
leaf_input = wallet_address_string + ":" + amount_nano.toString()
leaf_hash = sha256(leaf_input)
```

**Ejemplo:**
```
wallet: "EQBvI0aFLnw2QNqNxR..."
amount_nano: 5250000000
leaf_input: "EQBvI0aFLnw2QNqNxR...:5250000000"
leaf_hash: sha256(leaf_input)
```

## Mensajes

### `updateRoot` (solo owner)
Actualiza el Merkle root para un epoch.

```
epoch: int32
newRoot: cell (slice del hash hex)
```

### `claim` (usuarios)
Reclama recompensas con proof.

```
epoch: int32
amountNano: coins (nanoTON)
proofLen: int16
proof: [cell, cell, ...]  // Merkle siblings
```

## Despliegue en Testnet

### 1. Instalar dependencias
```bash
npm install -g @tact-lang/compiler
```

### 2. Compilar
```bash
tact compile Distributor.tact
```

### 3. Desplegar
```bash
# Usando blueprint o tondev
npx blueprint deploy Distributor --network testnet
```

### 4. Configurar owner
El owner debe ser una wallet multisig para seguridad.

## Testing Flow

1. **Generar epoch en Supabase:**
```json
POST /functions/v1/generate_epoch_snapshot
{
  "epochNumber": 1,
  "epochStart": "2025-01-01T00:00:00Z",
  "epochEnd": "2025-01-02T00:00:00Z",
  "totalRewards": "10.0",
  "chain": "ton"
}
```

2. **Obtener merkle_root de la respuesta**

3. **Llamar updateRoot desde owner:**
```
epoch: 1
newRoot: <merkle_root del paso anterior>
```

4. **Usuario obtiene claim info:**
```json
POST /functions/v1/get_claim_info
{
  "walletAddress": "EQBvI0aFLnw2QNqNxR...",
  "chain": "ton"
}
```

5. **Usuario ejecuta claim:**
```
epoch: 1
amountNano: <amountBaseUnits de la respuesta>
proof: <proof array de la respuesta>
```

6. **Verificar que recibe TON** ✓

7. **Intentar segundo claim → debe fallar** ✓

## Integración con Frontend

```typescript
// 1. Obtener claim info
const response = await fetch('/functions/v1/get_claim_info', {
  method: 'POST',
  body: JSON.stringify({ 
    walletAddress: tonConnectWallet.address,
    chain: 'ton'
  })
});
const { claims } = await response.json();

// 2. Preparar mensaje de claim
const claim = claims[0];
const message = {
  to: DISTRIBUTOR_ADDRESS,
  value: toNano('0.05'), // gas
  body: beginCell()
    .storeUint(0, 32) // op: claim
    .storeInt(claim.epochNumber, 32)
    .storeCoins(BigInt(claim.allocation.amountBaseUnits))
    .storeInt(claim.allocation.proof.length, 16)
    // ... store proof cells
    .endCell()
};

// 3. Enviar transacción
await tonConnectUI.sendTransaction({ messages: [message] });
```

## Seguridad

- El owner **NO puede** retirar fondos del contrato
- El owner **SOLO puede** actualizar Merkle roots
- Los usuarios **SOLO pueden** reclamar su propia asignación (verificado via `msg.sender`)
- **Double-claim protection**: `claimed[(epoch, wallet)] = true`

## Gas Estimado

| Operación | Gas (TON) |
|-----------|-----------|
| updateRoot | ~0.01 TON |
| claim | ~0.05 TON |

## Próximos Pasos

1. Auditar contrato
2. Deploy en mainnet
3. Configurar multisig como owner
4. Integrar con frontend (TonConnect)




