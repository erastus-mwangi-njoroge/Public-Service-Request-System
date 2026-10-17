const crypto = require("crypto");
const { HttpError } = require("../domain/errors");
const { bad, text, PHONE, phoneNumber } = require("../domain/validation");
const { tempPassword } = require("../security/secrets");

class StaffService {
  constructor({ users, hasher, services, smsLog, smsLive }) { Object.assign(this, { users, hasher, services, smsLog, smsLive }); }

  out(u) { return { id: u.id, name: u.name, username: u.idNumber, phone: u.phone, role: u.role, dept: u.dept, active: u.active !== false, mustChange: !!u.mustChange }; }

  fields(body, cur = {}) {
    const role = body.role ?? cur.role; if (!["officer", "admin"].includes(role)) throw bad("Choose a role");
    const dept = role === "admin" ? null : (body.dept ?? cur.dept);
    if (role === "officer" && !this.services.hasDept(dept)) throw bad("Choose a department");
    const phone = phoneNumber(body.phone ?? cur.phone ?? ""); if (phone && !PHONE.test(phone)) throw bad("Enter a phone number like 0712345678");
    return { role, dept, phone };
  }

  async list() { return { staff: (await this.users.listStaff()).map((u) => this.out(u)), depts: this.services.depts }; }
  async smsLogView() { return { sms: await this.smsLog.latest(100), live: this.smsLive }; }

  async create(body) {
    const name = text(body.name, 3, 80, "Full name"), username = String(body.username || "").trim().toLowerCase();
    if (!/^(?=.*[a-z])[a-z0-9._-]{3,20}$/.test(username)) throw bad("Username: 3 to 20 letters, digits, dot, dash or underscore, with at least one letter");
    if (await this.users.findByLoginId(username)) throw new HttpError(409, "That username is already taken");
    const f = this.fields(body), temp = tempPassword();
    const u = { id: crypto.randomUUID(), name, idNumber: username, phone: f.phone, role: f.role, dept: f.dept, pw: this.hasher.hash(temp), mustChange: true, createdAt: new Date().toISOString() };
    await this.users.create(u);
    return { staff: this.out(u), tempPassword: temp };
  }

  async requireStaff(id) {
    const t = await this.users.findById(id);
    if (!t || t.role === "citizen") throw new HttpError(404, "Staff account not found");
    return t;
  }

  async update(actor, id, body) {
    const t = await this.requireStaff(id), f = this.fields(body, t);
    const name = body.name !== undefined ? text(body.name, 3, 80, "Full name") : t.name, active = body.active !== undefined ? !!body.active : t.active !== false;
    if (t.id === actor.id && (f.role !== t.role || !active)) throw bad("You cannot change your own role or deactivate your own account");
    const u = await this.users.update(id, (x) => Object.assign(x, { name, phone: f.phone, role: f.role, dept: f.dept, active }));
    return { staff: this.out(u) };
  }

  async resetPassword(actor, id) {
    const t = await this.requireStaff(id);
    if (t.id === actor.id) throw bad("Use the Account page to change your own password");
    const temp = tempPassword();
    await this.users.update(id, (x) => { x.pw = this.hasher.hash(temp); x.pwChangedAt = Date.now(); x.mustChange = true; delete x.reset; });
    return { tempPassword: temp };
  }
}
module.exports = { StaffService };
