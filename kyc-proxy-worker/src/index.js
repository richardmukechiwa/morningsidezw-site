export default {
  async fetch(request, env, ctx) {
    const allowedOrigins = [
      "https://www.morningsidezw.com",
      "https://morningsidezw.com"
    ];

    const origin = request.headers.get("Origin") || "";

    const isAllowedOrigin = allowedOrigins.includes(origin);

    const corsHeaders = {
      "Access-Control-Allow-Origin": isAllowedOrigin ? origin : "https://www.morningsidezw.com",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
      "Vary": "Origin"
    };

    // -----------------------------
    // Always handle OPTIONS first
    // -----------------------------
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    // -----------------------------
    // Enforce origin AFTER preflight
    // -----------------------------
    if (!isAllowedOrigin) {
      return new Response(
        JSON.stringify({
          error: "Forbidden origin",
          origin
        }),
        {
          status: 403,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        }
      );
    }

    const url = new URL(request.url);

    // -----------------------------
    // Route guard
    // -----------------------------
    if (url.pathname !== "/submit") {
      return new Response(
        JSON.stringify({
          error: "Not Found",
          path: url.pathname
        }),
        {
          status: 404,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        }
      );
    }

    if (request.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method Not Allowed" }),
        {
          status: 405,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        }
      );
    }

    // -----------------------------
    // Proxy request to n8n
    // -----------------------------
    try {
      const payload = await request.json();

      const n8nResponse = await fetch(
        "https://n8n.morningsidezw.com/webhook/onboard-agent-optimized",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        }
      );

      const responseText = await n8nResponse.text();

      return new Response(responseText, {
        status: n8nResponse.status,
        headers: {
          ...corsHeaders,
          "Content-Type":
            n8nResponse.headers.get("Content-Type") || "application/json"
        }
      });

    } catch (error) {
      return new Response(
        JSON.stringify({
          error: "Proxy failed",
          message: error.message
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        }
      );
    }
  }
};
