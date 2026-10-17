// First-run setup: seed the two starter staff accounts when the user table is empty.
// Fixed ids make this safe if two serverless instances start at the same moment (the second create is a no-op).
class BootstrapService {
  constructor({ users, hasher, adminPassword, log = console.log }) { Object.assign(this, { users, hasher, adminPassword, log }); }
  async seedStaff() {
    if (await this.users.count()) return;
    if (!this.adminPassword) { this.log("No staff accounts exist and ADMIN_PASSWORD is not set, so none were created."); return; }
    const pw = this.hasher.hash(this.adminPassword);
    await this.users.create({ id: "seed-admin", name: "County Admin", idNumber: "admin", phone: "", role: "admin", dept: null, pw });
    await this.users.create({ id: "seed-officer", name: "Trade Officer", idNumber: "officer", phone: "", role: "officer", dept: "Trade & Licensing", pw });
    this.log(`Seeded staff logins "admin" and "officer". Password: ADMIN_PASSWORD (local default "ChangeMe123"). Change it before real use.`);
  }
}
module.exports = { BootstrapService };
