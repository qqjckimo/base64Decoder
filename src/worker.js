const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Proxy-Key",
};

const CF_GRAPHQL_ENDPOINT = "https://api.cloudflare.com/client/v4/graphql";

function jsonError(status, message) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
}

async function handleAnalyticsProxy(request, env) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (request.method !== "POST") {
    return jsonError(405, "Method Not Allowed");
  }

  const providedKey = request.headers.get("X-Proxy-Key");
  if (!providedKey || providedKey !== env.ANALYTICS_PROXY_KEY) {
    return jsonError(401, "Unauthorized");
  }

  const body = await request.text();
  const upstreamResponse = await fetch(CF_GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.CF_ANALYTICS_TOKEN}`,
    },
    body,
  });

  const responseBody = await upstreamResponse.text();
  const headers = new Headers();
  const upstreamContentType = upstreamResponse.headers.get("Content-Type");
  if (upstreamContentType) {
    headers.set("Content-Type", upstreamContentType);
  }
  headers.set("Access-Control-Allow-Origin", "*");

  return new Response(responseBody, { status: upstreamResponse.status, headers });
}

export default {
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url);
    if (pathname === "/cf-analytics-proxy") {
      return handleAnalyticsProxy(request, env);
    }
    return env.ASSETS.fetch(request);
  },
};
