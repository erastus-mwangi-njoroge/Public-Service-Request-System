// Adapter 2: Firebase Cloud Functions (Express-style req/res). Firebase Hosting serves the static files and
// rewrites /api/** to this function, so only the API runs here. The body is already consumed by the platform: use rawBody.
const { HttpError } = require("../../domain/errors");

function toHttpRequest(req) {
  const raw = req.rawBody || Buffer.alloc(0);
  const url = new URL(req.originalUrl || req.url, "http://x");
  return {
    method: req.method, path: url.pathname, query: url.searchParams, headers: req.headers,
    // Hosting sets Fastly-Client-IP itself, so unlike a plain X-Forwarded-For it cannot be spoofed by the caller.
    ip: req.headers["fastly-client-ip"] || (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.ip,
    json: async () => { if (raw.length > 1e5) throw new HttpError(413, "Request too large"); try { return raw.length ? JSON.parse(raw.toString("utf8")) : {}; } catch { throw new HttpError(400, "Invalid JSON"); } },
    raw: async (max) => { if (raw.length > max) throw new HttpError(413, "File is too large"); return raw; },
  };
}

const createFunctionsHandler = (handle) => async (req, res) => {
  const out = await handle(toHttpRequest(req));
  if (out.buffer) { res.set(out.headers).status(out.status).send(out.buffer); } else res.status(out.status).json(out.body);
};
module.exports = { createFunctionsHandler };
