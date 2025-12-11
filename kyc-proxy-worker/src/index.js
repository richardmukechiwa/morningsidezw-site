export default {
  async fetch(request) {
    const allowedOrigin = "https://www.morningsidezw.com";
    const origin = request.headers.get("Origin");
    const isPreflight = request.method === "OPTIONS";

    // CORS headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": allowedOrigin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400"
    };

    // Handle preflight requests FIRST
    if (isPreflight) {
      if (origin !== allowedOrigin) {
        return new Response("Forbidden origin", { status: 403 });
      }
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Validate origin for actual requests
    if (origin !== allowedOrigin) {
      return new Response("Forbidden origin", { 
        status: 403,
        headers: corsHeaders 
      });
    }

    // Check path
    const url = new URL(request.url);
    if (url.pathname !== '/submit') {
      return new Response(JSON.stringify({ error: "Not Found", path: url.pathname }), {
        status: 404,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    // Only allow POST
    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
        status: 405,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    try {
      // Read the request body
      const requestBody = await request.text();

      // Forward to n8n webhook
      const forwarded = await fetch(
        "https://n8n.morningsidezw.com/webhook-test/onboard-agent-mvs",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: requestBody
        }
      );

      const responseText = await forwarded.text();
      
      return new Response(responseText, {
        status: forwarded.status,
        headers: {
          ...corsHeaders,
          "Content-Type": forwarded.headers.get("Content-Type") || "application/json"
        }
      });

    } catch (error) {
      console.error("Proxy error:", error);
      return new Response(JSON.stringify({ 
        error: "Proxy failed", 
        details: error.message 
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
  }
};