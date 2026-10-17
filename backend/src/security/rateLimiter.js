// RateLimiter contract: async hit(key) -> true when the caller is over the limit.
class MemoryRateLimiter {
  constructor(limit) { this.limit = limit; this.hits = new Map(); }
  async hit(key) {
    const now = Date.now(), a = (this.hits.get(key) || []).filter((t) => now - t < 60e3);
    a.push(now); this.hits.set(key, a); return a.length > this.limit;
  }
}
// Shared across all serverless instances, so limits really hold on Firebase.
class FirestoreRateLimiter {
  constructor(db, limit) { this.db = db; this.limit = limit; this.col = db.collection("rateLimits"); }
  async hit(key) {
    const ref = this.col.doc(require("crypto").createHash("sha256").update(key).digest("hex"));
    return this.db.runTransaction(async (tx) => {
      const now = Date.now(), snap = await tx.get(ref);
      const a = ((snap.exists && snap.data().hits) || []).filter((t) => now - t < 60e3); a.push(now);
      tx.set(ref, { hits: a, at: now });
      return a.length > this.limit;
    });
  }
}
module.exports = { MemoryRateLimiter, FirestoreRateLimiter };
