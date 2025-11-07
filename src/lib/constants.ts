// TON Wallet Configuration
// Merchant wallet address in bounceable format
export const TON_RECEIVER_WALLET = "EQBLTGjBkVr7kMNlxfaTZmWC5mk4ADKb8PvcgaM_NzQMQpMn";

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
