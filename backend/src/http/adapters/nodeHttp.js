// Adapter 1: Node's built-in http server (local development, tests, or any VM). Also serves the static front end.
const http = require("http"), fs = require("fs"), path = require("path");
const { HttpError } = require("../../domain/errors");

const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml" };

function toHttpRequest(req, url, trustProxy) {
  const readJson = () => new Promise((ok, no) => {
    let s = ""; req.on("data", (c) => { s += c; if (s.length > 1e5) { no(new HttpError(413, "Request too large")); req.destroy(); } });
    req.on("end", () => { try { ok(s ? JSON.parse(s) : {}); } catch { no(new HttpError(400, "Invalid JSON")); } });
  });
  const readRaw = (max) => new Promise((ok, no) => {
    const parts = []; let n = 0;
    req.on("data", (c) => { n += c.length; if (n <= max) parts.push(c); }); // keep draining so the client still gets our error
    req.on("end", () => (n > max ? no(new HttpError(413, "File is too large")) : ok(Buffer.concat(parts))));
    req.on("error", no);
  });
  const fwd = trustProxy && (req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return { method: req.method, path: url.pathname, query: url.searchParams, headers: req.headers, ip: fwd || req.socket.remoteAddress, json: readJson, raw: readRaw };
}

function sendResponse(res, out) {
  if (out.buffer) { res.writeHead(out.status, out.headers); return res.end(out.buffer); }
  res.writeHead(out.status, { "Content-Type": "application/json" }); res.end(JSON.stringify(out.body));
}

function createNodeServer({ handle, publicDir, trustProxy }) {
  return http.createServer(async (req, res) => {
    res.setHeader("X-Content-Type-Options", "nosniff"); res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Content-Security-Policy", "default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'self'");
    const url = new URL(req.url, "http://x");
    try {
      if (url.pathname.startsWith("/api/")) return sendResponse(res, await handle(toHttpRequest(req, url, trustProxy)));
      const f = path.join(publicDir, url.pathname === "/" ? "index.html" : path.normalize(url.pathname));
      if (!f.startsWith(publicDir) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) throw new HttpError(404, "Not found");
      res.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(res);
    } catch (e) {
      if (e instanceof HttpError) return sendResponse(res, { status: e.code, body: { error: e.message } });
      console.error(e); sendResponse(res, { status: 500, body: { error: "Something went wrong on our side" } });
    }
  });
}
module.exports = { createNodeServer };
