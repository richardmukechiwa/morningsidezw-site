export default {
  async fetch(request) {

    const allowedOrigin = "https://www.morningsidezw.com";
    const origin = request.headers.get("Origin");

    const corsHeaders = {
      "Access-Control-Allow-Origin": allowedOrigin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (origin !== allowedOrigin) {
      return new Response("Forbidden origin", { status: 403, headers: corsHeaders });
    }

    const url = new URL(request.url);
    if (url.pathname !== "/submit") {
      return new Response("Not Found", { status: 404, headers: corsHeaders });
    }

    // FORWARD THE RAW REQUEST
    const forwarded = await fetch(
      "https://n8n.morningsidezw.com/webhook/onboard-agent-mvs",
      {
        method: "POST",
        headers: request.headers,    // keep original multipart headers
        body: request.body           // stream raw body including files
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
  }
};
