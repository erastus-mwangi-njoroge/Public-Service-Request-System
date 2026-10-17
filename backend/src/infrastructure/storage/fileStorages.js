// FileStorage contract: async put(id, buffer, contentType), read(id) -> Buffer | null, remove(id).
const fs = require("fs"), path = require("path");
class LocalFileStorage {
  constructor(dir) { this.dir = dir; fs.mkdirSync(dir, { recursive: true }); }
  async put(id, buf) { fs.writeFileSync(path.join(this.dir, id), buf); }
  async read(id) { const f = path.join(this.dir, id); return fs.existsSync(f) ? fs.readFileSync(f) : null; }
  async remove(id) { fs.rmSync(path.join(this.dir, id), { force: true }); }
}
// Firebase Storage (Google Cloud Storage bucket). `bucket` comes from firebase-admin: getStorage().bucket().
class FirebaseFileStorage {
  constructor(bucket, prefix = "documents/") { this.bucket = bucket; this.prefix = prefix; }
  async put(id, buf, contentType) { await this.bucket.file(this.prefix + id).save(buf, { contentType, resumable: false }); }
  async read(id) { const f = this.bucket.file(this.prefix + id); const [ok] = await f.exists(); return ok ? (await f.download())[0] : null; }
  async remove(id) { await this.bucket.file(this.prefix + id).delete({ ignoreNotFound: true }); }
}
module.exports = { LocalFileStorage, FirebaseFileStorage };
