const crypto = require("crypto");
const copy = (x) => (x == null ? x : structuredClone(x));

class JsonUserRepository {
  constructor(store) { this.s = store; }
  async findById(id) { return copy(this.s.db.users.find((u) => u.id === id)) || null; }
  async findByLoginId(login) { const k = String(login || "").trim().toLowerCase(); return copy(this.s.db.users.find((u) => u.idNumber.toLowerCase() === k)) || null; }
  async create(u) { if (this.s.db.users.some((x) => x.id === u.id)) return false; this.s.db.users.push(copy(u)); this.s.save(); return true; }
  async update(id, mutator) {
    const i = this.s.db.users.findIndex((u) => u.id === id); if (i < 0) return null;
    const c = copy(this.s.db.users[i]); mutator(c); this.s.db.users[i] = c; this.s.save(); return copy(c);
  }
  async listStaff() { return copy(this.s.db.users.filter((u) => u.role !== "citizen")); }
  async listActiveOfficers(dept) { return copy(this.s.db.users.filter((u) => u.role === "officer" && u.active !== false && u.dept === dept)); }
  async count() { return this.s.db.users.length; }
}

class JsonRequestRepository {
  constructor(store) { this.s = store; }
  async create(r) { if (this.s.db.requests.some((x) => x.ref === r.ref)) return false; this.s.db.requests.unshift(copy(r)); this.s.save(); return true; }
  async findByRef(ref) { return copy(this.s.db.requests.find((r) => r.ref === ref)) || null; }
  async findByCheckoutId(id) { return copy(this.s.db.requests.find((r) => r.checkoutId === id)) || null; }
  async update(ref, mutator) {
    const i = this.s.db.requests.findIndex((r) => r.ref === ref); if (i < 0) return null;
    const c = copy(this.s.db.requests[i]); mutator(c); this.s.db.requests[i] = c; this.s.save(); return copy(c);
  }
  async listForUser(userId) { return copy(this.s.db.requests.filter((r) => r.userId === userId)); }
  async listForStaff(dept) { return copy(this.s.db.requests.filter((r) => (r.paid || r.status === "Pending payment") && (!dept || r.dept === dept))); }
}

class JsonSmsLogRepository {
  constructor(store) { this.s = store; }
  async add(e) { this.s.db.sms.unshift(copy(e)); this.s.db.sms.length = Math.min(this.s.db.sms.length, 500); this.s.save(); }
  async latest(n) { return copy(this.s.db.sms.slice(0, n)); }
}

const schoolId = (sc, ward, name) => crypto.createHash("sha1").update([sc, ward, name].join("|").toLowerCase()).digest("hex").slice(0, 16);
class JsonSchoolRepository {
  constructor(store) { this.s = store; }
  async listByWard(sc, ward) {
    return this.s.db.schools.filter((x) => x.subCounty === sc && x.ward === ward).map(({ id, name }) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }
  async findById(id) { return copy(this.s.db.schools.find((x) => x.id === id)) || null; }
  async addMany(list) {
    let n = 0;
    for (const x of list) { const id = schoolId(x.subCounty, x.ward, x.name); if (!this.s.db.schools.some((y) => y.id === id)) { this.s.db.schools.push({ id, name: x.name, subCounty: x.subCounty, ward: x.ward }); n++; } }
    if (n) this.s.save(); return n;
  }
}
module.exports = { JsonUserRepository, JsonRequestRepository, JsonSmsLogRepository, JsonSchoolRepository, schoolId };
