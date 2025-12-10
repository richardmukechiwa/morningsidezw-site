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

    // Only allow your site
    if (origin !== allowedOrigin) {
      return new Response("Forbidden origin", { status: 403 });
    }

    // Preflight request
    if (isPreflight) {
      return new Response("", { status: 204, headers: corsHeaders });
    }

    // Only POST
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: corsHeaders
      });
    }

    // Proxy the request to n8n unchanged
    const forwarded = await fetch("https://n8n.morningsidezw.com/webhook-test/onboard-agent-mvs/submit", {
      method: "POST",
      headers: request.headers,
      body: request.body
    });

    // Return n8n response with CORS headers
    const responseText = await forwarded.text();
    return new Response(responseText, {
      status: forwarded.status,
      headers: {
        ...corsHeaders,
        "Content-Type": forwarded.headers.get("Content-Type") || "text/plain"
      }
    });
  }
};
