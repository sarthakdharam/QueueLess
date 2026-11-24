# QueueLess native development (Ubuntu 24.04)

QueueLess runs directly on Ubuntu: PostgreSQL stores application data, Express serves the API, and Vite serves the React frontend. No Docker or Compose is required.

## Prerequisites

- Ubuntu 24.04
- Node.js 24 and npm
- PostgreSQL 13 or later and pgAdmin 4

Install PostgreSQL if needed:

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
```

Use Node.js 24 for this project. Check the installed versions with `node --version` and `npm --version`; if you use nvm, install/select Node 24 with `nvm install 24` and `nvm use 24`.

## PostgreSQL and environment

Start the local PostgreSQL service and check that it is listening on the usual port:

```bash
sudo systemctl start postgresql
pg_isready -h localhost -p 5432
```

Use the existing `queueless` database and PostgreSQL role you manage in pgAdmin 4. This project does not create databases automatically. If the database or role does not exist yet, create/configure it in pgAdmin before starting the backend.

From the project root, create `.env` from the safe template only if you do not already have a local file:

```bash
test -f .env || cp .env.example .env
```

Set `DB_HOST`, `DB_PORT`, `POSTGRES_DB`, `POSTGRES_USER`, and `POSTGRES_PASSWORD` in `.env` to your local PostgreSQL connection details. The defaults for native development are `localhost` and `5432`. Keep `.env` private; it is excluded by `.gitignore`. `.env.example` contains placeholders only.

The backend resolves the root `.env` relative to its own source file, so it loads the same settings regardless of the directory used to launch it.

### Windows workspace database

If your workspace was provisioned with a dedicated PostgreSQL instance under `Database/.local-postgres`, it uses `127.0.0.1:5433` and stores its data in the Git-ignored `data` subdirectory. To start it again after a Windows restart, run this from the project root in PowerShell:

```powershell
& 'C:/Program Files/PostgreSQL/17/bin/pg_ctl.exe' start -D 'Database/.local-postgres/data' -l 'Database/.local-postgres/postgres.log' -w
```

From `Backend/`, run `node src/config/test-connection.js` to check the connection and `npm.cmd run migration:run` to apply any new schema migrations. Use `npm.cmd run dev` in each application directory to start the API and frontend on Windows.

## Install dependencies

Open a terminal in the project root and install backend dependencies:

```bash
cd Backend
npm ci
```

Open a second terminal in the project root and install frontend dependencies:

```bash
cd Frontend
npm ci
```

## Start the application

Run the backend and frontend in separate terminals. In the backend terminal:

```bash
cd ~/Desktop/QueueLess/Backend
npm run dev
```

After the backend reports a successful PostgreSQL connection, open the frontend terminal:

```bash
cd ~/Desktop/QueueLess/Frontend
npm run dev
```

Open the frontend at <http://localhost:5173>. The backend health endpoint is <http://localhost:3000/api/health>. Frontend requests to `/api` are proxied by Vite to `http://127.0.0.1:3000`, so browser requests can use relative paths without adding a separate CORS package.

Stop each development server with `Ctrl+C` in its own terminal. PostgreSQL can remain running; stop it separately only if needed with `sudo systemctl stop postgresql`.

## Checks

From `Backend/`, check the configured database connection with:

```bash
node src/config/test-connection.js
```

From `Frontend/`, run the available frontend checks:

```bash
npm run lint
npm run build
```

## Backend code map

```text
Backend/src/
├── app.js               Express app setup and API route mounting
├── server.js            Database startup and graceful shutdown
├── config/              Database connection and TypeORM setup
├── controller/          Request handlers grouped by feature
├── entities/            PostgreSQL table definitions
├── middleware/          Authentication, validation, and patient access checks
├── migrations/          Ordered database schema changes
├── repositories/        Database queries grouped by data area
├── seed/                Explicit local demo data command
├── sockets/             Authenticated Socket.IO rooms and event contract
├── routes/              URL definitions and request validation
│   ├── auth.js           Clinic registration and login routes
│   ├── clinic/           Clinic workspace route groups
│   ├── public/           Clinic discovery and patient registration routes
│   └── patient/          Private visit and recovery routes
├── services/             Business rules grouped by feature
│   ├── clinic/           Clinic time-zone and settings rules
│   ├── notifications/    WhatsApp adapter, simulator, and persisted retries
│   ├── patient/           Availability, access links, mobile numbers, and OTP hashing
│   └── queue/             Return-ordering policy
└── utils/                Shared small-purpose helpers

Frontend/src/
├── api/                  Shared API client
├── assets/               Images and other static assets
├── components/           Shared interface components
├── pages/                One screen per feature or user journey
├── App.jsx               Page routes and top-level providers
├── i18n.jsx              Language selection and translations
└── *.css                 Shared and feature-specific styles
```

