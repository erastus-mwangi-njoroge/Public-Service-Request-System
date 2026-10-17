// Single place that reads the environment. Everything else receives a plain config object (no process.env elsewhere).
const path = require("path");
const crypto = require("crypto");

function loadConfig(env = process.env) {
  const backend = env.DATA_BACKEND === "firebase" ? "firebase" : "local";
  const secret = env.JWT_SECRET || (backend === "local" ? crypto.randomBytes(32).toString("hex") : "");
  if (backend === "firebase" && !secret) throw new Error("JWT_SECRET must be set when DATA_BACKEND=firebase");
  const username = env.AT_USERNAME || "";
  return {
    backend,
    port: env.PORT || 3000,
    secret,
    dataDir: env.DATA_DIR || path.join(__dirname, "..", "..", "data"),
    publicDir: path.join(__dirname, "..", "..", "public"),
    maxUploadBytes: (Number(env.MAX_UPLOAD_MB) || 8) * 1024 * 1024,
    maxDocs: 10,
    rateLimitPerMinute: Number(env.RATE_LIMIT) || 10,
    trustProxy: !!env.TRUST_PROXY,
    // In production there is no safe default password for the seeded staff accounts.
    adminPassword: env.ADMIN_PASSWORD || (backend === "local" ? "ChangeMe123" : ""),
    notifyOfficers: env.SMS_NOTIFY_OFFICERS !== "off",
    firebase: { storageBucket: env.STORAGE_BUCKET || "" },
    sms: {
      live: !!(env.AT_API_KEY && username),
      username, apiKey: env.AT_API_KEY || "", senderId: env.AT_SENDER_ID || "",
      baseUrl: env.AT_BASE || (username === "sandbox" ? "https://api.sandbox.africastalking.com" : "https://api.africastalking.com"),
    },
    mpesa: {
      live: !!(env.MPESA_KEY && env.MPESA_SECRET),
      key: env.MPESA_KEY || "", secret: env.MPESA_SECRET || "", shortcode: env.MPESA_SHORTCODE || "",
      passkey: env.MPESA_PASSKEY || "", callbackUrl: env.MPESA_CALLBACK_URL || "",
      baseUrl: env.MPESA_BASE || "https://sandbox.safaricom.co.ke",
    },
    site: { supportPhone: env.SUPPORT_PHONE || "", supportEmail: env.SUPPORT_EMAIL || "" },
  };
}
module.exports = { loadConfig };
