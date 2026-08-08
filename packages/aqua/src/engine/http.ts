/*
 * INFO: engine/http.ts
 * Central HTTP tuning for all outbound requests made by endpoint handlers.
 *
 * Axios does NOT enable connection keep-alive by default, so every call
 * to an external API (GitHub, tikwm, shoti, lumenfall, postimg, etc.)
 * previously paid a fresh TCP + TLS handshake (~30-150ms each). Configuring
 * shared keep-alive agents lets one connection be reused across requests,
 * which removes that per-request handshake cost.
 *
 * This module mutates axios defaults on import, so the only requirement is
 * that it is imported once before any handler that uses axios runs
 * (app.ts imports it at startup).
 */

import axios from 'axios';
import http from 'node:http';
import https from 'node:https';

/** How long an idle keep-alive socket is kept open. */
const KEEP_ALIVE_MS = 60_000;
/** Cap on concurrent sockets per origin, so a burst can't exhaust sockets. */
const MAX_SOCKETS = 64;
/** Hard cap on any outbound call — fail fast instead of hanging requests. */
const DEFAULT_TIMEOUT_MS = 15_000;

export const httpAgent = new http.Agent({
  keepAlive: true,
  maxSockets: MAX_SOCKETS,
  keepAliveMsecs: KEEP_ALIVE_MS,
});

export const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: MAX_SOCKETS,
  keepAliveMsecs: KEEP_ALIVE_MS,
});

axios.defaults.httpAgent = httpAgent;
axios.defaults.httpsAgent = httpsAgent;
axios.defaults.timeout = DEFAULT_TIMEOUT_MS;

export { axios };
