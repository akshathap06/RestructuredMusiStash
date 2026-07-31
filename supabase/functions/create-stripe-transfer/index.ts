import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the user from the JWT token
    const {
      data: { user },
    } = await supabaseClient.auth.getUser()

    if (!user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const { amount, stripe_account_id, payment_id } = await req.json()

    if (!amount || !stripe_account_id || !payment_id) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required parameters: amount, stripe_account_id, payment_id' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Verify the payment belongs to the user
    const { data: payment, error: paymentError } = await supabaseClient
      .from('payments')
      .select(`
        id,
        provider_id,
        amount_paid,
        provider_amount,
        stripe_payment_intent_id
      `)
      .eq('id', payment_id)
      .eq('provider_id', user.id)
      .single()

    if (paymentError || !payment) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Payment not found or access denied' 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create Stripe transfer
    const stripe = new (await import('https://esm.sh/stripe@14.21.0')).default(
      Deno.env.get('STRIPE_SECRET_KEY')!,
      {
        apiVersion: '2023-10-16',
      }
    )

    try {
      const transfer = await stripe.transfers.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'usd',
        destination: stripe_account_id,
        transfer_group: `payment_${payment_id}`,
        metadata: {
          payment_id: payment_id,
          provider_id: user.id,
          submission_id: payment.submission_id || '',
        },
      })

      // Update provider earnings with transfer details
      const { error: updateError } = await supabaseClient
        .from('provider_earnings')
        .update({
          stripe_transfer_id: transfer.id,
          transfer_status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('payment_id', payment_id)

      if (updateError) {
        console.error('Error updating provider earnings:', updateError)
        // Don't fail the request, just log the error
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          transfer_id: transfer.id,
          amount: amount,
          message: 'Transfer created successfully'
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )

    } catch (stripeError: any) {
      console.error('Stripe transfer error:', stripeError)
      
      // Update provider earnings with failed status
      await supabaseClient
        .from('provider_earnings')
        .update({
          transfer_status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('payment_id', payment_id)

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Stripe transfer failed: ${stripeError.message}` 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
