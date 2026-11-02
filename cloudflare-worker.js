/**
 * Cloudflare Worker: Discord API Reverse Proxy for Naruto Bot
 * 
 * Bypasses Cloudflare DDoS IP blocks on shared cloud hostings (e.g. Render Free Tier)
 * by proxying Discord REST API requests through Cloudflare's own trusted global edge network.
 * 
 * How to deploy in 2 minutes:
 * 1. Log in to https://dash.cloudflare.com/ (free account)
 * 2. Navigate to: Workers & Pages -> Create application -> Create Worker
 * 3. Give it a name: e.g. "naruto-discord-proxy"
 * 4. Click "Deploy" -> then click "Edit code"
 * 5. Paste this entire file, click "Save and Deploy"
 * 6. Copy your Worker URL: e.g. https://naruto-discord-proxy.<your-subdomain>.workers.dev
 * 7. In Render Dashboard -> Naruto Bot -> Environment -> Add:
 *    DISCORD_API_URL = https://naruto-discord-proxy.<your-subdomain>.workers.dev
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Root status check
    if (url.pathname === '/' || url.pathname === '') {
      return new Response(JSON.stringify({
        status: 'active',
        service: 'Naruto Bot Discord API Proxy',
        timestamp: new Date().toISOString()
      }, null, 2), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Automatically normalize path to ensure it hits /api/ on discord.com
    let targetPath = url.pathname;
    if (!targetPath.startsWith('/api')) {
      targetPath = '/api' + targetPath;
    }

    const discordUrl = new URL(targetPath + url.search, 'https://discord.com');

    // Clone incoming headers and set Host to discord.com
    const headers = new Headers(request.headers);
    headers.set('Host', 'discord.com');

    // Strip client-identifying headers so Discord sees Cloudflare's clean edge network IP
    headers.delete('cf-connecting-ip');
    headers.delete('cf-ipcountry');
    headers.delete('cf-ray');
    headers.delete('cf-visitor');
    headers.delete('x-forwarded-for');
    headers.delete('x-real-ip');

    const method = request.method.toUpperCase();
    const hasBody = !['GET', 'HEAD'].includes(method);

    try {
      const response = await fetch(discordUrl.toString(), {
        method: method,
        headers: headers,
        body: hasBody ? request.body : null,
        redirect: 'follow'
      });

      const responseHeaders = new Headers(response.headers);
      responseHeaders.set('Access-Control-Allow-Origin', '*');

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
};
