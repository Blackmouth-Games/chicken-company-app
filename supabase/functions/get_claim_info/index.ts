// Edge Function: get_claim_info
// Returns claim information for a user including amount and Merkle proof
// Used by the frontend to prepare claim transactions
//
// SUPPORTS: TON, SOL (multi-chain)
//
// CANONICAL LEAF FORMAT (must match contract):
// amount_base_units = stored in DB (nanoTON, lamports, etc.)
// leaf_input = wallet_address + ":" + amount_base_units.toString()
// leaf_hash = sha256(leaf_input)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";
import { encodeHex } from "https://deno.land/std@0.168.0/encoding/hex.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Chain configurations
const CHAIN_CONFIG: Record<string, { 
  baseUnitName: string;
  tokenName: string;
}> = {
  ton: { baseUnitName: 'nanoTON', tokenName: 'TON' },
  sol: { baseUnitName: 'lamports', tokenName: 'SOL' },
};

interface ClaimInfoRequest {
  walletAddress?: string;
  userId?: string;
  epochNumber?: number;  // Optional: specific epoch, or get all unclaimed
  chain?: string;  // 'ton' | 'sol' (default: 'ton')
}

interface AllocationData {
  id: string;
  epoch_id: string;
  user_id: string;
  wallet_address: string;
  eggs_produced: number;
  eggs_market: number;
  efficiency: number;
  weight: number;
  reward_share: number;
  reward_ton: number;
  amount_base_units: number;
  chain: string;
  merkle_leaf_hash: string;
  created_at: string;
  epoch: {
    epoch_number: number;
    epoch_start: string;
    epoch_end: string;
    merkle_root: string;
    status: string;
    chain: string;
  };
}

// ============================================
// SHA-256 utilities (must match generate_epoch_snapshot)
// ============================================

async function sha256Hex(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = new Uint8Array(hashBuffer);
  return encodeHex(hashArray);
}

