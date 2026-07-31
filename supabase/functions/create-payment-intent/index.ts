import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('📥 create-payment-intent: Request received');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('❌ Supabase environment variables missing');
      return new Response(
        JSON.stringify({ error: 'Supabase environment variables are not configured.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!stripeSecretKey) {
      console.error('❌ STRIPE_SECRET_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'Stripe API key not configured. Please contact support.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client with service role for server-side validation
    const supabaseClient = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    console.log('📦 Request body:', JSON.stringify(body));
    
    const { amount, currency, submissionId, clientId, description, requestId, paymentMethod } = body;
    let providerId = body.providerId ?? null;

    // Support both submission-based and request-based payments
    if (!amount || !currency || (!submissionId && !requestId) || !clientId) {
      console.error('❌ Missing required fields:', { amount, currency, submissionId, requestId, clientId });
      return new Response(
        JSON.stringify({ error: 'Missing required fields: amount, currency, (submissionId or requestId), clientId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify user has access to this submission or project request
    let verificationPassed = false;
    let entityId = submissionId || requestId;
    
    if (submissionId) {
      console.log('🔍 Verifying work submission:', submissionId);
      // Verify work submission access
      const { data: submission, error: submissionError } = await supabaseClient
        .from('work_submissions')
        .select('*')
        .eq('id', submissionId)
        .eq('client_id', clientId)
        .single()

      if (!submissionError && submission) {
        verificationPassed = true;
        console.log('✅ Work submission verified');
      } else {
        console.log('⚠️ Work submission verification failed:', submissionError?.message);
      }
    }
    
    if (!verificationPassed && requestId) {
      console.log('🔍 Verifying project request:', requestId);
      // Verify project request access
      const { data: request, error: requestError } = await supabaseClient
        .from('project_requests')
        .select('*')
        .eq('id', requestId)
        .eq('client_id', clientId)
        .single()

      if (!requestError && request) {
        verificationPassed = true;
        console.log('✅ Project request verified');
        // For project requests, get the provider from the request
        if (!providerId && request.service_provider_id) {
          providerId = request.service_provider_id;
          console.log('📋 Provider ID from request:', providerId);
        }
      } else {
        console.log('⚠️ Project request verification failed:', requestError?.message);
      }
    }

    if (!verificationPassed) {
      console.error('❌ Verification failed for entity:', entityId);
      return new Response(
        JSON.stringify({ error: 'Project request not found or access denied. Please ensure you are the client for this project.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get service provider's Stripe account ID
    let stripeAccountId = null;
    if (providerId) {
      const { data: provider, error: providerError } = await supabaseClient
        .from('service_providers')
        .select('stripe_account_id, can_accept_payments, business_name')
        .eq('id', providerId)
        .single()

      if (providerError) {
        console.error('Error fetching service provider:', providerError);
        return new Response(
          JSON.stringify({ error: 'Service provider not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (!provider.can_accept_payments || !provider.stripe_account_id) {
        return new Response(
          JSON.stringify({ 
            error: 'Service provider payment setup incomplete',
            requires_onboarding: true
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      stripeAccountId = provider.stripe_account_id;
    }

    // Calculate platform fee (4% - industry standard for marketplace)
    const platformFeePercent = 4
    const platformFeeAmount = Math.round(amount * platformFeePercent / 100)
    const providerAmount = amount - platformFeeAmount

    console.log('💰 Payment breakdown:', { 
      totalAmount: amount, 
      platformFee: platformFeeAmount, 
      providerAmount,
      stripeAccountId: stripeAccountId ? 'present' : 'none'
    });

    // Create payment intent using Stripe
    // Using automatic capture - funds are captured immediately but held
    // The transfer to provider happens only when we explicitly trigger it after work completion
    const paymentIntentBody = new URLSearchParams({
      amount: amount.toString(), // Amount in cents
      currency: currency || 'usd',
      description: description || `MusiStash payment for ${submissionId ? 'work submission' : 'project'} ${entityId}`,
      // Automatic payment methods for better conversion
      'automatic_payment_methods[enabled]': 'true',
    });

    // Add metadata as individual fields (Stripe doesn't accept JSON string for metadata)
    paymentIntentBody.append('metadata[submissionId]', submissionId || '');
    paymentIntentBody.append('metadata[requestId]', requestId || '');
    paymentIntentBody.append('metadata[clientId]', clientId);
    paymentIntentBody.append('metadata[providerId]', providerId || '');
    paymentIntentBody.append('metadata[platformFee]', platformFeeAmount.toString());
    paymentIntentBody.append('metadata[providerAmount]', providerAmount.toString());
    paymentIntentBody.append('metadata[paymentMethod]', paymentMethod || 'card');

    // Add Stripe Connect fields if we have a provider account
    // Using on_behalf_of and transfer_data for proper marketplace flow
    // The transfer happens automatically when payment succeeds, but provider payout
    // is controlled by their Stripe account settings (we set manual payouts during onboarding)
    if (stripeAccountId) {
      paymentIntentBody.append('application_fee_amount', platformFeeAmount.toString());
      paymentIntentBody.append('transfer_data[destination]', stripeAccountId);
      console.log('🔗 Stripe Connect: Transfer will go to account:', stripeAccountId);
    }

    console.log('📤 Creating Stripe payment intent...');
    
    const response = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: paymentIntentBody,
    })

    const paymentIntent = await response.json()

    if (!response.ok) {
      console.error('❌ Stripe API error:', paymentIntent.error);
      throw new Error(paymentIntent.error?.message || 'Failed to create payment intent')
    }

    console.log('✅ Payment intent created:', paymentIntent.id);

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        platformFee: platformFeeAmount,
        providerAmount: providerAmount
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: any) {
    console.error('❌ Payment intent creation error:', error.message || error);
    return new Response(
      JSON.stringify({ error: error.message || 'An unexpected error occurred' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