Each route group delegates to a controller with a matching feature name; shared business logic lives in services, and reusable database queries live in repositories.

## Phase 1: clinic accounts

Before starting the backend, set `JWT_SECRET` in the root `.env` to a random secret of at least 32 characters. Apply the initial database migration from `Backend/`:

```bash
npm run migration:run
```

The migration creates clinics, clinic administrator accounts, and trial subscriptions. The API is versioned under `/api/v1`:

- `POST /api/v1/auth/register` creates a clinic, its administrator, and a one-month trial in one transaction. The request includes `clinicName`, `address`, `city`, `state`, `contactNumber`, `email`, `adminName`, `password`, and `acceptedTerms: true`.
- `POST /api/v1/auth/login` accepts `email` and `password` and returns a 12-hour bearer token.
- `GET /api/v1/auth/me` returns the authenticated user's clinic profile. Send `Authorization: Bearer <token>`.

The initial React landing page links to clinic registration, login, and public clinic discovery.

## Phase 2: clinic operations

Apply pending migrations from `Backend/`. This command applies every pending migration in order on a fresh database:

```bash
npm run migration:run
```

Phase 2 adds clinic setup, doctor configuration, working hours and breaks, walk-in registration, a receptionist queue dashboard, and audited queue actions. The clinic dashboard refreshes from PostgreSQL every 20 seconds; Socket.IO live updates are planned for Phase 5.

Authenticated clinic endpoints use the bearer token returned by login or registration:

- `GET /api/v1/clinic/setup` loads the clinic, working-hour settings, doctor list, and setup completion status.
- `PUT /api/v1/clinic/profile` updates clinic contact and profile fields.
- `PUT /api/v1/clinic/settings` saves weekly hours, breaks, slot length, appointment capacity, and queue preferences.
- `GET|POST /api/v1/clinic/doctors`, `PUT|DELETE /api/v1/clinic/doctors/:doctorId` manage clinic doctors.
- `GET /api/v1/clinic/dashboard` returns the day's queue and registration counts.
- `POST /api/v1/clinic/walk-ins` registers a walk-in. Registration is rejected while walk-ins are disabled or outside configured operating hours.
- `POST /api/v1/clinic/queue/call-next` calls the next waiting patient through the backend queue service.
- `POST /api/v1/clinic/queue/:queueId/{check-in|call|start|complete|miss|return|cancel}` applies an allowed status transition and writes an audit record. Online registrations stay in `registered` until reception confirms physical arrival with `check-in`.

Queue tokens are unique per clinic, doctor and local clinic date. Queue-changing operations are transactional. The first implementation supports a single active consultation per doctor queue and provides staff controls for calling, starting, completing, missing, or cancelling a visit.

## Phase 3: patient portal

Set `APP_BASE_URL` to the address patients use to open the frontend. `OTP_SECRET` should be a random secret of at least 32 characters. For local recovery-code testing, set `NOTIFICATION_PROVIDER=simulator`, `OTP_DEV_LOG=true`, and `OTP_DEV_ECHO=false` in the root `.env`, then restart the backend. Request a code from **My Appointment** using a test mobile number with an existing registration. The simulated code appears in the backend terminal, and no WhatsApp message is sent. Terminal logging is disabled in production. The separate `OTP_DEV_ECHO` option includes the code in the non-production API response when enabled. Production recovery codes use WhatsApp when the provider and approved OTP template are configured. Recovery OTP requests have a 60-second per-mobile resend cooldown and a 10-minute expiry. Successful verification creates a hashed, revocable lookup session that expires after 15 minutes. Configure `PATIENT_ACCESS_TTL_DAYS` to change private appointment-link lifetime (1–3650 days; default 180).

Phase 3 adds clinic discovery, public doctor profiles and appointment slots, online appointment or walk-in registration, confirmation pages, private registration links, link rotation/revocation, and mobile-number recovery. Patients can open **My Appointment** from the public site, request an OTP using their mobile number, then view recent/upcoming visits through a 15-minute server-verified lookup session without entering a registration reference or creating an account. The patient and clinic interfaces include a persistent language selector for English, Hindi, Bengali, Tamil, Telugu, and Marathi. Run `npm run migration:run` from `Backend/` to apply pending patient portal and lookup-session migrations.

Public endpoints:

