export default {
  async fetch(request) {
    const url = new URL(request.url);

    const allowedOrigins = new Set([
      "https://www.morningsidezw.com",
      "https://morningsidezw.com",
      "https://dash.cloudflare.com",
      "http://localhost:3000",
      "http://localhost:5173",
      "http://127.0.0.1:5500",
      "https://api.morningsidezw.com"
    ]);

    const origin = request.headers.get("Origin");

    const isPreflight = request.method === "OPTIONS";
    const isDirectNavigation = origin === null;
    const isAllowedOrigin = origin && allowedOrigins.has(origin);

    // Decide allowed origin header
    const allowOriginHeader =
      isAllowedOrigin
        ? origin
        : isDirectNavigation
          ? "https://www.morningsidezw.com"
          : "";

    const corsHeaders = {
      "Access-Control-Allow-Origin": allowOriginHeader,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
      "Vary": "Origin"
    };

    // --------------------------------
    // OPTIONS preflight
    // --------------------------------
    if (isPreflight) {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    // --------------------------------
    // Origin enforcement
    // --------------------------------
    if (!isAllowedOrigin && !isDirectNavigation) {
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

    // --------------------------------
    // Route guard
    // --------------------------------
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

    // --------------------------------
    // Proxy to n8n
    // --------------------------------
    try {
      const payload = await request.json();

      const n8nResponse = await fetch(
        "https://n8n.morningsidezw.com/webhook-test/submit",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        }
      );

      const body = await n8nResponse.text();

      return new Response(body, {
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
