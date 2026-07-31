import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

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
    const url = new URL(req.url)
    const path = url.pathname

    // Redirect to deep link based on path
    if (path.includes('stripe-return')) {
      // Return HTML that immediately redirects
      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Redirecting to MusiStash...</title>
  <script type="text/javascript">
    (function() {
      // Try immediate redirect
      try {
        window.location.href = 'musistash://stripe-return';
      } catch(e) {
        console.error('Redirect error:', e);
      }
      
      // Fallback after 500ms
      setTimeout(function() {
        var link = document.createElement('a');
        link.href = 'musistash://stripe-return';
        link.click();
      }, 500);
      
      // Final fallback to app store after 2 seconds
      setTimeout(function() {
        if (document.visibilityState === 'visible') {
          window.location.href = 'https://apps.apple.com/app/musistash';
        }
      }, 2000);
    })();
  </script>
  <style>
    body {
      margin: 0;
      padding: 0;
      background: #000;
      color: #fff;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      text-align: center;
    }
    .container {
      padding: 20px;
    }
    h1 {
      font-size: 24px;
      margin-bottom: 16px;
    }
    p {
      font-size: 16px;
      color: #999;
      margin-bottom: 24px;
    }
    a {
      display: inline-block;
      background: #3B82F6;
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Redirecting to MusiStash...</h1>
    <p>If you are not redirected automatically,</p>
    <a href="musistash://stripe-return">Open MusiStash</a>
  </div>
</body>
</html>`;
      
      return new Response(html, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/html; charset=utf-8',
        },
      })
    } else if (path.includes('stripe-refresh')) {
      // Redirect to app with musistash://stripe-refresh
      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Redirecting to MusiStash...</title>
  <script type="text/javascript">
    (function() {
      try {
        window.location.href = 'musistash://stripe-refresh';
      } catch(e) {
        console.error('Redirect error:', e);
      }
      setTimeout(function() {
        var link = document.createElement('a');
        link.href = 'musistash://stripe-refresh';
        link.click();
      }, 500);
      setTimeout(function() {
        if (document.visibilityState === 'visible') {
          window.location.href = 'https://apps.apple.com/app/musistash';
        }
      }, 2000);
    })();
  </script>
  <style>
    body {
      margin: 0;
      padding: 0;
      background: #000;
      color: #fff;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      text-align: center;
    }
    .container {
      padding: 20px;
    }
    h1 {
      font-size: 24px;
      margin-bottom: 16px;
    }
    p {
      font-size: 16px;
      color: #999;
      margin-bottom: 24px;
    }
    a {
      display: inline-block;
      background: #3B82F6;
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Redirecting to MusiStash...</h1>
    <p>If you are not redirected automatically,</p>
    <a href="musistash://stripe-refresh">Open MusiStash</a>
  </div>
</body>
</html>`;
      
      return new Response(html, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/html; charset=utf-8',
        },
      })
    } else {
      // Unknown path - redirect to return
      return new Response(
        `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta http-equiv="refresh" content="0; url=musistash://stripe-return">
</head>
<body>
  <p>Redirecting...</p>
</body>
</html>`,
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/html',
          },
        }
      )
    }
  } catch (error) {
    console.error('Redirect error:', error)
    return new Response(
      JSON.stringify({ error: 'Redirect failed' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})

