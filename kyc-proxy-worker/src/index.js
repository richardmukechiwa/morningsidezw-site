addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const ALLOWED_ORIGIN = 'https://www.morningsidezw.com';
  const N8N_WEBHOOK = 'https://n8n.morningsidezw.com/webhook-test/onboard-agent-mvs/submit';

  // Handle preflight CORS request
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  // Only allow POST requests
  if (request.method === 'POST') {
    try {
      const payload = await request.json();

      // Forward the request to your n8n webhook
      const n8nResponse = await fetch(N8N_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await n8nResponse.json();

      return new Response(JSON.stringify(data), {
        status: n8nResponse.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
        },
      });

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
        },
      });
    }
  }

  // Reject other methods
  return new Response('Method Not Allowed', {
    status: 405,
    headers: {
      'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    },
  });
}
