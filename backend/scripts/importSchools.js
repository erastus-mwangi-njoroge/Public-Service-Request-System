// Load the public primary school list into the database.
//   node backend/scripts/importSchools.js schools.csv                 -> local JSON store (DATA_DIR)
//   DATA_BACKEND=firebase node backend/scripts/importSchools.js schools.csv   -> Firestore (needs gcloud credentials)
// CSV columns (header row required): subCounty,ward,name      e.g.  Kiharu,Township,Example Primary School
// Rows whose sub-county/ward are not in the portal's list are reported and skipped. Safe to run repeatedly.
const fs = require("fs");
const { loadConfig } = require("../src/config");
const { buildApp } = require("../src/container");
const { Locations } = require("../src/domain/locations");

const file = process.argv[2];
if (!file) { console.error("Usage: node backend/scripts/importSchools.js <schools.csv>"); process.exit(1); }
const parseLine = (l) => { const out = []; let cur = "", q = false; for (const ch of l) { if (ch === '"') q = !q; else if (ch === "," && !q) { out.push(cur); cur = ""; } else cur += ch; } out.push(cur); return out.map((s) => s.trim()); };
const lines = fs.readFileSync(file, "utf8").replace(/^﻿/, "").split(/\r?\n/).filter(Boolean);
const head = parseLine(lines.shift()).map((h) => h.toLowerCase());
const col = (n) => head.indexOf(n.toLowerCase());
const [ic, iw, iname] = [col("subCounty"), col("ward"), col("name")];
if ([ic, iw, iname].includes(-1)) { console.error("Header must contain: subCounty,ward,name"); process.exit(1); }

const locations = new Locations(), good = [], skipped = [];
lines.forEach((l, i) => { const c = parseLine(l), x = { subCounty: c[ic], ward: c[iw], name: c[iname] }; (x.name && locations.hasWard(x.subCounty, x.ward) ? good : skipped).push(x.name ? x : { ...x, row: i + 2 }); });
(async () => {
  const app = buildApp(loadConfig());
  const added = await app.schools.addMany(good);
  console.log(`Read ${lines.length} rows: ${added} new school(s) added, ${good.length - added} already present, ${skipped.length} skipped.`);
  skipped.slice(0, 20).forEach((s) => console.log(`  skipped row ${s.row}: ${s.subCounty} / ${s.ward} / ${s.name}`));
})().catch((e) => { console.error(e); process.exit(1); });
