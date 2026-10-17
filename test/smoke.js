// End-to-end smoke test. Starts the server on a throwaway data folder and exercises the API.  Run: npm test
const { spawn } = require("child_process"), fs = require("fs"), os = require("os"), path = require("path"), assert = require("assert");
const PORT = 3900 + Math.floor(Math.random() * 90), BASE = `http://localhost:${PORT}/api`;
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mga-"));
const srv = spawn("node", [path.join(__dirname, process.env.SMOKE_TARGET === "firebase" ? "fakeFirebaseServer.js" : "../server.js")], { env: { ...process.env, DATA_BACKEND: process.env.SMOKE_TARGET === "firebase" ? "firebase" : "", PORT, DATA_DIR: dir, JWT_SECRET: "test", ADMIN_PASSWORD: "ChangeMe123", MAX_UPLOAD_MB: "1", RATE_LIMIT: "1000", AT_API_KEY: "", AT_USERNAME: "", MPESA_KEY: "" } });
let out = ""; srv.stdout.on("data", (d) => (out += d)); srv.stderr.on("data", (d) => (out += d));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function call(method, p, { token, body, raw, headers } = {}) {
  const r = await fetch(BASE + p, { method, headers: { ...(raw ? {} : { "Content-Type": "application/json" }), ...(token ? { Authorization: "Bearer " + token } : {}), ...headers }, body: raw ?? (body ? JSON.stringify(body) : undefined) });
  const ct = r.headers.get("content-type") || "";
  return { status: r.status, json: ct.includes("json") ? await r.json() : null, buf: ct.includes("json") ? null : Buffer.from(await r.arrayBuffer()), headers: r.headers };
}
let n = 0; const ok = (name) => console.log(`  ok ${++n}  ${name}`);
const PDF = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF"), PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 13, 10, 26, 10]), Buffer.alloc(32)]);

