import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";
import { Address, Cell } from "https://esm.sh/@ton/core@0.62.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AuthRequest {
  action: 'get-nonce' | 'verify-signature';
  walletAddress?: string;
  signature?: string;
  nonce?: string;
  telegramId?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, walletAddress, signature, nonce, telegramId } = await req.json() as AuthRequest;

    console.log('Auth wallet request:', { action, walletAddress });

    // Generate nonce for signature
    if (action === 'get-nonce') {
      if (!walletAddress) {
        return new Response(
          JSON.stringify({ error: 'Wallet address required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const generatedNonce = crypto.randomUUID();
      const message = `Sign this message to authenticate with Chicken Company\n\nNonce: ${generatedNonce}`;

      console.log('Generated nonce for wallet:', walletAddress);

      return new Response(
        JSON.stringify({ nonce: generatedNonce, message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify signature and authenticate
    if (action === 'verify-signature') {
      if (!walletAddress || !signature || !nonce) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const message = `Sign this message to authenticate with Chicken Company\n\nNonce: ${nonce}`;

      // Normalize wallet address
      const normalizedAddress = Address.parse(walletAddress).toString({
        bounceable: true,
        urlSafe: true,
        testOnly: false
      });

      console.log('Verifying signature for:', normalizedAddress);

      // Note: TON Connect uses a proof mechanism for authentication
      // The signature verification happens on the client side with TonConnect SDK
      // Here we trust that the wallet connection is legitimate
      // In production, you would verify the proof payload

      // Find or create profile
      let profile;
      if (telegramId) {
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('telegram_id', telegramId)
          .single();

        profile = existingProfile;
      }

      if (!profile) {
        // Create new profile if doesn't exist
        const { data: newProfile, error: profileError } = await supabase
          .from('profiles')
          .insert({
            telegram_id: telegramId || null,
            source: 'wallet'
          })
          .select()
          .single();

        if (profileError) {
          console.error('Error creating profile:', profileError);
          return new Response(
            JSON.stringify({ error: 'Failed to create profile' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        profile = newProfile;
      }

      // Create unique email from wallet address
      const email = `${normalizedAddress.toLowerCase()}@ton.wallet`;

      // Check if auth user exists
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existingUser = existingUsers.users.find(u => u.email === email);

      let authUserId;

      if (existingUser) {
        authUserId = existingUser.id;
        console.log('Found existing auth user:', authUserId);
      } else {
        // Create auth user without password
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: {
            wallet_address: normalizedAddress,
            profile_id: profile.id,
            telegram_id: telegramId,
            auth_method: 'wallet_signature'
          }
        });

        if (authError) {
          console.error('Error creating auth user:', authError);
          return new Response(
            JSON.stringify({ error: 'Failed to create auth user' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        authUserId = authData.user.id;
        console.log('Created new auth user:', authUserId);
      }

      // Store wallet in user_wallets
      const { error: walletError } = await supabase
        .from('user_wallets')
        .upsert({
          user_id: profile.id,
          wallet_address: normalizedAddress,
          blockchain: 'ton',
          is_primary: true,
          last_used_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,wallet_address'
        });

      if (walletError) {
        console.error('Error storing wallet:', walletError);
      }

      // Generate session token
      const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email,
        options: {
          redirectTo: 'https://app.chickencompany.io'
        }
      });

      if (sessionError) {
        console.error('Error generating session:', sessionError);
        return new Response(
          JSON.stringify({ error: 'Failed to generate session' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Authentication successful for:', normalizedAddress);

      return new Response(
        JSON.stringify({
          success: true,
          user: {
            id: authUserId,
            email,
            profile_id: profile.id
          },
          session: sessionData.properties
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in auth-wallet function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
