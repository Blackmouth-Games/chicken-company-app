import { Address } from "@ton/core";

// Normalize any TON address (friendly UQ/EQ/raw) into a valid friendly bounceable mainnet URL-safe form.
export function normalizeTonAddress(address: string): string {
  try {
    const parsed = Address.parse(address);
    return parsed.toString({ bounceable: true, urlSafe: true, testOnly: false });
  } catch (e) {
    return address; // fallback: let SDK validate and throw
  }
}
