// Merkle Tree utilities for epoch snapshot generation
// Uses SHA-256 standard (compatible with TON/Tact contracts)

import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";
import { encodeHex } from "https://deno.land/std@0.168.0/encoding/hex.ts";

/**
 * Computes SHA-256 hash of a string input (async)
 * Returns hex string (without 0x prefix)
 * 
 * CANONICAL FORMAT FOR LEAVES:
 * leaf_input = wallet_address + ":" + amount_nano_as_decimal_string
 * leaf_hash = sha256(leaf_input)
 */
export async function sha256Hex(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = new Uint8Array(hashBuffer);
  return encodeHex(hashArray);
}

/**
 * Hash two nodes together for Merkle tree
 * Sorts the hashes lexicographically before combining (canonical ordering)
 * hash_parent = sha256(left || right) where left < right lexicographically
 */
async function hashPair(left: string, right: string): Promise<string> {
  // Sort lexicographically to ensure consistent ordering
  const [a, b] = [left, right].sort();
  return await sha256Hex(a + b);
}

/**
 * Creates a canonical leaf hash for a user allocation
 * 
 * CANONICAL FORMAT (multi-chain):
 * amount_base_units = floor(reward_token * base_unit_multiplier)
 * leaf_input = wallet_address + ":" + amount_base_units.toString()
 * leaf_hash = sha256(leaf_input)
 * 
 * For TON: base_unit_multiplier = 1e9 (nanoTON)
 * For SOL: base_unit_multiplier = 1e9 (lamports)
 * 
 * This format MUST match exactly what the smart contract expects!
 */
export async function createAllocationLeaf(
  walletAddress: string,
  amountBaseUnits: bigint
): Promise<string> {
  // Canonical format: wallet:amount_base_units
  const leafInput = `${walletAddress}:${amountBaseUnits.toString()}`;
  return await sha256Hex(leafInput);
}

/**
 * Builds a Merkle tree from an array of leaf hashes (async)
 * Returns the root hash and proofs for each leaf
 * 
 * Tree construction:
 * - Leaves are NOT sorted (order preserved for proof generation)
 * - Siblings ARE sorted lexicographically before hashing
 * - Padded to power of 2 by duplicating last leaf
 */
export async function buildMerkleTree(leaves: string[]): Promise<{
  root: string;
  proofsByLeaf: Record<string, string[]>;
}> {
  if (leaves.length === 0) {
    return { root: "", proofsByLeaf: {} };
  }

  if (leaves.length === 1) {
    return {
      root: leaves[0],
      proofsByLeaf: { [leaves[0]]: [] }
    };
  }

  // Make a copy and pad to power of 2 if needed
  const paddedLeaves = [...leaves];
  while (paddedLeaves.length & (paddedLeaves.length - 1)) {
    // Duplicate last leaf to pad to power of 2
    paddedLeaves.push(paddedLeaves[paddedLeaves.length - 1]);
  }

  // Build tree levels from bottom up
  const levels: string[][] = [paddedLeaves];
  let currentLevel = paddedLeaves;

  while (currentLevel.length > 1) {
    const nextLevel: string[] = [];
    for (let i = 0; i < currentLevel.length; i += 2) {
      const left = currentLevel[i];
      const right = currentLevel[i + 1] || left;
      nextLevel.push(await hashPair(left, right));
    }
    levels.push(nextLevel);
    currentLevel = nextLevel;
  }

  const root = currentLevel[0];

  // Generate proofs for each original leaf
  const proofsByLeaf: Record<string, string[]> = {};
  
  for (let leafIndex = 0; leafIndex < leaves.length; leafIndex++) {
    const leaf = leaves[leafIndex];
    const proof: string[] = [];
    let index = leafIndex;

    for (let level = 0; level < levels.length - 1; level++) {
      const levelNodes = levels[level];
      const isRightNode = index % 2 === 1;
      const siblingIndex = isRightNode ? index - 1 : index + 1;
      
      if (siblingIndex < levelNodes.length) {
        proof.push(levelNodes[siblingIndex]);
      }
      
      index = Math.floor(index / 2);
    }

    proofsByLeaf[leaf] = proof;
  }

  return { root, proofsByLeaf };
}

/**
 * Verifies a Merkle proof (async)
 * Returns true if the proof is valid for the given leaf and root
 */
export async function verifyMerkleProof(
  leaf: string,
  proof: string[],
  root: string
): Promise<boolean> {
  let computedHash = leaf;
  
  for (const proofElement of proof) {
    computedHash = await hashPair(computedHash, proofElement);
  }
  
  return computedHash === root;
}
