// Edge Function: generate_epoch_snapshot
// Generates a snapshot of egg production/market data for a staking epoch
// and builds a Merkle tree for reward distribution
//
// SUPPORTS: TON, SOL (multi-chain)
// SUPPORTS: User/Company split with dynamic fees
//
// CANONICAL LEAF FORMAT:
// amount_base_units = floor(reward_token * base_unit_multiplier)
// leaf_input = wallet_address + ":" + amount_base_units.toString()
// leaf_hash = sha256(leaf_input)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";
import { sha256Hex, buildMerkleTree } from "./merkle_utils.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Chain configurations
const CHAIN_CONFIG: Record<string, { 
  baseUnitMultiplier: number; 
  baseUnitName: string;
  tokenName: string;
}> = {
  ton: { baseUnitMultiplier: 1e9, baseUnitName: 'nanoTON', tokenName: 'TON' },
  sol: { baseUnitMultiplier: 1e9, baseUnitName: 'lamports', tokenName: 'SOL' },
};

// Company fee configuration
const COMPANY_FEE_CONFIG = {
  DEFAULT_FEE: 0.20,  // 20% por defecto para la empresa
  MIN_FEE: 0.07,      // 7% mínimo (con todos los boosts)
  MAX_FEE: 0.20,      // 20% máximo
};

interface EpochRequest {
  epochNumber: number;
  epochStart: string;  // ISO timestamp
  epochEnd: string;    // ISO timestamp
  totalRewards: string | number;  // Token amount (e.g. "100.0")
  chain?: string;  // 'ton' | 'sol' (default: 'ton')
  companyWallet: string;  // Wallet de la empresa (REQUIRED)
}

interface EggAggregation {
  user_id: string;
  wallet_address: string;
  eggs_produced: number;
  eggs_market: number;
}

interface UserAllocation {
  user_id: string | null;  // null for company
  wallet_address: string;
  eggs_produced: number;
  eggs_market: number;
  efficiency: number;
  weight: number;
  reward_share: number;
  reward_theoretical: number;  // r_u antes del split
  company_fee: number;  // fee aplicado (0.07 a 0.20)
  reward_token: number;  // después del split
  amount_base_units: bigint;
  merkle_leaf_hash: string;
  is_company: boolean;
}

/**
 * Calcula el fee de la empresa para un usuario
 * 
 * Base: 20% para la empresa
 * Con boosts del minijuego: puede reducirse hasta 7%
 * 
 * Fee = DEFAULT_FEE - fee_reduction_from_boosts
 * Fee = max(MIN_FEE, DEFAULT_FEE - boosts)
 */