- `GET /api/v1/public/clinics?q=<name-or-city>` searches active clinics.
- `GET /api/v1/public/clinics/:clinicId` returns public clinic and doctor details.
- `GET /api/v1/public/clinics/:clinicId/slots?doctorId=<uuid>&date=YYYY-MM-DD` returns currently available appointment slots.
- `POST /api/v1/public/registrations` creates an appointment or online walk-in registration. Include a UUID `Idempotency-Key` header and explicit `consentToContact: true`.

Patient endpoints accept the private link secret as a bearer token; the frontend keeps it in the URL fragment, which is not sent to the server:

- `GET /api/v1/patient/registration` opens the registration and current details.
- `POST /api/v1/patient/access/rotate` creates a replacement private link and revokes previous links.
- `DELETE /api/v1/patient/access` revokes the current link.
- `POST /api/v1/patient/recovery/request` starts mobile OTP lookup and responds generically whether or not visits match.
- `POST /api/v1/patient/recovery/verify` verifies the OTP and returns a short-lived lookup bearer token.
- `GET /api/v1/patient/recovery/appointments` returns only recent/upcoming visits tied to the verified mobile session.
- `POST /api/v1/patient/recovery/appointments/:reference/access` replaces the private access link for a registration owned by the verified mobile session.
- `DELETE /api/v1/patient/recovery/session` revokes the lookup session.

An online registration does not confirm that the patient has arrived. The confirmation page instructs patients to check in with reception. Patients get their private appointment link on the confirmation page and can use **My Appointment** to recover access.

Patients can cancel a booked appointment from its private link before the clinic calls them. Cancelling releases the slot, updates the registration, appointment, and queue status, and records a clinic alert. The patient sees a confirmation on the private page and receives a cancellation message if contact consent was recorded.

## Phase 4: queue engine

Run `npm run migration:run` from `Backend/` to add the queue ordering column and index. Appointment arrivals and walk-ins share the daily doctor queue: due appointments are called in scheduled-time order, walk-ins follow in queue order, and future appointments remain behind patients who are ready now. Reception must check in online registrations before they become callable. Missed appointments release their booked slot; if they return to the queue, the configured missed-turn policy places them after the chosen number of waiting patients or at the end. Patient visit links show a queue position and estimated wait based on queue order, configured slot length, active consultation, and appointment time.

## Phase 5: real-time updates

The backend attaches Socket.IO to the API server. Clinic sockets authenticate with the clinic JWT and are only allowed into their own clinic room. Patient sockets authenticate with their private access secret and are only allowed into that registration's room. Queue updates are emitted after successful database commits; clients refresh the authoritative REST snapshot after connection and each update.

Event contract:

- Client: `clinic:joinQueue`, `patient:joinQueue`, `queue:requestSnapshot`
- Server: `queue:snapshot` (instructs the client to refresh REST state), `queue:updated`, `registration:confirmed`, `patient:statusChanged`, and `patient:called`
- Clinic room payloads contain clinic ID, status, and timestamp only; patient room payloads are scoped to the one registration.

The dashboard keeps a 20-second REST refresh as a fallback. Browser reconnection always fetches current state instead of trusting missed socket events.

## Phase 6: WhatsApp and notification simulator

### Developer message inbox

The mock inbox lives at <http://localhost:5173/dev/notifications>. Run `npm run migration:run` from `Backend/` against your existing database, then set these values in the root `.env` and restart the backend:

```dotenv
NODE_ENV=development
NOTIFICATION_PROVIDER=simulator
DEV_MOCK_INBOX=true
```

On Windows PowerShell, use `npm.cmd run migration:run` and `npm.cmd run dev`. Sign in as a clinic administrator before opening the inbox. It shows only simulated messages for the signed-in clinic. Phone numbers are masked, and recovery codes are never shown. Older simulations may appear without a saved message preview.

Register a test patient to create a conversation, or open **Test message** to preview a template, override its text, and simulate success or failure. The queue records milestones at exactly five, three, and one patient ahead, and a separate simulation when the patient is called. Milestones use the same priority order as the queue and are recorded once per registration and queue session. These extra simulations stay separate from staff alerts and run only with the development inbox enabled.

Choose **Demo OTP** to preview and send the sample code `000000` in a mock conversation. It cannot verify an appointment, and real recovery codes remain hidden in the inbox.

Completing a visit records a **Visit completed** message for patients who opted in. The feedback link opens the completed visit after mobile verification. To send the message through your configured WhatsApp provider, set `WHATSAPP_VISIT_COMPLETED_TEMPLATE` to an approved template with one body parameter for the feedback URL. Use a patient-accessible HTTPS `APP_BASE_URL` for live delivery.

