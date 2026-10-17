const crypto = require("crypto");
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
class TokenService {
  constructor(secret, ttlMs = 8 * 3600e3) { this.secret = secret; this.ttlMs = ttlMs; }
  mac(body) { return crypto.createHmac("sha256", this.secret).update(body).digest("base64url"); }
  sign(payload) { const now = Date.now(), body = b64({ ...payload, iat: now, exp: now + this.ttlMs }); return body + "." + this.mac(body); }
  read(token) {
    if (!token) return null;
    const [body, sig] = token.split(".");
    if (!sig || this.mac(body) !== sig) return null;
    try { const p = JSON.parse(Buffer.from(body, "base64url")); return p.exp > Date.now() ? p : null; } catch { return null; }
  }
}
module.exports = { TokenService };