async function calculateCompanyFee(
  supabase: any,
  userId: string
): Promise<number> {
  try {
    // Obtener reducción de fee por boosts activos
    const { data, error } = await supabase
      .rpc("get_user_fee_reduction", { p_user_id: userId });
    
    if (error) {
      console.warn(`[calculateCompanyFee] Error getting fee reduction for user ${userId}:`, error);
      // En caso de error, usar fee por defecto
      return COMPANY_FEE_CONFIG.DEFAULT_FEE;
    }
    
    const feeReduction = Number(data) || 0;
    
    // Calcular fee final: base - reducción, pero nunca menor que el mínimo
    const finalFee = Math.max(
      COMPANY_FEE_CONFIG.MIN_FEE,
      COMPANY_FEE_CONFIG.DEFAULT_FEE - feeReduction
    );
    
    return finalFee;
  } catch (e) {
    console.warn(`[calculateCompanyFee] Exception for user ${userId}:`, e);
    return COMPANY_FEE_CONFIG.DEFAULT_FEE;
  }
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
    const body: EpochRequest = await req.json();
    const { epochNumber, epochStart, epochEnd, totalRewards, companyWallet } = body;
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

    // Validate required parameters
    if (!epochNumber || !epochStart || !epochEnd || totalRewards === undefined || !companyWallet) {
      return new Response(
        JSON.stringify({ 
          error: "Missing epoch params",
          required: ["epochNumber", "epochStart", "epochEnd", "totalRewards", "companyWallet"],
          optional: ["chain (default: ton)"],
          received: { epochNumber, epochStart, epochEnd, totalRewards, companyWallet, chain }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const totalRewardsNum = Number(totalRewards);
    if (isNaN(totalRewardsNum) || totalRewardsNum < 0) {
      return new Response(
        JSON.stringify({ error: "Invalid totalRewards value" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[generate_epoch_snapshot] Starting epoch ${epochNumber} on ${chain.toUpperCase()}`);
    console.log(`  Period: ${epochStart} to ${epochEnd}`);
    console.log(`  Total rewards: ${totalRewardsNum} ${chainConfig.tokenName}`);
    console.log(`  Company wallet: ${companyWallet}`);

    // ============================================
    // 1) Create/Insert the epoch record
    // ============================================
    const { data: epochRow, error: epochErr } = await supabase
      .from("staking_epochs")
      .insert({
        epoch_number: epochNumber,
        epoch_start: epochStart,
        epoch_end: epochEnd,
        total_rewards_ton: totalRewardsNum,
        chain: chain,
        status: "pending"
      })
      .select()
      .single();

    if (epochErr || !epochRow) {
      console.error("[generate_epoch_snapshot] Error inserting epoch:", epochErr);
      
      if (epochErr?.code === "23505") {
        return new Response(
          JSON.stringify({ 
            error: "Epoch already exists",
            epochNumber,
            chain,
            details: epochErr.message
          }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Error inserting epoch", details: epochErr?.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const epochId = epochRow.id;
    console.log(`[generate_epoch_snapshot] Created epoch with ID: ${epochId}`);

    // ============================================
    // 2) Get egg production/market data per user
    // ============================================
    const { data: aggRows, error: aggErr } = await supabase
      .rpc("fn_epoch_eggs", {
        _epoch_start: epochStart,
        _epoch_end: epochEnd,
        _chain: chain
      });

    if (aggErr) {
      console.error("[generate_epoch_snapshot] Error calling fn_epoch_eggs:", aggErr);
      
      await supabase
        .from("staking_epochs")
        .update({ status: "closed" })
        .eq("id", epochId);

      return new Response(
        JSON.stringify({ error: "Error calling fn_epoch_eggs", details: aggErr.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const rows = (aggRows || []) as EggAggregation[];
    console.log(`[generate_epoch_snapshot] Found ${rows.length} users with egg data`);

    // ============================================
    // 3) Handle empty epoch (no users to reward)
    // ============================================
    if (rows.length === 0) {
      await supabase
        .from("staking_epochs")
        .update({ status: "closed" })
        .eq("id", epochId);

      console.log("[generate_epoch_snapshot] No users to allocate, closing epoch");

      return new Response(
        JSON.stringify({ 
          message: "No users to allocate in this epoch",
          epochId,
          epochNumber,
          chain,
          usersCount: 0
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============================================
    // 4) Calculate efficiency, weight, rewards with USER/COMPANY SPLIT
    // ============================================
    
    // First pass: calculate efficiency and weight for each user
    const usersWithWeight = rows.map((r) => {
      const eggsProduced = Number(r.eggs_produced);
      const eggsMarket = Number(r.eggs_market);
      
      // Efficiency = eggs that reached market / eggs produced
      // Can be > 1.0 with boosts, but we cap at 1.0 for reward calculation
      const rawEfficiency = eggsProduced > 0 ? eggsMarket / eggsProduced : 0;
      const efficiency = Math.min(1, rawEfficiency);
      
      // MVP: stake_user = 1 for all users
      const stakeUser = 1;
      const weight = stakeUser * efficiency;

      return {
        user_id: r.user_id,
        wallet_address: r.wallet_address,
        eggs_produced: eggsProduced,
        eggs_market: eggsMarket,
        raw_efficiency: rawEfficiency,
        efficiency,
        weight
      };
    }).filter((u) => u.weight > 0);

    console.log(`[generate_epoch_snapshot] ${usersWithWeight.length} users with weight > 0`);

    const totalWeight = usersWithWeight.reduce((acc, u) => acc + u.weight, 0);

    if (totalWeight === 0) {
      await supabase
        .from("staking_epochs")
        .update({ status: "closed" })
        .eq("id", epochId);

      return new Response(
        JSON.stringify({ 
          message: "Total weight = 0, no rewards to distribute",
          epochId,
          epochNumber,
          chain,
          usersCount: rows.length
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============================================
    // 5) Calculate rewards WITH USER/COMPANY SPLIT
    // ============================================
    const usersWithRewards: UserAllocation[] = [];
    let companyRewardTon = 0;  // Acumular parte de la empresa
    
    for (const u of usersWithWeight) {
      // r_u = totalRewards × (weight_u / Σweight) - Reward teórico
      const rewardShare = u.weight / totalWeight;
      const rewardTheoretical = totalRewardsNum * rewardShare;
      
      // Calcular fee de la empresa para este usuario
      const companyFee = await calculateCompanyFee(supabase, u.user_id);
      
      // Split: usuario recibe (1 - fee), empresa recibe fee
      const userReward = rewardTheoretical * (1 - companyFee);
      const companyPart = rewardTheoretical * companyFee;
      
      // Acumular parte de la empresa
      companyRewardTon += companyPart;
      
      // Convert to base units
      const amountBaseUnits = BigInt(Math.floor(userReward * chainConfig.baseUnitMultiplier));
      
      // Create leaf hash for USER
      const leafHash = await sha256Hex(`${u.wallet_address}:${amountBaseUnits.toString()}`);

      usersWithRewards.push({
        user_id: u.user_id,
        wallet_address: u.wallet_address,
        eggs_produced: u.eggs_produced,
        eggs_market: u.eggs_market,
        efficiency: u.efficiency,
        weight: u.weight,
        reward_share: rewardShare,
        reward_theoretical: rewardTheoretical,
        company_fee: companyFee,
        reward_token: userReward,
        amount_base_units: amountBaseUnits,
        merkle_leaf_hash: leafHash,
        is_company: false
      });
    }

    // ============================================
    // 6) Create COMPANY allocation
    // ============================================
    const companyAmountBaseUnits = BigInt(Math.floor(companyRewardTon * chainConfig.baseUnitMultiplier));
    const companyLeafHash = await sha256Hex(`${companyWallet}:${companyAmountBaseUnits.toString()}`);
    
    const companyAllocation: UserAllocation = {
      user_id: null,  // No user_id for company
      wallet_address: companyWallet,
      eggs_produced: 0,
      eggs_market: 0,
      efficiency: 0,
      weight: 0,
      reward_share: 0,
      reward_theoretical: companyRewardTon,
      company_fee: 0,
      reward_token: companyRewardTon,
      amount_base_units: companyAmountBaseUnits,
      merkle_leaf_hash: companyLeafHash,
      is_company: true
    };

    console.log(`[generate_epoch_snapshot] Company reward: ${companyRewardTon} ${chainConfig.tokenName}`);
    console.log(`[generate_epoch_snapshot] Users total reward: ${totalRewardsNum - companyRewardTon} ${chainConfig.tokenName}`);

    // ============================================
    // 7) Build Merkle tree (N users + 1 company)
    // ============================================
    const allAllocations = [...usersWithRewards, companyAllocation];
    const leaves = allAllocations.map((a) => a.merkle_leaf_hash);
    const { root, proofsByLeaf } = await buildMerkleTree(leaves);

    console.log(`[generate_epoch_snapshot] Built Merkle tree with ${leaves.length} leaves (${usersWithRewards.length} users + 1 company)`);
    console.log(`[generate_epoch_snapshot] Merkle root: ${root}`);

    // ============================================
    // 8) Insert allocations into database
    // ============================================
    const allocationsPayload = allAllocations.map((a) => ({
      epoch_id: epochId,
      user_id: a.user_id,
      wallet_address: a.wallet_address,
      eggs_produced: a.eggs_produced,
      eggs_market: a.eggs_market,
      efficiency: a.efficiency,
      weight: a.weight,
      reward_share: a.reward_share,
      reward_ton: a.reward_token,
      amount_base_units: Number(a.amount_base_units),
      chain: chain,
      merkle_leaf_hash: a.merkle_leaf_hash
    }));

    const { error: allocErr } = await supabase
      .from("staking_epoch_allocations")
      .insert(allocationsPayload);

    if (allocErr) {
      console.error("[generate_epoch_snapshot] Error inserting allocations:", allocErr);
      
      await supabase
        .from("staking_epochs")
        .update({ status: "pending" })
        .eq("id", epochId);

      return new Response(
        JSON.stringify({ 
          error: "Error inserting allocations", 
          details: allocErr.message,
          epochId
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[generate_epoch_snapshot] Inserted ${allocationsPayload.length} allocations`);

    // ============================================
    // 9) Update epoch with Merkle root
    // ============================================
    const { error: updErr } = await supabase
      .from("staking_epochs")
      .update({
        merkle_root: root,
        status: "root_published"
      })
      .eq("id", epochId);

    if (updErr) {
      console.error("[generate_epoch_snapshot] Error updating epoch:", updErr);
      return new Response(
        JSON.stringify({ 
          error: "Error updating epoch with root", 
          details: updErr.message,
          epochId
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============================================
    // 10) Return success response
    // ============================================
    console.log(`[generate_epoch_snapshot] Epoch ${epochNumber} on ${chain.toUpperCase()} completed successfully`);

    const totalEggsProduced = usersWithRewards.reduce((sum, u) => sum + u.eggs_produced, 0);
    const totalEggsMarket = usersWithRewards.reduce((sum, u) => sum + u.eggs_market, 0);
    const avgEfficiency = usersWithRewards.reduce((sum, u) => sum + u.efficiency, 0) / usersWithRewards.length;
    const avgCompanyFee = usersWithRewards.reduce((sum, u) => sum + u.company_fee, 0) / usersWithRewards.length;
    const totalUserRewards = usersWithRewards.reduce((sum, u) => sum + u.reward_token, 0);

    return new Response(
      JSON.stringify({
        success: true,
        epochId,
        epochNumber,
        chain,
        merkleRoot: root,
        stats: {
          usersCount: usersWithRewards.length,
          totalEggsProduced,
          totalEggsMarket,
          avgEfficiency: Math.round(avgEfficiency * 10000) / 100,
          totalRewards: totalRewardsNum,
          totalUserRewards: Math.round(totalUserRewards * 1000000) / 1000000,
          companyReward: Math.round(companyRewardTon * 1000000) / 1000000,
          avgCompanyFee: Math.round(avgCompanyFee * 10000) / 100,
          tokenName: chainConfig.tokenName,
          baseUnitName: chainConfig.baseUnitName,
          totalWeight
        },
        company: {
          wallet: companyWallet,
          reward: companyRewardTon,
          amountBaseUnits: companyAmountBaseUnits.toString(),
          leaf: companyLeafHash,
          proof: proofsByLeaf[companyLeafHash] || []
        },
        proofs: Object.fromEntries(
          usersWithRewards.map((u) => [
            u.wallet_address,
            {
              leaf: u.merkle_leaf_hash,
              proof: proofsByLeaf[u.merkle_leaf_hash] || [],
              rewardTheoretical: u.reward_theoretical,
              rewardToken: u.reward_token,
              companyFee: u.company_fee,
              amountBaseUnits: u.amount_base_units.toString()
            }
          ])
        )
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (e) {
    console.error("[generate_epoch_snapshot] Unhandled error:", e);
    const errorMessage = e instanceof Error ? e.message : "Internal error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
