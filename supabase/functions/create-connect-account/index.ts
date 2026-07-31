import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Use musistash.com domain for all redirect URLs
// Fallback to a generic success page URL
const APP_BASE_URL = Deno.env.get('APP_URL') || 'https://musistash.com';
// For mobile apps, the redirect just needs to close the browser - user returns to app manually
// Using a simple page path that provides clear instructions

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { provider_id, email, business_name, country = 'US' } = await req.json()

    if (!provider_id || !email || !business_name) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required parameters: provider_id, email, business_name' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if STRIPE_SECRET_KEY is set
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeKey) {
      console.error('STRIPE_SECRET_KEY environment variable is not set')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Stripe API key not configured. Please contact support.' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Creating Stripe account for: ${email}, business: ${business_name}`)

    // Create Stripe Connect Express account with full verification requirements
    const accountParams = new URLSearchParams({
      type: 'express',
      country: country,
      email: email,
      'capabilities[card_payments][requested]': 'true',
      'capabilities[transfers][requested]': 'true',
    })
    
    // Add business profile
    accountParams.append('business_profile[name]', business_name)
    accountParams.append('business_profile[support_email]', email)
    
    console.log(`Calling Stripe API with params: ${accountParams.toString()}`)
    
    const response = await fetch('https://api.stripe.com/v1/accounts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: accountParams.toString(),
    })

    const account = await response.json()

    if (!response.ok) {
      console.error('Stripe account creation failed:', JSON.stringify(account))
      const errorMessage = account.error?.message || 'Failed to create Stripe account'
      const errorType = account.error?.type || 'unknown_error'
      console.error(`Stripe error type: ${errorType}, message: ${errorMessage}`)
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Stripe Error: ${errorMessage}`,
          error_type: errorType,
          details: account.error
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Successfully created Stripe account: ${account.id}`)

    // Create account link for onboarding with complete data collection
    // Use musistash.com URLs for redirects (these will deep link back to the app)
    const linkResponse = await fetch('https://api.stripe.com/v1/account_links', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('STRIPE_SECRET_KEY')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        account: account.id,
        refresh_url: `${APP_BASE_URL}/stripe-refresh`,
        return_url: `${APP_BASE_URL}/stripe-success`,
        type: 'account_onboarding',
        // Request full information collection including identity verification
        'collection_options[fields]': 'eventually_due',
        'collection_options[future_requirements]': 'include',
      }),
    })

    const accountLink = await linkResponse.json()

    if (!linkResponse.ok) {
      console.error('Stripe account link creation failed:', JSON.stringify(accountLink))
      const errorMessage = accountLink.error?.message || 'Failed to create onboarding link'
      console.error(`Account link error: ${errorMessage}`)
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to create onboarding link: ${errorMessage}`,
          details: accountLink.error
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Log successful account creation
    console.log(`✅ Successfully created Stripe Connect account ${account.id} for provider ${provider_id}`)
    console.log(`Onboarding URL: ${accountLink.url}`)

    return new Response(
      JSON.stringify({
        success: true,
        account_id: account.id,
        onboarding_url: accountLink.url,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Unexpected error in create-connect-account:', error)
    console.error('Error details:', JSON.stringify({
      message: error.message,
      name: error.name,
      stack: error.stack
    }))
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: `Server error: ${error.message || 'Internal server error'}`,
        error_name: error.name
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
