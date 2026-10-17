const crypto = require("crypto");
const { HttpError } = require("../domain/errors");
const { text } = require("../domain/validation");
const { canMove } = require("../domain/statusWorkflow");
const { publicView, addHistory } = require("../domain/requestModel");

class RequestService {
  constructor({ requests, services, locationService, notifier }) { Object.assign(this, { requests, services, locationService, notifier }); }

  view(r) { return publicView(r, this.services.require(r.serviceId)); }
  staffView(r) {
    return { ...this.view(r), serviceId: r.serviceId, name: r.name, phone: r.phone, details: r.details, amount: r.amount, receipt: r.receipt,
      school: r.school ? r.school.name : "", documents: r.documents || [] };
  }
  inScope(user, r) { return user.role === "admin" || r.dept === user.dept; }

  async create(user, body) {
    const s = this.services.find(body.serviceId); if (!s) throw new HttpError(400, "Choose a service");
    const place = await this.locationService.resolve({ subCounty: body.subCounty, ward: body.ward, schoolId: body.schoolId, schoolOther: body.schoolOther });
    const details = text(body.details, 5, 1000, "Request details");
    for (let i = 0; i < 10; i++) {
      const r = { ref: "MGA-" + new Date().getFullYear() + "-" + (1000 + crypto.randomInt(9000)), userId: user.id, serviceId: s.id, dept: s.dept,
        name: user.name, idNumber: user.idNumber, phone: user.phone, ...place, details, amount: s.fee, paid: false, status: "", createdAt: new Date().toISOString(), history: [], documents: [] };
      addHistory(r, "Pending payment", "Request created", user.idNumber);
      if (await this.requests.create(r)) return { request: this.view(r), amount: s.fee };
    }
    throw new HttpError(503, "Could not allocate a reference number. Try again.");
  }

  async track(ref) {
    const r = await this.requests.findByRef(String(ref).toUpperCase());
    if (!r) throw new HttpError(404, "No request found for that reference number");
    return { request: this.view(r) };
  }

  async listFor(user) {
    const list = user.role === "citizen" ? await this.requests.listForUser(user.id) : await this.requests.listForStaff(user.role === "admin" ? null : user.dept);
    return { requests: list.map((r) => this.staffView(r)) };
  }

  async setStatus(user, ref, body) {
    const to = body.status;
    const r = await this.requests.update(ref, (x) => {
      if (!this.inScope(user, x)) throw new HttpError(403, "This request belongs to another department");
      if (!x.paid) throw new HttpError(409, "Fee not yet paid");
      if (!canMove(x.status, to)) throw new HttpError(400, `Cannot move from ${x.status} to ${to}`);
      if (to === "Rejected") text(body.note, 5, 300, "A reason for rejection");
      addHistory(x, to, String(body.note || "").slice(0, 300), user.idNumber);
    });
    if (!r) throw new HttpError(404, "Request not found");
    await this.notifier.statusChanged(r, to, body.note);
    return { request: this.view(r) };
  }

  async stats(user) {
    const rs = await this.requests.listForStaff(user.role === "admin" ? null : user.dept);
    const by = (s) => rs.filter((r) => r.status === s).length;
    return { total: rs.length, pending: by("Submitted") + by("Under review"), approved: by("Approved"), completed: by("Completed"), rejected: by("Rejected"),
      revenue: rs.filter((r) => r.paid).reduce((a, r) => a + r.amount, 0) };
  }
}
module.exports = { RequestService };
