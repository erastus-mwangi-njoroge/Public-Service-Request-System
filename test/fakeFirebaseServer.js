// Test-only entry: the production Firebase wiring (Firestore repos, Firebase storage, Firestore rate limiter, Functions-style
// seeding) running on the Node http adapter, backed by the in-memory fakes. Used by `npm run test:firebase`.
const { loadConfig } = require("../backend/src/config");
const { buildApp } = require("../backend/src/container");
const { createNodeServer } = require("../backend/src/http/adapters/nodeHttp");
const { fakeAdmin } = require("./fakeFirestore");
(async () => {
  const config = loadConfig({ ...process.env, DATA_BACKEND: "firebase" });
  const app = buildApp(config, { admin: fakeAdmin() });
  await app.bootstrap.seedStaff();
  createNodeServer({ handle: app.handle, publicDir: config.publicDir, trustProxy: false }).listen(config.port, () => console.log("running (fake firebase)"));
})();
