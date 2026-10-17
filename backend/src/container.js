// Composition root: the ONLY place that knows which concrete classes are used.
// Everything else depends on the contracts (see repositories/contracts.md), so swapping storage means changing this file only.
const { ServiceCatalog } = require("./domain/serviceCatalog");
const { Locations } = require("./domain/locations");
const { PasswordHasher } = require("./security/passwordHasher");
const { TokenService } = require("./security/tokenService");
const { MemoryRateLimiter, FirestoreRateLimiter } = require("./security/rateLimiter");
const { SimulatedSmsGateway, AfricasTalkingGateway } = require("./infrastructure/sms/gateways");
const { SimulatedPaymentGateway, DarajaPaymentGateway } = require("./infrastructure/payments/gateways");
const { LocalFileStorage, FirebaseFileStorage } = require("./infrastructure/storage/fileStorages");
const { NotificationService } = require("./services/notificationService");
const { LocationService } = require("./services/locationService");
const { AuthService } = require("./services/authService");
const { StaffService } = require("./services/staffService");
const { RequestService } = require("./services/requestService");
const { PaymentService } = require("./services/paymentService");
const { DocumentService } = require("./services/documentService");
const { BootstrapService } = require("./services/bootstrapService");
const { buildRouter } = require("./http/routes");
const { createApiHandler } = require("./http/apiHandler");

// Storage adapters for each backend. Each returns the same set of contracts.
function localPersistence(config) {
  const path = require("path");
  const { JsonStore } = require("./repositories/json/jsonStore");
  const r = require("./repositories/json/repositories"), store = new JsonStore(config.dataDir);
  return {
    users: new r.JsonUserRepository(store), requests: new r.JsonRequestRepository(store), smsLog: new r.JsonSmsLogRepository(store), schools: new r.JsonSchoolRepository(store),
    storage: new LocalFileStorage(path.join(config.dataDir, "uploads")), rateLimiter: new MemoryRateLimiter(config.rateLimitPerMinute),
  };
}
function firebasePersistence(config, admin) {
  admin ||= require("firebase-admin");
  if (!admin.apps.length) admin.initializeApp(config.firebase.storageBucket ? { storageBucket: config.firebase.storageBucket } : undefined);
  const db = admin.firestore(), r = require("./repositories/firestore/repositories");
  return {
    users: new r.FirestoreUserRepository(db), requests: new r.FirestoreRequestRepository(db), smsLog: new r.FirestoreSmsLogRepository(db), schools: new r.FirestoreSchoolRepository(db),
    storage: new FirebaseFileStorage(admin.storage().bucket()), rateLimiter: new FirestoreRateLimiter(db, config.rateLimitPerMinute),
  };
}

function buildApp(config, { admin, log = console.log } = {}) {
  const p = config.backend === "firebase" ? firebasePersistence(config, admin) : localPersistence(config);
  const services = new ServiceCatalog(), hasher = new PasswordHasher(), tokens = new TokenService(config.secret);

  const smsGateway = config.sms.live ? new AfricasTalkingGateway(config.sms) : new SimulatedSmsGateway(log);
  const payGateway = config.mpesa.live ? new DarajaPaymentGateway(config.mpesa) : new SimulatedPaymentGateway();

  const notifier = new NotificationService({ gateway: smsGateway, smsLog: p.smsLog, users: p.users, services, notifyOfficers: config.notifyOfficers });
  const locationService = new LocationService({ locations: new Locations(), schools: p.schools });
  const authService = new AuthService({ users: p.users, hasher, tokens, notifier });
  const staffService = new StaffService({ users: p.users, hasher, services, smsLog: p.smsLog, smsLive: config.sms.live });
  const requestService = new RequestService({ requests: p.requests, services, locationService, notifier });
  const paymentService = new PaymentService({ requests: p.requests, gateway: payGateway, notifier });
  const documentService = new DocumentService({ requests: p.requests, storage: p.storage, services, maxBytes: config.maxUploadBytes, maxDocs: config.maxDocs });
  const bootstrap = new BootstrapService({ users: p.users, hasher, adminPassword: config.adminPassword, log });

  const router = buildRouter({ config, services, locationService, authService, staffService, requestService, paymentService, documentService, rateLimiter: p.rateLimiter });
  return { handle: createApiHandler({ router, auth: authService }), bootstrap, schools: p.schools };
}
module.exports = { buildApp };
