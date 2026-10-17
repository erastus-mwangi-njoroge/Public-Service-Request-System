// Tiny framework-neutral router. A route is (method, pattern, handler, options); handlers get a context and return
// a response object built with json() or binary(). Nothing here knows about Node's http module or Express.
const { HttpError } = require("../domain/errors");

const json = (status, body) => ({ status, body });
const binary = (status, headers, buffer) => ({ status, headers, buffer });

class Router {
  constructor() { this.routes = []; }
  add(method, pattern, handler, { guards = [], body = method === "POST" || method === "PATCH" ? "json" : "none" } = {}) {
    const keys = [], re = new RegExp("^" + pattern.replace(/:([a-zA-Z]+)/g, (_, k) => (keys.push(k), "([^/]+)")) + "$");
    this.routes.push({ method, re, keys, handler, guards, body });
    return this;
  }
  get(p, h, o) { return this.add("GET", p, h, o); }
  post(p, h, o) { return this.add("POST", p, h, o); }
  patch(p, h, o) { return this.add("PATCH", p, h, o); }
  delete(p, h, o) { return this.add("DELETE", p, h, o); }

  async dispatch(req, ctxExtras) {
    for (const r of this.routes) {
      if (r.method !== req.method) continue;
      const m = r.re.exec(req.path); if (!m) continue;
      const params = Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])]));
      const ctx = { req, params, query: req.query, ...ctxExtras, body: r.body === "json" ? await req.json() : {} };
      for (const g of r.guards) await g(ctx);
      return r.handler(ctx);
    }
    throw new HttpError(404, "Not found");
  }
}
module.exports = { Router, json, binary };
