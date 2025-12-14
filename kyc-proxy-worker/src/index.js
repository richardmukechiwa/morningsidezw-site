// src/index.js
export default {
  async fetch(request) {
    const allowedOrigins = [
      "https://www.morningsidezw.com",
      "https://morningsidezw.com"
    ];
    const origin = request.headers.get("Origin") || "";

    const corsHeaders = {
      "Access-Control-Allow-Origin": allowedOrigins.includes(origin) ? origin : "",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400"
    };

    // Handle preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Block unauthorized origins
    if (!allowedOrigins.includes(origin)) {
      return new Response(JSON.stringify({ error: "Forbidden origin" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Ensure correct path
    const url = new URL(request.url);
    if (url.pathname !== "/submit") {
      return new Response(JSON.stringify({ error: "Not Found", path: url.pathname }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Only POST allowed
    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    try {
      // Forward JSON payload to n8n
      const requestBody = await request.json();
      const forwarded = await fetch(
        "https://n8n.morningsidezw.com/webhook/onboard-agent-optimized",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody)
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
      return new Response(JSON.stringify({ error: "Proxy failed", details: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
  }
};
