const crypto = require("crypto");
const { HttpError } = require("../domain/errors");
const { bad, text, PHONE, phoneNumber } = require("../domain/validation");
const { codeHash, resetCode } = require("../security/secrets");

const checkPassword = (pw, label = "Password") => { if (String(pw || "").length < 8) throw bad(label + " must be at least 8 characters"); };

class AuthService {
  constructor({ users, hasher, tokens, notifier }) { Object.assign(this, { users, hasher, tokens, notifier }); }

  toPublic(u) { return { name: u.name, role: u.role, dept: u.dept, idNumber: u.idNumber, phone: u.phone, mustChange: !!u.mustChange }; }
  issue(u) { return { token: this.tokens.sign({ uid: u.id }), user: this.toPublic(u) }; }

  // Deactivated accounts and tokens issued before a password change are rejected.
  async userFromToken(raw) {
    const t = this.tokens.read(raw); if (!t) return null;
    const u = await this.users.findById(t.uid);
    return u && u.active !== false && (t.iat || 0) >= (u.pwChangedAt || 0) ? u : null;
  }

  async register(body) {
    const name = text(body.name, 3, 80, "Full name"), idNumber = String(body.idNumber || "").trim(), phone = phoneNumber(body.phone);
    if (!/^\d{7,9}$/.test(idNumber)) throw bad("Enter a valid National ID (7 to 9 digits)");
    if (!PHONE.test(phone)) throw bad("Enter a phone number like 0712345678");
    checkPassword(body.password);
    if (await this.users.findByLoginId(idNumber)) throw new HttpError(409, "An account with this ID already exists");
    const u = { id: crypto.randomUUID(), name, idNumber, phone, role: "citizen", dept: null, pw: this.hasher.hash(body.password) };
    await this.users.create(u);
    return this.issue(u);
  }

  async login(idNumber, password) {
    const u = await this.users.findByLoginId(idNumber);
    if (!u || u.active === false || !this.hasher.verify(String(password || ""), u.pw)) throw new HttpError(401, "Wrong ID number or password");
    return this.issue(u);
  }

  async requestReset(idNumber) {
    const u = await this.users.findByLoginId(idNumber), now = Date.now();
    if (u && u.active !== false && u.phone && now - (u.reset?.sentAt || 0) > 60e3) { // one code a minute per account
      const code = resetCode(), salt = crypto.randomBytes(8).toString("hex");
      await this.users.update(u.id, (x) => { x.reset = { salt, h: codeHash(salt, code), exp: now + 10 * 60e3, tries: 0, sentAt: now }; });
      await this.notifier.resetCode(u, code);
    }
    // same answer whether or not the account exists, so the form can't be used to find valid ID numbers
    return { message: "If that account exists and has a phone number on file, a 6-digit code has been sent by SMS. It expires in 10 minutes." };
  }

  async resetPassword({ idNumber, code, password }) {
    checkPassword(password);
    const fail = new HttpError(400, "That code is wrong or has expired. Request a new one.");
    const u = await this.users.findByLoginId(idNumber); code = String(code || "").trim();
    if (!u || !u.reset || u.reset.exp < Date.now() || u.reset.tries >= 5) throw fail;
    let accepted = false;
    await this.users.update(u.id, (x) => { // count the attempt and, if right, change the password in one atomic step
      accepted = false; x.reset.tries++;
      if (/^\d{6}$/.test(code) && crypto.timingSafeEqual(Buffer.from(codeHash(x.reset.salt, code)), Buffer.from(x.reset.h))) {
        x.pw = this.hasher.hash(password); x.pwChangedAt = Date.now(); x.mustChange = false; delete x.reset; accepted = true;
      }
    });
    if (!accepted) throw fail;
    await this.notifier.passwordChanged(u);
    return { message: "Password changed. You can now sign in." };
  }

  async changePassword(user, current, password) {
    if (!this.hasher.verify(String(current || ""), user.pw)) throw new HttpError(403, "Your current password is wrong"); // 403, not 401: the session itself is fine
    checkPassword(password, "New password");
    if (password === current) throw bad("Choose a password different from the current one");
    const u = await this.users.update(user.id, (x) => { x.pw = this.hasher.hash(password); x.pwChangedAt = Date.now(); x.mustChange = false; });
    return this.issue(u); // other sessions are now revoked
  }
}
module.exports = { AuthService, checkPassword };
