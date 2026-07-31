import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Use musistash.com domain for all redirect URLs (never expose Supabase URL)
const APP_BASE_URL = Deno.env.get('APP_URL') || 'https://musistash.com';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { account_id } = await req.json()

    if (!account_id) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required parameter: account_id' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Creating onboarding link for account: ${account_id}`)

    // Create new account link for onboarding
    // Use musistash.com URLs for redirects (these will deep link back to the app)
    const response = await fetch('https://api.stripe.com/v1/account_links', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('STRIPE_SECRET_KEY')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        account: account_id,
        refresh_url: `${APP_BASE_URL}/stripe-refresh`,
        return_url: `${APP_BASE_URL}/stripe-success`,
        type: 'account_onboarding',
      }),
    })

    const accountLink = await response.json()

    if (!response.ok) {
      console.error('Stripe account link creation failed:', accountLink)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: accountLink.error?.message || 'Failed to create onboarding link' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        url: accountLink.url
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in get-onboarding-url:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Internal server error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
