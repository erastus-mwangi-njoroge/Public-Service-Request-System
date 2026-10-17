// Turns domain events into SMS and keeps the admin SMS log. Never throws: a failed text must not fail the real action.
// Messages stay in plain GSM characters (straight apostrophes) so one SMS fits in 160 characters.
const crypto = require("crypto");
const { intl } = require("../domain/validation");

class NotificationService {
  constructor({ gateway, smsLog, users, services, notifyOfficers }) { Object.assign(this, { gateway, smsLog, users, services, notifyOfficers }); }

  async send(phone, message, kind, logText) {
    const to = intl(phone); if (!to) return;
    const entry = { id: crypto.randomUUID(), at: new Date().toISOString(), to: to.slice(0, 7) + "***" + to.slice(-3), kind, text: logText ?? message, status: "" };
    try { entry.status = await this.gateway.send(to, message); } catch (x) { entry.status = "failed: " + (x.message || "error"); }
    try { await this.smsLog.add(entry); } catch (x) { console.error("SMS log write failed", x.message); }
  }
  paymentReceived(r) {
    return this.send(r.phone, `Murang'a County: payment received for ${r.ref} (${this.services.require(r.serviceId).name}). Track it on the portal with this reference.`, "payment");
  }
  async newPaidRequest(r) {
    if (!this.notifyOfficers) return;
    const s = this.services.require(r.serviceId);
    await Promise.all((await this.users.listActiveOfficers(s.dept)).filter((u) => u.phone)
      .map((u) => this.send(u.phone, `Murang'a County: new paid request ${r.ref} (${s.name}). Open the Staff desk to review.`, "officer")));
  }
  statusChanged(r, to, note) {
    return this.send(r.phone, `Murang'a County: ${r.ref} is now "${to}".` + (to === "Rejected" ? ` Reason: ${String(note).trim().slice(0, 80)}` : ""), "status");
  }
  resetCode(u, code) {
    return this.send(u.phone, `Murang'a County portal: your password reset code is ${code}. It expires in 10 minutes. Never share it.`, "reset", "Password reset code (hidden)");
  }
  passwordChanged(u) {
    return this.send(u.phone, "Murang'a County portal: your password was changed. If this was not you, contact the county office.", "security");
  }
}
module.exports = { NotificationService };