async function hashPair(left: string, right: string): Promise<string> {
  const [a, b] = [left, right].sort();
  return await sha256Hex(a + b);
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ error: "Missing Supabase configuration" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request body
    const body: ClaimInfoRequest = await req.json();
    const { walletAddress, userId, epochNumber } = body;
    const chain = (body.chain || 'ton').toLowerCase();

    // Validate chain
    if (!CHAIN_CONFIG[chain]) {
      return new Response(
        JSON.stringify({ 
          error: "Invalid chain",
          supported: Object.keys(CHAIN_CONFIG),
          received: chain
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const chainConfig = CHAIN_CONFIG[chain];

    // Validate - need at least wallet or userId
    if (!walletAddress && !userId) {
      return new Response(
        JSON.stringify({ 
          error: "Missing identifier",
          required: "walletAddress or userId",
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[get_claim_info] Query for wallet: ${walletAddress}, userId: ${userId}, epoch: ${epochNumber}, chain: ${chain}`);

    // Build query for allocations
    let query = supabase
      .from("staking_epoch_allocations")
      .select(`
        id,
        epoch_id,
        user_id,
        wallet_address,
        eggs_produced,
        eggs_market,
        efficiency,
        weight,
        reward_share,
        reward_ton,
        amount_base_units,
        chain,
        merkle_leaf_hash,
        created_at,
        epoch:staking_epochs!inner(
          epoch_number,
          epoch_start,
          epoch_end,
          merkle_root,
          status,
          chain
        )
      `)
      .eq("chain", chain)
      .eq("staking_epochs.status", "root_published"); // Only epochs ready for claiming

    // Filter by wallet or user
    if (walletAddress) {
      query = query.eq("wallet_address", walletAddress);
    } else if (userId) {
      query = query.eq("user_id", userId);
    }

    // Filter by specific epoch if provided
    if (epochNumber !== undefined) {
      query = query.eq("staking_epochs.epoch_number", epochNumber);
    }

    const { data: allocations, error: allocErr } = await query;

    if (allocErr) {
      console.error("[get_claim_info] Error fetching allocations:", allocErr);
      return new Response(
        JSON.stringify({ error: "Error fetching allocations", details: allocErr.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!allocations || allocations.length === 0) {
      return new Response(
        JSON.stringify({ 
          claims: [],
          chain,
          message: "No claimable rewards found"
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[get_claim_info] Found ${allocations.length} allocations`);

    // For each allocation, we need to regenerate the Merkle proof
    // This requires fetching all allocations for each epoch to rebuild the tree
    const claimsByEpoch: Record<string, any> = {};

    for (const alloc of allocations as unknown as AllocationData[]) {
      const epochId = alloc.epoch_id;
      
      // Get all allocations for this epoch to rebuild proof
      if (!claimsByEpoch[epochId]) {
        const { data: epochAllocs } = await supabase
          .from("staking_epoch_allocations")
          .select("wallet_address, reward_ton, amount_base_units, merkle_leaf_hash")
          .eq("epoch_id", epochId)
          .eq("chain", chain)
          .order("merkle_leaf_hash");

        if (epochAllocs) {
          // Build proof for this user's allocation
          const leaves = epochAllocs.map((a: any) => a.merkle_leaf_hash);
          const userLeafIndex = leaves.indexOf(alloc.merkle_leaf_hash);
          
          if (userLeafIndex !== -1) {
            const proof = await generateMerkleProof(leaves, userLeafIndex);
            
            claimsByEpoch[epochId] = {
              epochId,
              epochNumber: alloc.epoch.epoch_number,
              epochStart: alloc.epoch.epoch_start,
              epochEnd: alloc.epoch.epoch_end,
              merkleRoot: alloc.epoch.merkle_root,
              chain: alloc.chain,
              allocation: {
                userId: alloc.user_id,
                walletAddress: alloc.wallet_address,
                eggsProduced: alloc.eggs_produced,
                eggsMarket: alloc.eggs_market,
                efficiency: Math.round(alloc.efficiency * 10000) / 100, // As percentage
                rewardToken: alloc.reward_ton,
                amountBaseUnits: alloc.amount_base_units.toString(),
                baseUnitName: chainConfig.baseUnitName,
                tokenName: chainConfig.tokenName,
                merkleLeaf: alloc.merkle_leaf_hash,
                proof
              }
            };
          }
        }
      }
    }

    const claims = Object.values(claimsByEpoch);
    
    // Calculate totals
    const totalRewardToken = claims.reduce(
      (sum, c) => sum + c.allocation.rewardToken, 
      0
    );
    const totalAmountBaseUnits = claims.reduce(
      (sum, c) => sum + BigInt(c.allocation.amountBaseUnits),
      0n
    );

    return new Response(
      JSON.stringify({
        claims,
        chain,
        summary: {
          totalClaims: claims.length,
          totalRewardToken,
          totalAmountBaseUnits: totalAmountBaseUnits.toString(),
          tokenName: chainConfig.tokenName,
          baseUnitName: chainConfig.baseUnitName
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (e) {
    console.error("[get_claim_info] Unhandled error:", e);
    const errorMessage = e instanceof Error ? e.message : "Internal error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Generates a Merkle proof for a leaf at the given index (async)
 * Uses SHA-256 for hashing (must match generate_epoch_snapshot)
 */
async function generateMerkleProof(leaves: string[], leafIndex: number): Promise<string[]> {
  if (leaves.length === 0 || leafIndex < 0 || leafIndex >= leaves.length) {
    return [];
  }

  if (leaves.length === 1) {
    return [];
  }

  // Pad to power of 2
  const paddedLeaves = [...leaves];
  while (paddedLeaves.length & (paddedLeaves.length - 1)) {
    paddedLeaves.push(paddedLeaves[paddedLeaves.length - 1]);
  }

  // Build tree levels
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

  // Generate proof
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

  return proof;
}