Clinic staff receive registration confirmations, reschedule confirmations, missed appointment alerts, and appointment cancellations in the clinic inbox. Patient messages cover approaching turns, recovery OTPs, emergency delays or rescheduling, clinic-hours changes, reschedule confirmations, missed appointments, and cancellations. Outbound visit updates require recorded contact consent. The recovery OTP is requested by the patient. Each notification is persisted with an idempotency key. `NOTIFICATION_PROVIDER=simulator` is the default outside production; the development simulator can record simulated success or failure without contacting patients. Simulator previews and patient delivery records stay outside the clinic inbox. A successful simulation is stored as `simulated`, not `delivered`; the UI explicitly says that no real message was sent. In production, patient message delivery remains disabled unless `NOTIFICATION_PROVIDER=whatsapp` is explicitly configured, and the simulator endpoint and adapter reject use. Set `SIMULATOR_FORCE_FAILURE=true` in a non-production backend environment to force simulator delivery failures; unset it to run the success case. The authenticated endpoint is `POST /api/v1/clinic/notifications/simulate` with `{ "outcome": "success" }` or `{ "outcome": "failure" }`; a failure is returned as HTTP 502 and remains recorded as failed. Failed eligible messages are retried from the database by the backend worker up to three times; OTP and confirmation messages are excluded.

To enable the WhatsApp Cloud API adapter, configure `NOTIFICATION_PROVIDER=whatsapp`, the phone-number ID, access token, Graph API version, app secret, webhook verify token, and approved patient notification templates in the backend environment. Set `WHATSAPP_CANCELLATION_TEMPLATE` to an approved cancellation template with one body parameter for the registration reference. Recovery OTP codes are redacted from the notification history and excluded from automatic retries; request another code if delivery fails. Provider requests have a 10-second timeout. Delivery failures are recorded and do not undo appointments. The adapter sends approved templates only. Never put those credentials in Vite variables or frontend code. Verify template names, opt-in rules, provider requirements, and message pricing with the WhatsApp account before enabling production delivery. Configure the provider callback as `/api/v1/webhooks/whatsapp` for delivery receipts.

## Phase 7: subscription and payment flow

Clinic registration starts a one-month trial. The clinic Subscription screen shows trial/renewal dates and payment history; the base plan is ₹500/month. New walk-in and online patient registrations are disabled after trial or paid access expires, while existing queue management, account settings, billing, and patient records remain available. No records are deleted on expiry.

The local payment provider is a simulator; use its success/failure controls to exercise subscription state without a charge. For Razorpay, configure `PAYMENT_PROVIDER=razorpay`, the server-only key ID/secret, and a webhook secret. Checkout creates an INR order, but the subscription activates only after a valid signed `payment.captured` webhook. Register `/api/v1/webhooks/razorpay` as the provider webhook URL and subscribe to `payment.captured` and `payment.failed`. Do not use browser callback data as proof of payment.

## Phase 8: automated checks and pilot preparation

Run backend rule tests with `npm test` from `Backend/`; these cover return ordering, short queues, staff overrides, date/slot rules, time-zone conversion, and mobile normalization. Run `npm run lint` and `npm run build` from `Frontend/`. Apply every pending database migration before exercising Phase 5–7 endpoints.

For a local demo clinic, set a private `DEMO_SEED_PASSWORD` (at least 12 characters) in `.env`, then run `npm run seed:demo` from `Backend/`. The seeded login is `demo-admin@queueless.local`; the seed command refuses to run in production and creates no patient records.

Before a clinic pilot, use a clinic-approved test environment and consented test numbers. Walk through registration, arrival, queue movement, missed and returned turns, notification opt-out, reconnecting after network loss, trial expiry, simulated payment failure/success, and data isolation between two clinics. Record staff feedback and compare estimated waits with actual consultation times before enabling paid messaging or payments for patients. A real pilot and its feedback require participating clinic staff; they cannot be simulated by this repository.

## Troubleshooting

- **Connection refused:** Check PostgreSQL status with `pg_isready -h localhost -p 5432` and start the service if needed.
- **Password authentication failed:** Confirm the database role and password in pgAdmin match the private `.env` values.
- **Database does not exist:** Confirm the existing database is named `queueless`; this application will not create it.
- **Port already in use:** Check whether PostgreSQL (5432), backend (3000), or Vite (5173) is already using its port.
- **Frontend API request fails:** Keep the backend running at `127.0.0.1:3000`; Vite forwards `/api` requests to it.
