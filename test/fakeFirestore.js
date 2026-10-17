// Minimal in-memory stand-in for the parts of firebase-admin we use (Firestore + Storage), so the real Firestore
// repository code can be tested without the emulator. Mirrors the behaviours we rely on: create() fails if the
// document exists (gRPC code 6), where/orderBy/limit, count(), transactions and batches.
const clone = (x) => JSON.parse(JSON.stringify(x));
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

class Snap { constructor(id, d) { this.id = id; this.exists = d !== undefined; this._d = d; } data() { return this._d === undefined ? undefined : clone(this._d); } }
class Ref {
  constructor(store, name, id) { Object.assign(this, { store, name, id }); }
  get col() { return (this.store.cols[this.name] ||= new Map()); }
  async get() { return new Snap(this.id, this.col.get(this.id)); }
  async set(d) { this.col.set(this.id, clone(d)); }
  async create(d) { if (this.col.has(this.id)) throw Object.assign(new Error("ALREADY_EXISTS"), { code: 6 }); this.col.set(this.id, clone(d)); }
  async delete() { this.col.delete(this.id); }
}
class Query {
  constructor(store, name, filters = [], order = null, max = Infinity) { Object.assign(this, { store, name, filters, order, max }); }
  where(f, op, v) { return new Query(this.store, this.name, [...this.filters, [f, op, v]], this.order, this.max); }
  orderBy(f, dir = "asc") { return new Query(this.store, this.name, this.filters, [f, dir], this.max); }
  limit(n) { return new Query(this.store, this.name, this.filters, this.order, n); }
  doc(id) { return new Ref(this.store, this.name, id); }
  rows() {
    let rows = [...(this.store.cols[this.name] || new Map()).entries()].filter(([, d]) => this.filters.every(([f, op, v]) => op === "==" ? d[f] === v : op === "in" ? v.includes(d[f]) : false));
    if (this.order) { const [f, dir] = this.order; rows = rows.filter(([, d]) => d[f] !== undefined).sort((a, b) => cmp(a[1][f], b[1][f]) * (dir === "desc" ? -1 : 1)); }
    return rows.slice(0, this.max);
  }
  async get() { const rows = this.rows(); return { empty: !rows.length, docs: rows.map(([id, d]) => new Snap(id, d)) }; }
  count() { return { get: async () => ({ data: () => ({ count: this.rows().length }) }) }; }
}
class FakeFirestore {
  constructor() { this.cols = {}; this.indexNeeded = []; }
  collection(name) { return new Query(this, name); }
  async runTransaction(fn) {
    const writes = [];
    const tx = { get: async (ref) => ref.get(), set: (ref, d) => writes.push([ref, d]) };
    const out = await fn(tx); for (const [ref, d] of writes) await ref.set(d); return out;
  }
  batch() { const w = []; return { set: (ref, d) => w.push([ref, d]), commit: async () => { for (const [r, d] of w) await r.set(d); } }; }
}
class FakeBucket {
  constructor() { this.files = new Map(); }
  file(name) {
    const m = this.files;
    return { save: async (buf) => m.set(name, Buffer.from(buf)), exists: async () => [m.has(name)], download: async () => [m.get(name)], delete: async () => { m.delete(name); } };
  }
}
const fakeAdmin = () => { const db = new FakeFirestore(), bucket = new FakeBucket(); return { apps: [{}], firestore: () => db, storage: () => ({ bucket: () => bucket }), db, bucket }; };
module.exports = { fakeAdmin };
