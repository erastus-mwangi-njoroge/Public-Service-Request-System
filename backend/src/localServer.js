// Local / VM entry point: JSON-file storage, Node http server, serves the front end too.   Run: node server.js
const { loadConfig } = require("./config");
const { buildApp } = require("./container");
const { createNodeServer } = require("./http/adapters/nodeHttp");

(async () => {
  const config = loadConfig();
  const app = buildApp(config);
  await app.bootstrap.seedStaff();
  createNodeServer({ handle: app.handle, publicDir: config.publicDir, trustProxy: config.trustProxy })
    .listen(config.port, () => console.log(`Murang’a service portal running at http://localhost:${config.port}`));
})();
