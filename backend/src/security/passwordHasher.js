const crypto = require("crypto");
class PasswordHasher {
  hash(pw, salt = crypto.randomBytes(16).toString("hex")) { return salt + ":" + crypto.scryptSync(pw, salt, 64).toString("hex"); }
  verify(pw, stored) {
    const [salt, h] = stored.split(":"), c = this.hash(pw, salt).split(":")[1];
    return crypto.timingSafeEqual(Buffer.from(h), Buffer.from(c));
  }
}
module.exports = { PasswordHasher };
