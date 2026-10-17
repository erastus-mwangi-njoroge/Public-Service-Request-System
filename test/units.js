// Unit tests: location rules with real school ids, and the repository contract on the JSON implementation.
const assert = require("assert"), fs = require("fs"), os = require("os"), path = require("path");
const { JsonStore } = require("../backend/src/repositories/json/jsonStore");
const r = require("../backend/src/repositories/json/repositories");
const { Locations } = require("../backend/src/domain/locations");
const { LocationService } = require("../backend/src/services/locationService");
const { canMove } = require("../backend/src/domain/statusWorkflow");
const { sniff } = require("../backend/src/services/documentService");

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mga-u-")), store = new JsonStore(dir), schools = new r.JsonSchoolRepository(store);
  assert.equal(await schools.addMany([{ subCounty: "Kiharu", ward: "Wangu", name: "B School" }, { subCounty: "Kiharu", ward: "Wangu", name: "A School" }, { subCounty: "Kiharu", ward: "Gaturi", name: "C School" }]), 3);
  assert.equal(await schools.addMany([{ subCounty: "Kiharu", ward: "Wangu", name: "a school" }]), 0, "same ward+name is idempotent");
  const list = await schools.listByWard("Kiharu", "Wangu"); assert.deepEqual(list.map((x) => x.name), ["A School", "B School"]);
  const svc = new LocationService({ locations: new Locations(), schools });
  const ok = await svc.resolve({ subCounty: "Kiharu", ward: "Wangu", schoolId: list[0].id }); assert.equal(ok.school.name, "A School"); assert.equal(ok.school.id, list[0].id);
  const gaturi = (await schools.listByWard("Kiharu", "Gaturi"))[0];
  await assert.rejects(svc.resolve({ subCounty: "Kiharu", ward: "Wangu", schoolId: gaturi.id }), /Choose a school/); // school belongs to another ward
  const other = await svc.resolve({ subCounty: "Kiharu", ward: "Wangu", schoolOther: "  Faraja Primary " }); assert.deepEqual(other.school, { id: null, name: "Faraja Primary" });
  console.log("  ok locations: ids, ward ownership, free-text fallback");

  // repository contract (the Firestore implementation must behave the same)
  const users = new r.JsonUserRepository(store), reqs = new r.JsonRequestRepository(store);
  assert.equal(await users.create({ id: "u1", idNumber: "Admin", role: "admin" }), true); assert.equal(await users.create({ id: "u1", idNumber: "x" }), false);
  assert.equal((await users.findByLoginId(" admin ")).id, "u1"); assert.equal((await users.update("u1", (u) => { u.name = "N"; })).name, "N");
  const base = { userId: "u1", dept: "Transport", paid: false, status: "Pending payment", history: [], createdAt: "2026-01-01" };
  assert.equal(await reqs.create({ ...base, ref: "R1" }), true); assert.equal(await reqs.create({ ...base, ref: "R1" }), false);
  await assert.rejects(reqs.update("R1", () => { throw new Error("boom"); })); assert.equal((await reqs.findByRef("R1")).status, "Pending payment");
  assert.equal((await reqs.listForStaff("Transport")).length, 1); assert.equal((await reqs.listForStaff("Health Services")).length, 0);
  const got = await reqs.findByRef("R1"); got.status = "mutated"; assert.equal((await reqs.findByRef("R1")).status, "Pending payment", "repositories return copies");
  console.log("  ok repository contract (json)");

  assert.ok(canMove("Submitted", "Under review") && canMove("Approved", "Rejected") && !canMove("Completed", "Rejected") && !canMove("Submitted", "Approved"));
  assert.equal(sniff(Buffer.from("%PDF-1")) [1], "pdf"); assert.equal(sniff(Buffer.from("MZ..")), null);
  console.log("  ok status workflow + file sniffing\nAll unit checks passed.");
  fs.rmSync(dir, { recursive: true, force: true });
})().catch((e) => { console.error("FAILED:", e); process.exitCode = 1; });