(async () => {
  for (let i = 0; i < 50 && !out.includes("running"); i++) await wait(100);
  // --- citizen + request
  let r = await call("POST", "/auth/register", { body: { name: "Wanjiku Kamau", idNumber: "12345678", phone: "0712345678", password: "password1" } });
  assert.equal(r.status, 201); const cit = r.json.token;
  r = await call("POST", "/auth/register", { body: { name: "Other Person", idNumber: "87654321", phone: "0722222222", password: "password2" } }); const cit2 = r.json.token;
  r = await call("POST", "/requests", { token: cit, body: { serviceId: "biz", subCounty: "Kiharu", ward: "Township", schoolOther: "Murang'a Township Primary", details: "Shop in Murang'a town" } });
  const ref = r.json.request.ref; assert.equal(r.json.request.ward, "Township"); ok("citizen registered and created a request " + ref);

  // --- location: sub-county > ward > nearest public primary school
  const place = { serviceId: "biz", details: "Shop in town" }, mk = (extra) => call("POST", "/requests", { token: cit, body: { ...place, ...extra } });
  r = await call("GET", "/services"); assert.equal(r.json.locations["Kiharu"].length, 6); assert.ok(r.json.locations["Kangema"].includes("Rwathia")); assert.equal(Object.values(r.json.locations).flat().length >= 35, true); ok("catalog lists wards for every sub-county");
  assert.equal((await mk({ subCounty: "Kiharu", schoolOther: "Some Primary" })).status, 400); ok("ward is required");
  assert.equal((await mk({ subCounty: "Kiharu", ward: "Rwathia", schoolOther: "Some Primary" })).status, 400); ok("ward from another sub-county refused");
  assert.equal((await mk({ subCounty: "Kiharu", ward: "Wangu" })).status, 400); ok("nearest school is required");
  assert.equal((await mk({ subCounty: "Kiharu", ward: "Wangu", schoolId: "nope" })).status, 400); ok("unknown school id refused");
  r = await call("GET", "/locations/schools?subCounty=Kiharu&ward=Wangu"); assert.equal(r.status, 200); assert.deepEqual(r.json.schools, []); ok("school list endpoint works (empty until the catalog is loaded)");
  assert.equal((await call("GET", "/locations/schools?subCounty=Kiharu&ward=Rwathia")).status, 400); ok("school list rejects a ward outside the sub-county");

  // --- uploads
  const up = (buf, name, token = cit, rf = ref) => call("POST", `/requests/${rf}/documents`, { token, raw: buf, headers: { "Content-Type": "application/octet-stream", "X-File-Name": encodeURIComponent(name) } });
  r = await up(PDF, "National ID.pdf"); assert.equal(r.status, 201); const doc = r.json.document; assert.equal(doc.type, "application/pdf"); ok("PDF upload accepted");
  r = await up(PNG, "kra pin"); assert.equal(r.status, 201); assert.equal(r.json.document.name, "kra pin.png"); ok("PNG accepted, extension added from real file type");
  r = await up(Buffer.from("MZ\x90\x00 evil exe"), "invoice.pdf"); assert.equal(r.status, 415); ok("fake .pdf (really an exe) rejected by content sniffing");
  r = await up(Buffer.concat([PDF, Buffer.alloc(1.2 * 1048576)]), "big.pdf"); assert.equal(r.status, 413); ok("oversize file rejected (413)");
  r = await up(Buffer.alloc(0), "e.pdf"); assert.equal(r.status, 400); ok("empty file rejected");
  r = await up(PDF, "../../etc/passwd.pdf"); assert.equal(r.status, 201); assert.ok(!/[\/\\]/.test(r.json.document.name)); ok("path characters stripped from file name");
  r = await up(PDF, "x.pdf", cit2); assert.equal(r.status, 404); ok("another citizen cannot upload to my request");
  r = await call("GET", `/requests/${ref}/documents/${doc.id}`, { token: cit2 }); assert.equal(r.status, 404); ok("another citizen cannot download my document");
  r = await call("GET", `/requests/${ref}/documents/${doc.id}`); assert.equal(r.status, 401); ok("anonymous download refused");
  r = await call("GET", `/requests/${ref}/documents/${doc.id}`, { token: cit }); assert.equal(r.status, 200); assert.deepEqual(r.buf, PDF);
  assert.match(r.headers.get("content-disposition"), /^attachment/); ok("owner downloads identical bytes as attachment");
  r = await call("GET", "/requests", { token: cit }); assert.equal(r.json.requests[0].documents.length, 3); ok("documents listed on the request");
  r = await call("DELETE", `/requests/${ref}/documents/${doc.id}`, { token: cit }); assert.equal(r.status, 200); ok("owner can remove a document before review");

  // --- payment (simulated) triggers SMS
  await call("POST", `/requests/${ref}/pay`, { token: cit }); await wait(3200);
  assert.match(out, /payment received for MGA-/); ok("payment SMS sent to citizen (simulated)");

  // --- officer sees docs, status SMS
  r = await call("POST", "/auth/login", { body: { idNumber: "Officer", password: "ChangeMe123" } }); assert.equal(r.status, 200); const off = r.json.token; ok("staff login is case-insensitive");
  r = await call("GET", "/requests", { token: off }); assert.ok(r.json.requests[0].documents.length >= 1); assert.equal(r.json.requests.find((x) => x.ref === ref).school, "Murang'a Township Primary"); ok("officer sees ward and school");
  const odoc = r.json.requests[0].documents[0]; r = await call("GET", `/requests/${ref}/documents/${odoc.id}`, { token: off }); assert.equal(r.status, 200); ok("officer of the right department can download documents");
  r = await call("PATCH", `/requests/${ref}/status`, { token: off, body: { status: "Under review" } }); assert.equal(r.status, 200);
  await wait(200); assert.match(out, new RegExp(`${ref} is now "Under review"`)); ok("status-change SMS sent");
  r = await call("DELETE", `/requests/${ref}/documents/${odoc.id}`, { token: cit }); assert.equal(r.status, 409); ok("documents locked once review starts");

  // --- password reset
  r = await call("POST", "/auth/forgot", { body: { idNumber: "12345678" } }); const a = r.json.message;
  r = await call("POST", "/auth/forgot", { body: { idNumber: "99999999" } }); assert.equal(r.json.message, a); ok("forgot-password answer is identical for unknown accounts");
  const code = [...out.matchAll(/reset code is (\d{6})/g)].pop()[1];
  r = await call("POST", "/auth/reset", { body: { idNumber: "12345678", code: "000000", password: "newpassword1" } }); assert.equal(r.status, 400); ok("wrong code refused");
  r = await call("POST", "/auth/reset", { body: { idNumber: "12345678", code, password: "short" } }); assert.equal(r.status, 400); ok("weak new password refused");
  r = await call("POST", "/auth/reset", { body: { idNumber: "12345678", code, password: "newpassword1" } }); assert.equal(r.status, 200); ok("reset with the SMS code works");
  r = await call("POST", "/auth/reset", { body: { idNumber: "12345678", code, password: "another-pass1" } }); assert.equal(r.status, 400); ok("code cannot be reused");
  r = await call("GET", "/me", { token: cit }); assert.equal(r.status, 401); ok("old session revoked after password reset");
  r = await call("POST", "/auth/login", { body: { idNumber: "12345678", password: "newpassword1" } }); assert.equal(r.status, 200); ok("login with new password");
  r = await call("POST", "/auth/forgot", { body: { idNumber: "12345678" } }); r = await call("POST", "/auth/forgot", { body: { idNumber: "12345678" } });
  assert.equal([...out.matchAll(/reset code is/g)].length, 2); ok("only one code per minute per account");
  for (let i = 0; i < 5; i++) await call("POST", "/auth/reset", { body: { idNumber: "12345678", code: "111111", password: "whatever123" } });
  const c2 = [...out.matchAll(/reset code is (\d{6})/g)].pop()[1];
  r = await call("POST", "/auth/reset", { body: { idNumber: "12345678", code: c2, password: "whatever123" } }); assert.equal(r.status, 400); ok("after 5 wrong guesses even the right code is refused");

  // --- change password
  await wait(100);
  r = await call("POST", "/auth/login", { body: { idNumber: "admin", password: "ChangeMe123" } }); let adm = r.json.token;
  r = await call("POST", "/auth/change-password", { token: adm, body: { current: "bad", password: "AdminPass123" } }); assert.equal(r.status, 403); ok("change password needs the current password (403, not a logout)");
  r = await call("POST", "/auth/change-password", { token: adm, body: { current: "ChangeMe123", password: "AdminPass123" } }); assert.equal(r.status, 200); const old = adm; adm = r.json.token;
  assert.equal((await call("GET", "/me", { token: old })).status, 401); assert.equal((await call("GET", "/me", { token: adm })).status, 200); ok("change password returns a fresh token and revokes the old one");

  // --- officer management
  assert.equal((await call("GET", "/staff", { token: off })).status, 403); assert.equal((await call("GET", "/staff", { token: cit2 })).status, 403); assert.equal((await call("GET", "/staff")).status, 401); ok("staff endpoints locked to admin");
  r = await call("POST", "/staff", { token: adm, body: { name: "Water Officer", username: "water.officer", phone: "0733333333", role: "officer", dept: "Water & Irrigation" } });
  assert.equal(r.status, 201); const w = r.json.staff, temp = r.json.tempPassword; assert.equal(temp.length, 10); assert.ok(w.mustChange); ok("admin creates an officer and gets a one-time temporary password");
  assert.equal((await call("POST", "/staff", { token: adm, body: { name: "Dup", username: "WATER.officer", role: "admin" } })).status, 409); ok("duplicate username refused (case-insensitive)");
  assert.equal((await call("POST", "/staff", { token: adm, body: { name: "Squatter", username: "12345678", role: "admin" } })).status, 400); ok("staff username can't impersonate a citizen ID number");
  assert.equal((await call("POST", "/staff", { token: adm, body: { name: "No Dept", username: "nodept", role: "officer" } })).status, 400); ok("officer needs a department");
  r = await call("POST", "/auth/login", { body: { idNumber: "water.officer", password: temp } }); assert.equal(r.status, 200); assert.equal(r.json.user.mustChange, true); const wt = r.json.token; ok("new officer signs in with the temporary password and is flagged to change it");
  r = await call("GET", "/staff", { token: adm }); const self = r.json.staff.find((s) => s.username === "admin");
  assert.equal((await call("PATCH", `/staff/${self.id}`, { token: adm, body: { active: false } })).status, 400);
  assert.equal((await call("PATCH", `/staff/${self.id}`, { token: adm, body: { role: "officer", dept: "Transport" } })).status, 400); ok("admin cannot deactivate or demote themselves");
  assert.equal((await call("POST", `/staff/${self.id}/reset-password`, { token: adm })).status, 400); ok("admin must use Account page for own password");
  r = await call("PATCH", `/staff/${w.id}`, { token: adm, body: { dept: "Transport", name: "Transport Officer" } }); assert.equal(r.json.staff.dept, "Transport"); ok("admin edits officer department");
  r = await call("PATCH", `/staff/${w.id}`, { token: adm, body: { active: false } }); assert.equal(r.json.staff.active, false);
  assert.equal((await call("GET", "/me", { token: wt })).status, 401); assert.equal((await call("POST", "/auth/login", { body: { idNumber: "water.officer", password: temp } })).status, 401); ok("deactivated officer is locked out immediately, token and login");
  await call("PATCH", `/staff/${w.id}`, { token: adm, body: { active: true } });
  r = await call("POST", `/staff/${w.id}/reset-password`, { token: adm }); assert.equal(r.status, 200);
  assert.equal((await call("POST", "/auth/login", { body: { idNumber: "water.officer", password: temp } })).status, 401);
  assert.equal((await call("POST", "/auth/login", { body: { idNumber: "water.officer", password: r.json.tempPassword } })).status, 200); ok("admin resets an officer's password");
  r = await call("GET", "/sms", { token: adm }); assert.ok(r.json.sms.length >= 3); assert.ok(!JSON.stringify(r.json).includes(code)); assert.equal(r.json.live, false); ok("SMS log visible to admin; reset codes are never stored in it");
  r = await call("POST", "/requests", { token: (await call("POST", "/auth/login", { body: { idNumber: "87654321", password: "password2" } })).json.token, body: { serviceId: "water", subCounty: "Kiharu", ward: "Wangu", schoolOther: "Wangu Primary", details: "New connection please" } });
  console.log(`\nAll ${n} checks passed.`);
})().catch((e) => { console.error("\nFAILED:", e.message, "\n", e.stack.split("\n")[1]); console.error("--- server output ---\n" + out.slice(-1500)); process.exitCode = 1; })
  .finally(() => { srv.kill(); fs.rmSync(dir, { recursive: true, force: true }); });
