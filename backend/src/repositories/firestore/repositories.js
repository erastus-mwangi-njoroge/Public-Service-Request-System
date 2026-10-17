// Firestore implementations of the repository contracts (see ../contracts.md).
// Collections: users, requests (doc id = reference), smsLog, schools. All access goes through the backend (Admin SDK);
// firestore.rules deny every direct client read/write.
const { schoolId } = require("../json/repositories");
const data = (d) => (d.exists ? d.data() : null);
const strip = (o) => JSON.parse(JSON.stringify(o)); // Firestore rejects undefined values

class FirestoreUserRepository {
  constructor(db) { this.db = db; this.col = db.collection("users"); }
  async findById(id) { return data(await this.col.doc(id).get()); }
  async findByLoginId(login) {
    const k = String(login || "").trim().toLowerCase(); if (!k) return null;
    const q = await this.col.where("loginKey", "==", k).limit(1).get();
    return q.empty ? null : q.docs[0].data();
  }
  async create(u) {
    try { await this.col.doc(u.id).create(strip({ ...u, loginKey: u.idNumber.toLowerCase() })); return true; }
    catch (e) { if (e.code === 6 /* ALREADY_EXISTS */) return false; throw e; }
  }
  async update(id, mutator) {
    const ref = this.col.doc(id);
    return this.db.runTransaction(async (tx) => {
      const snap = await tx.get(ref); if (!snap.exists) return null;
      const u = snap.data(); mutator(u); u.loginKey = u.idNumber.toLowerCase();
      tx.set(ref, strip(u)); return u;
    });
  }
  async listStaff() { return (await this.col.where("role", "in", ["officer", "admin"]).get()).docs.map((d) => d.data()); }
  async listActiveOfficers(dept) {
    return (await this.col.where("dept", "==", dept).get()).docs.map((d) => d.data()).filter((u) => u.role === "officer" && u.active !== false);
  }
  async count() { return (await this.col.count().get()).data().count; }
}

class FirestoreRequestRepository {
  constructor(db) { this.db = db; this.col = db.collection("requests"); }
  async create(r) {
    try { await this.col.doc(r.ref).create(strip(r)); return true; }
    catch (e) { if (e.code === 6) return false; throw e; }
  }
  async findByRef(ref) { return data(await this.col.doc(ref).get()); }
  async findByCheckoutId(id) { const q = await this.col.where("checkoutId", "==", id).limit(1).get(); return q.empty ? null : q.docs[0].data(); }
  async update(ref, mutator) {
    const doc = this.col.doc(ref);
    return this.db.runTransaction(async (tx) => {
      const snap = await tx.get(doc); if (!snap.exists) return null;
      const r = snap.data(); mutator(r); tx.set(doc, strip(r)); return r;
    });
  }
  async listForUser(userId) { return (await this.col.where("userId", "==", userId).orderBy("createdAt", "desc").get()).docs.map((d) => d.data()); }
  async listForStaff(dept) {
    let q = this.col; if (dept) q = q.where("dept", "==", dept);
    const docs = (await q.orderBy("createdAt", "desc").limit(500).get()).docs.map((d) => d.data());
    return docs.filter((r) => r.paid || r.status === "Pending payment");
  }
}

class FirestoreSmsLogRepository {
  constructor(db) { this.col = db.collection("smsLog"); }
  async add(e) { await this.col.doc(e.id).set(strip(e)); }
  async latest(n) { return (await this.col.orderBy("at", "desc").limit(n).get()).docs.map((d) => d.data()); }
}

class FirestoreSchoolRepository {
  constructor(db) { this.db = db; this.col = db.collection("schools"); }
  async listByWard(subCounty, ward) {
    const q = await this.col.where("subCounty", "==", subCounty).where("ward", "==", ward).get();
    return q.docs.map((d) => ({ id: d.id, name: d.data().name })).sort((a, b) => a.name.localeCompare(b.name));
  }
  async findById(id) { const d = await this.col.doc(id).get(); return d.exists ? { id: d.id, ...d.data() } : null; }
  async addMany(list) {
    let n = 0, batch = this.db.batch(), size = 0;
    for (const x of list) {
      batch.set(this.col.doc(schoolId(x.subCounty, x.ward, x.name)), { name: x.name, subCounty: x.subCounty, ward: x.ward }); n++;
      if (++size === 400) { await batch.commit(); batch = this.db.batch(); size = 0; }
    }
    if (size) await batch.commit(); return n;
  }
}
module.exports = { FirestoreUserRepository, FirestoreRequestRepository, FirestoreSmsLogRepository, FirestoreSchoolRepository };
