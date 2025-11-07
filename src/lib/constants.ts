// TON Wallet Configuration
// TODO: Replace with your actual TON wallet address
export const TON_RECEIVER_WALLET = "UQD5D_QOx3KxNVGcXPLp15j_pJvA2Z5BCjJWIYVHHPLvQ3K8";

// Transaction timeout in seconds
export const TRANSACTION_TIMEOUT = 60;

// Building types
export const BUILDING_TYPES = {
  CORRAL: "corral",
  MARKET: "market",
  WAREHOUSE: "warehouse",
} as const;

export type BuildingType = typeof BUILDING_TYPES[keyof typeof BUILDING_TYPES];

// Special position indices for fixed buildings
export const FIXED_BUILDING_POSITIONS = {
  WAREHOUSE: -1,
  MARKET: -2,
} as const;
