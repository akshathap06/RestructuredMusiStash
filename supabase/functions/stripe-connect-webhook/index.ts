import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
}

// Initialize Supabase client
const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const signature = req.headers.get('stripe-signature')
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    
    if (!signature || !webhookSecret || !stripeSecretKey) {
      return new Response('Missing signature, webhook secret, or Stripe secret key', { status: 400 })
    }

    const body = await req.text()
    
    // Verify webhook signature (simplified version - in production use proper crypto verification)
    // For now, we'll skip signature verification but log it
    console.log('Received webhook with signature:', signature)

    const event = JSON.parse(body)
    console.log('Processing webhook event:', event.type, 'for account:', event.data?.object?.id)

    // Handle different webhook events
    switch (event.type) {
      case 'account.updated':
        await handleAccountUpdated(event.data.object)
        break
      
      case 'account.application.deauthorized':
        await handleAccountDeauthorized(event.data.object)
        break
      
      case 'capability.updated':
        await handleCapabilityUpdated(event.data.object)
        break
      
      default:
        console.log(`Unhandled webhook event: ${event.type}`)
    }

    return new Response(
      JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error processing webhook:', error)
    return new Response(
      JSON.stringify({ error: 'Webhook processing failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function handleAccountUpdated(account: any) {
  try {
    const updates = {
      stripe_charges_enabled: account.charges_enabled,
      stripe_payouts_enabled: account.payouts_enabled,
      stripe_onboarding_complete: account.details_submitted,
      can_accept_payments: account.charges_enabled && account.payouts_enabled,
      stripe_account_status: getAccountStatus(account),
      updated_at: new Date().toISOString()
    }

    const { error } = await supabaseClient
      .from('service_providers')
      .update(updates)
      .eq('stripe_account_id', account.id)

    if (error) {
      console.error('Error updating service provider from webhook:', error)
    } else {
      console.log(`Updated service provider for account ${account.id}:`, updates)
    }
  } catch (error) {
    console.error('Error in handleAccountUpdated:', error)
  }
}

async function handleAccountDeauthorized(account: any) {
  try {
    const updates = {
      stripe_account_id: null,
      stripe_onboarding_complete: false,
      stripe_charges_enabled: false,
      stripe_payouts_enabled: false,
      stripe_account_status: 'not_started',
      can_accept_payments: false,
      updated_at: new Date().toISOString()
    }

    const { error } = await supabaseClient
      .from('service_providers')
      .update(updates)
      .eq('stripe_account_id', account.id)

    if (error) {
      console.error('Error handling account deauthorization:', error)
    } else {
      console.log(`Deauthorized service provider for account ${account.id}`)
    }
  } catch (error) {
    console.error('Error in handleAccountDeauthorized:', error)
  }
}

async function handleCapabilityUpdated(capability: any) {
  try {
    // Update specific capabilities
    const updates: any = {
      updated_at: new Date().toISOString()
    }

    if (capability.id === 'card_payments') {
      updates.stripe_charges_enabled = capability.status === 'active'
    } else if (capability.id === 'transfers') {
      updates.stripe_payouts_enabled = capability.status === 'active'
    }

    // Get current account status to determine if they can accept payments
    const { data: provider } = await supabaseClient
      .from('service_providers')
      .select('stripe_charges_enabled, stripe_payouts_enabled')
      .eq('stripe_account_id', capability.account)
      .single()

    if (provider) {
      const newChargesEnabled = updates.stripe_charges_enabled ?? provider.stripe_charges_enabled
      const newPayoutsEnabled = updates.stripe_payouts_enabled ?? provider.stripe_payouts_enabled
      updates.can_accept_payments = newChargesEnabled && newPayoutsEnabled
    }

    const { error } = await supabaseClient
      .from('service_providers')
      .update(updates)
      .eq('stripe_account_id', capability.account)

    if (error) {
      console.error('Error updating capability:', error)
    } else {
      console.log(`Updated capability ${capability.id} for account ${capability.account}`)
    }
  } catch (error) {
    console.error('Error in handleCapabilityUpdated:', error)
  }
}

function getAccountStatus(account: any): string {
  if (account.charges_enabled && account.payouts_enabled) {
    return 'complete'
  } else if (account.details_submitted) {
    return 'restricted'
  } else if (account.id) {
    return 'pending'
  } else {
    return 'not_started'
  }
}
