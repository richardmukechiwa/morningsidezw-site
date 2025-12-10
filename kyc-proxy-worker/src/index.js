export default {
async fetch(request) {
const corsHeaders = {
"Access-Control-Allow-Origin": "https://www.morningsidezw.com",
"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
"Access-Control-Allow-Headers": "Content-Type",
"Access-Control-Max-Age": "86400"
};

if (request.method === "OPTIONS") {
  return new Response(null, { status: 200, headers: corsHeaders });
}

if (request.method === "POST") {
  try {
    const body = await request.text();

    const upstream = await fetch(
      "https://n8n.morningsidezw.com/webhook-test/onboard-agent-mvs/submit",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body
      }
    );

    const data = await upstream.text();

    return new Response(data, {
      status: upstream.status,
      headers: corsHeaders
    });
  } catch (err) {
    return new Response("Worker Error", {
      status: 500,
      headers: corsHeaders
    });
  }
}

return new Response("Method not allowed", {
  status: 405,
  headers: corsHeaders
});


}
};