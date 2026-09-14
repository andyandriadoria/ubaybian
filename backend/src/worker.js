import app from './index.js';
import { corsHeaders, json, withCors } from './http.js';
import { ensureProductionLaunchBaseline } from './launch-baseline.js';

const VERSION = '0.6.1';

function isSetupRequest(request) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '') || '/';
  return request.method === 'POST' && path === '/v1/setup';
}

async function patchHealthResponse(request, response, baseline) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '') || '/';
  if (request.method !== 'GET' || path !== '/v1/health' || !response.ok) return response;

  try {
    const payload = await response.clone().json();
    payload.version = VERSION;
    payload.db = payload.db || {};
    payload.db.launchBaselineApplied = Boolean(baseline?.applied || baseline?.alreadyApplied);
    payload.db.launchBaselineResetAt = Number(baseline?.resetAt || 0) || null;
    return new Response(JSON.stringify(payload), {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  } catch {
    return response;
  }
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS' || isSetupRequest(request)) {
      return app.fetch(request, env, ctx);
    }

    let cors = {};
    try {
      cors = corsHeaders(request, env);
      const baseline = await ensureProductionLaunchBaseline(env);
      const response = await app.fetch(request, env, ctx);
      return await patchHealthResponse(request, response, baseline);
    } catch (error) {
      console.error('PRODUCTION_LAUNCH_BASELINE_FAILED', error);
      return withCors(json({
        code: 'LAUNCH_BASELINE_FAILED',
        message: 'Persiapan data awal UbayBian belum selesai. Coba lagi sebentar.',
      }, 503), cors);
    }
  },
};
