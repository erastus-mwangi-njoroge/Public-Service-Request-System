# Murang’a County Service Portal

Citizens register, apply for county services (choosing **sub-county → ward → nearest public primary school**), attach documents, pay by M-Pesa and track requests, with SMS updates. Officers process requests by department; admins manage officer accounts. Works on phones and desktops.

## Run locally (no dependencies, Node 18+)
    node server.js            # http://localhost:3000, data in ./data (JSON files)
    npm test                  # unit tests + end-to-end API checks on the JSON backend AND the Firestore backend (in-memory fake)

Staff logins are seeded on first run: `admin` and `officer` (Trade & Licensing), password `ChangeMe123` or whatever `ADMIN_PASSWORD` is.

## Project layout
    public/                      Front end (static, ES modules) -> Firebase Hosting
      js/core/                   api client, session, router (registry), formatters
      js/components/             navbar, footer, location picker, documents, timeline
      js/views/                  one file per screen; each registers itself with the router
    backend/                     API -> Cloud Functions (also runs locally via server.js)
      index.js                   Firebase entry (Cloud Functions 2nd gen)
      src/domain/                services catalog, locations (wards), status workflow, validation (pure rules)
      src/services/              use cases: auth, staff, requests, payments, documents, notifications, locations
      src/repositories/          contracts.md + json/ (local) + firestore/ (production)
      src/infrastructure/        SMS, payment and file-storage adapters (simulated / live / Firebase)
      src/http/                  router, guards, routes per area, adapters (Node http, Firebase Functions)
      src/container.js           composition root: the only file that picks concrete classes
      scripts/importSchools.js   load the school list from CSV
    firebase.json, firestore.rules, firestore.indexes.json, storage.rules


## Ward and school data
- Wards: the 35 IEBC wards, in `backend/src/domain/locations.js`. **Please check one thing:** the portal's sub-county list contains both *Maragua* and *Murang’a South*, which share Maragua constituency. We could not verify an official ward split, so both currently list all six Maragua-constituency wards. Edit that table if the county has the exact split.
- Schools: **no school names are bundled**, so nothing unverified reaches citizens. Until a ward has schools on file the form asks the applicant to type the school name; once schools exist they pick from a list, with “My school is not listed” as a fallback. Load your official list (e.g. from the Ministry of Education / county education office) from a CSV with columns `subCounty,ward,name` (see `backend/scripts/schools.template.csv`):

      node backend/scripts/importSchools.js schools.csv                          # local JSON store
      DATA_BACKEND=firebase node backend/scripts/importSchools.js schools.csv    # Firestore (see step 8)

  Re-running is safe; rows whose sub-county/ward do not match the portal’s list are reported and skipped.

## Deploy to Firebase (Hosting + Cloud Functions + Firestore + Storage)
Requires the **Blaze (pay-as-you-go) plan** (Cloud Functions and Cloud Storage need it) and Node 20+ locally.

1. `npm i -g firebase-tools && firebase login`
2. Create a Firebase project, then put its id in `.firebaserc` (replace `your-firebase-project-id`).
3. In the console: **Firestore Database → Create** (production mode) and **Storage → Get started**. Pick a location near Kenya; the repo is set to `africa-south1` (Johannesburg) for functions in `firebase.json` and `backend/index.js` (override with `FUNCTION_REGION`). Keep the three regions consistent, and if your firebase-tools version rejects `africa-south1`, choose the nearest supported region in both files.
4. `npm --prefix backend install`
5. Secrets (stored in Secret Manager, never in the repo):

       firebase functions:secrets:set JWT_SECRET       # a long random string
       firebase functions:secrets:set ADMIN_PASSWORD   # password for the first "admin" and "officer" logins
6. Live SMS / M-Pesa (otherwise both are simulated): set `AT_API_KEY`, `MPESA_KEY`, `MPESA_SECRET`, `MPESA_PASSKEY` with `firebase functions:secrets:set`, add the ones you use to `LIVE_SECRETS` in `backend/index.js`, and set `MPESA_CALLBACK_URL=https://<your-domain>/api/mpesa/callback`.
7. Deploy: `firebase deploy`. The first request creates the two staff accounts (only when none exist). To load schools into Firestore, run the import with `gcloud auth application-default login` done and `GOOGLE_CLOUD_PROJECT=<project-id>`.
8. Sign in as `admin`, create real officer accounts, then change/retire the seeded ones.

Notes
- Firestore and Storage rules deny all direct browser access; everything goes through the function using the Admin SDK.
- Cloud Functions limits request bodies to 32 MB; the app’s default 8 MB per document fits.
- `rateLimits` documents (one per client) are tiny; add a Firestore TTL policy on `at` if you want them to expire.

## Environment variables
| Variable | Purpose |
|---|---|
| PORT | Local server port (default 3000) |
| DATA_BACKEND | `local` (JSON files, default) or `firebase` (set automatically by the Cloud Function) |
| DATA_DIR | Local data folder (default `./data`) |
| JWT_SECRET | Signing key for login tokens. **Required** on Firebase; set a long random value |
| ADMIN_PASSWORD | Password for the seeded staff accounts (first run only). Required on Firebase |
| MPESA_KEY, MPESA_SECRET, MPESA_SHORTCODE, MPESA_PASSKEY, MPESA_CALLBACK_URL | Safaricom Daraja STK push. Without them payment is simulated (and completes immediately) |
| MPESA_BASE | Defaults to the Daraja sandbox. Use https://api.safaricom.co.ke for live |
| AT_USERNAME, AT_API_KEY, AT_SENDER_ID | Africa's Talking SMS (`AT_USERNAME=sandbox` to test). Without them SMS is simulated and listed in the admin SMS log |
| SMS_NOTIFY_OFFICERS | `off` stops SMS to officers when a new paid request arrives in their department |
| SUPPORT_PHONE, SUPPORT_EMAIL | Shown in the footer when set |
| MAX_UPLOAD_MB | Largest document, default 8 (PDF, JPG or PNG; 10 per request) |
| RATE_LIMIT | Sign-in/registration attempts per minute per client (default 10) |
| TRUST_PROXY | Local only: trust `X-Forwarded-For` when behind a proxy |
