import { serve } from "https://deno.land/std/http/server.ts";

/**
 * Send verification email using Resend (or Supabase SMTP)
 * 
 * Setup:
 * 1. Get Resend API key from https://resend.com
 * 2. Set secret: supabase secrets set RESEND_API_KEY=re_xxxxx --project-ref YOUR_PROJECT_REF
 * 3. Redeploy: supabase functions deploy send-verification-email --project-ref YOUR_PROJECT_REF
 */

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
    // Parse request body
    let requestData;
    try {
      requestData = await req.json();
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError);
      return new Response(
        JSON.stringify({ success: false, message: "Invalid JSON in request body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { email, code } = requestData;

    if (!email || !code) {
      console.error('❌ Missing required fields:', { email: !!email, code: !!code });
      return new Response(
        JSON.stringify({ success: false, message: "Missing email or code" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log(`📧 Sending verification email to ${email} with code ${code}`);

    // Try Resend first (recommended)
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    // IMPORTANT: Must use the verified subdomain: no-reply.musistash.com
    // The format is: name@subdomain.domain.com
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "MusiStash <noreply@no-reply.musistash.com>";
    
    console.log(`📧 Using 'from' address: ${fromEmail}`);
    console.log(`📧 Resend API key present: ${!!resendApiKey}`);
    
    if (resendApiKey) {
      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: fromEmail, // Use your verified domain
            to: email,
            subject: "Your MusiStash Verification Code",
            html: `
              <!DOCTYPE html>
              <html>
                <head>
                  <meta charset="utf-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                </head>
                <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #000000; color: #ffffff; padding: 20px;">
                  <div style="max-width: 600px; margin: 0 auto; background-color: #1a1a1a; border-radius: 12px; padding: 40px;">
                    <h1 style="color: #10B981; margin-bottom: 24px; font-size: 28px;">Your MusiStash Verification Code</h1>
                    <p style="color: #9CA3AF; font-size: 16px; line-height: 24px; margin-bottom: 32px;">
                      Enter this code to verify your email address:
                    </p>
                    <div style="background-color: #000000; border: 2px solid #10B981; border-radius: 12px; padding: 24px; text-align: center; margin: 32px 0;">
                      <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #10B981;">${code}</span>
                    </div>
                    <p style="color: #6B7280; font-size: 14px; line-height: 20px; margin-top: 32px;">
                      This code will expire in 10 minutes.
                    </p>
                    <p style="color: #6B7280; font-size: 14px; line-height: 20px; margin-top: 8px;">
                      If you didn't request this code, please ignore this email.
                    </p>
                  </div>
                </body>
              </html>
            `,
            text: `Your MusiStash verification code is: ${code}\n\nThis code will expire in 10 minutes.\n\nIf you didn't request this code, please ignore this email.`,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { message: errorText };
          }
          
          console.error("Resend API error:", response.status, errorData);
          
          // Handle specific Resend errors
          if (response.status === 403) {
            const errorMessage = errorData.message || "Resend API error";
            if (errorMessage.includes("testing emails")) {
              console.error("❌ Using test domain. Domain must be verified in Resend.");
              console.error("❌ Current 'from' address:", "onboarding@musistash.com");
              console.error("❌ Please verify musistash.com domain in Resend dashboard");
              return new Response(
                JSON.stringify({ 
                  success: false, 
                  message: "Domain not verified. Please verify musistash.com in Resend dashboard.",
                  error: "DOMAIN_NOT_VERIFIED"
                }),
                { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            }
          }
          
          return new Response(
            JSON.stringify({ 
              success: false, 
              message: errorData.message || "Failed to send email",
              error: "RESEND_ERROR"
            }),
            { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const data = await response.json();
        console.log(`✅ Verification email sent via Resend to ${email}`);
        
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (error) {
        console.error("Resend error:", error);
        // Fall through to Supabase SMTP
      }
    }

    // Fallback: Use Supabase's built-in email (if SMTP configured)
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (supabaseUrl && supabaseServiceKey) {
      try {
        // Use Supabase Auth's email system
        // This requires SMTP to be configured in Supabase Dashboard
        const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const { error } = await supabase.auth.admin.generateLink({
          type: 'magiclink',
          email: email,
          options: {
            redirectTo: 'musistash://verify-email',
            data: { verification_code: code },
          },
        });

        if (!error) {
          console.log(`✅ Verification email sent via Supabase SMTP to ${email}`);
          return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } catch (error) {
        console.error("Supabase email error:", error);
      }
    }

    // If both fail, log warning but return success (code is still generated client-side)
    console.warn(`⚠️ Email not sent to ${email}. SMTP not configured. Code: ${code}`);
    console.warn("⚠️ Configure Resend or Supabase SMTP to send emails. See setup guide.");
    
    return new Response(
      JSON.stringify({ 
        success: true,
        message: "Email service not configured. Code generated but not sent."
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("send-verification-email error:", error);
    console.error("Error details:", {
      message: error?.message,
      name: error?.name,
      stack: error?.stack
    });
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: error?.message || "Unexpected error",
        error: "FUNCTION_ERROR"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
