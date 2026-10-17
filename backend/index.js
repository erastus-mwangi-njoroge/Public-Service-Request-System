// Firebase entry point (Cloud Functions 2nd gen). Hosting rewrites /api/** to the `api` function.
const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { loadConfig } = require("./src/config");
const { buildApp } = require("./src/container");
const { createFunctionsHandler } = require("./src/http/adapters/firebaseFunctions");

// Secrets live in Google Secret Manager:  firebase functions:secrets:set JWT_SECRET   (see README)
const JWT_SECRET = defineSecret("JWT_SECRET");
const ADMIN_PASSWORD = defineSecret("ADMIN_PASSWORD");
// Going live with SMS or M-Pesa: set these secrets (README, step 7), then add them to LIVE_SECRETS below and redeploy.
const AT_API_KEY = defineSecret("AT_API_KEY");
const MPESA_KEY = defineSecret("MPESA_KEY");
const MPESA_SECRET = defineSecret("MPESA_SECRET");
const MPESA_PASSKEY = defineSecret("MPESA_PASSKEY");
const LIVE_SECRETS = []; // e.g. [AT_API_KEY, MPESA_KEY, MPESA_SECRET, MPESA_PASSKEY]

let ready; // built once per container instance, on the first request, when secrets are available
const init = () => ready ||= (async () => {
  const config = loadConfig({ ...process.env, DATA_BACKEND: "firebase", TRUST_PROXY: "1" });
  const app = buildApp(config);
  await app.bootstrap.seedStaff();
  return createFunctionsHandler(app.handle);
})().catch((e) => { ready = undefined; throw e; });

exports.api = onRequest(
  { region: process.env.FUNCTION_REGION || "africa-south1", memory: "512MiB", timeoutSeconds: 60, maxInstances: 10,
    secrets: [JWT_SECRET, ADMIN_PASSWORD, ...LIVE_SECRETS] },
  async (req, res) => (await init())(req, res),
);
