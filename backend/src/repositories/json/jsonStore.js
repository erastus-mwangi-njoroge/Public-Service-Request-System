// One JSON file with atomic writes. Good for local development and tests; not for production.
const fs = require("fs"), path = require("path");
class JsonStore {
  constructor(dataDir) {
    this.file = path.join(dataDir, "db.json");
    fs.mkdirSync(dataDir, { recursive: true });
    this.db = { users: [], requests: [], sms: [], schools: [] };
    if (fs.existsSync(this.file)) Object.assign(this.db, JSON.parse(fs.readFileSync(this.file, "utf8")));
  }
  save() { const t = this.file + ".tmp"; fs.writeFileSync(t, JSON.stringify(this.db, null, 2)); fs.renameSync(t, this.file); }
}
module.exports = { JsonStore };
